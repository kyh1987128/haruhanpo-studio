/**
 * AI 이미지 생성 모듈 v1.1
 * 왼쪽 패널 고정 영역 방식 (모달 제거, 자동 로딩 제거)
 */
(function () {
  'use strict';

  // ── 상태 ──
  var _history = [];
  var _loading = false;
  var _keyword = '';
  var _rendered = false;

  // ── 공개 API ──
  window.ImageGenerator = {
    open: open,
    close: function () {}
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
    if (window.ImageToolTabs) window.ImageToolTabs.switchTab('aigen');

    // 내부 HTML 최초 1회 삽입
    if (!_rendered) {
      _renderGenUI();
      _rendered = true;
    }

    var kwInput = document.getElementById('aiGenKeyword');
    if (kwInput) kwInput.value = _keyword;
    _renderHistory();
    // 로딩 상태 초기화 (자동 로딩 방지)
    _loading = false;
    _setLoading(false);
    // 자동 생성 호출하지 않음 — 사용자가 버튼을 직접 클릭
  }

  // ── 키워드 추출 ──
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

  // ── UI 렌더링 (tabContentAigen 내부) ──
  function _renderGenUI() {
    var container = document.getElementById('tabContentAigen');
    if (!container) return;
    container.innerHTML = '\
      <div class="p-3 space-y-2">\
        <div>\
          <label class="text-[10px] font-semibold text-gray-500">키워드</label>\
          <input id="aiGenKeyword" type="text" placeholder="이미지 생성 키워드"\
                 class="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none">\
        </div>\
        <div>\
          <label class="text-[10px] font-semibold text-gray-500">스타일</label>\
          <select id="aiGenStyle" class="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none">\
            <option value="realistic photograph, high resolution, natural lighting">📷 사실적 사진 (Realistic Photo)</option>\
            <option value="flat design illustration, vector style, clean colors">🎨 일러스트 (Illustration)</option>\
            <option value="minimal clean design, white space, simple composition">🧊 미니멀 (Minimal)</option>\
            <option value="3D rendered image, glossy materials, studio lighting">🔮 3D 렌더 (3D Render)</option>\
            <option value="watercolor painting style, soft brush strokes, artistic">🖌️ 수채화 (Watercolor)</option>\
          </select>\
        </div>\
        <button id="aiGenBtn" onclick="window.ImageGenerator._generate()"\
                class="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg font-bold text-xs disabled:opacity-50">\
          <i id="aiGenSpinner" class="fas fa-spinner fa-spin mr-1 hidden"></i>\
          <i class="fas fa-magic mr-1"></i>AI 이미지 생성 (2크레딧)\
        </button>\
        <p class="text-[9px] text-gray-400 text-center">생성 버튼을 눌러야 크레딧이 차감됩니다</p>\
        <div class="border-t border-gray-200 pt-2">\
          <p class="text-[10px] font-semibold text-gray-500 mb-1.5">생성 히스토리 (이번 세션)</p>\
          <div id="aiGenHistory"></div>\
        </div>\
      </div>';
  }

  // ── AI 이미지 생성 요청 ──
  async function _generate() {
    if (_loading) return;

    var user = window.currentUser;
    if (!user || !user.id || user.isGuest) {
      alert('로그인이 필요합니다.');
      return;
    }

    var totalCredits = (user.free_credits || 0) + (user.paid_credits || 0);
    if (totalCredits < 2) {
      if (confirm('크레딧이 부족합니다 (2크레딧 필요). 충전 페이지로 이동하시겠습니까?')) {
        location.href = '/payment';
      }
      return;
    }

    var kwInput = document.getElementById('aiGenKeyword');
    _keyword = (kwInput && kwInput.value.trim()) || _keyword;
    var style = document.getElementById('aiGenStyle');
    var styleVal = (style && style.value) || 'realistic photograph, high resolution, natural lighting';

    _loading = true;
    _setLoading(true);

    try {
      console.log('🎨 AI 이미지 생성 요청:', { keyword: _keyword, style: styleVal });
      var res = await fetch('/api/images/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: _keyword, user_id: user.id, style: styleVal })
      });

      var data = await res.json();
      console.log('🎨 AI 이미지 생성 응답:', { status: res.status, success: data.success, error: data.error, refunded: data.refunded });

      if (data.success && data.image) {
        _history.unshift({
          image: data.image,
          prompt: data.prompt,
          keyword: _keyword,
          timestamp: new Date().toLocaleTimeString('ko-KR')
        });
        if (data.cost_info) _syncCredits(data.cost_info);
        _renderHistory();
        _showToast('✅ AI 이미지가 생성되었습니다! (2크레딧 차감)');
      } else {
        var errMsg = data.error || 'AI 이미지 생성에 실패했습니다';
        console.error('🎨 AI 이미지 생성 실패:', { status: res.status, error: errMsg, refunded: data.refunded, data: data });
        if (data.refunded) {
          _showToast('⚠️ AI 이미지 생성에 실패했습니다. 크레딧이 환불되었습니다.', true);
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
      console.error('🎨 AI 이미지 생성 네트워크 오류:', e);
      _showToast('❌ 네트워크 오류가 발생했습니다', true);
    } finally {
      _loading = false;
      _setLoading(false);
    }
  }

  // ── 크레딧 UI 동기화 ──
  function _syncCredits(info) {
    if (window.currentUser) {
      if (info.free_credits !== undefined) window.currentUser.free_credits = info.free_credits;
      if (info.paid_credits !== undefined) window.currentUser.paid_credits = info.paid_credits;
    }
    window.dispatchEvent(new CustomEvent('userUpdated', {
      detail: { free_credits: info.free_credits, paid_credits: info.paid_credits, ...(window.currentUser || {}) }
    }));
  }

  // ── 히스토리 렌더링 ──
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
      return '<div class="bg-gray-50 rounded-lg p-2 mb-2">' +
        '<div class="flex gap-2">' +
          '<img src="' + item.image + '" alt="AI 생성" class="w-16 h-16 object-cover rounded-lg cursor-pointer flex-shrink-0" onclick="window.ImageGenerator._openEditor(' + i + ')">' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-[9px] text-gray-400">' + item.timestamp + '</p>' +
            '<p class="text-[10px] font-medium text-gray-700 truncate">' + item.keyword + '</p>' +
            '<div class="flex gap-1 mt-1">' +
              '<button onclick="window.ImageGenerator._openEditor(' + i + ')" class="px-1.5 py-0.5 text-[9px] bg-teal-500 text-white rounded font-bold"><i class="fas fa-crop-alt mr-0.5"></i>편집</button>' +
              '<button onclick="window.ImageGenerator._download(' + i + ')" class="px-1.5 py-0.5 text-[9px] bg-gray-200 text-gray-600 rounded font-bold"><i class="fas fa-download mr-0.5"></i>저장</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ── 에디터 열기 ──
  window.ImageGenerator._openEditor = function (index) {
    var item = _history[index];
    if (!item) return;
    if (window.ImageEditor) {
      window.ImageEditor.open(item.image, item.keyword, _keyword, 'aigen');
    }
  };

  // ── 다운로드 ──
  window.ImageGenerator._download = function (index) {
    var item = _history[index];
    if (!item) return;
    var a = document.createElement('a');
    a.href = item.image;
    a.download = 'ai-image-' + Date.now() + '.png';
    a.click();
  };

  // ── 유틸 ──
  function _showToast(msg, isError) {
    if (window.showToast) window.showToast(msg, isError ? 'error' : 'success');
    else alert(msg);
  }

  function _setLoading(v) {
    var btn = document.getElementById('aiGenBtn');
    var spinner = document.getElementById('aiGenSpinner');
    if (btn) btn.disabled = v;
    if (spinner) spinner.classList.toggle('hidden', !v);
  }

  window.ImageGenerator._generate = _generate;
})();
