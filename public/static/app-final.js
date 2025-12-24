// ===================================
// 콘텐츠잇다 AI Studio - Final Version
// ===================================

// 전역 변수
let selectedImages = [];
let resultData = {};
let savedProfiles = [];
let contentHistory = [];
let customTemplates = [];
let lastFormData = null; // 재시도용

// LocalStorage 키
const STORAGE_KEYS = {
  API_KEY: 'content_generator_api_key',
  PROFILES: 'content_generator_profiles',
  HISTORY: 'content_generator_history',
  TEMPLATES: 'content_generator_templates',
};

// 비용 상수 (USD)
const COSTS = {
  IMAGE_ANALYSIS: 0.01,
  BLOG: 0.04,
  INSTAGRAM: 0.03,
  THREADS: 0.02,
  YOUTUBE: 0.04,
};

// 환율
const EXCHANGE_RATE = 1300;

// ===================================
// 초기화
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  checkApiKey();
  loadProfiles();
  loadHistory();
  loadTemplates();
  setupEventListeners();
  updateCostEstimate();
  
  if (typeof initI18n === 'function') {
    initI18n();
  }
}

// ===================================
// API 키 관리
// ===================================
function checkApiKey() {
  const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
  const apiKeySection = document.getElementById('apiKeySection');
  
  if (!apiKey) {
    apiKeySection.style.display = 'block';
  } else {
    apiKeySection.style.display = 'none';
  }
}

function saveApiKey() {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showToast('❌ API 키를 입력해주세요', 'error');
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    showToast('❌ 올바른 OpenAI API 키 형식이 아닙니다', 'error');
    return;
  }
  
  localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
  document.getElementById('apiKeySection').style.display = 'none';
  showToast('✅ API 키가 저장되었습니다!');
  apiKeyInput.value = '';
}

// ===================================
// 이벤트 리스너
// ===================================
function setupEventListeners() {
  // API 키 저장
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', saveApiKey);
  }

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
    generateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleGenerate();
    });
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

  // 템플릿
  const templateBtn = document.getElementById('templateBtn');
  if (templateBtn) {
    templateBtn.addEventListener('click', openTemplateManageModal);
  }

  // 플랫폼 선택 변경 시 비용 재계산
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]');
  platformCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', updateCostEstimate);
  });

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

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
}

// ===================================
// 이미지 업로드
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
    showToast('❌ 최대 10장까지 업로드 가능합니다', 'error');
    return;
  }

  let totalSize = selectedImages.reduce((sum, img) => sum + img.size, 0);
  for (const file of files) {
    totalSize += file.size;
  }

  const maxSize = 50 * 1024 * 1024;
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
// 비용 계산 (버튼 위에 표시)
// ===================================
function updateCostEstimate() {
  const imageCount = selectedImages.length;
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  const platformCount = platformCheckboxes.length;

  if (imageCount === 0 || platformCount === 0) {
    document.getElementById('costEstimate').innerHTML = `
      <div style="padding: 1.5rem; text-align: center; background: #f3f4f6; border-radius: 12px;">
        <p style="color: #6b7280; margin-bottom: 0.5rem;">
          📊 이미지와 플랫폼을 선택하면 예상 비용이 표시됩니다
        </p>
      </div>
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

  // 예상 소요 시간
  const imageAnalysisTime = Math.min(imageCount * 3, 5);
  const contentGenerationTime = Math.min(platformCount * 10, 15);
  const totalTimeSeconds = imageAnalysisTime + contentGenerationTime;
  const totalTimeMinutes = Math.ceil(totalTimeSeconds / 60);

  document.getElementById('costEstimate').innerHTML = `
    <div style="padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
      <h3 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 1rem; text-align: center;">
        💰 예상 비용 및 소요 시간
      </h3>
      
      <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.95rem;">
          <span>📸 이미지 분석 (${imageCount}장)</span>
          <span style="font-weight: 600;">$${imageCost.toFixed(2)} / ₩${Math.round(imageCost * EXCHANGE_RATE)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.95rem;">
          <span>✨ 콘텐츠 생성 (${platformCount}개)</span>
          <span style="font-weight: 600;">$${platformCost.toFixed(2)} / ₩${Math.round(platformCost * EXCHANGE_RATE)}</span>
        </div>
      </div>
      
      <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold;">
          <span>💵 총 비용 (USD)</span>
          <span>$${totalCostUSD.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: bold; margin-top: 0.5rem;">
          <span>💴 총 비용 (KRW)</span>
          <span>₩${totalCostKRW.toLocaleString()}</span>
        </div>
      </div>
      
      <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 1rem;">⏱️ 예상 소요 시간</span>
          <span style="font-size: 1.2rem; font-weight: bold;">${totalTimeSeconds}초 (약 ${totalTimeMinutes}분)</span>
        </div>
      </div>
      
      <p style="font-size: 0.8rem; opacity: 0.9; margin-top: 1rem; text-align: center;">
        환율: $1 = ₩${EXCHANGE_RATE} | 모델: GPT-4o
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
    showToast('❌ API 키를 먼저 설정해주세요', 'error');
    document.getElementById('apiKeySection').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // 입력값 검증
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

  lastFormData = {
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
  };

  // 로딩 시작
  showLoadingOverlay();
  
  try {
    // Progress 시뮬레이션
    updateProgress(10, '이미지 분석 준비 중...');
    
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(lastFormData),
    });

    updateProgress(50, '이미지 분석 완료. 콘텐츠 생성 중...');

    const result = await response.json();

    updateProgress(90, '최종 검토 중...');

    if (result.success) {
      updateProgress(100, '완료!');
      
      setTimeout(() => {
        hideLoadingOverlay();
        resultData = result.data;
        displayResults(result.data, result.generatedPlatforms);
        saveToHistory(lastFormData, result.data);
        showToast('✅ 콘텐츠 생성이 완료되었습니다!');
        
        // 결과로 스크롤
        document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } else {
      throw new Error(result.error || '알 수 없는 오류');
    }
  } catch (error) {
    console.error('생성 오류:', error);
    hideLoadingOverlay();
    showErrorModal(error.message || '콘텐츠 생성 중 오류가 발생했습니다');
  }
}

// ===================================
// 로딩 & 에러 UI
// ===================================
function showLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  updateProgress(0, '준비 중...');
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
}

function updateProgress(percent, message) {
  document.getElementById('progressPercent').textContent = percent + '%';
  document.getElementById('progressBar').style.width = percent + '%';
  document.getElementById('loadingMessage').textContent = message;
}

function showErrorModal(errorMessage) {
  const modal = document.getElementById('errorModal');
  document.getElementById('errorMessage').textContent = errorMessage;
  
  // 에러 해결 방법
  const solutions = [
    '• OpenAI API 키가 올바른지 확인하세요',
    '• API 사용 한도를 확인하세요 (platform.openai.com)',
    '• 이미지 파일 크기를 확인하세요 (최대 50MB)',
    '• 잠시 후 다시 시도해주세요',
  ];
  
  document.getElementById('errorSolutions').innerHTML = solutions
    .map(s => `<li>${s}</li>`)
    .join('');
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeErrorModal() {
  const modal = document.getElementById('errorModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function retryGeneration() {
  closeErrorModal();
  if (lastFormData) {
    handleGenerate();
  }
}

// ===================================
// 토스트 메시지
// ===================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
  if (type === 'error') {
    toast.style.background = '#ef4444';
  }
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, 3000);
}

// ===================================
// 결과 표시 & 복사
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
    
    const charCount = data[platform]?.length || 0;
    
    content.innerHTML = `
      <div class="result-actions" style="display: flex; gap: 10px; margin-bottom: 1rem;">
        <button onclick="copyToClipboardNew('${platform}')" class="copy-btn" style="flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
          📋 복사하기
        </button>
        <button onclick="downloadContent('${platform}')" style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
          <i class="fas fa-download"></i> 다운로드
        </button>
      </div>
      <div style="background: #f3f4f6; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
        <span style="font-size: 0.9rem; color: #6b7280;">글자 수: <strong>${charCount.toLocaleString()}</strong>자</span>
      </div>
      <pre class="result-text" style="white-space: pre-wrap; background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e5e7eb; line-height: 1.6;">${data[platform]}</pre>
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

function copyToClipboardNew(platform) {
  const text = resultData[platform];
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ 복사되었습니다!');
    
    // 버튼 애니메이션
    const btn = event.target.closest('.copy-btn');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ 복사됨!';
      btn.style.background = '#059669';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '#10b981';
      }, 2000);
    }
  }).catch(() => {
    showToast('❌ 복사에 실패했습니다', 'error');
  });
}

function downloadContent(platform) {
  const text = resultData[platform];
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${platform}_content.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ 다운로드가 시작되었습니다!');
}

// ===================================
// 템플릿 관리
// ===================================
function loadTemplates() {
  const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
  customTemplates = saved ? JSON.parse(saved) : getDefaultTemplates();
}

function getDefaultTemplates() {
  return [
    {
      id: 'default-blog',
      name: '기본 블로그 템플릿',
      platform: 'blog',
      content: '당신은 SEO 전문가이자 네이버 블로그 최적화 전문 작가입니다.\n\n브랜드: {브랜드명}\n키워드: {키워드}\n톤앤매너: {톤앤매너}\n\n위 정보를 바탕으로 SEO 최적화된 블로그 포스팅을 작성해주세요.',
      isDefault: true,
    },
  ];
}

function openTemplateManageModal() {
  const modal = document.getElementById('templateModal');
  if (!modal) {
    createTemplateModal();
  }
  
  renderTemplateList();
  document.getElementById('templateModal').style.display = 'flex';
}

function createTemplateModal() {
  const modalHTML = `
    <div id="templateModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">📝 템플릿 관리</h2>
          <button onclick="closeTemplateModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="mb-6">
          <button onclick="showTemplateEditor()" class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
            <i class="fas fa-plus mr-2"></i>새 템플릿 만들기
          </button>
        </div>
        
        <div id="templateListContainer"></div>
        
        <!-- 템플릿 편집기 -->
        <div id="templateEditor" style="display: none;" class="mt-6 p-6 bg-gray-50 rounded-lg">
          <h3 class="text-lg font-bold mb-4">템플릿 편집</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block mb-2 font-semibold">템플릿 이름</label>
              <input type="text" id="templateName" class="w-full px-4 py-2 border rounded-lg" placeholder="예: 감성 블로그 템플릿">
            </div>
            
            <div>
              <label class="block mb-2 font-semibold">플랫폼 선택</label>
              <select id="templatePlatform" class="w-full px-4 py-2 border rounded-lg">
                <option value="blog">블로그</option>
                <option value="instagram">인스타그램</option>
                <option value="threads">스레드</option>
                <option value="youtube">유튜브</option>
              </select>
            </div>
            
            <div>
              <label class="block mb-2 font-semibold">프롬프트 내용</label>
              <div class="mb-2 text-sm text-gray-600 bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                <strong>💡 사용 가능한 변수:</strong><br>
                {브랜드명}, {키워드}, {톤앤매너}, {타겟연령}, {산업분야}, {지역}, {연락처}, {웹사이트}
              </div>
              <textarea id="templateContent" rows="10" class="w-full px-4 py-2 border rounded-lg font-mono text-sm" placeholder="프롬프트를 입력하세요..."></textarea>
            </div>
            
            <div class="flex gap-3">
              <button onclick="resetTemplate()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                기본값으로 초기화
              </button>
              <button onclick="saveTemplate()" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                💾 저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function renderTemplateList() {
  const container = document.getElementById('templateListContainer');
  if (!container) return;
  
  container.innerHTML = customTemplates.map(template => `
    <div class="border rounded-lg p-4 mb-3 hover:bg-gray-50 transition">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-lg">${template.name}</h4>
          <p class="text-sm text-gray-600">플랫폼: ${template.platform.toUpperCase()}</p>
          <p class="text-xs text-gray-500 mt-2">${template.content.substring(0, 100)}...</p>
        </div>
        <div class="flex gap-2">
          ${!template.isDefault ? `
            <button onclick="editTemplate('${template.id}')" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              수정
            </button>
            <button onclick="deleteTemplate('${template.id}')" class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              삭제
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function showTemplateEditor(template = null) {
  const editor = document.getElementById('templateEditor');
  editor.style.display = 'block';
  
  if (template) {
    document.getElementById('templateName').value = template.name;
    document.getElementById('templatePlatform').value = template.platform;
    document.getElementById('templateContent').value = template.content;
    editor.dataset.editId = template.id;
  } else {
    document.getElementById('templateName').value = '';
    document.getElementById('templatePlatform').value = 'blog';
    document.getElementById('templateContent').value = '';
    delete editor.dataset.editId;
  }
  
  editor.scrollIntoView({ behavior: 'smooth' });
}

function resetTemplate() {
  const platform = document.getElementById('templatePlatform').value;
  const defaultTemplate = getDefaultTemplates().find(t => t.platform === platform);
  
  if (defaultTemplate) {
    document.getElementById('templateContent').value = defaultTemplate.content;
    showToast('✅ 기본값으로 초기화되었습니다');
  }
}

function saveTemplate() {
  const name = document.getElementById('templateName').value.trim();
  const platform = document.getElementById('templatePlatform').value;
  const content = document.getElementById('templateContent').value.trim();
  
  if (!name || !content) {
    showToast('❌ 템플릿 이름과 내용을 입력해주세요', 'error');
    return;
  }
  
  const editor = document.getElementById('templateEditor');
  const editId = editor.dataset.editId;
  
  if (editId) {
    // 수정
    const index = customTemplates.findIndex(t => t.id === editId);
    if (index !== -1) {
      customTemplates[index] = { ...customTemplates[index], name, platform, content };
    }
  } else {
    // 신규
    customTemplates.push({
      id: Date.now().toString(),
      name,
      platform,
      content,
      isDefault: false,
    });
  }
  
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(customTemplates));
  showToast('✅ 템플릿이 저장되었습니다!');
  
  editor.style.display = 'none';
  renderTemplateList();
}

function editTemplate(id) {
  const template = customTemplates.find(t => t.id === id);
  if (template) {
    showTemplateEditor(template);
  }
}

function deleteTemplate(id) {
  if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;
  
  customTemplates = customTemplates.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(customTemplates));
  showToast('✅ 템플릿이 삭제되었습니다');
  renderTemplateList();
}

function closeTemplateModal() {
  document.getElementById('templateModal').style.display = 'none';
  document.getElementById('templateEditor').style.display = 'none';
}

// ===================================
// 프로필 & 히스토리 (기존 코드 유지)
// ===================================
function loadProfiles() {
  const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
  savedProfiles = saved ? JSON.parse(saved) : [];
}

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

function openProfileModal() {
  const name = prompt('프로필 이름을 입력하세요:');
  if (name) {
    saveProfile(name);
    showToast('✅ 프로필이 저장되었습니다!');
  }
}

function saveProfile(name) {
  const profile = {
    id: Date.now().toString(),
    name,
    data: {
      brand: document.getElementById('brand').value,
      companyName: document.getElementById('companyName')?.value || '',
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

function openLoadProfileModal() {
  // 간단한 프로필 로드 (상세 구현은 기존 코드 참고)
  alert('프로필 불러오기 기능 (상세 구현 필요)');
}

function openHistoryModal() {
  // 간단한 히스토리 (상세 구현은 기존 코드 참고)
  alert('히스토리 기능 (상세 구현 필요)');
}

// ===================================
// 이미지 편집
// ===================================
let currentEditImageIndex = null;

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
  const quality = 0.7;
  const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
  
  selectedImages[currentEditImageIndex].base64 = compressedBase64;
  selectedImages[currentEditImageIndex].size = Math.floor(compressedBase64.length * 0.75);
  
  showToast('✅ 이미지가 압축되었습니다');
}

function saveEditedImage() {
  const canvas = document.getElementById('editCanvas');
  const newBase64 = canvas.toDataURL('image/png');
  
  selectedImages[currentEditImageIndex].base64 = newBase64;
  URL.revokeObjectURL(selectedImages[currentEditImageIndex].url);
  selectedImages[currentEditImageIndex].url = canvas.toDataURL();
  
  renderImagePreviews();
  closeImageEditor();
  showToast('✅ 편집된 이미지가 저장되었습니다!');
}

function closeImageEditor() {
  const modal = document.getElementById('imageEditorModal');
  modal.style.display = 'none';
  currentEditImageIndex = null;
}

// ===================================
// 다국어 지원
// ===================================
function t(key) {
  if (typeof window.i18n !== 'undefined' && window.i18n.translations[window.i18n.currentLang]) {
    return window.i18n.translations[window.i18n.currentLang][key] || key;
  }
  return key;
}
