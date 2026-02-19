/**
 * 슬라이드 컬렉션 모듈 v2.0
 * IndexedDB(SlideDB) 기반 — localStorage QuotaExceededError 완전 해결
 * 이벤트 기반 통신: loadToEditor, addToCollection, editFromCollection
 */
(function () {
  'use strict';

  var _slides = [];
  var _showAll = false;
  var _loaded = false;

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

  /** IndexedDB에서 로드 */
  function _load() {
    if (!window.SlideDB) {
      // 폴백: localStorage
      try {
        var raw = localStorage.getItem('slideCollection');
        _slides = raw ? JSON.parse(raw) : [];
      } catch (e) { _slides = []; }
      _loaded = true;
      return Promise.resolve();
    }
    return window.SlideDB.getAll().then(function (items) {
      _slides = items.map(function (item) {
        return {
          id: item.id,
          image: item.imageData || item.image || '',
          title: item.label || item.title || '슬라이드',
          source: item.source || 'unknown',
          timestamp: item.timestamp || new Date(item.createdAt).toLocaleTimeString('ko-KR'),
          date: item.date || new Date(item.createdAt).toLocaleDateString('ko-KR'),
          groupId: item.groupId || '',
          groupName: item.groupName || '',
          groupOrder: item.groupOrder || 0,
          groupTotal: item.groupTotal || 0,
          role: item.role || '',
          // 원본 필드 보존
          _idbId: item.id,
          _createdAt: item.createdAt,
          _updatedAt: item.updatedAt
        };
      });
      _loaded = true;
    }).catch(function (err) {
      console.warn('[SlideCollection] IndexedDB 로드 실패, 빈 배열:', err);
      _slides = [];
      _loaded = true;
    });
  }

  /** IndexedDB에 저장 */
  function _saveItem(slideObj) {
    if (!window.SlideDB) {
      // 폴백: localStorage
      try {
        var all = _slides.map(function (s) { return { id: s.id, image: s.image, title: s.title, source: s.source, timestamp: s.timestamp, date: s.date, groupId: s.groupId, groupName: s.groupName, groupOrder: s.groupOrder, groupTotal: s.groupTotal, role: s.role }; });
        localStorage.setItem('slideCollection', JSON.stringify(all));
      } catch (e) { console.warn('슬라이드 저장 실패:', e); }
      return Promise.resolve();
    }
    return window.SlideDB.add({
      id: slideObj.id,
      source: slideObj.source || 'unknown',
      label: slideObj.title || '슬라이드',
      imageData: slideObj.image,
      thumbnail: slideObj.thumbnail || '',
      createdAt: slideObj._createdAt || Date.now(),
      groupId: slideObj.groupId || '',
      groupName: slideObj.groupName || '',
      groupOrder: slideObj.groupOrder || 0,
      groupTotal: slideObj.groupTotal || 0,
      role: slideObj.role || ''
    }).catch(function (err) {
      console.error('[SlideCollection] 저장 실패:', err);
    });
  }

  /** 슬라이드 추가 */
  function add(imageUrl, title, source) {
    var doAdd = function () {
      if (!imageUrl) return;
      var newSlide = {
        id: Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        image: imageUrl,
        title: (title || '').substring(0, 50) || '슬라이드 ' + (_slides.length + 1),
        source: source || 'unknown',
        timestamp: new Date().toLocaleTimeString('ko-KR'),
        date: new Date().toLocaleDateString('ko-KR'),
        _createdAt: Date.now()
      };
      _slides.push(newSlide);
      _saveItem(newSlide);
      render();
      _showToast('✅ 장표에 추가되었습니다! (총 ' + _slides.length + '장)');

      // 이벤트 디스패치: addToCollection
      window.dispatchEvent(new CustomEvent('addToCollection', {
        detail: { id: newSlide.id, base64: imageUrl, source: source, label: title }
      }));
    };

    if (!_loaded) {
      _load().then(doAdd);
    } else {
      doAdd();
    }
  }

  function getAll() {
    // 동기 반환 (이미 로드된 상태)
    return _slides;
  }

  function render() {
    var doRender = function () {
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
          '<div class="w-full max-h-[200px] bg-gray-100 rounded-t-lg overflow-hidden flex items-center justify-center" ' +
            'onclick="window.SlideCollection.edit(' + i + ')" style="cursor:pointer">' +
            '<img src="' + s.image + '" alt="' + (s.title || '').replace(/"/g, '&quot;') + '" class="w-full h-full object-contain" loading="lazy">' +
          '</div>' +
          '<div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">' +
            '<button onclick="event.stopPropagation();window.SlideCollection.edit(' + i + ')" class="px-1 py-0.5 text-[8px] bg-white/90 text-purple-600 rounded font-bold"><i class="fas fa-edit"></i></button>' +
            '<button onclick="event.stopPropagation();window.SlideCollection.download(' + i + ')" class="px-1 py-0.5 text-[8px] bg-white/90 text-blue-600 rounded font-bold"><i class="fas fa-download"></i></button>' +
            '<button onclick="event.stopPropagation();window.SlideCollection.remove(' + i + ')" class="px-1 py-0.5 text-[8px] bg-white/90 text-red-500 rounded font-bold"><i class="fas fa-trash"></i></button>' +
          '</div>' +
          '<p class="text-[8px] text-gray-500 px-1 py-0.5 truncate">' + (s.title || '') + '</p>' +
        '</div>';
      }).join('');

      // 더보기 버튼
      var moreBtn = document.getElementById('slideCollectionMore');
      if (moreBtn) {
        moreBtn.classList.toggle('hidden', _slides.length <= 4 || _showAll);
        moreBtn.textContent = '📋 전체 ' + _slides.length + '장 보기';
      }
    };

    if (!_loaded) {
      _load().then(doRender);
    } else {
      doRender();
    }
  }

  function showAll() {
    _showAll = true;
    render();
  }

  function edit(index) {
    var doEdit = function () {
      var s = _slides[index];
      if (!s) return;
      // 이벤트 디스패치: editFromCollection
      window.dispatchEvent(new CustomEvent('editFromCollection', {
        detail: { id: s.id, base64: s.image, source: s.source, label: s.title }
      }));
      // 기존 호환: ImageEditor
      if (window.ImageEditor) {
        window.ImageEditor.open(s.image, s.title, '', 'collection');
      }
    };
    if (!_loaded) { _load().then(doEdit); } else { doEdit(); }
  }

  function download(index) {
    var doDownload = function () {
      var s = _slides[index];
      if (!s) return;
      var a = document.createElement('a');
      a.href = s.image;
      a.download = 'slide-' + (index + 1) + '-' + Date.now() + '.png';
      a.click();
    };
    if (!_loaded) { _load().then(doDownload); } else { doDownload(); }
  }

  function downloadAll() {
    var doDownloadAll = function () {
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
    };
    if (!_loaded) { _load().then(doDownloadAll); } else { doDownloadAll(); }
  }

  function remove(index) {
    var doRemove = function () {
      if (!_slides[index]) return;
      var s = _slides[index];
      _slides.splice(index, 1);

      // IndexedDB에서도 삭제
      if (window.SlideDB && s.id) {
        window.SlideDB.delete(s.id).catch(function () {});
      }

      render();
      _showToast('🗑️ "' + (s.title || '') + '" 장표가 삭제되었습니다');
    };
    if (!_loaded) { _load().then(doRemove); } else { doRemove(); }
  }

  function clearAll() {
    if (!confirm('모든 장표를 삭제하시겠습니까? (' + _slides.length + '장)')) return;

    _slides = [];
    _showAll = false;

    if (window.SlideDB) {
      window.SlideDB.clear().catch(function () {});
    }
    // localStorage 폴백도 정리
    try { localStorage.removeItem('slideCollection'); } catch (e) {}

    render();
    _showToast('🗑️ 모든 장표가 삭제되었습니다');
  }

  function _showToast(msg, isError) {
    if (window.showToast) window.showToast(msg, isError ? 'error' : 'success');
    else console.log(msg);
  }

  // 이벤트 리스너: addToCollection (외부 모듈에서 호출)
  window.addEventListener('addToCollection', function (e) {
    var d = e.detail;
    if (d && d.base64) {
      // 이미 add가 호출된 상태라면 무시 (중복 방지)
      var exists = _slides.some(function (s) { return s.id === d.id; });
      if (!exists && d._fromExternal) {
        add(d.base64, d.label, d.source);
      }
    }
  });

  // 페이지 로드 시 렌더링
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { _load().then(render); });
  } else {
    _load().then(render);
  }
})();
