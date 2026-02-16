/**
 * 이미지 크롭 + 텍스트 오버레이 에디터
 * Cropper.js 기반
 */
(function () {
  'use strict';

  // ── 상태 ──
  let _cropper = null;
  let _modalEl = null;
  let _imageUrl = '';
  let _imageAlt = '';
  let _keyword = '';
  let _textOverlays = [];
  let _activeOverlayIndex = -1;
  let _aspectRatio = NaN; // free crop
  let _dragging = false;
  let _dragOffset = { x: 0, y: 0 };

  // ── 공개 API ──
  window.ImageEditor = {
    open: open,
    close: close
  };

  function open(imageUrl, alt, keyword) {
    _imageUrl = imageUrl;
    _imageAlt = alt || '';
    _keyword = keyword || '';
    _textOverlays = [];
    _activeOverlayIndex = -1;

    if (!_modalEl) _createModal();
    _modalEl.classList.remove('hidden');

    // Cropper 초기화
    setTimeout(() => {
      _initCropper();
    }, 100);
  }

  function close() {
    if (_cropper) {
      _cropper.destroy();
      _cropper = null;
    }
    if (_modalEl) _modalEl.classList.add('hidden');
  }

  // ── Cropper 초기화 ──
  function _initCropper() {
    const img = document.getElementById('editorImage');
    if (!img) return;

    // 이전 cropper 제거
    if (_cropper) {
      _cropper.destroy();
      _cropper = null;
    }

    img.src = _imageUrl;
    img.onload = function () {
      _cropper = new Cropper(img, {
        viewMode: 1,
        dragMode: 'move',
        aspectRatio: _aspectRatio,
        autoCropArea: 0.9,
        background: true,
        responsive: true,
        restore: false,
        guides: true,
        center: true,
        highlight: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false
      });
    };
  }

  // ── 비율 변경 ──
  window.ImageEditor._setRatio = function (ratio) {
    // 버튼 활성 상태
    document.querySelectorAll('.ratio-btn').forEach(b => {
      b.classList.toggle('ring-2', b.dataset.ratio === ratio);
      b.classList.toggle('ring-purple-500', b.dataset.ratio === ratio);
      b.classList.toggle('bg-purple-50', b.dataset.ratio === ratio);
    });

    const ratioMap = {
      'free': NaN,
      '1:1': 1,
      '4:5': 4 / 5,
      '16:9': 16 / 9,
      '9:16': 9 / 16
    };
    _aspectRatio = ratioMap[ratio] || NaN;
    if (_cropper) {
      _cropper.setAspectRatio(_aspectRatio);
    }
  };

  // ── 텍스트 추가 ──
  window.ImageEditor._addText = function () {
    // 기본 텍스트: 키워드 or 콘텐츠 제목에서 추출
    let defaultText = _keyword || _imageAlt || '텍스트를 입력하세요';

    // batchResults에서 제목/훅 추출 시도
    if (window.batchResults && window.batchResults.length > 0) {
      const firstResult = window.batchResults[0];
      if (firstResult.data) {
        const firstPlatformContent = Object.values(firstResult.data)[0];
        if (typeof firstPlatformContent === 'string') {
          // 첫 줄을 제목으로 사용
          const lines = firstPlatformContent.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            defaultText = lines[0].replace(/^[#*\-\s]+/, '').substring(0, 30);
          }
        }
      }
    }

    _textOverlays.push({
      text: defaultText,
      fontSize: 24,
      color: '#ffffff',
      x: 50,  // % 기준
      y: 50,
      shadow: true
    });

    _activeOverlayIndex = _textOverlays.length - 1;
    _renderTextControls();
    _renderTextPreview();
  };

  // ── 텍스트 컨트롤 렌더링 ──
  function _renderTextControls() {
    const panel = document.getElementById('editorTextPanel');
    if (!panel) return;

    if (_textOverlays.length === 0) {
      panel.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">텍스트를 추가하려면 아래 버튼을 클릭하세요</p>';
      return;
    }

    const overlay = _textOverlays[_activeOverlayIndex] || _textOverlays[0];
    const idx = _activeOverlayIndex >= 0 ? _activeOverlayIndex : 0;

    panel.innerHTML = `
      <div class="space-y-2">
        <input type="text" value="${overlay.text}" 
               onchange="window.ImageEditor._updateText(${idx}, 'text', this.value)"
               class="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
               placeholder="텍스트 입력">
        <div class="flex gap-2 items-center">
          <label class="text-[10px] text-gray-500 w-8">크기</label>
          <input type="range" min="12" max="72" value="${overlay.fontSize}"
                 onchange="window.ImageEditor._updateText(${idx}, 'fontSize', parseInt(this.value))"
                 class="flex-1 h-1.5 accent-purple-500">
          <span class="text-[10px] text-gray-400 w-6">${overlay.fontSize}</span>
        </div>
        <div class="flex gap-2 items-center">
          <label class="text-[10px] text-gray-500 w-8">색상</label>
          <div class="flex gap-1.5">
            <button onclick="window.ImageEditor._updateText(${idx}, 'color', '#ffffff')"
                    class="w-6 h-6 rounded-full bg-white border-2 ${overlay.color === '#ffffff' ? 'border-purple-500' : 'border-gray-300'}"></button>
            <button onclick="window.ImageEditor._updateText(${idx}, 'color', '#000000')"
                    class="w-6 h-6 rounded-full bg-black border-2 ${overlay.color === '#000000' ? 'border-purple-500' : 'border-gray-300'}"></button>
            <button onclick="window.ImageEditor._updateText(${idx}, 'color', '#ef4444')"
                    class="w-6 h-6 rounded-full bg-red-500 border-2 ${overlay.color === '#ef4444' ? 'border-purple-500' : 'border-gray-300'}"></button>
            <button onclick="window.ImageEditor._updateText(${idx}, 'color', '#3b82f6')"
                    class="w-6 h-6 rounded-full bg-blue-500 border-2 ${overlay.color === '#3b82f6' ? 'border-purple-500' : 'border-gray-300'}"></button>
            <button onclick="window.ImageEditor._updateText(${idx}, 'color', '#fbbf24')"
                    class="w-6 h-6 rounded-full bg-yellow-400 border-2 ${overlay.color === '#fbbf24' ? 'border-purple-500' : 'border-gray-300'}"></button>
            <input type="color" value="${overlay.color}" 
                   onchange="window.ImageEditor._updateText(${idx}, 'color', this.value)"
                   class="w-6 h-6 rounded cursor-pointer border-0 p-0">
          </div>
        </div>
        <div class="flex gap-2 items-center">
          <label class="text-[10px] text-gray-500 w-8">그림자</label>
          <input type="checkbox" ${overlay.shadow ? 'checked' : ''} 
                 onchange="window.ImageEditor._updateText(${idx}, 'shadow', this.checked)"
                 class="accent-purple-500">
          <span class="text-[10px] text-gray-400">텍스트 그림자</span>
          <button onclick="window.ImageEditor._removeText(${idx})"
                  class="ml-auto px-2 py-0.5 text-[10px] bg-red-100 text-red-500 rounded hover:bg-red-200">
            <i class="fas fa-trash mr-1"></i>삭제
          </button>
        </div>
        <p class="text-[9px] text-gray-400"><i class="fas fa-arrows-alt mr-1"></i>프리뷰에서 텍스트를 드래그하여 위치를 조정할 수 있습니다</p>
      </div>
    `;
  }

  // ── 텍스트 프리뷰 (크롭 영역 위) ──
  function _renderTextPreview() {
    let previewContainer = document.getElementById('editorTextPreview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    _textOverlays.forEach((overlay, i) => {
      const el = document.createElement('div');
      el.className = 'editor-text-overlay';
      el.style.cssText = `
        position: absolute;
        left: ${overlay.x}%;
        top: ${overlay.y}%;
        transform: translate(-50%, -50%);
        font-size: ${overlay.fontSize}px;
        color: ${overlay.color};
        font-weight: bold;
        cursor: move;
        user-select: none;
        pointer-events: auto;
        z-index: 10;
        white-space: nowrap;
        ${overlay.shadow ? `text-shadow: 2px 2px 4px rgba(0,0,0,0.7), -1px -1px 2px rgba(0,0,0,0.3);` : ''}
        ${_activeOverlayIndex === i ? 'outline: 2px dashed rgba(147, 51, 234, 0.7); outline-offset: 4px;' : ''}
      `;
      el.textContent = overlay.text;
      el.dataset.index = i;

      // 드래그 이벤트
      el.addEventListener('mousedown', (e) => _startDrag(e, i));
      el.addEventListener('touchstart', (e) => _startDrag(e, i), { passive: false });

      previewContainer.appendChild(el);
    });
  }

  // ── 드래그 ──
  function _startDrag(e, index) {
    e.preventDefault();
    _dragging = true;
    _activeOverlayIndex = index;

    const rect = document.getElementById('editorTextPreview').getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    _dragOffset.x = clientX - rect.left;
    _dragOffset.y = clientY - rect.top;

    const onMove = (ev) => {
      if (!_dragging) return;
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const x = ((cx - rect.left) / rect.width) * 100;
      const y = ((cy - rect.top) / rect.height) * 100;
      _textOverlays[index].x = Math.max(5, Math.min(95, x));
      _textOverlays[index].y = Math.max(5, Math.min(95, y));
      _renderTextPreview();
    };

    const onUp = () => {
      _dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      _renderTextControls();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  // ── 텍스트 속성 업데이트 ──
  window.ImageEditor._updateText = function (idx, prop, value) {
    if (_textOverlays[idx]) {
      _textOverlays[idx][prop] = value;
      _renderTextControls();
      _renderTextPreview();
    }
  };

  window.ImageEditor._removeText = function (idx) {
    _textOverlays.splice(idx, 1);
    _activeOverlayIndex = _textOverlays.length > 0 ? 0 : -1;
    _renderTextControls();
    _renderTextPreview();
  };

  // ── 다운로드 (Canvas 합성) ──
  window.ImageEditor._download = function () {
    if (!_cropper) {
      alert('이미지를 먼저 로드해주세요');
      return;
    }

    // 크롭된 캔버스 가져오기
    const croppedCanvas = _cropper.getCroppedCanvas({
      maxWidth: 2048,
      maxHeight: 2048,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    if (!croppedCanvas) {
      alert('크롭 영역을 선택해주세요');
      return;
    }

    const ctx = croppedCanvas.getContext('2d');
    const w = croppedCanvas.width;
    const h = croppedCanvas.height;

    // 텍스트 오버레이 그리기
    _textOverlays.forEach((overlay) => {
      const x = (overlay.x / 100) * w;
      const y = (overlay.y / 100) * h;
      const fontSize = Math.round(overlay.fontSize * (w / 600)); // 상대 크기

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fontSize}px "Noto Sans KR", sans-serif`;

      if (overlay.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = fontSize * 0.15;
        ctx.shadowOffsetX = fontSize * 0.05;
        ctx.shadowOffsetY = fontSize * 0.05;
      }

      ctx.fillStyle = overlay.color;
      ctx.fillText(overlay.text, x, y);

      // 그림자 리셋
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });

    // 다운로드
    croppedCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // ── 뒤로가기 ──
  window.ImageEditor._back = function () {
    close();
    // 이전 모달이 열려있었으면 다시 표시
    const searchModal = document.getElementById('imageSearchModal');
    const genModal = document.getElementById('aiImageGenModal');
    if (searchModal && !searchModal.classList.contains('hidden')) return;
    if (genModal && !genModal.classList.contains('hidden')) return;
    // 둘 다 닫혀있으면 검색 모달 열기 (마지막 사용 기준)
    if (searchModal) searchModal.classList.remove('hidden');
  };

  // ── 모달 생성 ──
  function _createModal() {
    _modalEl = document.createElement('div');
    _modalEl.id = 'imageEditorModal';
    _modalEl.className = 'hidden fixed inset-0 z-[10000] flex items-center justify-center bg-black/60';
    _modalEl.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <!-- 헤더 -->
        <div class="flex items-center justify-between px-5 py-3 border-b">
          <div class="flex items-center gap-3">
            <button onclick="window.ImageEditor._back()" class="text-gray-400 hover:text-gray-600 text-sm">
              <i class="fas fa-arrow-left mr-1"></i>뒤로
            </button>
            <h3 class="font-bold text-gray-800 flex items-center gap-2">
              <i class="fas fa-crop-alt text-purple-500"></i> 이미지 편집
            </h3>
          </div>
          <button onclick="window.ImageEditor.close()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <!-- 비율 버튼 -->
        <div class="flex items-center gap-2 px-5 py-2 border-b bg-gray-50">
          <span class="text-xs text-gray-500 font-semibold mr-1">비율:</span>
          <button data-ratio="free" class="ratio-btn px-3 py-1 text-xs rounded-full border bg-white ring-2 ring-purple-500 bg-purple-50"
                  onclick="window.ImageEditor._setRatio('free')">자유</button>
          <button data-ratio="1:1" class="ratio-btn px-3 py-1 text-xs rounded-full border bg-white"
                  onclick="window.ImageEditor._setRatio('1:1')">1:1</button>
          <button data-ratio="4:5" class="ratio-btn px-3 py-1 text-xs rounded-full border bg-white"
                  onclick="window.ImageEditor._setRatio('4:5')">4:5</button>
          <button data-ratio="16:9" class="ratio-btn px-3 py-1 text-xs rounded-full border bg-white"
                  onclick="window.ImageEditor._setRatio('16:9')">16:9</button>
          <button data-ratio="9:16" class="ratio-btn px-3 py-1 text-xs rounded-full border bg-white"
                  onclick="window.ImageEditor._setRatio('9:16')">9:16</button>
        </div>

        <!-- 에디터 영역 -->
        <div class="flex-1 overflow-hidden flex">
          <!-- 이미지 크롭 영역 -->
          <div class="flex-1 relative bg-gray-900 min-h-[300px]" style="max-height:55vh;">
            <div id="editorTextPreview" class="absolute inset-0 pointer-events-none z-10"></div>
            <img id="editorImage" src="" alt="" class="block max-w-full" style="display:block; max-height:55vh;">
          </div>
        </div>

        <!-- 텍스트 오버레이 패널 -->
        <div class="px-5 py-3 border-t bg-gray-50">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-gray-600"><i class="fas fa-font mr-1"></i>텍스트 오버레이</span>
            <button onclick="window.ImageEditor._addText()"
                    class="px-3 py-1 text-xs bg-purple-500 text-white rounded-full font-bold hover:bg-purple-600">
              <i class="fas fa-plus mr-1"></i>텍스트 추가
            </button>
          </div>
          <div id="editorTextPanel">
            <p class="text-xs text-gray-400 text-center py-2">텍스트를 추가하려면 위 버튼을 클릭하세요</p>
          </div>
        </div>

        <!-- 액션 버튼 -->
        <div class="flex gap-2 px-5 py-3 border-t">
          <button onclick="window.ImageEditor._back()"
                  class="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50">
            <i class="fas fa-arrow-left mr-1"></i>뒤로
          </button>
          <button onclick="window.ImageEditor._download()"
                  class="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-bold hover:opacity-90">
            <i class="fas fa-download mr-1"></i>PNG 다운로드
          </button>
        </div>
      </div>
    `;
    _modalEl.addEventListener('click', (e) => {
      if (e.target === _modalEl) close();
    });
    document.body.appendChild(_modalEl);
  }
})();
