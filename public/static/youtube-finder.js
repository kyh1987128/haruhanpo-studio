// ========================================
// YouTube Finder - Phase 2 검색 기능
// ========================================

console.log('🚀 [YouTube Finder] 스크립트 로드');

// 전역 상태
let selectedVideos = new Set();
let currentSearchResults = [];

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

    // 결과 저장
    currentSearchResults = result.data.videos;

    // 테이블 업데이트
    updateVideoTable(currentSearchResults);

    // 요약 업데이트
    updateResultsSummary(currentSearchResults.length, 0);

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
// 7. AI 분석 시작 버튼
// ========================================

function handleAnalyzeSelected() {
  if (selectedVideos.size === 0) {
    alert('분석할 영상을 선택해주세요.');
    return;
  }

  const videoIds = Array.from(selectedVideos);
  console.log('🚀 AI 분석 시작:', videoIds);

  // Phase 3에서 구현 예정
  alert(`선택한 ${videoIds.length}개 영상의 AI 분석 기능은 Phase 3에서 구현됩니다.`);
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

  console.log('✅ [YouTube Finder] 모든 이벤트 리스너 등록 완료');
});
