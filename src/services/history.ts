// YouTube 분석 히스토리 관리 서비스

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalysisType, VideoInfo, HistoryItem, PaginationParams, PaginatedResponse } from '../types/youtube'

export async function saveAnalysisHistory(
  supabase: SupabaseClient,
  userId: string,
  videoId: string,
  videoUrl: string,
  videoInfo: VideoInfo,
  analysisType: AnalysisType,
  analysisResult: any,
  aiSummary: string,
  creditsUsed: number,
  wasCached: boolean
): Promise<HistoryItem> {
  try {
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
      // UNIQUE 제약조건 위반 (이미 분석한 영상)
      if (error.code === '23505') {
        throw new Error('이미 분석한 영상입니다. 히스토리에서 확인해주세요.')
      }
      throw error
    }

    return data as HistoryItem
  } catch (error: any) {
    console.error('히스토리 저장 오류:', error)
    throw error
  }
}

export async function getAnalysisHistory(
  supabase: SupabaseClient,
  userId: string,
  params: PaginationParams
): Promise<PaginatedResponse<HistoryItem>> {
  try {
    const { page = 1, limit = 10, analysisType } = params
    const offset = (page - 1) * limit

    // 쿼리 구성
    let query = supabase
      .from('youtube_analysis_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 분석 타입 필터링
    if (analysisType) {
      query = query.eq('analysis_type', analysisType)
    }

    const { data, count, error } = await query

    if (error) {
      throw error
    }

    return {
      items: (data || []) as HistoryItem[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  } catch (error) {
    console.error('히스토리 조회 오류:', error)
    throw error
  }
}

export async function getHistoryById(
  supabase: SupabaseClient,
  userId: string,
  historyId: string
): Promise<HistoryItem | null> {
  try {
    const { data, error } = await supabase
      .from('youtube_analysis_history')
      .select('*')
      .eq('id', historyId)
      .eq('user_id', userId)
      .single()

    if (error) {
      return null
    }

    return data as HistoryItem
  } catch (error) {
    console.error('히스토리 상세 조회 오류:', error)
    return null
  }
}

export async function deleteHistory(
  supabase: SupabaseClient,
  userId: string,
  historyId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('youtube_analysis_history')
      .delete()
      .eq('id', historyId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    return true
  } catch (error) {
    console.error('히스토리 삭제 오류:', error)
    return false
  }
}

// 사용자의 분석 통계
export async function getUserAnalysisStats(
  supabase: SupabaseClient,
  userId: string
) {
  try {
    // 총 분석 횟수
    const { count: totalAnalyses } = await supabase
      .from('youtube_analysis_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // 캐시 히트 횟수
    const { count: cachedAnalyses } = await supabase
      .from('youtube_analysis_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('was_cached', true)

    // 사용한 총 크레딧
    const { data: creditsData } = await supabase
      .from('youtube_analysis_history')
      .select('credits_used')
      .eq('user_id', userId)

    const totalCreditsUsed = creditsData
      ? creditsData.reduce((sum, item) => sum + item.credits_used, 0)
      : 0

    // 분석 타입별 통계
    const { data: typeStats } = await supabase
      .from('youtube_analysis_history')
      .select('analysis_type')
      .eq('user_id', userId)

    const typeCount: Record<string, number> = {}
    typeStats?.forEach(item => {
      typeCount[item.analysis_type] = (typeCount[item.analysis_type] || 0) + 1
    })

    return {
      totalAnalyses: totalAnalyses || 0,
      cachedAnalyses: cachedAnalyses || 0,
      cacheHitRate: totalAnalyses ? ((cachedAnalyses || 0) / totalAnalyses * 100).toFixed(1) : '0',
      totalCreditsUsed,
      averageCreditsPerAnalysis: totalAnalyses ? (totalCreditsUsed / totalAnalyses).toFixed(1) : '0',
      analysisByType: typeCount
    }
  } catch (error) {
    console.error('사용자 통계 조회 오류:', error)
    throw error
  }
}
