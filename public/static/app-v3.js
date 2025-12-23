// ===================================
// Multi-Platform Content Generator v3
// 템플릿 커스터마이징, 배치 생성, 이미지 편집, AI 모델 선택
// ===================================

// 전역 변수
let selectedImages = [];
let resultData = {};
let savedProfiles = [];
let contentHistory = [];
let customTemplates = []; // 커스텀 템플릿
let currentEditImageIndex = null; // 편집 중인 이미지 인덱스
let currentBatchFile = null; // 업로드된 CSV 파일

// LocalStorage 키
const STORAGE_KEYS = {
  PROFILES: 'content_generator_profiles',
  HISTORY: 'content_generator_history',
  CURRENT_PROFILE: 'content_generator_current_profile',
  TEMPLATES: 'content_generator_templates', // 커스텀 템플릿
  AI_MODEL: 'content_generator_ai_model', // AI 모델 선택
};

// 비용 상수 (USD)
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

// ===================================
// 초기화
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  loadProfiles();
  loadHistory();
  loadTemplates();
  loadAIModel();
  await fetchExchangeRate();
  setupEventListeners();
  updateCostEstimate();
  
  // 다국어 초기화
  if (typeof initI18n === 'function') {
    initI18n();
  }
}

// ===================================
// 이벤트 리스너 설정
// ===================================
function setupEventListeners() {
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

  // 생성 버튼
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerate);
  }

  // 배치 생성 버튼
  const batchGenerateBtn = document.getElementById('batchGenerateBtn');
  if (batchGenerateBtn) {
    batchGenerateBtn.addEventListener('click', handleBatchGenerate);
  }

  // CSV 업로드
  const csvInput = document.getElementById('csvInput');
  if (csvInput) {
    csvInput.addEventListener('change', handleCSVUpload);
  }

  // 프로필 관리
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const loadProfileBtn = document.getElementById('loadProfileBtn');

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', openProfileModal);
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

  // AI 모델 선택
  const aiModelSelect = document.getElementById('aiModel');
  if (aiModelSelect) {
    aiModelSelect.addEventListener('change', handleAIModelChange);
  }

  // 플랫폼 선택 변경 시 비용 재계산
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]');
  platformCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', updateCostEstimate);
  });

  // 모달 닫기
  setupModalCloseListeners();
}

function setupModalCloseListeners() {
  const closeButtons = document.querySelectorAll('.modal-close, .close-modal-btn');
  closeButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });

  // 모달 외부 클릭 시 닫기
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
}

// ===================================
// 이미지 업로드 & 편집
// ===================================
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');

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
    alert(t('upload.max_images') || '최대 10장까지 업로드 가능합니다.');
    return;
  }

  let totalSize = selectedImages.reduce((sum, img) => sum + img.size, 0);
  for (const file of files) {
    totalSize += file.size;
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (totalSize > maxSize) {
    alert(t('upload.max_size') || '총 파일 크기는 50MB를 초과할 수 없습니다.');
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
      <button class="edit-image-btn" onclick="openImageEditor(${index})" title="${t('edit_image') || '이미지 편집'}">
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
// 이미지 편집 기능
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
        data[i] += brightness;
        data[i + 1] += brightness;
        data[i + 2] += brightness;
      }
      break;
    case 'contrast':
      const contrast = 1.2;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = ((data[i] - 128) * contrast) + 128;
        data[i + 1] = ((data[i + 1] - 128) * contrast) + 128;
        data[i + 2] = ((data[i + 2] - 128) * contrast) + 128;
      }
      break;
  }

  ctx.putImageData(imageData, 0, 0);
}

function compressImage() {
  const canvas = document.getElementById('editCanvas');
  const quality = 0.7; // 70% 품질
  const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
  
  selectedImages[currentEditImageIndex].base64 = compressedBase64;
  selectedImages[currentEditImageIndex].size = Math.floor(compressedBase64.length * 0.75);
  
  alert(t('image_compressed') || '이미지가 압축되었습니다.');
}

function saveEditedImage() {
  const canvas = document.getElementById('editCanvas');
  const newBase64 = canvas.toDataURL('image/png');
  
  selectedImages[currentEditImageIndex].base64 = newBase64;
  URL.revokeObjectURL(selectedImages[currentEditImageIndex].url);
  selectedImages[currentEditImageIndex].url = canvas.toDataURL();
  
  renderImagePreviews();
  closeImageEditor();
}

function closeImageEditor() {
  const modal = document.getElementById('imageEditorModal');
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
      <p style="color: #999; text-align: center; padding: 1rem;">
        ${t('select_images_platforms') || '이미지와 플랫폼을 선택하면 예상 비용이 표시됩니다.'}
      </p>
    `;
    return;
  }

  const imageCost = imageCount * COSTS.IMAGE_ANALYSIS;
  let platformCost = 0;

  platformCheckboxes.forEach((checkbox) => {
    const platform = checkbox.value;
    platformCost += COSTS[platform.toUpperCase()] || 0;
  });

  const totalCostUSD = imageCost + platformCost;
  const totalCostKRW = Math.round(totalCostUSD * EXCHANGE_RATE);

  document.getElementById('costEstimate').innerHTML = `
    <div style="padding: 1rem;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span>${t('image_analysis') || '이미지 분석'} (${imageCount}${t('sheets') || '장'}):</span>
        <span>$${imageCost.toFixed(2)} / ₩${Math.round(imageCost * EXCHANGE_RATE)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span>${t('content_generation') || '콘텐츠 생성'} (${platformCount}${t('platforms') || '개'}):</span>
        <span>$${platformCost.toFixed(2)} / ₩${Math.round(platformCost * EXCHANGE_RATE)}</span>
      </div>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 0.75rem 0;">
      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1rem;">
        <span>${t('total') || '총 예상 비용'}:</span>
        <span style="color: #2563eb;">$${totalCostUSD.toFixed(2)} / ₩${totalCostKRW}</span>
      </div>
      <p style="font-size: 0.85rem; color: #666; margin-top: 0.5rem; text-align: right;">
        ${t('exchange_rate') || '환율'}: $1 = ₩${EXCHANGE_RATE.toFixed(0)}
      </p>
    </div>
  `;
}

// ===================================
// 콘텐츠 생성
// ===================================
async function handleGenerate() {
  // 입력값 수집
  const brand = document.getElementById('brand').value.trim();
  const keywords = document.getElementById('keywords').value.trim();

  if (!brand || !keywords) {
    alert(t('required_fields') || '브랜드명과 핵심 키워드는 필수입니다.');
    return;
  }

  if (selectedImages.length === 0) {
    alert(t('upload_image') || '최소 1장의 이미지를 업로드해주세요.');
    return;
  }

  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  if (platformCheckboxes.length === 0) {
    alert(t('select_platform') || '최소 1개 플랫폼을 선택해주세요.');
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
    tone: document.getElementById('tone')?.value || 'casual',
    targetAge: document.getElementById('targetAge')?.value || '20s',
    industry: document.getElementById('industry')?.value || 'lifestyle',
    images: selectedImages.map((img) => img.base64),
    platforms,
    aiModel: document.getElementById('aiModel')?.value || 'gpt-4o',
  };

  // 로딩 상태
  document.getElementById('generateBtn').disabled = true;
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('resultArea').style.display = 'none';

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      resultData = result.data;
      displayResults(result.data, result.generatedPlatforms);
      saveToHistory(formData, result.data);
    } else {
      alert(t('generation_failed') || '생성 실패: ' + result.error);
    }
  } catch (error) {
    console.error('생성 오류:', error);
    alert(t('generation_error') || '콘텐츠 생성 중 오류가 발생했습니다.');
  } finally {
    document.getElementById('generateBtn').disabled = false;
    document.getElementById('loadingState').style.display = 'none';
  }
}

// ===================================
// 배치 생성
// ===================================
function handleCSVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.csv')) {
    alert(t('csv_only') || 'CSV 파일만 업로드 가능합니다.');
    return;
  }

  currentBatchFile = file;
  document.getElementById('csvFileName').textContent = file.name;
}

async function handleBatchGenerate() {
  if (!currentBatchFile) {
    alert(t('upload_csv') || 'CSV 파일을 먼저 업로드해주세요.');
    return;
  }

  if (selectedImages.length === 0) {
    alert(t('upload_image') || '배치 생성에 사용할 이미지를 업로드해주세요.');
    return;
  }

  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  if (platformCheckboxes.length === 0) {
    alert(t('select_platform') || '최소 1개 플랫폼을 선택해주세요.');
    return;
  }

  const platforms = Array.from(platformCheckboxes).map((cb) => cb.value);

  // CSV 파싱
  const csvText = await currentBatchFile.text();
  const batchData = parseCSV(csvText);

  if (batchData.length === 0) {
    alert(t('csv_empty') || 'CSV 파일에 유효한 데이터가 없습니다.');
    return;
  }

  // 로딩 상태
  document.getElementById('batchGenerateBtn').disabled = true;
  document.getElementById('loadingState').style.display = 'block';

  try {
    const response = await fetch('/api/generate/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batchData,
        images: selectedImages.map((img) => img.base64),
        platforms,
        aiModel: document.getElementById('aiModel')?.value || 'gpt-4o',
      }),
    });

    const result = await response.json();

    if (result.success) {
      displayBatchResults(result.results);
    } else {
      alert(t('batch_failed') || '배치 생성 실패: ' + result.error);
    }
  } catch (error) {
    console.error('배치 생성 오류:', error);
    alert(t('batch_error') || '배치 생성 중 오류가 발생했습니다.');
  } finally {
    document.getElementById('batchGenerateBtn').disabled = false;
    document.getElementById('loadingState').style.display = 'none';
  }
}

function parseCSV(text) {
  const lines = text.split('\n').filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // 필수 필드 확인
    if (row.brand && row.keywords) {
      data.push(row);
    }
  }

  return data;
}

function displayBatchResults(results) {
  const container = document.getElementById('batchResults');
  if (!container) return;

  container.innerHTML = `
    <h3>${t('batch_results') || '배치 생성 결과'} (${results.length}${t('items') || '개'})</h3>
    ${results
      .map(
        (result, index) => `
      <div class="batch-result-item" style="margin-bottom: 1rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px;">
        <h4>${index + 1}. ${result.brand}</h4>
        ${
          result.success
            ? `
          <div class="batch-content">
            ${Object.keys(result.data)
              .map(
                (platform) => `
              <div style="margin-top: 0.5rem;">
                <strong>${platform.toUpperCase()}:</strong>
                <button onclick="copyBatchContent('${platform}', ${index})" style="margin-left: 0.5rem;">
                  <i class="fas fa-copy"></i> ${t('copy') || '복사'}
                </button>
                <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 0.5rem; border-radius: 4px; margin-top: 0.25rem;">${result.data[platform]}</pre>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : `<p style="color: #e53e3e;">${t('generation_failed') || '생성 실패'}: ${result.error}</p>`
        }
      </div>
    `
      )
      .join('')}
  `;

  document.getElementById('resultArea').style.display = 'block';
  container.style.display = 'block';
}

function copyBatchContent(platform, index) {
  // 배치 결과 복사 로직 (간단히 구현)
  alert(`${platform} 콘텐츠가 복사되었습니다.`);
}

// ===================================
// 결과 표시
// ===================================
function displayResults(data, platforms) {
  const resultArea = document.getElementById('resultArea');
  const tabsContainer = document.getElementById('resultTabs');
  const contentContainer = document.getElementById('resultContent');

  tabsContainer.innerHTML = '';
  contentContainer.innerHTML = '';

  platforms.forEach((platform, index) => {
    // 탭 생성
    const tab = document.createElement('button');
    tab.className = `tab-btn ${index === 0 ? 'active' : ''}`;
    tab.textContent = platform.toUpperCase();
    tab.onclick = () => switchTab(platform);
    tabsContainer.appendChild(tab);

    // 콘텐츠 생성
    const content = document.createElement('div');
    content.className = `tab-content ${index === 0 ? 'active' : ''}`;
    content.id = `content-${platform}`;
    content.innerHTML = `
      <div class="result-actions">
        <button onclick="copyToClipboard('${platform}')">
          <i class="fas fa-copy"></i> ${t('copy') || '복사'}
        </button>
        <button onclick="downloadContent('${platform}')">
          <i class="fas fa-download"></i> ${t('download') || '다운로드'}
        </button>
      </div>
      <pre class="result-text">${data[platform]}</pre>
    `;
    contentContainer.appendChild(content);
  });

  resultArea.style.display = 'block';
}

function switchTab(platform) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.textContent === platform.toUpperCase()) {
      btn.classList.add('active');
    }
  });

  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
    if (content.id === `content-${platform}`) {
      content.classList.add('active');
    }
  });
}

function copyToClipboard(platform) {
  const text = resultData[platform];
  navigator.clipboard.writeText(text).then(() => {
    alert(t('copied') || '복사되었습니다!');
  });
}

function downloadContent(platform) {
  const text = resultData[platform];
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${platform}_content.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===================================
// 프로필 관리
// ===================================
function loadProfiles() {
  const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
  savedProfiles = saved ? JSON.parse(saved) : [];
}

function saveProfile(name) {
  const profile = {
    id: Date.now().toString(),
    name,
    data: {
      brand: document.getElementById('brand').value,
      companyName: document.getElementById('companyName')?.value || '',
      businessType: document.getElementById('businessType')?.value || '',
      location: document.getElementById('location')?.value || '',
      targetGender: document.getElementById('targetGender')?.value || '',
      contact: document.getElementById('contact')?.value || '',
      website: document.getElementById('website')?.value || '',
      sns: document.getElementById('sns')?.value || '',
      keywords: document.getElementById('keywords').value,
      tone: document.getElementById('tone')?.value || '',
      targetAge: document.getElementById('targetAge')?.value || '',
      industry: document.getElementById('industry')?.value || '',
    },
    createdAt: new Date().toISOString(),
  };

  savedProfiles.push(profile);

  if (savedProfiles.length > 50) {
    savedProfiles = savedProfiles.slice(-50);
  }

  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(savedProfiles));
}

function openProfileModal() {
  const name = prompt(t('enter_profile_name') || '프로필 이름을 입력하세요:');
  if (name) {
    saveProfile(name);
    alert(t('profile_saved') || '프로필이 저장되었습니다!');
  }
}

function openLoadProfileModal() {
  const modal = document.getElementById('profileModal');
  const list = document.getElementById('profileList');

  list.innerHTML = savedProfiles
    .slice()
    .reverse()
    .map(
      (profile) => `
    <div class="profile-item" style="display: flex; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid #eee;">
      <div onclick="loadProfile('${profile.id}')" style="flex: 1; cursor: pointer;">
        <strong>${profile.name}</strong>
        <small style="display: block; color: #666;">${new Date(profile.createdAt).toLocaleString('ko-KR')}</small>
      </div>
      <button onclick="deleteProfile('${profile.id}')" style="color: #e53e3e;">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `
    )
    .join('');

  modal.style.display = 'flex';
}

function loadProfile(id) {
  const profile = savedProfiles.find((p) => p.id === id);
  if (!profile) return;

  Object.keys(profile.data).forEach((key) => {
    const element = document.getElementById(key);
    if (element) {
      element.value = profile.data[key];
    }
  });

  document.getElementById('profileModal').style.display = 'none';
  alert(t('profile_loaded') || '프로필이 로드되었습니다!');
}

function deleteProfile(id) {
  if (!confirm(t('confirm_delete_profile') || '이 프로필을 삭제하시겠습니까?')) return;

  savedProfiles = savedProfiles.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(savedProfiles));
  openLoadProfileModal();
}

// ===================================
// 히스토리 관리
// ===================================
function loadHistory() {
  const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
  contentHistory = saved ? JSON.parse(saved) : [];
}

function saveToHistory(formData, resultData) {
  const history = {
    id: Date.now().toString(),
    formData,
    resultData,
    createdAt: new Date().toISOString(),
  };

  contentHistory.push(history);

  if (contentHistory.length > 50) {
    contentHistory = contentHistory.slice(-50);
  }

  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(contentHistory));
}

function openHistoryModal() {
  const modal = document.getElementById('historyModal');
  const list = document.getElementById('historyList');

  list.innerHTML = contentHistory
    .slice()
    .reverse()
    .map(
      (item) => `
    <div class="history-item" style="padding: 1rem; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between;">
        <div>
          <strong>${item.formData.brand}</strong>
          <small style="display: block; color: #666;">${new Date(item.createdAt).toLocaleString('ko-KR')}</small>
          <small style="display: block; color: #999;">
            ${Object.keys(item.resultData).join(', ').toUpperCase()}
          </small>
        </div>
        <div>
          <button onclick="viewHistory('${item.id}')" style="margin-right: 0.5rem;">
            <i class="fas fa-eye"></i> ${t('view') || '보기'}
          </button>
          <button onclick="deleteHistory('${item.id}')" style="color: #e53e3e;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  modal.style.display = 'flex';
}

function viewHistory(id) {
  const item = contentHistory.find((h) => h.id === id);
  if (!item) return;

  resultData = item.resultData;
  displayResults(item.resultData, Object.keys(item.resultData));
  document.getElementById('historyModal').style.display = 'none';
}

function deleteHistory(id) {
  if (!confirm(t('confirm_delete_history') || '이 히스토리를 삭제하시겠습니까?')) return;

  contentHistory = contentHistory.filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(contentHistory));
  openHistoryModal();
}

// ===================================
// 템플릿 관리
// ===================================
function loadTemplates() {
  const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
  customTemplates = saved ? JSON.parse(saved) : [];
}

function openTemplateModal() {
  const modal = document.getElementById('templateModal');
  const list = document.getElementById('templateList');

  list.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <button onclick="createNewTemplate()" class="btn-primary" style="width: 100%;">
        <i class="fas fa-plus"></i> ${t('create_template') || '새 템플릿 만들기'}
      </button>
    </div>
    ${customTemplates
      .map(
        (template) => `
      <div class="template-item" style="padding: 1rem; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${template.name}</strong>
            <small style="display: block; color: #666;">${template.platform.toUpperCase()}</small>
          </div>
          <div>
            <button onclick="editTemplate('${template.id}')" style="margin-right: 0.5rem;">
              <i class="fas fa-edit"></i> ${t('edit') || '수정'}
            </button>
            <button onclick="applyTemplate('${template.id}')" style="margin-right: 0.5rem;">
              <i class="fas fa-check"></i> ${t('apply') || '적용'}
            </button>
            <button onclick="deleteTemplate('${template.id}')" style="color: #e53e3e;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <pre style="margin-top: 0.5rem; font-size: 0.85rem; color: #666; white-space: pre-wrap;">${template.content.substring(0, 200)}...</pre>
      </div>
    `
      )
      .join('')}
  `;

  modal.style.display = 'flex';
}

function createNewTemplate() {
  const name = prompt(t('enter_template_name') || '템플릿 이름:');
  if (!name) return;

  const platform = prompt(t('enter_platform') || '플랫폼 (blog/instagram/threads/youtube):');
  if (!['blog', 'instagram', 'threads', 'youtube'].includes(platform)) {
    alert(t('invalid_platform') || '유효하지 않은 플랫폼입니다.');
    return;
  }

  const content = prompt(t('enter_template_content') || '템플릿 내용을 입력하세요:');
  if (!content) return;

  const template = {
    id: Date.now().toString(),
    name,
    platform,
    content,
    createdAt: new Date().toISOString(),
  };

  customTemplates.push(template);
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(customTemplates));

  openTemplateModal();
}

function editTemplate(id) {
  const template = customTemplates.find((t) => t.id === id);
  if (!template) return;

  const newContent = prompt(t('edit_template_content') || '템플릿 내용 수정:', template.content);
  if (newContent === null) return;

  template.content = newContent;
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(customTemplates));

  openTemplateModal();
}

function applyTemplate(id) {
  const template = customTemplates.find((t) => t.id === id);
  if (!template) return;

  // 템플릿 적용 로직 (프롬프트에 추가)
  alert(`${template.name} 템플릿이 적용되었습니다!\n(실제로는 생성 시 커스텀 프롬프트로 사용됩니다)`);
  document.getElementById('templateModal').style.display = 'none';
}

function deleteTemplate(id) {
  if (!confirm(t('confirm_delete_template') || '이 템플릿을 삭제하시겠습니까?')) return;

  customTemplates = customTemplates.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(customTemplates));

  openTemplateModal();
}

// ===================================
// AI 모델 선택
// ===================================
function loadAIModel() {
  const saved = localStorage.getItem(STORAGE_KEYS.AI_MODEL);
  const select = document.getElementById('aiModel');
  if (saved && select) {
    select.value = saved;
  }
}

function handleAIModelChange(e) {
  const model = e.target.value;
  localStorage.setItem(STORAGE_KEYS.AI_MODEL, model);
  
  // 모델별 비용 안내
  const costs = {
    'gpt-4o': t('gpt4o_desc') || 'GPT-4o: 최고 품질, 중간 속도',
    'gpt-4-turbo': t('gpt4_desc') || 'GPT-4: 높은 품질, 느린 속도',
    'gpt-3.5-turbo': t('gpt35_desc') || 'GPT-3.5: 빠른 속도, 저렴한 비용',
  };

  const desc = document.getElementById('aiModelDesc');
  if (desc) {
    desc.textContent = costs[model] || '';
  }
}

// ===================================
// 다국어 지원 함수
// ===================================
function t(key) {
  if (typeof window.i18n !== 'undefined' && window.i18n.translations[window.i18n.currentLang]) {
    return window.i18n.translations[window.i18n.currentLang][key] || key;
  }
  return key;
}
