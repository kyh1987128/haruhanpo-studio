/**
 * 무료 이미지 검색 모듈 v1.1
 * 왼쪽 패널 고정 영역 방식 (모달 제거)
 */
(function () {
  'use strict';

  // ── 상태 ──
  var _images = [];
  var _page = 1;
  var _keyword = '';
  var _orientation = 'landscape';
  var _hasMore = false;
  var _loading = false;
  var _rendered = false; // tabContentSearch에 HTML이 삽입되었는지

  // ── 탭 전환 공개 API ──
  window.ImageToolTabs = window.ImageToolTabs || {};
  window.ImageToolTabs.switchTab = function (tab) {
    var cs = document.getElementById('tabContentSearch');
    var ca = document.getElementById('tabContentAigen');
    var ce = document.getElementById('tabContentEditor');
    var ts = document.getElementById('tabFreeSearch');
    var ta = document.getElementById('tabAiGen');
    if (cs) cs.classList.toggle('hidden', tab !== 'search');
    if (ca) ca.classList.toggle('hidden', tab !== 'aigen');
    if (ce) ce.classList.toggle('hidden', tab !== 'editor');
    // 탭 스타일
    if (ts) {
      ts.className = tab === 'search'
        ? 'flex-1 py-1.5 px-3 text-xs font-bold rounded-full transition-all bg-purple-600 text-white'
        : 'flex-1 py-1.5 px-3 text-xs font-bold rounded-full transition-all bg-gray-200 text-gray-600 hover:bg-gray-300';
    }
    if (ta) {
      ta.className = tab === 'aigen'
        ? 'flex-1 py-1.5 px-3 text-xs font-bold rounded-full transition-all bg-purple-600 text-white'
        : 'flex-1 py-1.5 px-3 text-xs font-bold rounded-full transition-all bg-gray-200 text-gray-600 hover:bg-gray-300';
    }
  };

  // ── 공개 API ──
  window.ImageSearch = {
    open: open,
    close: function () {},
    getKeyword: function () { return _keyword; }
  };

  function open() {
    _keyword = _extractKeyword();
    if (!_keyword) {
      alert('콘텐츠를 먼저 생성해주세요.');
      return;
    }

    // 뷰어 카드 표시
    var viewer = document.getElementById('imageToolViewer');
    if (viewer) viewer.classList.remove('hidden');

    // 탭 전환
    window.ImageToolTabs.switchTab('search');

    // 내부 HTML 최초 1회 삽입
    if (!_rendered) {
      _renderSearchUI();
      _rendered = true;
    }

    document.getElementById('imgSearchKeyword').value = _keyword;

    // 이전 결과가 있으면 재사용
    if (_images.length === 0) {
      _page = 1;
      _doSearch();
    }
  }

  // ── 키워드 추출 (폴백: batchResults → keyword_N input → 빈값) ──
  function _extractKeyword() {
    if (window.batchResults && window.batchResults.length > 0) {
      var kw = window.batchResults[0].keywords;
      if (kw && (typeof kw === 'string' ? kw.trim() : '')) {
        return typeof kw === 'string' ? kw.trim().split(',')[0].trim() : kw;
      }
    }
    for (var i = 0; i < 10; i++) {
      var el = document.getElementById('keyword_' + i);
      if (el && el.value && el.value.trim()) {
        return el.value.trim().split(',')[0].trim();
      }
    }
    return '';
  }

  // ── 검색 UI 렌더링 (tabContentSearch 내부) ──
  function _renderSearchUI() {
    var container = document.getElementById('tabContentSearch');
    if (!container) return;
    container.innerHTML = '\
      <div class="p-3">\
        <div class="flex gap-1.5 mb-2">\
          <input id="imgSearchKeyword" type="text" placeholder="키워드 입력"\
                 class="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-400 focus:outline-none"\
                 onkeydown="if(event.key===\'Enter\') window.ImageSearch._newSearch()">\
          <button onclick="window.ImageSearch._newSearch()"\
                  class="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 whitespace-nowrap">\
            <i class="fas fa-search"></i>\
          </button>\
        </div>\
        <div class="flex gap-1.5 mb-3">\
          <button data-orient="landscape" class="orient-btn px-2.5 py-1 text-[10px] rounded-full border bg-white ring-2 ring-teal-500"\
                  onclick="window.ImageSearch._setOrientation(\'landscape\')">가로</button>\
          <button data-orient="portrait" class="orient-btn px-2.5 py-1 text-[10px] rounded-full border bg-white"\
                  onclick="window.ImageSearch._setOrientation(\'portrait\')">세로</button>\
          <button data-orient="squarish" class="orient-btn px-2.5 py-1 text-[10px] rounded-full border bg-white"\
                  onclick="window.ImageSearch._setOrientation(\'squarish\')">정사각</button>\
        </div>\
        <div id="imgSearchLoading" class="hidden text-center py-6">\
          <i class="fas fa-spinner fa-spin text-teal-500 text-xl"></i>\
          <p class="text-[10px] text-gray-400 mt-1">이미지 검색 중...</p>\
        </div>\
        <div id="imgSearchGrid" class="grid grid-cols-2 gap-2"></div>\
        <div class="text-center mt-2">\
          <button id="imgSearchMore" class="hidden w-full py-1.5 bg-gray-100 rounded-lg text-[10px] text-gray-500 hover:bg-gray-200 font-semibold"\
                  onclick="window.ImageSearch._loadMore()">\
            <i class="fas fa-plus mr-1"></i>더 보기\
          </button>\
        </div>\
      </div>';
  }

  // ── 검색 실행 ──
  async function _doSearch(append) {
    if (_loading) return;
    _loading = true;
    _setLoading(true);
    try {
      var res = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: _keyword, page: _page, orientation: _orientation, per_page: 8 })
      });
      var data = await res.json();
      if (data.success) {
        _images = append ? _images.concat(data.images) : data.images;
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
    var grid = document.getElementById('imgSearchGrid');
    if (!grid) return;
    if (_images.length === 0) {
      grid.innerHTML = '<p class="text-gray-400 text-[10px] text-center col-span-2 py-6">검색 결과가 없습니다</p>';
      return;
    }
    grid.innerHTML = _images.map(function (img, i) {
      return '<div class="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-100" onclick="window.ImageSearch._selectImage(' + i + ')">' +
        '<img src="' + img.thumb + '" alt="' + (img.alt || '') + '" loading="lazy" class="w-full h-24 object-cover">' +
        '<div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">' +
          '<i class="fas fa-check-circle text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity"></i>' +
        '</div>' +
        '<div class="flex justify-between items-center px-1.5 py-0.5">' +
          '<span class="text-[9px] text-gray-400 truncate flex-1">' + (img.author || '') + '</span>' +
          '<span class="text-[9px] px-1 py-0.5 rounded-full font-bold ' +
            (img.source === 'pexels' ? 'bg-green-100 text-green-600' :
             img.source === 'unsplash' ? 'bg-blue-100 text-blue-600' :
             'bg-yellow-100 text-yellow-600') + '">' + img.source + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
    var moreBtn = document.getElementById('imgSearchMore');
    if (moreBtn) moreBtn.classList.toggle('hidden', !_hasMore);
  }

  // ── 이미지 선택 → 에디터 ──
  window.ImageSearch._selectImage = function (index) {
    var img = _images[index];
    if (!img) return;
    if (window.ImageEditor) {
      window.ImageEditor.open(img.url, img.alt, _keyword, 'search');
    }
  };

  // ── 더 보기 ──
  window.ImageSearch._loadMore = function () {
    _page++;
    _doSearch(true);
  };

  // ── 새 검색 ──
  window.ImageSearch._newSearch = function () {
    var input = document.getElementById('imgSearchKeyword');
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
    document.querySelectorAll('.orient-btn').forEach(function (b) {
      b.classList.toggle('ring-2', b.dataset.orient === o);
      b.classList.toggle('ring-teal-500', b.dataset.orient === o);
    });
    _doSearch();
  };

  // ── 로딩 / 에러 ──
  function _setLoading(v) {
    var el = document.getElementById('imgSearchLoading');
    if (el) el.classList.toggle('hidden', !v);
  }
  function _showError(msg) {
    var grid = document.getElementById('imgSearchGrid');
    if (grid) grid.innerHTML = '<p class="text-red-400 text-[10px] text-center col-span-2 py-6">' + msg + '</p>';
  }

  // ── 이미지 도구 활성화 ──
  function _enableImageTools() {
    console.log('🖼️ 이미지 도구 활성화');
    var btn1 = document.getElementById('freeImageSearchBtn');
    var btn2 = document.getElementById('aiImageGenBtn');
    var hint = document.getElementById('imageToolsHint');
    if (btn1) btn1.disabled = false;
    if (btn2) btn2.disabled = false;
    if (hint) hint.style.display = 'none';
  }

  function _watchContentGeneration() {
    if (window.batchResults && window.batchResults.length > 0) {
      _enableImageTools();
    }
  }

  document.addEventListener('DOMContentLoaded', _watchContentGeneration);
})();
