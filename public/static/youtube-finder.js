// ========================================
// YouTube Finder - Phase 2 검색 기능
// ========================================

console.log('🚀 [YouTube Finder] 스크립트 로드');

// 전역 상태
let selectedVideos = new Set();
let currentSearchResults = [];
let allSearchResults = []; // 필터링 전 전체 결과
let currentSortField = null;
let currentSortOrder = 'desc'; // 'asc' or 'desc'

// 페이지네이션 상태
let currentKeyword = '';
let nextPageToken = null;
let isLoadingMore = false;
let hasMoreResults = false;

// ========================================
// 1. 검색 기능
// ========================================

async function handleSearch() {
  const searchInput = document.getElementById('video-search-input');
  const keyword = searchInput?.value.trim();

  if (!keyword) {
    alert('검색 키워드를 입력해주세요.');
    return;
  }

  console.log('🔍 검색 시작:', keyword);

  // 새 검색 시 상태 초기화
  currentKeyword = keyword;
  nextPageToken = null;
  selectedVideos.clear();
  allSearchResults = [];
  currentSearchResults = [];

  // 로딩 상태
  showLoading(true);

  try {
    // YouTube API 호출
    const response = await fetch('/api/youtube/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
      },
      body: JSON.stringify({ keyword, maxResults: 20 })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || '검색 실패');
    }

    console.log('✅ 검색 완료:', result.data.totalResults, '개');

    // 페이지네이션 정보 저장
    nextPageToken = result.data.nextPageToken;
    hasMoreResults = result.data.hasMore;

    // 결과 저장 (필터링/정렬용)
    allSearchResults = result.data.videos;
    currentSearchResults = [...allSearchResults];

    // 필터 적용
    applyFilters();

    // "더 보기" 버튼 표시
    updateLoadMoreButton();

  } catch (error) {
    console.error('❌ 검색 오류:', error);
    alert(`검색 중 오류가 발생했습니다: ${error.message}`);
    currentSearchResults = [];
    updateVideoTable([]);
  } finally {
    showLoading(false);
  }
}

// ========================================
// 1.5. 필터링 로직 (Phase 2 Week 3)
// ========================================

function applyFilters() {
  console.log('🔍 필터 적용 시작');
  
  // 1. 필터 값 가져오기
  const viewsFilter = document.querySelector('select[class*="filter-select-inline"]')?.value || 'all';
  const periodFilter = document.querySelectorAll('select[class*="filter-select-inline"]')[1]?.value || 'all';
  const gradeGreat = document.querySelectorAll('input[type="checkbox"]')[1]?.checked ?? true;
  const gradeGood = document.querySelectorAll('input[type="checkbox"]')[2]?.checked ?? true;
  const gradeNormal = document.querySelectorAll('input[type="checkbox"]')[3]?.checked ?? true;

  // 2. 필터링 시작
  let filtered = [...allSearchResults];

  // 3. 조회수 필터
  if (viewsFilter && viewsFilter !== '조회수: 전체') {
    if (viewsFilter.includes('1만 ~ 10만')) {
      filtered = filtered.filter(v => v.views >= 10000 && v.views < 100000);
    } else if (viewsFilter.includes('10만 ~ 100만')) {
      filtered = filtered.filter(v => v.views >= 100000 && v.views < 1000000);
    } else if (viewsFilter.includes('100만 ~ 1000만')) {
      filtered = filtered.filter(v => v.views >= 1000000 && v.views < 10000000);
    } else if (viewsFilter.includes('1000만 이상')) {
      filtered = filtered.filter(v => v.views >= 10000000);
    }
  }

  // 4. 기간 필터
  if (periodFilter && periodFilter !== '기간: 전체') {
    const now = new Date();
    const filterDate = new Date();
    
    if (periodFilter.includes('이번 주')) {
      filterDate.setDate(now.getDate() - 7);
    } else if (periodFilter.includes('이번 달')) {
      filterDate.setMonth(now.getMonth() - 1);
    } else if (periodFilter.includes('3개월')) {
      filterDate.setMonth(now.getMonth() - 3);
    } else if (periodFilter.includes('1년')) {
      filterDate.setFullYear(now.getFullYear() - 1);
    }
    
    if (periodFilter !== '기간: 전체') {
      filtered = filtered.filter(v => new Date(v.publishedAt) >= filterDate);
    }
  }

  // 5. 성과도 필터
  const allowedGrades = [];
  if (gradeGreat) allowedGrades.push('Great');
  if (gradeGood) allowedGrades.push('Good');
  if (gradeNormal) allowedGrades.push('Normal');
  
  if (allowedGrades.length > 0) {
    filtered = filtered.filter(v => allowedGrades.includes(v.performance));
  }

  console.log(`✅ 필터 완료: ${allSearchResults.length}개 → ${filtered.length}개`);

  // 6. 정렬 적용
  if (currentSortField) {
    filtered = sortVideos(filtered, currentSortField, currentSortOrder);
  }

  // 7. 결과 업데이트
  currentSearchResults = filtered;
  updateVideoTable(currentSearchResults);
  updateResultsSummary(currentSearchResults.length, 0);
  
  // 선택 초기화
  selectedVideos.clear();
}

// ========================================
// 1.6. 정렬 로직 (Phase 2 Week 3)
// ========================================

function sortVideos(videos, field, order) {
  const sorted = [...videos];
  
  sorted.sort((a, b) => {
    let aVal, bVal;
    
    if (field === 'views') {
      aVal = a.views;
      bVal = b.views;
    } else if (field === 'subscribers') {
      aVal = a.subscriberCount;
      bVal = b.subscriberCount;
    } else if (field === 'date') {
      aVal = new Date(a.publishedAt).getTime();
      bVal = new Date(b.publishedAt).getTime();
    } else if (field === 'title') {
      aVal = a.title.toLowerCase();
      bVal = b.title.toLowerCase();
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  return sorted;
}

function handleSort(field) {
  console.log('📊 정렬:', field);
  
  // 같은 필드 클릭 시 순서 반전
  if (currentSortField === field) {
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortField = field;
    currentSortOrder = 'desc'; // 기본 내림차순
  }
  
  // 정렬 아이콘 업데이트
  updateSortIcons();
  
  // 필터 재적용 (정렬 포함)
  applyFilters();
}

function updateSortIcons() {
  // 모든 정렬 아이콘 초기화
  document.querySelectorAll('.col-title, .col-views, .col-date').forEach(header => {
    const icon = header.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-sort text-xs text-gray-400';
    }
  });
  
  // 현재 정렬 필드 아이콘 업데이트
  if (currentSortField) {
    const headerMap = {
      'title': '.col-title',
      'views': '.col-views',
      'date': '.col-date'
    };
    
    const header = document.querySelector(headerMap[currentSortField]);
    const icon = header?.querySelector('i');
    
    if (icon) {
      icon.className = currentSortOrder === 'asc' 
        ? 'fas fa-sort-up text-xs text-green-600'
        : 'fas fa-sort-down text-xs text-green-600';
    }
  }
}

// ========================================
// 2. 테이블 업데이트
// ========================================

function updateVideoTable(videos) {
  const tbody = document.getElementById('video-table-body');
  
  if (!tbody) {
    console.error('❌ video-table-body 요소를 찾을 수 없습니다');
    return;
  }

  if (videos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="px-4 py-8 text-center text-gray-500">
          <i class="fas fa-search text-3xl mb-2"></i>
          <p>검색 결과가 없습니다.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = videos.map(video => {
    const publishDate = new Date(video.publishedAt).toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '');

    return `
      <tr class="video-row border-b hover:bg-gray-50 cursor-pointer transition" data-video-id="${video.videoId}">
        <td class="px-4 py-3">
          <input type="checkbox" class="video-select w-4 h-4 cursor-pointer" value="${video.videoId}">
        </td>
        <td class="px-4 py-3">
          <img 
            src="${video.thumbnailUrl}" 
            alt="썸네일"
            class="video-thumbnail w-32 h-18 object-cover rounded"
          >
        </td>
        <td class="px-4 py-3">
          <div class="video-info">
            <div class="video-title font-medium text-gray-900 mb-1 line-clamp-2">
              ${escapeHtml(video.title)}
            </div>
            <div class="channel-info flex items-center gap-2 text-sm text-gray-600">
              <span class="channel-name">${escapeHtml(video.channel)}</span>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 text-right font-medium text-gray-900">${formatNumber(video.views)}</td>
        <td class="px-4 py-3 text-right text-gray-700">${formatNumber(video.subscriberCount)}</td>
        <td class="px-4 py-3 text-center">
          <span class="badge badge-${video.contribution.toLowerCase()}">${video.contribution}</span>
        </td>
        <td class="px-4 py-3 text-center">
          <span class="badge badge-${video.performance.toLowerCase()}">${video.performance}</span>
        </td>
        <td class="px-4 py-3 text-right text-gray-700">${formatNumber(video.videoCount)}</td>
        <td class="px-4 py-3 text-center text-gray-700">${publishDate}</td>
      </tr>
    `;
  }).join('');

  // 체크박스 이벤트 리스너 추가
  attachCheckboxListeners();
  
  // 정렬 헤더 이벤트 리스너 추가
  attachSortListeners();

  // Phase 3: 행 클릭 시 모달 열기
  document.querySelectorAll('.video-row').forEach(row => {
    row.addEventListener('click', (e) => {
      // 체크박스 클릭은 제외
      if (e.target.classList.contains('video-select') || e.target.type === 'checkbox') {
        return;
      }
      
      const videoId = row.dataset.videoId;
      const video = currentSearchResults.find(v => v.videoId === videoId);
      
      if (video) {
        openVideoDetailModal(video);
      }
    });
  });
}

// ========================================
// 3. 체크박스 기능
// ========================================

function attachCheckboxListeners() {
  // 개별 체크박스
  document.querySelectorAll('.video-select').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const videoId = e.target.value;
      if (e.target.checked) {
        selectedVideos.add(videoId);
      } else {
        selectedVideos.delete(videoId);
      }
      updateResultsSummary(currentSearchResults.length, selectedVideos.size);
    });
  });

  // 전체 선택/해제
  const selectAllCheckbox = document.getElementById('select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('.video-select');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        const videoId = cb.value;
        if (e.target.checked) {
          selectedVideos.add(videoId);
        } else {
          selectedVideos.delete(videoId);
        }
      });
      updateResultsSummary(currentSearchResults.length, selectedVideos.size);
    });
  }
}

function attachSortListeners() {
  // 제목 정렬
  document.querySelector('.col-title')?.addEventListener('click', () => handleSort('title'));
  
  // 조회수 정렬
  document.querySelector('.col-views')?.addEventListener('click', () => handleSort('views'));
  
  // 게시일 정렬
  document.querySelector('.col-date')?.addEventListener('click', () => handleSort('date'));
  
  console.log('✅ 정렬 헤더 이벤트 리스너 등록');
}

// ========================================
// 4. 결과 요약 업데이트
// ========================================

function updateResultsSummary(total, selected) {
  const selectedCountEl = document.getElementById('selected-count');
  if (selectedCountEl) {
    selectedCountEl.textContent = selected;
  }

  // 총 개수 업데이트
  const totalCountEl = document.querySelector('.results-summary strong:first-child');
  if (totalCountEl) {
    totalCountEl.textContent = formatNumber(total);
  }
}

// ========================================
// 5. 유틸리티 함수
// ========================================

function formatNumber(num) {
  return new Intl.NumberFormat('ko-KR').format(num);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showLoading(show) {
  const loadingSection = document.getElementById('loading-section');
  if (loadingSection) {
    loadingSection.classList.toggle('hidden', !show);
  }
}

// ========================================
// 6. 선택 해제 버튼
// ========================================

function handleClearSelection() {
  selectedVideos.clear();
  document.querySelectorAll('.video-select').forEach(cb => {
    cb.checked = false;
  });
  const selectAllCheckbox = document.getElementById('select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
  }
  updateResultsSummary(currentSearchResults.length, 0);
}

// ========================================
// 7. AI 분석 시작 버튼 (Phase 2 Week 3 연동)
// ========================================

async function handleAnalyzeSelected() {
  if (selectedVideos.size === 0) {
    alert('분석할 영상을 선택해주세요.');
    return;
  }

  const videoIds = Array.from(selectedVideos);
  console.log('🚀 AI 분석 시작:', videoIds);

  // 확인 메시지
  const confirm = window.confirm(
    `선택한 ${videoIds.length}개 영상을 AI 분석하시겠습니까?\n` +
    `소모 크레딧: ${videoIds.length * 10} 크레딧`
  );

  if (!confirm) {
    return;
  }

  // 로딩 상태 표시
  showLoading(true);
  
  const analyzeSelectedBtn = document.getElementById('analyze-selected-btn');
  if (analyzeSelectedBtn) {
    analyzeSelectedBtn.disabled = true;
    analyzeSelectedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>분석 중...</span>';
  }

  try {
    // 각 영상별로 순차 분석
    const results = [];
    
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      const video = currentSearchResults.find(v => v.videoId === videoId);
      
      if (!video) continue;

      console.log(`📊 [${i + 1}/${videoIds.length}] 분석 중: ${video.title}`);

      // YouTube URL 생성
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // API 호출 (기존 /api/youtube/analyze 활용)
      const response = await fetch('/api/youtube/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
        },
        body: JSON.stringify({
          videoUrl,
          analysisType: 'video-stats' // 기본 분석 타입
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        results.push({
          videoId,
          title: video.title,
          success: true,
          data: result.data
        });
        console.log(`✅ [${i + 1}/${videoIds.length}] 분석 완료`);
      } else {
        results.push({
          videoId,
          title: video.title,
          success: false,
          error: result.error?.message || '분석 실패'
        });
        console.error(`❌ [${i + 1}/${videoIds.length}] 분석 실패:`, result.error);
      }

      // 다음 요청 전 0.5초 대기 (API 부하 방지)
      if (i < videoIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 결과 표시
    showAnalysisResults(results);

  } catch (error) {
    console.error('❌ AI 분석 오류:', error);
    alert(`분석 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    showLoading(false);
    
    if (analyzeSelectedBtn) {
      analyzeSelectedBtn.disabled = false;
      analyzeSelectedBtn.innerHTML = '<i class="fas fa-bolt"></i> <span>선택한 영상 AI 분석 시작 (10 크레딧)</span>';
    }
  }
}

function showAnalysisResults(results) {
  const resultSection = document.getElementById('result-section');
  
  if (!resultSection) {
    console.error('❌ result-section 요소를 찾을 수 없습니다');
    return;
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  resultSection.innerHTML = `
    <div class="p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-gray-900">
          <i class="fas fa-check-circle text-green-600 mr-2"></i>
          AI 분석 완료
        </h2>
        <button onclick="document.getElementById('result-section').classList.add('hidden')" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <div class="mb-6 flex gap-4">
        <div class="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <span class="text-green-700 font-semibold">성공: ${successCount}개</span>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <span class="text-red-700 font-semibold">실패: ${failCount}개</span>
        </div>
      </div>

      <div class="space-y-4 max-h-96 overflow-y-auto">
        ${results.map(result => {
          if (result.success) {
            const data = result.data;
            return `
              <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div class="flex items-start gap-4">
                  <i class="fas fa-check-circle text-2xl text-green-600 mt-1"></i>
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-900 mb-2">${escapeHtml(result.title)}</h3>
                    <div class="text-sm text-gray-600 space-y-1">
                      <p><strong>조회수:</strong> ${formatNumber(data.videoInfo.views)}</p>
                      <p><strong>좋아요:</strong> ${formatNumber(data.videoInfo.likes)}</p>
                      <p><strong>댓글:</strong> ${formatNumber(data.videoInfo.comments)}</p>
                      ${data.wasCached ? '<span class="text-green-600">💾 캐시 히트 (0 크레딧)</span>' : '<span class="text-blue-600">⚡ 새 분석 (10 크레딧)</span>'}
                    </div>
                    <div class="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                      ${data.aiSummary.substring(0, 200)}...
                    </div>
                  </div>
                </div>
              </div>
            `;
          } else {
            return `
              <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-start gap-4">
                  <i class="fas fa-times-circle text-2xl text-red-600 mt-1"></i>
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-900 mb-2">${escapeHtml(result.title)}</h3>
                    <p class="text-sm text-red-600">${result.error}</p>
                  </div>
                </div>
              </div>
            `;
          }
        }).join('')}
      </div>
    </div>
  `;

  resultSection.classList.remove('hidden');
  
  // 결과 영역으로 스크롤
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ========================================
// 8. 이벤트 리스너 등록
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ [YouTube Finder] DOMContentLoaded');

  // 검색 버튼
  const searchButton = document.getElementById('search-button');
  if (searchButton) {
    searchButton.addEventListener('click', handleSearch);
    console.log('✅ 검색 버튼 이벤트 리스너 등록');
  }

  // Enter 키 검색
  const searchInput = document.getElementById('video-search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }

  // 선택 해제 버튼
  const clearSelectionBtn = document.getElementById('clear-selection-btn');
  if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', handleClearSelection);
  }

  // AI 분석 시작 버튼
  const analyzeSelectedBtn = document.getElementById('analyze-selected-btn');
  if (analyzeSelectedBtn) {
    analyzeSelectedBtn.addEventListener('click', handleAnalyzeSelected);
  }

  // 필터 변경 이벤트 (Phase 2 Week 3)
  document.querySelectorAll('select[class*="filter-select-inline"]').forEach(select => {
    select.addEventListener('change', () => {
      console.log('🔍 필터 변경:', select.value);
      applyFilters();
    });
  });

  // 성과도 체크박스 이벤트
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox, index) => {
    if (index >= 1 && index <= 3) { // Great, Good, Normal
      checkbox.addEventListener('change', () => {
        console.log('🔍 성과도 필터 변경');
        applyFilters();
      });
    }
  });

  // 필터 초기화 버튼
  document.querySelector('.filter-bar button')?.addEventListener('click', () => {
    console.log('🔄 필터 초기화');
    
    // 드롭다운 초기화
    document.querySelectorAll('select[class*="filter-select-inline"]').forEach(select => {
      select.selectedIndex = 0;
    });
    
    // 체크박스 초기화
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox, index) => {
      if (index >= 1 && index <= 3) {
        checkbox.checked = true;
      }
    });
    
    // 필터 재적용
    applyFilters();
  });

  // Phase 3: 모달 닫기 이벤트
  const closeModalBtn = document.getElementById('close-modal-btn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeVideoDetailModal);
  }

  // 모달 외부 클릭 시 닫기
  const modal = document.getElementById('video-detail-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeVideoDetailModal();
      }
    });
  }

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeVideoDetailModal();
    }
  });

  console.log('✅ [YouTube Finder] 모든 이벤트 리스너 등록 완료');
});

// ========================================
// Phase 3: 페이지네이션 (무한 스크롤)
// ========================================

// 더 보기 버튼 업데이트
function updateLoadMoreButton() {
  const loadMoreContainer = document.getElementById('load-more-container');
  if (!loadMoreContainer) return;

  if (hasMoreResults && nextPageToken) {
    loadMoreContainer.innerHTML = `
      <button 
        id="load-more-btn" 
        class="load-more-btn"
        style="padding: 12px 24px; background: #00B87D; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
        onmouseover="this.style.background='#00a06f'" 
        onmouseout="this.style.background='#00B87D'"
      >
        <i class="fas fa-chevron-down" style="margin-right: 8px;"></i>
        더 보기 (20개 추가 로드)
      </button>
    `;
    
    // 이벤트 리스너 등록
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', handleLoadMore);
    }
  } else {
    loadMoreContainer.innerHTML = '';
  }
}

// 더 보기 핸들러
async function handleLoadMore() {
  if (isLoadingMore || !nextPageToken) return;

  console.log('📄 더 보기 시작:', nextPageToken);

  isLoadingMore = true;

  // 버튼 비활성화
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerHTML = `
      <i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>
      로딩 중...
    `;
  }

  try {
    // YouTube API 호출
    const response = await fetch('/api/youtube/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
      },
      body: JSON.stringify({ 
        keyword: currentKeyword, 
        maxResults: 20,
        pageToken: nextPageToken
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || '더 보기 실패');
    }

    console.log('✅ 더 보기 완료:', result.data.videos.length, '개');

    // 페이지네이션 정보 업데이트
    nextPageToken = result.data.nextPageToken;
    hasMoreResults = result.data.hasMore;

    // 결과 추가 (기존 결과 + 새 결과)
    allSearchResults = [...allSearchResults, ...result.data.videos];
    
    // 필터 재적용
    applyFilters();

    // "더 보기" 버튼 업데이트
    updateLoadMoreButton();

  } catch (error) {
    console.error('❌ 더 보기 오류:', error);
    alert(`더 보기 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    isLoadingMore = false;
  }
}

// ========================================
// Phase 3: 영상 상세 모달
// ========================================

// 모달 열기
function openVideoDetailModal(video) {
  console.log('📺 모달 열기:', video.title);

  const modal = document.getElementById('video-detail-modal');
  const modalContent = document.getElementById('modal-content');

  if (!modal || !modalContent) return;

  // 성과도 배지 색상
  const performanceBadgeClass = {
    'Great': 'bg-green-100 text-green-700 border-green-300',
    'Good': 'bg-blue-100 text-blue-700 border-blue-300',
    'Normal': 'bg-gray-100 text-gray-700 border-gray-300'
  }[video.performance] || 'bg-gray-100 text-gray-700';

  // 기여도 배지 색상
  const contributionBadgeClass = {
    'Great': 'bg-green-100 text-green-700 border-green-300',
    'Good': 'bg-blue-100 text-blue-700 border-blue-300',
    'Normal': 'bg-gray-100 text-gray-700 border-gray-300'
  }[video.contribution] || 'bg-gray-100 text-gray-700';

  // 게시일 포맷
  const publishDate = new Date(video.publishedAt).toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\. /g, '.').replace(/\.$/, '');

  // 모달 콘텐츠 생성
  modalContent.innerHTML = `
    <!-- 썸네일 -->
    <div class="relative rounded-xl overflow-hidden mb-6">
      <img 
        src="${video.thumbnailUrl}" 
        alt="${video.title}"
        class="w-full h-auto"
        style="max-height: 400px; object-fit: cover;"
      />
      <div class="absolute top-4 right-4 flex gap-2">
        <span class="px-3 py-1 ${performanceBadgeClass} rounded-full text-xs font-semibold border">
          ${video.performance}
        </span>
        <span class="px-3 py-1 ${contributionBadgeClass} rounded-full text-xs font-semibold border">
          ${video.contribution}
        </span>
      </div>
    </div>

    <!-- 제목 및 채널 정보 -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-3">${video.title}</h2>
      <div class="flex items-center gap-3 text-gray-600">
        <div class="flex items-center gap-2">
          <i class="fas fa-tv text-gray-400"></i>
          <span class="font-semibold">${video.channel}</span>
        </div>
        <span class="text-gray-300">•</span>
        <div class="flex items-center gap-1">
          <i class="fas fa-users text-gray-400"></i>
          <span>${formatNumber(video.subscriberCount)} 구독자</span>
        </div>
        <span class="text-gray-300">•</span>
        <div class="flex items-center gap-1">
          <i class="fas fa-video text-gray-400"></i>
          <span>${formatNumber(video.videoCount)}개 영상</span>
        </div>
      </div>
    </div>

    <!-- 통계 정보 -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-gray-50 rounded-lg p-4 text-center">
        <div class="text-gray-500 text-sm mb-1">조회수</div>
        <div class="text-xl font-bold text-gray-900">${formatNumber(video.views)}</div>
      </div>
      <div class="bg-gray-50 rounded-lg p-4 text-center">
        <div class="text-gray-500 text-sm mb-1">좋아요</div>
        <div class="text-xl font-bold text-gray-900">${formatNumber(video.likes)}</div>
      </div>
      <div class="bg-gray-50 rounded-lg p-4 text-center">
        <div class="text-gray-500 text-sm mb-1">게시일</div>
        <div class="text-xl font-bold text-gray-900">${publishDate}</div>
      </div>
    </div>

    <!-- 액션 버튼 -->
    <div class="flex gap-3">
      <a 
        href="https://www.youtube.com/watch?v=${video.videoId}" 
        target="_blank"
        class="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
      >
        <i class="fab fa-youtube"></i>
        YouTube에서 보기
      </a>
      <button 
        onclick="handleAnalyzeSingleVideo('${video.videoId}')"
        class="flex-1 px-6 py-3 hover:bg-green-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
        style="background: #00B87D;"
      >
        <i class="fas fa-bolt"></i>
        AI 분석 시작 (10 크레딧)
      </button>
    </div>
  `;

  // 모달 표시
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
}

// 모달 닫기
function closeVideoDetailModal() {
  const modal = document.getElementById('video-detail-modal');
  if (!modal) return;

  modal.classList.add('hidden');
  document.body.style.overflow = ''; // 배경 스크롤 복원
}

// 단일 영상 분석
async function handleAnalyzeSingleVideo(videoId) {
  console.log('🎬 단일 영상 분석:', videoId);
  
  // 모달 닫기
  closeVideoDetailModal();
  
  // 해당 영상만 선택
  selectedVideos.clear();
  selectedVideos.add(videoId);
  
  // AI 분석 시작
  await handleAnalyzeSelected();
}

// 숫자 포맷팅 헬퍼
function formatNumber(num) {
  if (num >= 10000000) {
    return (num / 10000000).toFixed(1) + '천만';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + '백만';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(1) + '만';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

// ========================================
// Phase 3: 채널 분석
// ========================================

// 채널 분석 실행
async function handleChannelAnalysis() {
  const channelInput = document.getElementById('channel-search-input');
  const channelIdOrUrl = channelInput?.value.trim();

  if (!channelIdOrUrl) {
    alert('채널 URL 또는 ID를 입력해주세요.');
    return;
  }

  console.log('📺 채널 분석 시작:', channelIdOrUrl);

  // 로딩 표시
  showChannelLoading(true);
  hideChannelResults();

  try {
    // API 호출
    const response = await fetch('/api/youtube/channel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
      },
      body: JSON.stringify({ channelIdOrUrl })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || '채널 분석 실패');
    }

    console.log('✅ 채널 분석 완료:', result.data);

    // 결과 표시
    displayChannelInfo(result.data.channel);
    displayTopVideos(result.data.topVideos);

  } catch (error) {
    console.error('❌ 채널 분석 오류:', error);
    alert(`채널 분석 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    showChannelLoading(false);
  }
}

// 로딩 표시
function showChannelLoading(show) {
  const loading = document.getElementById('channel-loading');
  if (!loading) return;
  
  if (show) {
    loading.classList.remove('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

// 결과 숨기기
function hideChannelResults() {
  document.getElementById('channel-info-card')?.classList.add('hidden');
  document.getElementById('channel-top-videos')?.classList.add('hidden');
}

// 채널 정보 표시
function displayChannelInfo(channel) {
  const card = document.getElementById('channel-info-card');
  if (!card) return;

  const createdDate = new Date(channel.publishedAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const averageViews = channel.videoCount > 0 
    ? Math.floor(channel.viewCount / channel.videoCount) 
    : 0;

  card.innerHTML = `
    <div class="flex gap-6">
      <!-- 채널 썸네일 -->
      <div class="flex-shrink-0">
        <img 
          src="${channel.thumbnailUrl}" 
          alt="${channel.channelTitle}"
          class="w-32 h-32 rounded-full border-4 border-green-100"
        />
      </div>

      <!-- 채널 정보 -->
      <div class="flex-1">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          ${channel.channelTitle}
          ${channel.customUrl ? `<span class="text-sm font-normal text-gray-500 ml-2">${channel.customUrl}</span>` : ''}
        </h2>
        
        <p class="text-gray-600 mb-4 line-clamp-2">${channel.description || '채널 설명이 없습니다.'}</p>

        <!-- 통계 -->
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-green-50 rounded-lg p-4 border border-green-100">
            <div class="text-green-600 text-sm mb-1">구독자</div>
            <div class="text-2xl font-bold text-gray-900">${formatNumber(channel.subscriberCount)}</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div class="text-blue-600 text-sm mb-1">총 영상</div>
            <div class="text-2xl font-bold text-gray-900">${formatNumber(channel.videoCount)}개</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div class="text-purple-600 text-sm mb-1">총 조회수</div>
            <div class="text-2xl font-bold text-gray-900">${formatNumber(channel.viewCount)}</div>
          </div>
          <div class="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div class="text-orange-600 text-sm mb-1">평균 조회수</div>
            <div class="text-2xl font-bold text-gray-900">${formatNumber(averageViews)}</div>
          </div>
        </div>

        <div class="mt-4 flex gap-3">
          <a 
            href="https://www.youtube.com/channel/${channel.channelId}" 
            target="_blank"
            class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
          >
            <i class="fab fa-youtube"></i>
            채널 방문
          </a>
          <div class="text-sm text-gray-500 flex items-center">
            <i class="fas fa-calendar-alt mr-2"></i>
            개설일: ${createdDate}
          </div>
        </div>
      </div>
    </div>
  `;

  card.classList.remove('hidden');
}

// 인기 영상 TOP 10 표시
function displayTopVideos(videos) {
  const container = document.getElementById('channel-top-videos');
  const tbody = document.getElementById('channel-videos-body');
  
  if (!container || !tbody) return;

  tbody.innerHTML = videos.map((video, index) => {
    const publishDate = new Date(video.publishedAt).toLocaleDateString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '');

    return `
      <tr class="border-b hover:bg-gray-50 transition">
        <td class="px-4 py-3 text-center font-bold text-lg" style="color: ${index < 3 ? '#00B87D' : '#6b7280'}">
          ${index + 1}
        </td>
        <td class="px-4 py-3">
          <img 
            src="${video.thumbnailUrl}" 
            alt="썸네일"
            class="w-24 h-14 object-cover rounded cursor-pointer hover:opacity-80 transition"
            onclick="window.open('https://www.youtube.com/watch?v=${video.videoId}', '_blank')"
          />
        </td>
        <td class="px-4 py-3">
          <a 
            href="https://www.youtube.com/watch?v=${video.videoId}" 
            target="_blank"
            class="font-medium text-gray-900 hover:text-green-600 line-clamp-2 transition"
          >
            ${escapeHtml(video.title)}
          </a>
        </td>
        <td class="px-4 py-3 text-right font-semibold text-gray-900">${formatNumber(video.views)}</td>
        <td class="px-4 py-3 text-right text-gray-700">${formatNumber(video.likes)}</td>
        <td class="px-4 py-3 text-center text-gray-700">${publishDate}</td>
        <td class="px-4 py-3 text-center">
          <a 
            href="https://www.youtube.com/watch?v=${video.videoId}" 
            target="_blank"
            class="inline-flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
            style="background: #00B87D;"
            onmouseover="this.style.background='#00a06f'" 
            onmouseout="this.style.background='#00B87D'"
          >
            <i class="fab fa-youtube"></i>
            보기
          </a>
        </td>
      </tr>
    `;
  }).join('');

  container.classList.remove('hidden');
}

// DOMContentLoaded에 채널 검색 버튼 이벤트 추가
document.addEventListener('DOMContentLoaded', () => {
  const channelSearchBtn = document.getElementById('channel-search-button');
  if (channelSearchBtn) {
    channelSearchBtn.addEventListener('click', handleChannelAnalysis);
  }

  // Enter 키로 채널 검색
  const channelInput = document.getElementById('channel-search-input');
  if (channelInput) {
    channelInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleChannelAnalysis();
      }
    });
  }
});

// ========================================
// Phase 4: 콘텐츠 전략 AI
// ========================================

// 분석된 영상 데이터 저장소 (LocalStorage 활용)
let analyzedVideosData = [];

// 페이지 로드 시 분석된 영상 수 표시
function updateAnalyzedCount() {
  // LocalStorage에서 분석 히스토리 읽기
  const historyData = JSON.parse(localStorage.getItem('youtube_analysis_history') || '[]');
  analyzedVideosData = historyData.slice(0, 20); // 최대 20개
  
  const countElement = document.getElementById('analyzed-count');
  if (countElement) {
    countElement.textContent = `${analyzedVideosData.length}개`;
  }
  
  // 버튼 활성화/비활성화
  const generateBtn = document.getElementById('generate-strategy-btn');
  if (generateBtn) {
    if (analyzedVideosData.length < 3) {
      generateBtn.disabled = true;
      generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
      generateBtn.innerHTML = `
        <i class="fas fa-lock"></i>
        <span>최소 3개 영상 분석 필요</span>
      `;
    } else {
      generateBtn.disabled = false;
      generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      generateBtn.innerHTML = `
        <i class="fas fa-magic"></i>
        <span>AI 전략 생성하기 (${analyzedVideosData.length}개 영상 분석 데이터 활용)</span>
      `;
    }
  }
}

// 콘텐츠 전략 생성
async function handleGenerateStrategy() {
  if (analyzedVideosData.length < 3) {
    alert('최소 3개 이상의 영상을 분석한 후 이용하세요.\n\n영상 분석 탭에서 영상을 선택하고 AI 분석을 실행하세요.');
    return;
  }

  const goalSelect = document.getElementById('strategy-goal');
  const goal = goalSelect?.value || 'views';

  console.log('🎯 전략 생성 시작:', { goal, videoCount: analyzedVideosData.length });

  // 로딩 표시
  showStrategyLoading(true);
  hideStrategyResults();

  try {
    // API 호출
    const response = await fetch('/api/youtube/strategy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
      },
      body: JSON.stringify({
        goal,
        analyzedVideos: analyzedVideosData
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || '전략 생성 실패');
    }

    console.log('✅ 전략 생성 완료:', result.data);

    // 결과 표시
    displayStrategyResults(result.data);

  } catch (error) {
    console.error('❌ 전략 생성 오류:', error);
    alert(`전략 생성 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    showStrategyLoading(false);
  }
}

// 로딩 표시
function showStrategyLoading(show) {
  const loading = document.getElementById('strategy-loading');
  if (!loading) return;
  
  if (show) {
    loading.classList.remove('hidden');
  } else {
    loading.classList.add('hidden');
  }
}

// 결과 숨기기
function hideStrategyResults() {
  document.getElementById('strategy-results')?.classList.add('hidden');
}

// 전략 결과 표시
function displayStrategyResults(data) {
  const resultsContainer = document.getElementById('strategy-results');
  if (!resultsContainer) return;

  // 1. 트렌드 분석
  const trendAnalysis = document.getElementById('trend-analysis');
  if (trendAnalysis && data.trends) {
    trendAnalysis.innerHTML = `
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <i class="fas fa-hashtag text-green-600"></i>
            공통 키워드
          </h4>
          <div class="flex flex-wrap gap-2">
            ${data.trends.commonKeywords.map(keyword => `
              <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">${keyword}</span>
            `).join('')}
          </div>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <i class="fas fa-star text-blue-600"></i>
            성공 패턴
          </h4>
          <ul class="space-y-1">
            ${data.trends.successPatterns.map(pattern => `
              <li class="text-sm text-gray-700 flex items-start gap-2">
                <i class="fas fa-check text-blue-600 mt-1"></i>
                <span>${pattern}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <i class="fas fa-clock text-orange-600"></i>
            최적 게시 시간
          </h4>
          <p class="text-2xl font-bold text-orange-600">${data.trends.bestPublishTime}</p>
        </div>
      </div>
    `;
  }

  // 2. 콘텐츠 제안
  const contentSuggestions = document.getElementById('content-suggestions');
  if (contentSuggestions && data.contentSuggestions) {
    contentSuggestions.innerHTML = `
      <div class="space-y-4">
        ${data.contentSuggestions.map((suggestion, index) => `
          <div class="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
                ${index + 1}
              </div>
              <div class="flex-1">
                <h5 class="font-bold text-gray-900 mb-2">${suggestion.title}</h5>
                <p class="text-sm text-gray-600 mb-2">${suggestion.description}</p>
                <div class="flex items-center gap-4 text-sm">
                  <div class="flex items-center gap-1">
                    <i class="fas fa-hashtag text-gray-400"></i>
                    <span class="text-gray-600">${suggestion.keywords.join(', ')}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <i class="fas fa-eye text-gray-400"></i>
                    <span class="text-gray-600">${suggestion.estimatedViews}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 3. 실행 전략
  const actionPlan = document.getElementById('action-plan');
  if (actionPlan && data.actionPlan) {
    actionPlan.innerHTML = `
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-bolt text-red-600"></i>
            즉시 실행 (Today)
          </h4>
          <ul class="space-y-2">
            ${data.actionPlan.immediate.map(item => `
              <li class="text-sm text-gray-700 flex items-start gap-2">
                <i class="fas fa-chevron-right text-red-600 mt-1 text-xs"></i>
                <span>${item}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-calendar-week text-yellow-600"></i>
            단기 전략 (1-2주)
          </h4>
          <ul class="space-y-2">
            ${data.actionPlan.shortTerm.map(item => `
              <li class="text-sm text-gray-700 flex items-start gap-2">
                <i class="fas fa-chevron-right text-yellow-600 mt-1 text-xs"></i>
                <span>${item}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-calendar-alt text-purple-600"></i>
            장기 전략 (1-3개월)
          </h4>
          <ul class="space-y-2">
            ${data.actionPlan.longTerm.map(item => `
              <li class="text-sm text-gray-700 flex items-start gap-2">
                <i class="fas fa-chevron-right text-purple-600 mt-1 text-xs"></i>
                <span>${item}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  resultsContainer.classList.remove('hidden');
}

// DOMContentLoaded에 이벤트 추가
document.addEventListener('DOMContentLoaded', () => {
  // 전략 생성 버튼
  const generateStrategyBtn = document.getElementById('generate-strategy-btn');
  if (generateStrategyBtn) {
    generateStrategyBtn.addEventListener('click', handleGenerateStrategy);
  }

  // 탭 전환 시 분석 개수 업데이트
  document.querySelectorAll('.subnav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      if (tab === 'content-strategy') {
        updateAnalyzedCount();
      }
    });
  });
});

// ==============================
// Phase 4: 내 채널 관리 (즐겨찾기 채널)
// ==============================

/**
 * 즐겨찾기 채널 목록 불러오기
 */
async function loadFavoriteChannels() {
  const token = localStorage.getItem('postflow_token');
  if (!token) {
    showChannelsEmpty();
    return;
  }

  const loadingEl = document.getElementById('channels-loading');
  const emptyEl = document.getElementById('channels-empty');
  const gridEl = document.getElementById('channels-grid');

  // 로딩 표시
  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  gridEl.classList.add('hidden');

  try {
    const response = await fetch('/api/channels/favorite', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || '채널 목록 조회 실패');
    }

    const channels = result.data || [];

    if (channels.length === 0) {
      showChannelsEmpty();
      return;
    }

    // 채널 카드 렌더링
    renderChannelCards(channels);

  } catch (error) {
    console.error('❌ [Load Channels Error]', error);
    alert('채널 목록 불러오기 실패: ' + error.message);
    showChannelsEmpty();
  } finally {
    loadingEl.classList.add('hidden');
  }
}

/**
 * 빈 상태 표시
 */
function showChannelsEmpty() {
  document.getElementById('channels-loading').classList.add('hidden');
  document.getElementById('channels-empty').classList.remove('hidden');
  document.getElementById('channels-grid').classList.add('hidden');
}

/**
 * 채널 카드 렌더링
 */
function renderChannelCards(channels) {
  const gridEl = document.getElementById('channels-grid');
  gridEl.innerHTML = channels.map(channel => `
    <div class="bg-white rounded-xl shadow-md hover:shadow-xl transition p-6" data-channel-id="${channel.channel_id}">
      <!-- 채널 썸네일 -->
      <div class="flex items-center gap-4 mb-4">
        <img 
          src="${channel.channel_thumbnail || '/static/placeholder-channel.png'}" 
          alt="${escapeHtml(channel.channel_name)}" 
          class="w-16 h-16 rounded-full object-cover"
        />
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-lg text-gray-800 truncate">${escapeHtml(channel.channel_name)}</h3>
          <p class="text-sm text-gray-500">
            <i class="fas fa-calendar-alt mr-1"></i>
            추가: ${new Date(channel.added_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>

      <!-- 통계 -->
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="text-center bg-red-50 rounded-lg py-2">
          <div class="text-xs text-gray-600 mb-1">구독자</div>
          <div class="font-bold text-red-600">${formatNumber(channel.subscriber_count)}</div>
        </div>
        <div class="text-center bg-blue-50 rounded-lg py-2">
          <div class="text-xs text-gray-600 mb-1">영상</div>
          <div class="font-bold text-blue-600">${formatNumber(channel.total_videos)}</div>
        </div>
        <div class="text-center bg-green-50 rounded-lg py-2">
          <div class="text-xs text-gray-600 mb-1">조회수</div>
          <div class="font-bold text-green-600">${formatNumber(channel.total_views)}</div>
        </div>
      </div>

      <!-- 액션 버튼 -->
      <div class="flex gap-2">
        <button 
          class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition"
          onclick="openChannelDetail('${channel.channel_id}')"
        >
          <i class="fas fa-chart-line mr-1"></i>
          상세 보기
        </button>
        <button 
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition"
          onclick="refreshChannel('${channel.channel_id}')"
          title="데이터 갱신"
        >
          <i class="fas fa-sync-alt"></i>
        </button>
        <button 
          class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-semibold rounded-lg transition"
          onclick="deleteChannel('${channel.channel_id}', '${escapeHtml(channel.channel_name)}')"
          title="삭제"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  document.getElementById('channels-loading').classList.add('hidden');
  document.getElementById('channels-empty').classList.add('hidden');
  gridEl.classList.remove('hidden');
}

/**
 * 채널 추가
 */
async function handleAddChannel() {
  const token = localStorage.getItem('postflow_token');
  if (!token) {
    alert('로그인이 필요합니다.');
    return;
  }

  const input = document.getElementById('channel-input');
  const channelInput = input.value.trim();

  if (!channelInput) {
    alert('채널 URL 또는 ID를 입력해주세요.');
    return;
  }

  const btn = document.getElementById('add-channel-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>추가 중...';

  try {
    const response = await fetch('/api/channels/favorite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ channelInput })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || '채널 추가 실패');
    }

    alert('✅ 채널이 즐겨찾기에 추가되었습니다!');
    input.value = '';
    loadFavoriteChannels(); // 목록 새로고침

  } catch (error) {
    console.error('❌ [Add Channel Error]', error);
    alert('채널 추가 실패: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

/**
 * 채널 삭제
 */
async function deleteChannel(channelId, channelName) {
  if (!confirm(`"${channelName}" 채널을 즐겨찾기에서 삭제하시겠습니까?`)) {
    return;
  }

  const token = localStorage.getItem('postflow_token');

  try {
    const response = await fetch(`/api/channels/favorite/${channelId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || '삭제 실패');
    }

    alert('✅ 채널이 삭제되었습니다.');
    loadFavoriteChannels(); // 목록 새로고침

  } catch (error) {
    console.error('❌ [Delete Channel Error]', error);
    alert('채널 삭제 실패: ' + error.message);
  }
}

/**
 * 채널 데이터 갱신
 */
async function refreshChannel(channelId) {
  const token = localStorage.getItem('postflow_token');

  try {
    const response = await fetch(`/api/channels/refresh/${channelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || '갱신 실패');
    }

    alert('✅ 채널 데이터가 갱신되었습니다!');
    loadFavoriteChannels(); // 목록 새로고침

  } catch (error) {
    console.error('❌ [Refresh Channel Error]', error);
    alert('채널 갱신 실패: ' + error.message);
  }
}

/**
 * 채널 상세 모달 열기
 */
let currentChannelChart = null; // Chart.js 인스턴스 저장
let currentChannelData = null; // 현재 채널 데이터 저장

async function openChannelDetail(channelId) {
  const token = localStorage.getItem('postflow_token');
  if (!token) {
    alert('로그인이 필요합니다.');
    return;
  }

  const modal = document.getElementById('channel-detail-modal');
  const loading = document.getElementById('channel-modal-loading');
  const dataDiv = document.getElementById('channel-modal-data');

  // 모달 열기
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // 로딩 표시
  loading.classList.remove('hidden');
  dataDiv.classList.add('hidden');

  try {
    // 1. 즐겨찾기 목록에서 채널 정보 조회
    const favResponse = await fetch('/api/channels/favorite', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const favResult = await favResponse.json();
    
    if (!favResult.success) {
      throw new Error('채널 정보 조회 실패');
    }

    const channel = favResult.data.find(c => c.channel_id === channelId);
    if (!channel) {
      throw new Error('채널을 찾을 수 없습니다.');
    }

    currentChannelData = channel;

    // 2. 채널 정보 표시
    document.getElementById('channel-modal-thumbnail').src = channel.channel_thumbnail || '/static/placeholder-channel.png';
    document.getElementById('channel-modal-thumbnail').alt = channel.channel_name;
    document.getElementById('channel-modal-name').textContent = channel.channel_name;
    document.getElementById('channel-modal-description').textContent = channel.channel_description || '설명 없음';
    document.getElementById('channel-modal-subscribers').textContent = formatNumber(channel.subscriber_count);
    document.getElementById('channel-modal-videos').textContent = formatNumber(channel.total_videos);
    document.getElementById('channel-modal-views').textContent = formatNumber(channel.total_views);

    // 3. 기본 7일 차트 로드
    await loadChannelChart(channelId, 7);

    // 로딩 숨기고 데이터 표시
    loading.classList.add('hidden');
    dataDiv.classList.remove('hidden');

  } catch (error) {
    console.error('❌ [Open Channel Detail Error]', error);
    alert('채널 상세 정보 불러오기 실패: ' + error.message);
    closeChannelDetailModal();
  }
}

/**
 * 채널 차트 로드
 */
async function loadChannelChart(channelId, days = 7) {
  const token = localStorage.getItem('postflow_token');

  try {
    // 스냅샷 조회
    const response = await fetch(`/api/channels/snapshots/${channelId}?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error('스냅샷 조회 실패');
    }

    const snapshots = result.data || [];

    if (snapshots.length === 0) {
      // 데이터 없음
      const canvas = document.getElementById('channel-growth-chart');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#9CA3AF';
      ctx.textAlign = 'center';
      ctx.fillText('데이터가 충분하지 않습니다. 시간이 지나면 차트가 표시됩니다.', canvas.width / 2, canvas.height / 2);
      return;
    }

    // 날짜 라벨 및 데이터
    const labels = snapshots.map(s => {
      const date = new Date(s.snapshot_date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const subscriberData = snapshots.map(s => s.subscriber_count);
    const viewsData = snapshots.map(s => s.total_views);

    // 기존 차트 제거
    if (currentChannelChart) {
      currentChannelChart.destroy();
    }

    // Chart.js 차트 생성
    const ctx = document.getElementById('channel-growth-chart').getContext('2d');
    currentChannelChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '구독자 수',
            data: subscriberData,
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: '총 조회수',
            data: viewsData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += formatNumber(context.parsed.y);
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '구독자 수'
            },
            ticks: {
              callback: function(value) {
                return formatNumber(value);
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '총 조회수'
            },
            ticks: {
              callback: function(value) {
                return formatNumber(value);
              }
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });

    // 증가율 계산 및 표시
    if (snapshots.length >= 2) {
      const firstSnapshot = snapshots[0];
      const lastSnapshot = snapshots[snapshots.length - 1];

      const subscriberGrowth = lastSnapshot.subscriber_count - firstSnapshot.subscriber_count;
      const subscriberGrowthRate = ((subscriberGrowth / firstSnapshot.subscriber_count) * 100).toFixed(2);

      const viewsGrowth = lastSnapshot.total_views - firstSnapshot.total_views;
      const viewsGrowthRate = ((viewsGrowth / firstSnapshot.total_views) * 100).toFixed(2);

      const videosGrowth = lastSnapshot.total_videos - firstSnapshot.total_videos;

      const summaryDiv = document.getElementById('channel-growth-summary');
      summaryDiv.innerHTML = `
        <div class="bg-red-50 rounded-lg p-4 text-center">
          <div class="text-sm text-gray-600 mb-1">구독자 증가</div>
          <div class="text-2xl font-bold text-red-600">${subscriberGrowth > 0 ? '+' : ''}${formatNumber(subscriberGrowth)}</div>
          <div class="text-xs text-gray-500 mt-1">${subscriberGrowthRate > 0 ? '+' : ''}${subscriberGrowthRate}%</div>
        </div>
        <div class="bg-green-50 rounded-lg p-4 text-center">
          <div class="text-sm text-gray-600 mb-1">조회수 증가</div>
          <div class="text-2xl font-bold text-green-600">${viewsGrowth > 0 ? '+' : ''}${formatNumber(viewsGrowth)}</div>
          <div class="text-xs text-gray-500 mt-1">${viewsGrowthRate > 0 ? '+' : ''}${viewsGrowthRate}%</div>
        </div>
        <div class="bg-blue-50 rounded-lg p-4 text-center">
          <div class="text-sm text-gray-600 mb-1">영상 증가</div>
          <div class="text-2xl font-bold text-blue-600">${videosGrowth > 0 ? '+' : ''}${formatNumber(videosGrowth)}</div>
          <div class="text-xs text-gray-500 mt-1">${days}일간</div>
        </div>
      `;
    }

  } catch (error) {
    console.error('❌ [Load Chart Error]', error);
    alert('차트 로드 실패: ' + error.message);
  }
}

/**
 * 채널 상세 모달 닫기
 */
function closeChannelDetailModal() {
  const modal = document.getElementById('channel-detail-modal');
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto';

  // 차트 정리
  if (currentChannelChart) {
    currentChannelChart.destroy();
    currentChannelChart = null;
  }

  currentChannelData = null;
}

// ==============================
// 이벤트 리스너 등록
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  // 기존 이벤트 리스너...

  // 내 채널 탭 관련
  const addChannelBtn = document.getElementById('add-channel-btn');
  if (addChannelBtn) {
    addChannelBtn.addEventListener('click', handleAddChannel);
  }

  // 탭 전환 시 즐겨찾기 목록 로드
  document.querySelectorAll('.subnav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      if (tab === 'my-channel') {
        loadFavoriteChannels();
      }
    });
  });

  // 채널 상세 모달 닫기
  const closeChannelModalBtn = document.getElementById('close-channel-modal-btn');
  if (closeChannelModalBtn) {
    closeChannelModalBtn.addEventListener('click', closeChannelDetailModal);
  }

  // 모달 배경 클릭 시 닫기
  const channelModal = document.getElementById('channel-detail-modal');
  if (channelModal) {
    channelModal.addEventListener('click', (e) => {
      if (e.target === channelModal) {
        closeChannelDetailModal();
      }
    });
  }

  // 차트 기간 버튼
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chart-period-btn')) {
      const days = parseInt(e.target.dataset.days);
      
      // 버튼 활성화 상태 변경
      document.querySelectorAll('.chart-period-btn').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
      });
      e.target.classList.remove('bg-gray-200', 'text-gray-700');
      e.target.classList.add('bg-blue-500', 'text-white');

      // 차트 다시 로드
      if (currentChannelData) {
        loadChannelChart(currentChannelData.channel_id, days);
      }
    }
  });
});
