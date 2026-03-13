/**
 * 스토리 메이커 프론트엔드 JS v1.1.0
 * - 프로젝트 CRUD, Step 네비, 자동저장
 * - 참고 URL 칩 UI (최대 5개)
 * - 장면 수 슬라이더 (SCENE_LIMITS)
 * - 타겟 오디언스 AI 자동 추천
 * - app-v3-final.js의 window.supabaseClient / window.currentUser 대기 후 초기화
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
};

// 영상 길이별 장면 수 범위
const SCENE_LIMITS = {
  short_15: { min: 2, max: 4, default: 3 },
  short_30: { min: 3, max: 6, default: 4 },
  short_60: { min: 4, max: 8, default: 6 },
  mid_3:    { min: 6, max: 15, default: 10 },
  mid_5:    { min: 10, max: 20, default: 15 },
  long_10:  { min: 15, max: 30, default: 20 },
  long_15:  { min: 20, max: 40, default: 25 },
};

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

async function smInit() {
  if (SM.initialized) return;
  SM.initialized = true;
  console.log('[StoryMaker] 초기화 시작');

  // 프로젝트 목록 로드
  await smLoadProjects();

  // 폼 변경 감지 (자동저장)
  smSetupAutosave();

  // 영상 길이 변경 → 장면 수 슬라이더 업데이트
  const videoLengthEl = document.getElementById('sm-video-length');
  if (videoLengthEl) {
    videoLengthEl.addEventListener('change', smOnVideoLengthChange);
  }

  // 장르 변경 → 타겟 오디언스 가시성 + AI 추천 버튼 상태
  const genreEl = document.getElementById('sm-genre');
  if (genreEl) {
    genreEl.addEventListener('change', smOnGenreChange);
  }

  // 프로젝트명, 핵심 메시지 변경 → AI 추천 버튼 활성화 체크
  ['sm-project-name', 'sm-core-message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', smCheckRecommendBtnState);
  });

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
      SM.projectData = data.project.project_data || {};
      SM.currentStep = data.project.current_step || 1;
      SM.isDirty = false;

      // 참고 URL 목록 동기화
      smSyncUrlsFromData();

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
      name: SM.projectData.step1?.project_name || undefined,
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
// Step 전환
// ========================================
function smSwitchStep(n, skipSave) {
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

// ========================================
// 데이터 수집 & 폼 채우기
// ========================================
function smCollectStepData(n) {
  if (n === 1) {
    SM.projectData.step1 = {
      project_name: document.getElementById('sm-project-name')?.value || '',
      genre: document.getElementById('sm-genre')?.value || '',
      target_audience: document.getElementById('sm-target-audience')?.value || '',
      core_message: document.getElementById('sm-core-message')?.value || '',
      mood_keywords: document.getElementById('sm-mood-keywords')?.value || '',
      reference_urls: SM.referenceUrls.slice(), // 배열로 저장
      additional_notes: document.getElementById('sm-additional-notes')?.value || '',
    };
  } else if (n === 2) {
    SM.projectData.step2 = {
      video_length: document.getElementById('sm-video-length')?.value || '',
      scene_count: document.getElementById('sm-scene-count')?.value || '',
      aspect_ratio: smGetSelectedRadio('sm-aspect-ratio'),
      platforms: smGetSelectedCheckboxes('sm-platforms'),
      style: document.getElementById('sm-style')?.value || '',
      color_tone: document.getElementById('sm-color-tone')?.value || '',
      has_narration: document.getElementById('sm-has-narration')?.checked ?? true,
      has_bgm: document.getElementById('sm-has-bgm')?.checked ?? true,
    };
  }
}

// 폼 값 채우기 — 데이터 없으면 명시적으로 초기화 (새 프로젝트 버그 수정)
function smFillStepForm(n) {
  if (n === 1) {
    const d = SM.projectData.step1 || {};
    smSetValue('sm-project-name', d.project_name || '');
    smSetValue('sm-genre', d.genre || '');
    smSetValue('sm-target-audience', d.target_audience || '');
    smSetValue('sm-core-message', d.core_message || '');
    smSetValue('sm-mood-keywords', d.mood_keywords || '');
    smSetValue('sm-additional-notes', d.additional_notes || '');

    // 참고 URL 칩 렌더
    smRenderUrlList();

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
    smSetValue('sm-video-length', d.video_length || '');
    smSetValue('sm-style', d.style || '');
    smSetValue('sm-color-tone', d.color_tone || '');
    smSetSelectedRadio('sm-aspect-ratio', d.aspect_ratio || '');
    smSetSelectedCheckboxes('sm-platforms', d.platforms || []);
    smSetChecked('sm-has-narration', d.has_narration);
    smSetChecked('sm-has-bgm', d.has_bgm);

    // 장면 수 슬라이더 업데이트
    smOnVideoLengthChange();
    // 저장된 scene_count 반영
    if (d.scene_count) {
      const slider = document.getElementById('sm-scene-count');
      if (slider) {
        slider.value = d.scene_count;
        smOnSceneSliderChange(d.scene_count);
      }
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

// ========================================
// 장면 수 슬라이더
// ========================================
function smOnVideoLengthChange() {
  const videoLength = document.getElementById('sm-video-length')?.value;
  const emptyEl = document.getElementById('sm-scene-slider-empty');
  const sliderWrap = document.getElementById('sm-scene-slider-wrap');
  const slider = document.getElementById('sm-scene-count');

  if (!emptyEl || !sliderWrap || !slider) return;

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
    other: '해당 주제에 관심 있는 일반 대중',
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
  group.querySelectorAll('.sm-option-item').forEach(item => item.classList.remove('selected'));
  el.classList.add('selected');
  const radio = el.querySelector('input[type="radio"]');
  if (radio) radio.checked = true;
  smMarkDirty();
}

// 체크박스 옵션 토글 핸들러
function smToggleOption(el) {
  const cb = el.querySelector('input[type="checkbox"]');
  if (cb) {
    setTimeout(() => {
      if (cb.checked) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
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

// Step 네비 렌더링
function smRenderStepNav() {
  const stepItems = document.querySelectorAll('.sm-step-item');
  stepItems.forEach(item => {
    const step = parseInt(item.dataset.step);
    item.classList.remove('active', 'completed', 'locked');

    if (step === SM.currentStep) {
      item.classList.add('active');
    } else if (step < SM.currentStep) {
      const stepData = SM.projectData[`step${step}`];
      if (stepData && Object.values(stepData).some(v => v && (typeof v === 'string' ? v.trim() : true))) {
        item.classList.add('completed');
      }
    } else if (step > 2) {
      item.classList.add('locked');
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

  const genreMap = {
    promotion: '홍보 · 광고', education: '교육 · 튜토리얼', vlog: '브이로그', review: '리뷰',
    story: '스토리텔링', news: '뉴스 · 시사', music: '뮤직비디오', animation: '애니메이션', other: '기타',
  };

  const lengthMap = {
    short_15: '15초', short_30: '30초', short_60: '60초',
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

  if (s1.project_name) html += smPreviewRow('프로젝트명', s1.project_name);
  if (s1.genre) html += smPreviewRow('장르', genreMap[s1.genre] || s1.genre);
  if (s1.target_audience) html += smPreviewRow('타겟', s1.target_audience);
  if (s1.core_message) html += smPreviewRow('핵심 메시지', smTruncate(s1.core_message, 60));
  if (s1.mood_keywords) {
    const tags = s1.mood_keywords.split(',').map(k => k.trim()).filter(Boolean);
    html += `<div class="sm-preview-item">
      <span class="sm-preview-item-label">분위기</span>
      <div class="sm-preview-tags">${tags.map(t => `<span class="sm-preview-tag">${smEscape(t)}</span>`).join('')}</div>
    </div>`;
  }
  // 참고 URL 개수 표시
  const urls = Array.isArray(s1.reference_urls) ? s1.reference_urls : [];
  if (urls.length > 0) {
    html += smPreviewRow('참고 URL', `${urls.length}개`);
  }
  html += '</div>';

  // Step 2 요약
  if (s2.video_length || s2.aspect_ratio || s2.style) {
    html += `<div class="sm-preview-section">
      <div class="sm-preview-section-title">🎬 포맷 설정</div>`;

    if (s2.video_length) html += smPreviewRow('영상 길이', lengthMap[s2.video_length] || s2.video_length);
    if (s2.aspect_ratio) html += smPreviewRow('화면 비율', s2.aspect_ratio);
    if (s2.scene_count) html += smPreviewRow('장면 수', s2.scene_count + '컷');
    if (s2.style) html += smPreviewRow('스타일', styleMap[s2.style] || s2.style);
    if (s2.color_tone) html += smPreviewRow('컬러 톤', toneMap[s2.color_tone] || s2.color_tone);
    html += smPreviewRow('나레이션', s2.has_narration !== false ? '✅' : '❌');
    html += smPreviewRow('배경 음악', s2.has_bgm !== false ? '✅' : '❌');

    if (s2.platforms && s2.platforms.length > 0) {
      html += `<div class="sm-preview-item">
        <span class="sm-preview-item-label">플랫폼</span>
        <div class="sm-preview-tags">${s2.platforms.map(p => `<span class="sm-preview-tag">${smEscape(p)}</span>`).join('')}</div>
      </div>`;
    }

    html += '</div>';
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
