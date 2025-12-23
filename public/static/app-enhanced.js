// 전역 변수
let selectedImages = [];
let resultData = {};
let savedProfiles = [];
let contentHistory = [];

// LocalStorage 키
const STORAGE_KEYS = {
  PROFILES: 'content_generator_profiles',
  HISTORY: 'content_generator_history',
  CURRENT_PROFILE: 'content_generator_current_profile'
};

// 비용 계산 상수
const COSTS = {
  IMAGE_ANALYSIS: 0.01,  // 이미지 1장당
  BLOG: 0.04,
  INSTAGRAM: 0.03,
  THREADS: 0.02,
  YOUTUBE: 0.04
};

// DOM 로드 완료 시
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  loadSavedProfiles();
  loadContentHistory();
});

function initializeApp() {
  // 이미지 업로드 영역
  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('imageInput');

  uploadArea.addEventListener('click', () => {
    imageInput.click();
  });

  imageInput.addEventListener('change', handleImageSelect);

  // 드래그 앤 드롭
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-purple-500', 'bg-purple-50');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-purple-500', 'bg-purple-50');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-purple-500', 'bg-purple-50');
    
    const files = Array.from(e.dataTransfer.files);
    handleImageFiles(files);
  });

  // 폼 제출
  const form = document.getElementById('contentForm');
  form.addEventListener('submit', handleFormSubmit);

  // 프로필 저장 버튼
  document.getElementById('saveProfile')?.addEventListener('click', saveCurrentProfile);
  
  // 프로필 불러오기 버튼
  document.getElementById('loadProfile')?.addEventListener('click', showProfileList);
  
  // 히스토리 버튼
  document.getElementById('viewHistory')?.addEventListener('click', showHistoryList);

  // 실시간 비용 계산
  document.querySelectorAll('input[name="platform"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateCostEstimate);
  });

  imageInput.addEventListener('change', updateCostEstimate);

  // 초기 비용 계산
  updateCostEstimate();
}

// 이미지 선택
function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  handleImageFiles(files);
}

// 이미지 파일 처리
function handleImageFiles(files) {
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  if (selectedImages.length + imageFiles.length > 10) {
    showToast('최대 10장까지 업로드 가능합니다.', 'error');
    return;
  }

  const totalSize = [...selectedImages, ...imageFiles].reduce((sum, file) => sum + file.size, 0);
  const maxSize = 50 * 1024 * 1024;

  if (totalSize > maxSize) {
    showToast('전체 이미지 크기는 50MB를 초과할 수 없습니다.', 'error');
    return;
  }

  selectedImages.push(...imageFiles);
  updateImagePreview();
  updateCostEstimate();
}

// 이미지 미리보기 업데이트
function updateImagePreview() {
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '';

  selectedImages.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'image-preview';
      div.innerHTML = `
        <img src="${e.target.result}" alt="Preview ${index + 1}" class="w-full h-24 object-cover rounded-lg shadow">
        <div class="remove-image" onclick="removeImage(${index})">
          <i class="fas fa-times"></i>
        </div>
      `;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

// 이미지 삭제
function removeImage(index) {
  selectedImages.splice(index, 1);
  updateImagePreview();
  updateCostEstimate();
}

// 비용 예상 계산
function updateCostEstimate() {
  const imageCount = selectedImages.length || 0;
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  const platforms = Array.from(platformCheckboxes).map(cb => cb.value);
  
  let totalCost = imageCount * COSTS.IMAGE_ANALYSIS;
  
  platforms.forEach(platform => {
    totalCost += COSTS[platform.toUpperCase()] || 0;
  });

  const costDisplay = document.getElementById('costEstimate');
  if (costDisplay) {
    costDisplay.innerHTML = `
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">
              <i class="fas fa-calculator mr-2"></i>예상 비용
            </p>
            <p class="text-2xl font-bold text-blue-600">$${totalCost.toFixed(2)}</p>
          </div>
          <div class="text-right text-sm text-gray-500">
            <p>이미지: ${imageCount}장 × $${COSTS.IMAGE_ANALYSIS}</p>
            <p>플랫폼: ${platforms.length}개</p>
          </div>
        </div>
      </div>
    `;
  }
}

// 프로필 저장
function saveCurrentProfile() {
  const profileName = prompt('프로필 이름을 입력하세요:');
  if (!profileName) return;

  const profile = {
    id: Date.now().toString(),
    name: profileName,
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
      tone: document.getElementById('tone').value,
      targetAge: document.getElementById('targetAge').value,
      industry: document.getElementById('industry').value,
    },
    createdAt: new Date().toISOString()
  };

  savedProfiles.push(profile);
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(savedProfiles));
  showToast('프로필이 저장되었습니다!', 'success');
}

// 프로필 불러오기
function loadSavedProfiles() {
  const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
  if (saved) {
    savedProfiles = JSON.parse(saved);
  }
}

// 프로필 목록 표시
function showProfileList() {
  if (savedProfiles.length === 0) {
    showToast('저장된 프로필이 없습니다.', 'info');
    return;
  }

  const modal = document.getElementById('profileModal');
  const list = document.getElementById('profileList');
  
  list.innerHTML = savedProfiles.map(profile => `
    <div class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onclick="loadProfile('${profile.id}')">
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-semibold text-gray-800">${profile.name}</h4>
          <p class="text-sm text-gray-500">${profile.data.brand}</p>
          <p class="text-xs text-gray-400 mt-1">${new Date(profile.createdAt).toLocaleString('ko-KR')}</p>
        </div>
        <button onclick="event.stopPropagation(); deleteProfile('${profile.id}')" class="text-red-500 hover:text-red-700">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  modal.classList.remove('hidden');
}

// 프로필 적용
function loadProfile(profileId) {
  const profile = savedProfiles.find(p => p.id === profileId);
  if (!profile) return;

  const data = profile.data;
  document.getElementById('brand').value = data.brand;
  if (document.getElementById('companyName')) document.getElementById('companyName').value = data.companyName || '';
  if (document.getElementById('businessType')) document.getElementById('businessType').value = data.businessType || '';
  if (document.getElementById('location')) document.getElementById('location').value = data.location || '';
  if (document.getElementById('targetGender')) document.getElementById('targetGender').value = data.targetGender || '';
  if (document.getElementById('contact')) document.getElementById('contact').value = data.contact || '';
  if (document.getElementById('website')) document.getElementById('website').value = data.website || '';
  if (document.getElementById('sns')) document.getElementById('sns').value = data.sns || '';
  document.getElementById('keywords').value = data.keywords;
  document.getElementById('tone').value = data.tone;
  document.getElementById('targetAge').value = data.targetAge;
  document.getElementById('industry').value = data.industry;

  document.getElementById('profileModal').classList.add('hidden');
  showToast('프로필이 적용되었습니다!', 'success');
}

// 프로필 삭제
function deleteProfile(profileId) {
  if (!confirm('이 프로필을 삭제하시겠습니까?')) return;
  
  savedProfiles = savedProfiles.filter(p => p.id !== profileId);
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(savedProfiles));
  showProfileList();
  showToast('프로필이 삭제되었습니다.', 'success');
}

// 히스토리 로드
function loadContentHistory() {
  const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (saved) {
    contentHistory = JSON.parse(saved);
  }
}

// 히스토리 저장
function saveToHistory(data, metadata) {
  const historyItem = {
    id: Date.now().toString(),
    data: data,
    metadata: metadata,
    createdAt: new Date().toISOString()
  };

  contentHistory.unshift(historyItem);
  
  // 최대 50개까지만 저장
  if (contentHistory.length > 50) {
    contentHistory = contentHistory.slice(0, 50);
  }

  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(contentHistory));
}

// 히스토리 목록 표시
function showHistoryList() {
  if (contentHistory.length === 0) {
    showToast('생성 히스토리가 없습니다.', 'info');
    return;
  }

  const modal = document.getElementById('historyModal');
  const list = document.getElementById('historyList');
  
  list.innerHTML = contentHistory.map(item => `
    <div class="border rounded-lg p-4 hover:bg-gray-50">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h4 class="font-semibold text-gray-800">${item.metadata.brand}</h4>
          <p class="text-xs text-gray-400">${new Date(item.createdAt).toLocaleString('ko-KR')}</p>
        </div>
        <div class="flex space-x-2">
          <button onclick="loadHistoryItem('${item.id}')" class="text-blue-500 hover:text-blue-700">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="deleteHistoryItem('${item.id}')" class="text-red-500 hover:text-red-700">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1">
        ${item.metadata.platforms.map(p => `<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">${p}</span>`).join('')}
      </div>
    </div>
  `).join('');

  modal.classList.remove('hidden');
}

// 히스토리 아이템 로드
function loadHistoryItem(historyId) {
  const item = contentHistory.find(h => h.id === historyId);
  if (!item) return;

  resultData = item.data;
  displayResults(item.data, item.metadata.platforms);
  
  document.getElementById('historyModal').classList.add('hidden');
  showToast('히스토리가 로드되었습니다!', 'success');
}

// 히스토리 삭제
function deleteHistoryItem(historyId) {
  if (!confirm('이 히스토리를 삭제하시겠습니까?')) return;
  
  contentHistory = contentHistory.filter(h => h.id !== historyId);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(contentHistory));
  showHistoryList();
  showToast('히스토리가 삭제되었습니다.', 'success');
}

// 폼 제출
async function handleFormSubmit(e) {
  e.preventDefault();

  const brand = document.getElementById('brand').value.trim();
  const companyName = document.getElementById('companyName')?.value.trim() || '';
  const businessType = document.getElementById('businessType')?.value || '';
  const location = document.getElementById('location')?.value || '';
  const targetGender = document.getElementById('targetGender')?.value || '';
  const contact = document.getElementById('contact')?.value.trim() || '';
  const website = document.getElementById('website')?.value.trim() || '';
  const sns = document.getElementById('sns')?.value.trim() || '';
  const keywords = document.getElementById('keywords').value.trim();
  const tone = document.getElementById('tone').value;
  const targetAge = document.getElementById('targetAge').value;
  const industry = document.getElementById('industry').value;

  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  const platforms = Array.from(platformCheckboxes).map(cb => cb.value);

  if (!brand || !keywords) {
    showToast('브랜드명과 핵심 키워드를 입력해주세요.', 'error');
    return;
  }

  if (platforms.length === 0) {
    showToast('최소 1개 플랫폼을 선택해주세요.', 'error');
    return;
  }

  if (selectedImages.length === 0) {
    showToast('최소 1장의 이미지를 업로드해주세요.', 'error');
    return;
  }

  const imageBase64Array = await Promise.all(
    selectedImages.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    })
  );

  document.getElementById('contentForm').classList.add('hidden');
  document.getElementById('resultArea').classList.add('hidden');
  document.getElementById('loadingState').classList.remove('hidden');

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brand,
        companyName,
        businessType,
        location,
        targetGender,
        contact,
        website,
        sns,
        keywords,
        tone,
        targetAge,
        industry,
        images: imageBase64Array,
        platforms,
      }),
    });

    const data = await response.json();

    if (data.success) {
      resultData = data.data;
      displayResults(data.data, data.generatedPlatforms);
      
      // 히스토리 저장
      saveToHistory(data.data, {
        brand,
        platforms: data.generatedPlatforms,
        imageCount: data.imageCount
      });
      
      showToast(`콘텐츠 생성 완료! ${data.generatedPlatforms.length}개 플랫폼 (이미지 ${data.imageCount}장 분석)`, 'success');
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    showToast(`오류 발생: ${error.message}`, 'error');
    document.getElementById('contentForm').classList.remove('hidden');
  } finally {
    document.getElementById('loadingState').classList.add('hidden');
  }
}

// 결과 표시
function displayResults(data, platforms) {
  const tabButtons = document.getElementById('tabButtons');
  const tabContents = document.getElementById('tabContents');

  tabButtons.innerHTML = '';
  tabContents.innerHTML = '';

  const platformNames = {
    blog: { name: '📝 블로그', icon: 'fas fa-blog' },
    instagram: { name: '📸 인스타그램', icon: 'fab fa-instagram' },
    threads: { name: '🧵 스레드', icon: 'fas fa-comments' },
    youtube: { name: '🎬 유튜브', icon: 'fab fa-youtube' },
  };

  platforms.forEach((platform, index) => {
    const info = platformNames[platform];
    
    const button = document.createElement('button');
    button.className = `tab-button px-6 py-3 rounded-lg font-semibold transition ${index === 0 ? 'active' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;
    button.textContent = info.name;
    button.onclick = () => switchTab(platform);
    button.dataset.platform = platform;
    tabButtons.appendChild(button);

    const content = document.createElement('div');
    content.id = `tab-${platform}`;
    content.className = `tab-content ${index === 0 ? '' : 'hidden'}`;
    content.innerHTML = `
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="${info.icon} mr-2"></i>${info.name}
          </h3>
          <div class="space-x-2">
            <button onclick="copyContent('${platform}')" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              <i class="fas fa-copy mr-2"></i>복사
            </button>
            <button onclick="downloadContent('${platform}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <i class="fas fa-download mr-2"></i>다운로드
            </button>
          </div>
        </div>
        <div class="result-content bg-gray-50 p-6 rounded-lg">
          <pre class="whitespace-pre-wrap font-sans text-gray-800">${escapeHtml(data[platform])}</pre>
        </div>
        <div class="text-sm text-gray-500">
          글자 수: ${data[platform].length.toLocaleString()}자
        </div>
      </div>
    `;
    tabContents.appendChild(content);
  });

  document.getElementById('resultArea').classList.remove('hidden');
  document.getElementById('contentForm').classList.remove('hidden');
}

// 탭 전환
function switchTab(platform) {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
    btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
  });

  const activeBtn = document.querySelector(`.tab-button[data-platform="${platform}"]`);
  activeBtn.classList.add('active');
  activeBtn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });

  document.getElementById(`tab-${platform}`).classList.remove('hidden');
}

// 콘텐츠 복사
function copyContent(platform) {
  const content = resultData[platform];
  navigator.clipboard.writeText(content).then(() => {
    showToast('클립보드에 복사되었습니다!', 'success');
  }).catch(err => {
    showToast('복사 실패: ' + err.message, 'error');
  });
}

// 콘텐츠 다운로드
function downloadContent(platform) {
  const content = resultData[platform];
  const brand = document.getElementById('brand').value;
  const date = new Date().toISOString().split('T')[0];
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${brand}_${platform}_${date}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 토스트 메시지
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// 모달 닫기
function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// 전역 함수 노출
window.removeImage = removeImage;
window.copyContent = copyContent;
window.downloadContent = downloadContent;
window.switchTab = switchTab;
window.loadProfile = loadProfile;
window.deleteProfile = deleteProfile;
window.loadHistoryItem = loadHistoryItem;
window.deleteHistoryItem = deleteHistoryItem;
window.closeModal = closeModal;
