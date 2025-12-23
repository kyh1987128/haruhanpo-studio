export const htmlTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>멀티 플랫폼 콘텐츠 자동 생성기</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      .tab-button {
        transition: all 0.2s;
      }
      .tab-button.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .loading-spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #667eea;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fade-in 0.3s ease-out;
      }
      .result-content {
        max-height: 500px;
        overflow-y: auto;
      }
      .image-preview {
        position: relative;
        display: inline-block;
      }
      .remove-image {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
      }
    </style>
</head>
<body class="bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <!-- 헤더 -->
        <div class="text-center mb-8">
            <h1 class="text-5xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                멀티 플랫폼 콘텐츠 자동 생성기
            </h1>
            <p class="text-gray-600 text-lg">
                원하는 플랫폼만 선택하여 AI 콘텐츠 생성 ✨
            </p>
            
            <!-- 프로필 & 히스토리 버튼 -->
            <div class="flex justify-center space-x-4 mt-6">
                <button id="saveProfile" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-save mr-2"></i>프로필 저장
                </button>
                <button id="loadProfile" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-folder-open mr-2"></i>프로필 불러오기
                </button>
                <button id="viewHistory" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                    <i class="fas fa-history mr-2"></i>히스토리
                </button>
            </div>
        </div>

        <!-- 입력 폼 -->
        <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <form id="contentForm" class="space-y-6">
                <!-- 이미지 업로드 -->
                <div>
                    <label class="block mb-2 font-semibold text-gray-700">
                        <i class="fas fa-image mr-2"></i>이미지 업로드 (최대 10장, 총 50MB)
                    </label>
                    <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition cursor-pointer" id="uploadArea">
                        <i class="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            id="imageInput"
                            class="hidden"
                        />
                        <p class="text-gray-600">
                            <span class="text-purple-600 font-semibold hover:underline">클릭하여 이미지 선택</span>
                            <span class="text-gray-500"> 또는 드래그앤드롭</span>
                        </p>
                    </div>
                    <div id="imagePreview" class="mt-4 grid grid-cols-5 gap-3"></div>
                </div>

                <!-- 기본 정보 -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-tag mr-2"></i>브랜드명 <span class="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="brand"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: 올리브영"
                            required
                        />
                    </div>
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-building mr-2"></i>회사 상호명
                        </label>
                        <input
                            type="text"
                            id="companyName"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: (주)올리브영"
                        />
                    </div>
                </div>

                <!-- 사업자 정보 -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-briefcase mr-2"></i>사업자 유형
                        </label>
                        <select id="businessType" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="">선택 안 함</option>
                            <option value="개인">개인</option>
                            <option value="법인">법인</option>
                            <option value="프리랜서">프리랜서</option>
                        </select>
                    </div>
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-map-marker-alt mr-2"></i>지역
                        </label>
                        <select id="location" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="">선택 안 함</option>
                            <option value="서울">서울</option>
                            <option value="경기">경기</option>
                            <option value="인천">인천</option>
                            <option value="부산">부산</option>
                            <option value="대구">대구</option>
                            <option value="대전">대전</option>
                            <option value="광주">광주</option>
                            <option value="울산">울산</option>
                            <option value="세종">세종</option>
                            <option value="강원">강원</option>
                            <option value="충북">충북</option>
                            <option value="충남">충남</option>
                            <option value="전북">전북</option>
                            <option value="전남">전남</option>
                            <option value="경북">경북</option>
                            <option value="경남">경남</option>
                            <option value="제주">제주</option>
                        </select>
                    </div>
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-venus-mars mr-2"></i>타겟 성별
                        </label>
                        <select id="targetGender" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="전체">전체</option>
                            <option value="남성">남성</option>
                            <option value="여성">여성</option>
                        </select>
                    </div>
                </div>

                <!-- 연락처 정보 -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-phone mr-2"></i>연락처
                        </label>
                        <input
                            type="text"
                            id="contact"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: 010-1234-5678"
                        />
                    </div>
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-globe mr-2"></i>웹사이트
                        </label>
                        <input
                            type="url"
                            id="website"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: https://www.example.com"
                        />
                    </div>
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fab fa-instagram mr-2"></i>SNS 계정
                        </label>
                        <input
                            type="text"
                            id="sns"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: @brandname"
                        />
                    </div>
                </div>

                <!-- 키워드 -->
                <div>
                    <label class="block mb-2 font-semibold text-gray-700">
                        <i class="fas fa-key mr-2"></i>핵심 키워드 <span class="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="keywords"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="예: 스킨케어, 보습, 민감성피부 (쉼표로 구분)"
                        required
                    />
                </div>

                <!-- 톤앤매너, 연령대, 산업 -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-palette mr-2"></i>톤앤매너
                        </label>
                        <select id="tone" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="캐주얼">캐주얼</option>
                            <option value="전문가">전문가</option>
                            <option value="감성">감성</option>
                        </select>
                    </div>
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-users mr-2"></i>타겟 연령대
                        </label>
                        <select id="targetAge" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="10대">10대</option>
                            <option value="20대" selected>20대</option>
                            <option value="30대">30대</option>
                            <option value="40대">40대</option>
                            <option value="50대+">50대+</option>
                        </select>
                    </div>
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-industry mr-2"></i>산업 분야
                        </label>
                        <select id="industry" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="뷰티">뷰티</option>
                            <option value="패션">패션</option>
                            <option value="F&B">F&B</option>
                            <option value="IT">IT/테크</option>
                            <option value="헬스케어">헬스케어</option>
                            <option value="라이프스타일" selected>라이프스타일</option>
                        </select>
                    </div>
                </div>

                <!-- 플랫폼 선택 -->
                <div>
                    <label class="block mb-3 font-semibold text-gray-700">
                        <i class="fas fa-check-square mr-2"></i>생성할 플랫폼 선택 (최소 1개)
                    </label>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label class="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-purple-50 transition">
                            <input type="checkbox" name="platform" value="blog" checked class="w-5 h-5 text-purple-600">
                            <span class="font-medium">📝 네이버 블로그</span>
                        </label>
                        <label class="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-purple-50 transition">
                            <input type="checkbox" name="platform" value="instagram" checked class="w-5 h-5 text-purple-600">
                            <span class="font-medium">📸 인스타그램</span>
                        </label>
                        <label class="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-purple-50 transition">
                            <input type="checkbox" name="platform" value="threads" class="w-5 h-5 text-purple-600">
                            <span class="font-medium">🧵 스레드</span>
                        </label>
                        <label class="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-purple-50 transition">
                            <input type="checkbox" name="platform" value="youtube" class="w-5 h-5 text-purple-600">
                            <span class="font-medium">🎬 유튜브 숏폼</span>
                        </label>
                    </div>
                </div>

                <!-- 비용 예상 -->
                <div id="costEstimate"></div>

                <button
                    type="submit"
                    id="submitBtn"
                    class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg text-lg"
                >
                    🎯 콘텐츠 생성하기
                </button>
            </form>
        </div>

        <!-- 로딩 상태 -->
        <div id="loadingState" class="hidden bg-white rounded-2xl shadow-xl p-12 text-center mb-8">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600 text-lg font-medium">콘텐츠 생성 중...</p>
            <p class="text-gray-500 text-sm mt-2">(약 30-60초 소요)</p>
        </div>

        <!-- 결과 표시 -->
        <div id="resultArea" class="hidden bg-white rounded-2xl shadow-xl p-8">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">생성 결과</h2>
            
            <div id="tabButtons" class="flex space-x-2 mb-6 overflow-x-auto"></div>
            <div id="tabContents"></div>
        </div>

        <!-- 프로필 모달 -->
        <div id="profileModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">저장된 프로필</h3>
                    <button onclick="closeModal('profileModal')" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div id="profileList" class="space-y-3"></div>
            </div>
        </div>

        <!-- 히스토리 모달 -->
        <div id="historyModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">생성 히스토리</h3>
                    <button onclick="closeModal('historyModal')" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div id="historyList" class="space-y-3"></div>
            </div>
        </div>
    </div>

    <script src="/static/app-enhanced.js"></script>
</body>
</html>
`;
