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
