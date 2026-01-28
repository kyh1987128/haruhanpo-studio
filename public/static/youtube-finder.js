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

// ========================================
// Phase 5A: 마켓 탐색 & 분석 (200개 수집)
// ========================================

// 마켓 탐색 전역 상태
let marketVideos = [];
let filteredMarketVideos = [];
let selectedMarketVideo = null;
let marketSortColumn = 'views';
let marketSortOrder = 'desc';

// 영상 비교 기능
let selectedCompareVideos = []; // 선택된 영상 배열 (최대 3개)
let compareChart = null; // Chart.js 인스턴스

// 북마크 기능
let bookmarkedVideos = []; // 북마크된 영상 ID 배열
let showBookmarksOnly = false; // 북마크 필터 상태

// 성과도 계산 함수
function calculatePerformance(video) {
  const views = video.statistics?.viewCount || 0;
  const subscribers = video.channelInfo?.subscriberCount || 1;
  
  // 성과도 = (조회수 / 구독자 수) × 100
  const performanceRatio = (views / subscribers) * 100;
  
  let level = 'low';
  let badge = '🔵 저조';
  let badgeClass = 'low';
  
  if (performanceRatio >= 300) {
    level = 'viral';
    badge = '🔥 떡상';
    badgeClass = 'viral';
  } else if (performanceRatio >= 100) {
    level = 'algorithm';
    badge = '🟢 알고리즘';
    badgeClass = 'algorithm';
  } else if (performanceRatio >= 50) {
    level = 'normal';
    badge = '⚪ 일반';
    badgeClass = 'normal';
  }
  
  return {
    ratio: performanceRatio.toFixed(1),
    level,
    badge,
    badgeClass
  };
}

// 200개 검색 (페이지네이션)
async function searchMarket200() {
  const searchInput = document.getElementById('market-search-input');
  const keyword = searchInput?.value.trim();
  
  if (!keyword) {
    alert('검색 키워드를 입력해주세요.');
    return;
  }
  
  console.log('🔍 [마켓 탐색] 200개 검색 시작:', keyword);
  
  // 필터 값 가져오기
  const filterOrder = document.getElementById('filter-order')?.value || 'relevance';
  const filterCategory = document.getElementById('filter-category')?.value || '';
  const filterRegion = document.getElementById('filter-region')?.value || '';
  
  console.log('🔍 [검색 필터]', { order: filterOrder, category: filterCategory, region: filterRegion });
  
  // 초기화
  marketVideos = [];
  filteredMarketVideos = [];
  selectedMarketVideo = null;
  
  // 로딩 표시
  showMarketLoading(true);
  updateResultCount(0);
  
  try {
    let pageToken = null;
    let totalCollected = 0;
    const maxResults = 200;
    const perPage = 50; // 한 번에 50개씩
    
    // 최대 4번 반복 (50 × 4 = 200)
    for (let i = 0; i < 4; i++) {
      console.log(`📥 [마켓 탐색] 페이지 ${i + 1}/4 수집 중...`);
      
      const searchBody = { 
        keyword, 
        maxResults: perPage,
        pageToken: pageToken,
        order: filterOrder
      };
      
      // 카테고리 필터 추가
      if (filterCategory) {
        searchBody.videoCategoryId = filterCategory;
      }
      
      // 국가 필터 추가
      if (filterRegion) {
        searchBody.regionCode = filterRegion;
      }
      
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
        },
        body: JSON.stringify(searchBody)
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || '검색 실패');
      }
      
      // 영상 추가
      if (result.data.videos && result.data.videos.length > 0) {
        marketVideos.push(...result.data.videos);
        totalCollected += result.data.videos.length;
        
        console.log(`✅ [마켓 탐색] ${totalCollected}개 수집 완료`);
        
        // 중간 결과 업데이트
        updateResultCount(totalCollected);
      }
      
      // 다음 페이지 토큰
      pageToken = result.data.nextPageToken;
      
      // 더 이상 결과가 없으면 중단
      if (!pageToken || !result.data.hasMore) {
        console.log('ℹ️ [마켓 탐색] 더 이상 결과 없음');
        break;
      }
      
      // 200개 도달하면 중단
      if (totalCollected >= maxResults) {
        console.log('✅ [마켓 탐색] 200개 수집 완료');
        break;
      }
    }
    
    // 성과도 계산
    marketVideos = marketVideos.map(video => ({
      ...video,
      performance: calculatePerformance(video)
    }));
    
    console.log('🎯 [마켓 탐색] 최종 수집:', marketVideos.length, '개');
    
    // 필터 적용
    applyMarketFilters();
    
  } catch (error) {
    console.error('❌ [마켓 탐색] 검색 오류:', error);
    
    // 사용자 친화적인 에러 메시지
    let errorMessage = '검색 중 오류가 발생했습니다.';
    
    if (error.message.includes('401') || error.message.includes('인증')) {
      errorMessage = '로그인이 필요합니다. 다시 로그인해주세요.';
    } else if (error.message.includes('403') || error.message.includes('quota')) {
      errorMessage = 'YouTube API 할당량이 초과되었습니다. 나중에 다시 시도해주세요.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = '네트워크 연결을 확인해주세요.';
    } else if (error.message) {
      errorMessage = `검색 오류: ${error.message}`;
    }
    
    alert(errorMessage);
    renderMarketTable([]);
    updateResultCount(0);
    
  } finally {
    showMarketLoading(false);
  }
}

// 필터 적용
function applyMarketFilters() {
  console.log('🔍 [마켓 탐색] 필터 적용');
  
  // 드롭다운 필터 값 가져오기
  const filterSubscriber = document.getElementById('filter-subscriber')?.value || 'all';
  const filterDuration = document.getElementById('filter-duration')?.value || 'all';
  const filterPerformance = document.getElementById('filter-performance')?.value || 'all';
  const filterCategory = document.getElementById('filter-category')?.value || 'all';
  const filterCountry = document.getElementById('filter-country')?.value || 'all';
  
  // 조회수 필터 (드롭다운 + 직접 입력)
  const minViewsDropdown = document.getElementById('filter-min-views')?.value || '';
  const minViewsCustom = document.getElementById('filter-min-views-custom')?.value || '';
  let filterMinViews = 0;
  
  if (minViewsDropdown === 'custom' && minViewsCustom) {
    filterMinViews = parseInt(minViewsCustom) || 0;
  } else if (minViewsDropdown && minViewsDropdown !== '') {
    filterMinViews = parseInt(minViewsDropdown) || 0;
  }
  
  const filterUploadDate = document.getElementById('filter-upload-date')?.value || '';
  
  console.log('📊 [필터 값]', {
    subscriber: filterSubscriber,
    duration: filterDuration,
    performance: filterPerformance,
    category: filterCategory,
    country: filterCountry,
    minViews: filterMinViews,
    minViewsSource: minViewsDropdown === 'custom' ? 'custom input' : 'dropdown',
    uploadDate: filterUploadDate
  });
  
  // 필터링
  filteredMarketVideos = marketVideos.filter(video => {
    const subscribers = video.channelInfo?.subscriberCount || 0;
    const views = video.statistics?.viewCount || 0;
    const duration = parseDuration(video.contentDetails?.duration || '');
    const publishedAt = new Date(video.snippet?.publishedAt || 0);
    const performance = video.performance?.level || 'low';
    const categoryId = video.snippet?.categoryId || '';
    const defaultLanguage = video.snippet?.defaultLanguage || video.snippet?.defaultAudioLanguage || '';
    
    // 구독자 구간 필터 (드롭다운)
    if (filterSubscriber !== 'all') {
      let subscriberMatch = false;
      if (filterSubscriber === '1k' && subscribers < 10000) subscriberMatch = true;
      if (filterSubscriber === '10k' && subscribers >= 10000 && subscribers < 100000) subscriberMatch = true;
      if (filterSubscriber === '100k' && subscribers >= 100000 && subscribers < 1000000) subscriberMatch = true;
      if (filterSubscriber === '1m' && subscribers >= 1000000 && subscribers < 10000000) subscriberMatch = true;
      if (filterSubscriber === '10m' && subscribers >= 10000000) subscriberMatch = true;
      if (!subscriberMatch) return false;
    }
    
    // 영상 길이 필터 (드롭다운, 초 단위)
    if (filterDuration !== 'all') {
      let durationMatch = false;
      if (filterDuration === 'short' && duration < 180) durationMatch = true;
      if (filterDuration === 'medium' && duration >= 180 && duration < 600) durationMatch = true;
      if (filterDuration === 'long' && duration >= 600 && duration < 1800) durationMatch = true;
      if (filterDuration === 'verylong' && duration >= 1800) durationMatch = true;
      if (!durationMatch) return false;
    }
    
    // 성과도 필터 (드롭다운)
    if (filterPerformance !== 'all') {
      if (filterPerformance !== performance) return false;
    }
    
    // 카테고리 필터 (드롭다운)
    if (filterCategory !== 'all') {
      if (filterCategory !== categoryId) return false;
    }
    
    // 국가/언어 필터 (드롭다운)
    if (filterCountry !== 'all') {
      if (filterCountry !== defaultLanguage) return false;
    }
    
    // 최소 조회수 필터
    if (views < filterMinViews) return false;
    
    // 업로드 날짜 필터 (확장)
    if (filterUploadDate && filterUploadDate !== 'all') {
      const now = new Date();
      let cutoffDate = new Date(0);
      
      if (filterUploadDate === 'hour') {
        cutoffDate = new Date(now - 1 * 60 * 60 * 1000);
      } else if (filterUploadDate === 'day') {
        cutoffDate = new Date(now - 24 * 60 * 60 * 1000);
      } else if (filterUploadDate === 'week') {
        cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      } else if (filterUploadDate === 'month') {
        cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      } else if (filterUploadDate === '3month') {
        cutoffDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
      } else if (filterUploadDate === '6month') {
        cutoffDate = new Date(now - 180 * 24 * 60 * 60 * 1000);
      } else if (filterUploadDate === 'year') {
        cutoffDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
      }
      
      if (publishedAt < cutoffDate) return false;
    }
    
    // 북마크 필터
    if (showBookmarksOnly) {
      const videoId = video.id?.videoId || video.id;
      if (!bookmarkedVideos.includes(videoId)) return false;
    }
    
    return true;
  });
  
  console.log('✅ [마켓 탐색] 필터링 완료:', filteredMarketVideos.length, '개');
  
  // 정렬 적용
  sortMarketVideos();
}

// 정렬
function sortMarketVideos() {
  filteredMarketVideos.sort((a, b) => {
    let aValue, bValue;
    
    switch (marketSortColumn) {
      case 'views':
        aValue = a.statistics?.viewCount || 0;
        bValue = b.statistics?.viewCount || 0;
        break;
      case 'performance':
        aValue = parseFloat(a.performance?.ratio || 0);
        bValue = parseFloat(b.performance?.ratio || 0);
        break;
      case 'subscribers':
        aValue = a.channelInfo?.subscriberCount || 0;
        bValue = b.channelInfo?.subscriberCount || 0;
        break;
      case 'likeRate':
        const aLikes = a.statistics?.likeCount || 0;
        const aViews = a.statistics?.viewCount || 1;
        const bLikes = b.statistics?.likeCount || 0;
        const bViews = b.statistics?.viewCount || 1;
        aValue = (aLikes / aViews) * 100;
        bValue = (bLikes / bViews) * 100;
        break;
      case 'comments':
        aValue = a.statistics?.commentCount || 0;
        bValue = b.statistics?.commentCount || 0;
        break;
      case 'publishedAt':
        aValue = new Date(a.snippet?.publishedAt || 0).getTime();
        bValue = new Date(b.snippet?.publishedAt || 0).getTime();
        break;
      default:
        aValue = a.snippet?.title || '';
        bValue = b.snippet?.title || '';
    }
    
    if (marketSortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  // 테이블 렌더링
  renderMarketTable(filteredMarketVideos);
}

// 테이블 렌더링
function renderMarketTable(videos) {
  const tbody = document.getElementById('video-table-body');
  
  if (!tbody) {
    console.error('❌ [마켓 탐색] 테이블 body 없음');
    return;
  }
  
  // 빈 상태
  if (videos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-12 text-gray-400">
          <i class="fas fa-inbox text-4xl mb-3"></i>
          <p class="text-lg">검색 결과가 없습니다</p>
          <p class="text-sm mt-1">다른 키워드로 검색해보세요</p>
        </td>
      </tr>
    `;
    updateResultCount(0);
    return;
  }
  
  // 테이블 렌더링
  tbody.innerHTML = videos.map(video => {
    const thumbnail = video.snippet?.thumbnails?.medium?.url || '';
    const title = video.snippet?.title || '제목 없음';
    const channelTitle = video.snippet?.channelTitle || '채널 없음';
    const channelAvatar = video.channelInfo?.thumbnails?.default?.url || '';
    const views = video.statistics?.viewCount || 0;
    const subscribers = video.channelInfo?.subscriberCount || 0;
    const likes = video.statistics?.likeCount || 0;
    const comments = video.statistics?.commentCount || 0;
    const publishedAt = video.snippet?.publishedAt || '';
    const duration = video.contentDetails?.duration || '';
    const videoId = video.id?.videoId || video.id;
    
    const performance = video.performance || {};
    const likeRate = views > 0 ? ((likes / views) * 100).toFixed(2) : '0.00';
    const isSelected = selectedCompareVideos.some(v => (v.id?.videoId || v.id) === videoId);
    const isBookmarked = bookmarkedVideos.includes(videoId);
    
    return `
      <tr data-video-id="${videoId}" class="${selectedMarketVideo?.id === videoId ? 'selected' : ''}">
        <!-- 체크박스 -->
        <td class="text-center" onclick="event.stopPropagation();">
          <input 
            type="checkbox" 
            class="video-compare-checkbox w-4 h-4 cursor-pointer" 
            data-video-id="${videoId}"
            ${isSelected ? 'checked' : ''}
            onchange="toggleCompareVideo('${videoId}')"
          />
        </td>
        
        <!-- 북마크 -->
        <td class="text-center" onclick="event.stopPropagation();">
          <button 
            onclick="toggleBookmark('${videoId}')" 
            class="hover:scale-125 transition-transform"
            title="${isBookmarked ? '북마크 제거' : '북마크 추가'}"
          >
            <i 
              class="${isBookmarked ? 'fas' : 'far'} fa-star ${isBookmarked ? 'text-yellow-500' : 'text-gray-400'} text-lg"
              data-bookmark-id="${videoId}"
            ></i>
          </button>
        </td>
        
        <!-- 영상 (썸네일 + 제목 + 채널) -->
        <td onclick="selectMarketVideo('${videoId}')">
          <div class="video-thumbnail-cell">
            <div class="video-thumbnail-wrapper">
              <img src="${thumbnail}" alt="${title}" />
              <span class="video-duration-badge">${formatDuration(duration)}</span>
            </div>
            <div class="video-info">
              <h3 class="video-title">${escapeHtml(title)}</h3>
              <div class="video-channel-info">
                ${channelAvatar ? `<img src="${channelAvatar}" class="channel-avatar" />` : ''}
                <span>${escapeHtml(channelTitle)}</span>
              </div>
            </div>
          </div>
        </td>
        
        <!-- 조회수 -->
        <td class="metric-cell" onclick="selectMarketVideo('${videoId}')">
          <div class="metric-value">${formatNumber(views)}</div>
        </td>
        
        <!-- 성과도 -->
        <td class="text-center" onclick="selectMarketVideo('${videoId}')">
          <div class="performance-badge ${performance.badgeClass}">
            ${performance.badge} ${performance.ratio}%
          </div>
        </td>
        
        <!-- 구독자 -->
        <td class="metric-cell" onclick="selectMarketVideo('${videoId}')">
          <div class="metric-value">${formatNumber(subscribers)}</div>
        </td>
        
        <!-- 좋아요율 -->
        <td class="metric-cell" onclick="selectMarketVideo('${videoId}')">
          <div class="metric-value">${likeRate}%</div>
        </td>
        
        <!-- 댓글 -->
        <td class="metric-cell" onclick="selectMarketVideo('${videoId}')">
          <div class="metric-value">${formatNumber(comments)}</div>
        </td>
        
        <!-- 업로드 -->
        <td class="text-center text-sm text-gray-600" onclick="selectMarketVideo('${videoId}')">
          ${formatDate(publishedAt)}
        </td>
        
        <!-- 길이 -->
        <td class="text-center text-sm" onclick="selectMarketVideo('${videoId}')">
          ${formatDuration(duration)}
        </td>
      </tr>
    `;
  }).join('');
  
  updateResultCount(videos.length);
}

// 영상 선택
function selectMarketVideo(videoId) {
  const video = filteredMarketVideos.find(v => (v.id?.videoId || v.id) === videoId);
  
  if (!video) return;
  
  selectedMarketVideo = video;
  
  // 테이블 행 하이라이트
  document.querySelectorAll('#video-table-body tr').forEach(tr => {
    tr.classList.remove('selected');
  });
  document.querySelector(`#video-table-body tr[data-video-id="${videoId}"]`)?.classList.add('selected');
  
  // 우측 상세 패널 렌더링
  renderDetailPanel(video);
}

// 우측 상세 패널 렌더링
function renderDetailPanel(video) {
  const detailPanel = document.getElementById('detail-panel-content');
  
  if (!detailPanel) return;
  
  const videoId = video.id?.videoId || video.id;
  const title = video.snippet?.title || '제목 없음';
  const channelTitle = video.snippet?.channelTitle || '';
  const channelAvatar = video.channelInfo?.thumbnails?.default?.url || '';
  const subscribers = video.channelInfo?.subscriberCount || 0;
  const views = video.statistics?.viewCount || 0;
  const likes = video.statistics?.likeCount || 0;
  const comments = video.statistics?.commentCount || 0;
  const description = video.snippet?.description || '';
  const tags = video.snippet?.tags || [];
  const performance = video.performance || {};
  
  detailPanel.innerHTML = `
    <div class="p-4">
      <h2 class="font-bold text-lg mb-4">📊 영상 상세 분석</h2>
      
      <!-- YouTube 플레이어 -->
      <div class="aspect-video mb-4">
        <iframe
          src="https://www.youtube.com/embed/${videoId}"
          class="w-full h-full rounded-lg"
          allowfullscreen
        ></iframe>
      </div>
      
      <!-- 제목 -->
      <h3 class="font-bold text-base mb-2 leading-tight">${escapeHtml(title)}</h3>
      
      <!-- 채널 정보 -->
      <div class="flex items-center gap-2 mb-4 pb-4 border-b">
        ${channelAvatar ? `<img src="${channelAvatar}" class="w-10 h-10 rounded-full" />` : ''}
        <div>
          <div class="font-semibold">${escapeHtml(channelTitle)}</div>
          <div class="text-sm text-gray-500">구독자 ${formatNumber(subscribers)}</div>
        </div>
      </div>
      
      <!-- 성과 지표 -->
      <div class="grid grid-cols-2 gap-3 mb-4">
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="text-xs text-gray-500 mb-1">조회수</div>
          <div class="font-bold text-lg">${formatNumber(views)}</div>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="text-xs text-gray-500 mb-1">성과도</div>
          <div class="font-bold text-lg">${performance.ratio}%</div>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="text-xs text-gray-500 mb-1">좋아요</div>
          <div class="font-bold text-lg">${formatNumber(likes)}</div>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="text-xs text-gray-500 mb-1">댓글</div>
          <div class="font-bold text-lg">${formatNumber(comments)}</div>
        </div>
      </div>
      
      <!-- 태그 분석 -->
      ${tags.length > 0 ? `
        <div class="mb-4">
          <h4 class="font-semibold mb-2">🏷️ 태그</h4>
          <div class="flex flex-wrap gap-2">
            ${tags.slice(0, 10).map(tag => `
              <span class="px-2 py-1 bg-gray-100 rounded text-xs cursor-pointer hover:bg-gray-200"
                    onclick="navigator.clipboard.writeText('${tag}'); alert('복사 완료: ${tag}');">
                ${escapeHtml(tag)}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- 설명 -->
      <div>
        <h4 class="font-semibold mb-2">📝 설명</h4>
        <p class="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
          ${escapeHtml(description.substring(0, 300))}${description.length > 300 ? '...' : ''}
        </p>
      </div>
    </div>
  `;
  
  // 빈 상태 클래스 제거
  detailPanel.classList.remove('detail-sidebar-empty');
}

// 유틸리티 함수들
function parseDuration(duration) {
  // ISO 8601 duration을 초로 변환 (예: PT1H2M10S)
  if (!duration) return 0;
  
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(duration) {
  const seconds = parseDuration(duration);
  
  if (seconds === 0) return '0:00';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  } else {
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function updateResultCount(count) {
  const resultCount = document.getElementById('result-count');
  if (resultCount) {
    resultCount.textContent = `총 ${count}개 결과`;
  }
}

function showMarketLoading(show) {
  const tbody = document.getElementById('video-table-body');
  
  if (!tbody) return;
  
  if (show) {
    // 스켈레톤 로딩 UI (3개 행)
    const skeletonRows = Array.from({ length: 3 }, (_, i) => `
      <tr class="border-b">
        <td class="px-4 py-3">
          <div class="skeleton" style="width: 16px; height: 16px;"></div>
        </td>
        <td class="video-thumbnail-cell px-4 py-3">
          <div class="flex items-start gap-3">
            <div class="skeleton skeleton-thumbnail"></div>
            <div class="flex-1 min-w-0">
              <div class="skeleton skeleton-text-large mb-2" style="width: 90%;"></div>
              <div class="skeleton skeleton-text" style="width: 60%;"></div>
              <div class="flex items-center gap-2 mt-2">
                <div class="skeleton skeleton-circle" style="width: 24px; height: 24px;"></div>
                <div class="skeleton skeleton-text" style="width: 100px;"></div>
              </div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3">
          <div class="skeleton skeleton-text" style="width: 80px; margin-left: auto;"></div>
        </td>
        <td class="px-4 py-3">
          <div class="skeleton skeleton-text" style="width: 60px; margin: 0 auto;"></div>
        </td>
        <td class="px-4 py-3">
          <div class="skeleton skeleton-text" style="width: 80px; margin-left: auto;"></div>
        </td>
        <td class="px-4 py-3">
          <div class="skeleton skeleton-text" style="width: 50px; margin-left: auto;"></div>
        </td>
        <td class="px-4 py-3">
          <div class="skeleton skeleton-text" style="width: 40px; margin-left: auto;"></div>
        </td>
        <td class="px-4 py-3">
          <div class="skeleton skeleton-text" style="width: 80px; margin: 0 auto;"></div>
        </td>
        <td class="px-4 py-3">
          <div class="skeleton skeleton-text" style="width: 60px; margin: 0 auto;"></div>
        </td>
      </tr>
    `).join('');
    
    tbody.innerHTML = skeletonRows;
  }
}

// 컬럼 정렬 이벤트
function handleColumnSort(column) {
  if (marketSortColumn === column) {
    // 같은 컬럼 클릭 시 정렬 순서 토글
    marketSortOrder = marketSortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    // 다른 컬럼 클릭 시 해당 컬럼으로 내림차순
    marketSortColumn = column;
    marketSortOrder = 'desc';
  }
  
  // 헤더 스타일 업데이트
  document.querySelectorAll('.video-table th').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
  });
  
  const th = document.querySelector(`.video-table th[data-sort="${column}"]`);
  if (th) {
    th.classList.add(marketSortOrder === 'asc' ? 'sorted-asc' : 'sorted-desc');
  }
  
  // 정렬 및 렌더링
  sortMarketVideos();
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  // 마켓 검색 버튼
  const marketSearchBtn = document.getElementById('market-search-btn');
  if (marketSearchBtn) {
    marketSearchBtn.addEventListener('click', searchMarket200);
  }
  
  // 마켓 검색 입력 (엔터키)
  const marketSearchInput = document.getElementById('market-search-input');
  if (marketSearchInput) {
    marketSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchMarket200();
      }
    });
  }
  
  // 필터 적용 버튼
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyMarketFilters);
  }
  
  // 필터 초기화 버튼
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      console.log('🔄 [마켓 탐색] 필터 초기화');
      
      // 모든 드롭다운 초기화
      const filterSubscriber = document.getElementById('filter-subscriber');
      if (filterSubscriber) filterSubscriber.value = 'all';
      
      const filterDuration = document.getElementById('filter-duration');
      if (filterDuration) filterDuration.value = 'all';
      
      const filterPerformance = document.getElementById('filter-performance');
      if (filterPerformance) filterPerformance.value = 'all';
      
      const filterCategory = document.getElementById('filter-category');
      if (filterCategory) filterCategory.value = 'all';
      
      const filterCountry = document.getElementById('filter-country');
      if (filterCountry) filterCountry.value = 'all';
      
      const filterOrder = document.getElementById('filter-order');
      if (filterOrder) filterOrder.value = 'relevance';
      
      // 입력 필드 초기화
      const minViewsInput = document.getElementById('filter-min-views');
      if (minViewsInput) minViewsInput.value = '';
      
      const uploadDateSelect = document.getElementById('filter-upload-date');
      if (uploadDateSelect) uploadDateSelect.value = 'all';
      
      console.log('✅ [마켓 탐색] 필터 초기화 완료');
      
      // 필터 재적용
      applyMarketFilters();
    });
  }
  
  // 필터 드롭다운 변경 이벤트
  const filterDropdowns = [
    'filter-subscriber',
    'filter-duration', 
    'filter-performance',
    'filter-category',
    'filter-country',
    'filter-upload-date'
  ];
  
  filterDropdowns.forEach(id => {
    const dropdown = document.getElementById(id);
    if (dropdown) {
      dropdown.addEventListener('change', () => {
        console.log(`🔄 [필터 변경] ${id}: ${dropdown.value}`);
        applyMarketFilters();
      });
    }
  });
  
  // 최소 조회수 입력 이벤트
  const minViewsInput = document.getElementById('filter-min-views');
  if (minViewsInput) {
    minViewsInput.addEventListener('input', () => {
      // 디바운스 처리
      clearTimeout(minViewsInput.debounceTimer);
      minViewsInput.debounceTimer = setTimeout(() => {
        console.log('🔄 [필터 변경] 최소 조회수:', minViewsInput.value);
        applyMarketFilters();
      }, 500);
    });
  }
  
  // 컬럼 정렬 이벤트
  document.querySelectorAll('.video-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.sort;
      if (column) {
        handleColumnSort(column);
      }
    });
  });
  
  // CSV/Excel 다운로드
  // CSV/Excel 다운로드
  document.getElementById('export-csv-btn')?.addEventListener('click', () => {
    exportToCSV();
  });
  
  document.getElementById('export-excel-btn')?.addEventListener('click', () => {
    exportToExcel();
  });
  
  // 비교 기능
  document.getElementById('compare-videos-btn')?.addEventListener('click', () => {
    openCompareModal();
  });
  
  document.getElementById('close-compare-modal')?.addEventListener('click', () => {
    closeCompareModal();
  });
  
  document.getElementById('close-compare-modal-2')?.addEventListener('click', () => {
    closeCompareModal();
  });
  
  // 모달 배경 클릭 시 닫기
  document.getElementById('compare-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'compare-modal') {
      closeCompareModal();
    }
  });
  
  // AI 비교 분석
  document.getElementById('generate-compare-ai-btn')?.addEventListener('click', () => {
    generateCompareAIAnalysis();
  });
  
  // 북마크 필터
  document.getElementById('bookmark-filter-btn')?.addEventListener('click', () => {
    toggleBookmarkFilter();
  });
});

// ========================================
// CSV/Excel 다운로드 함수
// ========================================

/**
 * CSV 다운로드
 */
function exportToCSV() {
  if (!filteredMarketVideos || filteredMarketVideos.length === 0) {
    alert('다운로드할 데이터가 없습니다. 먼저 검색을 진행해주세요.');
    return;
  }
  
  console.log('📥 [CSV 다운로드] 시작:', filteredMarketVideos.length, '개');
  
  try {
    // CSV 헤더
    const headers = [
      '영상 제목',
      '채널명',
      '조회수',
      '성과도 (%)',
      '성과도 등급',
      '구독자 수',
      '좋아요 수',
      '좋아요율 (%)',
      '댓글 수',
      '업로드 날짜',
      '영상 길이',
      '카테고리 ID',
      '언어',
      '영상 URL'
    ];
    
    // CSV 데이터 생성
    const rows = filteredMarketVideos.map(video => {
      const title = (video.snippet?.title || '').replace(/"/g, '""'); // CSV escape
      const channelTitle = (video.snippet?.channelTitle || '').replace(/"/g, '""');
      const views = video.statistics?.viewCount || 0;
      const performanceRatio = video.performance?.ratio || 0;
      const performanceLevel = getPerformanceLevelText(video.performance?.level || 'low');
      const subscribers = video.channelInfo?.subscriberCount || 0;
      const likes = video.statistics?.likeCount || 0;
      const likeRate = views > 0 ? ((likes / views) * 100).toFixed(2) : '0.00';
      const comments = video.statistics?.commentCount || 0;
      const publishedAt = formatDate(video.snippet?.publishedAt || '');
      const duration = formatDuration(parseDuration(video.contentDetails?.duration || ''));
      const categoryId = video.snippet?.categoryId || '';
      const language = video.snippet?.defaultLanguage || video.snippet?.defaultAudioLanguage || '';
      const videoUrl = `https://www.youtube.com/watch?v=${video.id?.videoId || video.id || ''}`;
      
      return [
        `"${title}"`,
        `"${channelTitle}"`,
        views,
        performanceRatio,
        performanceLevel,
        subscribers,
        likes,
        likeRate,
        comments,
        publishedAt,
        duration,
        categoryId,
        language,
        videoUrl
      ].join(',');
    });
    
    // CSV 문자열 생성
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 파일명 생성 (날짜 + 키워드)
    const keyword = document.getElementById('market-search-input')?.value.trim() || 'youtube_data';
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `youtube_market_${keyword}_${date}.csv`;
    
    // 다운로드
    downloadFile(blob, filename);
    
    console.log('✅ [CSV 다운로드] 완료:', filename);
    alert(`CSV 파일이 다운로드되었습니다.\n파일명: ${filename}\n데이터: ${filteredMarketVideos.length}개`);
    
  } catch (error) {
    console.error('❌ [CSV 다운로드 오류]', error);
    alert('CSV 다운로드 중 오류가 발생했습니다.');
  }
}

/**
 * Excel (XLSX) 다운로드
 * Excel 형식은 CSV와 동일하지만 파일 확장자가 .xlsx
 * 실제 Excel 바이너리 포맷은 라이브러리가 필요하므로, CSV를 .xlsx로 저장
 * (Excel은 CSV를 자동으로 열 수 있음)
 */
function exportToExcel() {
  if (!filteredMarketVideos || filteredMarketVideos.length === 0) {
    alert('다운로드할 데이터가 없습니다. 먼저 검색을 진행해주세요.');
    return;
  }
  
  console.log('📥 [Excel 다운로드] 시작:', filteredMarketVideos.length, '개');
  
  try {
    // HTML 테이블 생성 (Excel이 인식 가능한 형식)
    let tableHTML = '<table border="1">';
    
    // 헤더
    tableHTML += '<thead><tr>';
    const headers = [
      '영상 제목',
      '채널명',
      '조회수',
      '성과도 (%)',
      '성과도 등급',
      '구독자 수',
      '좋아요 수',
      '좋아요율 (%)',
      '댓글 수',
      '업로드 날짜',
      '영상 길이',
      '카테고리 ID',
      '언어',
      '영상 URL'
    ];
    headers.forEach(header => {
      tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead>';
    
    // 데이터
    tableHTML += '<tbody>';
    filteredMarketVideos.forEach(video => {
      const title = escapeHtml(video.snippet?.title || '');
      const channelTitle = escapeHtml(video.snippet?.channelTitle || '');
      const views = video.statistics?.viewCount || 0;
      const performanceRatio = video.performance?.ratio || 0;
      const performanceLevel = getPerformanceLevelText(video.performance?.level || 'low');
      const subscribers = video.channelInfo?.subscriberCount || 0;
      const likes = video.statistics?.likeCount || 0;
      const likeRate = views > 0 ? ((likes / views) * 100).toFixed(2) : '0.00';
      const comments = video.statistics?.commentCount || 0;
      const publishedAt = formatDate(video.snippet?.publishedAt || '');
      const duration = formatDuration(parseDuration(video.contentDetails?.duration || ''));
      const categoryId = video.snippet?.categoryId || '';
      const language = video.snippet?.defaultLanguage || video.snippet?.defaultAudioLanguage || '';
      const videoUrl = `https://www.youtube.com/watch?v=${video.id?.videoId || video.id || ''}`;
      
      tableHTML += '<tr>';
      tableHTML += `<td>${title}</td>`;
      tableHTML += `<td>${channelTitle}</td>`;
      tableHTML += `<td>${views.toLocaleString()}</td>`;
      tableHTML += `<td>${performanceRatio}</td>`;
      tableHTML += `<td>${performanceLevel}</td>`;
      tableHTML += `<td>${subscribers.toLocaleString()}</td>`;
      tableHTML += `<td>${likes.toLocaleString()}</td>`;
      tableHTML += `<td>${likeRate}</td>`;
      tableHTML += `<td>${comments.toLocaleString()}</td>`;
      tableHTML += `<td>${publishedAt}</td>`;
      tableHTML += `<td>${duration}</td>`;
      tableHTML += `<td>${categoryId}</td>`;
      tableHTML += `<td>${language}</td>`;
      tableHTML += `<td><a href="${videoUrl}" target="_blank">링크</a></td>`;
      tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    
    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + tableHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    
    // 파일명 생성 (날짜 + 키워드)
    const keyword = document.getElementById('market-search-input')?.value.trim() || 'youtube_data';
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `youtube_market_${keyword}_${date}.xls`;
    
    // 다운로드
    downloadFile(blob, filename);
    
    console.log('✅ [Excel 다운로드] 완료:', filename);
    alert(`Excel 파일이 다운로드되었습니다.\n파일명: ${filename}\n데이터: ${filteredMarketVideos.length}개`);
    
  } catch (error) {
    console.error('❌ [Excel 다운로드 오류]', error);
    alert('Excel 다운로드 중 오류가 발생했습니다.');
  }
}

/**
 * 성과도 등급 텍스트 반환
 */
function getPerformanceLevelText(level) {
  switch (level) {
    case 'viral': return '떡상 중';
    case 'algorithm': return '알고리즘 픽';
    case 'normal': return '일반';
    case 'low': return '저조';
    default: return '알 수 없음';
  }
}

/**
 * 파일 다운로드 헬퍼 함수
 */
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ========================================
// 영상 비교 기능
// ========================================

/**
 * 비교 영상 토글
 */
function toggleCompareVideo(videoId) {
  const video = filteredMarketVideos.find(v => (v.id?.videoId || v.id) === videoId);
  
  if (!video) {
    console.error('❌ [비교] 영상을 찾을 수 없음:', videoId);
    return;
  }
  
  const index = selectedCompareVideos.findIndex(v => (v.id?.videoId || v.id) === videoId);
  
  if (index >= 0) {
    // 선택 해제
    selectedCompareVideos.splice(index, 1);
    console.log('✅ [비교] 선택 해제:', videoId);
  } else {
    // 선택 추가 (최대 3개)
    if (selectedCompareVideos.length >= 3) {
      alert('최대 3개까지만 선택할 수 있습니다.');
      // 체크박스 해제
      const checkbox = document.querySelector(`input[data-video-id="${videoId}"]`);
      if (checkbox) checkbox.checked = false;
      return;
    }
    selectedCompareVideos.push(video);
    console.log('✅ [비교] 선택 추가:', videoId);
  }
  
  updateCompareButton();
}

/**
 * 비교 버튼 업데이트
 */
function updateCompareButton() {
  const btn = document.getElementById('compare-videos-btn');
  const countSpan = document.getElementById('selected-count');
  
  if (countSpan) {
    countSpan.textContent = selectedCompareVideos.length;
  }
  
  if (btn) {
    btn.disabled = selectedCompareVideos.length < 2;
  }
}

/**
 * 비교 모달 열기
 */
function openCompareModal() {
  if (selectedCompareVideos.length < 2) {
    alert('최소 2개 이상의 영상을 선택해주세요.');
    return;
  }
  
  console.log('📊 [비교] 모달 열기:', selectedCompareVideos.length, '개');
  
  // 모달 표시
  const modal = document.getElementById('compare-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
  
  // 비교 테이블 렌더링
  renderCompareTable();
  
  // 레이더 차트 렌더링
  renderCompareChart();
}

/**
 * 비교 모달 닫기
 */
function closeCompareModal() {
  const modal = document.getElementById('compare-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  
  // Chart.js 인스턴스 파괴
  if (compareChart) {
    compareChart.destroy();
    compareChart = null;
  }
}

/**
 * 비교 테이블 렌더링
 */
function renderCompareTable() {
  const tbody = document.getElementById('compare-table-body');
  
  if (!tbody) return;
  
  // 헤더 업데이트
  selectedCompareVideos.forEach((video, index) => {
    const colHeader = document.getElementById(`compare-col-${index + 1}`);
    if (colHeader) {
      const title = video.snippet?.title || '제목 없음';
      colHeader.innerHTML = `
        <div class="text-xs text-gray-600 mb-1">영상 ${index + 1}</div>
        <div class="font-semibold text-sm">${escapeHtml(title.substring(0, 30))}${title.length > 30 ? '...' : ''}</div>
      `;
    }
  });
  
  // 비어있는 컬럼 숨기기
  for (let i = selectedCompareVideos.length + 1; i <= 3; i++) {
    const colHeader = document.getElementById(`compare-col-${i}`);
    if (colHeader) {
      colHeader.style.display = 'none';
    }
  }
  
  // 지표 정의
  const metrics = [
    { label: '조회수', key: 'views', format: 'number' },
    { label: '구독자', key: 'subscribers', format: 'number' },
    { label: '성과도 (%)', key: 'performance', format: 'percent' },
    { label: '좋아요 수', key: 'likes', format: 'number' },
    { label: '좋아요율 (%)', key: 'likeRate', format: 'percent2' },
    { label: '댓글 수', key: 'comments', format: 'number' },
    { label: '업로드 날짜', key: 'publishedAt', format: 'date' },
    { label: '영상 길이', key: 'duration', format: 'duration' },
    { label: '카테고리', key: 'categoryId', format: 'text' },
    { label: '언어', key: 'language', format: 'text' }
  ];
  
  // 테이블 생성
  tbody.innerHTML = metrics.map(metric => {
    // 각 영상의 값 추출
    const values = selectedCompareVideos.map(video => {
      let value = 0;
      
      switch (metric.key) {
        case 'views':
          value = video.statistics?.viewCount || 0;
          break;
        case 'subscribers':
          value = video.channelInfo?.subscriberCount || 0;
          break;
        case 'performance':
          value = parseFloat(video.performance?.ratio || 0);
          break;
        case 'likes':
          value = video.statistics?.likeCount || 0;
          break;
        case 'likeRate':
          const views = video.statistics?.viewCount || 0;
          const likes = video.statistics?.likeCount || 0;
          value = views > 0 ? (likes / views) * 100 : 0;
          break;
        case 'comments':
          value = video.statistics?.commentCount || 0;
          break;
        case 'publishedAt':
          return formatDate(video.snippet?.publishedAt || '');
        case 'duration':
          return formatDuration(video.contentDetails?.duration || '');
        case 'categoryId':
          return video.snippet?.categoryId || '-';
        case 'language':
          return video.snippet?.defaultLanguage || video.snippet?.defaultAudioLanguage || '-';
      }
      
      return value;
    });
    
    // 최고값 찾기 (숫자인 경우만)
    let maxValue = -Infinity;
    if (metric.format !== 'date' && metric.format !== 'duration' && metric.format !== 'text') {
      maxValue = Math.max(...values.filter(v => typeof v === 'number'));
    }
    
    // 셀 생성
    const cells = values.map((value, index) => {
      const isMax = typeof value === 'number' && value === maxValue && maxValue > 0;
      const bgClass = isMax ? 'bg-green-50 font-bold text-green-700' : '';
      
      let displayValue = '';
      
      if (metric.format === 'number') {
        displayValue = formatNumber(value);
      } else if (metric.format === 'percent' || metric.format === 'percent2') {
        displayValue = value.toFixed(2) + '%';
      } else {
        displayValue = value;
      }
      
      // 빈 컬럼 숨기기
      const hideStyle = index >= selectedCompareVideos.length ? 'style="display:none;"' : '';
      
      return `<td class="px-4 py-3 text-center border ${bgClass}" ${hideStyle}>${displayValue}</td>`;
    });
    
    // 3개 컬럼 맞추기
    while (cells.length < 3) {
      cells.push('<td class="px-4 py-3 text-center border" style="display:none;">-</td>');
    }
    
    return `
      <tr>
        <td class="px-4 py-3 text-left font-medium text-gray-700 border bg-gray-50">${metric.label}</td>
        ${cells.join('')}
      </tr>
    `;
  }).join('');
}

/**
 * 레이더 차트 렌더링
 */
function renderCompareChart() {
  const canvas = document.getElementById('compare-radar-chart');
  
  if (!canvas) return;
  
  // 기존 차트 파괴
  if (compareChart) {
    compareChart.destroy();
  }
  
  // 데이터셋 준비
  const datasets = selectedCompareVideos.map((video, index) => {
    const views = video.statistics?.viewCount || 0;
    const subscribers = video.channelInfo?.subscriberCount || 1;
    const likes = video.statistics?.likeCount || 0;
    const comments = video.statistics?.commentCount || 0;
    const performance = parseFloat(video.performance?.ratio || 0);
    
    // 정규화 (0-100 스케일)
    const maxViews = Math.max(...selectedCompareVideos.map(v => v.statistics?.viewCount || 0));
    const maxSubscribers = Math.max(...selectedCompareVideos.map(v => v.channelInfo?.subscriberCount || 0));
    const maxLikes = Math.max(...selectedCompareVideos.map(v => v.statistics?.likeCount || 0));
    const maxComments = Math.max(...selectedCompareVideos.map(v => v.statistics?.commentCount || 0));
    const maxPerformance = Math.max(...selectedCompareVideos.map(v => parseFloat(v.performance?.ratio || 0)));
    
    const data = [
      maxViews > 0 ? (views / maxViews) * 100 : 0,
      maxSubscribers > 0 ? (subscribers / maxSubscribers) * 100 : 0,
      maxPerformance > 0 ? (performance / maxPerformance) * 100 : 0,
      maxLikes > 0 ? (likes / maxLikes) * 100 : 0,
      maxComments > 0 ? (comments / maxComments) * 100 : 0
    ];
    
    const colors = [
      { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgb(59, 130, 246)' },
      { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgb(16, 185, 129)' },
      { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgb(239, 68, 68)' }
    ];
    
    const title = video.snippet?.title || '제목 없음';
    
    return {
      label: `영상 ${index + 1}: ${title.substring(0, 20)}${title.length > 20 ? '...' : ''}`,
      data: data,
      backgroundColor: colors[index].bg,
      borderColor: colors[index].border,
      borderWidth: 2,
      pointBackgroundColor: colors[index].border,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: colors[index].border
    };
  });
  
  // Chart.js 렌더링
  compareChart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: ['조회수', '구독자', '성과도', '좋아요', '댓글'],
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

/**
 * AI 비교 분석 생성
 */
async function generateCompareAIAnalysis() {
  if (selectedCompareVideos.length < 2) {
    alert('최소 2개 이상의 영상을 선택해주세요.');
    return;
  }
  
  console.log('🤖 [AI 비교 분석] 시작:', selectedCompareVideos.length, '개');
  
  const btn = document.getElementById('generate-compare-ai-btn');
  const resultDiv = document.getElementById('compare-ai-result');
  const contentDiv = document.getElementById('compare-ai-content');
  
  if (!btn || !resultDiv || !contentDiv) return;
  
  try {
    // 로딩 상태
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>AI 분석 중...';
    
    // 영상 정보 구성
    const videosInfo = selectedCompareVideos.map((video, index) => {
      const title = video.snippet?.title || '제목 없음';
      const channelTitle = video.snippet?.channelTitle || '채널 없음';
      const views = video.statistics?.viewCount || 0;
      const subscribers = video.channelInfo?.subscriberCount || 0;
      const likes = video.statistics?.likeCount || 0;
      const comments = video.statistics?.commentCount || 0;
      const performance = video.performance?.ratio || 0;
      const likeRate = views > 0 ? ((likes / views) * 100).toFixed(2) : '0.00';
      
      return {
        index: index + 1,
        title,
        channelTitle,
        views,
        subscribers,
        likes,
        likeRate,
        comments,
        performance
      };
    });
    
    // 프롬프트 생성
    const prompt = `
다음 ${videosInfo.length}개의 YouTube 영상을 비교 분석해주세요:

${videosInfo.map(v => `
**영상 ${v.index}: ${v.title}**
- 채널: ${v.channelTitle}
- 조회수: ${formatNumber(v.views)}
- 구독자: ${formatNumber(v.subscribers)}
- 성과도: ${v.performance}%
- 좋아요율: ${v.likeRate}%
- 댓글 수: ${formatNumber(v.comments)}
`).join('\n')}

다음 형식으로 상세 비교 분석을 제공해주세요:

## 📊 종합 평가
- 각 영상의 전반적인 성과 평가

## 🏆 강점 분석
- 영상 1의 강점
- 영상 2의 강점
${videosInfo.length > 2 ? '- 영상 3의 강점' : ''}

## ⚠️ 약점 분석
- 영상 1의 약점
- 영상 2의 약점
${videosInfo.length > 2 ? '- 영상 3의 약점' : ''}

## 💡 개선 제안 TOP 3
1. 첫 번째 개선안
2. 두 번째 개선안
3. 세 번째 개선안

## 🎯 결론 및 추천
- 어떤 영상의 전략을 벤치마킹해야 하는지
- 핵심 성공 요인

**Markdown 형식으로 작성해주세요.**
    `.trim();
    
    // API 호출
    const token = localStorage.getItem('postflow_token');
    
    const response = await fetch('/api/youtube/strategy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ prompt })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'AI 분석 실패');
    }
    
    const analysis = result.data?.analysis || result.data?.strategy || '';
    
    if (!analysis) {
      throw new Error('AI 분석 결과가 비어있습니다');
    }
    
    // Markdown을 HTML로 변환 (간단한 변환)
    const html = markdownToHtml(analysis);
    
    // 결과 표시
    contentDiv.innerHTML = html;
    resultDiv.classList.remove('hidden');
    
    console.log('✅ [AI 비교 분석] 완료');
    
  } catch (error) {
    console.error('❌ [AI 비교 분석 오류]', error);
    
    let errorMessage = 'AI 분석 중 오류가 발생했습니다.';
    
    if (error.message.includes('401') || error.message.includes('인증')) {
      errorMessage = '로그인이 필요합니다. 다시 로그인해주세요.';
    } else if (error.message) {
      errorMessage = `AI 분석 오류: ${error.message}`;
    }
    
    alert(errorMessage);
    
  } finally {
    // 버튼 복구
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-robot mr-2"></i>AI 비교 분석 생성';
  }
}

/**
 * 간단한 Markdown to HTML 변환
 */
function markdownToHtml(markdown) {
  let html = markdown;
  
  // 헤더 변환
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>');
  
  // 리스트 변환
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 mb-2">• $1</li>');
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4 mb-2">• $1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-2">$1</li>');
  
  // 볼드 변환
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
  
  // 줄바꿈 변환
  html = html.replace(/\n\n/g, '</p><p class="mb-4">');
  html = '<p class="mb-4">' + html + '</p>';
  
  // 빈 p 태그 제거
  html = html.replace(/<p class="mb-4"><\/p>/g, '');
  
  return html;
}

// 전역 함수로 노출
window.toggleCompareVideo = toggleCompareVideo;
window.openCompareModal = openCompareModal;
window.closeCompareModal = closeCompareModal;
window.generateCompareAIAnalysis = generateCompareAIAnalysis;

// ========================================
// 북마크 기능
// ========================================

/**
 * localStorage에서 북마크 로드
 */
function loadBookmarks() {
  try {
    const saved = localStorage.getItem('youtube_bookmarks');
    if (saved) {
      bookmarkedVideos = JSON.parse(saved);
      console.log('✅ [북마크] 로드:', bookmarkedVideos.length, '개');
    }
  } catch (error) {
    console.error('❌ [북마크 로드 오류]', error);
    bookmarkedVideos = [];
  }
  updateBookmarkCount();
}

/**
 * localStorage에 북마크 저장
 */
function saveBookmarks() {
  try {
    localStorage.setItem('youtube_bookmarks', JSON.stringify(bookmarkedVideos));
    console.log('✅ [북마크] 저장:', bookmarkedVideos.length, '개');
  } catch (error) {
    console.error('❌ [북마크 저장 오류]', error);
  }
}

/**
 * 북마크 토글
 */
function toggleBookmark(videoId) {
  const index = bookmarkedVideos.indexOf(videoId);
  
  if (index >= 0) {
    // 북마크 제거
    bookmarkedVideos.splice(index, 1);
    console.log('✅ [북마크] 제거:', videoId);
  } else {
    // 북마크 추가
    bookmarkedVideos.push(videoId);
    console.log('✅ [북마크] 추가:', videoId);
  }
  
  saveBookmarks();
  updateBookmarkCount();
  
  // 북마크 필터 활성화 시 테이블 다시 렌더링
  if (showBookmarksOnly) {
    applyMarketFilters();
  } else {
    // 아이콘만 업데이트
    const icon = document.querySelector(`[data-bookmark-id="${videoId}"]`);
    if (icon) {
      if (bookmarkedVideos.includes(videoId)) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        icon.classList.add('text-yellow-500');
      } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        icon.classList.remove('text-yellow-500');
      }
    }
  }
}

/**
 * 북마크 카운트 업데이트
 */
function updateBookmarkCount() {
  const countSpan = document.getElementById('bookmark-count');
  if (countSpan) {
    countSpan.textContent = bookmarkedVideos.length;
  }
}

/**
 * 북마크 필터 토글
 */
function toggleBookmarkFilter() {
  showBookmarksOnly = !showBookmarksOnly;
  
  const btn = document.getElementById('bookmark-filter-btn');
  if (btn) {
    if (showBookmarksOnly) {
      btn.classList.add('bg-yellow-50', 'border-yellow-400');
      btn.innerHTML = '<i class="fas fa-star text-yellow-500 mr-1"></i>북마크만 보기 (<span id="bookmark-count">' + bookmarkedVideos.length + '</span>) ✓';
    } else {
      btn.classList.remove('bg-yellow-50', 'border-yellow-400');
      btn.innerHTML = '<i class="far fa-star text-yellow-500 mr-1"></i>북마크만 보기 (<span id="bookmark-count">' + bookmarkedVideos.length + '</span>)';
    }
  }
  
  console.log('🔄 [북마크 필터]', showBookmarksOnly ? '활성화' : '비활성화');
  
  // 필터 재적용
  applyMarketFilters();
}

// 페이지 로드 시 북마크 로드
loadBookmarks();

// 전역 함수로 노출
window.toggleBookmark = toggleBookmark;
window.toggleBookmarkFilter = toggleBookmarkFilter;

// ================================================
// Phase 5C: 탭 구조 & 검색 방식 개선
// ================================================

// 현재 활성 검색 탭
let activeSearchTab = 'keyword';

// 탭 전환 함수
function switchSearchTab(tabName) {
  console.log(`🔄 [탭 전환] ${activeSearchTab} → ${tabName}`);
  
  activeSearchTab = tabName;
  
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // 선택된 탭 활성화
  const selectedTab = document.querySelector(`[data-search-tab="${tabName}"]`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // 모든 검색 패널 숨기기
  document.querySelectorAll('.search-panel').forEach(panel => {
    panel.style.display = 'none';
  });
  
  // 선택된 패널만 표시
  const selectedPanel = document.getElementById(`search-panel-${tabName}`);
  if (selectedPanel) {
    selectedPanel.style.display = 'block';
  }
}

// 탭 클릭 이벤트 등록
document.querySelectorAll('.search-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.searchTab;
    switchSearchTab(tabName);
  });
});

// 검색 방식에 따라 쿼리 변환
function buildSearchQuery() {
  const keyword = document.getElementById('market-search-input')?.value.trim() || '';
  const searchMode = document.querySelector('input[name="search-mode"]:checked')?.value || 'keyword';
  const excludeKeywords = document.getElementById('exclude-keywords-input')?.value.trim() || '';
  
  let query = keyword;
  
  // 검색 방식 적용
  if (searchMode === 'tag' && keyword) {
    query = `${keyword}`;  // 일반 키워드 + 태그 포함
  } else if (searchMode === 'tag-only' && keyword) {
    query = keyword.split(',').map(k => k.trim()).join(' ');  // 태그만
  }
  
  // 제외 키워드 적용 (YouTube API는 - 연산자 지원)
  if (excludeKeywords) {
    const excludeList = excludeKeywords.split(',').map(k => `-${k.trim()}`).join(' ');
    query = `${query} ${excludeList}`;
  }
  
  console.log(`🔍 [검색 쿼리 생성]`, {
    original: keyword,
    mode: searchMode,
    exclude: excludeKeywords,
    final: query
  });
  
  return query;
}

// 채널 검색 함수
async function handleChannelSearch() {
  const channelInput = document.getElementById('channel-search-input')?.value.trim();
  const btn = document.getElementById('channel-search-btn');
  
  if (!channelInput) {
    alert('채널 ID 또는 URL을 입력해주세요.');
    return;
  }
  
  console.log(`🔍 [채널 검색] 입력: ${channelInput}`);
  
  // 채널 ID 추출 (@채널명 또는 URL)
  let channelId = channelInput;
  
  // @채널명 형식 처리
  if (channelInput.startsWith('@')) {
    channelId = channelInput.substring(1);
  }
  
  // URL에서 채널 ID 추출
  if (channelInput.includes('youtube.com/') || channelInput.includes('youtu.be/')) {
    const urlMatch = channelInput.match(/youtube\.com\/@([^\/\?]+)|youtube\.com\/channel\/([^\/\?]+)/);
    if (urlMatch) {
      channelId = urlMatch[1] || urlMatch[2];
    }
  }
  
  try {
    // 버튼 비활성화 & 로딩 표시
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>채널 분석 중...';
    }
    
    // 초기화
    marketVideos = [];
    filteredMarketVideos = [];
    selectedMarketVideo = null;
    
    // 로딩 표시
    showMarketLoading(true);
    
    // 채널 정보 가져오기
    console.log(`📡 [채널 정보] channelId: ${channelId}`);
    
    const channelResponse = await fetch('/api/youtube/channel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
      },
      body: JSON.stringify({ channelIdOrUrl: channelId })
    });
    
    if (!channelResponse.ok) {
      const errorData = await channelResponse.json();
      throw new Error(errorData.error?.message || '채널 정보를 가져올 수 없습니다.');
    }
    
    const channelData = await channelResponse.json();
    const actualChannelId = channelData.data?.id || channelId;
    
    console.log(`✅ [채널 정보 수신] ID: ${actualChannelId}`);
    
    // 채널 영상 가져오기 (최대 200개, 4페이지)
    let totalCollected = 0;
    let pageToken = null;
    const maxIterations = 4;
    const perPage = 50;
    
    for (let i = 0; i < maxIterations; i++) {
      console.log(`📡 [채널 영상 수집] 페이지 ${i + 1}/${maxIterations}`);
      
      const searchBody = {
        channelId: actualChannelId,
        maxResults: perPage,
        order: 'date'
      };
      
      if (pageToken) {
        searchBody.pageToken = pageToken;
      }
      
      const response = await fetch('/api/youtube/channel/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
        },
        body: JSON.stringify(searchBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `채널 영상 검색 실패 (페이지 ${i + 1})`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || '채널 영상 검색 실패');
      }
      
      const videos = result.data?.videos || [];
      marketVideos = marketVideos.concat(videos);
      totalCollected += videos.length;
      
      console.log(`✅ [페이지 ${i + 1} 수신] ${videos.length}개 수집, 총 ${totalCollected}개`);
      
      // 중간 결과 표시
      updateResultCount(totalCollected);
      
      pageToken = result.data?.nextPageToken;
      
      if (!result.data?.hasMore || totalCollected >= 200) {
        console.log(`⏹️ [수집 종료] 더 이상 결과 없음 또는 200개 도달`);
        break;
      }
    }
    
    // 성과도 계산
    marketVideos = marketVideos.map(video => ({
      ...video,
      performance: calculatePerformance(video)
    }));
    
    console.log(`🎉 [채널 검색 완료] 총 ${marketVideos.length}개 영상 수집`);
    
    // 필터 적용
    applyMarketFilters();
    
  } catch (error) {
    console.error('❌ [채널 검색 오류]', error);
    alert(`채널 검색 오류:\n${error.message}`);
    
    // 빈 상태 표시
    marketVideos = [];
    renderMarketTable([]);
    
  } finally {
    // 로딩 숨기기
    showMarketLoading(false);
    
    // 버튼 복구
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-search mr-2"></i>채널 검색';
    }
  }
}

// 카테고리 검색 함수
async function handleCategorySearch() {
  const categoryId = document.getElementById('category-search-select')?.value;
  const btn = document.getElementById('category-search-btn');
  
  if (!categoryId) {
    alert('카테고리를 선택해주세요.');
    return;
  }
  
  console.log(`🔍 [카테고리 검색] ID: ${categoryId}`);
  
  try {
    // 버튼 비활성화 & 로딩 표시
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>검색 중...';
    }
    
    // 초기화
    marketVideos = [];
    filteredMarketVideos = [];
    selectedMarketVideo = null;
    
    // 로딩 표시
    showMarketLoading(true);
    
    // 국가 필터 가져오기
    const regionCode = document.getElementById('filter-region')?.value || 'KR';
    const order = document.getElementById('filter-order')?.value || 'viewCount';
    
    console.log(`📡 [카테고리 인기 영상] categoryId: ${categoryId}, region: ${regionCode}`);
    
    // 카테고리 영상 가져오기 (최대 200개, 4페이지)
    let totalCollected = 0;
    let pageToken = null;
    const maxIterations = 4;
    const perPage = 50;
    
    for (let i = 0; i < maxIterations; i++) {
      console.log(`📡 [카테고리 영상 수집] 페이지 ${i + 1}/${maxIterations}`);
      
      const searchBody = {
        categoryId: categoryId,
        maxResults: perPage,
        order: order,
        regionCode: regionCode
      };
      
      if (pageToken) {
        searchBody.pageToken = pageToken;
      }
      
      const response = await fetch('/api/youtube/category/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
        },
        body: JSON.stringify(searchBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `카테고리 검색 실패 (페이지 ${i + 1})`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || '카테고리 검색 실패');
      }
      
      const videos = result.data?.videos || [];
      marketVideos = marketVideos.concat(videos);
      totalCollected += videos.length;
      
      console.log(`✅ [페이지 ${i + 1} 수신] ${videos.length}개 수집, 총 ${totalCollected}개`);
      
      // 중간 결과 표시
      updateResultCount(totalCollected);
      
      pageToken = result.data?.nextPageToken;
      
      if (!result.data?.hasMore || totalCollected >= 200) {
        console.log(`⏹️ [수집 종료] 더 이상 결과 없음 또는 200개 도달`);
        break;
      }
    }
    
    // 성과도 계산
    marketVideos = marketVideos.map(video => ({
      ...video,
      performance: calculatePerformance(video)
    }));
    
    console.log(`🎉 [카테고리 검색 완료] 총 ${marketVideos.length}개 영상 수집`);
    
    // 필터 적용
    applyMarketFilters();
    
  } catch (error) {
    console.error('❌ [카테고리 검색 오류]', error);
    alert(`카테고리 검색 오류:\n${error.message}`);
    
    // 빈 상태 표시
    marketVideos = [];
    renderMarketTable([]);
    
  } finally {
    // 로딩 숨기기
    showMarketLoading(false);
    
    // 버튼 복구
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-search mr-2"></i>검색';
    }
  }
}

// 채널 검색 버튼 이벤트
const channelSearchBtn = document.getElementById('channel-search-btn');
if (channelSearchBtn) {
  channelSearchBtn.addEventListener('click', handleChannelSearch);
}

// 카테고리 검색 버튼 이벤트
const categorySearchBtn = document.getElementById('category-search-btn');
if (categorySearchBtn) {
  categorySearchBtn.addEventListener('click', handleCategorySearch);
}

// 조회수 필터 드롭다운 변경 이벤트
const minViewsDropdown = document.getElementById('filter-min-views');
const minViewsCustomInput = document.getElementById('filter-min-views-custom');

if (minViewsDropdown) {
  minViewsDropdown.addEventListener('change', (e) => {
    const value = e.target.value;
    console.log(`🔄 [조회수 필터] ${value}`);
    
    // "직접 입력" 선택 시 입력 필드 표시
    if (minViewsCustomInput) {
      if (value === 'custom') {
        minViewsCustomInput.style.display = 'block';
      } else {
        minViewsCustomInput.style.display = 'none';
        minViewsCustomInput.value = '';
      }
    }
    
    // 필터 재적용
    applyMarketFilters();
  });
}

// 직접 입력 필드 디바운스
if (minViewsCustomInput) {
  let customViewsDebounce;
  minViewsCustomInput.addEventListener('input', () => {
    clearTimeout(customViewsDebounce);
    customViewsDebounce = setTimeout(() => {
      console.log(`🔄 [조회수 직접 입력] ${minViewsCustomInput.value}`);
      applyMarketFilters();
    }, 500);
  });
}

// 기존 searchMarket200 함수 수정 (쿼리 생성 로직 교체)
// 기존 함수를 덮어쓰지 않고 확장
const originalSearchMarket200 = window.searchMarket200;
if (typeof originalSearchMarket200 === 'function') {
  window.searchMarket200 = function() {
    // 검색 쿼리 생성 (검색 방식 및 제외 키워드 적용)
    const enhancedQuery = buildSearchQuery();
    
    // 원래 입력 필드에 변환된 쿼리 임시 저장
    const marketSearchInput = document.getElementById('market-search-input');
    const originalValue = marketSearchInput.value;
    
    if (enhancedQuery !== originalValue) {
      console.log(`🔄 [쿼리 변환] "${originalValue}" → "${enhancedQuery}"`);
      marketSearchInput.value = enhancedQuery;
    }
    
    // 원래 함수 호출
    return originalSearchMarket200.call(this);
  };
}

console.log('✅ [Phase 5C] 탭 구조 & 검색 개선 초기화 완료');

