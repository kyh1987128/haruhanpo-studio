export const htmlTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>콘텐츠잇다 AI Studio</title>
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
      .image-preview img {
        width: 100%;
        height: 150px;
        object-fit: cover;
        border-radius: 8px;
      }
      .remove-image-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .edit-image-btn {
        position: absolute;
        bottom: 4px;
        right: 4px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .image-name {
        position: absolute;
        bottom: 4px;
        left: 4px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        max-width: calc(100% - 60px);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .modal {
        display: none;
      }
      .modal.flex {
        display: flex;
      }
      /* 토스트 메시지 */
      .toast {
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
        z-index: 9999;
        font-weight: 600;
      }
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    </style>
</head>
<body class="bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <!-- 헤더 -->
        <div class="text-center mb-8">
            <!-- 언어 선택 -->
            <div class="flex justify-end mb-4 space-x-2">
                <button onclick="window.i18n.changeLanguage('ko')" class="px-3 py-1 rounded hover:bg-purple-100 transition" title="한국어">
                    🇰🇷
                </button>
                <button onclick="window.i18n.changeLanguage('en')" class="px-3 py-1 rounded hover:bg-purple-100 transition" title="English">
                    🇺🇸
                </button>
            </div>
            
            <h1 class="text-5xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent" data-i18n="title">
                콘텐츠잇다 AI Studio
            </h1>
            <p class="text-gray-600 text-lg" data-i18n="subtitle">
                이미지로 10개 플랫폼 콘텐츠 자동 생성 🔒 내부 전용
            </p>
            
            <!-- 프로필 & 히스토리 & 템플릿 버튼 -->
            <div class="flex justify-center space-x-3 mt-6 flex-wrap">
                <button id="saveProfileBtn" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    <i class="fas fa-save mr-2"></i><span data-i18n="saveProfile">프로필 저장</span>
                </button>
                <button id="loadProfileBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-folder-open mr-2"></i><span data-i18n="loadProfile">프로필 불러오기</span>
                </button>
                <button id="historyBtn" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                    <i class="fas fa-history mr-2"></i><span data-i18n="viewHistory">히스토리</span>
                </button>
                <button id="templateBtn" class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
                    <i class="fas fa-file-alt mr-2"></i><span data-i18n="templates">템플릿</span>
                </button>
            </div>
        </div>

        <!-- 입력 폼 -->
        <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <form id="contentForm" class="space-y-6">

                <!-- 기본 정보 -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-tag mr-2"></i>브랜드명 / 서비스명 / 상품명 <span class="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="brand"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: 올리브영 / 스킨케어 라인 / 수분크림"
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
                            type="text"
                            id="website"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: www.example.com (http:// 자동 추가됨)"
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

                <!-- 생성할 콘텐츠 개수 -->
                <div>
                    <label class="block mb-2 font-semibold text-gray-700">
                        <i class="fas fa-list-ol mr-2"></i>생성할 콘텐츠 개수
                    </label>
                    <select id="contentCount" onchange="generateContentBlocks()" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                        <option value="1" selected>1개</option>
                        <option value="2">2개</option>
                        <option value="3">3개</option>
                        <option value="4">4개</option>
                        <option value="5">5개</option>
                        <option value="6">6개</option>
                        <option value="7">7개</option>
                        <option value="8">8개</option>
                        <option value="9">9개</option>
                        <option value="10">10개</option>
                        <option value="12">12개</option>
                        <option value="15">15개</option>
                        <option value="20">20개</option>
                    </select>
                </div>
                
                <!-- 개별 콘텐츠 입력 영역 -->
                <div id="contentBlocksContainer" class="space-y-4"></div>

                <!-- 톤앤매너, 연령대, 산업 -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-palette mr-2"></i>톤앤매너
                        </label>
                        <select id="tone" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="친근한">친근한</option>
                            <option value="전문가">전문가</option>
                            <option value="감성">감성</option>
                            <option value="유머러스">유머러스</option>
                            <option value="신뢰감">신뢰감</option>
                            <option value="트렌디">트렌디</option>
                            <option value="고급스러운">고급스러운</option>
                            <option value="실용적">실용적</option>
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
                            <option value="" selected>선택안함 (AI가 자동 판단)</option>
                            <option value="라이프스타일">라이프스타일</option>
                            <option value="뷰티/코스메틱">뷰티/코스메틱</option>
                            <option value="패션/의류">패션/의류</option>
                            <option value="음식/외식">음식/외식 (F&B)</option>
                            <option value="카페/디저트">카페/디저트</option>
                            <option value="IT/테크">IT/테크</option>
                            <option value="제조/엔지니어링">제조/엔지니어링</option>
                            <option value="건설/건축">건설/건축</option>
                            <option value="헬스/피트니스">헬스/피트니스</option>
                            <option value="의료/병원">의료/병원</option>
                            <option value="교육/학원">교육/학원</option>
                            <option value="부동산/인테리어">부동산/인테리어</option>
                            <option value="금융/보험">금융/보험</option>
                            <option value="법률/컨설팅">법률/컨설팅</option>
                            <option value="여행/관광">여행/관광</option>
                            <option value="숙박/호텔">숙박/호텔</option>
                            <option value="반려동물">반려동물</option>
                            <option value="자동차/정비">자동차/정비</option>
                            <option value="가전/전자">가전/전자</option>
                            <option value="스포츠/레저">스포츠/레저</option>
                            <option value="문화/예술">문화/예술</option>
                            <option value="웨딩/이벤트">웨딩/이벤트</option>
                            <option value="미용/헤어">미용/헤어</option>
                            <option value="유통/물류">유통/물류</option>
                            <option value="농업/수산">농업/수산</option>
                        </select>
                    </div>
                </div>

                <!-- 플랫폼 선택 -->
                <div>
                    <label class="block mb-3 font-semibold text-gray-700">
                        <i class="fas fa-check-square mr-2"></i>생성할 플랫폼 선택 (최소 1개)
                    </label>
                    
                    <!-- 블로그 & SNS -->
                    <div class="mb-4">
                        <h4 class="text-sm font-semibold text-gray-600 mb-2">📝 블로그 & SNS 포스트</h4>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-purple-50 transition">
                                <input type="checkbox" name="platform" value="blog" checked class="w-5 h-5 text-purple-600">
                                <span class="font-medium text-sm">📝 네이버 블로그</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-purple-50 transition">
                                <input type="checkbox" name="platform" value="instagram_feed" class="w-5 h-5 text-purple-600">
                                <span class="font-medium text-sm">📸 인스타그램 피드</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-purple-50 transition">
                                <input type="checkbox" name="platform" value="threads" class="w-5 h-5 text-purple-600">
                                <span class="font-medium text-sm">🧵 스레드</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- 숏폼 비디오 -->
                    <div class="mb-4">
                        <h4 class="text-sm font-semibold text-gray-600 mb-2">📱 숏폼 영상 (9:16, 15-60초)</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-pink-50 transition">
                                <input type="checkbox" name="platform" value="tiktok" class="w-5 h-5 text-pink-600">
                                <span class="font-medium text-sm">🎵 틱톡</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-pink-50 transition">
                                <input type="checkbox" name="platform" value="instagram_reels" checked class="w-5 h-5 text-pink-600">
                                <span class="font-medium text-sm">📸 인스타 릴스</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-pink-50 transition">
                                <input type="checkbox" name="platform" value="youtube_shorts" class="w-5 h-5 text-pink-600">
                                <span class="font-medium text-sm">🎬 유튜브 쇼츠</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-pink-50 transition">
                                <input type="checkbox" name="platform" value="shortform_multi" class="w-5 h-5 text-pink-600">
                                <span class="font-medium text-sm">🎥 숏폼(전체)</span>
                            </label>
                        </div>
                        <p class="text-xs text-gray-500 mt-2 ml-1">
                            💡 "숏폼(전체)"는 틱톡+릴스+쇼츠에 모두 최적화된 대본을 생성합니다
                        </p>
                    </div>
                    
                    <!-- 롱폼 비디오 -->
                    <div>
                        <h4 class="text-sm font-semibold text-gray-600 mb-2">🎬 롱폼 영상 (16:9, 5-15분)</h4>
                        <div class="grid grid-cols-2 md:grid-cols-2 gap-3">
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-red-50 transition">
                                <input type="checkbox" name="platform" value="youtube_longform" class="w-5 h-5 text-red-600">
                                <span class="font-medium text-sm">🎥 유튜브 롱폼</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition">
                                <input type="checkbox" name="platform" value="metadata_generation" class="w-5 h-5 text-blue-600">
                                <span class="font-medium text-sm">📊 메타데이터 생성</span>
                            </label>
                        </div>
                        <p class="text-xs text-gray-500 mt-2 ml-1">
                            💡 롱폼: 상세한 시나리오 & 연출 지시 | 메타데이터: 제목, 썸네일, 설명, 태그 최적화
                        </p>
                    </div>
                </div>

                <!-- 비용 예상 (버튼 바로 위) -->
                <div id="costEstimate" class="mb-6"></div>

                <button
                    type="submit"
                    id="generateBtn"
                    class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg text-lg"
                >
                    🎯 콘텐츠 생성하기
                </button>
            </form>
        </div>

        <!-- 전체 화면 로딩 오버레이 -->
        <div id="loadingOverlay" class="hidden fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div class="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md mx-4">
                <div class="loading-spinner mx-auto mb-6"></div>
                <h3 class="text-2xl font-bold text-gray-800 mb-3">콘텐츠 생성 중...</h3>
                <div class="mb-4">
                    <div class="text-4xl font-bold text-purple-600" id="progressPercent">0%</div>
                    <div class="w-full bg-gray-200 rounded-full h-3 mt-3">
                        <div id="progressBar" class="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                </div>
                <p class="text-gray-600" id="loadingMessage">이미지 분석 중...</p>
                <p class="text-gray-500 text-sm mt-2">예상 소요 시간: <span id="estimatedTime">30초</span></p>
            </div>
        </div>

        <!-- 에러 모달 -->
        <div id="errorModal" class="hidden fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-lg mx-4">
                <div class="text-center mb-6">
                    <div class="text-6xl mb-4">❌</div>
                    <h3 class="text-2xl font-bold text-red-600 mb-2">오류 발생</h3>
                    <p class="text-gray-700 mb-4" id="errorMessage">콘텐츠 생성 중 오류가 발생했습니다.</p>
                    <div class="bg-gray-50 border-l-4 border-yellow-400 p-4 text-left">
                        <p class="font-semibold text-gray-800 mb-2">💡 해결 방법:</p>
                        <ul class="text-sm text-gray-600 space-y-1" id="errorSolutions">
                            <li>• OpenAI API 키가 올바른지 확인하세요</li>
                            <li>• API 사용 한도를 확인하세요</li>
                            <li>• 잠시 후 다시 시도해주세요</li>
                        </ul>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button onclick="closeErrorModal()" class="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                        닫기
                    </button>
                    <button onclick="retryGeneration()" class="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold">
                        🔄 재시도
                    </button>
                </div>
            </div>
        </div>

        <!-- 검증 모달 (이미지-내용 불일치) -->
        <div id="validationModal" class="hidden fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl mx-4">
                <div class="text-center mb-6">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h3 class="text-2xl font-bold text-yellow-600 mb-2">이미지와 입력 정보 불일치</h3>
                    <p class="text-gray-700 mb-4">업로드된 이미지와 입력하신 정보가 일치하지 않는 것으로 확인되었습니다.</p>
                    
                    <div class="bg-red-50 border-l-4 border-red-400 p-4 text-left mb-4">
                        <p class="font-semibold text-red-800 mb-2">🔍 불일치 내용:</p>
                        <p class="text-sm text-red-700" id="validationReason"></p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 text-left">
                            <p class="font-semibold text-blue-800 mb-2">📸 이미지 내용:</p>
                            <p class="text-sm text-blue-700" id="validationImageSummary"></p>
                        </div>
                        <div class="bg-green-50 border-l-4 border-green-400 p-4 text-left">
                            <p class="font-semibold text-green-800 mb-2">📝 입력 정보:</p>
                            <p class="text-sm text-green-700" id="validationUserInputSummary"></p>
                        </div>
                    </div>
                    
                    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-left">
                        <p class="font-semibold text-yellow-800 mb-2">💡 권장 조치:</p>
                        <p class="text-sm text-yellow-700" id="validationRecommendation"></p>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg text-left mt-4">
                        <p class="text-sm text-gray-600">
                            <strong>일치도:</strong> <span id="validationConfidence" class="font-bold text-red-600"></span>
                        </p>
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <button onclick="closeValidationModal()" class="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                        ⬅️ 수정하기
                    </button>
                    <button onclick="forceGenerate()" class="flex-1 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold">
                        ⚠️ 무시하고 진행
                    </button>
                </div>
            </div>
        </div>

        <!-- 결과 표시 -->
        <div id="resultArea" class="hidden bg-white rounded-2xl shadow-xl p-8 mb-24">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">생성 결과</h2>
                <button
                    onclick="downloadAllAsExcel()"
                    class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
                    title="전체 플랫폼 콘텐츠를 Excel로 다운로드"
                >
                    <i class="fas fa-file-excel"></i>
                    📊 전체 Excel 다운로드
                </button>
            </div>
            
            <div id="tabButtons" class="flex space-x-2 mb-6 overflow-x-auto"></div>
            <div id="tabContents"></div>
        </div>
        
        <!-- 플로팅 액션 바 -->
        <div id="floatingActionBar" class="hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 shadow-2xl z-40">
            <div class="max-w-6xl mx-auto px-4 py-4">
                <div class="flex justify-center items-center gap-3">
                    <button
                        onclick="scrollToTop()"
                        class="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition font-semibold flex items-center gap-2 shadow-lg"
                    >
                        <i class="fas fa-home"></i>
                        🏠 처음으로
                    </button>
                    <button
                        onclick="quickRegenerate()"
                        class="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-semibold flex items-center gap-2 shadow-lg"
                    >
                        <i class="fas fa-redo"></i>
                        🔄 이 설정으로 다시 생성
                    </button>
                    <button
                        onclick="copyAndNew()"
                        class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold flex items-center gap-2 shadow-lg"
                    >
                        <i class="fas fa-copy"></i>
                        📋 복사해서 새로 만들기
                    </button>
                </div>
            </div>
        </div>

        <!-- 프로필 모달 -->
        <div id="profileModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-user-circle mr-2"></i>저장된 프로필
                    </h3>
                    <button onclick="closeModal('profileModal')" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <!-- 가져오기/내보내기 버튼 -->
                <div class="mb-4 flex gap-2">
                    <button
                        onclick="exportProfiles()"
                        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                        <i class="fas fa-download"></i>
                        프로필 내보내기 (JSON)
                    </button>
                    <label class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 cursor-pointer">
                        <i class="fas fa-upload"></i>
                        프로필 가져오기 (JSON)
                        <input
                            type="file"
                            accept=".json"
                            onchange="importProfiles(event)"
                            class="hidden"
                        />
                    </label>
                </div>
                
                <div id="profileList" class="space-y-3 overflow-y-auto flex-1"></div>
            </div>
        </div>

        <!-- 히스토리 모달 -->
        <div id="historyModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-history mr-2"></i>생성 히스토리
                    </h3>
                    <button onclick="closeModal('historyModal')" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <!-- 검색 & 필터 -->
                <div class="mb-4 space-y-3">
                    <div class="flex gap-3">
                        <div class="flex-1">
                            <input
                                type="text"
                                id="historySearch"
                                placeholder="🔍 브랜드명, 키워드로 검색..."
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                oninput="filterHistory()"
                            />
                        </div>
                        <button
                            onclick="exportHistoryAsExcel()"
                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                            title="전체 히스토리를 Excel로 내보내기"
                        >
                            <i class="fas fa-file-excel"></i>
                            Excel 내보내기
                        </button>
                    </div>
                    
                    <div class="flex gap-2 items-center">
                        <span class="text-sm text-gray-600 font-semibold">플랫폼:</span>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="blog" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">블로그</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="instagram" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">인스타</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="threads" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">스레드</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="youtube" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">유튜브</span>
                        </label>
                        <span class="mx-2 text-gray-300">|</span>
                        <span class="text-sm text-gray-600 font-semibold">정렬:</span>
                        <select id="historySortOrder" onchange="filterHistory()" class="text-sm px-2 py-1 border border-gray-300 rounded">
                            <option value="newest">최신순</option>
                            <option value="oldest">오래된순</option>
                            <option value="brand">브랜드명순</option>
                        </select>
                    </div>
                </div>
                
                <div id="historyList" class="space-y-3 overflow-y-auto flex-1"></div>
            </div>
        </div>

        <!-- 템플릿 관리 모달 -->
        <div id="templateModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-file-alt mr-2"></i>템플릿 관리
                    </h3>
                    <button onclick="closeModal('templateModal')" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                <div id="templateList" class="space-y-3"></div>
            </div>
        </div>

        <!-- 이미지 편집 모달 -->
        <div id="imageEditorModal" class="hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-image mr-2"></i>이미지 편집
                    </h3>
                    <button onclick="closeImageEditor()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>

                <div class="mb-6">
                    <canvas id="editCanvas" class="max-w-full border-2 border-gray-300 rounded-lg"></canvas>
                </div>

                <div class="flex flex-wrap gap-3 mb-6">
                    <button onclick="applyImageFilter('grayscale')" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                        <i class="fas fa-adjust mr-2"></i>흑백
                    </button>
                    <button onclick="applyImageFilter('brightness')" class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
                        <i class="fas fa-sun mr-2"></i>밝게
                    </button>
                    <button onclick="applyImageFilter('contrast')" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                        <i class="fas fa-circle-half-stroke mr-2"></i>대비
                    </button>
                    <button onclick="compressImage()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                        <i class="fas fa-compress mr-2"></i>압축 (70%)
                    </button>
                </div>

                <div class="flex gap-3 justify-end">
                    <button onclick="closeImageEditor()" class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                        <i class="fas fa-times mr-2"></i>취소
                    </button>
                    <button onclick="saveEditedImage()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-save mr-2"></i>저장
                    </button>
                </div>
            </div>
        </div>

        <!-- 배치 결과 표시 영역 -->
        <div id="batchResults" class="hidden mt-8"></div>
    </div>

    <!-- 토스트 메시지 컨테이너 -->
    <div id="toastContainer"></div>

    <script src="/static/i18n.js?v=5.3.2"></script>
    <script src="/static/app-v3-final.js?v=6.3.1"></script>
</body>
</html>
`;
