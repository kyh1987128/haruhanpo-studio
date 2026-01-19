// 임시 저장 및 이어서 작업하기 시스템

// 전역 변수
let autoSaveInterval = null;
let lastSaveData = null;

// 로컬스토리지 키
const TEMP_SAVE_KEY = 'postflow_temp_save';
const LAST_SESSION_KEY = 'postflow_last_session';

// 폼 데이터 수집
function collectFormData() {
  const formData = {
    // 브랜드 정보
    brand: document.getElementById('brandName')?.value || '',
    companyName: document.getElementById('companyName')?.value || '',
    businessType: document.getElementById('businessType')?.value || '',
    location: document.getElementById('location')?.value || '',
    targetGender: document.getElementById('targetGender')?.value || '',
    contact: document.getElementById('contact')?.value || '',
    website: document.getElementById('website')?.value || '',
    sns: document.getElementById('sns')?.value || '',
    
    // 콘텐츠 정보
    industry: document.getElementById('industry')?.value || '',
    keywords: document.getElementById('keywords')?.value || '',
    tone: document.getElementById('tone')?.value || '',
    targetAge: document.getElementById('targetAge')?.value || '',
    contentStrategy: document.getElementById('contentStrategy')?.value || '',
    
    // 플랫폼 선택
    platforms: Array.from(document.querySelectorAll('input[name="platform"]:checked'))
      .map(cb => cb.value),
    
    // AI 전략
    aiStrategy: document.querySelector('input[name="aiStrategy"]:checked')?.value || 'auto',
    
    // 타임스탬프
    savedAt: new Date().toISOString(),
    
    // 이미지 정보는 제외 (용량 문제)
    imageCount: window.selectedImages?.length || 0
  };
  
  return formData;
}

// 폼 데이터 복원
function restoreFormData(data) {
  if (!data) return;
  
  // 브랜드 정보
  if (data.brand) document.getElementById('brandName').value = data.brand;
  if (data.companyName) document.getElementById('companyName').value = data.companyName;
  if (data.businessType) document.getElementById('businessType').value = data.businessType;
  if (data.location) document.getElementById('location').value = data.location;
  if (data.targetGender) document.getElementById('targetGender').value = data.targetGender;
  if (data.contact) document.getElementById('contact').value = data.contact;
  if (data.website) document.getElementById('website').value = data.website;
  if (data.sns) document.getElementById('sns').value = data.sns;
  
  // 콘텐츠 정보
  if (data.industry) document.getElementById('industry').value = data.industry;
  if (data.keywords) document.getElementById('keywords').value = data.keywords;
  if (data.tone) document.getElementById('tone').value = data.tone;
  if (data.targetAge) document.getElementById('targetAge').value = data.targetAge;
  if (data.contentStrategy) document.getElementById('contentStrategy').value = data.contentStrategy;
  
  // 플랫폼 선택
  if (data.platforms && data.platforms.length > 0) {
    document.querySelectorAll('input[name="platform"]').forEach(cb => {
      cb.checked = data.platforms.includes(cb.value);
    });
  }
  
  // AI 전략
  if (data.aiStrategy) {
    const strategyRadio = document.querySelector(`input[name="aiStrategy"][value="${data.aiStrategy}"]`);
    if (strategyRadio) strategyRadio.checked = true;
  }
}

// 임시 저장
function saveDraft(showNotification = false) {
  try {
    const formData = collectFormData();
    
    // 데이터가 비어있으면 저장하지 않음
    if (!formData.brand && !formData.keywords && formData.platforms.length === 0) {
      return;
    }
    
    localStorage.setItem(TEMP_SAVE_KEY, JSON.stringify(formData));
    lastSaveData = formData;
    
    if (showNotification) {
      showToast('💾 임시 저장되었습니다', 'success', 2000);
    }
    
    console.log('✅ 임시 저장 완료:', formData);
  } catch (error) {
    console.error('임시 저장 실패:', error);
  }
}

// 임시 저장 불러오기
function loadDraft() {
  try {
    const saved = localStorage.getItem(TEMP_SAVE_KEY);
    if (!saved) return null;
    
    const data = JSON.parse(saved);
    
    // 24시간 이상 지난 데이터는 무시
    const savedAt = new Date(data.savedAt);
    const now = new Date();
    const hoursDiff = (now - savedAt) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      localStorage.removeItem(TEMP_SAVE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('임시 저장 불러오기 실패:', error);
    return null;
  }
}

// 임시 저장 삭제
function clearDraft() {
  localStorage.removeItem(TEMP_SAVE_KEY);
  lastSaveData = null;
}

// 자동 저장 시작 (30초 간격)
function startAutoSave() {
  if (autoSaveInterval) return; // 이미 실행 중
  
  autoSaveInterval = setInterval(() => {
    const currentData = collectFormData();
    
    // 데이터가 변경된 경우에만 저장
    if (JSON.stringify(currentData) !== JSON.stringify(lastSaveData)) {
      saveDraft(false); // 알림 없이 저장
    }
  }, 30000); // 30초
  
  console.log('✅ 자동 저장 시작 (30초 간격)');
}

// 자동 저장 중지
function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
    console.log('⏹️ 자동 저장 중지');
  }
}

// 이어서 작업하기 토스트 표시
function showContinueWorkToast() {
  const draft = loadDraft();
  if (!draft) return;
  
  // ✅ 실제 작업 내용이 있는지 확인 (brand, keywords, images 중 하나라도 있어야 함)
  const hasContent = (draft.brand && draft.brand.trim()) || 
                     (draft.keywords && draft.keywords.trim()) || 
                     (draft.images && draft.images.length > 0);
  
  if (!hasContent) {
    // 빈 임시저장 데이터 삭제
    localStorage.removeItem(TEMP_SAVE_KEY);
    return;
  }
  
  // 커스텀 토스트
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 5rem;
    right: 1.5rem;
    background: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 9998;
    max-width: 350px;
    cursor: pointer;
    transition: all 0.3s;
  `;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
      <div style="font-size: 2rem;">🔄</div>
      <div>
        <div style="font-weight: 700; color: #1f2937; margin-bottom: 0.25rem;">
          임시 저장된 작업이 있습니다
        </div>
        <div style="font-size: 0.875rem; color: #6b7280;">
          ${draft.brand || '작업'} - ${getRelativeTime(draft.savedAt)}
        </div>
      </div>
    </div>
    <div style="display: flex; gap: 0.5rem;">
      <button onclick="continueDraft()" style="flex: 1; padding: 0.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">
        이어서 작업
      </button>
      <button onclick="dismissDraft()" style="flex: 1; padding: 0.5rem; background: #e5e7eb; color: #374151; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">
        새로 시작
      </button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // 15초 후 자동 닫기
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 15000);
}

// 상대 시간 표시
function getRelativeTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diff = (now - past) / 1000; // 초 단위
  
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// 이어서 작업 시작
function continueDraft() {
  const draft = loadDraft();
  if (draft) {
    restoreFormData(draft);
    showToast('✅ 임시 저장된 작업을 불러왔습니다', 'success');
    
    // 토스트 닫기
    document.querySelectorAll('[onclick="continueDraft()"]').forEach(btn => {
      btn.closest('div[style*="fixed"]')?.remove();
    });
    
    // 폼으로 스크롤
    document.getElementById('contentForm')?.scrollIntoView({ behavior: 'smooth' });
  }
}

// 임시 저장 무시
function dismissDraft() {
  clearDraft();
  showToast('새 작업을 시작합니다', 'info');
  
  // 토스트 닫기
  document.querySelectorAll('[onclick="dismissDraft()"]').forEach(btn => {
    btn.closest('div[style*="fixed"]')?.remove();
  });
}

// 마지막 세션 정보 저장
function saveLastSession() {
  const sessionData = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    formData: collectFormData()
  };
  
  localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(sessionData));
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 로그인한 사용자만 자동 저장 시작
  if (window.currentUser && !window.currentUser.isGuest) {
    startAutoSave();
    
    // ❌ 임시 저장 팝업 제거 (사용자 요청)
    // setTimeout(() => {
    //   showContinueWorkToast();
    // }, 2000);
  }
  
  // 페이지 나갈 때 세션 저장
  window.addEventListener('beforeunload', () => {
    saveLastSession();
  });
});

// userUpdated 이벤트 리스너
window.addEventListener('userUpdated', (e) => {
  const user = e.detail;
  if (user && !user.isGuest) {
    startAutoSave();
    
    // ❌ 임시 저장 팝업 제거 (사용자 요청)
    // setTimeout(() => {
    //   showContinueWorkToast();
    // }, 2000);
  } else {
    stopAutoSave();
  }
});

// 수동 저장 버튼 (필요시 추가)
function manualSave() {
  saveDraft(true); // 알림 표시
}

// 전역 함수 노출
window.saveDraft = saveDraft;
window.loadDraft = loadDraft;
window.clearDraft = clearDraft;
window.continueDraft = continueDraft;
window.dismissDraft = dismissDraft;
window.manualSave = manualSave;
window.startAutoSave = startAutoSave;
window.stopAutoSave = stopAutoSave;
