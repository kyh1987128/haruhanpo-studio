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
// 장르 카드 선택
// ========================================
function smSelectGenre(el) {
  const genre = el.dataset.genre;
  // 카드 UI 토글
  document.querySelectorAll('.sm-genre-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  // 숨겨진 select 동기화
  const sel = document.getElementById('sm-genre');
  if (sel) sel.value = genre;
  // 기존 장르 변경 핸들러 호출
  smOnGenreChange();
  smCheckRecommendBtnState();
  // 자동저장
  SM.isDirty = true;
  smDebouncedSave();
}

function smSyncGenreCards(genre) {
  document.querySelectorAll('.sm-genre-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.genre === genre);
  });
}

// ========================================
// 소재 유형 카드 선택 (복수 선택)
// ========================================
function smSelectSource(el) {
  const source = el.dataset.source;
  const idx = SM.selectedSources.indexOf(source);
  if (idx >= 0) {
    // 최소 1개는 선택되어야 함
    if (SM.selectedSources.length <= 1) return;
    SM.selectedSources.splice(idx, 1);
  } else {
    SM.selectedSources.push(source);
  }
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
      SM.projectData = data.project.project_data || {};
      SM.currentStep = data.project.current_step || 1;
      SM.isDirty = false;

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
    const name = document.getElementById('sm-project-name')?.value?.trim();
    const genre = document.getElementById('sm-genre')?.value;
    const msg = document.getElementById('sm-core-message')?.value?.trim();

    if (!name) missing.push('sm-project-name');
    if (!genre) missing.push('sm-genre');
    if (!msg) missing.push('sm-core-message');
  } else if (n === 2) {
    const length = document.getElementById('sm-video-length')?.value;
    const ratio = smGetSelectedRadio('sm-aspect-ratio');
    const platforms = smGetSelectedCheckboxes('sm-platforms');

    if (!length) missing.push('sm-video-length');
    if (!ratio) missing.push('sm-aspect-ratio');
    if (!platforms || platforms.length === 0) missing.push('sm-platforms');
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
    smShowToast('필수 항목을 입력해주세요');
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
    return !!(d.project_name?.trim() && d.genre && d.core_message?.trim());
  } else if (n === 2) {
    return !!(d.video_length && d.aspect_ratio && d.platforms?.length > 0);
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
      project_name: document.getElementById('sm-project-name')?.value || '',
      genre: document.getElementById('sm-genre')?.value || '',
      target_audience: document.getElementById('sm-target-audience')?.value || '',
      core_message: document.getElementById('sm-core-message')?.value || '',
      mood_keywords: moodStr,
      reference_urls: SM.referenceUrls.slice(),
      reference_files: SM.referenceFiles.slice(),
      additional_notes: document.getElementById('sm-additional-notes')?.value || '',
      source_types: SM.selectedSources.slice(),
      url_direction: document.getElementById('sm-url-direction')?.value || '',
      file_direction: document.getElementById('sm-file-direction')?.value || '',
    };
  } else if (n === 2) {
    const rawSceneCount = document.getElementById('sm-scene-count')?.value;
    SM.projectData.step2 = {
      video_length: document.getElementById('sm-video-length')?.value || '',
      scene_count: rawSceneCount ? parseInt(rawSceneCount, 10) : 0,
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
    smSetValue('sm-url-direction', d.url_direction || '');
    smSetValue('sm-file-direction', d.file_direction || '');

    // 장르 카드 선택 반영
    smSyncGenreCards(d.genre || '');

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
    // 구 키 호환: mid_3 → mid_3m 등
    const migratedLength = SCENE_KEY_MIGRATION[d.video_length] || d.video_length || '';
    smSetValue('sm-video-length', migratedLength);
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

  const genreMap = {
    promotion: '홍보 · 광고', education: '교육 · 튜토리얼', vlog: '브이로그', review: '리뷰',
    story: '스토리텔링', news: '뉴스 · 시사', music: '뮤직비디오', animation: '애니메이션', other: '기타',
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
  // 참고 파일 개수 표시
  const files = Array.isArray(s1.reference_files) ? s1.reference_files : [];
  if (files.length > 0) {
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    html += smPreviewRow('참고 파일', `${files.length}개 (${smFormatFileSize(totalSize)})`);
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
