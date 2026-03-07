import { createClient } from '@supabase/supabase-js'

// ========================================
// Environment interface
// ========================================
export interface Env {
  YOUTUBE_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

// ========================================
// Constants
// ========================================
// Workers subrequest limit: 50 per invocation
// Phase 1과 Phase 2를 별도 HTTP 요청으로 분리하여 각각 50 한도를 사용
const CHANNEL_REGIONS_PRIORITY = ['KR','US','JP','GB','IN','BR','DE'] as const
const CHANNEL_CATEGORIES_PRIORITY = ['10','20','24','22','25','28'] as const
const PHASE1_MAX_FETCH = 42   // Phase 1: 7 regions × 6 categories = 42 최대
const PHASE2_MAX_FETCH = 45   // Phase 2: 45 batch (45×50 = 2,250 channels 커버)

// ========================================
// Interfaces
// ========================================
interface TrendKeyword {
  keyword: string
  category: string
  score: number
  estimated_views: number
  sample_video_id: string
}

interface TrendVideo {
  video_id: string
  title: string
  channel_title: string
  views: number
  published_at: string
  category: string
  thumbnail_url: string
}

interface ChannelAppearance {
  name: string
  appearances: { region: string; category: string }[]
}

interface ChannelDetail {
  channel_id: string
  channel_name: string
  channel_thumbnail: string
  subscribers: number
  total_views: number
  video_count: number
  channel_country: string
  channel_description: string
  channel_published_at: string | null
}

interface CollectResult {
  success: boolean
  phase: string
  phase1_channels: number
  phase1_quota: number
  phase1_quota_exceeded: boolean
  phase2_details: number
  phase2_quota: number
  phase2_error: string
  rankings_saved: number
  total_quota: number
  error?: string
}

// ========================================
// 기존: 인기 영상/키워드 수집 (4시간마다)
// ========================================

async function collectTrendingVideos(apiKey: string): Promise<TrendVideo[]> {
  console.log('📊 트렌딩 비디오 수집 시작...')
  
  const videos: TrendVideo[] = []
  const categories = ['10', '22', '23', '24', '25']
  
  for (const category of categories) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=KR&maxResults=10&videoCategoryId=${category}&key=${apiKey}`
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`❌ 카테고리 ${category} 요청 실패: ${response.status}`)
        continue
      }
      
      const data: any = await response.json()
      
      if (!data.items || data.items.length === 0) {
        console.log(`⚠️ 카테고리 ${category}에 비디오 없음`)
        continue
      }
      
      for (const item of data.items) {
        videos.push({
          video_id: item.id,
          title: item.snippet.title,
          channel_title: item.snippet.channelTitle,
          views: parseInt(item.statistics.viewCount || '0'),
          published_at: item.snippet.publishedAt,
          category: category,
          thumbnail_url: item.snippet.thumbnails.medium.url
        })
      }
      
      console.log(`✅ 카테고리 ${category}: ${data.items.length}개 비디오 수집`)
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`❌ 카테고리 ${category} 처리 중 오류:`, error)
    }
  }
  
  console.log(`✅ 총 ${videos.length}개 트렌딩 비디오 수집 완료`)
  return videos
}

function extractKeywords(videos: TrendVideo[]): TrendKeyword[] {
  console.log('🔍 키워드 추출 시작...')
  
  const keywordMap = new Map<string, {
    count: number
    totalViews: number
    category: string
    sampleVideoId: string
  }>()
  
  for (const video of videos) {
    const words = video.title
      .split(/[\s,\-_|()[\]{}]+/)
      .filter(word => word.length >= 2 && word.length <= 20)
      .map(word => word.toLowerCase())
    
    for (const word of words) {
      const existing = keywordMap.get(word) || {
        count: 0,
        totalViews: 0,
        category: video.category,
        sampleVideoId: video.video_id
      }
      
      existing.count++
      existing.totalViews += video.views
      keywordMap.set(word, existing)
    }
  }
  
  const keywords: TrendKeyword[] = Array.from(keywordMap.entries())
    .map(([keyword, data]) => ({
      keyword,
      category: data.category,
      score: data.count * Math.log(data.totalViews + 1),
      estimated_views: Math.floor(data.totalViews / data.count),
      sample_video_id: data.sampleVideoId
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
  
  console.log(`✅ ${keywords.length}개 키워드 추출 완료`)
  return keywords
}

async function saveTrendsToSupabase(
  supabaseUrl: string,
  supabaseKey: string,
  keywords: TrendKeyword[],
  videos: TrendVideo[]
): Promise<void> {
  console.log('💾 Supabase에 트렌드 데이터 저장 시작...')
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  
  try {
    await supabase.from('trending_keywords').delete().lt('updated_at', twelveHoursAgo)
    await supabase.from('trending_videos').delete().lt('updated_at', twelveHoursAgo)
    console.log('✅ 오래된 데이터 삭제 완료')
  } catch (error) {
    console.error('❌ 오래된 데이터 삭제 중 오류:', error)
  }
  
  try {
    const { error: keywordsError } = await supabase
      .from('trending_keywords')
      .upsert(
        keywords.map(k => ({
          keyword: k.keyword,
          category: k.category,
          score: k.score,
          estimated_views: k.estimated_views,
          sample_video_id: k.sample_video_id,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'keyword' }
      )
    if (keywordsError) console.error('❌ 키워드 저장 실패:', keywordsError)
    else console.log(`✅ ${keywords.length}개 키워드 저장 완료`)
  } catch (error) {
    console.error('❌ 키워드 저장 중 오류:', error)
  }
  
  try {
    const { error: videosError } = await supabase
      .from('trending_videos')
      .upsert(
        videos.map(v => ({
          video_id: v.video_id,
          title: v.title,
          channel_title: v.channel_title,
          views: v.views,
          published_at: v.published_at,
          category: v.category,
          thumbnail_url: v.thumbnail_url,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'video_id' }
      )
    if (videosError) console.error('❌ 비디오 저장 실패:', videosError)
    else console.log(`✅ ${videos.length}개 비디오 저장 완료`)
  } catch (error) {
    console.error('❌ 비디오 저장 중 오류:', error)
  }
  
  console.log('💾 Supabase 트렌드 저장 완료')
}

async function updateTrends(env: Env): Promise<void> {
  console.log('🚀 트렌드 업데이트 시작:', new Date().toISOString())
  
  const videos = await collectTrendingVideos(env.YOUTUBE_API_KEY)
  if (videos.length === 0) {
    console.error('❌ 수집된 비디오가 없습니다.')
    return
  }
  
  const keywords = extractKeywords(videos)
  if (keywords.length === 0) {
    console.error('❌ 추출된 키워드가 없습니다.')
    return
  }
  
  await saveTrendsToSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, keywords, videos)
  
  console.log('✅ 트렌드 업데이트 완료:', new Date().toISOString())
  console.log(`📊 통계: 키워드 ${keywords.length}개, 비디오 ${videos.length}개`)
}

// ========================================
// 채널 랭킹 Phase 1: 인기 영상에서 채널 추출
// → tracked_channels에 최소 정보로 upsert
// Workers 50 subrequest 내에서 독립 실행
// ========================================

async function phase1_extractAndSave(env: Env): Promise<CollectResult> {
  console.log('🌍 Phase 1: 인기 영상에서 채널 추출 + tracked_channels 저장...')
  
  const today = new Date().toISOString().split('T')[0]
  const result: CollectResult = {
    success: false, phase: 'phase1',
    phase1_channels: 0, phase1_quota: 0, phase1_quota_exceeded: false,
    phase2_details: 0, phase2_quota: 0, phase2_error: '',
    rankings_saved: 0, total_quota: 0
  }
  
  const channelMap = new Map<string, ChannelAppearance>()
  let quotaUsed = 0
  let quotaExceeded = false
  
  try {
    // YouTube API로 인기 영상 수집 → 채널 ID 추출
    for (const region of CHANNEL_REGIONS_PRIORITY) {
      if (quotaExceeded || quotaUsed >= PHASE1_MAX_FETCH) break
      
      for (const category of CHANNEL_CATEGORIES_PRIORITY) {
        if (quotaExceeded || quotaUsed >= PHASE1_MAX_FETCH) break
        
        try {
          const url = new URL('https://www.googleapis.com/youtube/v3/videos')
          url.searchParams.set('part', 'snippet,statistics')
          url.searchParams.set('chart', 'mostPopular')
          url.searchParams.set('regionCode', region)
          url.searchParams.set('videoCategoryId', category)
          url.searchParams.set('maxResults', '20')
          url.searchParams.set('key', env.YOUTUBE_API_KEY)
          
          const response = await fetch(url.toString())
          quotaUsed++
          
          if (response.status === 403 || response.status === 429) {
            console.error(`🚫 API 쿼터 초과 (${region}/${category}). 수집 중단.`)
            quotaExceeded = true
            break
          }
          
          if (!response.ok) {
            console.warn(`⚠️ ${region}/${category} 실패: ${response.status}`)
            continue
          }
          
          const data: any = await response.json()
          if (!data.items || data.items.length === 0) continue
          
          for (const item of data.items) {
            const chId = item.snippet.channelId
            const chName = item.snippet.channelTitle
            
            if (!channelMap.has(chId)) {
              channelMap.set(chId, { name: chName, appearances: [] })
            }
            channelMap.get(chId)!.appearances.push({ region, category })
          }
          
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (error) {
          console.warn(`⚠️ ${region}/${category} 오류:`, error)
        }
      }
    }
    
    result.phase1_channels = channelMap.size
    result.phase1_quota = quotaUsed
    result.phase1_quota_exceeded = quotaExceeded
    
    if (channelMap.size === 0) {
      result.error = 'No channels extracted. API quota may be exhausted.'
      return result
    }
    
    console.log(`✅ ${channelMap.size}개 채널 추출 (${quotaUsed} API calls)`)
    
    // tracked_channels에 저장 (채널 ID + 이름만, phase1_pending 상태)
    // appearances 데이터도 source 필드에 JSON으로 저장
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
    
    const channelRecords = Array.from(channelMap.entries()).map(([id, app]) => ({
      channel_id: id,
      channel_name: app.name,
      source: 'phase1_pending',
      // appearances를 channel_country 필드에 임시 JSON 저장 (Phase 2에서 실제 값으로 덮어씀)
      channel_country: JSON.stringify(app.appearances).substring(0, 500),
      last_updated: new Date().toISOString()
    }))
    
    // 200개씩 배치 upsert
    const BATCH = 200
    for (let i = 0; i < channelRecords.length; i += BATCH) {
      const batch = channelRecords.slice(i, i + BATCH)
      const { error } = await supabase
        .from('tracked_channels')
        .upsert(batch, { onConflict: 'channel_id' })
      
      if (error) {
        console.error(`❌ tracked_channels 배치 ${i} 실패:`, error.message)
      }
    }
    
    result.success = true
    result.total_quota = quotaUsed
    console.log(`✅ Phase 1 완료: ${channelMap.size}개 채널 → tracked_channels 저장`)
    return result
    
  } catch (error) {
    console.error('❌ Phase 1 오류:', error)
    result.error = error instanceof Error ? error.message : String(error)
    return result
  }
}

// ========================================
// 채널 랭킹 Phase 2: 채널 상세 정보 수집 + 랭킹 저장
// tracked_channels에서 phase1_pending 상태인 채널 ID 로드
// 별도 요청으로 실행 (독립 50 subrequest 한도)
// ========================================

async function phase2_fetchAndRank(env: Env): Promise<CollectResult> {
  console.log('📋 Phase 2-4: 채널 상세 수집 + 랭킹 저장...')
  
  const today = new Date().toISOString().split('T')[0]
  const result: CollectResult = {
    success: false, phase: 'phase2-4',
    phase1_channels: 0, phase1_quota: 0, phase1_quota_exceeded: false,
    phase2_details: 0, phase2_quota: 0, phase2_error: '',
    rankings_saved: 0, total_quota: 0
  }
  
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
    
    // Phase 1에서 저장한 pending 채널 로드
    const { data: pendingChannels, error: loadError } = await supabase
      .from('tracked_channels')
      .select('channel_id, channel_name, channel_country')
      .eq('source', 'phase1_pending')
      .limit(2250) // PHASE2_MAX_FETCH * 50
    
    if (loadError || !pendingChannels || pendingChannels.length === 0) {
      result.error = `No pending channels found. ${loadError?.message || 'Run phase1 first.'}`
      return result
    }
    
    console.log(`✅ ${pendingChannels.length}개 pending 채널 로드`)
    result.phase1_channels = pendingChannels.length
    
    // appearances 데이터 복원
    const channelMap = new Map<string, ChannelAppearance>()
    for (const ch of pendingChannels) {
      let appearances: { region: string; category: string }[] = []
      try {
        appearances = JSON.parse(ch.channel_country || '[]')
      } catch { appearances = [{ region: 'KR', category: '0' }] }
      channelMap.set(ch.channel_id, { name: ch.channel_name, appearances })
    }
    
    // Phase 2: YouTube channels.list API 호출
    const channelIds = pendingChannels.map(ch => ch.channel_id)
    const details = new Map<string, ChannelDetail>()
    let quotaUsed = 0
    let firstError = ''
    const BATCH_SIZE = 50
    let fetchCount = 0
    
    for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
      if (fetchCount >= PHASE2_MAX_FETCH) {
        console.log(`⚠️ Phase 2 fetch 상한 (${PHASE2_MAX_FETCH}). ${details.size}개 수집됨.`)
        break
      }
      const batch = channelIds.slice(i, i + BATCH_SIZE)
      
      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/channels')
        url.searchParams.set('part', 'snippet,statistics')
        url.searchParams.set('id', batch.join(','))
        url.searchParams.set('key', env.YOUTUBE_API_KEY)
        
        console.log(`📋 배치 ${fetchCount + 1}: ${batch.length}개 채널`)
        const response = await fetch(url.toString())
        quotaUsed++
        fetchCount++
        
        if (response.status === 403 || response.status === 429) {
          const errBody = await response.text()
          firstError = `channels.list ${response.status}: ${errBody.substring(0, 200)}`
          console.error(`🚫 ${firstError}`)
          break
        }
        
        if (!response.ok) {
          const errBody = await response.text()
          firstError = `channels.list ${response.status}: ${errBody.substring(0, 200)}`
          console.error(`⚠️ ${firstError}`)
          break
        }
        
        const data: any = await response.json()
        if (!data.items) continue
        
        for (const item of data.items) {
          details.set(item.id, {
            channel_id: item.id,
            channel_name: item.snippet.title || '',
            channel_thumbnail: item.snippet.thumbnails?.default?.url || '',
            subscribers: parseInt(item.statistics?.subscriberCount || '0'),
            total_views: parseInt(item.statistics?.viewCount || '0'),
            video_count: parseInt(item.statistics?.videoCount || '0'),
            channel_country: item.snippet?.country || '',
            channel_description: (item.snippet?.description || '').substring(0, 200),
            channel_published_at: item.snippet?.publishedAt || null
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error: any) {
        firstError = `배치 예외: ${error.message || String(error)}`
        console.error(`❌ ${firstError}`)
        break
      }
    }
    
    result.phase2_details = details.size
    result.phase2_quota = quotaUsed
    result.phase2_error = firstError
    
    if (details.size === 0) {
      result.error = `No channel details fetched. Error: ${firstError || 'unknown'}`
      return result
    }
    
    console.log(`✅ Phase 2: ${details.size}개 채널 상세 정보 (${quotaUsed} API calls)`)
    
    // channel_published_at 컬럼 존재 여부 확인
    let hasPublishedAtColumn = true
    {
      const { error: probeErr } = await supabase
        .from('youtube_channel_rankings')
        .select('channel_published_at')
        .limit(1)
      if (probeErr && probeErr.code === '42703') {
        hasPublishedAtColumn = false
        console.log('ℹ️ channel_published_at 컬럼 미존재 → publishedAt 데이터 제외')
      }
    }

    // Phase 3: tracked_channels 업데이트 (상세 정보 + source → 'auto')
    const updateRecords = Array.from(details.values()).map(ch => {
      const base: any = {
        channel_id: ch.channel_id,
        channel_name: ch.channel_name,
        channel_thumbnail: ch.channel_thumbnail,
        source: 'auto',
        subscribers: ch.subscribers,
        total_views: ch.total_views,
        video_count: ch.video_count,
        channel_country: ch.channel_country,
        last_updated: new Date().toISOString()
      }
      if (hasPublishedAtColumn && ch.channel_published_at) {
        base.channel_published_at = ch.channel_published_at
      }
      return base
    })
    
    for (let i = 0; i < updateRecords.length; i += 200) {
      const batch = updateRecords.slice(i, i + 200)
      const { error } = await supabase
        .from('tracked_channels')
        .upsert(batch, { onConflict: 'channel_id' })
      if (error) console.error(`❌ tracked_channels 업데이트 배치 ${i} 실패:`, error.message)
    }
    
    console.log(`✅ Phase 3: tracked_channels ${details.size}개 업데이트`)
    
    // Phase 4: 랭킹 산출 + youtube_channel_rankings 저장
    const groupMap = new Map<string, { channelId: string; subscribers: number }[]>()
    
    for (const [channelId, appearance] of channelMap.entries()) {
      const detail = details.get(channelId)
      if (!detail) continue
      
      const seen = new Set<string>()
      for (const { region, category } of appearance.appearances) {
        const groupKey = `${region}:${category}`
        if (seen.has(groupKey)) continue
        seen.add(groupKey)
        
        if (!groupMap.has(groupKey)) groupMap.set(groupKey, [])
        groupMap.get(groupKey)!.push({ channelId, subscribers: detail.subscribers })
      }
    }
    
    const allRankings: any[] = []
    for (const [groupKey, channels] of groupMap.entries()) {
      const [region, category] = groupKey.split(':')
      channels.sort((a, b) => b.subscribers - a.subscribers)
      
      for (let rank = 0; rank < channels.length; rank++) {
        const ch = channels[rank]
        const detail = details.get(ch.channelId)!
        allRankings.push({
          channel_id: ch.channelId,
          channel_name: detail.channel_name,
          channel_thumbnail: detail.channel_thumbnail,
          subscribers: detail.subscribers,
          total_views: detail.total_views,
          video_count: detail.video_count,
          channel_country: detail.channel_country,
          channel_description: detail.channel_description,
          ...(hasPublishedAtColumn && detail.channel_published_at ? { channel_published_at: detail.channel_published_at } : {}),
          region_code: region,
          category_id: category,
          rank_position: rank + 1,
          snapshot_date: today
        })
      }
    }
    
    console.log(`📊 ${allRankings.length}개 랭킹 레코드 (${groupMap.size}개 그룹)`)
    
    let savedCount = 0
    for (let i = 0; i < allRankings.length; i += 500) {
      const batch = allRankings.slice(i, i + 500)
      const { error } = await supabase
        .from('youtube_channel_rankings')
        .upsert(batch, { onConflict: 'channel_id,region_code,category_id,snapshot_date' })
      if (error) {
        console.error(`❌ 랭킹 배치 ${i} 실패:`, error.message)
      } else {
        savedCount += batch.length
      }
    }
    
    result.rankings_saved = savedCount
    result.total_quota = quotaUsed
    result.success = true
    console.log(`✅ Phase 2-4 완료: ${details.size}개 채널 → ${savedCount}개 랭킹`)
    return result
    
  } catch (error) {
    console.error('❌ Phase 2-4 오류:', error)
    result.error = error instanceof Error ? error.message : String(error)
    return result
  }
}

// ========================================
// Worker Export (Cron + HTTP)
// ========================================

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('⏰ Cron 트리거:', event.cron, new Date().toISOString())
    
    try {
      if (event.cron === '30 8 * * *') {
        // 매일 08:30 UTC (쿼터 리셋 직후) → Phase 1 실행
        const phase1Result = await phase1_extractAndSave(env)
        console.log('Phase 1 결과:', JSON.stringify(phase1Result))
        
        if (phase1Result.success) {
          // Phase 2를 waitUntil로 별도 실행 (별도 subrequest 한도)
          ctx.waitUntil(
            (async () => {
              await new Promise(resolve => setTimeout(resolve, 3000))
              const phase2Result = await phase2_fetchAndRank(env)
              console.log('Phase 2-4 결과:', JSON.stringify(phase2Result))
            })()
          )
        }
      } else {
        await updateTrends(env)
      }
    } catch (error) {
      console.error('❌ Cron 작업 실패:', error)
    }
  },
  
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url)
    
    // 수동 트리거: 기존 트렌드 수집
    if (url.pathname === '/trigger' && request.method === 'POST') {
      console.log('🔧 수동: 트렌드 수집')
      try {
        await updateTrends(env)
        return jsonResponse({ success: true, message: '트렌드 업데이트 완료', timestamp: new Date().toISOString() })
      } catch (error) {
        return jsonResponse({ success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }, 500)
      }
    }
    
    // Phase 1만: 인기 영상 → 채널 추출 → tracked_channels 저장
    if (url.pathname === '/trigger-channels/phase1' && request.method === 'POST') {
      console.log('🔧 수동: Phase 1')
      const result = await phase1_extractAndSave(env)
      return jsonResponse({
        success: result.success,
        message: result.success ? `Phase 1 완료: ${result.phase1_channels}개 채널` : `Phase 1 실패: ${result.error}`,
        details: result,
        timestamp: new Date().toISOString()
      }, result.success ? 200 : 500)
    }
    
    // Phase 2-4만: tracked_channels에서 pending 로드 → 상세 → 랭킹
    if (url.pathname === '/trigger-channels/phase2' && request.method === 'POST') {
      console.log('🔧 수동: Phase 2-4')
      const result = await phase2_fetchAndRank(env)
      return jsonResponse({
        success: result.success,
        message: result.success 
          ? `Phase 2-4 완료: ${result.phase2_details}개 채널 → ${result.rankings_saved}개 랭킹`
          : `Phase 2-4 실패: ${result.error}`,
        details: result,
        timestamp: new Date().toISOString()
      }, result.success ? 200 : 500)
    }
    
    // 전체 실행: Phase 1 → waitUntil Phase 2
    if (url.pathname === '/trigger-channels' && request.method === 'POST') {
      console.log('🔧 수동: 전체 채널 랭킹')
      
      const phase1Result = await phase1_extractAndSave(env)
      
      if (phase1Result.success) {
        // Phase 2를 백그라운드로 트리거 (별도 subrequest 한도!)
        ctx.waitUntil(
          (async () => {
            await new Promise(resolve => setTimeout(resolve, 2000))
            const phase2Result = await phase2_fetchAndRank(env)
            console.log('📋 Phase 2 백그라운드 결과:', JSON.stringify(phase2Result))
          })()
        )
      }
      
      return jsonResponse({
        success: phase1Result.success,
        message: phase1Result.success 
          ? `Phase 1 완료 (${phase1Result.phase1_channels}개 채널). Phase 2 백그라운드 실행 중...`
          : `Phase 1 실패: ${phase1Result.error}`,
        details: phase1Result,
        next_step: phase1Result.success 
          ? 'Phase 2가 백그라운드 실행 중. 30초 후 /trigger-channels/status 확인'
          : 'Phase 1을 먼저 해결하세요',
        timestamp: new Date().toISOString()
      })
    }
    
    // 상태 확인
    if (url.pathname === '/trigger-channels/status') {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
      const today = new Date().toISOString().split('T')[0]
      
      const { count: pendingCount } = await supabase
        .from('tracked_channels')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'phase1_pending')
      
      const { count: autoCount } = await supabase
        .from('tracked_channels')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'auto')
      
      const { count: rankingCount } = await supabase
        .from('youtube_channel_rankings')
        .select('*', { count: 'exact', head: true })
        .eq('snapshot_date', today)
      
      const { count: totalRankings } = await supabase
        .from('youtube_channel_rankings')
        .select('*', { count: 'exact', head: true })
      
      return jsonResponse({
        date: today,
        tracked_channels: { pending: pendingCount || 0, auto: autoCount || 0 },
        rankings: { today: rankingCount || 0, total: totalRankings || 0 },
        phase_status: (pendingCount || 0) > 0 ? 'phase1_done_phase2_needed' : (rankingCount || 0) > 0 ? 'completed' : 'not_started',
        timestamp: new Date().toISOString()
      })
    }
    
    // 헬스체크
    if (url.pathname === '/health') {
      return jsonResponse({
        status: 'ok',
        version: 'v3.1',
        architecture: 'split-phase: Phase1(videos→channels→tracked_channels) + Phase2(channels.list→rankings)',
        subrequest_budget: 'Phase1: max 42 fetch, Phase2: max 45 fetch (each in separate invocation)',
        crons: ['0 */4 * * * (트렌드)', '30 8 * * * (채널 랭킹)'],
        endpoints: [
          'POST /trigger - 트렌드',
          'POST /trigger-channels - 전체 (Phase1 → Phase2 자동)',
          'POST /trigger-channels/phase1 - Phase 1만',
          'POST /trigger-channels/phase2 - Phase 2-4만',
          'GET /trigger-channels/status - 상태'
        ],
        timestamp: new Date().toISOString()
      })
    }
    
    return new Response('YouTube Trends Worker v3.1 (publishedAt)', { status: 200 })
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
