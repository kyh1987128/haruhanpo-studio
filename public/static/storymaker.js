/**
 * 스토리 메이커 프론트엔드 JS
 * - 프로젝트 CRUD, Step 네비, 자동저장
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
      // 인증 실패 시 welcome 화면만 표시
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

  // 크레딧 표시
  smUpdateCredits();

  // 프로젝트 목록 로드
  await smLoadProjects();

  // 폼 변경 감지 (자동저장)
  smSetupAutosave();

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
// 크레딧 표시
// ========================================
async function smUpdateCredits() {
  try {
    const data = await smApiCall('GET', '/api/user/stats');
    if (data.success && data.stats) {
      const total = (data.stats.free_credits || 0) + (data.stats.paid_credits || 0);
      const el = document.getElementById('sm-credits-count');
      if (el) el.textContent = total.toLocaleString();
    }
  } catch (e) {
    console.warn('[StoryMaker] 크레딧 조회 실패:', e);
  }
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
      smRenderProjectList(); // 빈 목록이라도 렌더
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

      // UI 업데이트
      smRenderProjectList(); // active 하이라이트
      smShowStepNav();
      smSwitchStep(SM.currentStep, true); // 저장 없이 바로 이동

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

        // Step 네비 숨기기, welcome 표시
        const stepNav = document.getElementById('sm-step-nav');
        if (stepNav) stepNav.style.display = 'none';

        smHideAllSteps();
        const welcome = document.getElementById('sm-welcome');
        if (welcome) welcome.style.display = '';

        // 프리뷰 초기화
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

  // 자동저장 인디케이터
  smSetAutosaveStatus('saving');

  try {
    const data = await smApiCall('PUT', `/api/storymaker/projects/${SM.currentProjectId}`, {
      project_data: SM.projectData,
      current_step: SM.currentStep,
      // 프로젝트 이름이 Step 1에서 변경되었을 수 있음
      name: SM.projectData.step1?.project_name || undefined,
    });

    if (data.success) {
      SM.isDirty = false;
      smSetAutosaveStatus('saved');

      // 프리뷰 갱신
      smRenderPreview();

      // 프로젝트 이름이 변경되었으면 좌측 목록도 갱신
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
  // locked 체크 (Step 3~6은 아직 준비중)
  // Step 1~2는 자유 이동, Step 3~6도 볼 수는 있게

  // 현재 데이터 수집 & 저장
  if (!skipSave && SM.currentProjectId && SM.currentStep) {
    smCollectStepData(SM.currentStep);
    SM.isDirty = true;
    smDebouncedSave();
  }

  SM.currentStep = n;

  // 모든 Step 숨기기
  smHideAllSteps();

  // 대상 Step 표시
  const targetStep = document.getElementById(`sm-step-${n}`);
  if (targetStep) {
    targetStep.classList.add('active');
    // 폼 값 채우기
    smFillStepForm(n);
  }

  // Step 네비 active 업데이트
  smRenderStepNav();

  // 메인 영역 스크롤 맨 위로
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
      reference_urls: document.getElementById('sm-reference-urls')?.value || '',
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
  // Step 3~6 은 이후 구현
}

function smFillStepForm(n) {
  if (n === 1 && SM.projectData.step1) {
    const d = SM.projectData.step1;
    smSetValue('sm-project-name', d.project_name);
    smSetValue('sm-genre', d.genre);
    smSetValue('sm-target-audience', d.target_audience);
    smSetValue('sm-core-message', d.core_message);
    smSetValue('sm-mood-keywords', d.mood_keywords);
    smSetValue('sm-reference-urls', d.reference_urls);
    smSetValue('sm-additional-notes', d.additional_notes);
  } else if (n === 2 && SM.projectData.step2) {
    const d = SM.projectData.step2;
    smSetValue('sm-video-length', d.video_length);
    smSetValue('sm-scene-count', d.scene_count);
    smSetValue('sm-style', d.style);
    smSetValue('sm-color-tone', d.color_tone);
    smSetSelectedRadio('sm-aspect-ratio', d.aspect_ratio);
    smSetSelectedCheckboxes('sm-platforms', d.platforms);
    smSetChecked('sm-has-narration', d.has_narration);
    smSetChecked('sm-has-bgm', d.has_bgm);
  }
}

// ========================================
// 폼 유틸리티
// ========================================
function smSetValue(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
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
  if (!val) return;
  const group = document.getElementById(groupId);
  if (!group) return;

  // 모든 옵션 해제
  group.querySelectorAll('.sm-option-item').forEach(item => {
    item.classList.remove('selected');
    const radio = item.querySelector('input[type="radio"]');
    if (radio) radio.checked = false;
  });

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
  if (!vals || !Array.isArray(vals)) return;
  const group = document.getElementById(groupId);
  if (!group) return;

  // 모든 옵션 해제
  group.querySelectorAll('.sm-option-item').forEach(item => {
    item.classList.remove('selected');
    const cb = item.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = false;
  });

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
    // checkbox는 label click으로 자동 토글되므로 직접 제어 불필요
    // 단, CSS 클래스만 동기화
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
      // 이전 Step은 완료 표시 (데이터가 있으면)
      const stepData = SM.projectData[`step${step}`];
      if (stepData && Object.values(stepData).some(v => v && (typeof v === 'string' ? v.trim() : true))) {
        item.classList.add('completed');
      }
    } else if (step > 2) {
      // Step 3~6은 locked (아직 미구현)
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

  // 장르 한글 매핑
  const genreMap = {
    promotion: '홍보 · 광고', education: '교육 · 튜토리얼', vlog: '브이로그', review: '리뷰',
    story: '스토리텔링', news: '뉴스 · 시사', music: '뮤직비디오', animation: '애니메이션', other: '기타',
  };

  // 영상 길이 매핑
  const lengthMap = {
    short_15: '15초', short_30: '30초', short_60: '60초',
    mid_3: '3분', mid_5: '5분', long_10: '10분', long_15: '15분+',
  };

  // 스타일 매핑
  const styleMap = {
    cinematic: '시네마틱', minimal: '미니멀', dynamic: '다이나믹',
    retro: '레트로', cute: '캐주얼', luxury: '프리미엄', corporate: '비즈니스',
  };

  // 컬러 톤 매핑
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
  html += '</div>';

  // Step 2 요약
  if (s2.video_length || s2.aspect_ratio || s2.style) {
    html += `<div class="sm-preview-section">
      <div class="sm-preview-section-title">🎬 포맷 설정</div>`;

    if (s2.video_length) html += smPreviewRow('영상 길이', lengthMap[s2.video_length] || s2.video_length);
    if (s2.aspect_ratio) html += smPreviewRow('화면 비율', s2.aspect_ratio);
    if (s2.scene_count) html += smPreviewRow('장면 수', s2.scene_count + '개');
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
  document.querySelectorAll('.sm-form-input, .sm-form-select, .sm-form-textarea').forEach(el => {
    el.addEventListener('input', smMarkDirty);
    el.addEventListener('change', smMarkDirty);
  });

  // 토글 체크박스 변경 감지
  document.querySelectorAll('.sm-toggle input[type="checkbox"]').forEach(el => {
    el.addEventListener('change', smMarkDirty);
  });
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
  // 현재 Step의 autosave 인디케이터
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

    // 1시간 이내
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return mins <= 0 ? '방금 전' : `${mins}분 전`;
    }
    // 24시간 이내
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}시간 전`;
    }
    // 7일 이내
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}일 전`;
    }
    // 그 외
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
