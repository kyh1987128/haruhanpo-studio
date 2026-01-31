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
 * 트렌드 우측 패널 업데이트 (영상 발굴과 동일한 풍부한 정보 표시)
 */
function updateTrendDetailPanel(video) {
  const panelEl = document.getElementById('trend-detail-panel');
  if (!panelEl) {
    console.error('trend-detail-panel not found');
    return;
  }
  
  panelEl.classList.remove('detail-sidebar-empty');
  panelEl.innerHTML = `
    <div class="p-6 space-y-6">
      <!-- 썸네일 -->
      <div class="relative rounded-lg overflow-hidden">
        <img src="${video.thumbnailUrl}" alt="${video.title}" class="w-full">
      </div>
      
      <!-- 제목 -->
      <h3 class="text-lg font-bold text-gray-900 leading-snug">${video.title}</h3>
      
      <!-- 채널 정보 -->
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-sm text-gray-700">
          <i class="fas fa-user-circle text-gray-400"></i>
          <span class="font-medium">${video.channel}</span>
        </div>
        ${video.subscriberCount ? `
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <i class="fas fa-users text-gray-400"></i>
          <span>구독자 ${formatNumber(video.subscriberCount)}명</span>
        </div>
        ` : ''}
        ${video.videoCount ? `
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <i class="fas fa-video text-gray-400"></i>
          <span>영상 ${formatNumber(video.videoCount)}개</span>
        </div>
        ` : ''}
      </div>
      
      <!-- 통계 -->
      <div class="grid grid-cols-3 gap-3 py-4 border-t border-b border-gray-200">
        <div class="text-center">
          <div class="text-lg font-bold text-gray-900">${formatNumber(video.views)}</div>
          <div class="text-xs text-gray-500">조회수</div>
        </div>
        ${video.likes ? `
        <div class="text-center">
          <div class="text-lg font-bold text-gray-900">${formatNumber(video.likes)}</div>
          <div class="text-xs text-gray-500">좋아요</div>
        </div>
        ` : ''}
        <div class="text-center">
          <div class="text-sm font-medium text-gray-900">${formatRelativeTime(new Date(video.publishedAt))}</div>
          <div class="text-xs text-gray-500">게시일</div>
        </div>
      </div>
      
      <!-- 상세 메트릭 -->
      ${video.likeRate || video.viralIndex ? `
      <div class="space-y-2">
        ${video.likeRate ? `
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">좋아요율</span>
          <span class="font-semibold text-gray-900">${(video.likeRate * 100).toFixed(1)}%</span>
        </div>
        ` : ''}
        ${video.viralIndex ? `
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">바이럴 지수</span>
          <span class="font-semibold text-gray-900">${video.viralIndex.toFixed(1)}</span>
        </div>
        ` : ''}
        ${video.commentCount ? `
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">댓글</span>
          <span class="font-semibold text-gray-900">${formatNumber(video.commentCount)}개</span>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <!-- 카테고리 -->
      <div class="flex items-center gap-2">
        <span class="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
          <i class="fas fa-tag text-gray-400 mr-1"></i>
          ${getCategoryName(video.category)}
        </span>
      </div>
      
      <!-- 설명 -->
      ${video.description ? `
      <div class="border-t pt-4">
        <h4 class="text-sm font-semibold text-gray-700 mb-2">설명</h4>
        <div class="text-sm text-gray-600 leading-relaxed">
          <p id="detail-description" class="line-clamp-3">${video.description}</p>
          <button onclick="toggleDescription()" class="text-blue-600 hover:text-blue-700 text-xs mt-2">
            더보기
          </button>
        </div>
      </div>
      ` : ''}
      
      <!-- 액션 버튼 -->
      <div class="space-y-2 border-t pt-4">
        <a href="https://www.youtube.com/watch?v=${video.videoId}" 
           target="_blank"
           class="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-600 text-white text-center rounded-lg hover:bg-red-700 transition font-medium">
          <i class="fab fa-youtube"></i>
          YouTube에서 보기
        </a>
      </div>
    </div>
  `;
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
