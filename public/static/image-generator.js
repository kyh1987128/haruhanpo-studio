/**
 * AI 이미지 생성 모듈 v2.0
 * 버튼 항상 활성 / 키워드 4단계 우선순위 / 자동로딩 없음 / 3크레딧
 */
(function () {
  'use strict';

  var _history = [];
  var _loading = false;
  var _keyword = '';
  var _rendered = false;

  window.ImageGenerator = {
    open: open,
    close: function () {}
  };

  function open() {
    _keyword = _extractKeyword();

    // 뷰어 카드 표시
    var viewer = document.getElementById('imageToolViewer');
    if (viewer) viewer.classList.remove('hidden');

    if (window.ImageToolTabs) window.ImageToolTabs.switchTab('aigen');

    if (!_rendered) { _renderGenUI(); _rendered = true; }

    var kwInput = document.getElementById('aiGenKeyword');
    if (kwInput) {
      kwInput.value = _keyword;
      if (!_keyword) kwInput.focus();
    }
    _renderHistory();
    _loading = false;
    _setLoading(false);
  }

  // ── 키워드 추출 4단계 우선순위 ──
  function _extractKeyword() {
    // 1순위: window.batchResults
    if (window.batchResults && window.batchResults.length > 0) {
      var kw = window.batchResults[0].keywords;
      if (kw && (typeof kw === 'string' ? kw.trim() : '')) {
        return typeof kw === 'string' ? kw.trim().split(',')[0].trim() : kw;
      }
    }
    // 2순위: 히스토리 콘텐츠 키워드/제목
    var historyKw = document.querySelector('[data-history-keyword]');
    if (historyKw && historyKw.getAttribute('data-history-keyword')) {
      return historyKw.getAttribute('data-history-keyword').trim().split(',')[0].trim();
    }
    var historyTitle = document.querySelector('.history-content-title');
    if (historyTitle && historyTitle.textContent && historyTitle.textContent.trim()) {
      return historyTitle.textContent.trim().substring(0, 30);
    }
    // 3순위: 키워드 입력란
    for (var i = 0; i < 10; i++) {
      var el = document.getElementById('keyword_' + i);
      if (el && el.value && el.value.trim()) {
        return el.value.trim().split(',')[0].trim();
      }
    }
    // 4순위: 빈 문자열
    return '';
  }

  function _renderGenUI() {
    var container = document.getElementById('tabContentAigen');
    if (!container) return;
    container.innerHTML = '\
      <div class="p-3 space-y-2">\
        <div>\
          <label class="text-[10px] font-semibold text-gray-500">콘텐츠 내용</label>\
          <textarea id="aiGenKeyword" rows="4" placeholder="키워드 또는 생성된 콘텐츠를 붙여넣으세요"\
                    class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-y"></textarea>\
        </div>\
        <div>\
          <label class="text-[10px] font-semibold text-gray-500">스타일</label>\
          <select id="aiGenStyle" class="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none">\
            <option value="realistic photograph, high resolution, natural lighting">📷 사실적 사진 (Realistic Photo)</option>\
            <option value="flat design illustration, vector style, clean colors">🎨 일러스트 (Illustration)</option>\
            <option value="minimal clean design, white space, simple composition">🧊 미니멀 (Minimal)</option>\
            <option value="3D rendered image, glossy materials, studio lighting">🔮 3D 렌더 (3D Render)</option>\
            <option value="watercolor painting style, soft brush strokes, artistic">🖌️ 수채화 (Watercolor)</option>\
            <option value="cinematic film still, dramatic lighting, shallow depth of field, color grading">🎬 시네마틱 (Cinematic)</option>\
            <option value="anime style illustration, vibrant colors, detailed character design">🌸 애니메이션 (Anime)</option>\
            <option value="retro vintage style, film grain, muted warm tones, 1970s aesthetic">📼 레트로 빈티지 (Retro)</option>\
            <option value="neon cyberpunk style, dark background, glowing neon lights, futuristic">🌃 네온 사이버펑크 (Cyberpunk)</option>\
            <option value="oil painting on canvas, visible brush strokes, rich texture, classical art">🖼️ 유화 (Oil Painting)</option>\
            <option value="pixel art style, 16-bit retro game graphics, crisp pixels">👾 픽셀아트 (Pixel Art)</option>\
            <option value="isometric 3D illustration, clean geometry, pastel colors, infographic style">📐 아이소메트릭 (Isometric)</option>\
            <option value="pop art style, bold colors, halftone dots, comic book aesthetic">🎭 팝아트 (Pop Art)</option>\
            <option value="dreamy ethereal style, soft glow, pastel gradient, fantasy atmosphere">✨ 드리미 (Dreamy)</option>\
            <option value="professional product photography, clean white background, studio lighting">📦 제품 촬영 (Product Shot)</option>\
          </select>\
        </div>\
        <button id="aiGenBtn" onclick="window.ImageGenerator._generate()"\
                class="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg font-bold text-xs disabled:opacity-50">\
          ✨ AI 이미지 생성 (3크레딧)\
        </button>\
        <p class="text-[9px] text-gray-400 text-center">생성 버튼을 눌러야 크레딧이 차감됩니다</p>\
        <div class="border-t border-gray-200 pt-2">\
          <p class="text-[10px] font-semibold text-gray-500 mb-1.5">생성 히스토리 (이번 세션)</p>\
          <div id="aiGenHistory"></div>\
        </div>\
      </div>';
  }

  async function _generate() {
    if (_loading) return;

    var user = window.currentUser;
    if (!user || !user.id || user.isGuest) {
      alert('로그인이 필요합니다.');
      return;
    }

    var kwInput = document.getElementById('aiGenKeyword');
    _keyword = (kwInput && kwInput.value.trim()) || _keyword;
    if (!_keyword) {
      alert('키워드를 입력해주세요.');
      if (kwInput) kwInput.focus();
      return;
    }

    var totalCredits = (user.free_credits || 0) + (user.paid_credits || 0);
    if (totalCredits < 3) {
      if (confirm('크레딧이 부족합니다 (3크레딧 필요). 충전 페이지로 이동하시겠습니까?')) {
        location.href = '/payment';
      }
      return;
    }

    var style = document.getElementById('aiGenStyle');
    var styleVal = (style && style.value) || 'realistic photograph, high resolution, natural lighting';

    _loading = true;
    _setLoading(true);

    // 프론트엔드 타임아웃 (35초: 서버 25초 + 여유 10초)
    var controller = new AbortController();
    var fetchTimeout = setTimeout(function() { controller.abort(); }, 35000);

    try {
      console.log('🎨 AI 이미지 생성 요청:', { keyword: _keyword, style: styleVal });
      var res = await fetch('/api/images/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: _keyword, user_id: user.id, style: styleVal }),
        signal: controller.signal
      });
      clearTimeout(fetchTimeout);

      var data = await res.json();
      console.log('🎨 AI 이미지 생성 응답:', { status: res.status, success: data.success });

      if (data.success && data.image) {
        _history.unshift({
          image: data.image, prompt: data.prompt, keyword: _keyword,
          timestamp: new Date().toLocaleTimeString('ko-KR')
        });
        if (data.cost_info) _syncCredits(data.cost_info);
        _renderHistory();
        _showToast('✅ AI 이미지가 생성되었습니다! (3크레딧 차감)');
      } else {
        var errMsg = data.error || 'AI 이미지 생성에 실패했습니다';
        if (data.refunded) {
          _showToast('⚠️ ' + errMsg + ' 크레딧이 환불되었습니다.', true);
          if (data.free_credits !== undefined) {
            _syncCredits({ free_credits: data.free_credits, paid_credits: data.paid_credits });
          }
        } else if (res.status === 402) {
          if (confirm('크레딧이 부족합니다. 충전 페이지로 이동하시겠습니까?')) {
            location.href = '/payment';
          }
        } else {
          _showToast('❌ ' + errMsg, true);
        }
      }
    } catch (e) {
      clearTimeout(fetchTimeout);
      if (e.name === 'AbortError') {
        _showToast('⚠️ 서버 응답 시간이 초과되었습니다 (35초). 크레딧은 자동 환불됩니다.', true);
      } else {
        console.error('🎨 AI 이미지 생성 네트워크 오류:', e);
        _showToast('❌ 네트워크 오류가 발생했습니다', true);
      }
    } finally {
      _loading = false;
      _setLoading(false);
    }
  }

  function _syncCredits(info) {
    if (window.currentUser) {
      if (info.free_credits !== undefined) window.currentUser.free_credits = info.free_credits;
      if (info.paid_credits !== undefined) window.currentUser.paid_credits = info.paid_credits;
    }
    window.dispatchEvent(new CustomEvent('userUpdated', {
      detail: { free_credits: info.free_credits, paid_credits: info.paid_credits, ...(window.currentUser || {}) }
    }));
  }

  function _renderHistory() {
    var container = document.getElementById('aiGenHistory');
    if (!container) return;
    if (_history.length === 0) {
      container.innerHTML = '<div class="text-center py-6 text-gray-400">' +
        '<i class="fas fa-magic text-2xl mb-2 opacity-30"></i>' +
        '<p class="text-[10px]">아직 생성된 이미지가 없습니다</p></div>';
      return;
    }
    container.innerHTML = _history.map(function (item, i) {
      return '<div class="bg-gray-50 rounded-lg p-2 mb-2"><div class="flex gap-2">' +
        '<img src="' + item.image + '" alt="AI 생성" class="w-16 h-16 object-cover rounded-lg cursor-pointer flex-shrink-0" onclick="window.ImageGenerator._openEditor(' + i + ')">' +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-[9px] text-gray-400">' + item.timestamp + '</p>' +
          '<p class="text-[10px] font-medium text-gray-700 truncate">' + item.keyword + '</p>' +
          '<div class="flex gap-1 mt-1">' +
            '<button onclick="window.ImageGenerator._openEditor(' + i + ')" class="px-1.5 py-0.5 text-[9px] bg-teal-500 text-white rounded font-bold"><i class="fas fa-crop-alt mr-0.5"></i>편집</button>' +
            '<button onclick="window.ImageGenerator._download(' + i + ')" class="px-1.5 py-0.5 text-[9px] bg-gray-200 text-gray-600 rounded font-bold"><i class="fas fa-download mr-0.5"></i>저장</button>' +
            '<button onclick="window.ImageGenerator._addToSlides(' + i + ')" class="px-1.5 py-0.5 text-[9px] bg-indigo-500 text-white rounded font-bold">+ 장표</button>' +
            '<button onclick="window.ImageGenerator._addToContent(' + i + ')" class="px-1.5 py-0.5 text-[9px] bg-green-500 text-white rounded font-bold">📎 콘텐츠</button>' +
          '</div></div></div></div>';
    }).join('');
  }

  window.ImageGenerator._openEditor = function (index) {
    var item = _history[index];
    if (item && window.ImageEditor) window.ImageEditor.open(item.image, item.keyword, _keyword, 'aigen');
  };

  window.ImageGenerator._download = function (index) {
    var item = _history[index];
    if (!item) return;
    var a = document.createElement('a');
    a.href = item.image; a.download = 'ai-image-' + Date.now() + '.png'; a.click();
  };

  function _showToast(msg, isError) {
    if (window.showToast) window.showToast(msg, isError ? 'error' : 'success');
    else alert(msg);
  }

  function _setLoading(loading) {
    var btn = document.getElementById('aiGenBtn');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.textContent;
      btn.textContent = '⏳ 생성 중... (최대 30초)';
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || '✨ AI 이미지 생성 (3크레딧)';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  }

  window.ImageGenerator._addToSlides = function (index) {
    var item = _history[index];
    if (item && window.SlideCollection) window.SlideCollection.add(item.image, item.keyword, 'aigen');
  };

  // 🖼 AI 생성 이미지를 콘텐츠 폼에 직접 추가
  window.ImageGenerator._addToContent = function (index) {
    var item = _history[index];
    if (item && window.addImageToContentForm) {
      window.addImageToContentForm(item.image);
    }
  };

  window.ImageGenerator._generate = _generate;
})();
