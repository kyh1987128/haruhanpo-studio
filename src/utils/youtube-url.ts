// YouTube URL에서 videoId 추출

export function extractVideoId(url: string): string | null {
  try {
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/embed/VIDEO_ID
    // https://www.youtube.com/v/VIDEO_ID
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // 직접 videoId 입력
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  } catch (error) {
    return null
  }
}

export function isValidVideoId(videoId: string): boolean {
  // YouTube videoId는 11자리 영숫자, 하이픈, 언더스코어
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
}

export function buildYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

// ISO 8601 duration을 초로 변환 (PT4M13S → 253)
export function parseDuration(duration: string): number {
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')
    
    return hours * 3600 + minutes * 60 + seconds
  } catch (error) {
    return 0
  }
}

// 초를 MM:SS 형식으로 변환
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
