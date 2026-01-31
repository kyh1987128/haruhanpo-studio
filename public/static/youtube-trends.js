// ========================================
// YouTube Trends Insights - Supabase 연동
// ========================================

console.log('🔥 [YouTube Trends] 스크립트 로드');

// Supabase 클라이언트 (환경 변수는 HTML에서 주입)
let supabaseClient = null;
let currentCategory = 'all';
let trendsData = {
  keywords: [],
  videos: []
};

/**
 * Supabase 클라이언트 초기화
 */
function initSupabase() {
  // app-v3-final.js에서 이미 초기화된 경우 재사용
  if (window.supabase) {
    supabaseClient = window.supabase;
    console.log('✅ [Trends] Supabase 클라이언트 재사용');
    return true;
  }
  
  // 환경 변수 확인
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('❌ [Trends] Supabase 환경 변수 누락');
    return false;
  }
  
  try {
    supabaseClient = supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
    console.log('✅ [Trends] Supabase 클라이언트 초기화 완료');
    return true;
  } catch (error) {
    console.error('❌ [Trends] Supabase 초기화 실패:', error);
    return false;
  }
}

/**
 * 트렌드 인사이트 초기화
 */
async function initTrendsInsights() {
  console.log('🔥 [Trends] 트렌드 인사이트 초기화');
  
  // Supabase 클라이언트 확인
  if (!supabaseClient && !initSupabase()) {
    showError('데이터베이스 연결에 실패했습니다.');
    return;
  }
  
  // 데이터 로드
  await loadTrendKeywords();
  await loadTrendVideos(currentCategory);
  
  // 카테고리 버튼 이벤트 리스너
  document.querySelectorAll('.category-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // 활성 버튼 스타일 변경
      document.querySelectorAll('.category-tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-green-100', 'text-green-700');
        b.classList.add('bg-gray-100', 'text-gray-600');
      });
      this.classList.add('active', 'bg-green-100', 'text-green-700');
      this.classList.remove('bg-gray-100', 'text-gray-600');
      
      // 카테고리 변경
      currentCategory = this.dataset.category;
      loadTrendVideos(currentCategory);
    });
  });
  
  // 초기 활성 버튼 스타일
  const activeBtn = document.querySelector('.category-tab-btn.active');
  if (activeBtn) {
    activeBtn.classList.add('bg-green-100', 'text-green-700');
    activeBtn.classList.remove('bg-gray-100', 'text-gray-600');
  }
}

/**
 * 급상승 키워드 로드
 */
async function loadTrendKeywords() {
  console.log('📊 [Trends] 급상승 키워드 로드 시작');
  
  const loadingEl = document.getElementById('keywords-loading');
  const gridEl = document.getElementById('keywords-grid');
  const emptyEl = document.getElementById('keywords-empty');
  const updateEl = document.getElementById('keywords-last-update');
  
  // 로딩 표시
  loadingEl?.classList.remove('hidden');
  gridEl?.classList.add('hidden');
  emptyEl?.classList.add('hidden');
  
  try {
    const { data, error } = await supabaseClient
      .from('trending_keywords')
      .select('*')
      .order('score', { ascending: false })
      .limit(6);
    
    if (error) throw error;
    
    console.log(`✅ [Trends] ${data.length}개 키워드 로드 완료`);
    
    trendsData.keywords = data || [];
    
    // UI 업데이트
    if (data && data.length > 0) {
      renderKeywords(data);
      gridEl?.classList.remove('hidden');
      
      // 마지막 업데이트 시간
      const lastUpdate = new Date(data[0].updated_at);
      updateEl.textContent = `마지막 업데이트: ${formatRelativeTime(lastUpdate)}`;
    } else {
      emptyEl?.classList.remove('hidden');
      updateEl.textContent = '데이터 없음';
    }
  } catch (error) {
    console.error('❌ [Trends] 키워드 로드 실패:', error);
    showError('키워드를 불러오는 데 실패했습니다.');
    emptyEl?.classList.remove('hidden');
  } finally {
    loadingEl?.classList.add('hidden');
  }
}

/**
 * 키워드 렌더링
 */
function renderKeywords(keywords) {
  const gridEl = document.getElementById('keywords-grid');
  if (!gridEl) return;
  
  gridEl.innerHTML = keywords.map((kw, index) => `
    <div class="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
         onclick="searchKeyword('${escapeHtml(kw.keyword)}')">
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-2xl font-bold text-orange-600">#${index + 1}</span>
          <span class="text-lg font-bold text-gray-800">${escapeHtml(kw.keyword)}</span>
        </div>
        <span class="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
          ${getCategoryName(kw.category)}
        </span>
      </div>
      <div class="flex items-center gap-3 text-sm text-gray-600">
        <div class="flex items-center gap-1">
          <i class="fas fa-eye text-orange-500"></i>
          <span>${formatNumber(kw.estimated_views)}</span>
        </div>
        <div class="flex items-center gap-1">
          <i class="fas fa-fire text-red-500"></i>
          <span>${Math.round(kw.score)}</span>
        </div>
      </div>
      <div class="mt-2 text-xs text-gray-500">
        <i class="fas fa-video mr-1"></i>
        샘플: ${kw.sample_video_id.substring(0, 8)}...
      </div>
    </div>
  `).join('');
}

/**
 * 인기 영상 로드
 */
async function loadTrendVideos(category = 'all') {
  console.log(`📹 [Trends] 인기 영상 로드 시작 (카테고리: ${category})`);
  
  const loadingEl = document.getElementById('videos-loading');
  const listEl = document.getElementById('videos-list');
  const emptyEl = document.getElementById('videos-empty');
  const updateEl = document.getElementById('videos-last-update');
  
  // 로딩 표시
  loadingEl?.classList.remove('hidden');
  listEl?.classList.add('hidden');
  emptyEl?.classList.add('hidden');
  
  try {
    let query = supabaseClient
      .from('trending_videos')
      .select('*')
      .order('views', { ascending: false })
      .limit(20);
    
    // 카테고리 필터
    if (category !== 'all') {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    // Supabase 데이터가 없으면 fallback API 호출
    let videos = data || [];
    if ((!videos || videos.length === 0) && !error) {
      console.log('📡 [Trends] Fallback: YouTube Trending API 호출');
      try {
        const response = await fetch('/api/youtube/trending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('postflow_token')}` },
          body: JSON.stringify({ regionCode: 'KR', maxResults: 20, videoCategoryId: category !== 'all' ? category : undefined })
        });
        const result = await response.json();
        if (result.success && result.data?.videos) {
          videos = result.data.videos.map(v => ({
            video_id: v.videoId || v.id, title: v.title || v.snippet?.title || '',
            channel_title: v.channel || v.snippet?.channelTitle || '',
            views: v.views || v.statistics?.viewCount || 0,
            published_at: v.publishedAt || v.snippet?.publishedAt || new Date().toISOString(),
            category: category !== 'all' ? category : '24',
            thumbnail_url: v.thumbnailUrl || v.snippet?.thumbnails?.medium?.url || '',
            updated_at: new Date().toISOString()
          }));
          console.log(`✅ [Trends] Fallback에서 ${videos.length}개 로드`);
        }
      } catch (e) { console.error('❌ Fallback 실패:', e); }
    }
    
    if (error) throw error;
    
    console.log(`✅ [Trends] ${videos.length}개 영상 로드 완료`);
    
    trendsData.videos = videos;
    window.trendingVideos = videos; // 전역 변수 저장
    
    // UI 업데이트
    if (videos && videos.length > 0) {
      renderVideos(videos);
      listEl?.classList.remove('hidden');
      
      // 마지막 업데이트 시간
      const lastUpdate = new Date(videos[0].updated_at);
      updateEl.textContent = `마지막 업데이트: ${formatRelativeTime(lastUpdate)}`;
    } else {
      emptyEl?.classList.remove('hidden');
      updateEl.textContent = '데이터 없음';
    }
  } catch (error) {
    console.error('❌ [Trends] 영상 로드 실패:', error);
    showError('영상을 불러오는 데 실패했습니다.');
    emptyEl?.classList.remove('hidden');
  } finally {
    loadingEl?.classList.add('hidden');
  }
}

/**
 * 영상 렌더링
 */
function renderVideos(videos) {
  const listEl = document.getElementById('videos-list');
  if (!listEl) return;
  
  listEl.innerHTML = videos.map((video, index) => `
    <div class="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition cursor-pointer"
         onclick="openVideo('${video.video_id}')">
      <!-- 순위 -->
      <div class="flex-shrink-0 w-8 text-center">
        <span class="text-lg font-bold ${index < 3 ? 'text-orange-600' : 'text-gray-400'}">
          ${index + 1}
        </span>
      </div>
      
      <!-- 썸네일 -->
      <div class="flex-shrink-0">
        <img src="${video.thumbnail_url}" 
             alt="${escapeHtml(video.title)}"
             class="w-40 h-24 object-cover rounded-lg">
      </div>
      
      <!-- 정보 -->
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-gray-900 mb-1 line-clamp-2">
          ${escapeHtml(video.title)}
        </h3>
        <p class="text-sm text-gray-600 mb-2">
          <i class="fas fa-user-circle mr-1"></i>
          ${escapeHtml(video.channel_title)}
        </p>
        <div class="flex items-center gap-3 text-sm text-gray-500">
          <span>
            <i class="fas fa-eye mr-1"></i>
            ${formatNumber(video.views)}
          </span>
          <span>
            <i class="fas fa-calendar mr-1"></i>
            ${formatRelativeTime(new Date(video.published_at))}
          </span>
          <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
            ${getCategoryName(video.category)}
          </span>
        </div>
      </div>
      
      <!-- 액션 버튼 -->
      <div class="flex-shrink-0">
        <button class="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition"
                onclick="event.stopPropagation(); openVideo('${video.video_id}')">
          <i class="fab fa-youtube mr-1"></i>
          보기
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * 키워드 검색 (영상 발굴 탭으로 이동)
 */
function searchKeyword(keyword) {
  console.log(`🔍 [Trends] 키워드 검색: ${keyword}`);
  
  // 영상 발굴 탭으로 전환
  const videoFinderTab = document.querySelector('[data-tab="video-finder"]');
  if (videoFinderTab) {
    videoFinderTab.click();
  }
  
  // 검색어 입력
  setTimeout(() => {
    const searchInput = document.getElementById('market-search-input') || 
                       document.getElementById('video-search-input');
    if (searchInput) {
      searchInput.value = keyword;
      searchInput.focus();
      
      // 검색 버튼 클릭
      const searchBtn = document.querySelector('[onclick*="handleSearch"]') ||
                       document.querySelector('button[type="button"]:has(i.fa-search)');
      if (searchBtn) {
        searchBtn.click();
      }
    }
  }, 100);
}

/**
 * 영상 열기
 */
function openVideo(videoId) {
  window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

/**
 * 카테고리 이름 가져오기
 */
function getCategoryName(categoryId) {
  const categories = {
    '10': '음악',
    '20': '게임',
    '22': '브이로그',
    '23': '코미디',
    '24': '엔터테인먼트',
    '25': '뉴스',
    '26': '하우투',
    '27': '교육',
    '28': '과학/기술'
  };
  return categories[categoryId] || '기타';
}

/**
 * 숫자 포맷팅
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * 상대 시간 포맷팅
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 에러 표시
 */
function showError(message) {
  console.error('❌ [Trends]', message);
  // 간단한 알림 (필요시 Toast UI로 교체)
  alert(message);
}

// 스타일 추가
const style = document.createElement('style');
style.textContent = `
  .category-tab-btn {
    background: #f3f4f6;
    color: #6b7280;
  }
  
  .category-tab-btn.active {
    background: #dcfce7;
    color: #16a34a;
    font-weight: 600;
  }
  
  .category-tab-btn:hover {
    background: #e5e7eb;
  }
  
  .category-tab-btn.active:hover {
    background: #bbf7d0;
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;
document.head.appendChild(style);

console.log('✅ [YouTube Trends] 스크립트 준비 완료');
