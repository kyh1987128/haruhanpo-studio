/**
 * 스토리 메이커 프론트엔드 JS v1.3.0
 * - 프로젝트 CRUD, Step 네비, 자동저장
 * - 참고 URL 칩 UI (최대 5개)
 * - 참고 파일 업로드 (최대 10개, 총 50MB)
 * - 장면 수 슬라이더 (SCENE_LIMITS)
 * - 타겟 오디언스 AI 자동 추천
 * - app-v3-final.js의 window.supabaseClient / window.currentUser 대기 후 초기화
 * - 필수값 검증, Step 잠금, 예상 크레딧 표시
 */

// ========================================
// 전역 상태
// ========================================
const SM = {
  currentProjectId: null,
  currentStep: 1,
  projects: [],
  projectData: {},
  isDirty: false,
  saveTimer: null,
  initialized: false,
  // 참고 URL 목록 (배열)
  referenceUrls: [],
  // 참고 파일 목록 (배열, 메타데이터)
  referenceFiles: [],
  // 소재 유형 선택 (복수 가능)
  selectedSources: ['topic'],
  // 분위기 태그 선택
  selectedMoodTags: [],
  // 콘텐츠 유형 선택 ('drama_film' | 'webtoon')
  selectedContentType: null,
  // Step 1 장르톤 복수 선택
  selectedGenreTones: [],
  // Step 2 캐릭터 배열
  characters: [],
  // Step 2 로케이션 배열
  locations: [],
};

// 영상 길이별 장면 수 범위 (비용 고려하여 상한 조정)
const SCENE_LIMITS = {
  short_15:  { min: 2,  max: 4,  default: 3 },
  short_30:  { min: 3,  max: 6,  default: 4 },
  short_60:  { min: 4,  max: 8,  default: 6 },
  mid_3m:    { min: 6,  max: 12, default: 8 },
  mid_5m:    { min: 8,  max: 15, default: 12 },
  long_10m:  { min: 10, max: 20, default: 15 },
  long_15m:  { min: 15, max: 25, default: 20 },
};

// 크레딧 비용 상수
const SM_CREDIT_SCENARIO = 3;   // 시나리오 생성 비용
const SM_CREDIT_PER_SCENE = 3;  // 장면당 이미지 생성 비용

// ========================================
// 콘텐츠 유형 및 포맷 프리셋
// ========================================
const CONTENT_TYPES = {
  drama_film: { label: '드라마 · 영화', icon: '🎬', desc: '영화, 드라마, 숏필름, 뮤직비디오 등' },
  webtoon: { label: '웹툰 · 숏툰', icon: '📖', desc: '웹툰, 4컷만화, 카드형 만화 등' },
};

const FORMAT_PRESETS = {
  drama_film: [
    { name: '에피소드', icon: '🖥️', desc: '15분 · 16:9', length: 'long_15m', ratio: '16:9', platforms: ['youtube'], recommended: true },
    { name: '숏드라마', icon: '📱', desc: '3분 · 9:16', length: 'mid_3m', ratio: '9:16', platforms: ['youtube_shorts','tiktok'] },
    { name: '릴스/숏츠', icon: '📱', desc: '60초 · 9:16', length: 'short_60', ratio: '9:16', platforms: ['instagram_reels','tiktok'] },
  ],
  webtoon: [
    { name: '세로 웹툰', icon: '📱', desc: '10컷 · 세로', cut_count: 10, size: 'vertical', platforms: ['instagram'], recommended: true },
    { name: '인스타 캐러셀', icon: '📸', desc: '8컷 · 정방형', cut_count: 8, size: 'square', platforms: ['instagram'] },
    { name: '4컷 만화', icon: '🎴', desc: '4컷 · 정방형', cut_count: 4, size: 'square', platforms: ['instagram','twitter'] },
  ],
};

// 플랫폼 ↔ 비율 경성 제약 (절대 불가)
const PLATFORM_RATIO_LOCK = {
  instagram_reels: ['9:16','1:1'],
  tiktok: ['9:16'],
  youtube_shorts: ['9:16'],
  youtube: ['16:9'],
  blog: ['16:9','1:1'],
};

// 콘텐츠 유형 ↔ 길이 연성 제약 (경고만)
const GENRE_LENGTH_WARN = {
  drama_film: { min: 'mid_3m', msg: '드라마·영화는 3분 이상을 권장합니다' },
  webtoon: { max: 'short_60', msg: '웹툰·숏툰은 숏폼에 최적화되어 있습니다' },
};

// 비주얼 장르 판별
const VISUAL_GENRES = ['webtoon'];
function smIsVisualGenre(genre) { return VISUAL_GENRES.includes(genre); }

// 비주얼 장르별 컷 수 범위
const VISUAL_CUT_LIMITS = {
  webtoon: { min: 6, max: 20, default: 10 },
  cartoon: { min: 4, max: 8, default: 4 },
};

// 길이 순서 (비교용)
const LENGTH_ORDER = ['short_15','short_30','short_60','mid_3m','mid_5m','long_10m','long_15m'];

// ========================================
// 초기화: supabaseClient / currentUser 대기
// ========================================
(function smBootstrap() {
  let attempts = 0;
  const maxAttempts = 50;

  const poll = setInterval(() => {
    attempts++;
    if (window.supabaseClient && window.currentUser) {
      clearInterval(poll);
      smInit();
    } else if (attempts >= maxAttempts) {
      clearInterval(poll);
      console.warn('[StoryMaker] supabaseClient/currentUser 대기 타임아웃');
      const listEl = document.getElementById('sm-project-list');
      if (listEl) {
        listEl.innerHTML = '<div style="padding:24px;text-align:center;color:#ef4444;font-size:13px;"><i class="fas fa-exclamation-triangle" style="margin-bottom:8px;font-size:20px;display:block;"></i>로그인이 필요합니다.</div>';
      }
    }
  }, 100);
})();

// ========================================
// 콘텐츠 유형 카드 선택
// ========================================
function smSelectContentType(el) {
  const type = el.dataset.type;
  SM.selectedContentType = type;
  document.querySelectorAll('.sm-type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  // 숨겨진 select 동기화 (하위호환)
  const sel = document.getElementById('sm-genre');
  if (sel) sel.value = type;
  // 장르톤 카드 + 기본정보 폼 표시
  const genreToneCard = document.getElementById('sm-genre-tone-card');
  if (genreToneCard) genreToneCard.style.display = '';
  const basicInfoCard = document.getElementById('sm-basic-info-card');
  if (basicInfoCard) basicInfoCard.style.display = '';
  // 프리셋 카드 렌더링
  smRenderFormatPresets(type);
  SM.isDirty = true;
  smDebouncedSave();
}

// 하위호환: 기존 smSelectGenre 호출 시 smSelectContentType으로 위임
function smSelectGenre(el) {
  // 기존 genre 카드에서 호출 시 하위호환
  const genre = el.dataset.genre || el.dataset.type;
  if (genre) {
    el.dataset.type = genre;
    smSelectContentType(el);
  }
}

function smSyncGenreCards(genre) {
  // 하위호환: 기존 .sm-genre-card도 동기화
  document.querySelectorAll('.sm-genre-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.genre === genre);
  });
  document.querySelectorAll('.sm-type-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.type === genre);
  });
}

// ========================================
// 소재 유형 카드 선택 (복수 선택)
// ========================================
function smSelectSource(el) {
  const source = el.dataset.source;
  // 단일 선택: 이미 선택된 것을 다시 클릭하면 무시
  if (SM.selectedSources.length === 1 && SM.selectedSources[0] === source) return;
  SM.selectedSources = [source];
  smSyncSourceCards();
  SM.isDirty = true;
  smDebouncedSave();
}

function smSyncSourceCards() {
  document.querySelectorAll('.sm-source-card').forEach(c => {
    c.classList.toggle('selected', SM.selectedSources.includes(c.dataset.source));
  });
  // 소재별 패널 표시/숨김
  ['topic', 'url', 'file'].forEach(s => {
    const panel = document.getElementById('sm-source-panel-' + s);
    if (panel) {
      panel.classList.toggle('active', SM.selectedSources.includes(s));
    }
  });

  // 소재 유형에 따라 장르별 전용 폼 표시/숨김
  // - "주제로 기획": 장르별 전용 폼 표시 (사용자가 직접 입력)
  // - "웹링크 참고" / "파일 첨부": 전용 폼 숨김 (AI가 분석해서 채움)
  const isTopic = SM.selectedSources.includes('topic');
  const genreFormCard = document.getElementById('sm-genre-form-card');
  if (genreFormCard && genreFormCard.style.display !== 'none') {
    // 장르가 선택된 상태에서만 분기
    const genreFormBody = document.getElementById('sm-genre-form-body');
    if (genreFormBody) {
      // 프로젝트명 필드는 항상 표시, 나머지는 주제 기획일 때만
      genreFormBody.querySelectorAll('.sm-form-group').forEach(group => {
        const input = group.querySelector('#sm-project-name');
        if (input) {
          group.style.display = ''; // 프로젝트명은 항상 표시
        } else {
          group.style.display = isTopic ? '' : 'none';
        }
      });
    }
  }
}

// ========================================
// 분위기 태그 선택
// ========================================
function smToggleMoodTag(el) {
  const tag = el.textContent.trim();
  const idx = SM.selectedMoodTags.indexOf(tag);
  if (idx >= 0) {
    SM.selectedMoodTags.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    SM.selectedMoodTags.push(tag);
    el.classList.add('selected');
  }
  // 숨겨진 input 동기화
  const hidden = document.getElementById('sm-mood-keywords');
  if (hidden) hidden.value = SM.selectedMoodTags.join(', ');
  SM.isDirty = true;
  smDebouncedSave();
}

function smAddCustomMoodTag() {
  const input = document.getElementById('sm-mood-custom');
  if (!input) return;
  const tag = input.value.trim();
  if (!tag || SM.selectedMoodTags.includes(tag)) {
    input.value = '';
    return;
  }
  SM.selectedMoodTags.push(tag);
  // 커스텀 태그를 마지막 카테고리(템포)에 추가
  const tempoContainer = document.getElementById('sm-mood-tempo');
  if (tempoContainer) {
    const span = document.createElement('span');
    span.className = 'sm-mood-tag selected';
    span.textContent = tag;
    span.onclick = function() { smToggleMoodTag(this); };
    tempoContainer.appendChild(span);
  }
  input.value = '';
  // 숨겨진 input 동기화
  const hidden = document.getElementById('sm-mood-keywords');
  if (hidden) hidden.value = SM.selectedMoodTags.join(', ');
  SM.isDirty = true;
  smDebouncedSave();
}

function smSyncMoodTags() {
  // 모든 태그 초기화
  document.querySelectorAll('.sm-mood-tag').forEach(el => {
    el.classList.toggle('selected', SM.selectedMoodTags.includes(el.textContent.trim()));
  });
  // 커스텀 태그 (기존 프리셋에 없는 것) 추가
  const presetTags = new Set();
  document.querySelectorAll('.sm-mood-tag').forEach(el => presetTags.add(el.textContent.trim()));
  const tempoContainer = document.getElementById('sm-mood-tempo');
  SM.selectedMoodTags.forEach(tag => {
    if (!presetTags.has(tag) && tempoContainer) {
      const span = document.createElement('span');
      span.className = 'sm-mood-tag selected';
      span.textContent = tag;
      span.onclick = function() { smToggleMoodTag(this); };
      tempoContainer.appendChild(span);
      presetTags.add(tag);
    }
  });
}

// ========================================
// 사진 카드 렌더링 공통 함수
// ========================================

// 사진 카드 그리드 렌더링
function smRenderPhotoCards(containerId, cards, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const { multiSelect = false, maxSelect = 3, selectedIds = [], onSelect = 'smSelectCard' } = options;

  container.innerHTML = (cards || []).map(card => {
    const isSelected = selectedIds.includes(card.id);
    return `<div class="sm-photo-card ${isSelected ? 'selected' : ''}"
                 data-id="${card.id}"
                 onclick="${onSelect}('${containerId}', '${card.id}', ${multiSelect}, ${maxSelect})">
      ${card.img ? `<img src="${card.img}" alt="${card.label}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect fill=%22%23f3f4f6%22 width=%2260%22 height=%2260%22/></svg>'">` : ''}
      <div class="sm-photo-label">${card.label}</div>
    </div>`;
  }).join('');
}

// 컬러 팔레트 카드 렌더링
function smRenderColorCards(containerId, palettes, selectedId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = (palettes || []).map(p => {
    const isSelected = selectedId === p.id;
    const swatches = (p.colors || []).map(c => `<div style="background:${c};width:25%;height:100%;"></div>`).join('');
    return `<div class="sm-photo-card sm-color-card ${isSelected ? 'selected' : ''}"
                 data-id="${p.id}"
                 onclick="smSelectCard('${containerId}', '${p.id}', false, 1)">
      <div style="display:flex;height:60px;border-radius:8px 8px 0 0;overflow:hidden;">${swatches}</div>
      <div class="sm-color-label">${p.label}</div>
    </div>`;
  }).join('');
}

// 카드 선택 핸들러
function smSelectCard(containerId, cardId, multiSelect, maxSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (multiSelect) {
    const card = container.querySelector(`[data-id="${cardId}"]`);
    if (!card) return;
    if (card.classList.contains('selected')) {
      card.classList.remove('selected');
    } else {
      const selected = container.querySelectorAll('.sm-photo-card.selected');
      if (selected.length >= maxSelect) {
        // 최대 선택 수 초과 시 가장 먼저 선택된 것 해제
        selected[0].classList.remove('selected');
      }
      card.classList.add('selected');
    }
  } else {
    container.querySelectorAll('.sm-photo-card').forEach(c => c.classList.remove('selected'));
    const card = container.querySelector(`[data-id="${cardId}"]`);
    if (card) card.classList.add('selected');
  }

  SM.isDirty = true;
  smDebouncedSave();
}

// 선택된 카드 ID 가져오기
function smGetSelectedCards(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return [...container.querySelectorAll('.sm-photo-card.selected')].map(c => c.dataset.id);
}

// ========================================
// 장르톤 카드 렌더링
// ========================================
function smRenderGenreToneCards() {
  smRenderPhotoCards('sm-genre-tone-grid', (typeof SM_CARDS !== 'undefined' && SM_CARDS.genreTone) || [], {
    multiSelect: false,
    maxSelect: 1,
    selectedIds: SM.selectedGenreTones,
    onSelect: 'smSelectCard',
  });
}

// 하위호환: 기존 smRenderGenreForm 호출 시 무시
function smRenderGenreForm(genre) {
  // 기존 호환 - 장르 폼은 더 이상 사용하지 않음
  // 콘텐츠 유형 선택 시 장르톤 카드로 대체됨
  const card = document.getElementById('sm-genre-form-card');
  if (card) card.style.display = 'none';
}

// HTML 이스케이프 헬퍼
function smEscHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// choice 선택 핸들러
function smSelectChoice(el, fieldId) {
  const parent = el.parentElement;
  parent.querySelectorAll('.sm-mood-tag').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  SM.isDirty = true;
  smDebouncedSave();
}

// ========================================
// 포맷 프리셋 카드 렌더링
// ========================================
function smRenderFormatPresets(type) {
  const presetCard = document.getElementById('sm-preset-card');
  const grid = document.getElementById('sm-preset-grid');
  if (!presetCard || !grid) return;

  const presets = FORMAT_PRESETS[type];
  if (!presets) { presetCard.style.display = 'none'; return; }

  presetCard.style.display = '';
  grid.innerHTML = presets.map((p, i) => `
    <div class="sm-source-card ${p.recommended ? 'recommended' : ''}" onclick="smSelectPreset('${type}', ${i})">
      ${p.recommended ? '<div class="sm-preset-badge">추천</div>' : ''}
      <div class="sm-source-icon">${p.icon}</div>
      <div class="sm-source-name">${p.name}</div>
      <div class="sm-source-desc">${p.desc}</div>
    </div>
  `).join('');
}

// 하위호환: 기존 smRenderPresetCards 호출
function smRenderPresetCards(genre) {
  smRenderFormatPresets(genre);
}

// 프리셋 선택 → Step 2 자동 세팅
function smSelectPreset(type, idx) {
  const presets = FORMAT_PRESETS[type];
  if (!presets || !presets[idx]) return;
  const p = presets[idx];

  SM.selectedPresetIdx = idx;

  // Step 2 데이터 프리필
  SM.projectData.step2 = SM.projectData.step2 || {};

  if (type === 'webtoon') {
    // 웹툰 프리셋
    SM.projectData.step2.format = {
      visual_cut_count: p.cut_count || 10,
      visual_size: p.size || 'vertical',
      visual_platforms: (p.platforms || []).slice(),
    };
  } else {
    // 드라마/영화 프리셋
    SM.projectData.step2.video_length = p.length;
    SM.projectData.step2.aspect_ratio = p.ratio;
    SM.projectData.step2.platforms = (p.platforms || []).slice();
    SM.projectData.step2.has_narration = true;
    SM.projectData.step2.has_bgm = true;
    // 장면 수 기본값
    const sceneLimits = SCENE_LIMITS[p.length];
    if (sceneLimits) SM.projectData.step2.scene_count = sceneLimits.default;
  }

  // 프리셋 저장
  SM.projectData.step1 = SM.projectData.step1 || {};
  SM.projectData.step1.selected_preset = { genre: type, idx };

  // 카드 UI 업데이트
  document.querySelectorAll('#sm-preset-grid .sm-source-card').forEach((c, i) => {
    c.classList.toggle('selected', i === idx);
  });

  // 프리뷰 패널 갱신
  smRenderPreview();

  SM.isDirty = true;
  smDebouncedSave();
}

// 추천으로 되돌리기
function smResetToPreset() {
  const s1 = SM.projectData.step1 || {};
  const preset = s1.selected_preset;
  if (preset) {
    const type = preset.genre || s1.content_type || s1.genre;
    smSelectPreset(type, preset.idx);
    // Step 2 폼도 업데이트
    smFillStepForm(2);
  }
  const warn = document.getElementById('sm-format-warning');
  if (warn) warn.style.display = 'none';
}

// ========================================
// Step 2 제약 로직
// ========================================

// 플랫폼 변경 시 → 비율 제약 적용
function smApplyPlatformConstraints() {
  const selectedPlatforms = smGetSelectedCheckboxes('sm-platforms');
  if (!selectedPlatforms || selectedPlatforms.length === 0) return;

  // 선택된 플랫폼들이 공통으로 지원하는 비율 계산
  let allowedRatios = null;
  selectedPlatforms.forEach(p => {
    const ratios = PLATFORM_RATIO_LOCK[p];
    if (ratios) {
      if (!allowedRatios) {
        allowedRatios = new Set(ratios);
      } else {
        // 교집합
        allowedRatios = new Set([...allowedRatios].filter(r => ratios.includes(r)));
      }
    }
  });

  // 비율 옵션 활성/비활성
  if (allowedRatios && allowedRatios.size > 0) {
    document.querySelectorAll('[name="sm-aspect-ratio"]').forEach(item => {
      const optionEl = item.closest('.sm-option-item');
      if (!optionEl) return;
      const val = item.value;
      if (allowedRatios.has(val)) {
        optionEl.classList.remove('disabled');
      } else {
        optionEl.classList.add('disabled');
        if (item.checked) {
          item.checked = false;
          optionEl.classList.remove('selected');
          // 첫 번째 허용 비율로 변경
          const firstAllowed = [...allowedRatios][0];
          const firstEl = document.querySelector(`[name="sm-aspect-ratio"][value="${firstAllowed}"]`);
          if (firstEl) {
            firstEl.checked = true;
            firstEl.closest('.sm-option-item')?.classList.add('selected');
          }
        }
      }
    });
  }
}

// 비율 변경 시 → 비호환 플랫폼 해제
function smApplyRatioConstraints() {
  const ratio = smGetSelectedRadio('sm-aspect-ratio');
  if (!ratio) return;

  document.querySelectorAll('[name="sm-platforms"]').forEach(item => {
    const optionEl = item.closest('.sm-option-item');
    if (!optionEl) return;
    const platform = item.value;
    const allowed = PLATFORM_RATIO_LOCK[platform];
    if (allowed && !allowed.includes(ratio)) {
      optionEl.classList.add('disabled');
      if (item.checked) {
        item.checked = false;
        optionEl.classList.remove('selected');
      }
    } else {
      optionEl.classList.remove('disabled');
    }
  });
}

// 길이 변경 시 → 장르 경고 체크
function smCheckLengthWarning() {
  const genre = SM.selectedContentType || document.getElementById('sm-genre')?.value;
  const length = document.getElementById('sm-video-length')?.value;
  const warn = GENRE_LENGTH_WARN[genre];
  const warnEl = document.getElementById('sm-format-warning');
  const warnText = document.getElementById('sm-format-warning-text');
  if (!warn || !warnEl || !warnText || !length) { if(warnEl) warnEl.style.display='none'; return; }

  const li = LENGTH_ORDER.indexOf(length);
  const minI = warn.min ? LENGTH_ORDER.indexOf(warn.min) : 0;
  const maxI = warn.max ? LENGTH_ORDER.indexOf(warn.max) : LENGTH_ORDER.length - 1;

  if (li < minI || li > maxI) {
    warnText.textContent = warn.msg;
    warnEl.style.display = '';
  } else {
    warnEl.style.display = 'none';
  }
}

async function smInit() {
  if (SM.initialized) return;
  SM.initialized = true;
  console.log('[StoryMaker] 초기화 시작');

  // 프로젝트 목록 로드
  await smLoadProjects();

  // 폼 변경 감지 (자동저장)
  smSetupAutosave();

  // 영상 길이 변경 → 장면 수 슬라이더 업데이트 + 경고 체크
  const videoLengthEl = document.getElementById('sm-video-length');
  if (videoLengthEl) {
    videoLengthEl.addEventListener('change', () => {
      smOnVideoLengthChange();
      smCheckLengthWarning();
    });
  }

  // 장르 변경 → 타겟 오디언스 가시성 + AI 추천 버튼 상태
  const genreEl = document.getElementById('sm-genre');
  if (genreEl) {
    genreEl.addEventListener('change', smOnGenreChange);
  }

  // 플랫폼 체크박스 변경 → 비율 제약 적용
  document.querySelectorAll('[name="sm-platforms"]').forEach(el => {
    el.addEventListener('change', () => {
      smApplyPlatformConstraints();
      smCheckLengthWarning();
    });
  });

  // 비율 라디오 변경 → 플랫폼 제약 적용
  document.querySelectorAll('[name="sm-aspect-ratio"]').forEach(el => {
    el.addEventListener('change', () => {
      smApplyRatioConstraints();
    });
  });

  // 파일 드롭존 드래그 앤 드롭 설정
  smSetupFileDropzone();

  console.log('[StoryMaker] 초기화 완료');
}

// ========================================
// API 헬퍼
// ========================================
function smGetToken() {
  return localStorage.getItem('postflow_token') || '';
}

async function smApiCall(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${smGetToken()}`,
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  return res.json();
}

// ========================================
// 프로젝트 CRUD
// ========================================

// 목록 로드
async function smLoadProjects() {
  try {
    const data = await smApiCall('GET', '/api/storymaker/projects');
    if (data.success) {
      SM.projects = data.projects || [];
      smRenderProjectList();
    } else {
      console.error('[StoryMaker] 프로젝트 로드 실패:', data.error);
      smRenderProjectList();
    }
  } catch (e) {
    console.error('[StoryMaker] 프로젝트 로드 예외:', e);
    SM.projects = [];
    smRenderProjectList();
  }
}

// 새 프로젝트 생성
async function smCreateProject() {
  const name = prompt('프로젝트 이름을 입력하세요:', '새 프로젝트');
  if (!name || !name.trim()) return;

  try {
    const data = await smApiCall('POST', '/api/storymaker/projects', { name: name.trim() });
    if (data.success && data.project) {
      await smLoadProjects();
      smSelectProject(data.project.id);
    } else {
      alert('프로젝트 생성에 실패했습니다: ' + (data.error || '알 수 없는 오류'));
    }
  } catch (e) {
    console.error('[StoryMaker] 프로젝트 생성 예외:', e);
    alert('프로젝트 생성 중 오류가 발생했습니다.');
  }
}

// 프로젝트 선택
async function smSelectProject(id) {
  // 현재 변경사항 저장
  if (SM.isDirty && SM.currentProjectId) {
    await smSaveProject();
  }

  try {
    const data = await smApiCall('GET', `/api/storymaker/projects/${id}`);
    if (data.success && data.project) {
      SM.currentProjectId = id;
      SM.projectData = smMigrateProjectData(data.project.project_data || {});
      SM.currentStep = data.project.current_step || 1;
      SM.isDirty = false;

      // 캐릭터/로케이션 동기화
      SM.characters = SM.projectData.step2?.characters || [];
      SM.locations = SM.projectData.step2?.locations || [];
      SM.selectedContentType = SM.projectData.step1?.content_type || SM.projectData.step1?.genre || '';
      SM.selectedGenreTones = SM.projectData.step1?.genre_tones || [];

      // 참고 URL/파일 목록 동기화
      smSyncUrlsFromData();
      smSyncFilesFromData();

      // UI 업데이트
      smRenderProjectList();
      smShowStepNav();
      smSwitchStep(SM.currentStep, true);

      // welcome 숨기기
      const welcome = document.getElementById('sm-welcome');
      if (welcome) welcome.style.display = 'none';

      // 프리뷰 패널 즉시 갱신
      smRenderPreview();
    }
  } catch (e) {
    console.error('[StoryMaker] 프로젝트 로드 예외:', e);
  }
}

// 프로젝트 삭제
async function smDeleteProject(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('이 프로젝트를 삭제하시겠습니까?\n삭제된 프로젝트는 복구할 수 없습니다.')) return;

  try {
    const data = await smApiCall('DELETE', `/api/storymaker/projects/${id}`);
    if (data.success) {
      if (SM.currentProjectId === id) {
        SM.currentProjectId = null;
        SM.projectData = {};
        SM.currentStep = 1;
        SM.isDirty = false;
        SM.referenceUrls = [];
        SM.referenceFiles = [];

        const stepNav = document.getElementById('sm-step-nav');
        if (stepNav) stepNav.style.display = 'none';

        smHideAllSteps();
        const welcome = document.getElementById('sm-welcome');
        if (welcome) welcome.style.display = '';

        smClearPreview();
      }
      await smLoadProjects();
    } else {
      alert('삭제 실패: ' + (data.error || '알 수 없는 오류'));
    }
  } catch (e) {
    console.error('[StoryMaker] 프로젝트 삭제 예외:', e);
  }
}

// 프로젝트 저장
async function smSaveProject() {
  if (!SM.currentProjectId) return;

  // 현재 Step 데이터 수집
  smCollectStepData(SM.currentStep);

  smSetAutosaveStatus('saving');

  try {
    const data = await smApiCall('PUT', `/api/storymaker/projects/${SM.currentProjectId}`, {
      project_data: SM.projectData,
      current_step: SM.currentStep,
      name: SM.projectData.step1?.title || SM.projectData.step1?.project_name || undefined,
    });

    if (data.success) {
      SM.isDirty = false;
      smSetAutosaveStatus('saved');
      smRenderPreview();

      // 프로젝트 이름 변경 시 좌측 목록 갱신
      if (data.project?.name) {
        const proj = SM.projects.find(p => p.id === SM.currentProjectId);
        if (proj && proj.name !== data.project.name) {
          proj.name = data.project.name;
          smRenderProjectList();
        }
      }
    } else {
      smSetAutosaveStatus('error');
      console.error('[StoryMaker] 저장 실패:', data.error);
    }
  } catch (e) {
    smSetAutosaveStatus('error');
    console.error('[StoryMaker] 저장 예외:', e);
  }
}

// ========================================
// 토스트 알림
// ========================================
function smShowToast(message, type = 'error') {
  // 기존 토스트 제거
  document.querySelectorAll('.sm-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `sm-toast sm-toast-${type}`;
  toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
  document.body.appendChild(toast);

  // 등장 애니메이션
  requestAnimationFrame(() => toast.classList.add('visible'));

  // 3초 후 제거
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========================================
// 필수값 검증
// ========================================
function smValidateStep(n) {
  const missing = [];

  if (n === 1) {
    // 콘텐츠 유형 필수, 제목은 선택
    const contentType = SM.selectedContentType || document.getElementById('sm-genre')?.value;
    const isTopic = SM.selectedSources.includes('topic');

    if (!contentType) {
      missing.push('sm-genre');
      smShowToast('콘텐츠 유형을 선택해주세요');
    }

    if (isTopic) {
      // 주제 기획: 시놉시스 필수
      const msg = document.getElementById('sm-synopsis')?.value?.trim() || document.getElementById('sm-core-message')?.value?.trim();
      if (!msg) missing.push('sm-synopsis');
    } else if (SM.selectedSources.includes('url')) {
      // 웹링크: URL 1개 이상 필수
      if (SM.referenceUrls.length === 0) {
        missing.push('sm-url-input');
        smShowToast('참고 URL을 최소 1개 추가해주세요');
      }
    } else if (SM.selectedSources.includes('file')) {
      // 파일: 파일 1개 이상 필수
      if (SM.referenceFiles.length === 0) {
        missing.push('sm-file-dropzone');
        smShowToast('참고 파일을 최소 1개 업로드해주세요');
      }
    }
  } else if (n === 2) {
    // 캐릭터 최소 1명, 로케이션 최소 1개
    if (!SM.characters || SM.characters.length === 0) {
      missing.push('sm-characters-list');
      smShowToast('캐릭터를 최소 1명 추가해주세요');
    }
    if (!SM.locations || SM.locations.length === 0) {
      missing.push('sm-locations-list');
      smShowToast('장소를 최소 1개 추가해주세요');
    }
  }

  if (missing.length > 0) {
    // 필드 하이라이트
    missing.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('sm-field-error');
        // 3초 후 하이라이트 제거
        setTimeout(() => el.classList.remove('sm-field-error'), 3000);
      }
    });
    if (!missing.some(id => id === 'sm-characters-list' || id === 'sm-locations-list')) {
      smShowToast('필수 항목을 입력해주세요');
    }
    // 첫 번째 미입력 필드로 스크롤
    const firstEl = document.getElementById(missing[0]);
    if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  return true;
}

// Step 완료 판정 (locked 해제용)
function smIsStepCompleted(n) {
  const d = SM.projectData[`step${n}`];
  if (!d) return false;

  if (n === 1) {
    const contentType = d.content_type || d.genre;
    if (!contentType) return false;
    const isTopic = !d.source_types || d.source_types.includes('topic');
    if (isTopic) {
      const synopsis = d.synopsis || d.core_message;
      return !!(synopsis?.trim());
    } else {
      const hasUrl = Array.isArray(d.reference_urls) && d.reference_urls.length > 0;
      const hasFile = Array.isArray(d.reference_files) && d.reference_files.length > 0;
      return !!(hasUrl || hasFile);
    }
  } else if (n === 2) {
    return !!(d.characters?.length > 0 && d.locations?.length > 0);
  }
  return false;
}

// ========================================
// Step 전환
// ========================================
function smSwitchStep(n, skipSave) {
  // locked step 차단 (Step 3 이상은 이전 단계 완료 필요)
  if (n > 2 && !skipSave) {
    // Step 1, 2 모두 완료되어야 Step 3+ 접근
    if (!smIsStepCompleted(1) || !smIsStepCompleted(2)) {
      smShowToast('이전 단계를 먼저 완료해주세요');
      return;
    }
  }

  // 다음 단계로 갈 때 현재 Step 필수값 검증
  if (!skipSave && n > SM.currentStep) {
    if (!smValidateStep(SM.currentStep)) {
      return; // 검증 실패 시 이동 차단
    }
  }

  // 현재 데이터 수집 & 저장
  if (!skipSave && SM.currentProjectId && SM.currentStep) {
    smCollectStepData(SM.currentStep);
    SM.isDirty = true;
    smDebouncedSave();
  }

  SM.currentStep = n;
  smHideAllSteps();

  const targetStep = document.getElementById(`sm-step-${n}`);
  if (targetStep) {
    targetStep.classList.add('active');
    smFillStepForm(n);
  }

  smRenderStepNav();

  const mainContent = document.querySelector('.sm-main-content');
  if (mainContent) mainContent.scrollTop = 0;
}

function smHideAllSteps() {
  document.querySelectorAll('.sm-step-container').forEach(el => {
    el.classList.remove('active');
  });
}

function smShowStepNav() {
  const nav = document.getElementById('sm-step-nav');
  if (nav) nav.style.display = '';
  smRenderStepNav();
}

// Step 2 트랙 전환 (영상 vs 비주얼)
function smSwitchStep2Track() {
  const type = SM.projectData.step1?.content_type || SM.projectData.step1?.genre || '';
  const isVisual = (type === 'webtoon') || smIsVisualGenre(type);
  const videoTrack = document.getElementById('sm-step2-video-track');
  const visualTrack = document.getElementById('sm-step2-visual-track');
  if (videoTrack) videoTrack.style.display = isVisual ? 'none' : '';
  if (visualTrack) visualTrack.style.display = isVisual ? '' : 'none';

  // 비주얼 트랙: 장르별 컷 수 범위 설정
  if (isVisual) {
    const limits = VISUAL_CUT_LIMITS[genre] || { min: 4, max: 20, default: 8 };
    const slider = document.getElementById('sm-visual-cut-count');
    const rangeLabel = document.getElementById('sm-visual-cut-range-label');
    if (slider) {
      slider.min = limits.min;
      slider.max = limits.max;
      if (!SM.projectData.step2?.visual_cut_count) {
        slider.value = limits.default;
        smOnVisualCutChange(limits.default);
      }
    }
    if (rangeLabel) rangeLabel.textContent = `${limits.min}~${limits.max}컷`;
  }
}

// 비주얼 컷 수 슬라이더 변경
function smOnVisualCutChange(val) {
  const valEl = document.getElementById('sm-visual-cut-value');
  if (valEl) valEl.textContent = val;
}

// ========================================
// 데이터 수집 & 폼 채우기
// ========================================
function smCollectStepData(n) {
  if (n === 1) {
    // 분위기 태그 → 쉼표 구분 문자열로 저장 (하위 호환)
    const moodStr = SM.selectedMoodTags.join(', ');
    const moodHidden = document.getElementById('sm-mood-keywords');
    if (moodHidden) moodHidden.value = moodStr;

    SM.projectData.step1 = {
      content_type: SM.selectedContentType || '',
      genre_tones: smGetSelectedCards('sm-genre-tone-grid'),
      title: document.getElementById('sm-title')?.value || '',
      synopsis: document.getElementById('sm-synopsis')?.value || '',
      source_types: SM.selectedSources.slice(),
      reference_urls: SM.referenceUrls.slice(),
      reference_files: SM.referenceFiles.slice(),
      url_direction: document.getElementById('sm-url-direction')?.value || '',
      file_direction: document.getElementById('sm-file-direction')?.value || '',
      additional_notes: document.getElementById('sm-additional-notes')?.value || '',
      selected_preset: SM.projectData.step1?.selected_preset || null,
      mood_keywords: moodStr,
      // 하위호환 필드
      genre: SM.selectedContentType || '',
      project_name: document.getElementById('sm-title')?.value || document.getElementById('sm-project-name')?.value || '',
      core_message: document.getElementById('sm-synopsis')?.value || document.getElementById('sm-core-message')?.value || '',
      target_audience: document.getElementById('sm-target-audience')?.value || '',
    };
  } else if (n === 2) {
    const type = SM.projectData.step1?.content_type || SM.projectData.step1?.genre || 'drama_film';
    const isVisual = (type === 'webtoon');

    SM.projectData.step2 = {
      characters: SM.characters.slice(),
      locations: SM.locations.slice(),
      visual_style: {
        shooting_style: isVisual ? null : smGetSelectedCards('sm-shooting-style-grid')[0] || '',
        art_style: isVisual ? smGetSelectedCards('sm-art-style-grid')[0] || '' : null,
        color_palette: smGetSelectedCards('sm-color-palette-grid')[0] || '',
      },
      format: isVisual ? {
        visual_cut_count: parseInt(document.getElementById('sm-visual-cut-count')?.value) || 10,
        visual_size: smGetSelectedRadio('sm-visual-size'),
        visual_platforms: smGetSelectedCheckboxes('sm-visual-platforms'),
      } : {
        video_length: document.getElementById('sm-video-length')?.value || '',
        scene_count: parseInt(document.getElementById('sm-scene-count')?.value) || 0,
        aspect_ratio: smGetSelectedRadio('sm-aspect-ratio'),
        platforms: smGetSelectedCheckboxes('sm-platforms'),
        has_narration: document.getElementById('sm-has-narration')?.checked ?? true,
        has_bgm: document.getElementById('sm-has-bgm')?.checked ?? true,
      },
      // 하위호환 필드
      track: isVisual ? 'visual' : 'video',
      video_length: isVisual ? 'short_60' : (document.getElementById('sm-video-length')?.value || ''),
      aspect_ratio: isVisual ? '9:16' : smGetSelectedRadio('sm-aspect-ratio'),
      platforms: isVisual ? smGetSelectedCheckboxes('sm-visual-platforms') : smGetSelectedCheckboxes('sm-platforms'),
      scene_count: isVisual
        ? (parseInt(document.getElementById('sm-visual-cut-count')?.value) || 10)
        : (parseInt(document.getElementById('sm-scene-count')?.value) || 0),
    };
  }
}

// 폼 값 채우기 — 데이터 없으면 명시적으로 초기화 (새 프로젝트 버그 수정)
function smFillStepForm(n) {
  if (n === 1) {
    const d = SM.projectData.step1 || {};

    // 콘텐츠 유형 복원
    SM.selectedContentType = d.content_type || d.genre || '';
    document.querySelectorAll('.sm-type-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.type === SM.selectedContentType);
    });
    // 하위호환: 기존 .sm-genre-card도 동기화
    smSyncGenreCards(SM.selectedContentType);

    // 유형 선택되면 관련 카드 표시
    if (SM.selectedContentType) {
      const genreToneCard = document.getElementById('sm-genre-tone-card');
      if (genreToneCard) genreToneCard.style.display = '';
      const basicInfoCard = document.getElementById('sm-basic-info-card');
      if (basicInfoCard) basicInfoCard.style.display = '';
      smRenderFormatPresets(SM.selectedContentType);
      // 프리셋 선택 복원
      if (d.selected_preset) {
        SM.selectedPresetIdx = d.selected_preset.idx;
        document.querySelectorAll('#sm-preset-grid .sm-source-card').forEach((c, i) => {
          c.classList.toggle('selected', i === d.selected_preset.idx);
        });
      }
    }

    // 장르톤 복원
    SM.selectedGenreTones = d.genre_tones || [];
    smRenderGenreToneCards();

    // 기본정보 (새 필드 우선, 하위호환 폴백)
    smSetValue('sm-title', d.title || d.project_name || '');
    smSetValue('sm-synopsis', d.synopsis || d.core_message || '');
    smSetValue('sm-additional-notes', d.additional_notes || '');
    smSetValue('sm-url-direction', d.url_direction || '');
    smSetValue('sm-file-direction', d.file_direction || '');

    // 하위호환: 기존 필드에도 값 복원
    smSetValue('sm-project-name', d.title || d.project_name || '');
    smSetValue('sm-genre', d.content_type || d.genre || '');
    smSetValue('sm-target-audience', d.target_audience || '');
    smSetValue('sm-core-message', d.synopsis || d.core_message || '');
    smSetValue('sm-mood-keywords', d.mood_keywords || '');

    // 소재 유형 카드 반영
    SM.selectedSources = d.source_types?.length ? d.source_types.slice() : ['topic'];
    smSyncSourceCards();

    // 분위기 태그 반영
    const moodStr = d.mood_keywords || '';
    SM.selectedMoodTags = moodStr ? moodStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    smSyncMoodTags();

    // 참고 URL 칩 렌더
    smRenderUrlList();

    // 참고 파일 그리드 렌더
    smRenderFileGrid();

    // 장르에 따른 타겟 오디언스 가시성
    smOnGenreChange();
    // AI 추천 버튼 상태
    smCheckRecommendBtnState();
    // AI 추천 결과 표시
    const resultEl = document.getElementById('sm-audience-result');
    if (resultEl) {
      if (d.target_audience) {
        resultEl.textContent = d.target_audience;
        resultEl.classList.add('visible');
      } else {
        resultEl.textContent = '';
        resultEl.classList.remove('visible');
      }
    }
  } else if (n === 2) {
    const d = SM.projectData.step2 || {};
    const type = SM.projectData.step1?.content_type || SM.projectData.step1?.genre || 'drama_film';
    const isVisual = (type === 'webtoon');

    // 트랙 전환 (영상 vs 비주얼)
    smSwitchStep2Track();

    // 캐릭터 복원
    SM.characters = d.characters || [];
    smRenderAllCharacters();

    // 로케이션 복원
    SM.locations = d.locations || [];
    smRenderAllLocations();

    // 비주얼 스타일 복원
    if (typeof SM_CARDS !== 'undefined') {
      if (isVisual) {
        smRenderPhotoCards('sm-art-style-grid', SM_CARDS.artStyle || [], {
          selectedIds: d.visual_style?.art_style ? [d.visual_style.art_style] : [],
          onSelect: 'smSelectCard',
        });
      } else {
        smRenderPhotoCards('sm-shooting-style-grid', SM_CARDS.shootingStyle || [], {
          selectedIds: d.visual_style?.shooting_style ? [d.visual_style.shooting_style] : [],
          onSelect: 'smSelectCard',
        });
      }
      smRenderColorCards('sm-color-palette-grid', SM_CARDS.colorPalette || [], d.visual_style?.color_palette || '');
    }

    // 포맷 복원
    const fmt = d.format || d;
    if (isVisual) {
      // 비주얼 트랙 채우기
      const limits = VISUAL_CUT_LIMITS[type] || VISUAL_CUT_LIMITS['webtoon'] || { min: 4, max: 20, default: 8 };
      const cutSlider = document.getElementById('sm-visual-cut-count');
      if (cutSlider) {
        cutSlider.value = fmt.visual_cut_count || d.visual_cut_count || limits.default;
        smOnVisualCutChange(cutSlider.value);
      }
      smSetSelectedRadio('sm-visual-size', fmt.visual_size || d.visual_size || '');
      smSetSelectedCheckboxes('sm-visual-platforms', fmt.visual_platforms || d.visual_platforms || []);
      smSetValue('sm-visual-art-style', d.visual_art_style || '');
      smSetValue('sm-visual-color-tone', d.visual_color_tone || '');
      smSetChecked('sm-visual-has-dialogue', d.visual_has_dialogue);
      smSetChecked('sm-visual-has-sfx', d.visual_has_sfx);
    } else {
      // 영상 트랙 채우기
      const videoLen = fmt.video_length || d.video_length || '';
      const migratedLength = SCENE_KEY_MIGRATION[videoLen] || videoLen;
      smSetValue('sm-video-length', migratedLength);
      smSetValue('sm-style', d.style || '');
      smSetValue('sm-color-tone', d.color_tone || '');
      smSetSelectedRadio('sm-aspect-ratio', fmt.aspect_ratio || d.aspect_ratio || '');
      smSetSelectedCheckboxes('sm-platforms', fmt.platforms || d.platforms || []);
      smSetChecked('sm-has-narration', fmt.has_narration !== undefined ? fmt.has_narration : d.has_narration);
      smSetChecked('sm-has-bgm', fmt.has_bgm !== undefined ? fmt.has_bgm : d.has_bgm);

      // 장면 수 슬라이더 업데이트
      smOnVideoLengthChange();
      const sc = fmt.scene_count || d.scene_count;
      if (sc) {
        const slider = document.getElementById('sm-scene-count');
        if (slider) {
          slider.value = sc;
          smOnSceneSliderChange(sc);
        }
      }
      // Step 2 진입 시 제약 적용
      smApplyPlatformConstraints();
      smCheckLengthWarning();
    }
  }
}

// ========================================
// 참고 URL 칩 UI (최대 5개)
// ========================================
const SM_MAX_URLS = 5;

// project_data에서 URL 목록 동기화
function smSyncUrlsFromData() {
  const s1 = SM.projectData.step1;
  if (!s1 || !s1.reference_urls) {
    SM.referenceUrls = [];
    return;
  }
  // 배열이면 그대로, 문자열이면 줄바꿈 분리 (이전 데이터 호환)
  if (Array.isArray(s1.reference_urls)) {
    SM.referenceUrls = s1.reference_urls.slice();
  } else if (typeof s1.reference_urls === 'string') {
    SM.referenceUrls = s1.reference_urls.split('\n').map(u => u.trim()).filter(Boolean);
  } else {
    SM.referenceUrls = [];
  }
}

function smRenderUrlList() {
  const listEl = document.getElementById('sm-url-list');
  const counterEl = document.getElementById('sm-url-counter');
  const addRow = document.getElementById('sm-url-add-row');
  if (!listEl) return;

  // 카운터 업데이트
  if (counterEl) counterEl.textContent = `(${SM.referenceUrls.length}/${SM_MAX_URLS})`;

  // 추가 버튼 비활성화
  if (addRow) {
    addRow.style.display = SM.referenceUrls.length >= SM_MAX_URLS ? 'none' : '';
  }

  if (SM.referenceUrls.length === 0) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = SM.referenceUrls.map((url, idx) => {
    const display = url.length > 45 ? url.substring(0, 42) + '...' : url;
    return `
      <div class="sm-url-chip">
        <i class="fas fa-link" style="color:#9ca3af; flex-shrink:0; font-size:11px;"></i>
        <span class="sm-url-chip-text" title="${smEscape(url)}">${smEscape(display)}</span>
        <button class="sm-url-chip-remove" onclick="smRemoveUrl(${idx})" title="삭제">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }).join('');
}

function smAddUrl() {
  if (SM.referenceUrls.length >= SM_MAX_URLS) return;

  const input = document.getElementById('sm-url-input');
  if (!input) return;

  const url = input.value.trim();
  if (!url) return;

  // 기본 URL 검증
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    alert('URL은 http:// 또는 https://로 시작해야 합니다.');
    return;
  }

  // 중복 체크
  if (SM.referenceUrls.includes(url)) {
    alert('이미 추가된 URL입니다.');
    return;
  }

  SM.referenceUrls.push(url);
  input.value = '';
  smRenderUrlList();
  smMarkDirty();
}

function smRemoveUrl(idx) {
  SM.referenceUrls.splice(idx, 1);
  smRenderUrlList();
  smMarkDirty();
}

// 구 키 → 신 키 호환 매핑 (mid_3→mid_3m 등)
const SCENE_KEY_MIGRATION = {
  mid_3: 'mid_3m', mid_5: 'mid_5m', long_10: 'long_10m', long_15: 'long_15m',
};

// ========================================
// 장면 수 슬라이더
// ========================================
function smOnVideoLengthChange() {
  let videoLength = document.getElementById('sm-video-length')?.value;
  const emptyEl = document.getElementById('sm-scene-slider-empty');
  const sliderWrap = document.getElementById('sm-scene-slider-wrap');
  const slider = document.getElementById('sm-scene-count');

  if (!emptyEl || !sliderWrap || !slider) return;

  // 구 키 호환: mid_3 → mid_3m 등 (기존 저장 데이터 대응)
  if (videoLength && SCENE_KEY_MIGRATION[videoLength]) {
    videoLength = SCENE_KEY_MIGRATION[videoLength];
    const sel = document.getElementById('sm-video-length');
    if (sel) sel.value = videoLength; // select도 신 키로 업데이트
  }

  const limits = SCENE_LIMITS[videoLength];
  if (!limits) {
    // 영상 길이 미선택
    emptyEl.style.display = '';
    sliderWrap.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  sliderWrap.style.display = '';

  slider.min = limits.min;
  slider.max = limits.max;

  // 현재 값이 범위 밖이면 default로 리셋
  const currentVal = parseInt(slider.value);
  if (isNaN(currentVal) || currentVal < limits.min || currentVal > limits.max) {
    slider.value = limits.default;
  }

  // 라벨 업데이트
  smOnSceneSliderChange(slider.value);
  smMarkDirty();
}

function smOnSceneSliderChange(val) {
  const valueEl = document.getElementById('sm-scene-value');
  const rangeLabel = document.getElementById('sm-scene-range-label');
  const slider = document.getElementById('sm-scene-count');

  if (valueEl) valueEl.textContent = val;
  if (rangeLabel && slider) {
    rangeLabel.textContent = `${slider.min}~${slider.max}컷`;
  }
  smMarkDirty();
}

// ========================================
// 타겟 오디언스 AI 추천
// ========================================

// 장르 변경 시 타겟 오디언스 필드 가시성
function smOnGenreChange() {
  const genre = document.getElementById('sm-genre')?.value;
  const group = document.getElementById('sm-target-audience-group');
  if (!group) return;

  // 스토리텔링·드라마 장르는 타겟 오디언스 숨김
  if (genre === 'story') {
    group.style.display = 'none';
    // 값 초기화
    const input = document.getElementById('sm-target-audience');
    if (input) input.value = '';
  } else {
    group.style.display = '';
  }

  smCheckRecommendBtnState();
}

// AI 추천 버튼 활성화 조건: 프로젝트명 + 장르 + 핵심 메시지 중 2개 이상
function smCheckRecommendBtnState() {
  const btn = document.getElementById('sm-recommend-audience-btn');
  if (!btn) return;

  const name = document.getElementById('sm-project-name')?.value?.trim() || '';
  const genre = document.getElementById('sm-genre')?.value || '';
  const msg = document.getElementById('sm-core-message')?.value?.trim() || '';

  let filled = 0;
  if (name) filled++;
  if (genre) filled++;
  if (msg) filled++;

  btn.disabled = filled < 2;
}

// AI 추천 실행 (임시 — API 미구현 시 클라이언트 로직)
async function smRecommendAudience() {
  const btn = document.getElementById('sm-recommend-audience-btn');
  const input = document.getElementById('sm-target-audience');
  const resultEl = document.getElementById('sm-audience-result');
  if (!btn || !input) return;

  const name = document.getElementById('sm-project-name')?.value?.trim() || '';
  const genre = document.getElementById('sm-genre')?.value || '';
  const msg = document.getElementById('sm-core-message')?.value?.trim() || '';

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 추천 중...';

  try {
    const data = await smApiCall('POST', '/api/storymaker/generate/target-audience', {
      project_name: name,
      genre: genre,
      core_message: msg,
    });

    if (data.success && data.target_audience) {
      input.value = data.target_audience;
      if (resultEl) {
        resultEl.textContent = data.target_audience;
        resultEl.classList.add('visible');
      }
      smMarkDirty();
    } else {
      // API 미구현 시 폴백: 로컬 추천
      const fallback = smLocalAudienceRecommend(name, genre, msg);
      input.value = fallback;
      if (resultEl) {
        resultEl.textContent = fallback;
        resultEl.classList.add('visible');
      }
      smMarkDirty();
    }
  } catch (e) {
    console.warn('[StoryMaker] AI 추천 API 호출 실패, 로컬 폴백 사용:', e);
    const fallback = smLocalAudienceRecommend(name, genre, msg);
    input.value = fallback;
    if (resultEl) {
      resultEl.textContent = fallback;
      resultEl.classList.add('visible');
    }
    smMarkDirty();
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic"></i> AI 추천 받기';
    smCheckRecommendBtnState();
  }
}

// 로컬 폴백 타겟 오디언스 추천 (API 미구현 시)
function smLocalAudienceRecommend(name, genre, msg) {
  const genreAudience = {
    promotion: '제품/서비스에 관심 있는 20~40대 소비자',
    education: '배움에 관심 있는 학생 및 직장인',
    vlog: '일상 콘텐츠를 즐기는 10~30대',
    review: '구매 전 정보를 찾는 소비자',
    news: '시사·트렌드에 관심 있는 성인',
    music: '음악과 영상미를 즐기는 10~30대',
    animation: '애니메이션·모션 그래픽에 관심 있는 크리에이터',
    webtoon: 'SNS 웹툰·숏툰을 즐기는 10~30대',
    cartoon: 'SNS 밈·만화를 즐기는 10~30대',
    interview: '해당 분야에 관심 있는 전문가 및 일반 시청자',
  };
  return genreAudience[genre] || '해당 콘텐츠에 관심 있는 타겟 오디언스';
}

// ========================================
// 폼 유틸리티
// ========================================
function smSetValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = (val !== undefined && val !== null) ? val : '';
}

function smSetChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = val !== false;
}

function smGetSelectedRadio(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return '';
  const checked = group.querySelector('input[type="radio"]:checked');
  return checked ? checked.value : '';
}

function smSetSelectedRadio(groupId, val) {
  const group = document.getElementById(groupId);
  if (!group) return;

  // 모든 옵션 해제
  group.querySelectorAll('.sm-option-item').forEach(item => {
    item.classList.remove('selected');
    const radio = item.querySelector('input[type="radio"]');
    if (radio) radio.checked = false;
  });

  if (!val) return;

  // 선택된 값 설정
  group.querySelectorAll('.sm-option-item').forEach(item => {
    const radio = item.querySelector('input[type="radio"]');
    if (radio && radio.value === val) {
      radio.checked = true;
      item.classList.add('selected');
    }
  });
}

function smGetSelectedCheckboxes(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return [];
  const checked = group.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checked).map(cb => cb.value);
}

function smSetSelectedCheckboxes(groupId, vals) {
  const group = document.getElementById(groupId);
  if (!group) return;

  // 모든 옵션 해제
  group.querySelectorAll('.sm-option-item').forEach(item => {
    item.classList.remove('selected');
    const cb = item.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = false;
  });

  if (!vals || !Array.isArray(vals)) return;

  // 선택된 값들 설정
  group.querySelectorAll('.sm-option-item').forEach(item => {
    const cb = item.querySelector('input[type="checkbox"]');
    if (cb && vals.includes(cb.value)) {
      cb.checked = true;
      item.classList.add('selected');
    }
  });
}

// 라디오 옵션 선택 핸들러
function smSelectOption(el, groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  // disabled 상태면 선택 불가
  if (el.classList.contains('disabled')) return;
  group.querySelectorAll('.sm-option-item').forEach(item => item.classList.remove('selected'));
  el.classList.add('selected');
  const radio = el.querySelector('input[type="radio"]');
  if (radio) {
    radio.checked = true;
    // change 이벤트 수동 발생 (제약 로직 트리거용)
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }
  smMarkDirty();
}

// 체크박스 옵션 토글 핸들러
function smToggleOption(el) {
  // disabled 상태면 토글 불가
  if (el.classList.contains('disabled')) {
    const cb = el.querySelector('input[type="checkbox"]');
    if (cb) { cb.checked = false; el.classList.remove('selected'); }
    return;
  }
  const cb = el.querySelector('input[type="checkbox"]');
  if (cb) {
    setTimeout(() => {
      if (cb.checked) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
      // change 이벤트 수동 발생 (제약 로직 트리거용)
      cb.dispatchEvent(new Event('change', { bubbles: true }));
      smMarkDirty();
    }, 0);
  }
}

// ========================================
// 렌더링 함수
// ========================================

// 프로젝트 목록 렌더링
function smRenderProjectList() {
  const listEl = document.getElementById('sm-project-list');
  if (!listEl) return;

  if (SM.projects.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 32px 16px; text-align: center; color: #9ca3af; font-size: 13px;">
        <div style="font-size: 32px; margin-bottom: 12px;">📁</div>
        프로젝트가 없습니다.<br>
        <strong>새 프로젝트</strong>를 만들어 시작하세요.
      </div>
    `;
    return;
  }

  listEl.innerHTML = SM.projects.map(p => {
    const isActive = p.id === SM.currentProjectId;
    const updatedAt = smFormatDate(p.updated_at);
    return `
      <div class="sm-project-item ${isActive ? 'active' : ''}" onclick="smSelectProject('${p.id}')">
        <div class="sm-project-item-info">
          <div class="sm-project-item-name">${smEscape(p.name)}</div>
          <div class="sm-project-item-date">${updatedAt}</div>
        </div>
        <button class="sm-project-item-delete" onclick="smDeleteProject('${p.id}', event)" title="삭제">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');
}

// Step 네비 렌더링 (명확한 완료 판정)
function smRenderStepNav() {
  const stepItems = document.querySelectorAll('.sm-step-item');
  stepItems.forEach(item => {
    const step = parseInt(item.dataset.step);
    item.classList.remove('active', 'completed', 'locked');

    if (step === SM.currentStep) {
      item.classList.add('active');
    } else if (smIsStepCompleted(step)) {
      item.classList.add('completed');
    } else if (step > 2) {
      // Step 3+ 잠금: Step 1, 2 모두 완료되지 않으면 locked
      if (!smIsStepCompleted(1) || !smIsStepCompleted(2)) {
        item.classList.add('locked');
      }
    }
  });
}

// 프리뷰 패널 렌더링
function smRenderPreview() {
  const emptyEl = document.getElementById('sm-preview-empty');
  const bodyEl = document.getElementById('sm-preview-body');
  if (!emptyEl || !bodyEl) return;

  if (!SM.currentProjectId) {
    emptyEl.style.display = '';
    bodyEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  bodyEl.style.display = '';

  const s1 = SM.projectData.step1 || {};
  const s2 = SM.projectData.step2 || {};

  const typeMap = { drama_film: '드라마 · 영화', webtoon: '웹툰 · 숏툰' };
  // 하위호환 genreMap
  const genreMap = {
    promotion: '홍보 · 광고', education: '교육 · 튜토리얼', vlog: '브이로그', review: '리뷰',
    story: '드라마 · 숏필름', news: '뉴스 · 정보', music: '뮤직비디오', animation: '애니메이션 · 모션',
    webtoon: '웹툰 · 숏툰', cartoon: '4컷 · 카툰', drama_film: '드라마 · 영화',
  };

  const lengthMap = {
    short_15: '15초', short_30: '30초', short_60: '60초',
    mid_3m: '3분', mid_5m: '5분', long_10m: '10분', long_15m: '15분+',
    // 구 키 호환
    mid_3: '3분', mid_5: '5분', long_10: '10분', long_15: '15분+',
  };

  const styleMap = {
    cinematic: '시네마틱', minimal: '미니멀', dynamic: '다이나믹',
    retro: '레트로', cute: '캐주얼', luxury: '프리미엄', corporate: '비즈니스',
  };

  const toneMap = {
    warm: '따뜻한', cool: '차가운', pastel: '파스텔',
    vivid: '비비드', monochrome: '모노크롬', natural: '자연스러운',
  };

  let html = '';

  // Step 1 요약
  html += `<div class="sm-preview-section">
    <div class="sm-preview-section-title">📋 기획 정보</div>`;

  const previewTitle = s1.title || s1.project_name;
  const previewType = s1.content_type || s1.genre;
  const previewSynopsis = s1.synopsis || s1.core_message;

  if (previewTitle) html += smPreviewRow('프로젝트명', previewTitle);
  if (previewType) html += smPreviewRow('콘텐츠 유형', typeMap[previewType] || genreMap[previewType] || previewType);
  if (s1.target_audience) html += smPreviewRow('타겟', s1.target_audience);
  if (previewSynopsis) html += smPreviewRow('시놉시스', smTruncate(previewSynopsis, 60));

  // 장르톤 태그 표시
  const genreTones = s1.genre_tones || [];
  if (genreTones.length > 0) {
    html += `<div class="sm-preview-item">
      <span class="sm-preview-item-label">장르톤</span>
      <div class="sm-preview-tags">${genreTones.map(t => `<span class="sm-preview-tag">${smEscape(t)}</span>`).join('')}</div>
    </div>`;
  }

  if (s1.mood_keywords) {
    const tags = s1.mood_keywords.split(',').map(k => k.trim()).filter(Boolean);
    if (tags.length > 0) {
      html += `<div class="sm-preview-item">
        <span class="sm-preview-item-label">분위기</span>
        <div class="sm-preview-tags">${tags.map(t => `<span class="sm-preview-tag">${smEscape(t)}</span>`).join('')}</div>
      </div>`;
    }
  }
  // 참고 URL 개수 표시
  const urls = Array.isArray(s1.reference_urls) ? s1.reference_urls : [];
  if (urls.length > 0) {
    html += smPreviewRow('참고 URL', `${urls.length}개`);
  }
  // 참고 파일 개수 표시
  const files = Array.isArray(s1.reference_files) ? s1.reference_files : [];
  if (files.length > 0) {
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    html += smPreviewRow('참고 파일', `${files.length}개 (${smFormatFileSize(totalSize)})`);
  }
  html += '</div>';

  // Step 2 요약: 캐릭터
  if (s2.characters && s2.characters.length > 0) {
    html += `<div class="sm-preview-section">
      <div class="sm-preview-section-title">🎭 캐릭터</div>`;
    s2.characters.forEach(c => {
      const info = [c.name, c.age_group, c.gender].filter(Boolean).join(' · ');
      if (info) html += smPreviewRow('캐릭터', info);
    });
    html += '</div>';
  }

  // Step 2 요약: 로케이션
  if (s2.locations && s2.locations.length > 0) {
    html += `<div class="sm-preview-section">
      <div class="sm-preview-section-title">📍 장소</div>`;
    s2.locations.forEach(loc => {
      const info = [loc.place, loc.time_of_day].filter(Boolean).join(' · ');
      if (info) html += smPreviewRow('장소', info);
    });
    html += '</div>';
  }

  // Step 2 요약: 비주얼 스타일
  if (s2.visual_style) {
    const vs = s2.visual_style;
    const hasStyle = vs.shooting_style || vs.art_style || vs.color_palette;
    if (hasStyle) {
      html += `<div class="sm-preview-section">
        <div class="sm-preview-section-title">🎨 비주얼 스타일</div>`;
      if (vs.shooting_style) html += smPreviewRow('촬영 스타일', vs.shooting_style);
      if (vs.art_style) html += smPreviewRow('그림체', vs.art_style);
      if (vs.color_palette) html += smPreviewRow('컬러 팔레트', vs.color_palette);
      html += '</div>';
    }
  }

  // Step 2 요약: 포맷 설정
  if (s2.track === 'visual' || (s2.format && s2.format.visual_cut_count)) {
    // 비주얼 트랙
    const fmt = s2.format || s2;
    html += `<div class="sm-preview-section">
      <div class="sm-preview-section-title">🖼️ 비주얼 설정</div>`;
    if (fmt.visual_cut_count) html += smPreviewRow('컷 수', fmt.visual_cut_count + '컷');
    const sizeMap = { vertical: '세로 스크롤', square: '정방형 (1:1)', horizontal: '가로 (16:9)' };
    if (fmt.visual_size) html += smPreviewRow('사이즈', sizeMap[fmt.visual_size] || fmt.visual_size);
    if (s2.visual_art_style) html += smPreviewRow('그림체', s2.visual_art_style);
    if (s2.visual_color_tone) html += smPreviewRow('컬러', toneMap[s2.visual_color_tone] || s2.visual_color_tone);
    const visPlatforms = fmt.visual_platforms || s2.visual_platforms || [];
    if (visPlatforms.length > 0) {
      html += `<div class="sm-preview-item">
        <span class="sm-preview-item-label">플랫폼</span>
        <div class="sm-preview-tags">${visPlatforms.map(p => `<span class="sm-preview-tag">${smEscape(p)}</span>`).join('')}</div>
      </div>`;
    }
    html += '</div>';
  } else if (s2.video_length || s2.aspect_ratio || s2.style || (s2.format && s2.format.video_length)) {
    // 영상 트랙
    const fmt = s2.format || s2;
    html += `<div class="sm-preview-section">
      <div class="sm-preview-section-title">🎬 포맷 설정</div>`;

    const vl = fmt.video_length || s2.video_length;
    if (vl) html += smPreviewRow('영상 길이', lengthMap[vl] || vl);
    const ar = fmt.aspect_ratio || s2.aspect_ratio;
    if (ar) html += smPreviewRow('화면 비율', ar);
    const sc = fmt.scene_count || s2.scene_count;
    if (sc) html += smPreviewRow('장면 수', sc + '컷');
    if (s2.style) html += smPreviewRow('스타일', styleMap[s2.style] || s2.style);
    if (s2.color_tone) html += smPreviewRow('컬러 톤', toneMap[s2.color_tone] || s2.color_tone);
    const hasNar = fmt.has_narration !== undefined ? fmt.has_narration : s2.has_narration;
    const hasBgm = fmt.has_bgm !== undefined ? fmt.has_bgm : s2.has_bgm;
    html += smPreviewRow('나레이션', hasNar !== false ? '✅' : '❌');
    html += smPreviewRow('배경 음악', hasBgm !== false ? '✅' : '❌');

    const plats = fmt.platforms || s2.platforms || [];
    if (plats.length > 0) {
      html += `<div class="sm-preview-item">
        <span class="sm-preview-item-label">플랫폼</span>
        <div class="sm-preview-tags">${plats.map(p => `<span class="sm-preview-tag">${smEscape(p)}</span>`).join('')}</div>
      </div>`;
    }

    html += '</div>';
  }

  // 예상 크레딧 표시 (장면 수가 설정된 경우)
  const sceneCount = parseInt(s2.scene_count) || 0;
  if (sceneCount > 0) {
    const estimatedCredits = SM_CREDIT_SCENARIO + (sceneCount * SM_CREDIT_PER_SCENE);
    html += `<div class="sm-preview-section">
      <div class="sm-preview-section-title">💰 예상 크레딧</div>
      <div class="sm-preview-item">
        <span class="sm-preview-item-label">시나리오 생성</span>
        <span class="sm-preview-item-value">${SM_CREDIT_SCENARIO}cr</span>
      </div>
      <div class="sm-preview-item">
        <span class="sm-preview-item-label">이미지 생성 (${sceneCount}컷)</span>
        <span class="sm-preview-item-value">${sceneCount * SM_CREDIT_PER_SCENE}cr</span>
      </div>
      <div class="sm-preview-item" style="border-top: 2px solid #e5e7eb; padding-top: 8px; margin-top: 4px;">
        <span class="sm-preview-item-label" style="font-weight: 700; color: #1f2937;">총 예상 비용</span>
        <span class="sm-preview-item-value" style="font-weight: 700; color: #7c3aed; font-size: 15px;">${estimatedCredits}cr</span>
      </div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 6px; line-height: 1.4;">
        * 장면 텍스트 재생성: 1cr/회<br>
        * 장면 이미지 재생성: 3cr/회
      </div>
    </div>`;
  }

  bodyEl.innerHTML = html;
}

function smPreviewRow(label, value) {
  return `<div class="sm-preview-item">
    <span class="sm-preview-item-label">${label}</span>
    <span class="sm-preview-item-value">${smEscape(String(value))}</span>
  </div>`;
}

function smClearPreview() {
  const emptyEl = document.getElementById('sm-preview-empty');
  const bodyEl = document.getElementById('sm-preview-body');
  if (emptyEl) emptyEl.style.display = '';
  if (bodyEl) bodyEl.style.display = 'none';
}

// ========================================
// 자동저장
// ========================================
function smSetupAutosave() {
  // 모든 input/textarea/select 변경 감지
  document.querySelectorAll('.sm-form-input, .sm-form-select, .sm-form-textarea, .sm-url-add-input').forEach(el => {
    el.addEventListener('input', smMarkDirty);
    el.addEventListener('change', smMarkDirty);
  });

  // 토글 체크박스 변경 감지
  document.querySelectorAll('.sm-toggle input[type="checkbox"]').forEach(el => {
    el.addEventListener('change', smMarkDirty);
  });

  // 슬라이더 변경 감지
  const slider = document.getElementById('sm-scene-count');
  if (slider) {
    slider.addEventListener('input', smMarkDirty);
  }
}

function smMarkDirty() {
  if (!SM.currentProjectId) return;
  SM.isDirty = true;
  smDebouncedSave();
}

function smDebouncedSave() {
  if (SM.saveTimer) clearTimeout(SM.saveTimer);
  SM.saveTimer = setTimeout(() => {
    if (SM.isDirty && SM.currentProjectId) {
      smSaveProject();
    }
  }, 1500);
}

function smSetAutosaveStatus(status) {
  const el = document.getElementById(`sm-autosave-${SM.currentStep}`);
  if (!el) return;

  el.classList.remove('saving', 'saved');

  if (status === 'saving') {
    el.classList.add('saving');
    el.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
  } else if (status === 'saved') {
    el.classList.add('saved');
    el.innerHTML = '<i class="fas fa-check-circle"></i> 자동 저장됨';
  } else if (status === 'error') {
    el.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i> 저장 실패';
  }
}

// ========================================
// 유틸리티
// ========================================
function smEscape(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function smTruncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function smFormatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;

    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return mins <= 0 ? '방금 전' : `${mins}분 전`;
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}시간 전`;
    }
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}일 전`;
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return '';
  }
}

// ========================================
// 참고 파일 업로드 (최대 10개, 총 50MB)
// ========================================
const SM_MAX_FILES = 10;
const SM_MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
const SM_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SM_ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const SM_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.ppt', '.pptx', '.doc', '.docx'];

// project_data에서 파일 목록 동기화
function smSyncFilesFromData() {
  const s1 = SM.projectData.step1;
  SM.referenceFiles = (s1 && Array.isArray(s1.reference_files)) ? s1.reference_files.slice() : [];
}

// 드롭존 드래그 앤 드롭 설정
function smSetupFileDropzone() {
  const dropzone = document.getElementById('sm-file-dropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      smProcessFiles(files);
    }
  });
}

// 파일 선택 핸들러 (input onchange)
function smOnFilesSelected(event) {
  const files = event.target?.files;
  if (files && files.length > 0) {
    smProcessFiles(files);
  }
  // 같은 파일 재선택 가능하도록 리셋
  event.target.value = '';
}

// 파일 처리 (검증 + 업로드)
async function smProcessFiles(fileList) {
  if (!SM.currentProjectId) {
    alert('프로젝트를 먼저 선택해주세요.');
    return;
  }

  const files = Array.from(fileList);
  const currentCount = SM.referenceFiles.length;
  const currentTotalSize = SM.referenceFiles.reduce((sum, f) => sum + (f.size || 0), 0);

  let added = 0;
  for (const file of files) {
    // 개수 제한
    if (currentCount + added >= SM_MAX_FILES) {
      alert(`최대 ${SM_MAX_FILES}개 파일까지 업로드할 수 있습니다.`);
      break;
    }

    // 단일 파일 크기 제한
    if (file.size > SM_MAX_FILE_SIZE) {
      alert(`"${file.name}" 파일이 너무 큽니다. (최대 10MB)`);
      continue;
    }

    // 총 용량 제한
    if (currentTotalSize + file.size > SM_MAX_TOTAL_SIZE) {
      alert('총 파일 용량이 50MB를 초과합니다.');
      break;
    }

    // 파일 형식 검증
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!SM_ALLOWED_EXTENSIONS.includes(ext)) {
      alert(`"${file.name}" 지원하지 않는 형식입니다.\n(JPG, PNG, GIF, PDF, PPT, PPTX, DOC, DOCX)`);
      continue;
    }

    // 중복 체크 (파일명 + 크기)
    if (SM.referenceFiles.some(f => f.name === file.name && f.size === file.size)) {
      alert(`"${file.name}" 이미 추가된 파일입니다.`);
      continue;
    }

    // 업로드 시작
    await smUploadFile(file);
    added++;
  }
}

// 개별 파일 업로드
async function smUploadFile(file) {
  // 임시 로딩 카드 추가
  const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  SM.referenceFiles.push({
    id: tempId,
    name: file.name,
    type: file.type,
    size: file.size,
    url: '',
    uploading: true,
  });
  smRenderFileGrid();

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', SM.currentProjectId);

    const res = await fetch('/api/storymaker/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${smGetToken()}`,
      },
      body: formData,
    });

    const data = await res.json();

    if (data.success && data.file) {
      // 임시 항목을 실제 데이터로 교체
      const idx = SM.referenceFiles.findIndex(f => f.id === tempId);
      if (idx >= 0) {
        SM.referenceFiles[idx] = {
          id: data.file.id || data.file.name,
          name: data.file.name,
          type: data.file.type || file.type,
          size: data.file.size || file.size,
          url: data.file.url,
          uploading: false,
        };
      }
    } else {
      // 업로드 실패 — 임시 항목 제거
      SM.referenceFiles = SM.referenceFiles.filter(f => f.id !== tempId);
      console.error('[StoryMaker] 파일 업로드 실패:', data.error);
      alert(`"${file.name}" 업로드 실패: ${data.error || '서버 오류'}`);
    }
  } catch (e) {
    // 네트워크 오류 — 임시 항목 제거
    SM.referenceFiles = SM.referenceFiles.filter(f => f.id !== tempId);
    console.error('[StoryMaker] 파일 업로드 예외:', e);
    alert(`"${file.name}" 업로드 중 오류가 발생했습니다.`);
  }

  smRenderFileGrid();
  smMarkDirty();
}

// 파일 삭제
async function smRemoveFile(idx) {
  const file = SM.referenceFiles[idx];
  if (!file) return;

  // 서버에서 삭제 시도 (URL이 있는 경우)
  if (file.url && SM.currentProjectId) {
    try {
      await smApiCall('POST', '/api/storymaker/files/delete', {
        project_id: SM.currentProjectId,
        file_url: file.url,
        file_name: file.name,
      });
    } catch (e) {
      console.warn('[StoryMaker] 파일 서버 삭제 실패 (로컬만 제거):', e);
    }
  }

  SM.referenceFiles.splice(idx, 1);
  smRenderFileGrid();
  smMarkDirty();
}

// 파일 그리드 렌더링
function smRenderFileGrid() {
  const gridEl = document.getElementById('sm-file-grid');
  const counterEl = document.getElementById('sm-file-counter');
  const dropzone = document.getElementById('sm-file-dropzone');
  if (!gridEl) return;

  const totalSize = SM.referenceFiles.reduce((sum, f) => sum + (f.size || 0), 0);

  // 카운터 업데이트
  if (counterEl) {
    counterEl.textContent = `(${SM.referenceFiles.length}/${SM_MAX_FILES}, ${smFormatFileSize(totalSize)}/50MB)`;
  }

  // 드롭존 숨김 (10개 도달 시)
  if (dropzone) {
    dropzone.style.display = SM.referenceFiles.length >= SM_MAX_FILES ? 'none' : '';
  }

  if (SM.referenceFiles.length === 0) {
    gridEl.innerHTML = '';
    return;
  }

  gridEl.innerHTML = SM.referenceFiles.map((f, idx) => {
    const isImage = f.type && f.type.startsWith('image/');
    const isUploading = f.uploading;

    let thumbHtml;
    if (isImage && f.url) {
      thumbHtml = `<img class="sm-file-card-thumb" src="${smEscape(f.url)}" alt="${smEscape(f.name)}" loading="lazy">`;
    } else {
      const icon = smGetFileIcon(f.type, f.name);
      thumbHtml = `<div class="sm-file-card-icon"><i class="${icon}"></i></div>`;
    }

    const uploadingOverlay = isUploading
      ? `<div class="sm-file-card-uploading"><i class="fas fa-spinner fa-spin" style="color:#7c3aed;font-size:18px;"></i></div>`
      : '';

    return `
      <div class="sm-file-card" title="${smEscape(f.name)} (${smFormatFileSize(f.size)})">
        ${thumbHtml}
        ${uploadingOverlay}
        <div class="sm-file-card-info">
          <span class="sm-file-card-name">${smEscape(f.name)}</span>
          <div class="sm-file-card-size">${smFormatFileSize(f.size)}</div>
        </div>
        ${!isUploading ? `<button class="sm-file-card-remove" onclick="smRemoveFile(${idx})" title="삭제"><i class="fas fa-times"></i></button>` : ''}
      </div>
    `;
  }).join('');
}

// 파일 아이콘 매핑
function smGetFileIcon(type, name) {
  if (!type && name) {
    const ext = name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'fas fa-image';
    if (ext === 'pdf') return 'fas fa-file-pdf';
    if (['ppt', 'pptx'].includes(ext)) return 'fas fa-file-powerpoint';
    if (['doc', 'docx'].includes(ext)) return 'fas fa-file-word';
  }
  if (type) {
    if (type.startsWith('image/')) return 'fas fa-image';
    if (type === 'application/pdf') return 'fas fa-file-pdf';
    if (type.includes('presentation') || type.includes('powerpoint')) return 'fas fa-file-powerpoint';
    if (type.includes('word') || type.includes('document')) return 'fas fa-file-word';
  }
  return 'fas fa-file';
}

// 파일 크기 포맷
function smFormatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0B';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

// ========================================
// 캐릭터 CRUD
// ========================================
function smAddCharacter() {
  SM.characters.push({ name: '', gender: '', age_group: '', costume: '', personality: [] });
  smRenderAllCharacters();
  SM.isDirty = true;
  smDebouncedSave();
}

function smRemoveCharacter(idx) {
  SM.characters.splice(idx, 1);
  smRenderAllCharacters();
  SM.isDirty = true;
  smDebouncedSave();
}

function smRenderAllCharacters() {
  const container = document.getElementById('sm-characters-list');
  if (!container) return;

  if (SM.characters.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:20px;">캐릭터를 추가해주세요</div>';
    return;
  }

  container.innerHTML = SM.characters.map((char, i) => `
    <div class="sm-character-sheet" data-idx="${i}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-weight:600;color:#374151;">캐릭터 ${i + 1}</span>
        <button onclick="smRemoveCharacter(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;">
          <i class="fas fa-trash"></i> 삭제
        </button>
      </div>
      <div class="sm-form-group" style="margin-bottom:12px;">
        <label class="sm-form-label">이름</label>
        <input class="sm-form-input" id="sm-char-name-${i}" value="${smEscHtml(char.name || '')}" placeholder="캐릭터 이름" oninput="SM.characters[${i}].name=this.value;smMarkDirty();">
      </div>
      <div class="sm-form-group" style="margin-bottom:12px;">
        <label class="sm-form-label">성별</label>
        <div class="sm-photo-grid sm-photo-grid-small" id="sm-char-gender-${i}"></div>
      </div>
      <div class="sm-form-group" style="margin-bottom:12px;">
        <label class="sm-form-label">나이대</label>
        <div class="sm-photo-grid sm-photo-grid-small" id="sm-char-age-${i}"></div>
      </div>
      <div class="sm-form-group" style="margin-bottom:12px;">
        <label class="sm-form-label">의상</label>
        <div class="sm-photo-grid sm-photo-grid-small" id="sm-char-costume-${i}"></div>
      </div>
      <div class="sm-form-group">
        <label class="sm-form-label">성격</label>
        <div class="sm-tag-grid" id="sm-char-personality-${i}"></div>
      </div>
    </div>
  `).join('');

  // 각 캐릭터의 사진 카드 렌더링
  SM.characters.forEach((char, i) => {
    if (typeof SM_CARDS !== 'undefined') {
      smRenderPhotoCards(`sm-char-gender-${i}`, SM_CARDS.gender || [], { selectedIds: char.gender ? [char.gender] : [], onSelect: 'smSelectCharCard' });
      smRenderPhotoCards(`sm-char-age-${i}`, SM_CARDS.ageGroup || [], { selectedIds: char.age_group ? [char.age_group] : [], onSelect: 'smSelectCharCard' });
      smRenderPhotoCards(`sm-char-costume-${i}`, SM_CARDS.costume || [], { selectedIds: char.costume ? [char.costume] : [], onSelect: 'smSelectCharCard' });
      smRenderPersonalityTags(`sm-char-personality-${i}`, char.personality || []);
    }
  });
}

// 캐릭터 카드 선택 시 SM.characters에 즉시 반영
function smSelectCharCard(containerId, cardId, multiSelect, maxSelect) {
  smSelectCard(containerId, cardId, multiSelect, maxSelect);
  // containerId에서 캐릭터 인덱스와 필드명 추출
  const match = containerId.match(/sm-char-(\w+)-(\d+)/);
  if (match) {
    const field = match[1]; // gender, age, costume
    const idx = parseInt(match[2]);
    if (SM.characters[idx]) {
      const fieldMap = { gender: 'gender', age: 'age_group', costume: 'costume' };
      SM.characters[idx][fieldMap[field] || field] = cardId;
    }
  }
}

function smRenderPersonalityTags(containerId, selected) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const tags = (typeof SM_CARDS !== 'undefined' && SM_CARDS.personality) || [];
  container.innerHTML = tags.map(tag => {
    const isSelected = selected.includes(tag);
    return `<span class="sm-mood-tag ${isSelected ? 'selected' : ''}" onclick="smToggleCharPersonality('${containerId}', this, '${tag}')">${tag}</span>`;
  }).join('');
}

function smToggleCharPersonality(containerId, el, tag) {
  el.classList.toggle('selected');
  // containerId에서 인덱스 추출
  const match = containerId.match(/sm-char-personality-(\d+)/);
  if (match) {
    const idx = parseInt(match[1]);
    if (SM.characters[idx]) {
      const p = SM.characters[idx].personality || [];
      const ti = p.indexOf(tag);
      if (ti >= 0) p.splice(ti, 1);
      else p.push(tag);
      SM.characters[idx].personality = p;
    }
  }
  SM.isDirty = true;
  smDebouncedSave();
}

// ========================================
// 로케이션 CRUD
// ========================================
function smAddLocation() {
  SM.locations.push({ place: '', time_of_day: '' });
  smRenderAllLocations();
  SM.isDirty = true;
  smDebouncedSave();
}

function smRemoveLocation(idx) {
  SM.locations.splice(idx, 1);
  smRenderAllLocations();
  SM.isDirty = true;
  smDebouncedSave();
}

function smRenderAllLocations() {
  const container = document.getElementById('sm-locations-list');
  if (!container) return;

  if (SM.locations.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:20px;">장소를 추가해주세요</div>';
    return;
  }

  container.innerHTML = SM.locations.map((loc, i) => `
    <div class="sm-location-board" data-idx="${i}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-weight:600;color:#374151;">장소 ${i + 1}</span>
        <button onclick="smRemoveLocation(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;">
          <i class="fas fa-trash"></i> 삭제
        </button>
      </div>
      <div class="sm-form-group" style="margin-bottom:12px;">
        <label class="sm-form-label">장소</label>
        <div class="sm-photo-grid" id="sm-loc-place-${i}"></div>
      </div>
      <div class="sm-form-group">
        <label class="sm-form-label">시간대</label>
        <div class="sm-photo-grid sm-photo-grid-small" id="sm-loc-time-${i}"></div>
      </div>
    </div>
  `).join('');

  SM.locations.forEach((loc, i) => {
    if (typeof SM_CARDS !== 'undefined') {
      smRenderPhotoCards(`sm-loc-place-${i}`, SM_CARDS.location || [], { selectedIds: loc.place ? [loc.place] : [], onSelect: 'smSelectLocCard' });
      smRenderPhotoCards(`sm-loc-time-${i}`, SM_CARDS.timeOfDay || [], { selectedIds: loc.time_of_day ? [loc.time_of_day] : [], onSelect: 'smSelectLocCard' });
    }
  });
}

function smSelectLocCard(containerId, cardId, multiSelect, maxSelect) {
  smSelectCard(containerId, cardId, multiSelect, maxSelect);
  const match = containerId.match(/sm-loc-(\w+)-(\d+)/);
  if (match) {
    const field = match[1]; // place, time
    const idx = parseInt(match[2]);
    if (SM.locations[idx]) {
      const fieldMap = { place: 'place', time: 'time_of_day' };
      SM.locations[idx][fieldMap[field] || field] = cardId;
    }
  }
}

// ========================================
// 데이터 마이그레이션 (기존 프로젝트 호환)
// ========================================
function smMigrateProjectData(data) {
  if (!data?.step1) return data;
  const s1 = data.step1;
  // 기존 genre → content_type
  if (s1.genre && !s1.content_type) {
    const visualGenres = ['webtoon', 'cartoon'];
    s1.content_type = visualGenres.includes(s1.genre) ? 'webtoon' : 'drama_film';
  }
  if (s1.project_name && !s1.title) s1.title = s1.project_name;
  if (s1.core_message && !s1.synopsis) s1.synopsis = s1.core_message;
  if (!s1.genre_tones) s1.genre_tones = [];
  // step2 마이그레이션
  if (data.step2 && !data.step2.characters) {
    data.step2.characters = [];
    data.step2.locations = [];
    data.step2.visual_style = {};
    data.step2.format = { ...data.step2 };
  }
  return data;
}

// ========================================
// 전역 함수 등록 (onclick 에서 호출)
// ========================================
window.smCreateProject = smCreateProject;
window.smSelectProject = smSelectProject;
window.smDeleteProject = smDeleteProject;
window.smSwitchStep = smSwitchStep;
window.smSelectOption = smSelectOption;
window.smToggleOption = smToggleOption;
window.smAddUrl = smAddUrl;
window.smRemoveUrl = smRemoveUrl;
window.smOnSceneSliderChange = smOnSceneSliderChange;
window.smRecommendAudience = smRecommendAudience;
window.smOnFilesSelected = smOnFilesSelected;
window.smRemoveFile = smRemoveFile;
window.smShowToast = smShowToast;
window.smSelectGenre = smSelectGenre;
window.smSelectSource = smSelectSource;
window.smSyncSourceCards = smSyncSourceCards;
window.smToggleMoodTag = smToggleMoodTag;
window.smAddCustomMoodTag = smAddCustomMoodTag;
window.smSelectPreset = smSelectPreset;
window.smResetToPreset = smResetToPreset;
window.smSelectChoice = smSelectChoice;
// 새 함수들
window.smSelectContentType = smSelectContentType;
window.smSelectCard = smSelectCard;
window.smSelectCharCard = smSelectCharCard;
window.smSelectLocCard = smSelectLocCard;
window.smAddCharacter = smAddCharacter;
window.smRemoveCharacter = smRemoveCharacter;
window.smAddLocation = smAddLocation;
window.smRemoveLocation = smRemoveLocation;
window.smToggleCharPersonality = smToggleCharPersonality;
window.smRenderPhotoCards = smRenderPhotoCards;
window.smRenderColorCards = smRenderColorCards;
window.smGetSelectedCards = smGetSelectedCards;
window.smRenderGenreToneCards = smRenderGenreToneCards;
window.smRenderFormatPresets = smRenderFormatPresets;
window.smRenderAllCharacters = smRenderAllCharacters;
window.smRenderAllLocations = smRenderAllLocations;
