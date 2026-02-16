/**
 * 무료 이미지 검색 모듈
 * Pexels / Unsplash / Pixabay 통합 검색
 */
(function () {
  'use strict';

  // ── 상태 ──
  let _images = [];
  let _page = 1;
  let _keyword = '';
  let _orientation = 'landscape';
  let _hasMore = false;
  let _loading = false;
  let _modalEl = null;

  // ── 공개 API ──
  window.ImageSearch = {
    open: open,
    close: close,
    getKeyword: () => _keyword
  };

  function open() {
    // 키워드 자동 추출
    _keyword = _extractKeyword();
    if (!_keyword) {
      alert('콘텐츠를 먼저 생성해주세요.');
      return;
    }

    if (!_modalEl) _createModal();
    _modalEl.classList.remove('hidden');
    document.getElementById('imgSearchKeyword').value = _keyword;

    // 이전 결과가 있으면 재사용
    if (_images.length === 0) {
      _page = 1;
      _doSearch();
    }
  }

  function close() {
    if (_modalEl) _modalEl.classList.add('hidden');
  }

  // ── 키워드 추출 (폴백 순서: batchResults → keyword_N input → 빈값) ──
  function _extractKeyword() {
    // 1) batchResults에서 추출 (일괄 생성 완료 시)
    if (window.batchResults && window.batchResults.length > 0) {
      const kw = window.batchResults[0].keywords;
      if (kw && (typeof kw === 'string' ? kw.trim() : '')) {
        return typeof kw === 'string' ? kw.trim().split(',')[0].trim() : kw;
      }
    }
    // 2) 콘텐츠 블록의 키워드 입력 필드에서 직접 가져오기 (단일 생성 시)
    for (let i = 0; i < 10; i++) {
      const el = document.getElementById('keyword_' + i);
      if (el && el.value && el.value.trim()) {
        return el.value.trim().split(',')[0].trim();
      }
    }
    return '';
  }

  // ── 검색 실행 ──
  async function _doSearch(append) {
    if (_loading) return;
    _loading = true;
    _setLoading(true);

    try {
      const res = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: _keyword,
          page: _page,
          orientation: _orientation,
          per_page: 8
        })
      });

      const data = await res.json();

      if (data.success) {
        if (append) {
          _images = _images.concat(data.images);
        } else {
          _images = data.images;
        }
        _hasMore = data.hasMore;
        _renderGrid();
      } else {
        _showError(data.error || '검색 실패');
      }
    } catch (e) {
      _showError('네트워크 오류가 발생했습니다');
      console.error('이미지 검색 오류:', e);
    } finally {
      _loading = false;
      _setLoading(false);
    }
  }

  // ── 그리드 렌더링 ──
  function _renderGrid() {
    const grid = document.getElementById('imgSearchGrid');
    if (!grid) return;

    if (_images.length === 0) {
      grid.innerHTML = '<p class="text-gray-400 text-sm text-center col-span-2 py-8">검색 결과가 없습니다</p>';
      return;
    }

    grid.innerHTML = _images.map((img, i) => `
      <div class="img-search-card" onclick="window.ImageSearch._selectImage(${i})">
        <img src="${img.thumb}" alt="${img.alt}" loading="lazy"
             class="w-full h-32 object-cover rounded-lg cursor-pointer">
        <div class="flex justify-between items-center mt-1 px-1">
          <span class="text-[10px] text-gray-400 truncate flex-1">${img.author}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold
            ${img.source === 'pexels' ? 'bg-green-100 text-green-600' :
              img.source === 'unsplash' ? 'bg-blue-100 text-blue-600' :
              'bg-yellow-100 text-yellow-600'}">${img.source}</span>
        </div>
      </div>
    `).join('');

    // 더 보기 버튼
    const moreBtn = document.getElementById('imgSearchMore');
    if (moreBtn) moreBtn.classList.toggle('hidden', !_hasMore);
  }

  // ── 이미지 선택 → 에디터 열기 ──
  window.ImageSearch._selectImage = function (index) {
    const img = _images[index];
    if (!img) return;
    // 에디터로 전달
    if (window.ImageEditor) {
      window.ImageEditor.open(img.url, img.alt, _keyword);
    }
  };

  // ── 더 보기 ──
  window.ImageSearch._loadMore = function () {
    _page++;
    _doSearch(true);
  };

  // ── 새 검색 ──
  window.ImageSearch._newSearch = function () {
    const input = document.getElementById('imgSearchKeyword');
    if (input && input.value.trim()) {
      _keyword = input.value.trim();
      _page = 1;
      _images = [];
      _doSearch();
    }
  };

  // ── orientation 변경 ──
  window.ImageSearch._setOrientation = function (o) {
    _orientation = o;
    _page = 1;
    _images = [];
    // 버튼 활성 상태
    document.querySelectorAll('.orient-btn').forEach(b => {
      b.classList.toggle('ring-2', b.dataset.orient === o);
      b.classList.toggle('ring-teal-500', b.dataset.orient === o);
    });
    _doSearch();
  };

  // ── 로딩 / 에러 ──
  function _setLoading(v) {
    const el = document.getElementById('imgSearchLoading');
    if (el) el.classList.toggle('hidden', !v);
  }
  function _showError(msg) {
    const grid = document.getElementById('imgSearchGrid');
    if (grid) grid.innerHTML = `<p class="text-red-400 text-sm text-center col-span-2 py-8">${msg}</p>`;
  }

  // ── 모달 생성 ──
  function _createModal() {
    _modalEl = document.createElement('div');
    _modalEl.id = 'imageSearchModal';
    _modalEl.className = 'hidden fixed inset-0 z-[9999] flex items-center justify-center bg-black/50';
    _modalEl.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <!-- 헤더 -->
        <div class="flex items-center justify-between px-5 py-3 border-b">
          <h3 class="font-bold text-gray-800 flex items-center gap-2">
            <i class="fas fa-images text-teal-500"></i> 무료 이미지 찾기
          </h3>
          <button onclick="window.ImageSearch.close()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <!-- 검색바 -->
        <div class="px-5 py-3 border-b bg-gray-50">
          <div class="flex gap-2">
            <input id="imgSearchKeyword" type="text" placeholder="키워드 입력"
                   class="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                   onkeydown="if(event.key==='Enter') window.ImageSearch._newSearch()">
            <button onclick="window.ImageSearch._newSearch()"
                    class="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-bold hover:bg-teal-600">
              <i class="fas fa-search mr-1"></i>검색
            </button>
          </div>
          <!-- 방향 필터 -->
          <div class="flex gap-2 mt-2">
            <button data-orient="landscape" class="orient-btn px-3 py-1 text-xs rounded-full border bg-white ring-2 ring-teal-500"
                    onclick="window.ImageSearch._setOrientation('landscape')">가로</button>
            <button data-orient="portrait" class="orient-btn px-3 py-1 text-xs rounded-full border bg-white"
                    onclick="window.ImageSearch._setOrientation('portrait')">세로</button>
            <button data-orient="squarish" class="orient-btn px-3 py-1 text-xs rounded-full border bg-white"
                    onclick="window.ImageSearch._setOrientation('squarish')">정사각</button>
          </div>
        </div>

        <!-- 그리드 -->
        <div class="flex-1 overflow-y-auto px-5 py-3">
          <div id="imgSearchLoading" class="hidden text-center py-8">
            <i class="fas fa-spinner fa-spin text-teal-500 text-2xl"></i>
            <p class="text-sm text-gray-400 mt-2">이미지 검색 중...</p>
          </div>
          <div id="imgSearchGrid" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>
          <div class="text-center mt-3">
            <button id="imgSearchMore" class="hidden px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200"
                    onclick="window.ImageSearch._loadMore()">
              <i class="fas fa-plus mr-1"></i>더 보기
            </button>
          </div>
        </div>
      </div>
    `;
    _modalEl.addEventListener('click', (e) => {
      if (e.target === _modalEl) close();
    });
    document.body.appendChild(_modalEl);
  }

  // ── 이미지 도구 활성화 (폴링 체크 방식) ──
  function _watchContentGeneration() {
    // 페이지 로드 시 이미 결과가 있으면 즉시 활성화
    if (window.batchResults && window.batchResults.length > 0) {
      _enableImageTools();
    }
  }

  function _enableImageTools() {
    console.log('🖼️ 이미지 도구 활성화');
    const btn1 = document.getElementById('freeImageSearchBtn');
    const btn2 = document.getElementById('aiImageGenBtn');
    const hint = document.getElementById('imageToolsHint');
    if (btn1) btn1.disabled = false;
    if (btn2) btn2.disabled = false;
    if (hint) hint.style.display = 'none';
  }

  // 초기화
  document.addEventListener('DOMContentLoaded', _watchContentGeneration);
})();
