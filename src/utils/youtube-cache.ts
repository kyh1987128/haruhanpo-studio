// ========================================
// YouTube Search KV Cache Utility
// Cloudflare KV(YOUTUBE_CACHE)를 활용한 search.list 응답 캐싱
// ========================================

/** 캐시 TTL 상수 (초 단위) */
export const SEARCH_CACHE_TTL = {
  KEYWORD_SEARCH: 6 * 3600,         // 일반 키워드 검색: 6시간
  TRENDING_RECOMMEND: 3 * 3600,     // 떡상 추천 내부 검색: 3시간
  CHANNEL_SEARCH: 12 * 3600,        // 채널 검색: 12시간
  RECOMMEND_RESULT: 3 * 3600,       // 떡상 추천 최종 결과: 3시간
} as const

/**
 * search.list 캐시 키 생성
 * 모든 파라미터를 포함하여 동일 조건일 때만 HIT
 */
export function buildSearchCacheKey(params: {
  query: string
  regionCode?: string
  order?: string
  type?: string
  maxResults?: number
  pageToken?: string
}): string {
  const q = params.query.toLowerCase().trim()
  const region = params.regionCode || 'global'
  const order = params.order || 'viewCount'
  const type = params.type || 'video'
  const max = params.maxResults || 20
  const page = params.pageToken || ''
  return `youtube:search:${q}:${region}:${order}:${type}:${max}:${page}`
}

/**
 * 떡상 추천 최종 결과 캐시 키
 */
export function buildRecommendCacheKey(channelTitle: string): string {
  const normalized = channelTitle.toLowerCase().trim().replace(/\s+/g, '_')
  return `youtube:trending-recommend:${normalized}`
}

/**
 * KV에서 캐시 읽기
 * @returns 캐시된 데이터 또는 null
 */
export async function getCachedSearch(kv: KVNamespace, key: string): Promise<any | null> {
  try {
    const cached = await kv.get(key, 'json')
    return cached
  } catch (e) {
    console.warn(`[KV Cache] 읽기 오류 (key=${key}):`, e)
    return null
  }
}

/**
 * KV에 캐시 저장
 * @param ttlSeconds - 만료 시간 (초)
 */
export async function setCachedSearch(
  kv: KVNamespace,
  key: string,
  data: any,
  ttlSeconds: number
): Promise<void> {
  try {
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds })
  } catch (e) {
    console.warn(`[KV Cache] 쓰기 오류 (key=${key}):`, e)
  }
}
