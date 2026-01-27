// YouTube Data API v3 클라이언트

import type { VideoInfo, YouTubeVideoResponse, YouTubeChannelResponse } from '../types/youtube'
import { parseDuration } from '../utils/youtube-url'

export class YouTubeAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'YouTubeAPIError'
  }
}

export async function getVideoInfo(
  videoId: string,
  apiKey: string
): Promise<VideoInfo> {
  // 1. 영상 정보 조회
  const videoUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,statistics,contentDetails`
  
  const videoResponse = await fetch(videoUrl)
  
  if (!videoResponse.ok) {
    if (videoResponse.status === 403) {
      throw new YouTubeAPIError('YouTube API 키가 유효하지 않습니다.', 403)
    }
    if (videoResponse.status === 429) {
      throw new YouTubeAPIError('YouTube API 할당량을 초과했습니다.', 429)
    }
    throw new YouTubeAPIError(`YouTube API 오류: ${videoResponse.statusText}`, videoResponse.status)
  }

  const videoData: YouTubeVideoResponse = await videoResponse.json()

  if (!videoData.items || videoData.items.length === 0) {
    throw new YouTubeAPIError('영상을 찾을 수 없습니다. URL을 확인해주세요.', 404)
  }

  const video = videoData.items[0]
  const snippet = video.snippet
  const statistics = video.statistics
  const contentDetails = video.contentDetails

  // 2. 채널 정보 조회 (구독자 수)
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?id=${snippet.channelId}&key=${apiKey}&part=statistics`
  
  const channelResponse = await fetch(channelUrl)
  
  if (!channelResponse.ok) {
    console.warn('채널 정보 조회 실패, 구독자 수는 0으로 설정')
  }

  let subscriberCount = 0
  try {
    const channelData: YouTubeChannelResponse = await channelResponse.json()
    subscriberCount = parseInt(channelData.items[0]?.statistics?.subscriberCount || '0')
  } catch (error) {
    console.warn('채널 정보 파싱 실패:', error)
  }

  // 3. 데이터 정리 및 반환
  const videoInfo: VideoInfo = {
    title: snippet.title,
    channel: snippet.channelTitle,
    channelId: snippet.channelId,
    views: parseInt(statistics.viewCount || '0'),
    likes: parseInt(statistics.likeCount || '0'),
    comments: parseInt(statistics.commentCount || '0'),
    subscriberCount: subscriberCount,
    duration: parseDuration(contentDetails.duration),
    publishedAt: snippet.publishedAt,
    description: snippet.description,
    tags: snippet.tags || [],
    thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url
  }

  return videoInfo
}

// API 할당량 체크 (참고용)
export function estimateQuotaCost(operations: {
  videoInfo?: number
  channelInfo?: number
  search?: number
}): number {
  let cost = 0
  if (operations.videoInfo) cost += operations.videoInfo * 1      // 1 unit
  if (operations.channelInfo) cost += operations.channelInfo * 1  // 1 unit
  if (operations.search) cost += operations.search * 100          // 100 units
  return cost
}

// 할당량 한도 체크
export function isWithinQuotaLimit(usedToday: number, dailyLimit: number = 10000): boolean {
  return usedToday < dailyLimit
}

// ========================================
// Phase 2: YouTube 검색 API
// ========================================

export interface YouTubeSearchResult {
  videoId: string
  title: string
  channel: string
  channelId: string
  thumbnailUrl: string
  publishedAt: string
  views: number
  likes: number
  subscriberCount: number
  videoCount: number
  performance: 'Great' | 'Good' | 'Normal'
  contribution: 'Great' | 'Good' | 'Normal'
}

export interface YouTubeSearchResponse {
  items: {
    id: {
      videoId: string
    }
    snippet: {
      title: string
      channelTitle: string
      channelId: string
      thumbnails: {
        medium?: { url: string }
        high?: { url: string }
      }
      publishedAt: string
    }
  }[]
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
}

/**
 * YouTube 검색 API
 * @param keyword 검색 키워드
 * @param apiKey YouTube API 키
 * @param maxResults 최대 결과 개수 (기본: 10, 최대: 50)
 * @returns 검색 결과 배열
 */
export async function searchYouTubeVideos(
  keyword: string,
  apiKey: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<{ videos: YouTubeSearchResult[], nextPageToken?: string, totalResults?: number }> {
  // 1. 검색 API 호출
  let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(keyword)}&key=${apiKey}&maxResults=${Math.min(maxResults, 50)}&order=viewCount`
  
  // pageToken이 있으면 추가
  if (pageToken) {
    searchUrl += `&pageToken=${pageToken}`
  }
  
  const searchResponse = await fetch(searchUrl)
  
  if (!searchResponse.ok) {
    if (searchResponse.status === 403) {
      throw new YouTubeAPIError('YouTube API 키가 유효하지 않습니다.', 403)
    }
    if (searchResponse.status === 429) {
      throw new YouTubeAPIError('YouTube API 할당량을 초과했습니다.', 429)
    }
    throw new YouTubeAPIError(`YouTube 검색 API 오류: ${searchResponse.statusText}`, searchResponse.status)
  }

  const searchData: YouTubeSearchResponse = await searchResponse.json()
  
  if (!searchData.items || searchData.items.length === 0) {
    return { 
      videos: [], 
      nextPageToken: undefined,
      totalResults: 0
    }
  }

  // 2. 비디오 ID 목록 추출
  const videoIds = searchData.items.map(item => item.id.videoId).join(',')
  
  // 3. 비디오 상세 정보 조회 (조회수, 좋아요 등)
  const videoUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&key=${apiKey}&part=snippet,statistics`
  const videoResponse = await fetch(videoUrl)
  
  if (!videoResponse.ok) {
    throw new YouTubeAPIError('영상 정보 조회 실패', videoResponse.status)
  }

  const videoData: YouTubeVideoResponse = await videoResponse.json()
  
  // 4. 채널 ID 목록 추출 (중복 제거)
  const channelIds = Array.from(new Set(videoData.items.map(item => item.snippet.channelId))).join(',')
  
  // 5. 채널 정보 조회 (구독자 수, 총 영상 수)
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?id=${channelIds}&key=${apiKey}&part=statistics`
  const channelResponse = await fetch(channelUrl)
  
  const channelData: YouTubeChannelResponse = channelResponse.ok ? await channelResponse.json() : { items: [] }
  
  // 6. 채널 정보 맵 생성
  const channelMap = new Map(
    channelData.items.map(channel => [
      channel.id,
      {
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channel.statistics?.videoCount || '0')
      }
    ])
  )

  // 7. 결과 조합 및 성과도/기여도 계산
  const results: YouTubeSearchResult[] = videoData.items.map(video => {
    const views = parseInt(video.statistics.viewCount || '0')
    const likes = parseInt(video.statistics.likeCount || '0')
    const channelInfo = channelMap.get(video.snippet.channelId) || { subscriberCount: 0, videoCount: 0 }
    
    // 성과도 계산 (조회수 기준)
    let performance: 'Great' | 'Good' | 'Normal' = 'Normal'
    if (views >= 10000000) performance = 'Great'
    else if (views >= 1000000) performance = 'Good'
    
    // 기여도 계산 (조회수 대비 구독자 비율)
    const contribution_ratio = channelInfo.subscriberCount > 0 ? views / channelInfo.subscriberCount : 0
    let contribution: 'Great' | 'Good' | 'Normal' = 'Normal'
    if (contribution_ratio >= 10) contribution = 'Great'
    else if (contribution_ratio >= 5) contribution = 'Good'

    return {
      videoId: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      channelId: video.snippet.channelId,
      thumbnailUrl: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || '',
      publishedAt: video.snippet.publishedAt,
      views,
      likes,
      subscriberCount: channelInfo.subscriberCount,
      videoCount: channelInfo.videoCount,
      performance,
      contribution
    }
  })

  return {
    videos: results,
    nextPageToken: searchData.nextPageToken,
    totalResults: searchData.pageInfo?.totalResults || results.length
  }
}

// ========================================
// Phase 3: 채널 분석
// ========================================

export interface ChannelInfo {
  channelId: string
  channelTitle: string
  description: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  thumbnailUrl: string
  publishedAt: string
  customUrl?: string
}

export interface ChannelTopVideo {
  videoId: string
  title: string
  thumbnailUrl: string
  views: number
  likes: number
  publishedAt: string
}

export async function getChannelInfo(
  channelIdOrUrl: string,
  apiKey: string
): Promise<{ channel: ChannelInfo, topVideos: ChannelTopVideo[] }> {
  // 1. 채널 ID 추출
  let channelId = channelIdOrUrl

  // URL에서 채널 ID 추출
  if (channelIdOrUrl.includes('youtube.com')) {
    // youtube.com/@channelname 또는 youtube.com/channel/UCxxxxxx
    if (channelIdOrUrl.includes('/@')) {
      const username = channelIdOrUrl.split('/@')[1].split('/')[0].split('?')[0]
      // username으로 채널 검색
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(username)}&key=${apiKey}&maxResults=1`
      const searchResponse = await fetch(searchUrl)
      if (!searchResponse.ok) {
        throw new YouTubeAPIError('채널을 찾을 수 없습니다.', searchResponse.status)
      }
      const searchData = await searchResponse.json()
      if (!searchData.items || searchData.items.length === 0) {
        throw new YouTubeAPIError('채널을 찾을 수 없습니다.', 404)
      }
      channelId = searchData.items[0].id.channelId
    } else if (channelIdOrUrl.includes('/channel/')) {
      channelId = channelIdOrUrl.split('/channel/')[1].split('/')[0].split('?')[0]
    }
  }

  // 2. 채널 정보 조회
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&key=${apiKey}&part=snippet,statistics`
  const channelResponse = await fetch(channelUrl)

  if (!channelResponse.ok) {
    if (channelResponse.status === 403) {
      throw new YouTubeAPIError('YouTube API 키가 유효하지 않습니다.', 403)
    }
    if (channelResponse.status === 404) {
      throw new YouTubeAPIError('채널을 찾을 수 없습니다.', 404)
    }
    throw new YouTubeAPIError(`채널 정보 조회 실패: ${channelResponse.statusText}`, channelResponse.status)
  }

  const channelData = await channelResponse.json()

  if (!channelData.items || channelData.items.length === 0) {
    throw new YouTubeAPIError('채널을 찾을 수 없습니다.', 404)
  }

  const channel = channelData.items[0]
  const channelInfo: ChannelInfo = {
    channelId: channel.id,
    channelTitle: channel.snippet.title,
    description: channel.snippet.description,
    subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
    videoCount: parseInt(channel.statistics.videoCount || '0'),
    viewCount: parseInt(channel.statistics.viewCount || '0'),
    thumbnailUrl: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.medium?.url || '',
    publishedAt: channel.snippet.publishedAt,
    customUrl: channel.snippet.customUrl
  }

  // 3. 채널의 인기 영상 TOP 10 조회
  const videosUrl = `https://www.googleapis.com/youtube/v3/search?channelId=${channelId}&key=${apiKey}&part=snippet&type=video&order=viewCount&maxResults=10`
  const videosResponse = await fetch(videosUrl)

  if (!videosResponse.ok) {
    throw new YouTubeAPIError('인기 영상 조회 실패', videosResponse.status)
  }

  const videosData = await videosResponse.json()
  const videoIds = videosData.items.map((item: any) => item.id.videoId).join(',')

  // 4. 영상 상세 정보 조회 (조회수, 좋아요)
  const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&key=${apiKey}&part=snippet,statistics`
  const videoDetailsResponse = await fetch(videoDetailsUrl)

  if (!videoDetailsResponse.ok) {
    throw new YouTubeAPIError('영상 상세 정보 조회 실패', videoDetailsResponse.status)
  }

  const videoDetailsData = await videoDetailsResponse.json()

  const topVideos: ChannelTopVideo[] = videoDetailsData.items.map((video: any) => ({
    videoId: video.id,
    title: video.snippet.title,
    thumbnailUrl: video.snippet.thumbnails?.medium?.url || '',
    views: parseInt(video.statistics.viewCount || '0'),
    likes: parseInt(video.statistics.likeCount || '0'),
    publishedAt: video.snippet.publishedAt
  }))

  return {
    channel: channelInfo,
    topVideos
  }
}
