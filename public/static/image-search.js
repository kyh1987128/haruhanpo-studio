/**
 * 무료 이미지 검색 모듈 v1.5
 * 버튼 항상 활성 / 키워드 4단계 우선순위 / 썸네일 탭 지원
 */
(function () {
  'use strict';

  var _images = [];
  var _page = 1;
  var _keyword = '';
  var _hasMore = false;
  var _loading = false;
  var _rendered = false;

  // ── 탭 전환 공개 API (search / aigen / thumbnail / editor) ──
  window.ImageToolTabs = window.ImageToolTabs || {};
  window.ImageToolTabs.switchTab = function (tab) {
    var cs = document.getElementById('tabContentSearch');
    var ca = document.getElementById('tabContentAigen');
    var ct = document.getElementById('tabContentThumbnail');
    var ce = document.getElementById('tabContentEditor');
    if (cs) cs.classList.toggle('hidden', tab !== 'search');
    if (ca) ca.classList.toggle('hidden', tab !== 'aigen');
    if (ct) ct.classList.toggle('hidden', tab !== 'thumbnail');
    if (ce) ce.classList.toggle('hidden', tab !== 'editor');
    // AI 생성 로딩 상태 초기화
    if (tab !== 'aigen') {
      var genBtn = document.getElementById('aiGenBtn');
      if (genBtn) { genBtn.disabled = false; genBtn.style.opacity = '1'; genBtn.style.cursor = 'pointer'; }
    }
    // 상단 큰 버튼 활성 상태 표시
    var btn1 = document.getElementById('freeImageSearchBtn');
    var btn2 = document.getElementById('aiImageGenBtn');
    var btn3 = document.getElementById('aiThumbnailGenBtn');
    if (btn1) { btn1.classList.toggle('ring-2', tab === 'search'); btn1.classList.toggle('ring-teal-400', tab === 'search'); }
    if (btn2) { btn2.classList.toggle('ring-2', tab === 'aigen'); btn2.classList.toggle('ring-purple-400', tab === 'aigen'); }
    if (btn3) { btn3.classList.toggle('ring-2', tab === 'thumbnail'); btn3.classList.toggle('ring-pink-400', tab === 'thumbnail'); }
  };

  // ── 공개 API ──
  window.ImageSearch = {
    open: open,
    close: function () {},
    getKeyword: function () { return _keyword; }
  };

  function open() {
    _keyword = _extractKeyword();

    // 뷰어 카드 표시
    var viewer = document.getElementById('imageToolViewer');
    if (viewer) viewer.classList.remove('hidden');

    window.ImageToolTabs.switchTab('search');

    if (!_rendered) { _renderSearchUI(); _rendered = true; }

    var kwInput = document.getElementById('imgSearchKeyword');
    if (kwInput) kwInput.value = _keyword;

    // 키워드 있을 때만 자동 검색
    if (_keyword && _images.length === 0) {
      _page = 1;
      _doSearch();
    }
  }

  // ── 키워드 추출 4단계 우선순위 ──
  function _extractKeyword() {
    // 1순위: window.batchResults (방금 생성한 콘텐츠)
    if (window.batchResults && window.batchResults.length > 0) {
      var kw = window.batchResults[0].keywords;
      if (kw && (typeof kw === 'string' ? kw.trim() : '')) {
        return typeof kw === 'string' ? kw.trim().split(',')[0].trim() : kw;
      }
    }
    // 2순위: 화면에 표시 중인 히스토리 콘텐츠의 키워드/제목
    var historyKw = document.querySelector('[data-history-keyword]');
    if (historyKw && historyKw.getAttribute('data-history-keyword')) {
      return historyKw.getAttribute('data-history-keyword').trim().split(',')[0].trim();
    }
    var historyTitle = document.querySelector('.history-content-title');
    if (historyTitle && historyTitle.textContent && historyTitle.textContent.trim()) {
      return historyTitle.textContent.trim().substring(0, 30);
    }
    // 3순위: 왼쪽 패널 키워드 입력란
    for (var i = 0; i < 10; i++) {
      var el = document.getElementById('keyword_' + i);
      if (el && el.value && el.value.trim()) {
        return el.value.trim().split(',')[0].trim();
      }
    }
    // 4순위: 빈 문자열 (검색어 직접 입력)
    return '';
  }

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
        <div id="imgSearchLoading" class="hidden text-center py-6">\
          <i class="fas fa-spinner fa-spin text-teal-500 text-xl"></i>\
          <p class="text-[10px] text-gray-400 mt-1">이미지 검색 중...</p>\
        </div>\
        <div id="imgSearchGrid" class="grid grid-cols-2 gap-2"></div>\
        <div class="text-center mt-3">\
          <button id="imgSearchMore" class="hidden w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-400 hover:text-purple-500 transition-colors"\
                  onclick="window.ImageSearch._loadMore()">\
            📷 더 많은 이미지 보기\
          </button>\
        </div>\
      </div>';
  }

  async function _doSearch(append) {
    if (_loading || !_keyword) return;
    _loading = true;
    _setLoading(true);
    try {
      var res = await fetch('/api/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: _keyword, page: _page })
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
        '<button onclick="event.stopPropagation();window.SlideCollection && window.SlideCollection.add(\'' + img.url.replace(/'/g, "\\'") + '\',\'' + (img.alt || '').replace(/'/g, "\\'").substring(0, 30) + '\',\'search\')" class="absolute top-1 right-1 px-1 py-0.5 text-[8px] bg-indigo-500/80 text-white rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-600">+ 장표</button>' +
      '</div>';
    }).join('');
    var moreBtn = document.getElementById('imgSearchMore');
    if (moreBtn) {
      moreBtn.classList.toggle('hidden', !_hasMore);
      moreBtn.textContent = '📷 더 많은 이미지 보기';
      moreBtn.disabled = false;
    }
  }

  window.ImageSearch._selectImage = function (index) {
    var img = _images[index];
    if (!img) return;
    if (window.ImageEditor) {
      window.ImageEditor.open(img.url, img.alt, _keyword, 'search');
    }
  };

  window.ImageSearch._loadMore = function () {
    _page++;
    var btn = document.getElementById('imgSearchMore');
    if (btn) { btn.textContent = '로딩 중...'; btn.disabled = true; }
    _doSearch(true);
  };

  window.ImageSearch._newSearch = function () {
    var input = document.getElementById('imgSearchKeyword');
    if (input && input.value.trim()) {
      _keyword = input.value.trim();
      _page = 1;
      _images = [];
      _doSearch();
    }
  };

  function _setLoading(v) {
    var el = document.getElementById('imgSearchLoading');
    if (el) el.classList.toggle('hidden', !v);
  }
  function _showError(msg) {
    var grid = document.getElementById('imgSearchGrid');
    if (grid) grid.innerHTML = '<p class="text-red-400 text-[10px] text-center col-span-2 py-6">' + msg + '</p>';
  }
})();
