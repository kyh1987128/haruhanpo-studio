/**
 * AI 이미지 생성 모듈
 * Gemini Imagen 3 API via 프록시
 */
(function () {
  'use strict';

  // ── 상태 ──
  let _history = []; // 세션 동안 생성 히스토리
  let _loading = false;
  let _modalEl = null;
  let _keyword = '';

  // ── 공개 API ──
  window.ImageGenerator = {
    open: open,
    close: close
  };

  function open() {
    _keyword = _extractKeyword();
    if (!_keyword) {
      alert('콘텐츠를 먼저 생성해주세요.');
      return;
    }
    if (!_modalEl) _createModal();
    _modalEl.classList.remove('hidden');
    document.getElementById('aiGenKeyword').value = _keyword;
    _renderHistory();
  }

  function close() {
    if (_modalEl) _modalEl.classList.add('hidden');
  }

  // ── 키워드 추출 (폴백 순서: batchResults → keyword_N input → 빈값) ──
  function _extractKeyword() {
    // 1) batchResults에서 추출 (일괄 생성 완료 시)
    if (window.batchResults && window.batchResults.length > 0) {
      const kw = window.batchResults[0].keywords;
      if (kw && (typeof kw === 'string' ? kw.trim() : '')) {
        return typeof kw === 'string' ? kw.trim().split(',')[0].trim() : kw;
      }
    }
    // 2) 콘텐츠 블록의 키워드 입력 필드에서 직접 가져오기 (단일 생성 시)
    for (let i = 0; i < 10; i++) {
      const el = document.getElementById('keyword_' + i);
      if (el && el.value && el.value.trim()) {
        return el.value.trim().split(',')[0].trim();
      }
    }
    return '';
  }

  // ── AI 이미지 생성 요청 ──
  async function _generate() {
    if (_loading) return;

    const user = window.currentUser;
    if (!user || !user.id || user.isGuest) {
      alert('로그인이 필요합니다.');
      return;
    }

    const totalCredits = (user.free_credits || 0) + (user.paid_credits || 0);
    if (totalCredits < 2) {
      if (confirm('크레딧이 부족합니다 (2크레딧 필요). 충전 페이지로 이동하시겠습니까?')) {
        location.href = '/payment';
      }
      return;
    }

    _keyword = document.getElementById('aiGenKeyword')?.value?.trim() || _keyword;
    const style = document.getElementById('aiGenStyle')?.value || 'professional marketing photo';

    _loading = true;
    _setLoading(true);

    try {
      const res = await fetch('/api/images/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: _keyword,
          user_id: user.id,
          style: style
        })
      });

      const data = await res.json();

      if (data.success && data.image) {
        // 히스토리에 추가
        _history.unshift({
          image: data.image,
          prompt: data.prompt,
          keyword: _keyword,
          timestamp: new Date().toLocaleTimeString('ko-KR')
        });

        // 크레딧 UI 동기화
        if (data.cost_info) {
          _syncCredits(data.cost_info);
        }

        _renderHistory();
        _showToast('✅ AI 이미지가 생성되었습니다! (2크레딧 차감)');
      } else {
        const errMsg = data.error || 'AI 이미지 생성에 실패했습니다';
        if (data.refunded) {
          _showToast('⚠️ ' + errMsg, true);
          if (data.free_credits !== undefined) {
            _syncCredits({
              free_credits: data.free_credits,
              paid_credits: data.paid_credits
            });
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
      console.error('AI 이미지 생성 오류:', e);
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
    // 헤더 업데이트 이벤트
    window.dispatchEvent(new CustomEvent('userUpdated', {
      detail: {
        free_credits: info.free_credits,
        paid_credits: info.paid_credits,
        ...(window.currentUser || {})
      }
    }));
  }

  // ── 히스토리 렌더링 ──
  function _renderHistory() {
    const container = document.getElementById('aiGenHistory');
    if (!container) return;

    if (_history.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-gray-400">
          <i class="fas fa-magic text-4xl mb-3 opacity-30"></i>
          <p class="text-sm">아직 생성된 이미지가 없습니다</p>
          <p class="text-xs mt-1">위 버튼을 클릭하여 AI 이미지를 생성하세요</p>
        </div>`;
      return;
    }

    container.innerHTML = _history.map((item, i) => `
      <div class="bg-gray-50 rounded-xl p-3 mb-3">
        <div class="flex gap-3">
          <img src="${item.image}" alt="AI 생성" class="w-24 h-24 object-cover rounded-lg cursor-pointer flex-shrink-0"
               onclick="window.ImageGenerator._openEditor(${i})">
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 mb-1">${item.timestamp}</p>
            <p class="text-xs font-medium text-gray-700 truncate">${item.keyword}</p>
            <p class="text-[10px] text-gray-400 mt-1 line-clamp-2">${item.prompt}</p>
            <div class="flex gap-1.5 mt-2">
              <button onclick="window.ImageGenerator._openEditor(${i})"
                      class="px-2 py-1 text-[10px] bg-teal-500 text-white rounded font-bold">
                <i class="fas fa-crop-alt mr-1"></i>편집
              </button>
              <button onclick="window.ImageGenerator._download(${i})"
                      class="px-2 py-1 text-[10px] bg-gray-200 text-gray-600 rounded font-bold">
                <i class="fas fa-download mr-1"></i>저장
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ── 에디터 열기 ──
  window.ImageGenerator._openEditor = function (index) {
    const item = _history[index];
    if (!item) return;
    if (window.ImageEditor) {
      window.ImageEditor.open(item.image, item.keyword, _keyword);
    }
  };

  // ── 다운로드 ──
  window.ImageGenerator._download = function (index) {
    const item = _history[index];
    if (!item) return;
    const a = document.createElement('a');
    a.href = item.image;
    a.download = `ai-image-${Date.now()}.png`;
    a.click();
  };

  // ── 토스트 ──
  function _showToast(msg, isError) {
    if (window.showToast) {
      window.showToast(msg, isError ? 'error' : 'success');
    } else {
      alert(msg);
    }
  }

  // ── 로딩 ──
  function _setLoading(v) {
    const btn = document.getElementById('aiGenBtn');
    const spinner = document.getElementById('aiGenSpinner');
    if (btn) btn.disabled = v;
    if (spinner) spinner.classList.toggle('hidden', !v);
  }

  // ── 모달 생성 ──
  function _createModal() {
    _modalEl = document.createElement('div');
    _modalEl.id = 'aiImageGenModal';
    _modalEl.className = 'hidden fixed inset-0 z-[9999] flex items-center justify-center bg-black/50';
    _modalEl.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <!-- 헤더 -->
        <div class="flex items-center justify-between px-5 py-3 border-b">
          <h3 class="font-bold text-gray-800 flex items-center gap-2">
            <i class="fas fa-magic text-purple-500"></i> AI 이미지 생성
            <span class="text-xs font-normal text-orange-500">(2크레딧/회)</span>
          </h3>
          <button onclick="window.ImageGenerator.close()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <!-- 입력 -->
        <div class="px-5 py-3 border-b bg-gray-50 space-y-2">
          <div>
            <label class="text-xs font-semibold text-gray-600">키워드</label>
            <input id="aiGenKeyword" type="text" placeholder="이미지 생성 키워드"
                   class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none">
          </div>
          <div>
            <label class="text-xs font-semibold text-gray-600">스타일</label>
            <select id="aiGenStyle" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none">
              <option value="professional marketing photo">📸 전문 마케팅 사진</option>
              <option value="flat design illustration">🎨 플랫 디자인 일러스트</option>
              <option value="minimal product photo on white background">🧊 미니멀 제품 사진</option>
              <option value="warm lifestyle photo">☀️ 따뜻한 라이프스타일</option>
              <option value="food photography close-up">🍽️ 음식 사진 (클로즈업)</option>
              <option value="modern social media banner">📱 소셜미디어 배너</option>
            </select>
          </div>
          <button id="aiGenBtn" onclick="window.ImageGenerator._generate()"
                  class="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg font-bold text-sm disabled:opacity-50">
            <i id="aiGenSpinner" class="fas fa-spinner fa-spin mr-1 hidden"></i>
            <i class="fas fa-magic mr-1"></i>AI 이미지 생성 (2크레딧)
          </button>
        </div>

        <!-- 히스토리 -->
        <div class="flex-1 overflow-y-auto px-5 py-3">
          <p class="text-xs font-semibold text-gray-500 mb-2">생성 히스토리 (이번 세션)</p>
          <div id="aiGenHistory"></div>
        </div>
      </div>
    `;
    _modalEl.addEventListener('click', (e) => {
      if (e.target === _modalEl) close();
    });
    document.body.appendChild(_modalEl);
  }

  // 내부 함수를 window에서 접근 가능하게
  window.ImageGenerator._generate = _generate;
})();
