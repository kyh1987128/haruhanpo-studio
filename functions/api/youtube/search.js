// YouTube API 스마트 캐싱 시스템 (Post-Filtering 방식)

/**
 * 캐시 키 생성 (핵심 파라미터만 포함)
 */
function generateBaseCacheKey(params) {
  const core = {
    keyword: params.keyword?.trim() || '',
    order: params.order || 'relevance',
    regionCode: params.regionCode || 'KR',
    searchType: params.searchType || 'keyword'
  };
  
  const today = new Date().toISOString().split('T')[0]; // 일일 갱신
  return `yt_smart_${today}_${JSON.stringify(core)}`;
}

/**
 * ISO 8601 duration을 초 단위로 변환
 */
function parseDuration(duration) {
  if (!duration) return 0;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 성과도 계산
 */
function calculatePerformance(video) {
  const views = parseInt(video.statistics?.viewCount ?? video.views ?? 0);
  const subscribers = parseInt(video.channelInfo?.subscriberCount ?? video.subscriberCount ?? 1);
  const ratio = (views / subscribers) * 100;
  
  if (ratio >= 300) return { level: 'viral', ratio };
  if (ratio >= 100) return { level: 'algorithm', ratio };
  if (ratio >= 50) return { level: 'normal', ratio };
  return { level: 'low', ratio };
}

/**
 * 로컬 필터링 (메모리에서 처리)
 */
function applyLocalFilters(videos, params) {
  return videos.filter(video => {
    // 안전한 데이터 접근
    const views = parseInt(video.statistics?.viewCount ?? video.views ?? 0);
    const subscribers = parseInt(video.channelInfo?.subscriberCount ?? video.subscriberCount ?? 0);
    const duration = parseDuration(video.contentDetails?.duration || video.duration || '');
    const title = video.snippet?.title || video.title || '';
    const publishedAt = new Date(video.snippet?.publishedAt || video.publishedAt || 0);
    
    // 1. 숏츠 필터
    if (params.shortsMode === 'shorts' && duration > 60) return false;
    if (params.shortsMode === 'no-shorts' && duration <= 60) return false;
    
    // 2. 조회수 필터
    const minViews = parseInt(params.minViews || 0);
    if (views < minViews) return false;
    
    // 3. 구독자 구간 필터
    if (params.subscriberRange && params.subscriberRange !== 'all') {
      if (params.subscriberRange === '1k' && subscribers >= 10000) return false;
      if (params.subscriberRange === '10k' && (subscribers < 10000 || subscribers >= 100000)) return false;
      if (params.subscriberRange === '100k' && (subscribers < 100000 || subscribers >= 1000000)) return false;
      if (params.subscriberRange === '1m' && subscribers < 1000000) return false;
    }
    
    // 4. 성과도 필터
    if (params.performanceLevel && params.performanceLevel !== 'all') {
      const performance = calculatePerformance(video);
      if (performance.level !== params.performanceLevel) return false;
    }
    
    // 5. 제외 키워드
    if (params.excludeKeywords) {
      const excludeList = params.excludeKeywords.split(',').map(k => k.trim().toLowerCase());
      const titleLower = title.toLowerCase();
      if (excludeList.some(exclude => titleLower.includes(exclude))) return false;
    }
    
    // 6. 업로드 날짜 필터
    if (params.uploadDate && params.uploadDate !== 'all') {
      const now = new Date();
      let cutoffDate = new Date(0);
      
      if (params.uploadDate === 'day') cutoffDate = new Date(now - 24 * 60 * 60 * 1000);
      if (params.uploadDate === 'week') cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      if (params.uploadDate === 'month') cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      
      if (publishedAt < cutoffDate) return false;
    }
    
    // 7. 영상 길이 필터
    if (params.durationFilter && params.durationFilter !== 'all') {
      if (params.durationFilter === 'short' && duration > 180) return false;
      if (params.durationFilter === 'medium' && (duration <= 180 || duration > 600)) return false;
      if (params.durationFilter === 'long' && (duration <= 600 || duration > 1800)) return false;
      if (params.durationFilter === 'verylong' && duration <= 1800) return false;
    }
    
    return true;
  }).slice(0, parseInt(params.maxResults || 200)); // 결과 개수 제한
}

/**
 * YouTube API 데이터 수집
 */
async function fetchYouTubeData(params, apiKey) {
  const videos = [];
  const { keyword, order = 'relevance', regionCode = 'KR', maxResults = 200 } = params;
  
  let pageToken = '';
  const perPage = 50; // YouTube API 최대
  const maxPages = Math.ceil(maxResults / perPage);
  
  for (let page = 0; page < maxPages; page++) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('type', 'video');
    url.searchParams.append('q', keyword);
    url.searchParams.append('order', order);
    url.searchParams.append('regionCode', regionCode);
    url.searchParams.append('maxResults', perPage);
    url.searchParams.append('key', apiKey);
    
    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('YouTube API 할당량 초과');
      }
      throw new Error(`YouTube API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 영상 ID 추출
    const videoIds = data.items.map(item => item.id.videoId).join(',');
    
    // 상세 정보 가져오기
    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.append('part', 'snippet,statistics,contentDetails');
    detailsUrl.searchParams.append('id', videoIds);
    detailsUrl.searchParams.append('key', apiKey);
    
    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData = await detailsResponse.json();
    
    // 채널 정보 가져오기
    const channelIds = [...new Set(detailsData.items.map(item => item.snippet.channelId))].join(',');
    const channelsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelsUrl.searchParams.append('part', 'statistics');
    channelsUrl.searchParams.append('id', channelIds);
    channelsUrl.searchParams.append('key', apiKey);
    
    const channelsResponse = await fetch(channelsUrl.toString());
    const channelsData = await channelsResponse.json();
    
    // 채널 정보 매핑
    const channelMap = {};
    channelsData.items.forEach(channel => {
      channelMap[channel.id] = {
        subscriberCount: parseInt(channel.statistics.subscriberCount || 0)
      };
    });
    
    // 데이터 병합
    detailsData.items.forEach(video => {
      videos.push({
        ...video,
        channelInfo: channelMap[video.snippet.channelId] || { subscriberCount: 0 }
      });
    });
    
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  
  return videos;
}

/**
 * 메인 핸들러
 */
export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body = await request.json();
    
    // 1. 기본 캐시 키 생성 (필터 제외)
    const cacheKey = generateBaseCacheKey(body);
    console.log('🔑 [Cache Key]', cacheKey);
    
    let allVideos = [];
    let fromCache = false;
    
    // 2. 캐시 확인
    const cached = await env.YOUTUBE_CACHE.get(cacheKey, 'json');
    if (cached) {
      console.log('✅ [Cache HIT]', cacheKey);
      allVideos = cached;
      fromCache = true;
    } else {
      console.log('❌ [Cache MISS]', cacheKey);
      
      // 3. YouTube API 호출
      const apiKey = env.YOUTUBE_API_KEY;
      if (!apiKey) {
        throw new Error('YouTube API 키가 설정되지 않았습니다');
      }
      
      allVideos = await fetchYouTubeData(body, apiKey);
      
      // 4. 캐시 저장 (원본 데이터 전체)
      await env.YOUTUBE_CACHE.put(cacheKey, JSON.stringify(allVideos), {
        expirationTtl: 86400 // 24시간
      });
      console.log('💾 [Cache SAVED]', cacheKey, `(${allVideos.length} videos)`);
    }
    
    // 5. 로컬 필터링 (핵심!)
    const filteredVideos = applyLocalFilters(allVideos, body);
    
    console.log('📊 [Filtering Result]', {
      raw: allVideos.length,
      filtered: filteredVideos.length,
      cached: fromCache
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        videos: filteredVideos,
        totalRaw: allVideos.length,
        totalFiltered: filteredVideos.length,
        cached: fromCache
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('❌ [Search Error]', error);
    
    // 할당량 초과 에러 명확히 처리
    if (error.message.includes('quotaExceeded') || error.message.includes('403') || error.message.includes('할당량')) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'YouTube API 일일 할당량 초과. 내일 다시 시도해주세요.'
        }
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
