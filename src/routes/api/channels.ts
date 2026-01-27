import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  YOUTUBE_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ==============================
// 유틸리티 함수
// ==============================

/**
 * YouTube 채널 ID 추출
 * - 채널 URL에서 ID 추출
 * - @username 형태 처리
 */
function extractChannelId(input: string): { type: 'id' | 'username' | 'url', value: string } {
  input = input.trim()

  // 1. 이미 채널 ID 형태 (UC로 시작하는 24자)
  if (/^UC[\w-]{22}$/.test(input)) {
    return { type: 'id', value: input }
  }

  // 2. @username 형태
  if (input.startsWith('@')) {
    return { type: 'username', value: input.substring(1) }
  }

  // 3. URL 형태
  try {
    const url = new URL(input)
    
    // youtube.com/channel/UC...
    if (url.pathname.startsWith('/channel/')) {
      const channelId = url.pathname.split('/')[2]
      return { type: 'id', value: channelId }
    }
    
    // youtube.com/@username
    if (url.pathname.startsWith('/@')) {
      const username = url.pathname.substring(2)
      return { type: 'username', value: username }
    }
    
    // youtube.com/c/CustomName
    if (url.pathname.startsWith('/c/')) {
      const customName = url.pathname.split('/')[2]
      return { type: 'username', value: customName }
    }
  } catch {
    // URL 파싱 실패 시 그냥 username으로 처리
    return { type: 'username', value: input }
  }

  return { type: 'username', value: input }
}

/**
 * YouTube API로 채널 정보 조회
 */
async function getChannelInfo(apiKey: string, channelInput: string) {
  const extracted = extractChannelId(channelInput)
  
  let channelId: string | null = null

  // 1. @username인 경우 먼저 채널 ID로 변환
  if (extracted.type === 'username') {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(extracted.value)}&key=${apiKey}`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()

    if (searchData.items && searchData.items.length > 0) {
      channelId = searchData.items[0].snippet.channelId
    } else {
      throw new Error('채널을 찾을 수 없습니다.')
    }
  } else {
    channelId = extracted.value
  }

  // 2. 채널 상세 정보 조회
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
  const channelRes = await fetch(channelUrl)
  const channelData = await channelRes.json()

  if (!channelData.items || channelData.items.length === 0) {
    throw new Error('채널 정보를 가져올 수 없습니다.')
  }

  const channel = channelData.items[0]
  return {
    channelId: channel.id,
    channelName: channel.snippet.title,
    channelDescription: channel.snippet.description,
    channelThumbnail: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url || '',
    subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
    totalVideos: parseInt(channel.statistics.videoCount || '0'),
    totalViews: parseInt(channel.statistics.viewCount || '0')
  }
}

// ==============================
// API 라우트
// ==============================

/**
 * POST /api/channels/favorite
 * 즐겨찾기 채널 추가
 */
app.post('/api/channels/favorite', async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY, YOUTUBE_API_KEY } = c.env
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, 401)
    }

    // 요청 바디 파싱
    const { channelInput } = await c.req.json()
    if (!channelInput) {
      return c.json({ success: false, error: { code: 'INVALID_INPUT', message: '채널 URL 또는 ID를 입력해주세요.' } }, 400)
    }

    // YouTube API로 채널 정보 조회
    const channelInfo = await getChannelInfo(YOUTUBE_API_KEY, channelInput)

    // Supabase에 저장 (UPSERT)
    const { data, error } = await supabase
      .from('favorite_channels')
      .upsert({
        user_id: user.id,
        channel_id: channelInfo.channelId,
        channel_name: channelInfo.channelName,
        channel_description: channelInfo.channelDescription,
        channel_thumbnail: channelInfo.channelThumbnail,
        subscriber_count: channelInfo.subscriberCount,
        total_videos: channelInfo.totalVideos,
        total_views: channelInfo.totalViews,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id,channel_id'
      })
      .select()

    if (error) {
      console.error('❌ [Supabase Error]', error)
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: '데이터 저장에 실패했습니다.' } }, 500)
    }

    return c.json({ success: true, data: data[0] })
  } catch (error: any) {
    console.error('❌ [Add Favorite Error]', error)
    return c.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || '채널 추가 중 오류가 발생했습니다.' } }, 500)
  }
})

/**
 * GET /api/channels/favorite
 * 즐겨찾기 채널 목록 조회
 */
app.get('/api/channels/favorite', async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, 401)
    }

    // 즐겨찾기 목록 조회
    const { data, error } = await supabase
      .from('favorite_channels')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('❌ [Supabase Error]', error)
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: '데이터 조회에 실패했습니다.' } }, 500)
    }

    return c.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('❌ [Get Favorites Error]', error)
    return c.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || '채널 목록 조회 중 오류가 발생했습니다.' } }, 500)
  }
})

/**
 * DELETE /api/channels/favorite/:channelId
 * 즐겨찾기 채널 삭제
 */
app.delete('/api/channels/favorite/:channelId', async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env
    const authHeader = c.req.header('Authorization')
    const channelId = c.req.param('channelId')

    if (!authHeader) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, 401)
    }

    // 삭제
    const { error } = await supabase
      .from('favorite_channels')
      .delete()
      .eq('user_id', user.id)
      .eq('channel_id', channelId)

    if (error) {
      console.error('❌ [Supabase Error]', error)
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: '삭제에 실패했습니다.' } }, 500)
    }

    return c.json({ success: true, message: '채널이 삭제되었습니다.' })
  } catch (error: any) {
    console.error('❌ [Delete Favorite Error]', error)
    return c.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || '채널 삭제 중 오류가 발생했습니다.' } }, 500)
  }
})

/**
 * GET /api/channels/snapshots/:channelId
 * 채널 스냅샷 데이터 조회 (시계열)
 */
app.get('/api/channels/snapshots/:channelId', async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env
    const authHeader = c.req.header('Authorization')
    const channelId = c.req.param('channelId')
    const days = parseInt(c.req.query('days') || '30') // 기본 30일

    if (!authHeader) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, 401)
    }

    // 스냅샷 조회 (최근 N일)
    const { data, error } = await supabase
      .from('channel_snapshots')
      .select('*')
      .eq('channel_id', channelId)
      .gte('snapshot_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true })

    if (error) {
      console.error('❌ [Supabase Error]', error)
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: '데이터 조회에 실패했습니다.' } }, 500)
    }

    return c.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('❌ [Get Snapshots Error]', error)
    return c.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || '스냅샷 조회 중 오류가 발생했습니다.' } }, 500)
  }
})

/**
 * POST /api/channels/refresh/:channelId
 * 채널 데이터 수동 갱신 (스냅샷 생성)
 */
app.post('/api/channels/refresh/:channelId', async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY, YOUTUBE_API_KEY } = c.env
    const authHeader = c.req.header('Authorization')
    const channelId = c.req.param('channelId')

    if (!authHeader) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, 401)
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' } }, 401)
    }

    // YouTube API로 최신 채널 정보 조회
    const channelInfo = await getChannelInfo(YOUTUBE_API_KEY, channelId)

    // 1. favorite_channels 업데이트
    await supabase
      .from('favorite_channels')
      .update({
        subscriber_count: channelInfo.subscriberCount,
        total_videos: channelInfo.totalVideos,
        total_views: channelInfo.totalViews,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('channel_id', channelId)

    // 2. channel_snapshots에 오늘 날짜 스냅샷 생성 (UPSERT)
    const { data, error } = await supabase
      .from('channel_snapshots')
      .upsert({
        channel_id: channelId,
        snapshot_date: new Date().toISOString().split('T')[0],
        subscriber_count: channelInfo.subscriberCount,
        total_videos: channelInfo.totalVideos,
        total_views: channelInfo.totalViews,
        recent_video_avg_views: 0 // TODO: 최근 영상 평균 조회수 계산
      }, {
        onConflict: 'channel_id,snapshot_date'
      })
      .select()

    if (error) {
      console.error('❌ [Supabase Error]', error)
      return c.json({ success: false, error: { code: 'DATABASE_ERROR', message: '데이터 저장에 실패했습니다.' } }, 500)
    }

    return c.json({ success: true, data: data[0], message: '채널 데이터가 갱신되었습니다.' })
  } catch (error: any) {
    console.error('❌ [Refresh Channel Error]', error)
    return c.json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || '채널 갱신 중 오류가 발생했습니다.' } }, 500)
  }
})

export default app
