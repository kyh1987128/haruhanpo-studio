// 전역 변수
let selectedImages = [];
let resultData = {};

// DOM 로드 완료 시
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // 이미지 업로드 영역 클릭 이벤트
  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('imageInput');

  uploadArea.addEventListener('click', () => {
    imageInput.click();
  });

  // 이미지 선택 이벤트
  imageInput.addEventListener('change', handleImageSelect);

  // 드래그 앤 드롭 이벤트
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

  // 폼 제출 이벤트
  const form = document.getElementById('contentForm');
  form.addEventListener('submit', handleFormSubmit);
}

// 이미지 선택 핸들러
function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  handleImageFiles(files);
}

// 이미지 파일 처리
function handleImageFiles(files) {
  // 이미지 파일만 필터링
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  // 최대 10장 제한
  if (selectedImages.length + imageFiles.length > 10) {
    alert('최대 10장까지 업로드 가능합니다.');
    return;
  }

  // 총 크기 제한 (50MB)
  const totalSize = [...selectedImages, ...imageFiles].reduce((sum, file) => sum + file.size, 0);
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (totalSize > maxSize) {
    alert('전체 이미지 크기는 50MB를 초과할 수 없습니다.');
    return;
  }

  // 이미지 추가
  selectedImages.push(...imageFiles);
  
  // 미리보기 업데이트
  updateImagePreview();
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
}

// 폼 제출 핸들러
async function handleFormSubmit(e) {
  e.preventDefault();

  // 입력값 가져오기
  const brand = document.getElementById('brand').value.trim();
  const keywords = document.getElementById('keywords').value.trim();
  const tone = document.getElementById('tone').value;
  const targetAge = document.getElementById('targetAge').value;
  const industry = document.getElementById('industry').value;

  // 선택된 플랫폼
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  const platforms = Array.from(platformCheckboxes).map(cb => cb.value);

  // 유효성 검사
  if (!brand || !keywords) {
    alert('브랜드명과 핵심 키워드를 입력해주세요.');
    return;
  }

  if (platforms.length === 0) {
    alert('최소 1개 플랫폼을 선택해주세요.');
    return;
  }

  if (selectedImages.length === 0) {
    alert('최소 1장의 이미지를 업로드해주세요.');
    return;
  }

  // 이미지를 base64로 변환
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

  // 로딩 상태 표시
  document.getElementById('contentForm').classList.add('hidden');
  document.getElementById('resultArea').classList.add('hidden');
  document.getElementById('loadingState').classList.remove('hidden');

  try {
    // API 호출
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brand,
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
      // 결과 저장
      resultData = data.data;
      
      // 결과 표시
      displayResults(data.data, data.generatedPlatforms);
      
      // 성공 알림
      alert(`콘텐츠 생성 완료! ${data.generatedPlatforms.length}개 플랫폼 (이미지 ${data.imageCount}장 분석)`);
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    alert(`오류 발생: ${error.message}`);
    // 폼 다시 표시
    document.getElementById('contentForm').classList.remove('hidden');
  } finally {
    // 로딩 상태 숨김
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
    
    // 탭 버튼
    const button = document.createElement('button');
    button.className = `tab-button px-6 py-3 rounded-lg font-semibold transition ${index === 0 ? 'active' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;
    button.textContent = info.name;
    button.onclick = () => switchTab(platform);
    button.dataset.platform = platform;
    tabButtons.appendChild(button);

    // 탭 콘텐츠
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
      </div>
    `;
    tabContents.appendChild(content);
  });

  // 결과 영역 표시
  document.getElementById('resultArea').classList.remove('hidden');
  
  // 폼 다시 표시
  document.getElementById('contentForm').classList.remove('hidden');
}

// 탭 전환
function switchTab(platform) {
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
    btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
  });

  // 선택된 탭 버튼 활성화
  const activeBtn = document.querySelector(`.tab-button[data-platform="${platform}"]`);
  activeBtn.classList.add('active');
  activeBtn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');

  // 모든 탭 콘텐츠 숨김
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });

  // 선택된 탭 콘텐츠 표시
  document.getElementById(`tab-${platform}`).classList.remove('hidden');
}

// 콘텐츠 복사
function copyContent(platform) {
  const content = resultData[platform];
  navigator.clipboard.writeText(content).then(() => {
    alert('클립보드에 복사되었습니다!');
  }).catch(err => {
    alert('복사 실패: ' + err.message);
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

// removeImage를 전역으로 노출
window.removeImage = removeImage;
window.copyContent = copyContent;
window.downloadContent = downloadContent;
window.switchTab = switchTab;
