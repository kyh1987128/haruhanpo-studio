// Gemini API 분석 클라이언트 (OpenAI에서 전환됨)

import type { VideoInfo, AnalysisType } from '../types/youtube'

export class OpenAIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'OpenAIError'
  }
}

/**
 * Gemini API를 사용한 YouTube 영상 분석
 * (기존 OpenAI GPT-4 → Gemini 2.0 Flash로 전환)
 */
export async function analyzeVideo(
  videoInfo: VideoInfo,
  analysisType: AnalysisType,
  apiKey: string
): Promise<{ analysisResult: any; aiSummary: string }> {
  const prompt = getPromptByAnalysisType(analysisType, videoInfo)

  const systemInstruction = '당신은 YouTube 영상 분석 전문가입니다. 데이터를 기반으로 정확하고 실용적인 분석을 제공합니다. 응답은 반드시 유효한 JSON 형식이어야 합니다.'

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json'
        }
      })
    }
  )

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new OpenAIError('Gemini API 키가 유효하지 않습니다.', response.status)
    }
    if (response.status === 429) {
      throw new OpenAIError('Gemini API 사용량 한도를 초과했습니다.', 429)
    }
    throw new OpenAIError(`Gemini API 오류: ${response.statusText}`, response.status)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!content) {
    throw new OpenAIError('Gemini 응답이 비어있습니다.')
  }

  try {
    const analysisResult = JSON.parse(content)
    const aiSummary = analysisResult.summary || '요약을 생성할 수 없습니다.'
    
    return {
      analysisResult,
      aiSummary
    }
  } catch (error) {
    throw new OpenAIError('Gemini 응답을 파싱할 수 없습니다.')
  }
}

/**
 * Gemini API 공통 호출 헬퍼 (youtube.ts에서 사용)
 * OpenAI Chat Completions 형식을 Gemini generateContent 형식으로 변환
 */
export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number
    maxTokens?: number
    jsonMode?: boolean
  } = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2000, jsonMode = false } = options

  const generationConfig: any = {
    temperature,
    maxOutputTokens: maxTokens
  }

  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json'
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig
      })
    }
  )

  if (!response.ok) {
    const statusText = response.statusText || `HTTP ${response.status}`
    throw new Error(`Gemini API 호출 실패: ${statusText}`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!content) {
    throw new Error('Gemini 응답이 비어있습니다.')
  }

  return content
}

function getPromptByAnalysisType(analysisType: AnalysisType, videoInfo: VideoInfo): string {
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

  const prompts: Record<AnalysisType, string> = {
    'video-stats': `${baseInfo}

위 YouTube 영상의 통계를 분석하여 다음 JSON 형식으로 응답하세요:
{
  "engagement_rate": 참여율 (좋아요/조회수 * 100, 소수점 2자리),
  "view_trend": "상승세" | "안정세" | "하락세",
  "best_time": "평일 저녁" 등 최적 게시 시간 추정,
  "audience_retention": "높음" | "중간" | "낮음",
  "summary": "영상 통계에 대한 전반적인 요약 (2-3문장)"
}`,

    'success-factors': `${baseInfo}

위 YouTube 영상의 성공 요인을 분석하여 다음 JSON 형식으로 응답하세요:
{
  "key_factors": ["요인1", "요인2", "요인3"],
  "content_strategy": "콘텐츠 전략 설명 (2-3문장)",
  "audience_targeting": "타겟 오디언스 분석 (2-3문장)",
  "optimization_tips": ["팁1", "팁2", "팁3"],
  "summary": "성공 요인 종합 요약 (2-3문장)"
}`,

    'title-optimization': `${baseInfo}

현재 제목을 분석하고 더 나은 제목을 제안하세요:
{
  "current_title_analysis": "현재 제목의 강점과 약점 분석 (2-3문장)",
  "suggested_titles": ["개선된 제목1", "개선된 제목2", "개선된 제목3"],
  "keyword_recommendations": ["키워드1", "키워드2", "키워드3"],
  "summary": "제목 최적화 요약 (2-3문장)"
}`,

    'sentiment-analysis': `${baseInfo}

댓글 감성 분석 (가상 데이터 기반):
{
  "positive_ratio": 긍정 비율 (0-100),
  "negative_ratio": 부정 비율 (0-100),
  "neutral_ratio": 중립 비율 (0-100),
  "main_sentiments": ["주요 감정1", "주요 감정2", "주요 감정3"],
  "summary": "감성 분석 요약 (2-3문장)"
}

주의: positive_ratio + negative_ratio + neutral_ratio = 100이어야 합니다.`,

    'channel-strategy': `${baseInfo}

채널 성장 전략 제안:
{
  "content_pillars": ["콘텐츠 기둥1", "콘텐츠 기둥2", "콘텐츠 기둥3"],
  "upload_frequency": "주 2-3회" 등 최적 업로드 주기,
  "collaboration_ideas": ["협업 아이디어1", "협업 아이디어2"],
  "monetization_tips": ["수익화 팁1", "수익화 팁2"],
  "summary": "채널 전략 종합 요약 (2-3문장)"
}`,

    'video-ideas': `${baseInfo}

유사한 콘텐츠 아이디어 제안:
{
  "trending_topics": ["트렌드 주제1", "트렌드 주제2", "트렌드 주제3"],
  "content_ideas": ["콘텐츠 아이디어1", "콘텐츠 아이디어2", "콘텐츠 아이디어3"],
  "hook_examples": ["훅 예시1", "훅 예시2", "훅 예시3"],
  "summary": "영상 아이디어 제안 요약 (2-3문장)"
}`,

    'competitor': `${baseInfo}

경쟁자 분석:
{
  "competitive_advantages": ["강점1", "강점2", "강점3"],
  "improvement_areas": ["개선 영역1", "개선 영역2", "개선 영역3"],
  "market_positioning": "시장 포지셔닝 분석 (2-3문장)",
  "summary": "경쟁자 분석 종합 요약 (2-3문장)"
}`
  }

  return prompts[analysisType] || prompts['video-stats']
}
