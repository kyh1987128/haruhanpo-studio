/**
 * AI 디자인 피드백 v1.0
 * 이미지 업로드 → Gemini Vision 분석 → 점수+개선점 표시
 */
window.DesignFeedback = {
  _isLoading: false,
  _currentImage: null,

  show() {
    var viewer = document.getElementById('imageToolViewer');
    if (viewer) viewer.classList.remove('hidden');
    if (window.ImageToolTabs) window.ImageToolTabs.switchTab('feedback');

    var container = document.getElementById('tabContentFeedback');
    if (!container) return;

    container.innerHTML =
      '<div class="p-4">' +
        '<div class="flex items-center justify-between mb-4">' +
          '<h3 class="text-lg font-bold text-gray-800">\uD83D\uDD0D AI \uB514\uC790\uC778 \uD53C\uB4DC\uBC31</h3>' +
        '</div>' +

        /* 이미지 업로드 영역 */
        '<div id="dfUploadArea" class="mb-4 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition" ' +
          'onclick="document.getElementById(\'dfFileInput\').click()">' +
          '<input type="file" id="dfFileInput" accept="image/*" class="hidden" onchange="DesignFeedback._onFile(event)">' +
          '<div id="dfPreview" class="hidden mb-3"><img id="dfPreviewImg" class="max-h-48 mx-auto rounded-lg shadow"></div>' +
          '<p id="dfUploadText" class="text-sm text-gray-500">' +
            '<i class="fas fa-cloud-upload-alt text-xl text-gray-400 block mb-2"></i>' +
            '\uD83D\uDCE4 \uC774\uBBF8\uC9C0\uB97C \uB4DC\uB798\uADF8\uD558\uAC70\uB098 \uD074\uB9AD\uD558\uC138\uC694' +
          '</p>' +
        '</div>' +

        /* 또는 장표 컬렉션에서 선택 */
        '<div class="mb-4">' +
          '<button onclick="DesignFeedback._pickFromCollection()" class="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">' +
            '<i class="fas fa-layer-group mr-1"></i>\uC7A5\uD45C \uCEEC\uB809\uC158\uC5D0\uC11C \uC120\uD0DD' +
          '</button>' +
        '</div>' +

        /* 옵션 */
        '<div class="grid grid-cols-2 gap-3 mb-4">' +
          '<div>' +
            '<label class="text-xs font-medium text-gray-600 mb-1 block">\uD50C\uB7AB\uD3FC</label>' +
            '<select id="dfPlatform" class="w-full px-2 py-2 border rounded-lg text-sm">' +
              '<option value="youtube">\uD83C\uDFA5 YouTube</option>' +
              '<option value="instagram">\uD83D\uDCF7 Instagram</option>' +
              '<option value="threads">\uD83E\uDDF5 Threads</option>' +
              '<option value="blog">\uD83D\uDCDD \uBE14\uB85C\uADF8</option>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label class="text-xs font-medium text-gray-600 mb-1 block">\uC6A9\uB3C4</label>' +
            '<select id="dfUsage" class="w-full px-2 py-2 border rounded-lg text-sm">' +
              '<option value="thumbnail">\uD83D\uDDBC \uC378\uB124\uC77C</option>' +
              '<option value="card_cover">\uD83D\uDCCB \uCE74\uB4DC\uB274\uC2A4 \uD45C\uC9C0</option>' +
              '<option value="card_body">\uD83D\uDCC4 \uCE74\uB4DC\uB274\uC2A4 \uBCF8\uBB38</option>' +
              '<option value="general">\uD83C\uDFAF \uC77C\uBC18</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        '<button id="dfAnalyzeBtn" onclick="DesignFeedback.analyze()" disabled ' +
          'class="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed">' +
          '\uD83D\uDD0D \uB514\uC790\uC778 \uBD84\uC11D\uD558\uAE30 (1\uD06C\uB808\uB527)' +
        '</button>' +
        '<p class="text-xs text-gray-400 text-center mt-1">\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC \uD6C4 \uBD84\uC11D \uBC84\uD2BC\uC774 \uD65C\uC131\uD654\uB429\uB2C8\uB2E4</p>' +

        '<div id="dfResult" class="mt-4"></div>' +
      '</div>';

    // 드래그 앤 드롭
    var area = document.getElementById('dfUploadArea');
    if (area) {
      area.addEventListener('dragover', function (e) { e.preventDefault(); area.classList.add('border-blue-400', 'bg-blue-50'); });
      area.addEventListener('dragleave', function () { area.classList.remove('border-blue-400', 'bg-blue-50'); });
      area.addEventListener('drop', function (e) {
        e.preventDefault();
        area.classList.remove('border-blue-400', 'bg-blue-50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          DesignFeedback._processFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  _onFile(e) {
    if (e.target.files && e.target.files[0]) {
      this._processFile(e.target.files[0]);
    }
  },

  _processFile(file) {
    if (!file.type.startsWith('image/')) { alert('\uC774\uBBF8\uC9C0 \uD30C\uC77C\uB9CC \uC5C5\uB85C\uB4DC \uAC00\uB2A5\uD569\uB2C8\uB2E4.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('10MB \uC774\uD558\uC758 \uC774\uBBF8\uC9C0\uB9CC \uAC00\uB2A5\uD569\uB2C8\uB2E4.'); return; }

    var reader = new FileReader();
    var self = this;
    reader.onload = function (ev) {
      self._currentImage = ev.target.result;
      self._showPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  },

  _showPreview(dataUrl) {
    var preview = document.getElementById('dfPreview');
    var img = document.getElementById('dfPreviewImg');
    var txt = document.getElementById('dfUploadText');
    var btn = document.getElementById('dfAnalyzeBtn');
    if (img) img.src = dataUrl;
    if (preview) preview.classList.remove('hidden');
    if (txt) txt.innerHTML = '<span class="text-blue-500 text-xs">\uD074\uB9AD\uD558\uC5EC \uB2E4\uB978 \uC774\uBBF8\uC9C0\uB85C \uBCC0\uACBD</span>';
    if (btn) btn.disabled = false;
  },

  _pickFromCollection() {
    if (typeof SlideCollection === 'undefined') {
      alert('\uC7A5\uD45C \uCEEC\uB809\uC158\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.');
      return;
    }
    var slides = SlideCollection.getAll();
    if (!slides || slides.length === 0) {
      alert('\uC7A5\uD45C \uCEEC\uB809\uC158\uC774 \uBE44\uC5B4\uC788\uC2B5\uB2C8\uB2E4.');
      return;
    }
    // 최신 슬라이드 보여주기
    var html = '<div class="p-3 border rounded-lg max-h-60 overflow-y-auto">' +
      '<p class="text-xs font-bold text-gray-600 mb-2">\uBD84\uC11D\uD560 \uC774\uBBF8\uC9C0 \uC120\uD0DD:</p>' +
      '<div class="grid grid-cols-3 gap-2">';
    slides.slice(-12).reverse().forEach(function (s) {
      html += '<img src="' + s.image + '" class="w-full aspect-square object-cover rounded cursor-pointer border-2 border-transparent hover:border-blue-400" ' +
        'onclick="DesignFeedback._selectFromCollection(\'' + s.id + '\')">';
    });
    html += '</div></div>';

    var result = document.getElementById('dfResult');
    if (result) result.innerHTML = html;
  },

  _selectFromCollection(slideId) {
    var slides = SlideCollection.getAll();
    var found = slides.find(function (s) { return s.id === slideId; });
    if (found) {
      this._currentImage = found.image;
      this._showPreview(found.image);
      var result = document.getElementById('dfResult');
      if (result) result.innerHTML = '';
    }
  },

  async analyze() {
    if (this._isLoading || !this._currentImage) return;

    var platform = document.getElementById('dfPlatform').value;
    var usage = document.getElementById('dfUsage').value;

    this._setLoading(true);

    try {
      var res = await fetch('/api/images/design-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: this._currentImage,
          platform: platform,
          usage: usage,
          user_id: window.currentUser?.id
        })
      });

      var data = await res.json();

      if (!data.success) {
        alert(data.error || '\uB514\uC790\uC778 \uD53C\uB4DC\uBC31\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
        return;
      }

      // 헤더 크레딧 업데이트
      if (data.free_credits !== undefined) {
        window.dispatchEvent(new CustomEvent('userUpdated', {
          detail: { ...window.currentUser, free_credits: data.free_credits, paid_credits: data.paid_credits }
        }));
      }

      this._renderFeedback(data.feedback);

    } catch (err) {
      alert('\uB514\uC790\uC778 \uBD84\uC11D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.');
      console.error(err);
    } finally {
      this._setLoading(false);
    }
  },

  _setLoading(loading) {
    this._isLoading = loading;
    var btn = document.getElementById('dfAnalyzeBtn');
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.textContent = '\u23F3 AI \uBD84\uC11D \uC911...';
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btn.disabled = !this._currentImage;
      btn.textContent = '\uD83D\uDD0D \uB514\uC790\uC778 \uBD84\uC11D\uD558\uAE30 (1\uD06C\uB808\uB527)';
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  },

  _renderFeedback(fb) {
    var container = document.getElementById('dfResult');
    if (!container) return;

    var overallColor = fb.overall_score >= 4 ? 'green' : fb.overall_score >= 3 ? 'yellow' : 'red';
    var stars = '';
    for (var i = 0; i < 5; i++) {
      stars += i < fb.overall_score ? '\u2B50' : '\u2606';
    }

    var scoreItems = '';
    var scoreKeys = ['visual_impact', 'text_readability', 'color_harmony', 'platform_fit', 'click_inducement'];
    var scoreLabels = {
      visual_impact: '\uC2DC\uAC01\uC801 \uC784\uD329\uD2B8',
      text_readability: '\uD14D\uC2A4\uD2B8 \uAC00\uB3C5\uC131',
      color_harmony: '\uC0C9\uC0C1 \uC870\uD654',
      platform_fit: '\uD50C\uB7AB\uD3FC \uC801\uD569\uC131',
      click_inducement: '\uD074\uB9AD \uC720\uB3C4\uB825'
    };
    var scoreIcons = {
      visual_impact: '\uD83C\uDFA8',
      text_readability: '\uD83D\uDCDD',
      color_harmony: '\uD83C\uDF08',
      platform_fit: '\uD83D\uDCF1',
      click_inducement: '\uD83D\uDC46'
    };

    scoreKeys.forEach(function (key) {
      var s = fb.scores[key];
      if (!s) return;
      var barWidth = (s.score / 5) * 100;
      var barColor = s.score >= 4 ? 'bg-green-400' : s.score >= 3 ? 'bg-yellow-400' : 'bg-red-400';
      scoreItems +=
        '<div class="mb-3">' +
          '<div class="flex items-center justify-between mb-1">' +
            '<span class="text-xs font-medium text-gray-700">' + scoreIcons[key] + ' ' + scoreLabels[key] + '</span>' +
            '<span class="text-xs font-bold text-gray-800">' + s.score + '/5</span>' +
          '</div>' +
          '<div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">' +
            '<div class="h-full rounded-full transition-all ' + barColor + '" style="width:' + barWidth + '%"></div>' +
          '</div>' +
          '<p class="text-[10px] text-gray-500 mt-0.5">' + (s.comment || '') + '</p>' +
        '</div>';
    });

    var strengthsHtml = (fb.strengths || []).map(function (s) {
      return '<li class="text-xs text-gray-700 flex items-start gap-1"><span class="text-green-500 mt-0.5">\u2713</span> ' + s + '</li>';
    }).join('');

    var improvementsHtml = (fb.improvements || []).map(function (s) {
      return '<li class="text-xs text-gray-700 flex items-start gap-1"><span class="text-orange-500 mt-0.5">\u25B6</span> ' + s + '</li>';
    }).join('');

    container.innerHTML =
      '<div class="border-t pt-4">' +
        /* 종합 점수 */
        '<div class="text-center mb-4 p-3 bg-' + overallColor + '-50 rounded-xl border border-' + overallColor + '-200">' +
          '<p class="text-2xl mb-1">' + stars + '</p>' +
          '<p class="text-sm font-bold text-gray-800">\uC885\uD569 \uC810\uC218: ' + fb.overall_score + '/5</p>' +
        '</div>' +
        /* 세부 점수 */
        '<div class="mb-4">' + scoreItems + '</div>' +
        /* 강점 */
        (strengthsHtml ? '<div class="mb-3"><h4 class="text-xs font-bold text-green-700 mb-1">\uD83D\uDC4D \uAC15\uC810</h4><ul class="space-y-1">' + strengthsHtml + '</ul></div>' : '') +
        /* 개선점 */
        (improvementsHtml ? '<div class="mb-3"><h4 class="text-xs font-bold text-orange-700 mb-1">\uD83D\uDCA1 \uAC1C\uC120 \uC81C\uC548</h4><ul class="space-y-1">' + improvementsHtml + '</ul></div>' : '') +
        /* A/B 테스트 */
        (fb.ab_test_suggestion ? '<div class="p-3 bg-blue-50 rounded-lg border border-blue-200"><p class="text-xs font-bold text-blue-700 mb-1">\uD83E\uDDEA A/B \uD14C\uC2A4\uD2B8 \uC81C\uC548</p><p class="text-xs text-gray-700">' + fb.ab_test_suggestion + '</p></div>' : '') +
      '</div>';
  }
};
