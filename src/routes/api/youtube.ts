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

// 인증 미들웨어 적용 (모든 YouTube API는 로그인 필요)
app.use('/api/youtube/*', authMiddleware)

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
// Phase 2: YouTube 검색 API
// ========================================
app.post('/api/youtube/search', async (c) => {
  try {
    const body = await c.req.json()
    const { keyword, maxResults = 20, pageToken } = body

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

    // 3. 검색 실행
    const { searchYouTubeVideos } = await import('../../services/youtube-api')
    const result = await searchYouTubeVideos(keyword, youtubeApiKey, maxResults, pageToken)

    // 4. 결과 반환
    return c.json({
      success: true,
      data: {
        keyword,
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

export default app
