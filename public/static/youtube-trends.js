// ========================================
// YouTube Trends Insights - 단순화 (Supabase 제거)
// ========================================

console.log('🔥 [YouTube Trends] 스크립트 로드');

let currentCategory = 'all';
let trendsData = {
  keywords: [],
  videos: []
};

/**
 * 트렌드 인사이트 초기화
 */
async function initTrendsInsights() {
  console.log('🔥 [Trends] 트렌드 인사이트 초기화');
  
  // 급상승 키워드는 숨김 처리 (Worker 없이는 불가능)
  const keywordsSection = document.querySelector('.keywords-section');
  if (keywordsSection) {
    keywordsSection.style.display = 'none';
  }
  
  // 인기 영상만 표시
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
 * 인기 영상 로드 (YouTube Trending API 직접 호출)
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
    // YouTube Trending API 직접 호출 (Supabase 불필요)
    const response = await fetch('/api/youtube/trending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        regionCode: 'KR', 
        maxResults: 20,
        videoCategoryId: category !== 'all' ? category : undefined
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data?.videos) {
      throw new Error(result.error?.message || '데이터 없음');
    }
    
    // 데이터 변환
    const videos = result.data.videos.map(v => ({
      video_id: v.videoId || v.id,
      title: v.title || v.snippet?.title || '',
      channel_title: v.channel || v.snippet?.channelTitle || '',
      views: v.views || v.statistics?.viewCount || 0,
      published_at: v.publishedAt || v.snippet?.publishedAt || new Date().toISOString(),
      category: v.categoryId || v.snippet?.categoryId || category || '24',
      thumbnail_url: v.thumbnailUrl || v.snippet?.thumbnails?.medium?.url || '',
      updated_at: new Date().toISOString()
    }));
    
    console.log(`✅ [Trends] ${videos.length}개 영상 로드 완료`);
    
    trendsData.videos = videos;
    window.trendingVideos = videos; // 전역 변수 저장
    
    // UI 업데이트
    if (videos && videos.length > 0) {
      renderVideos(videos);
      listEl?.classList.remove('hidden');
      
      // 마지막 업데이트 시간
      updateEl.textContent = `마지막 업데이트: 방금 전`;
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
         onclick="updateTrendDetailPanel({
           videoId: '${video.video_id}',
           title: '${escapeHtml(video.title).replace(/'/g, "\\'")}',
           channel: '${escapeHtml(video.channel_title).replace(/'/g, "\\'")}',
           thumbnailUrl: 'https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg',
           views: ${video.views},
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
 * 트렌드 우측 패널 업데이트 (API 호출 없이 풍부한 정보 표시)
 */
function updateTrendDetailPanel(video) {
  const panelEl = document.getElementById('trend-detail-panel');
  if (!panelEl) {
    console.error('trend-detail-panel not found');
    return;
  }
  
  console.log('📊 영상 데이터:', video);
  
  // 계산 가능한 메트릭
  const publishDate = new Date(video.publishedAt);
  const now = new Date();
  const daysAgo = Math.floor((now - publishDate) / (1000 * 60 * 60 * 24));
  const hoursAgo = Math.floor((now - publishDate) / (1000 * 60 * 60));
  const avgViewsPerDay = daysAgo > 0 ? Math.floor(video.views / daysAgo) : video.views;
  const avgViewsPerHour = hoursAgo > 0 ? Math.floor(video.views / hoursAgo) : video.views;
  
  // 트렌드 배지 결정
  let trendBadge = '';
  if (daysAgo <= 1) {
    trendBadge = '<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">🆕 신규</span>';
  } else if (avgViewsPerDay > 100000) {
    trendBadge = '<span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">🔥 급상승</span>';
  } else if (video.views > 1000000) {
    trendBadge = '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">⭐ 인기</span>';
  }
  
  // 조회수 단계별 등급
  let viewRank = '';
  let viewColor = '';
  if (video.views >= 10000000) {
    viewRank = '다이아몬드';
    viewColor = 'text-blue-600';
  } else if (video.views >= 5000000) {
    viewRank = '플래티넘';
    viewColor = 'text-purple-600';
  } else if (video.views >= 1000000) {
    viewRank = '골드';
    viewColor = 'text-yellow-600';
  } else if (video.views >= 500000) {
    viewRank = '실버';
    viewColor = 'text-gray-500';
  } else if (video.views >= 100000) {
    viewRank = '브론즈';
    viewColor = 'text-orange-600';
  } else {
    viewRank = '일반';
    viewColor = 'text-gray-600';
  }
  
  // 게시 타이밍 분석
  const dayOfWeek = publishDate.getDay();
  const hour = publishDate.getHours();
  let timingInfo = '';
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    timingInfo = '주말 업로드';
  } else {
    timingInfo = '평일 업로드';
  }
  if (hour >= 18 && hour <= 23) {
    timingInfo += ' · 황금시간대';
  } else if (hour >= 12 && hour <= 17) {
    timingInfo += ' · 오후';
  } else if (hour >= 6 && hour <= 11) {
    timingInfo += ' · 오전';
  } else {
    timingInfo += ' · 심야';
  }
  
  // 제목 분석
  const titleLength = video.title.length;
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(video.title);
  const titleAnalysis = `${titleLength}자${hasEmoji ? ' · 이모지 포함' : ''}`;
  
  panelEl.classList.remove('detail-sidebar-empty');
  panelEl.innerHTML = `
    <div class="h-full overflow-y-auto" style="max-height: calc(100vh - 120px);">
      <div class="p-4 space-y-4">
        <!-- 썸네일 -->
        <div class="relative rounded-lg overflow-hidden">
          <img src="${video.thumbnailUrl}" alt="${video.title}" class="w-full">
          ${trendBadge ? `<div class="absolute top-2 right-2">${trendBadge}</div>` : ''}
        </div>
        
        <!-- 제목 -->
        <div>
          <h3 class="text-base font-bold text-gray-900 leading-snug mb-1">${video.title}</h3>
          <div class="text-xs text-gray-500">${titleAnalysis}</div>
        </div>
        
        <!-- 채널 정보 -->
        <div class="flex items-center gap-2 text-sm text-gray-700 pb-3 border-b">
          <i class="fas fa-user-circle text-gray-400"></i>
          <span class="font-medium">${video.channel}</span>
        </div>
        
        <!-- 주요 통계 -->
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
            <span class="text-sm text-gray-600">게시일</span>
            <span class="text-sm font-medium text-gray-900">${formatRelativeTime(publishDate)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">카테고리</span>
            <span class="text-xs px-2 py-1 bg-white rounded-full font-medium text-gray-700">${getCategoryName(video.category)}</span>
          </div>
        </div>
        
        <!-- 성장 메트릭 -->
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
        
        <!-- 게시 타이밍 -->
        <div class="border-t pt-3">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">⏰ 게시 타이밍</h4>
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex items-center gap-2 text-sm text-gray-700">
              <i class="fas fa-clock text-gray-400"></i>
              <span>${timingInfo}</span>
            </div>
            <div class="text-xs text-gray-500 mt-2">
              ${publishDate.toLocaleString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                weekday: 'short'
              })}
            </div>
          </div>
        </div>
        
        <!-- 경과 시간 상세 -->
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
        
        <!-- 퀵 액션 -->
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

/**
 * 설명 더보기/접기 (트렌드)
 */
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

/**
 * 설명 더보기/접기
 */
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

/**
 * 키워드로 검색 (영상 발굴 탭으로 이동)
 */
function searchKeyword(keyword) {
  console.log('🔍 [Trends] 키워드 검색:', keyword);
  
  // 영상 발굴 탭으로 전환
  const videoFinderTab = document.querySelector('[data-tab="video-finder"]');
  if (videoFinderTab) {
    videoFinderTab.click();
  }
  
  // 검색 입력창에 키워드 설정
  setTimeout(() => {
    const searchInput = document.getElementById('market-search-input');
    if (searchInput) {
      searchInput.value = keyword;
      searchInput.focus();
      
      // 검색 버튼 클릭
      const searchBtn = document.getElementById('market-search-btn');
      if (searchBtn) {
        searchBtn.click();
      }
    }
  }, 100);
}

/**
 * 에러 표시
 */
function showError(message) {
  console.error('❌ [Trends]', message);
  // 간단한 알림만 표시 (모달 대신)
}

/**
 * 숫자 포맷팅
 */
function formatNumber(num) {
  if (!num) return '0';
  return parseInt(num).toLocaleString('ko-KR');
}

/**
 * 상대 시간 포맷팅
 */
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

/**
 * 카테고리 이름 매핑
 */
function getCategoryName(categoryId) {
  const categories = {
    '1': '영화',
    '2': '자동차',
    '10': '음악',
    '15': '반려동물',
    '17': '스포츠',
    '19': '여행',
    '20': '게임',
    '22': '브이로그',
    '23': '코미디',
    '24': '엔터테인먼트',
    '25': '뉴스',
    '26': '하우투',
    '27': '교육',
    '28': '과학기술'
  };
  return categories[String(categoryId)] || '기타';
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

console.log('✅ [YouTube Trends] 단순화 버전 로드 완료');
