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
          '📋 카드뉴스 생성 (<span id="cardNewsCreditCost">5</span>크레딧)' +
        '</button>' +
        '<p class="text-xs text-gray-400 text-center mt-1">크레딧이 차감됩니다</p>' +

        '<div id="cardNewsResult" class="mt-4"></div>' +
      '</div>';

    // 슬라이드 수 변경 시 크레딧 표시 업데이트
    var slideCountSel = document.getElementById('cardNewsSlideCount');
    if (slideCountSel) {
      slideCountSel.addEventListener('change', function() {
        var cost = parseInt(this.value) || 5;
        var costEl = document.getElementById('cardNewsCreditCost');
        if (costEl) costEl.textContent = cost;
      });
    }
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

      // platform에서 aspectRatio 계산
      var aspectRatios = {
        'instagram_square': '1/1',
        'instagram_portrait': '4/5',
        'instagram_story': '9/16',
        'threads': '1/1'
      };
      data.aspectRatio = aspectRatios[platform] || '1/1';
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
      btn.innerHTML = '⏳ 카드뉴스 생성 중... (최대 2분)';
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btn.disabled = false;
      var cost = parseInt(document.getElementById('cardNewsSlideCount')?.value) || 5;
      btn.innerHTML = '📋 카드뉴스 생성 (<span id="cardNewsCreditCost">' + cost + '</span>크레딧)';
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  },

  _renderResult(data) {
    var container = document.getElementById('cardNewsResult');
    if (!container) return;

    var slidesHtml = data.slides.map(function(slide, i) {
      var roleLabel = slide.role === 'cover' ? '📌 표지' : slide.role === 'cta' ? '📢 CTA' : '📄 ' + (i + 1) + '/' + data.slides.length;
      var layout = slide.layout || 'center';
      var textColor = slide.textColor || '#FFFFFF';
      var bgColor = slide.bgColor || '#333333';
      var bgGradient = slide.bgGradient || '';
      var overlayOpacity = slide.overlayOpacity || 0.4;
      var bgImage = slide.image ? 'data:image/png;base64,' + slide.image : '';

      // 레이아웃별 텍스트 위치 CSS
      var layoutStyles = {
        'center': 'display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20px;',
        'left': 'display:flex; flex-direction:column; align-items:flex-start; justify-content:center; text-align:left; padding:20px 30px;',
        'right': 'display:flex; flex-direction:column; align-items:flex-end; justify-content:center; text-align:right; padding:20px 30px;',
        'top': 'display:flex; flex-direction:column; align-items:center; justify-content:flex-start; text-align:center; padding:30px 20px;',
        'bottom': 'display:flex; flex-direction:column; align-items:center; justify-content:flex-end; text-align:center; padding:20px 20px 30px;'
      };
      var textPosition = layoutStyles[layout] || layoutStyles['center'];

      // 타이틀 폰트 크기 (역할별)
      var titleSize = slide.role === 'cover' ? 'font-size:24px; font-weight:800;' : slide.role === 'cta' ? 'font-size:22px; font-weight:700;' : 'font-size:18px; font-weight:700;';
      var subtitleSize = 'font-size:14px; font-weight:500; margin-top:8px;';
      var bodySize = 'font-size:13px; font-weight:400; margin-top:12px; line-height:1.6;';

      var bgStyle = bgImage
        ? 'background-image:url(' + bgImage + '); background-size:cover; background-position:center;'
        : (bgGradient ? 'background:' + bgGradient + ';' : 'background-color:' + bgColor + ';');

      return '<div class="relative rounded-lg overflow-hidden border shadow-sm" data-slide-index="' + i + '" data-group-id="' + data.groupId + '" onmouseenter="this.querySelector(\'.slide-hover-btns\').style.display=\'flex\'" onmouseleave="this.querySelector(\'.slide-hover-btns\').style.display=\'none\'">' +
        '<div id="slide-canvas-' + i + '" style="width:100%; aspect-ratio:' + (data.aspectRatio || '1/1') + '; position:relative; ' + bgStyle + '">' +
          // 오버레이
          (bgImage ? '<div style="position:absolute; inset:0; background:rgba(0,0,0,' + overlayOpacity + ');"></div>' : '') +
          // 텍스트 레이어
          '<div style="position:absolute; inset:0; ' + textPosition + ' color:' + textColor + '; z-index:2;">' +
            (slide.title ? '<div style="' + titleSize + '">' + slide.title + '</div>' : '') +
            (slide.subtitle ? '<div style="' + subtitleSize + ' opacity:0.9;">' + slide.subtitle + '</div>' : '') +
            (slide.body ? '<div style="' + bodySize + ' opacity:0.85;">' + slide.body + '</div>' : '') +
          '</div>' +
        '</div>' +
        // 역할 라벨
        '<div class="bg-black/60 text-white p-1.5">' +
          '<p class="text-[10px] font-medium">' + roleLabel + '</p>' +
          '<p class="text-[10px] truncate">' + (slide.title || '') + '</p>' +
        '</div>' +
        // hover 버튼: 편집, 삭제
        '<div class="slide-hover-btns" style="display:none; gap:4px; position:absolute; top:4px; right:4px; z-index:50;">' +
          '<button onclick="event.stopPropagation(); CardNewsGenerator._editSlide(\'' + data.groupId + '\', ' + i + ')" ' +
            'class="w-7 h-7 bg-white rounded-full text-xs shadow flex items-center justify-center" title="편집">✏️</button>' +
          '<button onclick="event.stopPropagation(); CardNewsGenerator._deleteSlide(\'' + data.groupId + '\', ' + i + ')" ' +
            'class="w-7 h-7 bg-red-500 text-white rounded-full text-xs shadow flex items-center justify-center" title="삭제">🗑️</button>' +
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

    // 데이터 저장 (배경 교체용)
    this._currentSlides = data.slides;
    this._currentGroupId = data.groupId;
    this._currentAspectRatio = data.aspectRatio || '1/1';
  },

  _addToSlideCollection(data) {
    if (typeof SlideCollection === 'undefined') return;
    // IndexedDB 기반: SlideDB.add 사용
    var promises = data.slides.map(function(slide, i) {
      var imageData = 'data:image/png;base64,' + slide.image;
      var slideItem = {
        id: 'cardnews_' + Date.now() + '_' + i,
        source: 'card-news',
        label: slide.text_overlay || ('슬라이드 ' + (i + 1)),
        imageData: imageData,
        groupId: data.groupId,
        groupName: data.groupName || 'AI 카드뉴스',
        groupOrder: i + 1,
        groupTotal: data.slides.length,
        role: slide.role
      };
      if (window.SlideDB) {
        return window.SlideDB.add(slideItem);
      } else {
        // 폴백: SlideCollection.add
        SlideCollection.add(imageData, slideItem.label, 'card-news');
        return Promise.resolve();
      }
    });
    Promise.all(promises).then(function() {
      SlideCollection.render();
    }).catch(function(err) {
      console.error('[CardNews] 장표 추가 실패:', err);
      SlideCollection.render();
    });
  },

  async _editSlide(groupId, index) {
    // 우선: #cardNewsResult에서 직접 이미지 가져오기 시도
    var resultContainer = document.getElementById('cardNewsResult');
    if (resultContainer) {
      var imgs = resultContainer.querySelectorAll('.group img');
      if (imgs[index] && window.ImageEditor) {
        var imgSrc = imgs[index].src;
        var labels = resultContainer.querySelectorAll('.group .text-\\[10px\\]');
        var label = labels[index * 2 + 1] ? labels[index * 2 + 1].textContent : ('슬라이드 ' + (index + 1));
        window.ImageEditor.open(imgSrc, label, '', 'collection');
        return;
      }
    }
    // 폴백: IndexedDB / SlideCollection
    var allSlides;
    if (window.SlideDB) {
      allSlides = await window.SlideDB.getAll();
      allSlides = allSlides.filter(function(s) { return s.groupId === groupId; });
      allSlides.sort(function(a, b) { return (a.groupOrder || 0) - (b.groupOrder || 0); });
    } else {
      allSlides = SlideCollection.getAll().filter(function(s) { return s.groupId === groupId; });
    }
    if (allSlides[index] && window.ImageEditor) {
      window.ImageEditor.open(allSlides[index].imageData || allSlides[index].image, allSlides[index].label || allSlides[index].title, '', 'collection');
    }
  },

  async _downloadAll(groupId) {
    if (typeof html2canvas === 'undefined') {
      alert('다운로드 기능을 로드 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    var canvases = document.querySelectorAll('[id^="slide-canvas-"]');
    for (var i = 0; i < canvases.length; i++) {
      try {
        var canvas = await html2canvas(canvases[i], { useCORS: true, scale: 2 });
        var a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = 'cardnews-' + (i + 1) + '.png';
        a.click();
        await new Promise(function(r) { setTimeout(r, 500); });
      } catch(err) {
        console.error('다운로드 실패:', err);
      }
    }
  },

  _deleteSlide(groupId, index) {
    if (!confirm('이 슬라이드를 삭제하시겠습니까?')) return;
    if (window.SlideDB) {
      window.SlideDB.getAll().then(function(allSlides) {
        var grouped = allSlides.filter(function(s) { return s.groupId === groupId; });
        grouped.sort(function(a, b) { return (a.groupOrder || 0) - (b.groupOrder || 0); });
        if (grouped[index]) {
          var slideId = grouped[index].id;
          window.SlideDB.delete(slideId).then(function() { SlideCollection.render(); });
        }
      });
    }
    // 화면에서도 제거
    var resultContainer = document.getElementById('cardNewsResult');
    if (resultContainer) {
      var cards = resultContainer.querySelectorAll('.group');
      if (cards[index]) cards[index].remove();
    }
  },

  _changeBg(index) {
    var self = this;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var canvas = document.getElementById('slide-canvas-' + index);
        if (canvas) {
          canvas.style.backgroundImage = 'url(' + ev.target.result + ')';
          canvas.style.backgroundSize = 'cover';
          canvas.style.backgroundPosition = 'center';
          // 배경색/그라데이션 제거
          canvas.style.backgroundColor = '';
          canvas.style.background = canvas.style.backgroundImage;
        }
        if (self._currentSlides && self._currentSlides[index]) {
          self._currentSlides[index].customBg = ev.target.result;
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
};
