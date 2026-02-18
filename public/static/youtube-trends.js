// ========================================
// YouTube Trends Insights - 다국가 캐시 기반 + 크레딧 과금
// ========================================

console.log('🔥 [YouTube Trends] 스크립트 로드');

// 상태 변수
let trendDataCache = {}; // { "KR": { "0": [...], "10": [...] } }
let currentRegion = 'KR';
let currentCategory = '0'; // '0' = 전체
let isLoadingTrends = false;
let trendsData = { keywords: [], videos: [] };

// 세션 크레딧 캐시: 이미 크레딧을 사용한 국가
let _creditUsedRegions = {};

/**
 * 트렌드 인사이트 초기화
 */
async function initTrendsInsights() {
  console.log('🔥 [Trends] 트렌드 인사이트 초기화');
  
  // 급상승 키워드는 숨김 처리
  const keywordsSection = document.querySelector('.keywords-section');
  if (keywordsSection) {
    keywordsSection.style.display = 'none';
  }
  
  // 리전 드롭다운 이벤트 리스너
  const regionSelect = document.getElementById('trendRegionSelect');
  if (regionSelect) {
    regionSelect.removeEventListener('change', _onRegionChange);
    regionSelect.addEventListener('change', _onRegionChange);
  }
  
  // 카테고리 버튼 이벤트 리스너
  document.querySelectorAll('.category-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (this.disabled) return;
      
      const catId = this.dataset.category;
      currentCategory = catId;
      
      // 활성 버튼 스타일 변경
      document.querySelectorAll('.category-tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-green-100', 'text-green-700');
        b.classList.add('bg-gray-100', 'text-gray-600');
      });
      this.classList.add('active', 'bg-green-100', 'text-green-700');
      this.classList.remove('bg-gray-100', 'text-gray-600');
      
      // 캐시에서 렌더링 (API 호출 없음)
      renderTrendVideos(catId);
    });
  });
  
  // 초기 활성 버튼 스타일
  const activeBtn = document.querySelector('.category-tab-btn.active');
  if (activeBtn) {
    activeBtn.classList.add('bg-green-100', 'text-green-700');
    activeBtn.classList.remove('bg-gray-100', 'text-gray-600');
  }
  
  // ── 캐시 확인: 이미 데이터가 있으면 바로 표시, 없으면 불러오기 버튼 ──
  if (trendDataCache[currentRegion]) {
    _showTrendVideos();
    renderTrendVideos(currentCategory);
  } else {
    _showTrendLoadButton();
  }
}

function _onRegionChange() {
  currentRegion = this.value;
  currentCategory = '0';
  
  // 활성 버튼 스타일 리셋
  document.querySelectorAll('.category-tab-btn').forEach(b => {
    b.classList.remove('active', 'bg-green-100', 'text-green-700');
    b.classList.add('bg-gray-100', 'text-gray-600');
  });
  const allBtn = document.querySelector('.category-tab-btn[data-category="0"]');
  if (allBtn) {
    allBtn.classList.add('active', 'bg-green-100', 'text-green-700');
    allBtn.classList.remove('bg-gray-100', 'text-gray-600');
  }
  
  // 캐시에 있으면 무료로 표시, 없으면 불러오기 버튼
  if (trendDataCache[currentRegion]) {
    _showTrendVideos();
    renderTrendVideos(currentCategory);
  } else {
    _showTrendLoadButton();
  }
}

/**
 * 불러오기 버튼 표시 (크레딧 차감 전)
 */
function _showTrendLoadButton() {
  const loadingEl = document.getElementById('videos-loading');
  const listEl = document.getElementById('videos-list');
  const emptyEl = document.getElementById('videos-empty');
  
  if (loadingEl) loadingEl.classList.add('hidden');
  if (listEl) listEl.classList.add('hidden');
  if (emptyEl) {
    emptyEl.classList.remove('hidden');
    emptyEl.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12">
        <i class="fas fa-fire text-5xl text-orange-300 mb-4"></i>
        <p class="text-gray-500 text-sm mb-4">인기 영상 데이터를 불러오려면 아래 버튼을 클릭하세요</p>
        <button id="trendLoadBtn" onclick="loadTrendWithCredit()"
          class="px-6 py-3 bg-gradient-to-r from-orange-400 to-red-400 text-white rounded-lg font-medium hover:from-orange-500 hover:to-red-500 transition shadow-lg">
          🔥 인기 영상 불러오기 (1크레딧)
        </button>
        <p class="text-xs text-gray-400 mt-2">같은 국가 데이터는 세션 중 재사용 가능</p>
      </div>
    `;
  }
}

function _showTrendVideos() {
  const emptyEl = document.getElementById('videos-empty');
  if (emptyEl) emptyEl.classList.add('hidden');
}

/**
 * 크레딧 차감 후 트렌드 데이터 로드
 */
async function loadTrendWithCredit() {
  const btn = document.getElementById('trendLoadBtn');
  
  // 크레딧 차감
  try {
    const creditRes = await fetch('/api/credits/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1, feature: 'youtube_trends', user_id: window.currentUser?.id })
    });
    const creditData = await creditRes.json();
    if (!creditData.success) {
      alert(creditData.error || '크레딧이 부족합니다.');
      return;
    }
    _creditUsedRegions[currentRegion] = true;
    // 헤더 크레딧 업데이트
    if (creditData.free_credits !== undefined) {
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: { ...window.currentUser, free_credits: creditData.free_credits, paid_credits: creditData.paid_credits } }));
    }
  } catch (e) {
    console.error('크레딧 차감 오류:', e);
    alert('크레딧 확인 중 오류가 발생했습니다.');
    return;
  }
  
  // 버튼 로딩
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ 불러오는 중...';
  }
  
  try {
    await loadAllTrendData(currentRegion);
  } catch (err) {
    // 실패 시 환불
    try {
      await fetch('/api/credits/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1, feature: 'youtube_trends', user_id: window.currentUser?.id })
      });
    } catch (e) {}
    alert('트렌드 데이터 로드에 실패했습니다. 크레딧이 환불되었습니다.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔥 인기 영상 불러오기 (1크레딧)';
    }
  }
}

/**
 * 전체 카테고리 데이터 일괄 로드 (서버 캐시 활용)
 */
async function loadAllTrendData(regionCode) {
  if (isLoadingTrends) return;
  isLoadingTrends = true;
  
  const loadingEl = document.getElementById('videos-loading');
  const listEl = document.getElementById('videos-list');
  const emptyEl = document.getElementById('videos-empty');
  const updateEl = document.getElementById('videos-last-update');
  
  // 로딩 UI 표시
  if (loadingEl) loadingEl.classList.remove('hidden');
  if (listEl) listEl.classList.add('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');
  if (updateEl) updateEl.textContent = '로딩 중...';
  
  // 카테고리 버튼 모두 비활성화 (로딩 중)
  disableAllCategoryButtons();
  
  try {
    const response = await fetch('/api/youtube/trending-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regionCode: regionCode })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 캐시 저장
      trendDataCache[regionCode] = result.data;
      
      // 캐시 상태 표시
      const cacheStatus = document.getElementById('trendCacheStatus');
      if (cacheStatus) {
        cacheStatus.textContent = result.fromCache ? '(캐시된 데이터)' : '(방금 업데이트됨)';
      }
      
      if (updateEl) {
        updateEl.textContent = result.fromCache ? '캐시 데이터 사용' : '마지막 업데이트: 방금 전';
      }
      
      // 카테고리 버튼 활성/비활성 처리
      updateCategoryButtons(result.data);
      
      // 현재 선택된 카테고리 데이터 표시
      _showTrendVideos();
      renderTrendVideos(currentCategory);
      
    } else {
      if (emptyEl) {
        emptyEl.innerHTML = '<i class="fas fa-exclamation-triangle text-4xl mb-3 text-red-300"></i><p>데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>';
        emptyEl.classList.remove('hidden');
      }
      if (updateEl) updateEl.textContent = '로드 실패';
      enableAllCategoryButtons();
    }
    
  } catch (error) {
    console.error('❌ [Trends] 트렌드 데이터 로드 실패:', error);
    if (emptyEl) {
      emptyEl.innerHTML = '<i class="fas fa-exclamation-triangle text-4xl mb-3 text-red-300"></i><p>네트워크 오류가 발생했습니다.</p>';
      emptyEl.classList.remove('hidden');
    }
    if (updateEl) updateEl.textContent = '네트워크 오류';
    enableAllCategoryButtons();
    throw error; // 환불 처리를 위해 에러 전파
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
    isLoadingTrends = false;
  }
}

/**
 * 카테고리 버튼 활성/비활성 처리
 */
function updateCategoryButtons(data) {
  document.querySelectorAll('.category-tab-btn').forEach(btn => {
    const catId = btn.getAttribute('data-category');
    
    if (catId === '0' || catId === 'all') {
      btn.style.display = '';
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    } else if (data[catId] && data[catId].length > 0) {
      btn.style.display = '';
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    } else {
      btn.style.display = 'none';
    }
  });
}

function disableAllCategoryButtons() {
  document.querySelectorAll('.category-tab-btn').forEach(btn => {
    const catId = btn.getAttribute('data-category');
    if (catId === '0' || catId === 'all') {
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.style.display = 'none';
    }
  });
}

function enableAllCategoryButtons() {
  document.querySelectorAll('.category-tab-btn').forEach(btn => {
    btn.style.display = '';
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  });
}

/**
 * 캐시에서 카테고리 영상 렌더링 (API 호출 없음)
 */
function renderTrendVideos(categoryId) {
  const regionData = trendDataCache[currentRegion];
  if (!regionData) return;
  
  const listEl = document.getElementById('videos-list');
  const emptyEl = document.getElementById('videos-empty');
  
  let videos = [];
  
  if (categoryId === '0' || categoryId === 'all') {
    videos = regionData['0'] || [];
  } else {
    videos = regionData[categoryId] || [];
  }
  
  // 기존 videos 필드명 정규화
  const normalizedVideos = videos.map(v => ({
    video_id: v.videoId || v.id,
    title: v.title || v.snippet?.title || '',
    channel_title: v.channel || v.snippet?.channelTitle || '',
    views: v.views || parseInt(v.statistics?.viewCount || '0') || 0,
    likes: v.likes || parseInt(v.statistics?.likeCount || '0') || 0,
    published_at: v.publishedAt || v.snippet?.publishedAt || new Date().toISOString(),
    category: v.categoryId || v.snippet?.categoryId || categoryId || '0',
    thumbnail_url: v.thumbnailUrl || v.snippet?.thumbnails?.medium?.url || '',
    updated_at: new Date().toISOString()
  }));
  
  // 글로벌 상태 업데이트
  trendsData.videos = normalizedVideos;
  window.trendingVideos = normalizedVideos;
  
  if (normalizedVideos.length > 0) {
    renderVideos(normalizedVideos);
    if (listEl) listEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
  } else {
    if (listEl) listEl.classList.add('hidden');
    if (emptyEl) {
      emptyEl.innerHTML = '<i class="fas fa-info-circle text-4xl mb-3 text-blue-300"></i><p>이 카테고리는 현재 인기 영상 데이터가 제공되지 않습니다.</p>';
      emptyEl.classList.remove('hidden');
    }
  }
}

/**
 * 기존 호환용 — loadTrendVideos
 */
async function loadTrendVideos(categoryId) {
  if (trendDataCache[currentRegion]) {
    currentCategory = categoryId || '0';
    renderTrendVideos(currentCategory);
    return;
  }
  await loadTrendWithCredit();
}

/**
 * 영상 카드 렌더링
 */
function renderVideos(videos) {
  const listEl = document.getElementById('videos-list');
  if (!listEl) return;
  
  listEl.innerHTML = videos.map((video, index) => `
    <div class="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition cursor-pointer"
         onclick="updateTrendDetailPanel({
           videoId: '${video.video_id}',
           title: '${escapeHtml(video.title).replace(/'/g, "\\'")}',
           channel: '${escapeHtml(video.channel_title).replace(/'/g, "\\'")}',
           thumbnailUrl: 'https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg',
           views: ${video.views},
           likes: ${video.likes || 0},
           publishedAt: '${video.published_at}',
           category: '${video.category}'
         })">
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
    </div>
  `).join('');
}

/**
 * 영상 열기
 */
function openVideo(videoId) {
  if (videoId) {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  }
}

/**
 * 트렌드 우측 패널 업데이트
 */
function updateTrendDetailPanel(video) {
  const panelEl = document.getElementById('trend-detail-panel');
  if (!panelEl) {
    console.error('trend-detail-panel not found');
    return;
  }
  
  console.log('📊 영상 데이터:', video);
  
  const publishDate = new Date(video.publishedAt);
  const now = new Date();
  const daysAgo = Math.floor((now - publishDate) / (1000 * 60 * 60 * 24));
  const hoursAgo = Math.floor((now - publishDate) / (1000 * 60 * 60));
  const avgViewsPerDay = daysAgo > 0 ? Math.floor(video.views / daysAgo) : video.views;
  const avgViewsPerHour = hoursAgo > 0 ? Math.floor(video.views / hoursAgo) : video.views;
  
  const likeRate = video.views > 0 ? ((video.likes || 0) / video.views * 100).toFixed(2) : '0.00';
  
  let trendBadge = '';
  if (daysAgo <= 1) {
    trendBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">🆕 신규</span>';
  } else if (avgViewsPerDay > 100000) {
    trendBadge = '<span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">🔥 급상승</span>';
  } else if (video.views > 1000000) {
    trendBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">⭐ 인기</span>';
  }
  
  let viewRank = '', viewColor = '';
  if (video.views >= 10000000) { viewRank = '다이아몬드'; viewColor = 'text-blue-600'; }
  else if (video.views >= 5000000) { viewRank = '플래티넘'; viewColor = 'text-purple-600'; }
  else if (video.views >= 1000000) { viewRank = '골드'; viewColor = 'text-yellow-600'; }
  else if (video.views >= 500000) { viewRank = '실버'; viewColor = 'text-gray-500'; }
  else if (video.views >= 100000) { viewRank = '브론즈'; viewColor = 'text-orange-600'; }
  else { viewRank = '일반'; viewColor = 'text-gray-600'; }
  
  const dayOfWeek = publishDate.getDay();
  const hour = publishDate.getHours();
  let timingInfo = (dayOfWeek === 0 || dayOfWeek === 6) ? '주말 업로드' : '평일 업로드';
  if (hour >= 18 && hour <= 23) timingInfo += ' · 황금시간대';
  else if (hour >= 12 && hour <= 17) timingInfo += ' · 오후';
  else if (hour >= 6 && hour <= 11) timingInfo += ' · 오전';
  else timingInfo += ' · 심야';
  
  const titleLength = video.title.length;
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(video.title);
  const titleAnalysis = `${titleLength}자${hasEmoji ? ' · 이모지 포함' : ''}`;
  
  panelEl.classList.remove('detail-sidebar-empty');
  panelEl.innerHTML = `
    <div class="h-full overflow-y-auto" style="max-height: calc(100vh - var(--total-nav-height, 120px));">
      <div class="p-4 space-y-4">
        <div class="relative rounded-lg overflow-hidden">
          <img src="${video.thumbnailUrl}" alt="${video.title}" class="w-full">
          ${trendBadge ? `<div class="absolute top-2 right-2">${trendBadge}</div>` : ''}
        </div>
        <div>
          <h3 class="text-base font-bold text-gray-900 leading-snug mb-1">${video.title}</h3>
          <div class="text-xs text-gray-500">${titleAnalysis}</div>
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-700 pb-3 border-b">
          <i class="fas fa-user-circle text-gray-400"></i>
          <span class="font-medium">${video.channel}</span>
        </div>
        <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">조회수</span>
            <span class="text-lg font-bold ${viewColor}">${formatNumber(video.views)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">등급</span>
            <span class="text-sm font-semibold ${viewColor}">${viewRank}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">좋아요율</span>
            <span class="text-sm font-semibold text-green-600">${likeRate}%</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">게시일</span>
            <span class="text-sm font-medium text-gray-900">${formatRelativeTime(publishDate)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">카테고리</span>
            <span class="text-xs px-2 py-1 bg-white rounded-full font-medium text-gray-700">${getCategoryName(video.category)}</span>
          </div>
        </div>
        <div class="border-t pt-3">
          <h4 class="text-sm font-semibold text-gray-700 mb-3">📈 성장 분석</h4>
          <div class="space-y-2.5">
            <div class="bg-green-50 rounded-lg p-3">
              <div class="text-xs text-green-700 mb-1">일평균 조회수</div>
              <div class="text-lg font-bold text-green-900">${formatNumber(avgViewsPerDay)}</div>
              <div class="text-xs text-green-600 mt-1">${daysAgo}일간 평균</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-3">
              <div class="text-xs text-blue-700 mb-1">시간당 평균 조회수</div>
              <div class="text-lg font-bold text-blue-900">${formatNumber(avgViewsPerHour)}</div>
              <div class="text-xs text-blue-600 mt-1">${hoursAgo}시간 기준</div>
            </div>
          </div>
        </div>
        <div class="border-t pt-3">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">⏰ 게시 타이밍</h4>
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <i class="fas fa-clock text-gray-400"></i>
              <span>${timingInfo}</span>
            </div>
            <div class="text-xs text-gray-500 mt-2">
              ${publishDate.toLocaleString('ko-KR', { 
                year: 'numeric', month: 'long', day: 'numeric', 
                hour: '2-digit', minute: '2-digit', weekday: 'short'
              })}
            </div>
          </div>
        </div>
        <div class="border-t pt-3">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">⏱️ 경과 시간</h4>
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-purple-50 rounded-lg p-2.5 text-center">
              <div class="text-xl font-bold text-purple-900">${daysAgo}</div>
              <div class="text-xs text-purple-700">일</div>
            </div>
            <div class="bg-pink-50 rounded-lg p-2.5 text-center">
              <div class="text-xl font-bold text-pink-900">${hoursAgo}</div>
              <div class="text-xs text-pink-700">시간</div>
            </div>
          </div>
        </div>
        <div class="border-t pt-3 pb-2">
          <a href="https://www.youtube.com/watch?v=${video.videoId}" 
             target="_blank"
             class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm font-medium">
            <i class="fas fa-external-link-alt"></i>
            YouTube에서 확인
          </a>
        </div>
      </div>
    </div>
  `;
}

function toggleTrendDescription() {
  const descEl = document.getElementById('detail-description');
  const btnEl = event.target;
  if (!descEl || !btnEl) return;
  if (descEl.style.maxHeight === '4.5em') {
    descEl.style.maxHeight = 'none';
    btnEl.textContent = '접기';
  } else {
    descEl.style.maxHeight = '4.5em';
    btnEl.textContent = '더보기';
  }
}

function toggleDescription() {
  const descEl = document.getElementById('detail-description');
  if (!descEl) return;
  if (descEl.classList.contains('line-clamp-3')) {
    descEl.classList.remove('line-clamp-3');
    event.target.textContent = '접기';
  } else {
    descEl.classList.add('line-clamp-3');
    event.target.textContent = '더보기';
  }
}

function searchKeyword(keyword) {
  console.log('🔍 [Trends] 키워드 검색:', keyword);
  const videoFinderTab = document.querySelector('[data-tab="video-finder"]');
  if (videoFinderTab) videoFinderTab.click();
  setTimeout(() => {
    const searchInput = document.getElementById('market-search-input');
    if (searchInput) {
      searchInput.value = keyword;
      searchInput.focus();
      const searchBtn = document.getElementById('market-search-btn');
      if (searchBtn) searchBtn.click();
    }
  }, 100);
}

function showError(message) {
  console.error('❌ [Trends]', message);
}

function formatNumber(num) {
  if (!num) return '0';
  return parseInt(num).toLocaleString('ko-KR');
}

function formatRelativeTime(date) {
  if (!date) return '-';
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

function getCategoryName(categoryId) {
  const categories = {
    '1': '영화', '2': '자동차', '10': '음악', '15': '반려동물',
    '17': '스포츠', '19': '여행', '20': '게임', '22': '브이로그',
    '23': '코미디', '24': '엔터테인먼트', '25': '뉴스', '26': '하우투',
    '27': '교육', '28': '과학기술', '29': '사회/시사'
  };
  return categories[String(categoryId)] || '기타';
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

console.log('✅ [YouTube Trends] 다국가 캐시 기반 버전 로드 완료');
