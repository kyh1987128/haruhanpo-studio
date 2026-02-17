/**
 * AI 썸네일 생성 모듈 v1.1
 * 콘텐츠 기반 플랫폼 최적화 썸네일 생성 (3크레딧)
 */
(function () {
  'use strict';

  var _history = [];
  var _loading = false;
  var _rendered = false;

  window.ThumbnailGenerator = {
    open: open,
    close: function () {}
  };

  function open() {
    var viewer = document.getElementById('imageToolViewer');
    if (viewer) viewer.classList.remove('hidden');

    if (window.ImageToolTabs) window.ImageToolTabs.switchTab('thumbnail');

    if (!_rendered) { _renderUI(); _rendered = true; }

    // 콘텐츠 자동 채움
    _fillContent();
    _renderHistory();
    _loading = false;
    _setLoading(false);

    // 버튼 활성화: 콘텐츠가 있으면 enabled, 없으면 disabled
    var btn = document.getElementById('thumbGenBtn');
    var ta = document.getElementById('thumbContent');
    if (btn && ta) {
      btn.disabled = !ta.value.trim();
      ta.addEventListener('input', function () {
        if (!_loading) btn.disabled = !ta.value.trim();
      });
    }
  }

  function _fillContent() {
    var ta = document.getElementById('thumbContent');
    if (!ta) return;
    // 1순위: batchResults 전체 본문
    if (window.batchResults && window.batchResults.length > 0) {
      var r = window.batchResults[0];
      var parts = [];
      // 전체 콘텐츠 본문 우선
      if (r.content && typeof r.content === 'string' && r.content.trim()) {
        parts.push(r.content.replace(/\[이미지\s*\d+:.*?\]/g, '').trim().substring(0, 500));
      } else if (r.text && typeof r.text === 'string' && r.text.trim()) {
        parts.push(r.text.replace(/\[이미지\s*\d+:.*?\]/g, '').trim().substring(0, 500));
      } else {
        // hook + body 합침
        if (r.hook && typeof r.hook === 'string') parts.push(r.hook);
        if (r.body && typeof r.body === 'string') parts.push(r.body.substring(0, 400));
      }
      if (parts.length === 0 && r.data) {
        var vals = Object.values(r.data);
        for (var i = 0; i < vals.length && i < 3; i++) {
          if (typeof vals[i] === 'string') parts.push(vals[i].substring(0, 300));
        }
      }
      if (r.keywords && parts.length > 0) parts.unshift('키워드: ' + r.keywords);
      if (parts.length > 0) { ta.value = parts.join('\n\n').replace(/\[이미지\s*\d+:.*?\]/g, '').trim(); return; }
    }
    // 2순위: 화면 DOM 스크래핑
    var contentEl = document.querySelector('#contentResult_0');
    if (contentEl && contentEl.textContent && contentEl.textContent.trim().length > 10) {
      ta.value = contentEl.textContent.replace(/\[이미지\s*\d+:.*?\]/g, '').trim().substring(0, 500);
      return;
    }
    var historyEl = document.querySelector('[data-history-content]');
    if (historyEl && historyEl.getAttribute('data-history-content')) {
      ta.value = historyEl.getAttribute('data-history-content').replace(/\[이미지\s*\d+:.*?\]/g, '').trim().substring(0, 500);
      return;
    }
    // 3순위: 키워드 입력란 합침
    var kwParts = [];
    for (var j = 0; j < 10; j++) {
      var el = document.getElementById('keyword_' + j);
      if (el && el.value && el.value.trim()) kwParts.push(el.value.trim());
    }
    if (kwParts.length > 0) { ta.value = kwParts.join(', '); return; }
  }

  function _renderUI() {
    var container = document.getElementById('tabContentThumbnail');
    if (!container) return;
    container.innerHTML = '\
      <div class="p-3 space-y-2">\
        <div>\
          <label class="text-[10px] font-semibold text-gray-500">콘텐츠 내용</label>\
          <textarea id="thumbContent" rows="3" placeholder="썸네일에 반영할 콘텐츠 내용을 입력하세요..."\
                    class="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-pink-400 focus:outline-none resize-none"></textarea>\
        </div>\
        <div class="grid grid-cols-2 gap-2">\
          <div>\
            <label class="text-[10px] font-semibold text-gray-500">플랫폼</label>\
            <select id="thumbPlatform" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-pink-400 focus:outline-none">\
              <option value="youtube_16_9">🎬 유튜브 (16:9)</option>\
              <option value="blog_16_9">📝 블로그 (16:9)</option>\
              <option value="instagram_1_1">📸 인스타그램 (1:1)</option>\
              <option value="threads_1_1">🧵 스레드 (1:1)</option>\
              <option value="shorts_9_16">📱 유튜브 쇼츠 (9:16)</option>\
            </select>\
          </div>\
          <div>\
            <label class="text-[10px] font-semibold text-gray-500">스타일</label>\
            <select id="thumbStyle" class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-pink-400 focus:outline-none">\
              <option value="realistic photo, professional quality">📷 사실적</option>\
              <option value="flat vector illustration, modern">🎨 일러스트</option>\
              <option value="minimal clean design, white space">🧊 미니멀</option>\
              <option value="3D rendered, glossy, vibrant">🔮 3D</option>\
              <option value="bold typography focused, text-centric design">✏️ 텍스트 중심</option>\
            </select>\
          </div>\
        </div>\
        <button id="thumbGenBtn" onclick="window.ThumbnailGenerator._generate()"\
                class="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold text-xs hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">\
          <i id="thumbSpinner" class="fas fa-spinner fa-spin mr-1 hidden"></i>\
          <i class="fas fa-image mr-1"></i>AI 썸네일 생성 (3크레딧)\
        </button>\
        <p class="text-[9px] text-gray-400 text-center">생성 버튼을 눌러야 크레딧이 차감됩니다</p>\
        <div class="border-t border-gray-200 pt-2">\
          <p class="text-[10px] font-semibold text-gray-500 mb-1.5">생성 히스토리 (이번 세션)</p>\
          <div id="thumbHistory"></div>\
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

    var content = (document.getElementById('thumbContent') || {}).value || '';
    if (!content.trim()) {
      alert('콘텐츠 내용을 입력해주세요.');
      return;
    }

    var totalCredits = (user.free_credits || 0) + (user.paid_credits || 0);
    if (totalCredits < 3) {
      if (confirm('크레딧이 부족합니다 (3크레딧 필요). 충전 페이지로 이동하시겠습니까?')) {
        location.href = '/payment';
      }
      return;
    }

    var platform = (document.getElementById('thumbPlatform') || {}).value || 'youtube_16_9';
    var style = (document.getElementById('thumbStyle') || {}).value || 'realistic photo';

    _loading = true;
    _setLoading(true);

    // 프론트엔드 타임아웃 (35초: 서버 25초 + 여유 10초)
    var controller = new AbortController();
    var fetchTimeout = setTimeout(function() { controller.abort(); }, 35000);

    try {
      var res = await fetch('/api/images/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim().substring(0, 500), user_id: user.id, platform: platform, style: style }),
        signal: controller.signal
      });
      clearTimeout(fetchTimeout);

      var data = await res.json();

      if (data.success && data.image) {
        _history.unshift({
          image: data.image, platform: platform, content: content.substring(0, 50),
          timestamp: new Date().toLocaleTimeString('ko-KR')
        });
        if (data.cost_info) _syncCredits(data.cost_info);
        _renderHistory();
        _showToast('✅ AI 썸네일이 생성되었습니다! (3크레딧 차감)');
      } else {
        var errMsg = data.error || 'AI 썸네일 생성에 실패했습니다';
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
        console.error('🖼️ AI 썸네일 생성 오류:', e);
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
    var container = document.getElementById('thumbHistory');
    if (!container) return;
    if (_history.length === 0) {
      container.innerHTML = '<div class="text-center py-6 text-gray-400">' +
        '<i class="fas fa-image text-2xl mb-2 opacity-30"></i>' +
        '<p class="text-[10px]">아직 생성된 썸네일이 없습니다</p></div>';
      return;
    }
    container.innerHTML = _history.map(function (item, i) {
      return '<div class="bg-gray-50 rounded-lg p-2 mb-2"><div class="flex gap-2">' +
        '<img src="' + item.image + '" alt="AI 썸네일" class="w-20 h-12 object-cover rounded-lg cursor-pointer flex-shrink-0" onclick="window.ThumbnailGenerator._openEditor(' + i + ')">' +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-[9px] text-gray-400">' + item.timestamp + '</p>' +
          '<p class="text-[10px] font-medium text-gray-700 truncate">' + item.content + '</p>' +
          '<div class="flex gap-1 mt-1">' +
            '<button onclick="window.ThumbnailGenerator._openEditor(' + i + ')" class="px-1.5 py-0.5 text-[9px] bg-teal-500 text-white rounded font-bold"><i class="fas fa-crop-alt mr-0.5"></i>편집</button>' +
            '<button onclick="window.ThumbnailGenerator._download(' + i + ')" class="px-1.5 py-0.5 text-[9px] bg-gray-200 text-gray-600 rounded font-bold"><i class="fas fa-download mr-0.5"></i>저장</button>' +
          '</div></div></div></div>';
    }).join('');
  }

  window.ThumbnailGenerator._openEditor = function (index) {
    var item = _history[index];
    if (item && window.ImageEditor) window.ImageEditor.open(item.image, item.content, '', 'thumbnail');
  };

  window.ThumbnailGenerator._download = function (index) {
    var item = _history[index];
    if (!item) return;
    var a = document.createElement('a');
    a.href = item.image; a.download = 'thumbnail-' + Date.now() + '.png'; a.click();
  };

  function _showToast(msg, isError) {
    if (window.showToast) window.showToast(msg, isError ? 'error' : 'success');
    else alert(msg);
  }

  function _setLoading(v) {
    var btn = document.getElementById('thumbGenBtn');
    var spinner = document.getElementById('thumbSpinner');
    if (btn) btn.disabled = v;
    if (spinner) spinner.classList.toggle('hidden', !v);
  }

  window.ThumbnailGenerator._generate = _generate;
})();
