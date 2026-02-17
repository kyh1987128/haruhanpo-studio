/**
 * 이미지 크롭 + 텍스트 오버레이 에디터 v1.5
 * 기능: 배경 투명도 슬라이더, 정렬 6버튼, 350px 미리보기, 필터(밝기/대비/채도), 클립보드 복사
 */
(function () {
  'use strict';

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
  var _filters = { brightness: 100, contrast: 100, saturate: 100 };

  var FONTS = [
    { label: '기본 고딕', value: 'sans-serif', css: 'sans-serif' },
    { label: '나눔고딕', value: '"Nanum Gothic", sans-serif', css: 'Nanum Gothic' },
    { label: '나눔명조', value: '"Nanum Myeongjo", serif', css: 'Nanum Myeongjo' },
    { label: '나눔스퀘어', value: '"Nanum Square", sans-serif', css: 'Nanum Square' },
    { label: '주아', value: '"Jua", sans-serif', css: 'Jua' },
    { label: '블랙한산스', value: '"Black Han Sans", sans-serif', css: 'Black Han Sans' },
    { label: 'Pretendard', value: '"Pretendard Variable", Pretendard, sans-serif', css: 'Pretendard Variable' }
  ];

  window.ImageEditor = { open: open, close: close };

  function open(imageUrl, alt, keyword, source) {
    _imageUrl = imageUrl;
    _imageAlt = alt || '';
    _keyword = keyword || '';
    _sourceTab = source || 'search';
    _textOverlays = [];
    _activeOverlayIndex = -1;
    _aspectRatio = NaN;
    _filters = { brightness: 100, contrast: 100, saturate: 100 };

    var viewer = document.getElementById('imageToolViewer');
    if (viewer) viewer.classList.remove('hidden');

    var cs = document.getElementById('tabContentSearch');
    var ca = document.getElementById('tabContentAigen');
    var ct = document.getElementById('tabContentThumbnail');
    var ce = document.getElementById('tabContentEditor');
    if (cs) cs.classList.add('hidden');
    if (ca) ca.classList.add('hidden');
    if (ct) ct.classList.add('hidden');
    if (ce) ce.classList.remove('hidden');

    // 상단 버튼 ring 제거
    ['freeImageSearchBtn', 'aiImageGenBtn', 'aiThumbnailGenBtn'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.classList.remove('ring-2', 'ring-teal-400', 'ring-purple-400', 'ring-pink-400');
    });

    if (!_rendered) { _renderEditorUI(); _rendered = true; }
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
      <div class="p-2 flex flex-col" style="max-height:none; overflow-y:auto;">\
        <!-- 헤더: 뒤로 / 제목 / PNG + 클립보드 -->\
        <div class="flex items-center justify-between mb-1">\
          <button onclick="window.ImageEditor.close()" class="px-2 py-0.5 text-[10px] text-gray-500 hover:text-gray-700 font-bold">\
            <i class="fas fa-arrow-left mr-1"></i>뒤로\
          </button>\
          <span class="text-[10px] font-bold text-gray-700"><i class="fas fa-crop-alt mr-1 text-purple-500"></i>이미지 편집</span>\
          <div class="flex gap-1">\
            <button onclick="window.ImageEditor._download()" class="px-2 py-0.5 text-[9px] bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded font-bold">\
              <i class="fas fa-download mr-0.5"></i>PNG\
            </button>\
            <button id="editorClipboardBtn" onclick="window.ImageEditor._copyClipboard()" class="px-2 py-0.5 text-[9px] bg-blue-500 text-white rounded font-bold">\
              <i class="fas fa-copy mr-0.5"></i>복사\
            </button>\
          </div>\
        </div>\
        <!-- 비율 버튼 -->\
        <div class="flex gap-1 mb-1">\
          <button data-ratio="free" class="ratio-btn px-1.5 py-0.5 text-[8px] rounded-full border bg-purple-50 ring-1 ring-purple-500 font-bold" onclick="window.ImageEditor._setRatio(\'free\')">자유</button>\
          <button data-ratio="1:1" class="ratio-btn px-1.5 py-0.5 text-[8px] rounded-full border bg-white font-bold" onclick="window.ImageEditor._setRatio(\'1:1\')">1:1</button>\
          <button data-ratio="4:5" class="ratio-btn px-1.5 py-0.5 text-[8px] rounded-full border bg-white font-bold" onclick="window.ImageEditor._setRatio(\'4:5\')">4:5</button>\
          <button data-ratio="16:9" class="ratio-btn px-1.5 py-0.5 text-[8px] rounded-full border bg-white font-bold" onclick="window.ImageEditor._setRatio(\'16:9\')">16:9</button>\
          <button data-ratio="9:16" class="ratio-btn px-1.5 py-0.5 text-[8px] rounded-full border bg-white font-bold" onclick="window.ImageEditor._setRatio(\'9:16\')">9:16</button>\
        </div>\
        <!-- 이미지 프리뷰 (340px) -->\
        <div class="relative bg-gray-900 rounded-lg overflow-hidden flex-shrink-0" style="height:340px;">\
          <div id="editorTextPreview" class="absolute inset-0 pointer-events-none z-10"></div>\
          <img id="editorImage" src="" alt="" class="block w-full h-full" style="object-fit:contain;">\
        </div>\
        <!-- 필터 슬라이더 (이미지 아래) -->\
        <div class="mt-1 mb-1 space-y-0.5">\
          <div class="flex gap-1 items-center">\
            <span class="text-[8px] text-gray-400 w-6 flex-shrink-0">밝기</span>\
            <input type="range" min="50" max="150" value="100" id="filterBrightness" oninput="window.ImageEditor._setFilter(\'brightness\',this.value)" class="flex-1 h-1 accent-yellow-500">\
            <span id="filterBrightnessVal" class="text-[8px] text-gray-400 w-6">100</span>\
          </div>\
          <div class="flex gap-1 items-center">\
            <span class="text-[8px] text-gray-400 w-6 flex-shrink-0">대비</span>\
            <input type="range" min="50" max="150" value="100" id="filterContrast" oninput="window.ImageEditor._setFilter(\'contrast\',this.value)" class="flex-1 h-1 accent-orange-500">\
            <span id="filterContrastVal" class="text-[8px] text-gray-400 w-6">100</span>\
          </div>\
          <div class="flex gap-1 items-center">\
            <span class="text-[8px] text-gray-400 w-6 flex-shrink-0">채도</span>\
            <input type="range" min="0" max="200" value="100" id="filterSaturate" oninput="window.ImageEditor._setFilter(\'saturate\',this.value)" class="flex-1 h-1 accent-pink-500">\
            <span id="filterSaturateVal" class="text-[8px] text-gray-400 w-6">100</span>\
          </div>\
        </div>\
        <!-- 텍스트 컨트롤 -->\
        <div class="mt-1 border-t border-gray-200 pt-1 flex-shrink-0">\
          <div class="flex items-center justify-between mb-0.5">\
            <span class="text-[9px] font-semibold text-gray-600"><i class="fas fa-font mr-0.5"></i>텍스트</span>\
            <button onclick="window.ImageEditor._addText()" class="px-1.5 py-0.5 text-[8px] bg-purple-500 text-white rounded-full font-bold hover:bg-purple-600"><i class="fas fa-plus mr-0.5"></i>추가</button>\
          </div>\
          <div id="editorTextList"></div>\
          <div id="editorTextPanel">\
            <p class="text-[8px] text-gray-400 text-center py-0.5">텍스트를 추가하려면 + 버튼 클릭</p>\
          </div>\
        </div>\
      </div>';

    // 클립보드 API 미지원 시 버튼 숨김
    if (!navigator.clipboard || !navigator.clipboard.write) {
      var cb = document.getElementById('editorClipboardBtn');
      if (cb) cb.style.display = 'none';
    }
  }

  // ── 필터 ──
  window.ImageEditor._setFilter = function (type, val) {
    _filters[type] = parseInt(val);
    var valEl = document.getElementById('filter' + type.charAt(0).toUpperCase() + type.slice(1) + 'Val');
    if (valEl) valEl.textContent = val;
    _applyFilter();
  };

  function _applyFilter() {
    var img = document.getElementById('editorImage');
    if (!img) return;
    var filterStr = 'brightness(' + _filters.brightness + '%) contrast(' + _filters.contrast + '%) saturate(' + _filters.saturate + '%)';
    // Cropper.js의 canvas에도 필터 적용
    var cropperCanvas = document.querySelector('.cropper-canvas');
    if (cropperCanvas) cropperCanvas.style.filter = filterStr;
    var cropperView = document.querySelector('.cropper-view-box img');
    if (cropperView) cropperView.style.filter = filterStr;
  }

  // ── Cropper ──
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
        cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false,
        ready: function () { _applyFilter(); }
      });
    };
  }

  // ── 비율 ──
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
    var m = { 'free': NaN, '1:1': 1, '4:5': 4 / 5, '16:9': 16 / 9, '9:16': 9 / 16 };
    _aspectRatio = m[ratio] !== undefined ? m[ratio] : NaN;
    if (_cropper) _cropper.setAspectRatio(_aspectRatio);
  };

  // ── 텍스트 추가 ──
  window.ImageEditor._addText = function () {
    var defaultText = _keyword || _imageAlt || '텍스트 입력';
    if (window.batchResults && window.batchResults.length > 0) {
      var r = window.batchResults[0];
      if (r.data) {
        var vals = Object.values(r.data);
        if (vals.length > 0 && typeof vals[0] === 'string') {
          var lines = vals[0].split('\n').filter(function (l) { return l.trim(); });
          if (lines.length > 0) defaultText = lines[0].replace(/^[#*\-\s]+/, '').substring(0, 30);
        }
      }
    }
    _textOverlays.push({
      text: defaultText, fontSize: 24, color: '#ffffff',
      x: 50, y: 25 + (_textOverlays.length * 15),
      shadow: true, shadowStrength: 5,
      fontFamily: FONTS[0].value, fontIndex: 0,
      bgEnabled: false, bgOpacity: 50
    });
    _activeOverlayIndex = _textOverlays.length - 1;
    _renderTextList();
    _renderTextControls();
    _renderTextPreview();
  };

  // ── 텍스트 탭 목록 ──
  function _renderTextList() {
    var c = document.getElementById('editorTextList');
    if (!c || _textOverlays.length === 0) { if (c) c.innerHTML = ''; return; }
    c.innerHTML = '<div class="flex gap-0.5 mb-1 flex-wrap">' +
      _textOverlays.map(function (ov, i) {
        var a = i === _activeOverlayIndex;
        return '<button onclick="window.ImageEditor._selectText(' + i + ')" class="px-1.5 py-0.5 text-[8px] rounded-full border font-bold truncate max-w-[70px] ' +
          (a ? 'bg-purple-100 border-purple-400 text-purple-700' : 'bg-gray-100 border-gray-300 text-gray-500') + '">' +
          (ov.text.length > 6 ? ov.text.substring(0, 6) + '..' : ov.text) + '</button>';
      }).join('') + '</div>';
  }

  window.ImageEditor._selectText = function (idx) {
    _activeOverlayIndex = idx;
    _renderTextList();
    _renderTextControls();
    _renderTextPreview();
  };

  // ── 텍스트 컨트롤 (컴팩트 가로 배치) ──
  function _renderTextControls() {
    var panel = document.getElementById('editorTextPanel');
    if (!panel) return;
    if (_textOverlays.length === 0) {
      panel.innerHTML = '<p class="text-[8px] text-gray-400 text-center py-0.5">텍스트를 추가하려면 + 버튼 클릭</p>';
      return;
    }
    var ov = _textOverlays[_activeOverlayIndex] || _textOverlays[0];
    var idx = _activeOverlayIndex >= 0 ? _activeOverlayIndex : 0;
    var fontOpts = FONTS.map(function (f, fi) {
      return '<option value="' + fi + '"' + (ov.fontIndex === fi ? ' selected' : '') + ' style="font-family:' + f.value + '">' + f.label + '</option>';
    }).join('');

    panel.innerHTML = '\
      <div class="space-y-1.5">\
        <div class="flex gap-1">\
          <input type="text" value="' + ov.text.replace(/"/g, '&quot;') + '" onchange="window.ImageEditor._updateText(' + idx + ',\'text\',this.value)" class="flex-1 px-1.5 py-0.5 border rounded text-[9px] focus:ring-1 focus:ring-purple-400 focus:outline-none min-w-0">\
          <button onclick="window.ImageEditor._removeText(' + idx + ')" class="px-1 py-0.5 text-[8px] bg-red-100 text-red-500 rounded flex-shrink-0"><i class="fas fa-trash"></i></button>\
        </div>\
        <div class="flex gap-1 items-center">\
          <select onchange="window.ImageEditor._setFont(' + idx + ',parseInt(this.value))" class="flex-1 px-1 py-0.5 border rounded text-[9px] min-w-0">' + fontOpts + '</select>\
          <span class="text-[8px] text-gray-400 flex-shrink-0">크기</span>\
          <input type="range" min="10" max="60" value="' + ov.fontSize + '" oninput="window.ImageEditor._updateText(' + idx + ',\'fontSize\',parseInt(this.value))" class="w-14 h-1 accent-purple-500 flex-shrink-0">\
          <span class="text-[8px] text-gray-400 w-4 flex-shrink-0">' + ov.fontSize + '</span>\
        </div>\
        <div class="flex gap-0.5 items-center flex-wrap">\
          <span class="text-[8px] text-gray-400 flex-shrink-0">색</span>\
          <button onclick="window.ImageEditor._updateText(' + idx + ',\'color\',\'#ffffff\')" class="w-4 h-4 rounded-full bg-white border ' + (ov.color === '#ffffff' ? 'border-purple-500 border-2' : 'border-gray-300') + '"></button>\
          <button onclick="window.ImageEditor._updateText(' + idx + ',\'color\',\'#000000\')" class="w-4 h-4 rounded-full bg-black border ' + (ov.color === '#000000' ? 'border-purple-500 border-2' : 'border-gray-300') + '"></button>\
          <button onclick="window.ImageEditor._updateText(' + idx + ',\'color\',\'#ef4444\')" class="w-4 h-4 rounded-full bg-red-500 border ' + (ov.color === '#ef4444' ? 'border-purple-500 border-2' : 'border-gray-300') + '"></button>\
          <button onclick="window.ImageEditor._updateText(' + idx + ',\'color\',\'#3b82f6\')" class="w-4 h-4 rounded-full bg-blue-500 border ' + (ov.color === '#3b82f6' ? 'border-purple-500 border-2' : 'border-gray-300') + '"></button>\
          <button onclick="window.ImageEditor._updateText(' + idx + ',\'color\',\'#facc15\')" class="w-4 h-4 rounded-full bg-yellow-400 border ' + (ov.color === '#facc15' ? 'border-purple-500 border-2' : 'border-gray-300') + '"></button>\
          <input type="color" value="' + ov.color + '" onchange="window.ImageEditor._updateText(' + idx + ',\'color\',this.value)" class="w-4 h-4 rounded cursor-pointer border-0 p-0 flex-shrink-0">\
        </div>\
        <div class="rounded-md" style="background:#f3e8ff; padding:4px 8px;">\
          <label class="flex items-center gap-1 cursor-pointer">\
            <input type="checkbox" ' + (ov.bgEnabled ? 'checked' : '') + ' onchange="window.ImageEditor._updateText(' + idx + ',\'bgEnabled\',this.checked)" class="w-4 h-4 accent-purple-500">\
            <span class="text-[10px] font-semibold text-purple-700">배경</span>\
          </label>\
          ' + (ov.bgEnabled ? '<div class="flex items-center gap-1 mt-1"><span class="text-[8px] text-purple-500 flex-shrink-0">불투명도</span><input type="range" min="0" max="100" value="' + ov.bgOpacity + '" oninput="window.ImageEditor._updateText(' + idx + ',\'bgOpacity\',parseInt(this.value))" class="flex-1 h-1 accent-purple-500" title="투명도 ' + ov.bgOpacity + '%"><span class="text-[9px] text-purple-600 font-bold w-8 text-right">' + ov.bgOpacity + '%</span></div>' : '') + '\
        </div>\
        <div class="rounded-md" style="background:#fef3c7; padding:4px 8px;">\
          <label class="flex items-center gap-1 cursor-pointer">\
            <input type="checkbox" ' + (ov.shadow ? 'checked' : '') + ' onchange="window.ImageEditor._updateText(' + idx + ',\'shadow\',this.checked)" class="w-4 h-4 accent-yellow-500">\
            <span class="text-[10px] font-semibold text-yellow-800">그림자</span>\
          </label>\
          ' + (ov.shadow ? '<div class="flex items-center gap-1 mt-1"><span class="text-[8px] text-yellow-600 flex-shrink-0">강도</span><input type="range" min="1" max="10" value="' + ov.shadowStrength + '" oninput="window.ImageEditor._updateText(' + idx + ',\'shadowStrength\',parseInt(this.value))" class="flex-1 h-1 accent-yellow-500"><span class="text-[9px] text-yellow-700 font-bold w-4">' + ov.shadowStrength + '</span></div>' : '') + '\
        </div>\
        <div class="flex gap-0.5 items-center">\
          <span class="text-[7px] text-gray-400 flex-shrink-0">정렬</span>\
          <button onclick="window.ImageEditor._align(' + idx + ',\'left\')" class="w-6 h-6 text-[9px] rounded border ' + (ov.x <= 15 ? 'border-purple-400 bg-purple-50' : 'border-gray-200') + ' hover:bg-purple-50" title="왼쪽"><i class="fas fa-align-left"></i></button>\
          <button onclick="window.ImageEditor._align(' + idx + ',\'center\')" class="w-6 h-6 text-[9px] rounded border ' + (ov.x > 15 && ov.x < 85 ? 'border-purple-400 bg-purple-50' : 'border-gray-200') + ' hover:bg-purple-50" title="가운데"><i class="fas fa-align-center"></i></button>\
          <button onclick="window.ImageEditor._align(' + idx + ',\'right\')" class="w-6 h-6 text-[9px] rounded border ' + (ov.x >= 85 ? 'border-purple-400 bg-purple-50' : 'border-gray-200') + ' hover:bg-purple-50" title="오른쪽"><i class="fas fa-align-right"></i></button>\
          <span class="mx-0.5 text-gray-300">|</span>\
          <button onclick="window.ImageEditor._alignV(' + idx + ',\'top\')" class="w-6 h-6 text-[9px] rounded border ' + (ov.y <= 20 ? 'border-purple-400 bg-purple-50' : 'border-gray-200') + ' hover:bg-purple-50" title="상단"><i class="fas fa-arrow-up"></i></button>\
          <button onclick="window.ImageEditor._alignV(' + idx + ',\'middle\')" class="w-6 h-6 text-[9px] rounded border ' + (ov.y > 20 && ov.y < 80 ? 'border-purple-400 bg-purple-50' : 'border-gray-200') + ' hover:bg-purple-50" title="중앙"><i class="fas fa-arrows-alt-v"></i></button>\
          <button onclick="window.ImageEditor._alignV(' + idx + ',\'bottom\')" class="w-6 h-6 text-[9px] rounded border ' + (ov.y >= 80 ? 'border-purple-400 bg-purple-50' : 'border-gray-200') + ' hover:bg-purple-50" title="하단"><i class="fas fa-arrow-down"></i></button>\
        </div>\
      </div>';
  }

  // ── 정렬 ──
  window.ImageEditor._align = function (idx, pos) {
    if (!_textOverlays[idx]) return;
    if (pos === 'left') _textOverlays[idx].x = 12;
    else if (pos === 'center') _textOverlays[idx].x = 50;
    else if (pos === 'right') _textOverlays[idx].x = 88;
    _renderTextControls();
    _renderTextPreview();
  };
  window.ImageEditor._alignV = function (idx, pos) {
    if (!_textOverlays[idx]) return;
    if (pos === 'top') _textOverlays[idx].y = 12;
    else if (pos === 'middle') _textOverlays[idx].y = 50;
    else if (pos === 'bottom') _textOverlays[idx].y = 88;
    _renderTextControls();
    _renderTextPreview();
  };

  // ── 폰트 ──
  window.ImageEditor._setFont = function (idx, fi) {
    if (_textOverlays[idx] && FONTS[fi]) {
      _textOverlays[idx].fontFamily = FONTS[fi].value;
      _textOverlays[idx].fontIndex = fi;
      _renderTextControls();
      _renderTextPreview();
    }
  };

  // ── 텍스트 프리뷰 ──
  function _renderTextPreview() {
    var c = document.getElementById('editorTextPreview');
    if (!c) return;
    c.innerHTML = '';
    _textOverlays.forEach(function (ov, i) {
      var el = document.createElement('div');
      el.className = 'editor-text-overlay';
      var bgStyle = ov.bgEnabled ? 'background:rgba(0,0,0,' + (ov.bgOpacity / 100) + ');padding:2px 6px;border-radius:3px;' : '';
      var shadowStyle = '';
      if (ov.shadow) {
        var s = ov.shadowStrength || 5;
        var blur = s * 0.8;
        var off = Math.max(1, s * 0.3);
        shadowStyle = 'text-shadow:' + off + 'px ' + off + 'px ' + blur + 'px rgba(0,0,0,' + (0.3 + s * 0.07) + '),' + (-off * 0.5) + 'px ' + (-off * 0.5) + 'px ' + (blur * 0.5) + 'px rgba(0,0,0,' + (0.1 + s * 0.03) + ');';
      }
      el.style.cssText = 'position:absolute;left:' + ov.x + '%;top:' + ov.y + '%;transform:translate(-50%,-50%);' +
        'font-family:' + ov.fontFamily + ';font-size:' + ov.fontSize + 'px;color:' + ov.color + ';font-weight:bold;' +
        'cursor:move;user-select:none;pointer-events:auto;z-index:10;white-space:nowrap;' +
        bgStyle + shadowStyle +
        (_activeOverlayIndex === i ? 'outline:2px dashed rgba(147,51,234,0.7);outline-offset:3px;' : '');
      el.textContent = ov.text;
      el.dataset.index = i;
      el.addEventListener('mousedown', function (e) { _startDrag(e, i); });
      el.addEventListener('touchstart', function (e) { _startDrag(e, i); }, { passive: false });
      c.appendChild(el);
    });
  }

  // ── 드래그 ──
  function _startDrag(e, index) {
    e.preventDefault();
    _dragging = true;
    _activeOverlayIndex = index;
    var rect = document.getElementById('editorTextPreview').getBoundingClientRect();
    var onMove = function (ev) {
      if (!_dragging || !_textOverlays[index]) return;
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

  // ── 텍스트 속성 ──
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

  // ── Canvas 렌더링 (필터 + 텍스트 + 배경 + 그림자) ──
  function _renderCanvas() {
    if (!_cropper) return null;
    var croppedCanvas = _cropper.getCroppedCanvas({ maxWidth: 2048, maxHeight: 2048, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
    if (!croppedCanvas) return null;

    // 필터 적용: 새 캔버스에 필터 CSS로 그리기
    var w = croppedCanvas.width;
    var h = croppedCanvas.height;
    var finalCanvas = document.createElement('canvas');
    finalCanvas.width = w;
    finalCanvas.height = h;
    var ctx = finalCanvas.getContext('2d');

    // 필터 적용
    ctx.filter = 'brightness(' + _filters.brightness + '%) contrast(' + _filters.contrast + '%) saturate(' + _filters.saturate + '%)';
    ctx.drawImage(croppedCanvas, 0, 0);
    ctx.filter = 'none';

    // 텍스트 오버레이
    _textOverlays.forEach(function (ov) {
      var x = (ov.x / 100) * w;
      var y = (ov.y / 100) * h;
      var fontSize = Math.round(ov.fontSize * (w / 400));

      // 배경 반투명 박스
      if (ov.bgEnabled) {
        ctx.save();
        ctx.font = 'bold ' + fontSize + 'px ' + ov.fontFamily;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var metrics = ctx.measureText(ov.text);
        var pad = fontSize * 0.3;
        ctx.fillStyle = 'rgba(0,0,0,' + (ov.bgOpacity / 100) + ')';
        var rx = x - metrics.width / 2 - pad;
        var ry = y - fontSize / 2 - pad;
        var rw = metrics.width + pad * 2;
        var rh = fontSize + pad * 2;
        var radius = fontSize * 0.15;
        ctx.beginPath();
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
      ctx.font = 'bold ' + fontSize + 'px ' + ov.fontFamily;

      if (ov.shadow) {
        var s = ov.shadowStrength || 5;
        ctx.shadowColor = 'rgba(0,0,0,' + (0.3 + s * 0.07) + ')';
        ctx.shadowBlur = fontSize * 0.03 * s;
        ctx.shadowOffsetX = fontSize * 0.01 * s;
        ctx.shadowOffsetY = fontSize * 0.01 * s;
      }
      ctx.fillStyle = ov.color;
      ctx.fillText(ov.text, x, y);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    });

    return finalCanvas;
  }

  // ── 다운로드 ──
  window.ImageEditor._download = function () {
    if (!_cropper) { alert('이미지를 먼저 로드해주세요'); return; }
    var canvas = _renderCanvas();
    if (!canvas) { alert('크롭 영역을 선택해주세요'); return; }
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'edited-' + Date.now() + '.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // ── 클립보드 복사 ──
  window.ImageEditor._copyClipboard = function () {
    if (!_cropper) { alert('이미지를 먼저 로드해주세요'); return; }
    var canvas = _renderCanvas();
    if (!canvas) { alert('크롭 영역을 선택해주세요'); return; }
    canvas.toBlob(function (blob) {
      if (!blob) return;
      try {
        navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]).then(function () {
          _showToast('✅ 클립보드에 복사되었습니다!');
        }).catch(function (err) {
          console.error('클립보드 복사 실패:', err);
          _showToast('❌ 클립보드 복사에 실패했습니다', true);
        });
      } catch (e) {
        console.error('ClipboardItem 미지원:', e);
        _showToast('❌ 이 브라우저에서는 클립보드 복사를 지원하지 않습니다', true);
      }
    }, 'image/png');
  };

  function _showToast(msg, isError) {
    if (window.showToast) window.showToast(msg, isError ? 'error' : 'success');
    else alert(msg);
  }

  window.ImageEditor._back = function () { close(); };
})();
