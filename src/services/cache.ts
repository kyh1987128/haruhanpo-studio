// YouTube 분석 캐시 관리 서비스

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnalysisType, VideoInfo, CacheData } from '../types/youtube'

export async function getCachedAnalysis(
  supabase: SupabaseClient,
  videoId: string,
  analysisType: AnalysisType
): Promise<CacheData | null> {
  try {
    const { data, error } = await supabase
      .from('youtube_analysis_cache')
      .select('*')
      .eq('video_id', videoId)
      .eq('analysis_type', analysisType)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null
    }

    // 캐시 히트 카운트 증가 (별도 트랜잭션, 실패해도 무시)
    supabase
      .from('youtube_analysis_cache')
      .update({ hit_count: data.hit_count + 1 })
      .eq('video_id', videoId)
      .eq('analysis_type', analysisType)
      .then(() => {})
      .catch(() => {})

    return data as CacheData
  } catch (error) {
    console.error('캐시 조회 오류:', error)
    return null
  }
}

export async function saveCacheAnalysis(
  supabase: SupabaseClient,
  videoId: string,
  analysisType: AnalysisType,
  analysisResult: any,
  videoInfo: VideoInfo,
  ttlHours: number = 24
): Promise<void> {
  try {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + ttlHours)

    const { error } = await supabase
      .from('youtube_analysis_cache')
      .upsert({
        video_id: videoId,
        analysis_type: analysisType,
        analysis_result: analysisResult,
        video_info: videoInfo,
        expires_at: expiresAt.toISOString(),
        hit_count: 0
      }, {
        onConflict: 'video_id,analysis_type'
      })

    if (error) {
      console.error('캐시 저장 오류:', error)
      // 캐시 저장 실패는 치명적이지 않으므로 에러를 던지지 않음
    }
  } catch (error) {
    console.error('캐시 저장 예외:', error)
  }
}

// 분석 타입별 TTL 설정 (시간 단위)
export function getTTLByAnalysisType(analysisType: AnalysisType): number {
  const ttlMap: Record<AnalysisType, number> = {
    'video-stats': 6,           // 6시간 (통계는 자주 변함)
    'success-factors': 48,      // 48시간 (성공 요인은 상대적으로 안정적)
    'title-optimization': 24,   // 24시간
    'sentiment-analysis': 12,   // 12시간 (감성은 비교적 빠르게 변함)
    'channel-strategy': 72,     // 72시간 (전략은 장기적)
    'video-ideas': 48,          // 48시간
    'competitor': 24            // 24시간
  }

  return ttlMap[analysisType] || 24
}

// 캐시 통계 조회 (관리자용)
export async function getCacheStats(supabase: SupabaseClient) {
  try {
    // 총 캐시 개수
    const { count: totalCached } = await supabase
      .from('youtube_analysis_cache')
      .select('*', { count: 'exact', head: true })

    // 평균 히트 횟수
    const { data: avgData } = await supabase
      .from('youtube_analysis_cache')
      .select('hit_count')

    const averageHitCount = avgData
      ? avgData.reduce((sum, item) => sum + item.hit_count, 0) / avgData.length
      : 0

    // 상위 캐시 (히트 횟수 기준)
    const { data: topVideos } = await supabase
      .from('youtube_analysis_cache')
      .select('video_id, analysis_type, hit_count, expires_at')
      .order('hit_count', { ascending: false })
      .limit(10)

    // 히트율 계산 (캐시 히트 / 전체 분석 요청)
    // 참고: 실제로는 전체 요청 수를 별도로 추적해야 정확함
    const hitRate = 0 // 추후 구현

    return {
      totalCached: totalCached || 0,
      hitRate,
      averageHitCount: Math.round(averageHitCount * 10) / 10,
      topVideos: topVideos || []
    }
  } catch (error) {
    console.error('캐시 통계 조회 오류:', error)
    throw error
  }
}
