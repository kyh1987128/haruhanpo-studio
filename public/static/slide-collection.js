/**
 * 슬라이드 컬렉션 모듈 v1.0
 * 이미지를 장표로 수집, 관리, 일괄 다운로드
 * localStorage 키: slideCollection
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'slideCollection';
  var _slides = [];
  var _showAll = false;

  window.SlideCollection = {
    add: add,
    getAll: getAll,
    render: render,
    showAll: showAll,
    edit: edit,
    download: download,
    downloadAll: downloadAll,
    remove: remove,
    clearAll: clearAll
  };

  // 로드
  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      _slides = raw ? JSON.parse(raw) : [];
    } catch (e) {
      _slides = [];
    }
  }
  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_slides));
    } catch (e) {
      console.warn('슬라이드 저장 실패:', e);
    }
  }

  function add(imageUrl, title, source) {
    _load();
    if (!imageUrl) return;
    _slides.push({
      id: Date.now() + '_' + Math.random().toString(36).substring(7),
      image: imageUrl,
      title: (title || '').substring(0, 50) || '슬라이드 ' + (_slides.length + 1),
      source: source || 'unknown',
      timestamp: new Date().toLocaleTimeString('ko-KR'),
      date: new Date().toLocaleDateString('ko-KR')
    });
    _save();
    render();
    _showToast('✅ 장표에 추가되었습니다! (총 ' + _slides.length + '장)');
  }

  function getAll() {
    _load();
    return _slides;
  }

  function render() {
    _load();
    var container = document.getElementById('slideCollectionPanel');
    if (!container) return;

    var countEl = document.getElementById('slideCollectionCount');
    if (countEl) countEl.textContent = _slides.length;

    var grid = document.getElementById('slideCollectionGrid');
    if (!grid) return;

    if (_slides.length === 0) {
      grid.innerHTML = '<div class="col-span-2 text-center py-4 text-gray-400">' +
        '<i class="fas fa-layer-group text-2xl mb-1 opacity-30"></i>' +
        '<p class="text-[10px]">수집한 장표가 없습니다</p>' +
        '<p class="text-[9px]">이미지 검색/생성 후 "+ 장표 추가" 버튼을 눌러보세요</p></div>';
      return;
    }

    var displaySlides = _showAll ? _slides : _slides.slice(0, 4);
    grid.innerHTML = displaySlides.map(function (s, i) {
      return '<div class="relative group rounded-lg overflow-hidden border border-gray-200 bg-white">' +
        '<img src="' + s.image + '" alt="' + s.title + '" class="w-full h-20 object-cover cursor-pointer" onclick="window.SlideCollection.edit(' + i + ')">' +
        '<div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">' +
          '<button onclick="event.stopPropagation();window.SlideCollection.edit(' + i + ')" class="px-1 py-0.5 text-[8px] bg-white/90 text-purple-600 rounded font-bold"><i class="fas fa-edit"></i></button>' +
          '<button onclick="event.stopPropagation();window.SlideCollection.download(' + i + ')" class="px-1 py-0.5 text-[8px] bg-white/90 text-blue-600 rounded font-bold"><i class="fas fa-download"></i></button>' +
          '<button onclick="event.stopPropagation();window.SlideCollection.remove(' + i + ')" class="px-1 py-0.5 text-[8px] bg-white/90 text-red-500 rounded font-bold"><i class="fas fa-trash"></i></button>' +
        '</div>' +
        '<p class="text-[8px] text-gray-500 px-1 py-0.5 truncate">' + s.title + '</p>' +
      '</div>';
    }).join('');

    // 더보기 버튼
    var moreBtn = document.getElementById('slideCollectionMore');
    if (moreBtn) {
      moreBtn.classList.toggle('hidden', _slides.length <= 4 || _showAll);
      moreBtn.textContent = '📋 전체 ' + _slides.length + '장 보기';
    }
  }

  function showAll() {
    _showAll = true;
    render();
  }

  function edit(index) {
    _load();
    var s = _slides[index];
    if (!s) return;
    if (window.ImageEditor) {
      window.ImageEditor.open(s.image, s.title, '', 'collection');
    }
  }

  function download(index) {
    _load();
    var s = _slides[index];
    if (!s) return;
    var a = document.createElement('a');
    a.href = s.image;
    a.download = 'slide-' + (index + 1) + '-' + Date.now() + '.png';
    a.click();
  }

  function downloadAll() {
    _load();
    if (_slides.length === 0) {
      _showToast('다운로드할 장표가 없습니다', true);
      return;
    }
    _showToast('⏳ ' + _slides.length + '장의 장표를 다운로드합니다...');
    _slides.forEach(function (s, i) {
      setTimeout(function () {
        var a = document.createElement('a');
        a.href = s.image;
        a.download = 'slide-' + (i + 1) + '-' + Date.now() + '.png';
        a.click();
      }, i * 500);
    });
  }

  function remove(index) {
    _load();
    if (!_slides[index]) return;
    var title = _slides[index].title;
    _slides.splice(index, 1);
    _save();
    render();
    _showToast('🗑️ "' + title + '" 장표가 삭제되었습니다');
  }

  function clearAll() {
    if (!confirm('모든 장표를 삭제하시겠습니까? (' + _slides.length + '장)')) return;
    _slides = [];
    _save();
    _showAll = false;
    render();
    _showToast('🗑️ 모든 장표가 삭제되었습니다');
  }

  function _showToast(msg, isError) {
    if (window.showToast) window.showToast(msg, isError ? 'error' : 'success');
    else alert(msg);
  }

  // 페이지 로드 시 렌더링
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { render(); });
  } else {
    setTimeout(function() { render(); }, 500);
  }
})();
