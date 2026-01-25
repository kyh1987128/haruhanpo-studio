# YouTube 분석기 백엔드 API 개발 가이드

## 📋 개요

**목표**: YouTube 영상 분석 API 엔드포인트 구축  
**기술 스택**: Hono + Cloudflare Workers + Supabase  
**예상 소요 시간**: 2-3시간

---

## 🎯 API 요구사항

### 핵심 기능

1. **캐시 우선 조회** - 비용 90% 절감
2. **7가지 분석 타입** 지원
3. **크레딧 차감** 연동
4. **히스토리 자동 저장**
5. **에러 핸들링** 및 로깅

---

## 📊 API 엔드포인트 명세

### 1️⃣ YouTube 영상 분석 API

```typescript
POST /api/youtube/analyze

// Request Body
{
  videoUrl: string,           // YouTube 영상 URL
  analysisType: string        // 분석 타입 (아래 7가지 중 1개)
}

// 분석 타입 (7가지)
type AnalysisType = 
  | 'video-stats'           // 영상 통계 분석
  | 'success-factors'       // 성공 요인 분석
  | 'title-optimization'    // 제목 최적화 제안
  | 'sentiment-analysis'    // 댓글 감성 분석
  | 'channel-strategy'      // 채널 전략 분석
  | 'video-ideas'           // 영상 아이디어 제안
  | 'competitor'            // 경쟁자 분석

// Response
{
  success: true,
  data: {
    videoId: string,
    videoInfo: {
      title: string,
      channel: string,
      channelId: string,
      views: number,
      likes: number,
      comments: number,
      subscriberCount: number,
      duration: number,
      publishedAt: string
    },
    analysisResult: object,    // 분석 타입별 결과
    aiSummary: string,         // AI 요약
    creditsUsed: number,       // 사용된 크레딧
    wasCached: boolean,        // 캐시 히트 여부
    cacheExpiresAt: string     // 캐시 만료 시각
  }
}

// Error Response
{
  success: false,
  error: {
    code: string,
    message: string
  }
}
```

### 2️⃣ 분석 히스토리 조회 API

```typescript
GET /api/youtube/history?page=1&limit=10

// Query Parameters
{
  page: number,              // 페이지 번호 (기본: 1)
  limit: number,             // 페이지당 개수 (기본: 10, 최대: 50)
  analysisType?: string      // 필터링 (선택)
}

// Response
{
  success: true,
  data: {
    items: [
      {
        id: string,
        videoId: string,
        videoTitle: string,
        channelName: string,
        analysisType: string,
        aiSummary: string,
        creditsUsed: number,
        wasCached: boolean,
        createdAt: string
      }
    ],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

### 3️⃣ 캐시 통계 조회 API (관리자용)

```typescript
GET /api/youtube/cache/stats

// Response
{
  success: true,
  data: {
    totalCached: number,           // 총 캐시 개수
    hitRate: number,               // 캐시 히트율 (%)
    averageHitCount: number,       // 평균 히트 횟수
    topVideos: [
      {
        videoId: string,
        analysisType: string,
        hitCount: number,
        expiresAt: string
      }
    ]
  }
}
```

---

## 🔧 구현 로직

### API 처리 흐름도

```
1. 요청 수신
   ↓
2. 인증 확인 (JWT)
   ↓
3. videoUrl → videoId 추출
   ↓
4. 캐시 조회 (youtube_analysis_cache)
   ├─ 캐시 히트 → 즉시 반환 (0 크레딧)
   │  └─ hit_count +1
   └─ 캐시 미스 → 다음 단계
      ↓
5. 크레딧 확인
   ├─ 부족 → 에러 반환
   └─ 충분 → 다음 단계
      ↓
6. 크레딧 차감 (deduct_credits_safe)
   ↓
7. YouTube Data API 호출
   ↓
8. GPT-4 분석 요청
   ↓
9. 캐시 저장 (youtube_analysis_cache)
   ├─ expires_at = NOW() + TTL (분석타입별)
   └─ hit_count = 0
   ↓
10. 히스토리 저장 (youtube_analysis_history)
    ├─ Trigger 자동 실행 → user_stats 업데이트
    └─ credits_used, was_cached 기록
    ↓
11. 결과 반환
```

---

## 💻 코드 구조 (Hono)

### 디렉토리 구조

```
src/
├── routes/
│   └── youtube.ts              # YouTube API 라우트
├── services/
│   ├── youtube-api.ts          # YouTube Data API 클라이언트
│   ├── openai.ts               # OpenAI GPT-4 클라이언트
│   ├── cache.ts                # 캐시 관리 서비스
│   └── history.ts              # 히스토리 관리 서비스
├── middleware/
│   ├── auth.ts                 # JWT 인증 미들웨어
│   └── rate-limit.ts           # 속도 제한 미들웨어
├── types/
│   └── youtube.ts              # TypeScript 타입 정의
└── utils/
    ├── youtube-url.ts          # YouTube URL 파싱
    └── credit-manager.ts       # 크레딧 관리
```

---

## 🔑 환경 변수 설정

### .dev.vars (로컬 개발)

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# YouTube Data API
YOUTUBE_API_KEY=AIzaSyxxx...

# OpenAI
OPENAI_API_KEY=sk-xxx...

# JWT Secret
JWT_SECRET=your-secret-key
```

### wrangler.jsonc (Cloudflare Workers 배포)

```jsonc
{
  "name": "haruhanpo-studio-new",
  "compatibility_date": "2024-01-01",
  "main": "src/index.tsx",
  
  // 환경 변수 (프로덕션)
  "vars": {
    "ENVIRONMENT": "production"
  }
  
  // 시크릿은 wrangler secret put으로 별도 설정
  // wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  // wrangler secret put YOUTUBE_API_KEY
  // wrangler secret put OPENAI_API_KEY
  // wrangler secret put JWT_SECRET
}
```

---

## 📝 핵심 구현 예시

### 1. 캐시 조회 서비스

```typescript
// src/services/cache.ts
import { createClient } from '@supabase/supabase-js'

export async function getCachedAnalysis(
  supabase: any,
  videoId: string,
  analysisType: string
) {
  const { data, error } = await supabase
    .from('youtube_analysis_cache')
    .select('*')
    .eq('video_id', videoId)
    .eq('analysis_type', analysisType)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null

  // 히트 카운트 증가 (별도 트랜잭션)
  await supabase
    .from('youtube_analysis_cache')
    .update({ hit_count: data.hit_count + 1 })
    .eq('video_id', videoId)
    .eq('analysis_type', analysisType)

  return data
}

export async function saveCacheAnalysis(
  supabase: any,
  videoId: string,
  analysisType: string,
  analysisResult: object,
  videoInfo: object,
  ttlHours: number = 24
) {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + ttlHours)

  const { data, error } = await supabase
    .from('youtube_analysis_cache')
    .insert({
      video_id: videoId,
      analysis_type: analysisType,
      analysis_result: analysisResult,
      video_info: videoInfo,
      expires_at: expiresAt.toISOString(),
      hit_count: 0
    })

  if (error) throw error
  return data
}
```

### 2. 히스토리 저장 서비스

```typescript
// src/services/history.ts
export async function saveAnalysisHistory(
  supabase: any,
  userId: string,
  videoId: string,
  videoUrl: string,
  videoInfo: any,
  analysisType: string,
  analysisResult: object,
  aiSummary: string,
  creditsUsed: number,
  wasCached: boolean
) {
  const { data, error } = await supabase
    .from('youtube_analysis_history')
    .insert({
      user_id: userId,
      video_id: videoId,
      video_url: videoUrl,
      video_title: videoInfo.title,
      channel_name: videoInfo.channel,
      channel_id: videoInfo.channelId,
      views: videoInfo.views,
      likes: videoInfo.likes,
      comments: videoInfo.comments,
      subscriber_count: videoInfo.subscriberCount,
      duration: videoInfo.duration,
      published_at: videoInfo.publishedAt,
      analysis_type: analysisType,
      analysis_result: analysisResult,
      ai_summary: aiSummary,
      credits_used: creditsUsed,
      was_cached: wasCached
    })
    .select()
    .single()

  if (error) {
    // UNIQUE 제약조건 위반 시 에러 처리
    if (error.code === '23505') {
      throw new Error('이미 분석한 영상입니다.')
    }
    throw error
  }

  return data
}
```

### 3. YouTube API 클라이언트

```typescript
// src/services/youtube-api.ts
export async function getVideoInfo(videoId: string, apiKey: string) {
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,statistics,contentDetails`
  
  const response = await fetch(url)
  const data = await response.json()

  if (!data.items || data.items.length === 0) {
    throw new Error('영상을 찾을 수 없습니다.')
  }

  const video = data.items[0]
  const snippet = video.snippet
  const statistics = video.statistics
  const contentDetails = video.contentDetails

  // 채널 정보 조회
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?id=${snippet.channelId}&key=${apiKey}&part=statistics`
  const channelResponse = await fetch(channelUrl)
  const channelData = await channelResponse.json()
  const subscriberCount = channelData.items[0]?.statistics?.subscriberCount || 0

  // duration 파싱 (PT4M13S → 253초)
  const duration = parseDuration(contentDetails.duration)

  return {
    title: snippet.title,
    channel: snippet.channelTitle,
    channelId: snippet.channelId,
    views: parseInt(statistics.viewCount || '0'),
    likes: parseInt(statistics.likeCount || '0'),
    comments: parseInt(statistics.commentCount || '0'),
    subscriberCount: parseInt(subscriberCount),
    duration: duration,
    publishedAt: snippet.publishedAt
  }
}

function parseDuration(duration: string): number {
  // PT4M13S → 253
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  return hours * 3600 + minutes * 60 + seconds
}
```

### 4. OpenAI 분석 클라이언트

```typescript
// src/services/openai.ts
export async function analyzeVideo(
  videoInfo: any,
  analysisType: string,
  apiKey: string
) {
  const prompt = getPromptByAnalysisType(analysisType, videoInfo)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: '당신은 YouTube 영상 분석 전문가입니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  const data = await response.json()
  const content = data.choices[0].message.content

  // JSON 파싱 (GPT-4가 JSON 형식으로 응답)
  const analysisResult = JSON.parse(content)

  return {
    analysisResult,
    aiSummary: analysisResult.summary || ''
  }
}

function getPromptByAnalysisType(analysisType: string, videoInfo: any): string {
  const baseInfo = `
영상 정보:
- 제목: ${videoInfo.title}
- 채널: ${videoInfo.channel}
- 조회수: ${videoInfo.views.toLocaleString()}
- 좋아요: ${videoInfo.likes.toLocaleString()}
- 댓글: ${videoInfo.comments.toLocaleString()}
- 구독자: ${videoInfo.subscriberCount.toLocaleString()}
- 길이: ${Math.floor(videoInfo.duration / 60)}분 ${videoInfo.duration % 60}초
- 게시일: ${videoInfo.publishedAt}
`

  const prompts = {
    'video-stats': `${baseInfo}

위 YouTube 영상의 통계를 분석하여 다음 JSON 형식으로 응답하세요:
{
  "engagement_rate": number,
  "view_trend": string,
  "best_time": string,
  "audience_retention": string,
  "summary": string
}`,

    'success-factors': `${baseInfo}

위 YouTube 영상의 성공 요인을 분석하여 다음 JSON 형식으로 응답하세요:
{
  "key_factors": [string],
  "content_strategy": string,
  "audience_targeting": string,
  "optimization_tips": [string],
  "summary": string
}`,

    'title-optimization': `${baseInfo}

현재 제목을 분석하고 더 나은 제목을 제안하세요 (JSON):
{
  "current_title_analysis": string,
  "suggested_titles": [string],
  "keyword_recommendations": [string],
  "summary": string
}`,

    'sentiment-analysis': `${baseInfo}

댓글 감성 분석 (가상):
{
  "positive_ratio": number,
  "negative_ratio": number,
  "neutral_ratio": number,
  "main_sentiments": [string],
  "summary": string
}`,

    'channel-strategy': `${baseInfo}

채널 성장 전략 제안:
{
  "content_pillars": [string],
  "upload_frequency": string,
  "collaboration_ideas": [string],
  "monetization_tips": [string],
  "summary": string
}`,

    'video-ideas': `${baseInfo}

유사한 콘텐츠 아이디어 제안:
{
  "trending_topics": [string],
  "content_ideas": [string],
  "hook_examples": [string],
  "summary": string
}`,

    'competitor': `${baseInfo}

경쟁자 분석:
{
  "competitive_advantages": [string],
  "improvement_areas": [string],
  "market_positioning": string,
  "summary": string
}`
  }

  return prompts[analysisType] || prompts['video-stats']
}
```

### 5. 메인 API 라우트

```typescript
// src/routes/youtube.ts
import { Hono } from 'hono'
import { getCachedAnalysis, saveCacheAnalysis } from '../services/cache'
import { saveAnalysisHistory } from '../services/history'
import { getVideoInfo } from '../services/youtube-api'
import { analyzeVideo } from '../services/openai'
import { extractVideoId } from '../utils/youtube-url'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  YOUTUBE_API_KEY: string
  OPENAI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// YouTube 영상 분석
app.post('/analyze', async (c) => {
  try {
    const { videoUrl, analysisType } = await c.req.json()

    // 1. videoId 추출
    const videoId = extractVideoId(videoUrl)
    if (!videoId) {
      return c.json({ success: false, error: 'Invalid YouTube URL' }, 400)
    }

    // 2. 인증 (JWT에서 userId 추출)
    const userId = c.get('userId') // 미들웨어에서 설정됨

    // 3. Supabase 클라이언트 생성
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 4. 캐시 조회
    const cachedData = await getCachedAnalysis(supabase, videoId, analysisType)
    if (cachedData) {
      // 캐시 히트 - 히스토리만 저장하고 즉시 반환
      await saveAnalysisHistory(
        supabase,
        userId,
        videoId,
        videoUrl,
        cachedData.video_info,
        analysisType,
        cachedData.analysis_result,
        cachedData.analysis_result.summary || '',
        0, // 캐시 히트는 0 크레딧
        true
      )

      return c.json({
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

    // 5. 크레딧 확인 및 차감
    const creditsRequired = 10 // 분석당 10 크레딧
    const { data: creditData, error: creditError } = await supabase
      .rpc('deduct_credits_safe', {
        p_user_id: userId,
        p_amount: creditsRequired
      })

    if (creditError || !creditData) {
      return c.json({
        success: false,
        error: '크레딧이 부족합니다.'
      }, 402)
    }

    // 6. YouTube Data API 호출
    const videoInfo = await getVideoInfo(videoId, c.env.YOUTUBE_API_KEY)

    // 7. GPT-4 분석
    const { analysisResult, aiSummary } = await analyzeVideo(
      videoInfo,
      analysisType,
      c.env.OPENAI_API_KEY
    )

    // 8. 캐시 저장 (24시간 TTL)
    await saveCacheAnalysis(
      supabase,
      videoId,
      analysisType,
      analysisResult,
      videoInfo,
      24
    )

    // 9. 히스토리 저장 (Trigger 자동 실행)
    await saveAnalysisHistory(
      supabase,
      userId,
      videoId,
      videoUrl,
      videoInfo,
      analysisType,
      analysisResult,
      aiSummary,
      creditsRequired,
      false
    )

    // 10. 결과 반환
    return c.json({
      success: true,
      data: {
        videoId,
        videoInfo,
        analysisResult,
        aiSummary,
        creditsUsed: creditsRequired,
        wasCached: false,
        cacheExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    })
  } catch (error: any) {
    console.error('YouTube analyze error:', error)
    return c.json({
      success: false,
      error: error.message || 'Internal server error'
    }, 500)
  }
})

// 히스토리 조회
app.get('/history', async (c) => {
  try {
    const userId = c.get('userId')
    const page = parseInt(c.req.query('page') || '1')
    const limit = Math.min(parseInt(c.req.query('limit') || '10'), 50)
    const analysisType = c.req.query('analysisType')

    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY
    )

    let query = supabase
      .from('youtube_analysis_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (analysisType) {
      query = query.eq('analysis_type', analysisType)
    }

    const { data, count, error } = await query

    if (error) throw error

    return c.json({
      success: true,
      data: {
        items: data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    })
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

export default app
```

---

## ⚙️ 배포 및 테스트

### 로컬 테스트

```bash
# 개발 서버 시작
npm run dev

# API 테스트 (curl)
curl -X POST http://localhost:3000/api/youtube/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "analysisType": "video-stats"
  }'
```

### Cloudflare Workers 배포

```bash
# 환경 변수 설정
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put YOUTUBE_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put JWT_SECRET

# 배포
npm run deploy
```

---

## 📋 체크리스트

### 개발 전
- [ ] Supabase 데이터베이스 구축 완료
- [ ] YouTube Data API 키 발급
- [ ] OpenAI API 키 발급
- [ ] JWT 인증 시스템 구축

### 개발 중
- [ ] 캐시 조회 서비스 구현
- [ ] 히스토리 저장 서비스 구현
- [ ] YouTube API 클라이언트 구현
- [ ] OpenAI 분석 클라이언트 구현
- [ ] 메인 API 라우트 구현
- [ ] 에러 핸들링 추가

### 개발 후
- [ ] 로컬 테스트 완료
- [ ] 캐시 히트/미스 시나리오 테스트
- [ ] 크레딧 차감 테스트
- [ ] Trigger 작동 확인 (user_stats 증가)
- [ ] 배포 및 프로덕션 테스트

---

**작성일**: 2026-01-28  
**작성자**: 웹빌더 AI  
**버전**: 1.0
