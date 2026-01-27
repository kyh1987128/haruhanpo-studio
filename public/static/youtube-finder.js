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
