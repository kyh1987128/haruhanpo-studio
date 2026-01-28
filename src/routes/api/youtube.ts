// YouTube 분석기 API 라우트

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'

import { authMiddleware, adminMiddleware } from '../../middleware/auth'
import { extractVideoId, buildYouTubeUrl } from '../../utils/youtube-url'
import { getVideoInfo } from '../../services/youtube-api'
import { analyzeVideo } from '../../services/openai'
import { getCachedAnalysis, saveCacheAnalysis, getTTLByAnalysisType, getCacheStats } from '../../services/cache'
import { saveAnalysisHistory, getAnalysisHistory, getHistoryById, deleteHistory, getUserAnalysisStats } from '../../services/history'

import type { AnalysisRequest, ApiResponse, AnalysisResult, PaginationParams } from '../../types/youtube'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  YOUTUBE_API_KEY: string
  OPENAI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/youtube/*', cors({
  origin: ['http://localhost:3000', 'https://haruhanpo-studio-new.pages.dev'],
  credentials: true
}))

// 인증 미들웨어 적용 (일부 API만 로그인 필요)
// 검색, 채널 정보 조회 등은 인증 불필요 (서비스 제공자의 YouTube API 키 사용)
// 분석 API는 인증 필요 (사용자별 크레딧 차감)
app.use('/api/youtube/analyze', authMiddleware)
app.use('/api/youtube/history*', authMiddleware)
app.use('/api/youtube/stats', authMiddleware)

// YouTube 영상 분석 API
app.post('/api/youtube/analyze', async (c) => {
  try {
    const body: AnalysisRequest = await c.req.json()
    const { videoUrl, analysisType } = body

    // 1. 입력 검증
    if (!videoUrl || !analysisType) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'videoUrl과 analysisType은 필수입니다.'
        }
      }, 400)
    }

    // 2. videoId 추출
    const videoId = extractVideoId(videoUrl)
    if (!videoId) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_VIDEO_URL',
          message: '올바른 YouTube URL을 입력해주세요.'
        }
      }, 400)
    }

    // 3. 인증된 사용자 정보 가져오기 (미들웨어에서 설정됨)
    const userId = c.get('userId')

    // 4. Supabase 클라이언트 생성
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 5. 캐시 조회
    const cachedData = await getCachedAnalysis(supabase, videoId, analysisType)
    if (cachedData) {
      console.log(`캐시 히트: ${videoId} - ${analysisType}`)
      
      // 캐시 히트 - 히스토리만 저장하고 즉시 반환
      try {
        await saveAnalysisHistory(
          supabase,
          userId,
          videoId,
          buildYouTubeUrl(videoId),
          cachedData.video_info,
          analysisType,
          cachedData.analysis_result,
          cachedData.analysis_result.summary || '',
          0, // 캐시 히트는 0 크레딧
          true
        )
      } catch (historyError: any) {
        // 히스토리 저장 실패 (중복 등)는 무시
        console.warn('히스토리 저장 실패:', historyError.message)
      }

      return c.json<ApiResponse<AnalysisResult>>({
        success: true,
        data: {
          videoId,
          videoInfo: cachedData.video_info,
          analysisResult: cachedData.analysis_result,
          aiSummary: cachedData.analysis_result.summary || '',
          creditsUsed: 0,
          wasCached: true,
          cacheExpiresAt: cachedData.expires_at
        }
      })
    }

    console.log(`캐시 미스: ${videoId} - ${analysisType}`)

    // 6. 크레딧 확인 및 차감
    const creditsRequired = 10 // 분석당 10 크레딧
    
    const { data: creditData, error: creditError } = await supabase
      .rpc('deduct_credits_safe', {
        p_user_id: userId,
        p_amount: creditsRequired
      })

    if (creditError || !creditData) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: '크레딧이 부족합니다. 크레딧을 충전해주세요.'
        }
      }, 402)
    }

    // 7. YouTube Data API 호출
    let videoInfo
    try {
      videoInfo = await getVideoInfo(videoId, c.env.YOUTUBE_API_KEY)
    } catch (error: any) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'YOUTUBE_API_ERROR',
          message: error.message || 'YouTube 영상 정보를 가져올 수 없습니다.'
        }
      }, error.statusCode || 500)
    }

    // 8. GPT-4 분석
    let analysisResult, aiSummary
    try {
      const result = await analyzeVideo(videoInfo, analysisType, c.env.OPENAI_API_KEY)
      analysisResult = result.analysisResult
      aiSummary = result.aiSummary
    } catch (error: any) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'OPENAI_API_ERROR',
          message: error.message || 'AI 분석을 수행할 수 없습니다.'
        }
      }, error.statusCode || 500)
    }

    // 9. 캐시 저장 (TTL은 분석 타입별로 다름)
    const ttl = getTTLByAnalysisType(analysisType)
    await saveCacheAnalysis(
      supabase,
      videoId,
      analysisType,
      analysisResult,
      videoInfo,
      ttl
    )

    const cacheExpiresAt = new Date()
    cacheExpiresAt.setHours(cacheExpiresAt.getHours() + ttl)

    // 10. 히스토리 저장 (Trigger 자동 실행)
    try {
      await saveAnalysisHistory(
        supabase,
        userId,
        videoId,
        buildYouTubeUrl(videoId),
        videoInfo,
        analysisType,
        analysisResult,
        aiSummary,
        creditsRequired,
        false
      )
    } catch (historyError: any) {
      console.warn('히스토리 저장 실패:', historyError.message)
    }

    // 11. 결과 반환
    return c.json<ApiResponse<AnalysisResult>>({
      success: true,
      data: {
        videoId,
        videoInfo,
        analysisResult,
        aiSummary,
        creditsUsed: creditsRequired,
        wasCached: false,
        cacheExpiresAt: cacheExpiresAt.toISOString()
      }
    })

  } catch (error: any) {
    console.error('YouTube analyze error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '서버 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// 히스토리 조회 API
app.get('/api/youtube/history', async (c) => {
  try {
    // 인증된 사용자 정보 (미들웨어에서 설정됨)
    const userId = c.get('userId')

    // 쿼리 파라미터
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50)
    const analysisType = c.req.query('analysisType') as any

    const params: PaginationParams = { page, limit, analysisType }

    // Supabase 클라이언트
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 히스토리 조회
    const result = await getAnalysisHistory(supabase, userId, params)

    return c.json<ApiResponse<typeof result>>({
      success: true,
      data: result
    })

  } catch (error: any) {
    console.error('History fetch error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '서버 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// 히스토리 상세 조회 API
app.get('/api/youtube/history/:id', async (c) => {
  try {
    const userId = c.get('userId')

    const historyId = c.req.param('id')

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const history = await getHistoryById(supabase, userId, historyId)

    if (!history) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '히스토리를 찾을 수 없습니다.'
        }
      }, 404)
    }

    return c.json<ApiResponse<typeof history>>({
      success: true,
      data: history
    })

  } catch (error: any) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    }, 500)
  }
})

// 히스토리 삭제 API
app.delete('/api/youtube/history/:id', async (c) => {
  try {
    const userId = c.get('userId')

    const historyId = c.req.param('id')

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const success = await deleteHistory(supabase, userId, historyId)

    if (!success) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: '히스토리 삭제에 실패했습니다.'
        }
      }, 500)
    }

    return c.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true }
    })

  } catch (error: any) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    }, 500)
  }
})

// 사용자 통계 API
app.get('/api/youtube/stats', async (c) => {
  try {
    const userId = c.get('userId')

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const stats = await getUserAnalysisStats(supabase, userId)

    return c.json<ApiResponse<typeof stats>>({
      success: true,
      data: stats
    })

  } catch (error: any) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    }, 500)
  }
})

// 캐시 통계 API (관리자용)
app.get('/api/youtube/cache/stats', adminMiddleware, async (c) => {
  try {
    const userId = c.get('userId')

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const stats = await getCacheStats(supabase)

    return c.json<ApiResponse<typeof stats>>({
      success: true,
      data: stats
    })

  } catch (error: any) {
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    }, 500)
  }
})

// ========================================
// Phase 2: YouTube 검색 API (AI 자동 번역 적용)
// ========================================
app.post('/api/youtube/search', async (c) => {
  try {
    const body = await c.req.json()
    let { keyword, maxResults = 20, pageToken, regionCode } = body

    // 1. 입력 검증
    if (!keyword || typeof keyword !== 'string') {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '검색 키워드를 입력해주세요.'
        }
      }, 400)
    }

    // 2. YouTube API 키 확인
    const youtubeApiKey = c.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'YouTube API 키가 설정되지 않았습니다.'
        }
      }, 500)
    }

    // 🌐 3. AI 자동 번역 (regionCode가 있으면 번역)
    const originalKeyword = keyword
    if (regionCode && regionCode !== 'all') {
      const { translateKeyword } = await import('../../services/youtube-api')
      keyword = await translateKeyword(keyword, regionCode, c.env.OPENAI_API_KEY)
    }

    // 4. 검색 실행
    const { searchYouTubeVideos } = await import('../../services/youtube-api')
    const result = await searchYouTubeVideos(keyword, youtubeApiKey, maxResults, pageToken)

    // 5. 결과 반환
    return c.json({
      success: true,
      data: {
        keyword,
        originalKeyword: originalKeyword !== keyword ? originalKeyword : undefined,  // 번역된 경우만 원본 포함
        totalResults: result.totalResults,
        videos: result.videos,
        nextPageToken: result.nextPageToken,
        hasMore: !!result.nextPageToken
      }
    })

  } catch (error: any) {
    console.error('YouTube search error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: error.message || '검색 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 3: 채널 분석 API
// ========================================

app.post('/api/youtube/channel', async (c) => {
  try {
    const body = await c.req.json()
    const { channelIdOrUrl } = body

    // 1. 입력 검증
    if (!channelIdOrUrl || typeof channelIdOrUrl !== 'string') {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '채널 URL 또는 ID를 입력해주세요.'
        }
      }, 400)
    }

    // 2. YouTube API 키 확인
    const youtubeApiKey = c.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'YouTube API 키가 설정되지 않았습니다.'
        }
      }, 500)
    }

    // 3. 채널 분석 실행
    const { getChannelInfo } = await import('../../services/youtube-api')
    const result = await getChannelInfo(channelIdOrUrl, youtubeApiKey)

    // 4. 결과 반환
    return c.json({
      success: true,
      data: result
    })

  } catch (error: any) {
    console.error('YouTube channel error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: error.statusCode === 404 ? 'CHANNEL_NOT_FOUND' : 'CHANNEL_ERROR',
        message: error.message || '채널 분석 중 오류가 발생했습니다.'
      }
    }, error.statusCode || 500)
  }
})

// ========================================
// Phase 4: 콘텐츠 전략 AI
// ========================================

app.post('/api/youtube/strategy', async (c) => {
  try {
    const body = await c.req.json()
    const { goal, analyzedVideos } = body

    // 1. 입력 검증
    if (!analyzedVideos || !Array.isArray(analyzedVideos) || analyzedVideos.length < 3) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INSUFFICIENT_DATA',
          message: '최소 3개 이상의 분석된 영상이 필요합니다.'
        }
      }, 400)
    }

    if (!goal) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '목표를 선택해주세요.'
        }
      }, 400)
    }

    // 2. OpenAI API 키 확인
    const openaiApiKey = c.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'OpenAI API 키가 설정되지 않았습니다.'
        }
      }, 500)
    }

    // 3. AI 전략 생성
    const goalDescriptions = {
      views: '조회수 증가',
      subscribers: '구독자 증가',
      engagement: '참여율 (좋아요, 댓글) 증가',
      viral: '바이럴 콘텐츠 (빠른 확산)'
    }

    const goalText = goalDescriptions[goal as keyof typeof goalDescriptions] || '조회수 증가'

    // OpenAI API 호출
    const prompt = `당신은 YouTube 콘텐츠 전략 전문가입니다. 다음 분석된 영상 데이터를 기반으로 "${goalText}"를 목표로 하는 콘텐츠 전략을 제안해주세요.

분석된 영상 데이터:
${analyzedVideos.map((v: any, i: number) => `
${i + 1}. ${v.title}
   - 조회수: ${v.views?.toLocaleString()}
   - 좋아요: ${v.likes?.toLocaleString()}
   - 채널: ${v.channel} (구독자 ${v.subscriberCount?.toLocaleString()})
   - 게시일: ${v.publishedAt}
   - 성과도: ${v.performance}
`).join('\n')}

다음 형식으로 JSON 응답해주세요:
{
  "trends": {
    "commonKeywords": ["키워드1", "키워드2", "키워드3"],
    "successPatterns": ["패턴1", "패턴2", "패턴3"],
    "bestPublishTime": "권장 게시 시간대"
  },
  "contentSuggestions": [
    {
      "title": "추천 제목 1",
      "description": "콘텐츠 설명",
      "keywords": ["키워드1", "키워드2"],
      "estimatedViews": "예상 조회수 범위"
    }
  ],
  "actionPlan": {
    "immediate": ["즉시 실행 항목 1", "즉시 실행 항목 2"],
    "shortTerm": ["단기 전략 1", "단기 전략 2"],
    "longTerm": ["장기 전략 1", "장기 전략 2"]
  }
}`

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 YouTube 콘텐츠 전략 전문가입니다. 데이터 기반 인사이트를 제공하고 실행 가능한 전략을 제안합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })

    if (!aiResponse.ok) {
      throw new Error('OpenAI API 호출 실패')
    }

    const aiResult = await aiResponse.json()
    const strategyData = JSON.parse(aiResult.choices[0].message.content)

    // 4. 결과 반환
    return c.json({
      success: true,
      data: strategyData
    })

  } catch (error: any) {
    console.error('Strategy generation error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'STRATEGY_ERROR',
        message: error.message || '전략 생성 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 5C: 채널 영상 검색 API
// ========================================

app.post('/api/youtube/channel/videos', async (c) => {
  try {
    const body = await c.req.json()
    const { channelId, maxResults = 50, pageToken, order = 'date' } = body

    // 1. 입력 검증
    if (!channelId || typeof channelId !== 'string') {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '채널 ID를 입력해주세요.'
        }
      }, 400)
    }

    // 2. YouTube API 키 확인
    const youtubeApiKey = c.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'YouTube API 키가 설정되지 않았습니다.'
        }
      }, 500)
    }

    // 3. YouTube API 호출 (search.list)
    const searchParams = new URLSearchParams({
      part: 'snippet',
      channelId: channelId,
      type: 'video',
      maxResults: maxResults.toString(),
      order: order, // date, viewCount, rating
      key: youtubeApiKey
    })

    if (pageToken) {
      searchParams.append('pageToken', pageToken)
    }

    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
    )

    if (!searchResponse.ok) {
      throw new Error(`YouTube API error: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(',') || ''

    // 4. 영상 상세 정보 가져오기 (videos.list)
    let videos = []
    if (videoIds) {
      const videosParams = new URLSearchParams({
        part: 'snippet,statistics,contentDetails',
        id: videoIds,
        key: youtubeApiKey
      })

      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${videosParams.toString()}`
      )

      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosResponse.status}`)
      }

      const videosData = await videosResponse.json()
      videos = videosData.items || []
    }

    // 5. 채널 정보 가져오기 (channels.list)
    const channelsParams = new URLSearchParams({
      part: 'snippet,statistics',
      id: channelId,
      key: youtubeApiKey
    })

    const channelsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${channelsParams.toString()}`
    )

    let channelInfo = null
    if (channelsResponse.ok) {
      const channelsData = await channelsResponse.json()
      channelInfo = channelsData.items?.[0] || null
    }

    // 6. 결과 반환
    return c.json({
      success: true,
      data: {
        channelId,
        channelInfo,
        totalResults: searchData.pageInfo?.totalResults || 0,
        videos: videos,
        nextPageToken: searchData.nextPageToken,
        hasMore: !!searchData.nextPageToken
      }
    })

  } catch (error: any) {
    console.error('Channel videos search error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'CHANNEL_VIDEOS_ERROR',
        message: error.message || '채널 영상 검색 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 5C: 카테고리 영상 검색 API
// ========================================

app.post('/api/youtube/category/videos', async (c) => {
  try {
    const body = await c.req.json()
    const { categoryId, maxResults = 50, pageToken, order = 'viewCount', regionCode = 'KR' } = body

    // 1. 입력 검증
    if (!categoryId || typeof categoryId !== 'string') {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '카테고리 ID를 입력해주세요.'
        }
      }, 400)
    }

    // 2. YouTube API 키 확인
    const youtubeApiKey = c.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'YouTube API 키가 설정되지 않았습니다.'
        }
      }, 500)
    }

    // 3. YouTube API 호출 (search.list with videoCategoryId)
    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      videoCategoryId: categoryId,
      maxResults: maxResults.toString(),
      order: order, // viewCount, date, rating
      regionCode: regionCode,
      key: youtubeApiKey
    })

    if (pageToken) {
      searchParams.append('pageToken', pageToken)
    }

    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
    )

    if (!searchResponse.ok) {
      throw new Error(`YouTube API error: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(',') || ''

    // 4. 영상 상세 정보 가져오기 (videos.list)
    let videos = []
    if (videoIds) {
      const videosParams = new URLSearchParams({
        part: 'snippet,statistics,contentDetails',
        id: videoIds,
        key: youtubeApiKey
      })

      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${videosParams.toString()}`
      )

      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosResponse.status}`)
      }

      const videosData = await videosResponse.json()
      videos = videosData.items || []

      // 5. 각 영상의 채널 정보 가져오기
      const channelIds = [...new Set(videos.map((v: any) => v.snippet.channelId))].join(',')
      
      if (channelIds) {
        const channelsParams = new URLSearchParams({
          part: 'snippet,statistics',
          id: channelIds,
          key: youtubeApiKey
        })

        const channelsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?${channelsParams.toString()}`
        )

        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json()
          const channelMap = new Map(
            channelsData.items?.map((ch: any) => [ch.id, ch]) || []
          )

          // 각 영상에 채널 정보 추가
          videos = videos.map((video: any) => ({
            ...video,
            channelInfo: channelMap.get(video.snippet.channelId) || null
          }))
        }
      }
    }

    // 6. 결과 반환
    return c.json({
      success: true,
      data: {
        categoryId,
        regionCode,
        totalResults: searchData.pageInfo?.totalResults || 0,
        videos: videos,
        nextPageToken: searchData.nextPageToken,
        hasMore: !!searchData.nextPageToken
      }
    })

  } catch (error: any) {
    console.error('Category videos search error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'CATEGORY_VIDEOS_ERROR',
        message: error.message || '카테고리 영상 검색 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 6: 경쟁사 비교 분석 API
// ========================================

app.post('/api/youtube/competitor/compare', async (c) => {
  try {
    const body = await c.req.json()
    const { channelIds, period = '30d' } = body

    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
      return c.json({
        success: false,
        error: { code: 'INVALID_INPUT', message: '채널 ID 목록을 입력해주세요.' }
      }, 400)
    }

    if (channelIds.length > 5) {
      return c.json({
        success: false,
        error: { code: 'TOO_MANY_CHANNELS', message: '최대 5개 채널까지 비교 가능합니다.' }
      }, 400)
    }

    const youtubeApiKey = c.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      return c.json({
        success: false,
        error: { code: 'API_KEY_MISSING', message: 'YouTube API 키가 설정되지 않았습니다.' }
      }, 500)
    }

    // 각 채널 정보 가져오기
    const channelDataPromises = channelIds.map(async (channelId: string) => {
      // 채널 기본 정보
      const channelParams = new URLSearchParams({
        part: 'snippet,statistics',
        id: channelId,
        key: youtubeApiKey
      })

      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?${channelParams.toString()}`
      )

      if (!channelResponse.ok) {
        throw new Error(`Channel API error for ${channelId}`)
      }

      const channelData = await channelResponse.json()
      const channel = channelData.items?.[0]

      if (!channel) {
        return null
      }

      // 최근 영상 50개 가져오기 (통계 계산용)
      const searchParams = new URLSearchParams({
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        maxResults: '50',
        order: 'date',
        key: youtubeApiKey
      })

      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
      )

      let recentVideos = []
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        const videoIds = searchData.items?.map((item: any) => item.id.videoId).join(',')

        if (videoIds) {
          const videosParams = new URLSearchParams({
            part: 'statistics,contentDetails',
            id: videoIds,
            key: youtubeApiKey
          })

          const videosResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?${videosParams.toString()}`
          )

          if (videosResponse.ok) {
            const videosData = await videosResponse.json()
            recentVideos = videosData.items || []
          }
        }
      }

      // 통계 계산
      const subscribers = parseInt(channel.statistics?.subscriberCount || '0')
      const totalViews = parseInt(channel.statistics?.viewCount || '0')
      const videoCount = parseInt(channel.statistics?.videoCount || '0')

      let avgViews = 0
      let avgLikeRate = 0
      let avgComments = 0

      if (recentVideos.length > 0) {
        const totalVideoViews = recentVideos.reduce((sum: number, v: any) => 
          sum + parseInt(v.statistics?.viewCount || '0'), 0)
        avgViews = Math.round(totalVideoViews / recentVideos.length)

        const validLikes = recentVideos.filter((v: any) => 
          parseInt(v.statistics?.viewCount || '0') > 0)
        if (validLikes.length > 0) {
          const totalLikeRate = validLikes.reduce((sum: number, v: any) => {
            const views = parseInt(v.statistics?.viewCount || '0')
            const likes = parseInt(v.statistics?.likeCount || '0')
            return sum + (views > 0 ? (likes / views * 100) : 0)
          }, 0)
          avgLikeRate = parseFloat((totalLikeRate / validLikes.length).toFixed(2))
        }

        const totalComments = recentVideos.reduce((sum: number, v: any) => 
          sum + parseInt(v.statistics?.commentCount || '0'), 0)
        avgComments = Math.round(totalComments / recentVideos.length)
      }

      const avgPerformance = subscribers > 0 ? parseFloat(((avgViews / subscribers) * 100).toFixed(2)) : 0
      const uploadFrequency = videoCount > 0 ? parseFloat((videoCount / 30).toFixed(2)) : 0

      return {
        channelId: channel.id,
        channelInfo: {
          title: channel.snippet?.title,
          thumbnail: channel.snippet?.thumbnails?.default?.url,
          description: channel.snippet?.description
        },
        metrics: {
          subscribers,
          totalViews,
          videoCount,
          avgViews,
          avgPerformance,
          avgLikeRate,
          avgComments,
          uploadFrequency
        }
      }
    })

    const channels = (await Promise.all(channelDataPromises)).filter(Boolean)

    // 랭킹 계산
    const rankings = {
      subscribers: [...channels].sort((a, b) => b.metrics.subscribers - a.metrics.subscribers).map(c => c.channelId),
      avgViews: [...channels].sort((a, b) => b.metrics.avgViews - a.metrics.avgViews).map(c => c.channelId),
      avgPerformance: [...channels].sort((a, b) => b.metrics.avgPerformance - a.metrics.avgPerformance).map(c => c.channelId),
      avgLikeRate: [...channels].sort((a, b) => b.metrics.avgLikeRate - a.metrics.avgLikeRate).map(c => c.channelId)
    }

    return c.json({
      success: true,
      data: { channels, rankings, period }
    })

  } catch (error: any) {
    console.error('Competitor comparison error:', error)
    return c.json({
      success: false,
      error: {
        code: 'COMPARISON_ERROR',
        message: error.message || '경쟁사 비교 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 6: 트렌드 예측 AI API
// ========================================

app.post('/api/youtube/predict', async (c) => {
  try {
    const body = await c.req.json()
    const { videoId, channelInfo, historicalData } = body

    if (!videoId) {
      return c.json({
        success: false,
        error: { code: 'INVALID_INPUT', message: '영상 ID를 입력해주세요.' }
      }, 400)
    }

    const openaiApiKey = c.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return c.json({
        success: false,
        error: { code: 'API_KEY_MISSING', message: 'OpenAI API 키가 설정되지 않았습니다.' }
      }, 500)
    }

    // 영상 정보 가져오기
    const youtubeApiKey = c.env.YOUTUBE_API_KEY
    const videoParams = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      id: videoId,
      key: youtubeApiKey
    })

    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${videoParams.toString()}`
    )

    if (!videoResponse.ok) {
      throw new Error('영상 정보를 가져올 수 없습니다.')
    }

    const videoData = await videoResponse.json()
    const video = videoData.items?.[0]

    if (!video) {
      throw new Error('영상을 찾을 수 없습니다.')
    }

    // AI 프롬프트 생성
    const prompt = `You are a YouTube analytics expert. Analyze this video and predict its performance.

Video Information:
- Title: ${video.snippet?.title}
- Views: ${video.statistics?.viewCount}
- Likes: ${video.statistics?.likeCount}
- Comments: ${video.statistics?.commentCount}
- Published: ${video.snippet?.publishedAt}
- Channel Subscribers: ${channelInfo?.subscriberCount || 'Unknown'}

Based on current metrics, predict:
1. Views in 24 hours
2. Views in 7 days
3. Final estimated views
4. Performance level (viral/algorithm/normal/low)
5. Confidence score (0-100%)

Also provide recommendations:
1. Optimal upload time (day of week and hour)
2. Top 10 recommended keywords
3. Recommended video length (min-max minutes)
4. Thumbnail improvement suggestions

Return JSON format:
{
  "predictions": {
    "views24h": number,
    "views7d": number,
    "viewsFinal": number,
    "performanceLevel": "viral|algorithm|normal|low",
    "confidence": number
  },
  "recommendations": {
    "optimalUploadTime": {
      "dayOfWeek": number (0-6),
      "hourOfDay": number (0-23),
      "reason": "string"
    },
    "keywords": ["keyword1", "keyword2", ...],
    "videoLength": { "min": number, "max": number },
    "thumbnailSuggestions": ["suggestion1", ...]
  }
}`

    // OpenAI API 호출
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a YouTube analytics expert. Always respond in valid JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    })

    if (!openaiResponse.ok) {
      throw new Error('AI 분석 중 오류가 발생했습니다.')
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices?.[0]?.message?.content

    try {
      const result = JSON.parse(aiResponse)
      return c.json({
        success: true,
        data: result
      })
    } catch {
      return c.json({
        success: true,
        data: {
          predictions: {
            views24h: Math.round(parseInt(video.statistics?.viewCount || '0') * 1.2),
            views7d: Math.round(parseInt(video.statistics?.viewCount || '0') * 3),
            viewsFinal: Math.round(parseInt(video.statistics?.viewCount || '0') * 5),
            performanceLevel: 'normal',
            confidence: 60
          },
          recommendations: {
            optimalUploadTime: { dayOfWeek: 2, hourOfDay: 18, reason: '구독자 활동 피크타임' },
            keywords: ['추천 키워드 생성 중'],
            videoLength: { min: 8, max: 15 },
            thumbnailSuggestions: ['시선을 끄는 썸네일 사용']
          }
        }
      })
    }

  } catch (error: any) {
    console.error('Prediction error:', error)
    return c.json({
      success: false,
      error: {
        code: 'PREDICTION_ERROR',
        message: error.message || '예측 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 6C: 영상 추천 알고리즘
// ========================================
app.post('/api/youtube/recommend', async (c) => {
  try {
    const { videos, mode = 'performance' } = await c.req.json()
    
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '영상 데이터가 필요합니다.'
        }
      }, 400)
    }
    
    // 추천 알고리즘 3가지 모드
    let recommendations: any[] = []
    
    switch (mode) {
      case 'performance':
        // 1. 성과도 기반 추천 (상위 20% 고성과 영상)
        recommendations = videos
          .filter((v: any) => v.performance?.score)
          .sort((a: any, b: any) => b.performance.score - a.performance.score)
          .slice(0, 10)
          .map((v: any, idx: number) => ({
            rank: idx + 1,
            videoId: v.id,
            title: v.snippet.title,
            thumbnail: v.snippet.thumbnails.medium.url,
            channelTitle: v.snippet.channelTitle,
            viewCount: v.statistics.viewCount,
            likeCount: v.statistics.likeCount,
            commentCount: v.statistics.commentCount,
            performanceScore: v.performance.score,
            performanceLevel: v.performance.level,
            reason: `성과 점수 ${v.performance.score.toFixed(1)}점으로 상위 ${Math.ceil((idx + 1) / videos.length * 100)}% 영상`
          }))
        break
      
      case 'similarity':
        // 2. 유사도 기반 추천 (첫 번째 영상과 유사한 영상)
        const referenceVideo = videos[0]
        recommendations = videos
          .slice(1) // 첫 번째 제외
          .map((v: any) => {
            // 간단한 유사도 계산 (카테고리, 채널, 키워드 기반)
            let similarityScore = 0
            
            // 같은 카테고리 (+30점)
            if (v.snippet.categoryId === referenceVideo.snippet.categoryId) {
              similarityScore += 30
            }
            
            // 같은 채널 (+50점)
            if (v.snippet.channelId === referenceVideo.snippet.channelId) {
              similarityScore += 50
            }
            
            // 제목 키워드 유사도 (+20점)
            const refKeywords = referenceVideo.snippet.title.toLowerCase().split(' ')
            const vidKeywords = v.snippet.title.toLowerCase().split(' ')
            const commonKeywords = refKeywords.filter((k: string) => vidKeywords.includes(k))
            similarityScore += Math.min(commonKeywords.length * 5, 20)
            
            return { ...v, similarityScore }
          })
          .sort((a: any, b: any) => b.similarityScore - a.similarityScore)
          .slice(0, 10)
          .map((v: any, idx: number) => ({
            rank: idx + 1,
            videoId: v.id,
            title: v.snippet.title,
            thumbnail: v.snippet.thumbnails.medium.url,
            channelTitle: v.snippet.channelTitle,
            viewCount: v.statistics.viewCount,
            similarityScore: v.similarityScore,
            reason: `기준 영상과 ${v.similarityScore}% 유사 (카테고리/채널/키워드 기반)`
          }))
        break
      
      case 'niche':
        // 3. 틈새 전략 추천 (낮은 경쟁, 높은 성과)
        recommendations = videos
          .filter((v: any) => {
            const views = v.statistics.viewCount
            const subs = v.channelInfo?.subscriberCount || 0
            // 구독자 대비 높은 조회수 (성과도 높음) + 중소 채널
            return subs < 100000 && views > subs * 2
          })
          .sort((a: any, b: any) => {
            const ratioA = a.statistics.viewCount / (a.channelInfo?.subscriberCount || 1)
            const ratioB = b.statistics.viewCount / (b.channelInfo?.subscriberCount || 1)
            return ratioB - ratioA
          })
          .slice(0, 10)
          .map((v: any, idx: number) => {
            const ratio = (v.statistics.viewCount / (v.channelInfo?.subscriberCount || 1)).toFixed(2)
            return {
              rank: idx + 1,
              videoId: v.id,
              title: v.snippet.title,
              thumbnail: v.snippet.thumbnails.medium.url,
              channelTitle: v.snippet.channelTitle,
              viewCount: v.statistics.viewCount,
              subscriberCount: v.channelInfo?.subscriberCount || 0,
              ratio: parseFloat(ratio),
              reason: `구독자 대비 ${ratio}배 조회수 (틈새 시장 기회)`
            }
          })
        break
      
      default:
        return c.json<ApiResponse<null>>({
          success: false,
          error: {
            code: 'INVALID_MODE',
            message: 'mode는 performance, similarity, niche 중 하나여야 합니다.'
          }
        }, 400)
    }
    
    return c.json({
      success: true,
      data: {
        mode,
        totalVideos: videos.length,
        recommendations,
        summary: {
          mode: mode === 'performance' ? '성과도 기반' : mode === 'similarity' ? '유사도 기반' : '틈새 전략',
          count: recommendations.length,
          description: mode === 'performance' 
            ? '높은 성과를 보이는 영상들을 추천합니다'
            : mode === 'similarity'
            ? '기준 영상과 유사한 콘텐츠를 추천합니다'
            : '낮은 경쟁에서 높은 성과를 거둔 틈새 시장 영상을 추천합니다'
        }
      }
    })
    
  } catch (error: any) {
    console.error('Recommendation error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'RECOMMENDATION_ERROR',
        message: error.message || '추천 생성 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 6D: 성과 시뮬레이터
// ========================================
app.post('/api/youtube/simulate', async (c) => {
  try {
    const { 
      subscriberCount,
      uploadFrequency,  // 월 업로드 횟수
      avgWatchTime,     // 평균 시청 시간 (초)
      avgLikeRate,      // 평균 좋아요율 (%)
      categoryId,       // 카테고리 ID
      targetPeriod = 30 // 시뮬레이션 기간 (일)
    } = await c.req.json()
    
    // 입력 검증
    if (!subscriberCount || !uploadFrequency) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '구독자 수와 업로드 빈도는 필수입니다.'
        }
      }, 400)
    }
    
    // 기본값 설정
    const watchTime = avgWatchTime || 180  // 기본 3분
    const likeRate = avgLikeRate || 3      // 기본 3%
    
    // ========================================
    // 성과 예측 알고리즘
    // ========================================
    
    // 1. 기본 조회수 예측 (구독자 기반)
    // 일반적으로 구독자의 5-15%가 초기 조회
    const baseViewRate = 0.10  // 10% 기본값
    const baseViews = subscriberCount * baseViewRate
    
    // 2. 알고리즘 부스트 계산
    // 요소: 시청 시간, 좋아요율, 업로드 빈도
    let algorithmBoost = 1.0
    
    // 시청 시간 영향 (180초 이상이면 보너스)
    if (watchTime >= 180) {
      algorithmBoost += 0.2
    }
    if (watchTime >= 300) {
      algorithmBoost += 0.3  // 5분 이상이면 추가 보너스
    }
    
    // 좋아요율 영향 (3% 이상이면 보너스)
    if (likeRate >= 3) {
      algorithmBoost += 0.15
    }
    if (likeRate >= 5) {
      algorithmBoost += 0.25  // 5% 이상이면 추가 보너스
    }
    
    // 업로드 빈도 영향 (주 2회 이상이면 보너스)
    const uploadsPerWeek = uploadFrequency / 4
    if (uploadsPerWeek >= 2) {
      algorithmBoost += 0.2
    }
    if (uploadsPerWeek >= 4) {
      algorithmBoost += 0.3  // 주 4회 이상이면 추가 보너스
    }
    
    // 3. 카테고리 보정 계수
    const categoryMultipliers: Record<string, number> = {
      '10': 1.5,  // 음악 (높은 조회수)
      '20': 1.4,  // 게임
      '24': 1.3,  // 엔터테인먼트
      '22': 1.2,  // 브이로그
      '27': 1.1,  // 교육
      '28': 1.1,  // 과학기술
    }
    const categoryMultiplier = categoryId ? (categoryMultipliers[categoryId] || 1.0) : 1.0
    
    // 4. 최종 예측 조회수
    const predictedViews = Math.round(baseViews * algorithmBoost * categoryMultiplier)
    
    // 5. 기간별 예측
    const dailyUploadCount = uploadFrequency / 30
    const totalUploads = Math.ceil(dailyUploadCount * targetPeriod)
    const totalViews = predictedViews * totalUploads
    
    // 6. 수익 예측 (CPM 기준)
    // 한국 평균 CPM: $1.5-3.0 (₩2,000-4,000)
    const avgCPM = 3000  // 원화 기준
    const estimatedRevenue = Math.round((totalViews / 1000) * avgCPM)
    
    // 7. 구독자 증가 예측
    // 일반적으로 조회수의 1-3%가 구독 전환
    const subscriptionRate = 0.02  // 2%
    const newSubscribers = Math.round(totalViews * subscriptionRate)
    const finalSubscribers = subscriberCount + newSubscribers
    
    // 8. 성장 속도 등급
    let growthRate = 'normal'
    const growthPercentage = (newSubscribers / subscriberCount) * 100
    if (growthPercentage >= 50) growthRate = 'explosive'
    else if (growthPercentage >= 20) growthRate = 'fast'
    else if (growthPercentage >= 10) growthRate = 'steady'
    else if (growthPercentage < 5) growthRate = 'slow'
    
    // 9. 결과 반환
    return c.json({
      success: true,
      data: {
        input: {
          subscriberCount,
          uploadFrequency,
          avgWatchTime: watchTime,
          avgLikeRate: likeRate,
          categoryId,
          targetPeriod
        },
        predictions: {
          avgViewsPerVideo: predictedViews,
          totalUploads,
          totalViews,
          estimatedRevenue,
          newSubscribers,
          finalSubscribers,
          growthRate,
          growthPercentage: parseFloat(growthPercentage.toFixed(2))
        },
        breakdown: {
          baseViews,
          algorithmBoost: parseFloat(algorithmBoost.toFixed(2)),
          categoryMultiplier,
          factors: {
            watchTime: watchTime >= 180 ? 'positive' : 'neutral',
            likeRate: likeRate >= 3 ? 'positive' : 'neutral',
            uploadFrequency: uploadsPerWeek >= 2 ? 'positive' : 'neutral'
          }
        },
        recommendations: [
          algorithmBoost < 1.5 && '시청 시간을 5분 이상으로 늘리세요 (알고리즘 신호 강화)',
          likeRate < 3 && '좋아요율을 3% 이상으로 높이세요 (콜투액션 추가)',
          uploadsPerWeek < 2 && '주 2회 이상 업로드하세요 (채널 활성도 향상)',
          subscriberCount < 1000 && '구독자 1,000명 달성에 집중하세요 (수익화 조건)'
        ].filter(Boolean)
      }
    })
    
  } catch (error: any) {
    console.error('Simulation error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'SIMULATION_ERROR',
        message: error.message || '시뮬레이션 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 6E: 영상 상세 분석 (딥다이브)
// ========================================
app.post('/api/youtube/deep-analyze', async (c) => {
  try {
    const { videoId, videoUrl } = await c.req.json()
    
    // YouTube API 키 확인
    const youtubeApiKey = c.env?.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'YouTube API 키가 설정되지 않았습니다.'
        }
      }, 500)
    }
    
    // OpenAI API 키 확인
    const openaiApiKey = c.env?.OPENAI_API_KEY
    if (!openaiApiKey) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'OpenAI API 키가 설정되지 않았습니다.'
        }
      }, 500)
    }
    
    // videoId 추출
    let extractedVideoId = videoId
    if (videoUrl && !videoId) {
      const urlMatch = videoUrl.match(/(?:v=|\/)([\w-]{11})/)
      if (urlMatch) {
        extractedVideoId = urlMatch[1]
      }
    }
    
    if (!extractedVideoId) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '영상 ID 또는 URL이 필요합니다.'
        }
      }, 400)
    }
    
    // 1. YouTube API로 영상 정보 가져오기
    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${extractedVideoId}&key=${youtubeApiKey}`
    )
    
    if (!videoResponse.ok) {
      throw new Error('YouTube API 호출 실패')
    }
    
    const videoData = await videoResponse.json()
    if (!videoData.items || videoData.items.length === 0) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VIDEO_NOT_FOUND',
          message: '영상을 찾을 수 없습니다.'
        }
      }, 404)
    }
    
    const video = videoData.items[0]
    const { snippet, statistics, contentDetails } = video
    
    // 2. 채널 정보 가져오기
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${snippet.channelId}&key=${youtubeApiKey}`
    )
    
    const channelData = await channelResponse.json()
    const channel = channelData.items?.[0]
    
    // 3. 성과도 계산
    const viewCount = parseInt(statistics.viewCount || 0)
    const subscriberCount = parseInt(channel?.statistics?.subscriberCount || 0)
    const performance = subscriberCount > 0 ? (viewCount / subscriberCount) * 100 : 0
    
    let performanceLevel = 'normal'
    if (performance >= 300) performanceLevel = 'viral'
    else if (performance >= 100) performanceLevel = 'algorithm'
    else if (performance < 50) performanceLevel = 'low'
    
    // 4. GPT-4 분석 요청
    const analysisPrompt = `다음 YouTube 영상을 전문적으로 분석해주세요:

제목: ${snippet.title}
채널: ${snippet.channelTitle}
조회수: ${statistics.viewCount}
좋아요: ${statistics.likeCount}
댓글: ${statistics.commentCount}
구독자: ${subscriberCount}
성과도: ${performance.toFixed(2)}% (${performanceLevel})
설명: ${snippet.description.substring(0, 500)}

다음 항목을 JSON 형식으로 분석해주세요:
{
  "strengths": ["강점 1", "강점 2", "강점 3"],
  "weaknesses": ["약점 1", "약점 2"],
  "opportunities": ["기회 1", "기회 2", "기회 3"],
  "threats": ["위협 1", "위협 2"],
  "titleAnalysis": {
    "score": 85,
    "feedback": "제목 분석 피드백"
  },
  "thumbnailSuggestions": ["제안 1", "제안 2"],
  "contentStrategy": "콘텐츠 전략 제안",
  "targetAudience": "타겟 오디언스 분석",
  "engagementTips": ["팁 1", "팁 2", "팁 3"]
}`

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 YouTube 콘텐츠 전략 전문가입니다. SWOT 분석과 실행 가능한 인사이트를 제공합니다.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })
    
    if (!aiResponse.ok) {
      throw new Error('OpenAI API 호출 실패')
    }
    
    const aiResult = await aiResponse.json()
    const analysis = JSON.parse(aiResult.choices[0].message.content)
    
    // 5. 결과 반환
    return c.json({
      success: true,
      data: {
        video: {
          id: extractedVideoId,
          title: snippet.title,
          description: snippet.description,
          thumbnail: snippet.thumbnails.high.url,
          channelTitle: snippet.channelTitle,
          channelId: snippet.channelId,
          publishedAt: snippet.publishedAt,
          duration: contentDetails.duration
        },
        statistics: {
          viewCount: parseInt(statistics.viewCount || 0),
          likeCount: parseInt(statistics.likeCount || 0),
          commentCount: parseInt(statistics.commentCount || 0),
          subscriberCount
        },
        performance: {
          score: parseFloat(performance.toFixed(2)),
          level: performanceLevel,
          likeRate: parseFloat(((parseInt(statistics.likeCount || 0) / viewCount) * 100).toFixed(2))
        },
        analysis
      }
    })
    
  } catch (error: any) {
    console.error('Deep analysis error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'ANALYSIS_ERROR',
        message: error.message || '분석 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 6F: 채널 성장 추적
// ========================================
app.post('/api/youtube/channel-growth', async (c) => {
  try {
    const { channelId, channelUrl, period = 30 } = await c.req.json()
    
    // YouTube API 키 확인
    const youtubeApiKey = c.env?.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'API_KEY_MISSING',
          message: 'YouTube API 키가 설정되지 않았습니다.'
        }
      }, 500)
    }
    
    // channelId 추출
    let extractedChannelId = channelId
    if (channelUrl && !channelId) {
      const urlMatch = channelUrl.match(/(?:channel\/|@)([\w-]+)/)
      if (urlMatch) {
        extractedChannelId = urlMatch[1]
      }
    }
    
    if (!extractedChannelId) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '채널 ID 또는 URL이 필요합니다.'
        }
      }, 400)
    }
    
    // 1. 채널 정보 가져오기
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${extractedChannelId}&key=${youtubeApiKey}`
    )
    
    if (!channelResponse.ok) {
      throw new Error('YouTube API 호출 실패')
    }
    
    const channelData = await channelResponse.json()
    if (!channelData.items || channelData.items.length === 0) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'CHANNEL_NOT_FOUND',
          message: '채널을 찾을 수 없습니다.'
        }
      }, 404)
    }
    
    const channel = channelData.items[0]
    
    // 2. 최근 영상 가져오기 (최대 50개)
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${extractedChannelId}&order=date&type=video&maxResults=50&key=${youtubeApiKey}`
    )
    
    const videosData = await videosResponse.json()
    const videoIds = videosData.items?.map((item: any) => item.id.videoId).join(',') || ''
    
    // 3. 영상 상세 정보 가져오기
    let videos = []
    if (videoIds) {
      const videoDetailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${youtubeApiKey}`
      )
      const videoDetailsData = await videoDetailsResponse.json()
      videos = videoDetailsData.items || []
    }
    
    // 4. 기간별 데이터 집계 (최근 N일)
    const now = new Date()
    const periodDays = Math.min(period, 365)  // 최대 1년
    const timeline = Array(periodDays).fill(null).map((_, idx) => {
      const date = new Date(now)
      date.setDate(date.getDate() - (periodDays - 1 - idx))
      return {
        date: date.toISOString().split('T')[0],
        uploads: 0,
        views: 0,
        likes: 0,
        comments: 0
      }
    })
    
    // 5. 영상을 날짜별로 분류
    videos.forEach((video: any) => {
      const publishDate = new Date(video.snippet.publishedAt)
      const daysDiff = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff >= 0 && daysDiff < periodDays) {
        const idx = periodDays - 1 - daysDiff
        timeline[idx].uploads++
        timeline[idx].views += parseInt(video.statistics.viewCount || 0)
        timeline[idx].likes += parseInt(video.statistics.likeCount || 0)
        timeline[idx].comments += parseInt(video.statistics.commentCount || 0)
      }
    })
    
    // 6. 누적 데이터 계산
    let cumulativeUploads = 0
    let cumulativeViews = 0
    const cumulativeTimeline = timeline.map(day => {
      cumulativeUploads += day.uploads
      cumulativeViews += day.views
      return {
        ...day,
        cumulativeUploads,
        cumulativeViews
      }
    })
    
    // 7. 성장 지표 계산
    const firstWeekViews = timeline.slice(0, 7).reduce((sum, day) => sum + day.views, 0)
    const lastWeekViews = timeline.slice(-7).reduce((sum, day) => sum + day.views, 0)
    const viewsGrowth = firstWeekViews > 0 ? ((lastWeekViews - firstWeekViews) / firstWeekViews) * 100 : 0
    
    const avgUploadsPerWeek = timeline.reduce((sum, day) => sum + day.uploads, 0) / (periodDays / 7)
    const avgViewsPerVideo = videos.length > 0 
      ? videos.reduce((sum: number, v: any) => sum + parseInt(v.statistics.viewCount || 0), 0) / videos.length
      : 0
    
    // 8. 결과 반환
    return c.json({
      success: true,
      data: {
        channel: {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnail: channel.snippet.thumbnails.high.url,
          subscriberCount: parseInt(channel.statistics.subscriberCount || 0),
          videoCount: parseInt(channel.statistics.videoCount || 0),
          viewCount: parseInt(channel.statistics.viewCount || 0)
        },
        timeline: cumulativeTimeline,
        metrics: {
          period: periodDays,
          totalUploads: videos.length,
          avgUploadsPerWeek: parseFloat(avgUploadsPerWeek.toFixed(2)),
          avgViewsPerVideo: Math.round(avgViewsPerVideo),
          viewsGrowth: parseFloat(viewsGrowth.toFixed(2)),
          firstWeekViews,
          lastWeekViews
        },
        recentVideos: videos.slice(0, 10).map((v: any) => ({
          id: v.id,
          title: v.snippet.title,
          thumbnail: v.snippet.thumbnails.medium.url,
          viewCount: parseInt(v.statistics.viewCount || 0),
          likeCount: parseInt(v.statistics.likeCount || 0),
          publishedAt: v.snippet.publishedAt
        }))
      }
    })
    
  } catch (error: any) {
    console.error('Channel growth error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'GROWTH_TRACKING_ERROR',
        message: error.message || '성장 추적 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// ========================================
// Phase 6G: A/B 테스트 시뮬레이터
// ========================================
app.post('/api/youtube/ab-test', async (c) => {
  try {
    const { variantA, variantB, channelStats } = await c.req.json()
    
    // 입력 검증
    if (!variantA || !variantB) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'A/B 테스트 변형이 필요합니다.'
        }
      }, 400)
    }
    
    // OpenAI API 키 확인
    const openaiApiKey = c.env?.OPENAI_API_KEY
    
    // ========================================
    // A/B 테스트 시뮬레이션 알고리즘
    // ========================================
    
    // 1. 제목 점수 계산 함수
    function calculateTitleScore(title: string): number {
      let score = 50  // 기본 점수
      
      // 길이 (40-70자가 최적)
      const length = title.length
      if (length >= 40 && length <= 70) score += 15
      else if (length >= 30 && length <= 80) score += 10
      else if (length < 20 || length > 100) score -= 10
      
      // 숫자 포함 (클릭률 향상)
      if (/\d+/.test(title)) score += 10
      
      // 특수문자/이모지 (주의 끌기)
      if (/[!?💥🔥⚡✨]/.test(title)) score += 5
      
      // 부정적 키워드 (호기심 유발)
      if (/(실패|망했|최악|주의|위험)/.test(title)) score += 8
      
      // 긍정적 키워드 (감정 자극)
      if (/(완벽|최고|꿀팁|필수|추천)/.test(title)) score += 8
      
      // 대괄호/괄호 사용 (구조화)
      if (/[\[\(]/.test(title)) score += 5
      
      return Math.min(Math.max(score, 0), 100)
    }
    
    // 2. 썸네일 점수 계산 함수 (간단한 휴리스틱)
    function calculateThumbnailScore(thumbnail: any): number {
      let score = 50
      
      if (thumbnail.hasFace) score += 15
      if (thumbnail.hasText) score += 10
      if (thumbnail.isHighContrast) score += 10
      if (thumbnail.usesBrightColors) score += 8
      if (thumbnail.hasArrow) score += 5
      
      return Math.min(Math.max(score, 0), 100)
    }
    
    // 3. 변형 A 점수
    const scoreA = {
      title: calculateTitleScore(variantA.title),
      thumbnail: calculateThumbnailScore(variantA.thumbnail || {}),
      overall: 0
    }
    scoreA.overall = (scoreA.title * 0.6 + scoreA.thumbnail * 0.4)
    
    // 4. 변형 B 점수
    const scoreB = {
      title: calculateTitleScore(variantB.title),
      thumbnail: calculateThumbnailScore(variantB.thumbnail || {}),
      overall: 0
    }
    scoreB.overall = (scoreB.title * 0.6 + scoreB.thumbnail * 0.4)
    
    // 5. 클릭률(CTR) 예측
    const baseCTR = channelStats?.avgCTR || 5  // 기본 5%
    const ctrA = baseCTR * (scoreA.overall / 50)
    const ctrB = baseCTR * (scoreB.overall / 50)
    
    // 6. 조회수 예측 (구독자 기반)
    const subscribers = channelStats?.subscriberCount || 10000
    const impressions = subscribers * 10  // 노출수 = 구독자 × 10
    
    const viewsA = Math.round(impressions * (ctrA / 100))
    const viewsB = Math.round(impressions * (ctrB / 100))
    
    // 7. 승자 결정
    const winner = scoreA.overall > scoreB.overall ? 'A' : 'B'
    const improvement = Math.abs(scoreA.overall - scoreB.overall)
    
    // 8. AI 분석 (OpenAI 사용 가능 시)
    let aiInsights = null
    if (openaiApiKey) {
      try {
        const aiPrompt = `다음 두 YouTube 제목을 비교 분석해주세요:

변형 A: "${variantA.title}"
변형 B: "${variantB.title}"

JSON 형식으로 다음을 제공해주세요:
{
  "comparison": "비교 분석 (100자)",
  "winner": "A" 또는 "B",
  "reason": "승자 선정 이유 (150자)",
  "improvements": ["개선 제안 1", "개선 제안 2"]
}`

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'YouTube 제목 최적화 전문가입니다.' },
              { role: 'user', content: aiPrompt }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
          })
        })
        
        if (aiResponse.ok) {
          const aiResult = await aiResponse.json()
          aiInsights = JSON.parse(aiResult.choices[0].message.content)
        }
      } catch (error) {
        console.error('AI insights error:', error)
      }
    }
    
    // 9. 결과 반환
    return c.json({
      success: true,
      data: {
        variantA: {
          ...variantA,
          scores: scoreA,
          predictedCTR: parseFloat(ctrA.toFixed(2)),
          predictedViews: viewsA
        },
        variantB: {
          ...variantB,
          scores: scoreB,
          predictedCTR: parseFloat(ctrB.toFixed(2)),
          predictedViews: viewsB
        },
        result: {
          winner,
          improvement: parseFloat(improvement.toFixed(2)),
          confidenceLevel: improvement > 20 ? 'high' : improvement > 10 ? 'medium' : 'low',
          recommendation: winner === 'A' 
            ? `변형 A가 ${improvement.toFixed(1)}% 더 우수합니다`
            : `변형 B가 ${improvement.toFixed(1)}% 더 우수합니다`
        },
        aiInsights
      }
    })
    
  } catch (error: any) {
    console.error('A/B test error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'AB_TEST_ERROR',
        message: error.message || 'A/B 테스트 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

// Phase 7: PDF 보고서 데이터 수집 API
app.post('/api/youtube/report/generate', async (c) => {
  try {
    const body = await c.req.json()
    const { sections, channelInfo, dateRange } = body
    
    // 입력 검증
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return c.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'sections 배열은 필수입니다.'
        }
      }, 400)
    }
    
    // 보고서 메타데이터 생성
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange: dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      channelInfo: channelInfo || {
        name: '분석 대상 채널',
        id: '',
        thumbnail: ''
      },
      sections: sections,
      summary: {
        totalSections: sections.length,
        includedAnalysis: sections.map((s: any) => s.type),
        pageCount: Math.ceil(sections.length * 2) // 섹션당 약 2페이지 추정
      }
    }
    
    return c.json<ApiResponse<any>>({
      success: true,
      data: reportData
    })
    
  } catch (error: any) {
    console.error('Report generation error:', error)
    return c.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'REPORT_ERROR',
        message: error.message || '보고서 생성 중 오류가 발생했습니다.'
      }
    }, 500)
  }
})

export default app
