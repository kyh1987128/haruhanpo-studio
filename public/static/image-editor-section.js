/**
 * 이미지 에디터 섹션 v1.0
 * 좌측 패널 Section 2 — 이미지 도구에서 열린 결과를 편집
 * 이벤트: loadToEditor, addToCollection, editFromCollection
 */
(function () {
  'use strict';

  var _currentImage = null;  // { base64, source, label, thumbnail, id }
  var _sectionEl = null;

  window.ImageEditorSection = {
    init: init,
    loadImage: loadImage,
    clear: clear,
    getCurrentImage: function () { return _currentImage; }
  };

  function init() {
    _sectionEl = document.getElementById('imageEditorSection');
    if (!_sectionEl) return;

    // 이벤트 리스너: 에디터로 로드
    window.addEventListener('loadToEditor', function (e) {
      if (e.detail && e.detail.base64) {
        loadImage(e.detail);
      }
    });

    // 이벤트 리스너: 컬렉션에서 편집
    window.addEventListener('editFromCollection', function (e) {
      if (e.detail && e.detail.base64) {
        loadImage(e.detail);
        _expand();
      }
    });

    console.log('[ImageEditorSection] 초기화 완료');
  }

  function loadImage(data) {
    _currentImage = {
      base64: data.base64 || '',
      source: data.source || 'unknown',
      label: data.label || '이미지',
      thumbnail: data.thumbnail || '',
      id: data.id || ''
    };

    _render();
    _expand();
  }

  function clear() {
    _currentImage = null;
    _render();
  }

  function _expand() {
    if (!_sectionEl) return;
    _sectionEl.classList.remove('hidden');
    // 부드러운 스크롤
    _sectionEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function _render() {
    var container = document.getElementById('editorSectionContent');
    if (!container) return;

    if (!_currentImage || !_currentImage.base64) {
      container.innerHTML =
        '<div class="text-center py-6 text-gray-400">' +
          '<i class="fas fa-image text-3xl mb-2 opacity-30"></i>' +
          '<p class="text-xs">이미지를 선택하면 여기에 표시됩니다</p>' +
          '<p class="text-[9px]">이미지 도구 또는 장표 컬렉션에서 선택하세요</p>' +
        '</div>';
      return;
    }

    container.innerHTML =
      '<div class="relative">' +
        // 이미지 미리보기
        '<div class="w-full max-h-[300px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center mb-2">' +
          '<img src="' + _currentImage.base64 + '" class="w-full h-full object-contain" id="editorPreviewImg">' +
        '</div>' +
        // 라벨
        '<p class="text-xs text-gray-500 mb-2 truncate">' +
          '<span class="inline-block px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded text-[9px] font-bold mr-1">' + (_currentImage.source || '') + '</span>' +
          (_currentImage.label || '') +
        '</p>' +
        // 액션 버튼
        '<div class="flex gap-1.5">' +
          '<button onclick="ImageEditorSection._openEditor()" class="flex-1 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 transition">' +
            '<i class="fas fa-edit mr-1"></i>편집' +
          '</button>' +
          '<button onclick="ImageEditorSection._addToCollection()" class="flex-1 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition">' +
            '<i class="fas fa-plus mr-1"></i>장표 추가' +
          '</button>' +
          '<button onclick="ImageEditorSection._download()" class="py-1.5 px-3 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300 transition">' +
            '<i class="fas fa-download"></i>' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  // 내부 메서드 (window에 노출)
  window.ImageEditorSection._openEditor = function () {
    if (!_currentImage) return;
    if (window.ImageEditor) {
      window.ImageEditor.open(_currentImage.base64, _currentImage.label, '', _currentImage.source);
    }
  };

  window.ImageEditorSection._addToCollection = function () {
    if (!_currentImage) return;
    if (window.SlideCollection) {
      window.SlideCollection.add(_currentImage.base64, _currentImage.label, _currentImage.source);
    }
  };

  window.ImageEditorSection._download = function () {
    if (!_currentImage) return;
    var a = document.createElement('a');
    a.href = _currentImage.base64;
    a.download = 'image-' + Date.now() + '.png';
    a.click();
  };

  // DOMContentLoaded에서 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
})();
