// ===================================
// Multi-Platform Content Generator v3 Enhanced
// API 키 관리, 비용 계산, 로딩/에러 UI, 템플릿 관리, 결과 복사
// ===================================

// 전역 변수
let selectedImages = [];
let resultData = {};
let savedProfiles = [];
let contentHistory = [];
let customTemplates = [];
let currentEditImageIndex = null;
let lastFormData = null; // 재시도용

// LocalStorage 키
const STORAGE_KEYS = {
  PROFILES: 'content_generator_profiles',
  HISTORY: 'content_generator_history',
  CURRENT_PROFILE: 'content_generator_current_profile',
  TEMPLATES: 'content_generator_templates',
  API_KEY: 'content_generator_api_key', // API 키
};

// 비용 상수 (USD) - GPT-4o 기준
const COSTS = {
  IMAGE_ANALYSIS: 0.01, // 이미지 1장당 분석 비용
  BLOG: 0.04,
  INSTAGRAM: 0.03,
  THREADS: 0.02,
  YOUTUBE: 0.04,
};

// 환율 정보
let EXCHANGE_RATE = 1300; // 기본값
let lastExchangeUpdate = null;

// 기본 템플릿
const DEFAULT_TEMPLATES = {
  blog: `당신은 네이버 블로그 마케팅 전문가입니다.

브랜드: {브랜드명}
키워드: {키워드}
톤앤매너: {톤앤매너}
타겟: {타겟연령대}, {타겟성별}
산업: {산업분야}

위 정보와 제공된 이미지를 바탕으로 SEO 최적화된 블로그 포스트를 작성해주세요.`,
  
  instagram: `당신은 인스타그램 콘텐츠 전문가입니다.

브랜드: {브랜드명}
키워드: {키워드}
톤앤매너: {톤앤매너}
타겟: {타겟연령대}, {타겟성별}

위 정보와 제공된 이미지를 바탕으로 인스타그램 게시글을 작성해주세요. 이모지와 해시태그를 적극 활용하세요.`,
  
  threads: `당신은 스레드(Threads) 콘텐츠 전문가입니다.

브랜드: {브랜드명}
키워드: {키워드}
톤앤매너: {톤앤매너}

위 정보와 제공된 이미지를 바탕으로 짧고 임팩트 있는 스레드 포스트를 작성해주세요.`,
  
  youtube: `당신은 유튜브 숏폼 콘텐츠 전문가입니다.

브랜드: {브랜드명}
키워드: {키워드}
톤앤매너: {톤앤매너}

위 정보와 제공된 이미지를 바탕으로 유튜브 숏폼 스크립트와 설명을 작성해주세요.`
};

// ===================================
// 초기화
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  // API 키 확인
  checkApiKey();
  
  // 데이터 로드
  loadProfiles();
  loadHistory();
  loadTemplates();
  
  // 환율 조회
  await fetchExchangeRate();
  
  // 이벤트 리스너
  setupEventListeners();
  
  // 비용 초기화
  updateCostEstimate();
  
  // 다국어 초기화
  if (typeof window.i18n !== 'undefined' && typeof window.i18n.init === 'function') {
    window.i18n.init();
  }
}

// ===================================
// API 키 관리
// ===================================
function checkApiKey() {
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
  const apiKeySection = document.getElementById('apiKeySection');
  
  if (!apiKey) {
    // API 키 없으면 입력 섹션 표시
    apiKeySection.style.display = 'block';
  } else {
    apiKeySection.style.display = 'none';
  }
}

function setupApiKeyListeners() {
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
      const apiKey = apiKeyInput.value.trim();
      
      if (!apiKey) {
        showToast('❌ API 키를 입력해주세요', 'error');
        return;
      }
      
      if (!apiKey.startsWith('sk-')) {
        showToast('❌ 올바른 OpenAI API 키 형식이 아닙니다', 'error');
        return;
      }
      
      // LocalStorage에 저장
      localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
      
      // UI 업데이트
      document.getElementById('apiKeySection').style.display = 'none';
      showToast('✅ API 키가 저장되었습니다!', 'success');
      
      // 입력 필드 초기화
      apiKeyInput.value = '';
    });
  }
}

// ===================================
// 이벤트 리스너 설정
// ===================================
function setupEventListeners() {
  // API 키
  setupApiKeyListeners();
  
  // 이미지 업로드
  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('imageInput');

  if (uploadArea) {
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
  }

  if (imageInput) {
    imageInput.addEventListener('change', handleImageSelect);
  }

  // 폼 제출
  const contentForm = document.getElementById('contentForm');
  if (contentForm) {
    contentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleGenerate();
    });
  }

  // 프로필 관리
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const loadProfileBtn = document.getElementById('loadProfileBtn');

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfile);
  }

  if (loadProfileBtn) {
    loadProfileBtn.addEventListener('click', openLoadProfileModal);
  }

  // 히스토리
  const historyBtn = document.getElementById('historyBtn');
  if (historyBtn) {
    historyBtn.addEventListener('click', openHistoryModal);
  }

  // 템플릿 관리
  const templateBtn = document.getElementById('templateBtn');
  if (templateBtn) {
    templateBtn.addEventListener('click', openTemplateModal);
  }

  // 플랫폼 선택 변경 시 비용 재계산
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]');
  platformCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', updateCostEstimate);
  });
}

// ===================================
// 이미지 업로드
// ===================================
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = '#667eea';
  e.currentTarget.style.backgroundColor = '#f0f0ff';
}

function handleDragLeave(e) {
  e.currentTarget.style.borderColor = '#d1d5db';
  e.currentTarget.style.backgroundColor = 'transparent';
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = '#d1d5db';
  e.currentTarget.style.backgroundColor = 'transparent';

  const files = Array.from(e.dataTransfer.files);
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));

  if (imageFiles.length > 0) {
    processImageFiles(imageFiles);
  }
}

function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  processImageFiles(files);
}

async function processImageFiles(files) {
  if (selectedImages.length + files.length > 10) {
    showToast('❌ 최대 10장까지 업로드 가능합니다', 'error');
    return;
  }

  let totalSize = selectedImages.reduce((sum, img) => sum + img.size, 0);
  for (const file of files) {
    totalSize += file.size;
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (totalSize > maxSize) {
    showToast('❌ 총 파일 크기는 50MB를 초과할 수 없습니다', 'error');
    return;
  }

  for (const file of files) {
    const base64 = await fileToBase64(file);
    selectedImages.push({
      name: file.name,
      size: file.size,
      base64: base64,
      url: URL.createObjectURL(file),
    });
  }

  renderImagePreviews();
  updateCostEstimate();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  const container = document.getElementById('imagePreviewContainer');
  if (!container) return;

  if (selectedImages.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = selectedImages
    .map(
      (img, index) => `
    <div class="image-preview">
      <img src="${img.url}" alt="${img.name}" />
      <button class="remove-image-btn" onclick="removeImage(${index})">
        <i class="fas fa-times"></i>
      </button>
      <button class="edit-image-btn" onclick="openImageEditor(${index})" title="이미지 편집">
        <i class="fas fa-edit"></i>
      </button>
      <span class="image-name">${img.name}</span>
    </div>
  `
    )
    .join('');
}

function removeImage(index) {
  URL.revokeObjectURL(selectedImages[index].url);
  selectedImages.splice(index, 1);
  renderImagePreviews();
  updateCostEstimate();
}

// ===================================
// 이미지 편집
// ===================================
function openImageEditor(index) {
  currentEditImageIndex = index;
  const modal = document.getElementById('imageEditorModal');
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  };
  img.src = selectedImages[index].url;

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function applyImageFilter(filter) {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  switch (filter) {
    case 'grayscale':
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
      break;
    case 'brightness':
      const brightness = 30;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + brightness);
        data[i + 1] = Math.min(255, data[i + 1] + brightness);
        data[i + 2] = Math.min(255, data[i + 2] + brightness);
      }
      break;
    case 'contrast':
      const contrast = 1.2;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * contrast) + 128));
        data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * contrast) + 128));
        data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * contrast) + 128));
      }
      break;
  }

  ctx.putImageData(imageData, 0, 0);
  showToast(`✅ ${filter} 필터가 적용되었습니다`, 'success');
}

function compressImage() {
  const canvas = document.getElementById('editCanvas');
  const quality = 0.7; // 70% 품질
  
  showToast('🔄 이미지 압축 중...', 'info');
  
  setTimeout(() => {
    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
    selectedImages[currentEditImageIndex].base64 = compressedBase64;
    selectedImages[currentEditImageIndex].size = Math.floor(compressedBase64.length * 0.75);
    showToast('✅ 이미지가 70% 품질로 압축되었습니다', 'success');
  }, 300);
}

function saveEditedImage() {
  const canvas = document.getElementById('editCanvas');
  const newBase64 = canvas.toDataURL('image/png');
  
  selectedImages[currentEditImageIndex].base64 = newBase64;
  URL.revokeObjectURL(selectedImages[currentEditImageIndex].url);
  selectedImages[currentEditImageIndex].url = canvas.toDataURL();
  
  renderImagePreviews();
  closeImageEditor();
  showToast('✅ 이미지 편집이 저장되었습니다', 'success');
}

function closeImageEditor() {
  const modal = document.getElementById('imageEditorModal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
  currentEditImageIndex = null;
}

// ===================================
// 비용 계산
// ===================================
async function fetchExchangeRate() {
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간
  const cachedRate = localStorage.getItem('exchange_rate');
  const cachedTime = localStorage.getItem('exchange_rate_time');

  if (cachedRate && cachedTime) {
    const timeDiff = Date.now() - parseInt(cachedTime);
    if (timeDiff < CACHE_DURATION) {
      EXCHANGE_RATE = parseFloat(cachedRate);
      lastExchangeUpdate = new Date(parseInt(cachedTime));
      return;
    }
  }

  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    EXCHANGE_RATE = data.rates.KRW;
    lastExchangeUpdate = new Date();

    localStorage.setItem('exchange_rate', EXCHANGE_RATE.toString());
    localStorage.setItem('exchange_rate_time', Date.now().toString());
  } catch (error) {
    console.error('환율 조회 실패:', error);
    EXCHANGE_RATE = 1300; // 기본값
  }
}

function updateCostEstimate() {
  const imageCount = selectedImages.length;
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  const platformCount = platformCheckboxes.length;

  if (imageCount === 0 || platformCount === 0) {
    document.getElementById('costEstimate').innerHTML = `
      <div style="padding: 1.5rem; text-align: center; background: #f9fafb; border-radius: 12px; border: 2px dashed #d1d5db;">
        <p style="color: #6b7280; margin: 0;">
          📊 이미지와 플랫폼을 선택하면 예상 비용이 표시됩니다
        </p>
      </div>
    `;
    return;
  }

  // 비용 계산
  const imageCost = imageCount * COSTS.IMAGE_ANALYSIS;
  let platformCost = 0;

  platformCheckboxes.forEach((checkbox) => {
    const platform = checkbox.value;
    platformCost += COSTS[platform.toUpperCase()] || 0;
  });

  const totalCostUSD = imageCost + platformCost;
  const totalCostKRW = Math.round(totalCostUSD * EXCHANGE_RATE);

  // 예상 소요 시간 계산
  const imageAnalysisTime = Math.min(imageCount * 3, 5);
  const contentGenerationTime = Math.min(platformCount * 10, 15);
  const totalTimeSeconds = imageAnalysisTime + contentGenerationTime;
  const totalTimeMinutes = Math.ceil(totalTimeSeconds / 60);

  document.getElementById('costEstimate').innerHTML = `
    <div style="padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
      <h3 style="font-size: 1.2rem; font-weight: bold; margin-bottom: 1rem; text-align: center;">
        💰 예상 비용 및 소요 시간
      </h3>
      
      <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
          <span>📸 이미지 분석 (${imageCount}장):</span>
          <span style="font-weight: 600;">$${imageCost.toFixed(2)} / ₩${Math.round(imageCost * EXCHANGE_RATE).toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>✨ 콘텐츠 생성 (${platformCount}개):</span>
          <span style="font-weight: 600;">$${platformCost.toFixed(2)} / ₩${Math.round(platformCost * EXCHANGE_RATE).toLocaleString()}</span>
        </div>
      </div>
      
      <div style="background: rgba(255,255,255,0.25); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: bold;">
          <span>💵 총 예상 비용:</span>
          <span>$${totalCostUSD.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.5rem; font-weight: bold; margin-top: 0.5rem;">
          <span>💴 총 예상 비용:</span>
          <span>₩${totalCostKRW.toLocaleString()}</span>
        </div>
      </div>
      
      <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 1.1rem;">⏱️ 예상 소요 시간:</span>
          <span style="font-size: 1.3rem; font-weight: bold;">${totalTimeSeconds}초 (약 ${totalTimeMinutes}분)</span>
        </div>
      </div>
      
      <p style="font-size: 0.85rem; opacity: 0.9; margin-top: 1rem; text-align: center; margin-bottom: 0;">
        환율: $1 = ₩${EXCHANGE_RATE.toFixed(0)} | 모델: GPT-4o | 업데이트: ${lastExchangeUpdate ? lastExchangeUpdate.toLocaleDateString() : '오늘'}
      </p>
    </div>
  `;
}

// ===================================
// 콘텐츠 생성
// ===================================
async function handleGenerate() {
  // API 키 확인
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
  if (!apiKey) {
    showToast('❌ OpenAI API 키를 먼저 설정해주세요', 'error');
    document.getElementById('apiKeySection').style.display = 'block';
    document.getElementById('apiKeySection').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // 입력값 수집
  const brand = document.getElementById('brand').value.trim();
  const keywords = document.getElementById('keywords').value.trim();

  if (!brand || !keywords) {
    showToast('❌ 브랜드명과 핵심 키워드는 필수입니다', 'error');
    return;
  }

  if (selectedImages.length === 0) {
    showToast('❌ 최소 1장의 이미지를 업로드해주세요', 'error');
    return;
  }

  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  if (platformCheckboxes.length === 0) {
    showToast('❌ 최소 1개 플랫폼을 선택해주세요', 'error');
    return;
  }

  const platforms = Array.from(platformCheckboxes).map((cb) => cb.value);

  const formData = {
    brand,
    companyName: document.getElementById('companyName')?.value.trim() || '',
    businessType: document.getElementById('businessType')?.value.trim() || '',
    location: document.getElementById('location')?.value.trim() || '',
    targetGender: document.getElementById('targetGender')?.value || '',
    contact: document.getElementById('contact')?.value.trim() || '',
    website: document.getElementById('website')?.value.trim() || '',
    sns: document.getElementById('sns')?.value.trim() || '',
    keywords,
    tone: document.getElementById('tone')?.value || '친근한',
    targetAge: document.getElementById('targetAge')?.value || '20대',
    industry: document.getElementById('industry')?.value || '라이프스타일',
    images: selectedImages.map((img) => img.base64),
    platforms,
    aiModel: 'gpt-4o',
    apiKey: apiKey, // API 키 포함
  };

  // 재시도용 저장
  lastFormData = formData;

  // 로딩 표시
  showLoadingOverlay();

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      hideLoadingOverlay();
      resultData = result.data;
      displayResults(result.data, result.generatedPlatforms);
      saveToHistory(formData, result.data);
      showToast('✅ 콘텐츠 생성 완료!', 'success');
    } else {
      hideLoadingOverlay();
      showErrorModal(result.error || '알 수 없는 오류가 발생했습니다');
    }
  } catch (error) {
    console.error('생성 오류:', error);
    hideLoadingOverlay();
    showErrorModal('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
  }
}

// ===================================
// 로딩 오버레이
// ===================================
function showLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('hidden');
  
  // 진행률 애니메이션
  let progress = 0;
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const loadingMessage = document.getElementById('loadingMessage');
  
  const messages = [
    '이미지 분석 중...',
    'AI가 콘텐츠를 생성하고 있습니다...',
    '플랫폼별 최적화 중...',
    '거의 완료되었습니다...'
  ];
  
  let messageIndex = 0;
  
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    
    progressBar.style.width = progress + '%';
    progressPercent.textContent = Math.floor(progress) + '%';
    
    if (progress > 25 * (messageIndex + 1) && messageIndex < messages.length - 1) {
      messageIndex++;
      loadingMessage.textContent = messages[messageIndex];
    }
  }, 500);
  
  overlay.dataset.intervalId = interval;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  const intervalId = overlay.dataset.intervalId;
  
  if (intervalId) {
    clearInterval(parseInt(intervalId));
  }
  
  // 완료 애니메이션
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  
  progressBar.style.width = '100%';
  progressPercent.textContent = '100%';
  
  setTimeout(() => {
    overlay.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    document.getElementById('loadingMessage').textContent = '이미지 분석 중...';
  }, 500);
}

// ===================================
// 에러 모달
// ===================================
function showErrorModal(errorMessage) {
  const modal = document.getElementById('errorModal');
  const errorMessageEl = document.getElementById('errorMessage');
  const errorSolutionsEl = document.getElementById('errorSolutions');
  
  errorMessageEl.textContent = errorMessage;
  
  // 에러 유형별 해결 방법
  let solutions = [];
  
  if (errorMessage.includes('API') || errorMessage.includes('key')) {
    solutions = [
      '• OpenAI API 키가 올바른지 확인하세요',
      '• API 키가 활성화되어 있는지 확인하세요',
      '• API 사용 한도가 남아있는지 확인하세요',
      '• 우측 상단에서 새 API 키를 설정해보세요'
    ];
  } else if (errorMessage.includes('네트워크') || errorMessage.includes('network')) {
    solutions = [
      '• 인터넷 연결을 확인해주세요',
      '• VPN을 사용 중이라면 비활성화해보세요',
      '• 브라우저 캐시를 지우고 다시 시도해보세요',
      '• 잠시 후 다시 시도해주세요'
    ];
  } else if (errorMessage.includes('이미지') || errorMessage.includes('image')) {
    solutions = [
      '• 이미지 파일이 손상되지 않았는지 확인하세요',
      '• 이미지 크기가 너무 크지 않은지 확인하세요 (최대 50MB)',
      '• 지원되는 이미지 형식인지 확인하세요 (JPG, PNG, GIF)',
      '• 다른 이미지로 다시 시도해보세요'
    ];
  } else {
    solutions = [
      '• 페이지를 새로고침하고 다시 시도해보세요',
      '• 입력한 정보가 올바른지 확인해주세요',
      '• 브라우저 콘솔(F12)에서 자세한 오류를 확인하세요',
      '• 문제가 계속되면 관리자에게 문의하세요'
    ];
  }
  
  errorSolutionsEl.innerHTML = solutions.map(s => `<li>${s}</li>`).join('');
  
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeErrorModal() {
  const modal = document.getElementById('errorModal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
}

function retryGeneration() {
  closeErrorModal();
  if (lastFormData) {
    handleGenerate();
  } else {
    showToast('❌ 재시도할 데이터가 없습니다', 'error');
  }
}

// ===================================
// 결과 표시
// ===================================
function displayResults(data, platforms) {
  const resultArea = document.getElementById('resultArea');
  const tabButtons = document.getElementById('tabButtons');
  const tabContents = document.getElementById('tabContents');
  
  const platformNames = {
    blog: '📝 네이버 블로그',
    instagram: '📸 인스타그램',
    threads: '🧵 스레드',
    youtube: '🎬 유튜브 숏폼'
  };
  
  // 탭 버튼 생성
  tabButtons.innerHTML = platforms.map((platform, index) => `
    <button
      class="tab-button ${index === 0 ? 'active' : ''} px-6 py-3 rounded-lg font-semibold transition"
      onclick="switchTab('${platform}')"
    >
      ${platformNames[platform]}
    </button>
  `).join('');
  
  // 탭 콘텐츠 생성
  tabContents.innerHTML = platforms.map((platform, index) => `
    <div id="tab-${platform}" class="tab-content ${index === 0 ? '' : 'hidden'}">
      <div class="bg-gray-50 rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">${platformNames[platform]}</h3>
          <button
            onclick="copyToClipboard('${platform}')"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold flex items-center gap-2"
          >
            <i class="fas fa-copy"></i>
            📋 복사하기
          </button>
        </div>
        <div class="result-content bg-white p-6 rounded-lg whitespace-pre-wrap border border-gray-200">
          ${formatContent(data[platform])}
        </div>
      </div>
    </div>
  `).join('');
  
  resultArea.classList.remove('hidden');
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatContent(content) {
  if (!content) return '<p class="text-gray-500">콘텐츠가 생성되지 않았습니다.</p>';
  
  // HTML 이스케이프 및 포맷팅
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/#(\S+)/g, '<span style="color: #3b82f6; font-weight: 600;">#$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function switchTab(platform) {
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 모든 탭 콘텐츠 숨기기
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  // 선택된 탭 활성화
  event.target.classList.add('active');
  document.getElementById(`tab-${platform}`).classList.remove('hidden');
}

function copyToClipboard(platform) {
  const content = resultData[platform];
  if (!content) {
    showToast('❌ 복사할 내용이 없습니다', 'error');
    return;
  }
  
  navigator.clipboard.writeText(content).then(() => {
    showToast('✅ 복사됨!', 'success');
  }).catch(err => {
    console.error('복사 실패:', err);
    showToast('❌ 복사에 실패했습니다', 'error');
  });
}

// ===================================
// 토스트 메시지
// ===================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = colors[type] || colors.success;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, 3000);
}

// ===================================
// 템플릿 관리
// ===================================
function loadTemplates() {
  const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
  if (stored) {
    try {
      customTemplates = JSON.parse(stored);
    } catch (e) {
      console.error('템플릿 로드 실패:', e);
      customTemplates = [];
    }
  }
}

function saveTemplates() {
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(customTemplates));
}

function openTemplateModal() {
  const modal = document.getElementById('templateModal');
  const templateList = document.getElementById('templateList');
  
  // 템플릿 편집 UI 생성
  const platforms = ['blog', 'instagram', 'threads', 'youtube'];
  const platformNames = {
    blog: '📝 네이버 블로그',
    instagram: '📸 인스타그램',
    threads: '🧵 스레드',
    youtube: '🎬 유튜브 숏폼'
  };
  
  templateList.innerHTML = `
    <div class="space-y-6">
      <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <p class="font-semibold text-blue-800 mb-2">💡 사용 가능한 변수:</p>
        <div class="text-sm text-blue-700 space-y-1">
          <p>• <code>{브랜드명}</code> - 브랜드/서비스/상품명</p>
          <p>• <code>{키워드}</code> - 핵심 키워드</p>
          <p>• <code>{톤앤매너}</code> - 콘텐츠 톤앤매너</p>
          <p>• <code>{타겟연령대}</code> - 타겟 연령대</p>
          <p>• <code>{타겟성별}</code> - 타겟 성별</p>
          <p>• <code>{산업분야}</code> - 산업 분야</p>
        </div>
      </div>
      
      ${platforms.map(platform => {
        const custom = customTemplates.find(t => t.platform === platform);
        const template = custom ? custom.template : DEFAULT_TEMPLATES[platform];
        
        return `
          <div class="border border-gray-200 rounded-lg p-6 bg-white">
            <div class="flex justify-between items-center mb-4">
              <h4 class="text-lg font-bold text-gray-800">${platformNames[platform]}</h4>
              <div class="space-x-2">
                <button
                  onclick="resetTemplate('${platform}')"
                  class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm"
                >
                  🔄 기본값
                </button>
                <button
                  onclick="saveTemplate('${platform}')"
                  class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                >
                  💾 저장
                </button>
              </div>
            </div>
            <textarea
              id="template-${platform}"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              rows="10"
              placeholder="프롬프트 템플릿을 입력하세요..."
            >${template}</textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function saveTemplate(platform) {
  const textarea = document.getElementById(`template-${platform}`);
  const template = textarea.value.trim();
  
  if (!template) {
    showToast('❌ 템플릿 내용을 입력해주세요', 'error');
    return;
  }
  
  // 기존 템플릿 제거
  customTemplates = customTemplates.filter(t => t.platform !== platform);
  
  // 새 템플릿 추가
  customTemplates.push({ platform, template });
  
  saveTemplates();
  showToast(`✅ ${platform} 템플릿이 저장되었습니다`, 'success');
}

function resetTemplate(platform) {
  const textarea = document.getElementById(`template-${platform}`);
  textarea.value = DEFAULT_TEMPLATES[platform];
  
  // 커스텀 템플릿에서 제거
  customTemplates = customTemplates.filter(t => t.platform !== platform);
  saveTemplates();
  
  showToast(`✅ ${platform} 템플릿이 초기화되었습니다`, 'success');
}

// ===================================
// 프로필 관리
// ===================================
function loadProfiles() {
  const stored = localStorage.getItem(STORAGE_KEYS.PROFILES);
  if (stored) {
    try {
      savedProfiles = JSON.parse(stored);
    } catch (e) {
      console.error('프로필 로드 실패:', e);
      savedProfiles = [];
    }
  }
}

function saveProfile() {
  const brand = document.getElementById('brand').value.trim();
  
  if (!brand) {
    showToast('❌ 브랜드명을 입력해주세요', 'error');
    return;
  }
  
  const profileName = prompt('프로필 이름을 입력하세요:', brand);
  if (!profileName) return;
  
  const profile = {
    id: Date.now(),
    name: profileName,
    brand: document.getElementById('brand').value.trim(),
    companyName: document.getElementById('companyName')?.value.trim() || '',
    businessType: document.getElementById('businessType')?.value.trim() || '',
    location: document.getElementById('location')?.value.trim() || '',
    targetGender: document.getElementById('targetGender')?.value || '',
    contact: document.getElementById('contact')?.value.trim() || '',
    website: document.getElementById('website')?.value.trim() || '',
    sns: document.getElementById('sns')?.value.trim() || '',
    keywords: document.getElementById('keywords').value.trim(),
    tone: document.getElementById('tone')?.value || '친근한',
    targetAge: document.getElementById('targetAge')?.value || '20대',
    industry: document.getElementById('industry')?.value || '라이프스타일',
    createdAt: new Date().toISOString()
  };
  
  savedProfiles.unshift(profile);
  if (savedProfiles.length > 50) {
    savedProfiles = savedProfiles.slice(0, 50);
  }
  
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(savedProfiles));
  showToast('✅ 프로필이 저장되었습니다', 'success');
}

function openLoadProfileModal() {
  const modal = document.getElementById('profileModal');
  const profileList = document.getElementById('profileList');
  
  if (savedProfiles.length === 0) {
    profileList.innerHTML = '<p class="text-gray-500 text-center py-8">저장된 프로필이 없습니다</p>';
  } else {
    profileList.innerHTML = savedProfiles.map(profile => `
      <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="font-bold text-gray-800">${profile.name}</h4>
            <p class="text-sm text-gray-600">${profile.brand}</p>
          </div>
          <div class="space-x-2">
            <button
              onclick="loadProfile(${profile.id})"
              class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
            >
              불러오기
            </button>
            <button
              onclick="deleteProfile(${profile.id})"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
            >
              삭제
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-500">${new Date(profile.createdAt).toLocaleString()}</p>
      </div>
    `).join('');
  }
  
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function loadProfile(id) {
  const profile = savedProfiles.find(p => p.id === id);
  if (!profile) return;
  
  document.getElementById('brand').value = profile.brand || '';
  if (document.getElementById('companyName')) document.getElementById('companyName').value = profile.companyName || '';
  if (document.getElementById('businessType')) document.getElementById('businessType').value = profile.businessType || '';
  if (document.getElementById('location')) document.getElementById('location').value = profile.location || '';
  if (document.getElementById('targetGender')) document.getElementById('targetGender').value = profile.targetGender || '';
  if (document.getElementById('contact')) document.getElementById('contact').value = profile.contact || '';
  if (document.getElementById('website')) document.getElementById('website').value = profile.website || '';
  if (document.getElementById('sns')) document.getElementById('sns').value = profile.sns || '';
  document.getElementById('keywords').value = profile.keywords || '';
  if (document.getElementById('tone')) document.getElementById('tone').value = profile.tone || '친근한';
  if (document.getElementById('targetAge')) document.getElementById('targetAge').value = profile.targetAge || '20대';
  if (document.getElementById('industry')) document.getElementById('industry').value = profile.industry || '라이프스타일';
  
  closeModal('profileModal');
  showToast('✅ 프로필이 불러와졌습니다', 'success');
}

function deleteProfile(id) {
  if (!confirm('이 프로필을 삭제하시겠습니까?')) return;
  
  savedProfiles = savedProfiles.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(savedProfiles));
  
  openLoadProfileModal();
  showToast('✅ 프로필이 삭제되었습니다', 'success');
}

// ===================================
// 히스토리 관리
// ===================================
function loadHistory() {
  const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (stored) {
    try {
      contentHistory = JSON.parse(stored);
    } catch (e) {
      console.error('히스토리 로드 실패:', e);
      contentHistory = [];
    }
  }
}

function saveToHistory(formData, results) {
  const historyItem = {
    id: Date.now(),
    brand: formData.brand,
    platforms: formData.platforms,
    results: results,
    createdAt: new Date().toISOString()
  };
  
  contentHistory.unshift(historyItem);
  if (contentHistory.length > 50) {
    contentHistory = contentHistory.slice(0, 50);
  }
  
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(contentHistory));
}

function openHistoryModal() {
  const modal = document.getElementById('historyModal');
  const historyList = document.getElementById('historyList');
  
  if (contentHistory.length === 0) {
    historyList.innerHTML = '<p class="text-gray-500 text-center py-8">생성 히스토리가 없습니다</p>';
  } else {
    historyList.innerHTML = contentHistory.map(item => `
      <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="font-bold text-gray-800">${item.brand}</h4>
            <p class="text-sm text-gray-600">${item.platforms.join(', ')}</p>
          </div>
          <div class="space-x-2">
            <button
              onclick="viewHistory(${item.id})"
              class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
            >
              보기
            </button>
            <button
              onclick="deleteHistory(${item.id})"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
            >
              삭제
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-500">${new Date(item.createdAt).toLocaleString()}</p>
      </div>
    `).join('');
  }
  
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function viewHistory(id) {
  const item = contentHistory.find(h => h.id === id);
  if (!item) return;
  
  resultData = item.results;
  displayResults(item.results, item.platforms);
  
  closeModal('historyModal');
  showToast('✅ 히스토리를 불러왔습니다', 'success');
}

function deleteHistory(id) {
  if (!confirm('이 히스토리를 삭제하시겠습니까?')) return;
  
  contentHistory = contentHistory.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(contentHistory));
  
  openHistoryModal();
  showToast('✅ 히스토리가 삭제되었습니다', 'success');
}

// ===================================
// 모달 관리
// ===================================
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

// ===================================
// 전역 함수 노출
// ===================================
window.removeImage = removeImage;
window.openImageEditor = openImageEditor;
window.applyImageFilter = applyImageFilter;
window.compressImage = compressImage;
window.saveEditedImage = saveEditedImage;
window.closeImageEditor = closeImageEditor;
window.switchTab = switchTab;
window.copyToClipboard = copyToClipboard;
window.closeModal = closeModal;
window.saveTemplate = saveTemplate;
window.resetTemplate = resetTemplate;
window.loadProfile = loadProfile;
window.deleteProfile = deleteProfile;
window.viewHistory = viewHistory;
window.deleteHistory = deleteHistory;
window.closeErrorModal = closeErrorModal;
window.retryGeneration = retryGeneration;
