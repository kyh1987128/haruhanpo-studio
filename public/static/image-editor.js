/**
 * 이미지 크롭 + 텍스트 오버레이 에디터 v1.2
 * 기능: 다중 텍스트, 웹폰트(3종), 배경 반투명 토글, 드래그 이동
 */
(function () {
  'use strict';

  // ── 상태 ──
  var _cropper = null;
  var _imageUrl = '';
  var _imageAlt = '';
  var _keyword = '';
  var _sourceTab = 'search';
  var _textOverlays = [];
  var _activeOverlayIndex = -1;
  var _aspectRatio = NaN;
  var _dragging = false;
  var _rendered = false;

  // 폰트 옵션
  var FONTS = [
    { label: '노토 산스', value: '"Noto Sans KR", sans-serif', css: 'Noto Sans KR' },
    { label: '블랙 한 산스', value: '"Black Han Sans", sans-serif', css: 'Black Han Sans' },
    { label: '주아', value: '"Jua", sans-serif', css: 'Jua' }
  ];

  // ── 공개 API ──
  window.ImageEditor = {
    open: open,
    close: close
  };

  function open(imageUrl, alt, keyword, source) {
    _imageUrl = imageUrl;
    _imageAlt = alt || '';
    _keyword = keyword || '';
    _sourceTab = source || 'search';
    _textOverlays = [];
    _activeOverlayIndex = -1;
    _aspectRatio = NaN;

    var viewer = document.getElementById('imageToolViewer');
    if (viewer) viewer.classList.remove('hidden');

    var cs = document.getElementById('tabContentSearch');
    var ca = document.getElementById('tabContentAigen');
    var ce = document.getElementById('tabContentEditor');
    if (cs) cs.classList.add('hidden');
    if (ca) ca.classList.add('hidden');
    if (ce) ce.classList.remove('hidden');

    var ts = document.getElementById('tabFreeSearch');
    var ta = document.getElementById('tabAiGen');
    if (ts) ts.className = 'flex-1 py-1.5 px-3 text-xs font-bold rounded-full transition-all bg-gray-200 text-gray-600 hover:bg-gray-300';
    if (ta) ta.className = 'flex-1 py-1.5 px-3 text-xs font-bold rounded-full transition-all bg-gray-200 text-gray-600 hover:bg-gray-300';

    if (!_rendered) {
      _renderEditorUI();
      _rendered = true;
    }

    setTimeout(function () { _initCropper(); }, 150);
  }

  function close() {
    if (_cropper) { _cropper.destroy(); _cropper = null; }
    if (window.ImageToolTabs) window.ImageToolTabs.switchTab(_sourceTab);
  }

  // ── 에디터 UI ──
  function _renderEditorUI() {
    var container = document.getElementById('tabContentEditor');
    if (!container) return;
    container.innerHTML = '\
      <div class="p-2">\
        <div class="flex items-center gap-2 mb-2">\
          <button onclick="window.ImageEditor.close()" class="px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 font-bold">\
            <i class="fas fa-arrow-left mr-1"></i>뒤로\
          </button>\
          <span class="text-[10px] font-bold text-gray-700"><i class="fas fa-crop-alt mr-1 text-purple-500"></i>이미지 편집</span>\
        </div>\
        <div class="flex gap-1 mb-2">\
          <button data-ratio="free" class="ratio-btn px-2 py-0.5 text-[9px] rounded-full border bg-purple-50 ring-1 ring-purple-500 font-bold"\
                  onclick="window.ImageEditor._setRatio(\'free\')">자유</button>\
          <button data-ratio="1:1" class="ratio-btn px-2 py-0.5 text-[9px] rounded-full border bg-white font-bold"\
                  onclick="window.ImageEditor._setRatio(\'1:1\')">1:1</button>\
          <button data-ratio="4:5" class="ratio-btn px-2 py-0.5 text-[9px] rounded-full border bg-white font-bold"\
                  onclick="window.ImageEditor._setRatio(\'4:5\')">4:5</button>\
          <button data-ratio="16:9" class="ratio-btn px-2 py-0.5 text-[9px] rounded-full border bg-white font-bold"\
                  onclick="window.ImageEditor._setRatio(\'16:9\')">16:9</button>\
          <button data-ratio="9:16" class="ratio-btn px-2 py-0.5 text-[9px] rounded-full border bg-white font-bold"\
                  onclick="window.ImageEditor._setRatio(\'9:16\')">9:16</button>\
        </div>\
        <div class="relative bg-gray-900 rounded-lg overflow-hidden" style="min-height:180px;max-height:260px;">\
          <div id="editorTextPreview" class="absolute inset-0 pointer-events-none z-10"></div>\
          <img id="editorImage" src="" alt="" class="block w-full" style="max-height:260px;object-fit:contain;">\
        </div>\
        <div class="mt-2 border-t border-gray-200 pt-2">\
          <div class="flex items-center justify-between mb-1.5">\
            <span class="text-[10px] font-semibold text-gray-600"><i class="fas fa-font mr-1"></i>텍스트 오버레이</span>\
            <button onclick="window.ImageEditor._addText()"\
                    class="px-2 py-0.5 text-[9px] bg-purple-500 text-white rounded-full font-bold hover:bg-purple-600">\
              <i class="fas fa-plus mr-0.5"></i>추가\
            </button>\
          </div>\
          <div id="editorTextList"></div>\
          <div id="editorTextPanel">\
            <p class="text-[9px] text-gray-400 text-center py-1">텍스트를 추가하려면 위 버튼 클릭</p>\
          </div>\
        </div>\
        <div class="flex gap-1.5 mt-2">\
          <button onclick="window.ImageEditor.close()"\
                  class="flex-1 py-1.5 border border-gray-300 rounded-lg text-[10px] font-bold text-gray-600 hover:bg-gray-50">\
            <i class="fas fa-arrow-left mr-1"></i>뒤로\
          </button>\
          <button onclick="window.ImageEditor._download()"\
                  class="flex-1 py-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-[10px] font-bold hover:opacity-90">\
            <i class="fas fa-download mr-1"></i>PNG 다운로드\
          </button>\
        </div>\
      </div>';
  }

  // ── Cropper 초기화 ──
  function _initCropper() {
    var img = document.getElementById('editorImage');
    if (!img) return;
    if (_cropper) { _cropper.destroy(); _cropper = null; }

    img.src = _imageUrl;
    img.onload = function () {
      if (typeof Cropper === 'undefined') { console.warn('Cropper.js 미로드'); return; }
      _cropper = new Cropper(img, {
        viewMode: 1, dragMode: 'move', aspectRatio: _aspectRatio,
        autoCropArea: 0.9, background: true, responsive: true,
        restore: false, guides: true, center: true, highlight: true,
        cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false
      });
    };
  }

  // ── 비율 변경 ──
  window.ImageEditor._setRatio = function (ratio) {
    document.querySelectorAll('.ratio-btn').forEach(function (b) {
      if (b.dataset.ratio === ratio) {
        b.classList.add('ring-1', 'ring-purple-500', 'bg-purple-50');
        b.classList.remove('bg-white');
      } else {
        b.classList.remove('ring-1', 'ring-purple-500', 'bg-purple-50');
        b.classList.add('bg-white');
      }
    });
    var ratioMap = { 'free': NaN, '1:1': 1, '4:5': 4 / 5, '16:9': 16 / 9, '9:16': 9 / 16 };
    _aspectRatio = ratioMap[ratio] !== undefined ? ratioMap[ratio] : NaN;
    if (_cropper) _cropper.setAspectRatio(_aspectRatio);
  };

  // ── 텍스트 추가 ──
  window.ImageEditor._addText = function () {
    var defaultText = _keyword || _imageAlt || '텍스트를 입력하세요';
    if (window.batchResults && window.batchResults.length > 0) {
      var firstResult = window.batchResults[0];
      if (firstResult.data) {
        var vals = Object.values(firstResult.data);
        if (vals.length > 0 && typeof vals[0] === 'string') {
          var lines = vals[0].split('\n').filter(function (l) { return l.trim(); });
          if (lines.length > 0) defaultText = lines[0].replace(/^[#*\-\s]+/, '').substring(0, 30);
        }
      }
    }
    _textOverlays.push({
      text: defaultText,
      fontSize: 20,
      color: '#ffffff',
      x: 50,
      y: 30 + (_textOverlays.length * 15),
      shadow: true,
      fontFamily: FONTS[0].value,
      fontIndex: 0,
      bgEnabled: false
    });
    _activeOverlayIndex = _textOverlays.length - 1;
    _renderTextList();
    _renderTextControls();
    _renderTextPreview();
  };

  // ── 텍스트 목록 (탭) ──
  function _renderTextList() {
    var container = document.getElementById('editorTextList');
    if (!container || _textOverlays.length === 0) {
      if (container) container.innerHTML = '';
      return;
    }
    container.innerHTML = '<div class="flex gap-1 mb-1.5 flex-wrap">' +
      _textOverlays.map(function (ov, i) {
        var active = i === _activeOverlayIndex;
        return '<button onclick="window.ImageEditor._selectText(' + i + ')" class="px-2 py-0.5 text-[9px] rounded-full border font-bold truncate max-w-[80px] ' +
          (active ? 'bg-purple-100 border-purple-400 text-purple-700' : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200') +
          '">' + (ov.text.length > 8 ? ov.text.substring(0, 8) + '..' : ov.text) + '</button>';
      }).join('') + '</div>';
  }

  window.ImageEditor._selectText = function (idx) {
    _activeOverlayIndex = idx;
    _renderTextList();
    _renderTextControls();
    _renderTextPreview();
  };

  // ── 텍스트 컨트롤 ──
  function _renderTextControls() {
    var panel = document.getElementById('editorTextPanel');
    if (!panel) return;
    if (_textOverlays.length === 0) {
      panel.innerHTML = '<p class="text-[9px] text-gray-400 text-center py-1">텍스트를 추가하려면 위 버튼 클릭</p>';
      return;
    }
    var overlay = _textOverlays[_activeOverlayIndex] || _textOverlays[0];
    var idx = _activeOverlayIndex >= 0 ? _activeOverlayIndex : 0;

    // 폰트 옵션 HTML
    var fontOptions = FONTS.map(function (f, fi) {
      return '<option value="' + fi + '"' + (overlay.fontIndex === fi ? ' selected' : '') + '>' + f.label + '</option>';
    }).join('');

    panel.innerHTML = '\
      <div class="space-y-1.5">\
        <input type="text" value="' + overlay.text.replace(/"/g, '&quot;') + '"\
               onchange="window.ImageEditor._updateText(' + idx + ', \'text\', this.value)"\
               class="w-full px-2 py-1 border rounded text-[10px] focus:ring-1 focus:ring-purple-400 focus:outline-none">\
        <div class="flex gap-1.5 items-center">\
          <label class="text-[9px] text-gray-500 w-8 flex-shrink-0">폰트</label>\
          <select onchange="window.ImageEditor._setFont(' + idx + ', parseInt(this.value))"\
                  class="flex-1 px-1.5 py-0.5 border rounded text-[10px] focus:ring-1 focus:ring-purple-400 focus:outline-none">' + fontOptions + '</select>\
        </div>\
        <div class="flex gap-1.5 items-center">\
          <label class="text-[9px] text-gray-500 w-8 flex-shrink-0">크기</label>\
          <input type="range" min="10" max="48" value="' + overlay.fontSize + '"\
                 oninput="window.ImageEditor._updateText(' + idx + ', \'fontSize\', parseInt(this.value));this.nextElementSibling.textContent=this.value"\
                 class="flex-1 h-1 accent-purple-500">\
          <span class="text-[9px] text-gray-400 w-4">' + overlay.fontSize + '</span>\
        </div>\
        <div class="flex gap-1 items-center">\
          <label class="text-[9px] text-gray-500 w-8 flex-shrink-0">색상</label>\
          <button onclick="window.ImageEditor._updateText(' + idx + ', \'color\', \'#ffffff\')" class="w-5 h-5 rounded-full bg-white border ' + (overlay.color === '#ffffff' ? 'border-purple-500 border-2' : 'border-gray-300') + '"></button>\
          <button onclick="window.ImageEditor._updateText(' + idx + ', \'color\', \'#000000\')" class="w-5 h-5 rounded-full bg-black border ' + (overlay.color === '#000000' ? 'border-purple-500 border-2' : 'border-gray-300') + '"></button>\
          <button onclick="window.ImageEditor._updateText(' + idx + ', \'color\', \'#ef4444\')" class="w-5 h-5 rounded-full bg-red-500 border ' + (overlay.color === '#ef4444' ? 'border-purple-500 border-2' : 'border-gray-300') + '"></button>\
          <button onclick="window.ImageEditor._updateText(' + idx + ', \'color\', \'#3b82f6\')" class="w-5 h-5 rounded-full bg-blue-500 border ' + (overlay.color === '#3b82f6' ? 'border-purple-500 border-2' : 'border-gray-300') + '"></button>\
          <input type="color" value="' + overlay.color + '" onchange="window.ImageEditor._updateText(' + idx + ', \'color\', this.value)" class="w-5 h-5 rounded cursor-pointer border-0 p-0">\
        </div>\
        <div class="flex gap-2 items-center">\
          <label class="flex items-center gap-1 cursor-pointer">\
            <input type="checkbox" ' + (overlay.bgEnabled ? 'checked' : '') + ' onchange="window.ImageEditor._updateText(' + idx + ', \'bgEnabled\', this.checked)"\
                   class="w-3 h-3 accent-purple-500">\
            <span class="text-[9px] text-gray-500">배경 반투명</span>\
          </label>\
          <label class="flex items-center gap-1 cursor-pointer">\
            <input type="checkbox" ' + (overlay.shadow ? 'checked' : '') + ' onchange="window.ImageEditor._updateText(' + idx + ', \'shadow\', this.checked)"\
                   class="w-3 h-3 accent-purple-500">\
            <span class="text-[9px] text-gray-500">그림자</span>\
          </label>\
          <button onclick="window.ImageEditor._removeText(' + idx + ')" class="ml-auto px-1.5 py-0.5 text-[8px] bg-red-100 text-red-500 rounded font-bold"><i class="fas fa-trash mr-0.5"></i>삭제</button>\
        </div>\
        <p class="text-[8px] text-gray-400"><i class="fas fa-arrows-alt mr-0.5"></i>프리뷰에서 텍스트를 드래그하여 이동</p>\
      </div>';
  }

  // ── 폰트 변경 ──
  window.ImageEditor._setFont = function (idx, fontIndex) {
    if (_textOverlays[idx] && FONTS[fontIndex]) {
      _textOverlays[idx].fontFamily = FONTS[fontIndex].value;
      _textOverlays[idx].fontIndex = fontIndex;
      _renderTextControls();
      _renderTextPreview();
    }
  };

  // ── 텍스트 프리뷰 ──
  function _renderTextPreview() {
    var container = document.getElementById('editorTextPreview');
    if (!container) return;
    container.innerHTML = '';
    _textOverlays.forEach(function (overlay, i) {
      var el = document.createElement('div');
      el.className = 'editor-text-overlay';
      var bgStyle = overlay.bgEnabled ? 'background:rgba(0,0,0,0.5);padding:2px 6px;border-radius:3px;' : '';
      el.style.cssText = 'position:absolute;left:' + overlay.x + '%;top:' + overlay.y + '%;transform:translate(-50%,-50%);' +
        'font-family:' + overlay.fontFamily + ';' +
        'font-size:' + overlay.fontSize + 'px;color:' + overlay.color + ';font-weight:bold;cursor:move;user-select:none;pointer-events:auto;z-index:10;white-space:nowrap;' +
        bgStyle +
        (overlay.shadow ? 'text-shadow:2px 2px 4px rgba(0,0,0,0.7),-1px -1px 2px rgba(0,0,0,0.3);' : '') +
        (_activeOverlayIndex === i ? 'outline:2px dashed rgba(147,51,234,0.7);outline-offset:3px;' : '');
      el.textContent = overlay.text;
      el.dataset.index = i;
      el.addEventListener('mousedown', function (e) { _startDrag(e, i); });
      el.addEventListener('touchstart', function (e) { _startDrag(e, i); }, { passive: false });
      container.appendChild(el);
    });
  }

  // ── 드래그 ──
  function _startDrag(e, index) {
    e.preventDefault();
    _dragging = true;
    _activeOverlayIndex = index;
    var rect = document.getElementById('editorTextPreview').getBoundingClientRect();
    var onMove = function (ev) {
      if (!_dragging) return;
      var cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      var cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      _textOverlays[index].x = Math.max(5, Math.min(95, ((cx - rect.left) / rect.width) * 100));
      _textOverlays[index].y = Math.max(5, Math.min(95, ((cy - rect.top) / rect.height) * 100));
      _renderTextPreview();
    };
    var onUp = function () {
      _dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      _renderTextList();
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
    _activeOverlayIndex = _textOverlays.length > 0 ? Math.min(idx, _textOverlays.length - 1) : -1;
    _renderTextList();
    _renderTextControls();
    _renderTextPreview();
  };

  // ── 다운로드 (Canvas) ──
  window.ImageEditor._download = function () {
    if (!_cropper) { alert('이미지를 먼저 로드해주세요'); return; }
    var croppedCanvas = _cropper.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
    if (!croppedCanvas) { alert('크롭 영역을 선택해주세요'); return; }
    var ctx = croppedCanvas.getContext('2d');
    var w = croppedCanvas.width;
    var h = croppedCanvas.height;
    _textOverlays.forEach(function (overlay) {
      var x = (overlay.x / 100) * w;
      var y = (overlay.y / 100) * h;
      var fontSize = Math.round(overlay.fontSize * (w / 400));

      // 배경 반투명 박스
      if (overlay.bgEnabled) {
        ctx.save();
        ctx.font = 'bold ' + fontSize + 'px ' + overlay.fontFamily;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var metrics = ctx.measureText(overlay.text);
        var pad = fontSize * 0.3;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        var rx = x - metrics.width / 2 - pad;
        var ry = y - fontSize / 2 - pad;
        var rw = metrics.width + pad * 2;
        var rh = fontSize + pad * 2;
        var radius = fontSize * 0.15;
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + fontSize + 'px ' + overlay.fontFamily;
      if (overlay.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = fontSize * 0.15;
        ctx.shadowOffsetX = fontSize * 0.05;
        ctx.shadowOffsetY = fontSize * 0.05;
      }
      ctx.fillStyle = overlay.color;
      ctx.fillText(overlay.text, x, y);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    });
    croppedCanvas.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'edited-' + Date.now() + '.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  window.ImageEditor._back = function () { close(); };
})();
