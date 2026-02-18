/**
 * AI 카드뉴스 생성기 v1.0
 * 콘텐츠를 슬라이드별로 분배하고 배경 이미지를 AI 생성
 */
window.CardNewsGenerator = {
  _isLoading: false,

  show() {
    // 뷰어 카드 표시
    var viewer = document.getElementById('imageToolViewer');
    if (viewer) viewer.classList.remove('hidden');
    if (window.ImageToolTabs) window.ImageToolTabs.switchTab('cardnews');

    var container = document.getElementById('tabContentCardNews');
    if (!container) return;

    container.innerHTML =
      '<div class="p-4">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<h3 class="text-lg font-bold text-gray-800">📋 AI 카드뉴스 생성</h3>' +
        '</div>' +

        '<div class="mb-4">' +
          '<label class="text-sm font-medium text-gray-700 mb-1 block">콘텐츠 내용</label>' +
          '<textarea id="cardNewsContent" rows="6" ' +
            'placeholder="카드뉴스로 만들 콘텐츠를 붙여넣으세요. AI가 슬라이드별로 자동 분배합니다." ' +
            'class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent resize-y"></textarea>' +
        '</div>' +

        '<div class="grid grid-cols-3 gap-3 mb-4">' +
          '<div>' +
            '<label class="text-xs font-medium text-gray-600 mb-1 block">플랫폼</label>' +
            '<select id="cardNewsPlatform" class="w-full px-2 py-2 border rounded-lg text-sm">' +
              '<option value="instagram_square">📷 인스타 (1:1)</option>' +
              '<option value="instagram_portrait">📷 인스타 (4:5)</option>' +
              '<option value="instagram_story">📷 인스타 스토리/릴스 (9:16)</option>' +
              '<option value="threads">🧵 스레드 (1:1)</option>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label class="text-xs font-medium text-gray-600 mb-1 block">슬라이드 수</label>' +
            '<select id="cardNewsSlideCount" class="w-full px-2 py-2 border rounded-lg text-sm">' +
              '<option value="3">3장</option>' +
              '<option value="5" selected>5장</option>' +
              '<option value="7">7장</option>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label class="text-xs font-medium text-gray-600 mb-1 block">스타일</label>' +
            '<select id="cardNewsStyle" class="w-full px-2 py-2 border rounded-lg text-sm">' +
              '<option value="modern">🎨 모던</option>' +
              '<option value="minimal">⬜ 미니멀</option>' +
              '<option value="cinematic">🎬 시네마틱</option>' +
              '<option value="retro">📻 레트로</option>' +
              '<option value="cyberpunk">🌃 사이버펑크</option>' +
              '<option value="watercolor">🖌️ 수채화</option>' +
              '<option value="pop_art">🎪 팝아트</option>' +
              '<option value="dreamy">✨ 몽환적</option>' +
              '<option value="professional">💼 비즈니스</option>' +
              '<option value="playful">🎈 캐주얼</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        '<button id="cardNewsGenBtn" onclick="CardNewsGenerator.generate()" ' +
          'class="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition">' +
          '📋 카드뉴스 생성 (5크레딧)' +
        '</button>' +
        '<p class="text-xs text-gray-400 text-center mt-1">크레딧이 차감됩니다</p>' +

        '<div id="cardNewsResult" class="mt-4"></div>' +
      '</div>';
  },

  hide() {
    var container = document.getElementById('tabContentCardNews');
    if (container) container.innerHTML = '';
  },

  async generate() {
    if (this._isLoading) return;

    var content = document.getElementById('cardNewsContent');
    if (!content || !content.value.trim()) {
      alert('콘텐츠 내용을 입력해주세요.');
      return;
    }

    var platform = document.getElementById('cardNewsPlatform').value;
    var slideCount = parseInt(document.getElementById('cardNewsSlideCount').value);
    var style = document.getElementById('cardNewsStyle').value;

    this._setLoading(true);

    try {
      var res = await fetch('/api/images/generate-card-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.value.trim(),
          platform: platform,
          slideCount: slideCount,
          style: style,
          user_id: window.currentUser?.id
        })
      });

      var data = await res.json();

      if (!data.success) {
        alert(data.error || '카드뉴스 생성에 실패했습니다.');
        return;
      }

      // 헤더 크레딧 업데이트
      if (data.free_credits !== undefined) {
        window.dispatchEvent(new CustomEvent('userUpdated', {
          detail: { ...window.currentUser, free_credits: data.free_credits, paid_credits: data.paid_credits }
        }));
      }

      this._renderResult(data);
      this._addToSlideCollection(data);

    } catch (err) {
      alert('카드뉴스 생성 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      this._setLoading(false);
    }
  },

  _setLoading(loading) {
    this._isLoading = loading;
    var btn = document.getElementById('cardNewsGenBtn');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.textContent = '⏳ 카드뉴스 생성 중... (최대 2분)';
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btn.disabled = false;
      btn.textContent = '📋 카드뉴스 생성 (5크레딧)';
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  },

  _renderResult(data) {
    var container = document.getElementById('cardNewsResult');
    if (!container) return;

    var slidesHtml = data.slides.map(function(slide, i) {
      var roleLabel = slide.role === 'cover' ? '📌 표지' : slide.role === 'cta' ? '📢 CTA' : '📄 ' + (i + 1) + '/' + data.slides.length;
      return '<div class="relative group rounded-lg overflow-hidden border shadow-sm cursor-pointer" ' +
        'onclick="CardNewsGenerator._editSlide(\'' + data.groupId + '\', ' + i + ')">' +
        '<div class="w-full max-h-[200px] bg-gray-100 overflow-hidden flex items-center justify-center">' +
        '<img src="data:image/png;base64,' + slide.image + '" class="w-full h-full object-contain">' +
        '</div>' +
        '<div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">' +
          '<p class="text-[10px] font-medium">' + roleLabel + '</p>' +
          '<p class="text-[10px] truncate">' + (slide.text_overlay || '') + '</p>' +
        '</div>' +
        '<div class="absolute top-1 right-1 hidden group-hover:flex">' +
          '<button onclick="event.stopPropagation(); CardNewsGenerator._editSlide(\'' + data.groupId + '\', ' + i + ')" ' +
            'class="w-6 h-6 bg-white rounded-full text-xs shadow flex items-center justify-center">✏️</button>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML =
      '<div class="border-t pt-4">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<h4 class="text-sm font-bold text-gray-700">✅ ' + data.slides.length + '장 생성 완료</h4>' +
          '<button onclick="CardNewsGenerator._downloadAll(\'' + data.groupId + '\')" ' +
            'class="text-xs text-green-600 hover:underline">전체 다운로드</button>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2">' + slidesHtml + '</div>' +
      '</div>';
  },

  _addToSlideCollection(data) {
    if (typeof SlideCollection === 'undefined') return;
    var allSlides = SlideCollection.getAll();
    data.slides.forEach(function(slide, i) {
      allSlides.push({
        id: 'slide_' + Date.now() + '_' + i,
        image: 'data:image/png;base64,' + slide.image,
        source: 'card-news',
        title: slide.text_overlay || ('슬라이드 ' + (i + 1)),
        timestamp: new Date().toLocaleTimeString('ko-KR'),
        date: new Date().toLocaleDateString('ko-KR'),
        groupId: data.groupId,
        groupName: data.groupName || 'AI 카드뉴스',
        groupOrder: i + 1,
        groupTotal: data.slides.length,
        role: slide.role
      });
    });
    localStorage.setItem('slideCollection', JSON.stringify(allSlides));
    SlideCollection.render();
  },

  _editSlide(groupId, index) {
    var allSlides = SlideCollection.getAll().filter(function(s) { return s.groupId === groupId; });
    if (allSlides[index] && window.ImageEditor) {
      window.ImageEditor.open(allSlides[index].image, allSlides[index].title, '', 'collection');
    }
  },

  _downloadAll(groupId) {
    var slides = SlideCollection.getAll().filter(function(s) { return s.groupId === groupId; });
    slides.sort(function(a, b) { return (a.groupOrder || 0) - (b.groupOrder || 0); });
    slides.forEach(function(s, i) {
      setTimeout(function() {
        var a = document.createElement('a');
        a.href = s.image;
        a.download = 'cardnews-' + (i + 1) + '-' + Date.now() + '.png';
        a.click();
      }, i * 500);
    });
  }
};
