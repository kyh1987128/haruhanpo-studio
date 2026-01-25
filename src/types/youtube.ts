// YouTube 분석 타입 정의

export type AnalysisType = 
  | 'video-stats'           // 영상 통계 분석
  | 'success-factors'       // 성공 요인 분석
  | 'title-optimization'    // 제목 최적화 제안
  | 'sentiment-analysis'    // 댓글 감성 분석
  | 'channel-strategy'      // 채널 전략 분석
  | 'video-ideas'           // 영상 아이디어 제안
  | 'competitor'            // 경쟁자 분석

export interface VideoInfo {
  title: string
  channel: string
  channelId: string
  views: number
  likes: number
  comments: number
  subscriberCount: number
  duration: number           // 초 단위
  publishedAt: string
  description?: string
  tags?: string[]
  thumbnailUrl?: string
}

export interface AnalysisRequest {
  videoUrl: string
  analysisType: AnalysisType
}

export interface AnalysisResult {
  videoId: string
  videoInfo: VideoInfo
  analysisResult: any        // 분석 타입별로 다름
  aiSummary: string
  creditsUsed: number
  wasCached: boolean
  cacheExpiresAt: string
}

export interface CacheData {
  video_id: string
  analysis_type: AnalysisType
  analysis_result: any
  video_info: VideoInfo
  created_at: string
  expires_at: string
  hit_count: number
}

export interface HistoryItem {
  id: string
  user_id: string
  video_id: string
  video_url: string
  video_title: string
  channel_name: string
  channel_id: string
  views: number
  likes: number
  comments: number
  subscriber_count: number
  duration: number
  published_at: string
  analysis_type: AnalysisType
  analysis_result: any
  ai_summary: string
  credits_used: number
  was_cached: boolean
  created_at: string
  updated_at: string
}

export interface PaginationParams {
  page: number
  limit: number
  analysisType?: AnalysisType
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// YouTube Data API 응답 타입
export interface YouTubeVideoResponse {
  items: Array<{
    id: string
    snippet: {
      title: string
      channelTitle: string
      channelId: string
      publishedAt: string
      description: string
      tags?: string[]
      thumbnails: {
        default: { url: string }
        medium: { url: string }
        high: { url: string }
      }
    }
    statistics: {
      viewCount: string
      likeCount: string
      commentCount: string
    }
    contentDetails: {
      duration: string  // ISO 8601 형식 (예: PT4M13S)
    }
  }>
}

export interface YouTubeChannelResponse {
  items: Array<{
    id: string
    statistics: {
      subscriberCount: string
    }
  }>
}

// OpenAI 분석 결과 타입
export interface VideoStatsAnalysis {
  engagement_rate: number
  view_trend: string
  best_time: string
  audience_retention: string
  summary: string
}

export interface SuccessFactorsAnalysis {
  key_factors: string[]
  content_strategy: string
  audience_targeting: string
  optimization_tips: string[]
  summary: string
}

export interface TitleOptimizationAnalysis {
  current_title_analysis: string
  suggested_titles: string[]
  keyword_recommendations: string[]
  summary: string
}

export interface SentimentAnalysis {
  positive_ratio: number
  negative_ratio: number
  neutral_ratio: number
  main_sentiments: string[]
  summary: string
}

export interface ChannelStrategyAnalysis {
  content_pillars: string[]
  upload_frequency: string
  collaboration_ideas: string[]
  monetization_tips: string[]
  summary: string
}

export interface VideoIdeasAnalysis {
  trending_topics: string[]
  content_ideas: string[]
  hook_examples: string[]
  summary: string
}

export interface CompetitorAnalysis {
  competitive_advantages: string[]
  improvement_areas: string[]
  market_positioning: string
  summary: string
}
