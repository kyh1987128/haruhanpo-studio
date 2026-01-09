export const htmlTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>콘텐츠잇다 AI Studio</title>
    
    <!-- Google Analytics (GA4) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXXXXX');
    </script>
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- FullCalendar CSS -->
    <link href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.css" rel="stylesheet">
    
    <!-- Flatpickr CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/themes/material_blue.css">
    
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
      
      /* FullCalendar 커스텀 스타일 */
      #fullCalendar {
        max-width: 100%;
        margin: 0 auto;
      }
      .fc {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      .fc-toolbar-title {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        color: #1f2937;
      }
      .fc-button {
        background: #667eea !important;
        border: none !important;
        text-transform: capitalize !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        padding: 8px 16px !important;
      }
      .fc-button:hover {
        background: #5568d3 !important;
      }
      .fc-button-active {
        background: #4c51bf !important;
      }
      .fc-daygrid-day {
        cursor: pointer;
      }
      .fc-daygrid-day:hover {
        background: #f3f4f6;
      }
      .fc-event {
        border-radius: 4px;
        padding: 2px 4px;
        font-size: 0.75rem;
        cursor: pointer;
        border: none !important;
      }
      .fc-event-scheduled {
        background: #3b82f6 !important;
        color: white;
      }
      .fc-event-published {
        background: #10b981 !important;
        color: white;
      }
      .fc-event-cancelled {
        background: #ef4444 !important;
        color: white;
      }
      .fc-event-draft {
        background: #6b7280 !important;
        color: white;
      }
    </style>
</head>
<body class="bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
    <div class="max-w-7xl mx-auto px-4 py-4">
        <!-- 네비게이션 바 -->
        <nav class="bg-white shadow-md rounded-2xl mb-8 px-6 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                    <h1 class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        하루한포 (PostFlow)
                    </h1>
                    <span class="text-sm text-gray-500">v7.0</span>
                </div>
                
                <div class="flex items-center space-x-4">
                    <!-- 사용자 정보 영역 -->
                    <div id="userInfoArea" class="hidden">
                        <div class="flex items-center space-x-3">
                            <div class="text-right">
                                <p class="text-sm font-semibold text-gray-700" id="userName">사용자</p>
                                <p class="text-xs text-gray-500">
                                    <span id="userTier" class="font-semibold">무료회원</span> | 
                                    <span id="userCredits" class="text-purple-600 font-bold">3</span> 크레딧
                                    <button onclick="showCreditDetailsModal()" class="ml-2 text-blue-600 hover:text-blue-700">
                                        <i class="fas fa-info-circle"></i>
                                    </button>
                                    <button onclick="showCreditPurchaseModal()" class="ml-2 px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs rounded-lg hover:shadow-lg transition">
                                        <i class="fas fa-plus mr-1"></i>충전
                                    </button>
                                </p>
                            </div>
                            <button id="logoutBtn" class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
                                <i class="fas fa-sign-out-alt mr-1"></i>로그아웃
                            </button>
                        </div>
                    </div>
                    
                    <!-- 게스트/로그인 버튼 영역 -->
                    <div id="guestArea">
                        <div class="flex items-center space-x-3">
                            <button id="signupBtn" class="px-4 py-2 bg-white text-purple-600 border-2 border-purple-600 rounded-lg hover:bg-purple-50 transition font-semibold">
                                회원가입
                            </button>
                            <button id="loginBtn" class="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-semibold">
                                <i class="fas fa-sign-in-alt mr-2"></i>로그인
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>

        <!-- 히어로 섹션 (비로그인 시만 표시) -->
        <div id="heroSection" class="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-xl p-12 mb-8 text-white text-center">
            <h2 class="text-4xl font-bold mb-4 flex items-center justify-center">
                ☕️ 하루 한 포스트, 커피 한 잔 가격으로
            </h2>
            <p class="text-xl mb-8 opacity-90">
                이미지를 업로드하면 AI가 블로그·인스타·유튜브 등<br>
                <strong>5개 플랫폼 맞춤 콘텐츠</strong>를 30초 안에 자동 생성합니다
            </p>
            
            <!-- 3단계 프로세스 카드 -->
            <div class="grid grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
                <div class="bg-white bg-opacity-20 rounded-xl p-6 backdrop-blur-sm hover:bg-opacity-30 transition">
                    <div class="text-5xl mb-3">📸</div>
                    <div class="font-bold text-lg mb-2">1. 이미지 업로드</div>
                    <div class="text-sm opacity-90">상품, 풍경, 일상<br>뭐든 OK!</div>
                </div>
                <div class="bg-white bg-opacity-20 rounded-xl p-6 backdrop-blur-sm hover:bg-opacity-30 transition">
                    <div class="text-5xl mb-3">🤖</div>
                    <div class="font-bold text-lg mb-2">2. AI 자동 분석</div>
                    <div class="text-sm opacity-90">키워드 추출<br>콘텐츠 생성</div>
                </div>
                <div class="bg-white bg-opacity-20 rounded-xl p-6 backdrop-blur-sm hover:bg-opacity-30 transition">
                    <div class="text-5xl mb-3">🚀</div>
                    <div class="font-bold text-lg mb-2">3. 즉시 발행</div>
                    <div class="text-sm opacity-90">5개 플랫폼<br>동시 게시</div>
                </div>
            </div>
            
            <!-- 가격 플랜 카드 -->
            <div class="bg-white bg-opacity-20 rounded-xl p-8 max-w-5xl mx-auto mb-6 backdrop-blur-sm">
                <div class="grid grid-cols-3 gap-8 text-center">
                    <div class="relative pt-8">
                        <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-purple-900 px-4 py-1 rounded-full text-xs font-bold">
                            🎁 NEW
                        </div>
                        <div class="text-6xl font-bold mb-2 mt-4">30</div>
                        <div class="text-2xl font-semibold mb-3">크레딧/월</div>
                        <div class="text-sm opacity-90 mb-4">
                            가입만 해도<br>
                            <strong class="text-lg">매달 무료!</strong>
                        </div>
                        <div class="inline-block bg-white bg-opacity-30 px-4 py-2 rounded-lg text-sm">
                            💰 매월 자동 충전
                        </div>
                    </div>
                    
                    <div class="relative pt-8">
                        <div class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse">
                            🔥 HOT
                        </div>
                        <div class="text-6xl font-bold mb-2 mt-4">₩9,000</div>
                        <div class="text-2xl font-semibold mb-3">50크레딧</div>
                        <div class="text-sm opacity-90 mb-4">
                            가장 인기 있는<br>
                            <strong class="text-lg">스타터 팩</strong>
                        </div>
                        <div class="inline-block bg-white bg-opacity-30 px-4 py-2 rounded-lg text-sm">
                            💎 10% 할인 적용
                        </div>
                    </div>
                    
                    <div class="pt-8">
                        <div class="text-6xl font-bold mb-2 mt-4">∞</div>
                        <div class="text-2xl font-semibold mb-3">추가 충전</div>
                        <div class="text-sm opacity-90 mb-4">
                            필요한 만큼만<br>
                            <strong class="text-lg">자유롭게</strong>
                        </div>
                        <div class="inline-block bg-white bg-opacity-30 px-4 py-2 rounded-lg text-sm">
                            💳 10개 / 100개
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 주요 혜택 -->
            <div class="grid grid-cols-3 gap-4 max-w-4xl mx-auto text-sm mb-8">
                <div class="flex items-center justify-center space-x-2 bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
                    <span class="text-2xl">⚡</span>
                    <span>30초 생성</span>
                </div>
                <div class="flex items-center justify-center space-x-2 bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
                    <span class="text-2xl">🎯</span>
                    <span>5개 플랫폼</span>
                </div>
                <div class="flex items-center justify-center space-x-2 bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
                    <span class="text-2xl">💰</span>
                    <span>합리적 가격</span>
                </div>
            </div>
            
            <!-- CTA 버튼 -->
            <div class="flex justify-center space-x-4">
                <button id="heroLoginBtn" class="px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:shadow-xl transition text-lg">
                    <i class="fas fa-rocket mr-2"></i>지금 시작하기
                </button>
            </div>
        </div>
        
        <!-- 회원 전용 기능 버튼 (로그인 후 표시) -->
        <div id="memberFeaturesArea" class="hidden bg-white rounded-2xl shadow-md p-6 mb-8">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-700">
                    <i class="fas fa-star mr-2 text-yellow-500"></i>회원 전용 기능
                </h3>
                <span class="text-xs text-gray-500">프로필 저장, 히스토리, 템플릿 관리</span>
            </div>
            <div class="flex justify-center space-x-3 flex-wrap gap-2">
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

        <!-- 📅 콘텐츠 관리 캘린더 (Phase 3 - 완전 개편) -->
        <div id="scheduledContentArea" class="hidden bg-white rounded-2xl shadow-md p-6 mb-8">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-700">
                    <i class="fas fa-calendar-alt mr-2 text-blue-500"></i>콘텐츠 관리 캘린더
                </h3>
                <div class="flex gap-2">
                    <button onclick="openQuickAddModal()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
                        <i class="fas fa-plus mr-1"></i>빠른 등록
                    </button>
                    <button onclick="toggleCalendarView()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                        <i class="fas fa-list mr-1"></i>목록 보기
                    </button>
                </div>
            </div>
            
            <!-- 뷰 전환 -->
            <div id="calendarViewContainer">
                <!-- 달력 뷰 (기본) -->
                <div id="calendarView">
                    <div id="fullCalendar" class="bg-white rounded-lg"></div>
                </div>
                
                <!-- 리스트 뷰 (숨김) -->
                <div id="listView" class="hidden">
                    <!-- 필터 버튼 -->
                    <div class="flex space-x-2 mb-4 flex-wrap gap-2">
                        <button onclick="loadScheduledContent('all')" class="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm">
                            전체
                        </button>
                        <button onclick="loadScheduledContent('scheduled')" class="px-3 py-1 bg-blue-200 text-blue-700 rounded-lg hover:bg-blue-300 transition text-sm">
                            📅 예정
                        </button>
                        <button onclick="loadScheduledContent('published')" class="px-3 py-1 bg-green-200 text-green-700 rounded-lg hover:bg-green-300 transition text-sm">
                            ✅ 발행완료
                        </button>
                        <button onclick="loadScheduledContent('cancelled')" class="px-3 py-1 bg-red-200 text-red-700 rounded-lg hover:bg-red-300 transition text-sm">
                            ❌ 취소
                        </button>
                    </div>
                    
                    <!-- 발행 예정 목록 -->
                    <div id="scheduledContentList" class="space-y-3">
                        <div class="text-center text-gray-500 py-8">
                            <i class="fas fa-calendar-check text-4xl mb-3 text-gray-300"></i>
                            <p>발행 예정된 콘텐츠가 없습니다.</p>
                            <p class="text-xs text-gray-400 mt-2">히스토리에서 콘텐츠의 발행 예정일을 설정할 수 있습니다.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 날짜/시간 선택 모달 -->
        <div id="dateTimeModal" class="hidden fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 w-full">
                <div class="text-center mb-6">
                    <div class="text-5xl mb-4">📅</div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">발행 예정일 설정</h3>
                    <p class="text-gray-600 text-sm" id="dateTimeModalPlatform"></p>
                </div>
                
                <div class="mb-6">
                    <label class="block mb-2 font-semibold text-gray-700">
                        <i class="fas fa-calendar mr-2"></i>발행 예정일
                    </label>
                    <input
                        type="text"
                        id="dateTimePicker"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="날짜와 시간을 선택하세요"
                        readonly
                    />
                </div>
                
                <div class="flex gap-3">
                    <button onclick="closeDateTimeModal()" class="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                        취소
                    </button>
                    <button onclick="confirmDateTimeSelection()" class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                        확인
                    </button>
                </div>
            </div>
        </div>

        <!-- 빠른 등록 모달 -->
        <div id="quickAddModal" class="hidden fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl mx-4 w-full">
                <div class="text-center mb-6">
                    <div class="text-5xl mb-4">🚀</div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">빠른 콘텐츠 등록</h3>
                    <p class="text-gray-600 text-sm">캘린더에 새 콘텐츠를 등록하세요</p>
                </div>
                
                <div class="space-y-4 mb-6">
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-tag mr-2"></i>플랫폼 선택
                        </label>
                        <select id="quickAddPlatform" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="blog">📝 네이버블로그</option>
                            <option value="instagram">📷 인스타그램</option>
                            <option value="instagramFeed">📷 인스타그램 피드</option>
                            <option value="threads">🧵 스레드</option>
                            <option value="youtube">🎥 유튜브 숏폼</option>
                            <option value="youtubeLongform">🎬 유튜브 롱폼</option>
                            <option value="linkedin">💼 LinkedIn</option>
                            <option value="facebook">👍 페이스북</option>
                            <option value="twitter">🐦 트위터(X)</option>
                            <option value="kakaotalk">💬 카카오톡</option>
                            <option value="naverband">🎵 네이버 밴드</option>
                            <option value="telegram">✈️ 텔레그램</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-calendar mr-2"></i>발행 예정일
                        </label>
                        <input
                            type="text"
                            id="quickAddDateTime"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="날짜와 시간을 선택하세요"
                            readonly
                        />
                    </div>
                    
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-file-alt mr-2"></i>메모 (선택)
                        </label>
                        <textarea
                            id="quickAddMemo"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="콘텐츠에 대한 간단한 메모를 입력하세요"
                            rows="3"
                        ></textarea>
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <button onclick="closeQuickAddModal()" class="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                        취소
                    </button>
                    <button onclick="confirmQuickAdd()" class="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold">
                        등록
                    </button>
                </div>
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

                <!-- 🔥 NEW v6.1: 하이브리드 전략 선택 -->
                <div class="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200">
                    <div class="flex items-start mb-4">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                                <i class="fas fa-brain text-white text-lg"></i>
                            </div>
                        </div>
                        <div class="ml-4 flex-1">
                            <h3 class="text-lg font-bold text-gray-800 mb-1">
                                🧠 하이브리드 AI 전략 선택 
                                <span class="ml-2 text-xs bg-purple-600 text-white px-2 py-1 rounded-full">NEW v6.1</span>
                            </h3>
                            <p class="text-sm text-gray-600">
                                이미지와 변수(키워드/산업/톤/타깃)의 우선순위를 어떻게 조정할까요?
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <!-- 자동 선택 (권장) -->
                        <label class="relative cursor-pointer">
                            <input type="radio" name="contentStrategy" value="auto" checked class="peer sr-only">
                            <div class="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-green-500 peer-checked:bg-green-50 hover:border-green-300 transition-all">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-lg">🤖</span>
                                    <span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full peer-checked:block hidden">선택됨</span>
                                </div>
                                <div class="font-bold text-gray-800 mb-1">자동 선택 ✅</div>
                                <div class="text-xs text-gray-600 leading-relaxed">
                                    AI가 이미지-변수 일치도를 분석해서 최적의 전략을 자동으로 선택합니다
                                </div>
                                <div class="mt-2 text-xs text-green-600 font-semibold">
                                    💡 권장 옵션
                                </div>
                            </div>
                        </label>

                        <!-- 통합형 (균형) -->
                        <label class="relative cursor-pointer">
                            <input type="radio" name="contentStrategy" value="integrated" class="peer sr-only">
                            <div class="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-purple-500 peer-checked:bg-purple-50 hover:border-purple-300 transition-all">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-lg">⚖️</span>
                                    <span class="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full peer-checked:block hidden">선택됨</span>
                                </div>
                                <div class="font-bold text-gray-800 mb-1">통합형</div>
                                <div class="text-xs text-gray-600 leading-relaxed">
                                    이미지 시각적 묘사 + 변수로 맥락/타깃팅 균형있게 활용
                                </div>
                                <div class="mt-2 text-xs text-purple-600">
                                    예: 카페 사진 + "브런치" → 둘 다 활용
                                </div>
                            </div>
                        </label>

                        <!-- 이미지 중심 -->
                        <label class="relative cursor-pointer">
                            <input type="radio" name="contentStrategy" value="image-first" class="peer sr-only">
                            <div class="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:border-blue-300 transition-all">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-lg">📸</span>
                                    <span class="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full peer-checked:block hidden">선택됨</span>
                                </div>
                                <div class="font-bold text-gray-800 mb-1">이미지 중심</div>
                                <div class="text-xs text-gray-600 leading-relaxed">
                                    이미지에 실제로 보이는 것을 중심으로 작성, 변수는 보조
                                </div>
                                <div class="mt-2 text-xs text-blue-600">
                                    예: 명확한 제품 사진 → 이미지 우선
                                </div>
                            </div>
                        </label>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- 변수 중심 (SEO) -->
                        <label class="relative cursor-pointer">
                            <input type="radio" name="contentStrategy" value="keyword-first" class="peer sr-only">
                            <div class="p-4 border-2 border-gray-300 rounded-lg peer-checked:border-orange-500 peer-checked:bg-orange-50 hover:border-orange-300 transition-all">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-lg">🔑</span>
                                    <span class="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full peer-checked:block hidden">선택됨</span>
                                </div>
                                <div class="font-bold text-gray-800 mb-1">변수 중심 (SEO 최우선)</div>
                                <div class="text-xs text-gray-600 leading-relaxed">
                                    키워드/산업/톤/타깃 변수를 우선 활용, 이미지는 무시/배경
                                </div>
                                <div class="mt-2 text-xs text-orange-600">
                                    예: 이미지와 키워드 불일치 → SEO 우선
                                </div>
                            </div>
                        </label>

                        <!-- 전략 설명 펼치기/접기 -->
                        <div class="flex items-center justify-center">
                            <button 
                                type="button"
                                id="strategyToggle"
                                class="w-full h-full px-6 py-4 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-purple-400 transition-all text-center"
                            >
                                <i class="fas fa-info-circle text-purple-600 text-2xl mb-2"></i>
                                <div class="font-semibold text-gray-700 text-sm">전략 자세히 보기</div>
                                <div class="text-xs text-gray-500 mt-1">각 전략의 차이점 확인</div>
                            </button>
                        </div>
                    </div>

                    <!-- 전략 상세 설명 (접힌 상태) -->
                    <div id="strategyDetails" class="hidden mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h4 class="font-bold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>
                            전략별 상세 설명
                        </h4>
                        
                        <div class="space-y-3 text-sm">
                            <div class="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                                <div class="font-bold text-green-800 mb-1">🤖 자동 선택 (권장)</div>
                                <div class="text-gray-700 text-xs leading-relaxed">
                                    • AI가 이미지-변수 일치도를 0-100점으로 자동 분석<br>
                                    • 70점 이상: 통합형 / 50-69점: 이미지 중심 / 50점 미만: 변수 중심<br>
                                    • 30점 미만이면 경고 후 사용자 확인<br>
                                    • <strong>가장 자연스러운 콘텐츠 보장 ✅</strong>
                                </div>
                            </div>

                            <div class="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                                <div class="font-bold text-purple-800 mb-1">⚖️ 통합형</div>
                                <div class="text-gray-700 text-xs leading-relaxed">
                                    • 이미지: 시각적 요소 구체 묘사 (제품 외관, 색상, 분위기)<br>
                                    • 변수: 맥락, 타깃팅, SEO 키워드 자연스럽게 삽입<br>
                                    • 예: "이 카페의 브런치 플레이트 (이미지) + 20-30대 감성 (변수)"
                                </div>
                            </div>

                            <div class="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                <div class="font-bold text-blue-800 mb-1">📸 이미지 중심</div>
                                <div class="text-gray-700 text-xs leading-relaxed">
                                    • 이미지에 실제로 보이는 것을 중심으로 작성<br>
                                    • 변수는 자연스럽게 연결될 때만 사용<br>
                                    • 예: 명확한 제품 사진 → 제품 중심 작성, 키워드는 보조
                                </div>
                            </div>

                            <div class="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                                <div class="font-bold text-orange-800 mb-1">🔑 변수 중심 (SEO)</div>
                                <div class="text-gray-700 text-xs leading-relaxed">
                                    • 키워드, 산업분야, 톤앤매너, 타깃 연령대를 필수 반영<br>
                                    • 이미지는 배경 요소로만 활용하거나 무시<br>
                                    • 키워드 밀도 1-2% 유지 필수<br>
                                    • 예: 이미지와 키워드 불일치 → 키워드 중심 SEO 최적화
                                </div>
                            </div>
                        </div>

                        <div class="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div class="flex items-start">
                                <i class="fas fa-exclamation-triangle text-yellow-600 mt-0.5 mr-2"></i>
                                <div class="text-xs text-gray-700">
                                    <strong>언제 수동 선택하나요?</strong><br>
                                    • 특정 전략을 강제하고 싶을 때 (예: SEO 우선 필수)<br>
                                    • AI 자동 선택 결과가 만족스럽지 않을 때<br>
                                    • <strong>대부분의 경우 "자동 선택"을 권장합니다 ✅</strong>
                                </div>
                            </div>
                        </div>
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
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition">
                                <input type="checkbox" name="platform" value="twitter" class="w-5 h-5 text-blue-400">
                                <span class="font-medium text-sm">🐦 트위터(X)</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition">
                                <input type="checkbox" name="platform" value="linkedin" class="w-5 h-5 text-blue-600">
                                <span class="font-medium text-sm">💼 LinkedIn</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer hover:bg-yellow-50 transition">
                                <input type="checkbox" name="platform" value="kakaotalk" class="w-5 h-5 text-yellow-400">
                                <span class="font-medium text-sm">💬 카카오톡</span>
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
                    
                    <div class="flex gap-2 items-center flex-wrap">
                        <span class="text-sm text-gray-600 font-semibold">콘텐츠 유형:</span>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="blog" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">📝 블로그</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="instagram_feed" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">📸 인스타 피드</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="instagram_reels" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">🎬 인스타 릴스</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="threads" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">🧵 스레드</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="twitter" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">🐦 트위터(X)</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="linkedin" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">💼 LinkedIn</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="kakaotalk" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">💬 카카오톡</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="tiktok" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">🎵 틱톡</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="youtube_shorts" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">🎬 유튜브 쇼츠</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="youtube_longform" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">🎥 유튜브 롱폼</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" value="shortform_multi" checked onchange="filterHistory()" class="history-platform-filter">
                            <span class="text-sm">📱 숏폼 통합</span>
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

    <!-- 🔥 NEW v6.1: 전략 토글 스크립트 -->
    <script>
        // 전략 상세 설명 토글
        document.addEventListener('DOMContentLoaded', function() {
            const strategyToggle = document.getElementById('strategyToggle');
            const strategyDetails = document.getElementById('strategyDetails');
            
            if (strategyToggle && strategyDetails) {
                strategyToggle.addEventListener('click', function() {
                    strategyDetails.classList.toggle('hidden');
                    
                    // 아이콘 회전
                    const icon = this.querySelector('i');
                    if (strategyDetails.classList.contains('hidden')) {
                        icon.classList.remove('fa-chevron-up');
                        icon.classList.add('fa-info-circle');
                        this.querySelector('.font-semibold').textContent = '전략 자세히 보기';
                    } else {
                        icon.classList.remove('fa-info-circle');
                        icon.classList.add('fa-chevron-up');
                        this.querySelector('.font-semibold').textContent = '전략 설명 접기';
                    }
                });
            }
        });
    </script>

    <!-- 푸터 (환불정책 포함) -->
    <footer class="bg-gray-900 text-gray-300 py-12 mt-20">
        <div class="max-w-7xl mx-auto px-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <!-- 서비스 정보 -->
                <div>
                    <h3 class="text-white text-lg font-bold mb-4">☕️ 하루한포 AI Studio</h3>
                    <p class="text-sm text-gray-400 mb-4">
                        이미지를 업로드하면 AI가 블로그·인스타·유튜브 등<br>
                        5개 플랫폼 맞춤 콘텐츠를 30초 안에 자동 생성합니다.
                    </p>
                    <div class="flex gap-4">
                        <a href="mailto:contentitda@naver.com" class="text-blue-400 hover:text-blue-300 transition">
                            <i class="fas fa-envelope"></i> contentitda@naver.com
                        </a>
                    </div>
                </div>

                <!-- 빠른 링크 -->
                <div>
                    <h3 class="text-white text-lg font-bold mb-4">빠른 링크</h3>
                    <ul class="space-y-2 text-sm">
                        <li><a href="#" onclick="showRefundPolicy(); return false;" class="hover:text-white transition">환불 정책</a></li>
                        <li><a href="#" onclick="showPrivacyPolicy(); return false;" class="hover:text-white transition">개인정보 처리방침</a></li>
                        <li><a href="#" onclick="showTermsOfService(); return false;" class="hover:text-white transition">서비스 이용약관</a></li>
                        <li><a href="mailto:contentitda@naver.com" class="hover:text-white transition">문의하기</a></li>
                    </ul>
                </div>

                <!-- 크레딧 정책 -->
                <div>
                    <h3 class="text-white text-lg font-bold mb-4">크레딧 정책</h3>
                    <ul class="space-y-2 text-sm text-gray-400">
                        <li><i class="fas fa-check text-green-400 mr-2"></i>콘텐츠 1개 생성 = 1 크레딧</li>
                        <li><i class="fas fa-check text-green-400 mr-2"></i>크레딧 유효기간: 구매일로부터 1년</li>
                        <li><i class="fas fa-check text-green-400 mr-2"></i>미사용 크레딧 환불 가능 (7일 이내)</li>
                        <li><i class="fas fa-info-circle text-blue-400 mr-2"></i>자세한 내용은 환불 정책 참조</li>
                    </ul>
                </div>
            </div>

            <!-- 저작권 및 법적 고지 -->
            <div class="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
                <p class="mb-2">© 2026 하루한포 AI Studio. All rights reserved.</p>
                <p class="text-xs">
                    본 서비스는 AI 기술을 활용한 콘텐츠 생성 도구입니다. 
                    생성된 콘텐츠의 저작권은 사용자에게 있으며, 
                    법적 책임은 사용자에게 있습니다.
                </p>
            </div>
        </div>
    </footer>

    <!-- 환불 정책 모달 -->
    <div id="refundPolicyModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" style="display: none;">
        <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">
                        <i class="fas fa-undo mr-2"></i>환불 정책
                    </h2>
                    <button onclick="closeRefundPolicyModal()" class="text-white hover:text-gray-200 text-3xl font-bold">&times;</button>
                </div>
            </div>

            <div class="p-8">
                <div class="mb-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-3">
                        <i class="fas fa-info-circle text-blue-600 mr-2"></i>환불 기본 원칙
                    </h3>
                    <p class="text-gray-600 leading-relaxed">
                        하루한포 AI Studio는 고객님의 권익 보호를 최우선으로 생각합니다. 
                        아래 환불 정책에 따라 공정하고 투명하게 환불 처리를 진행합니다.
                    </p>
                </div>

                <div class="mb-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                    <h4 class="font-bold text-gray-800 mb-2">
                        <i class="fas fa-check-circle text-green-600 mr-2"></i>환불 가능 조건
                    </h4>
                    <ul class="list-disc list-inside space-y-2 text-gray-700">
                        <li><strong>구매일로부터 7일 이내</strong> 환불 요청 시</li>
                        <li><strong>크레딧 미사용 또는 30% 이하 사용</strong> 시</li>
                        <li><strong>서비스 오류로 인한 크레딧 차감</strong> 시 (즉시 환불)</li>
                        <li><strong>중복 결제</strong> 발생 시 (즉시 환불)</li>
                    </ul>
                </div>

                <div class="mb-6 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
                    <h4 class="font-bold text-gray-800 mb-2">
                        <i class="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>환불 불가 조건
                    </h4>
                    <ul class="list-disc list-inside space-y-2 text-gray-700">
                        <li>구매일로부터 <strong>7일 경과</strong> 후</li>
                        <li>크레딧 <strong>30% 초과 사용</strong> 시</li>
                        <li>생성된 콘텐츠를 <strong>이미 다운로드하거나 복사</strong>한 경우</li>
                        <li>무료 체험 크레딧 (환불 대상 아님)</li>
                    </ul>
                </div>

                <div class="mb-6">
                    <h4 class="font-bold text-gray-800 mb-3">
                        <i class="fas fa-calculator text-purple-600 mr-2"></i>환불 금액 계산
                    </h4>
                    <table class="w-full border-collapse border border-gray-300">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="border border-gray-300 px-4 py-2 text-left">사용 크레딧</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">환불 비율</th>
                                <th class="border border-gray-300 px-4 py-2 text-left">예시</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="border border-gray-300 px-4 py-2">0% (미사용)</td>
                                <td class="border border-gray-300 px-4 py-2 text-green-600 font-bold">100% 환불</td>
                                <td class="border border-gray-300 px-4 py-2">10,000원 → 10,000원 환불</td>
                            </tr>
                            <tr class="bg-gray-50">
                                <td class="border border-gray-300 px-4 py-2">1~10%</td>
                                <td class="border border-gray-300 px-4 py-2 text-green-600 font-bold">90% 환불</td>
                                <td class="border border-gray-300 px-4 py-2">10,000원 → 9,000원 환불</td>
                            </tr>
                            <tr>
                                <td class="border border-gray-300 px-4 py-2">11~20%</td>
                                <td class="border border-gray-300 px-4 py-2 text-blue-600 font-bold">80% 환불</td>
                                <td class="border border-gray-300 px-4 py-2">10,000원 → 8,000원 환불</td>
                            </tr>
                            <tr class="bg-gray-50">
                                <td class="border border-gray-300 px-4 py-2">21~30%</td>
                                <td class="border border-gray-300 px-4 py-2 text-yellow-600 font-bold">70% 환불</td>
                                <td class="border border-gray-300 px-4 py-2">10,000원 → 7,000원 환불</td>
                            </tr>
                            <tr>
                                <td class="border border-gray-300 px-4 py-2">31% 이상</td>
                                <td class="border border-gray-300 px-4 py-2 text-red-600 font-bold">환불 불가</td>
                                <td class="border border-gray-300 px-4 py-2">-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="mb-6">
                    <h4 class="font-bold text-gray-800 mb-3">
                        <i class="fas fa-clock text-blue-600 mr-2"></i>환불 처리 기간
                    </h4>
                    <ul class="list-disc list-inside space-y-2 text-gray-700">
                        <li><strong>신용카드</strong>: 환불 승인 후 3~7 영업일</li>
                        <li><strong>계좌이체</strong>: 환불 승인 후 1~3 영업일</li>
                        <li><strong>간편결제</strong>: 각 PG사 정책에 따름 (3~7 영업일)</li>
                    </ul>
                </div>

                <div class="mb-6 bg-red-50 p-4 rounded-lg border-l-4 border-red-600">
                    <h4 class="font-bold text-gray-800 mb-2">
                        <i class="fas fa-ban text-red-600 mr-2"></i>환불 거부 사유
                    </h4>
                    <ul class="list-disc list-inside space-y-2 text-gray-700">
                        <li>허위 환불 요청 또는 악용 목적</li>
                        <li>생성된 콘텐츠를 상업적으로 이미 사용한 경우</li>
                        <li>환불 정책을 위반한 경우</li>
                    </ul>
                </div>

                <div class="bg-gray-100 p-4 rounded-lg">
                    <h4 class="font-bold text-gray-800 mb-2">
                        <i class="fas fa-phone text-green-600 mr-2"></i>환불 요청 방법
                    </h4>
                    <p class="text-gray-700 mb-2">
                        환불을 원하시면 아래 방법으로 문의해주세요:
                    </p>
                    <ul class="list-disc list-inside space-y-1 text-gray-700">
                        <li>이메일: <a href="mailto:refund@haruhanpo.com" class="text-blue-600 hover:underline">refund@haruhanpo.com</a></li>
                        <li>고객센터: 055-606-0826 (평일 09:00~18:00)</li>
                        <li>필수 정보: 주문번호, 구매일자, 환불 사유</li>
                    </ul>
                </div>

                <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 class="font-semibold text-gray-800 mb-2">
                        <i class="fas fa-gift text-yellow-600 mr-2"></i>래퍼럴(친구 초대) 보상 정책
                    </h4>
                    <ul class="text-sm text-gray-700 space-y-1 ml-6">
                        <li><i class="fas fa-check-circle text-yellow-600 mr-2"></i><strong>추천인 보상:</strong> 친구가 첫 유료 충전 시 5 크레딧 지급</li>
                        <li><i class="fas fa-check-circle text-yellow-600 mr-2"></i><strong>피추천인 보상:</strong> 회원가입 시 2 크레딧 즉시 지급</li>
                        <li><i class="fas fa-check-circle text-yellow-600 mr-2"></i><strong>보상 유효기간:</strong> 추천 코드 사용 후 30일 이내 첫 충전 시 적용</li>
                        <li><i class="fas fa-info-circle text-yellow-600 mr-2"></i>래퍼럴 시스템은 개발 중이며, 곧 출시될 예정입니다.</li>
                    </ul>
                </div>

                <div class="mt-6 text-sm text-gray-500">
                    <p><i class="fas fa-info-circle mr-2"></i>본 환불 정책은 전자상거래 등에서의 소비자보호에 관한 법률에 따라 작성되었습니다.</p>
                    <p class="mt-1"><i class="fas fa-calendar-alt mr-2"></i>최종 업데이트: 2026년 1월 2일</p>
                </div>
            </div>

            <div class="sticky bottom-0 bg-gray-50 p-6 rounded-b-xl border-t">
                <button onclick="closeRefundPolicyModal()" class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                    <i class="fas fa-check mr-2"></i>확인
                </button>
            </div>
        </div>
    </div>

    <script>
        // 환불 정책 모달 열기/닫기
        function showRefundPolicy() {
            document.getElementById('refundPolicyModal').style.display = 'flex';
        }
        function closeRefundPolicyModal() {
            document.getElementById('refundPolicyModal').style.display = 'none';
        }
        function showPrivacyPolicy() {
            document.getElementById('privacyPolicyModal').style.display = 'flex';
        }
        function closePrivacyPolicy() {
            document.getElementById('privacyPolicyModal').style.display = 'none';
        }
        function showTermsOfService() {
            document.getElementById('termsOfServiceModal').style.display = 'flex';
        }
        function closeTermsOfService() {
            document.getElementById('termsOfServiceModal').style.display = 'none';
        }
        
        // 크레딧 상세 정보 모달
        function showCreditDetailsModal() {
            const credits = document.getElementById('userCredits')?.textContent || '0';
            alert(\`크레딧 상세 내역:\\n\\n잔액: \${credits} 크레딧\\n\\n크레딧 사용 내역은 개발 중입니다.\`);
        }
        
        // 크레딧 충전 모달
        function showCreditPurchaseModal() {
            const confirmed = confirm(\`크레딧 충전 페이지로 이동하시겠습니까?\\n\\n충전 옵션:\\n- STARTER (10크레딧): ₩2,000\\n- PRO (50크레딧): ₩9,000 (10% 할인) 🔥\\n- BUSINESS (100크레딧): ₩17,000 (15% 할인)\`);
            if (confirmed) {
                window.location.href = '/static/payment.html';
            }
        }
    </script>

    <!-- 종합 검증 모달 -->
    <div id="validationModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.6); align-items: center; justify-content: center;">
      <div class="modal-content" style="background-color: #fefefe; padding: 30px; border-radius: 16px; width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto; margin: 50px auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="font-size: 1.5rem; font-weight: bold; color: #dc2626;">
            <i class="fas fa-exclamation-triangle"></i> 입력 정보 검증
          </h2>
          <button onclick="closeValidationModal()" style="font-size: 28px; font-weight: bold; color: #aaa; cursor: pointer; border: none; background: none;">&times;</button>
        </div>
        
        <!-- 전체 신뢰도 -->
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; color: #92400e;">
              <i class="fas fa-chart-line"></i> 일관성 신뢰도:
            </span>
            <span id="validationConfidence" style="font-weight: 700; font-size: 1.1rem; color: #b45309;">0%</span>
          </div>
          <p style="margin-top: 8px; color: #78350f; font-size: 0.9rem;">
            <i class="fas fa-info-circle"></i> 기준: 40% 이상 권장
          </p>
        </div>
        
        <!-- 충돌 목록 -->
        <div id="conflictsList" style="margin-bottom: 20px;">
          <!-- 동적으로 생성 -->
        </div>
        
        <!-- 전략 및 이유 -->
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="font-weight: 600; margin-bottom: 10px; color: #1f2937;">
            <i class="fas fa-lightbulb"></i> 선택된 전략
          </h3>
          <p id="validationReason" style="color: #4b5563; line-height: 1.6;">-</p>
        </div>
        
        <!-- 권장 사항 -->
        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
          <h3 style="font-weight: 600; margin-bottom: 10px; color: #1e40af;">
            <i class="fas fa-clipboard-check"></i> 권장 사항
          </h3>
          <p id="validationRecommendation" style="color: #1e3a8a; line-height: 1.6;">-</p>
        </div>
        
        <!-- 품질 경고 -->
        <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
          <h3 style="font-weight: 600; margin-bottom: 10px; color: #991b1b;">
            <i class="fas fa-exclamation-circle"></i> 품질 경고
          </h3>
          <p style="color: #7f1d1d; line-height: 1.6;">
            현재 입력된 정보로 생성 시 <strong>콘텐츠 품질이 낮을 수 있습니다</strong>. 
            입력 정보를 수정하거나, 그래도 진행하시려면 아래 버튼을 클릭하세요.
          </p>
          <p style="margin-top: 10px; color: #7f1d1d; font-size: 0.9rem;">
            ⚠️ 강제 진행 시에도 <strong>크레딧은 정상적으로 차감</strong>됩니다.
          </p>
        </div>
        
        <!-- 버튼 -->
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="closeValidationModal()" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-times"></i> 닫기 (수정하기)
          </button>
          <button onclick="forceGenerate()" style="padding: 12px 24px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-bolt"></i> 무시하고 진행
          </button>
        </div>
      </div>
    </div>

    <!-- 개인정보 처리방침 모달 -->
    <div id="privacyPolicyModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.6); align-items: center; justify-content: center;">
      <div class="modal-content" style="background-color: #fefefe; padding: 30px; border-radius: 16px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; margin: 50px auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f59e0b; padding-bottom: 15px;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #1f2937;">
            <i class="fas fa-shield-alt"></i> 개인정보 처리방침
          </h2>
          <button onclick="closePrivacyPolicy()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div style="line-height: 1.8; color: #374151;">
          <p style="margin-bottom: 20px; color: #6b7280;">시행일자: 2026년 1월 2일</p>
          
          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">1. 개인정보의 수집 및 이용 목적</h3>
          <p style="margin-bottom: 15px;">
            하루한포 스튜디오(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다:
          </p>
          <ul style="list-style: disc; margin-left: 20px; margin-bottom: 15px;">
            <li>회원 가입 및 관리</li>
            <li>AI 콘텐츠 생성 서비스 제공</li>
            <li>서비스 이용 내역 관리 및 요금 정산</li>
            <li>고객 문의 및 불만 처리</li>
            <li>서비스 개선 및 신규 서비스 개발</li>
          </ul>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">2. 수집하는 개인정보의 항목</h3>
          <p style="margin-bottom: 10px;"><strong>필수 항목:</strong></p>
          <ul style="list-style: disc; margin-left: 20px; margin-bottom: 15px;">
            <li>이메일 주소</li>
            <li>비밀번호 (암호화 저장)</li>
            <li>서비스 이용 기록</li>
          </ul>
          <p style="margin-bottom: 10px;"><strong>선택 항목:</strong></p>
          <ul style="list-style: disc; margin-left: 20px; margin-bottom: 15px;">
            <li>업로드한 이미지 (콘텐츠 생성용)</li>
            <li>브랜드명, 키워드 등 입력 정보</li>
          </ul>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">3. 개인정보의 보유 및 이용 기간</h3>
          <p style="margin-bottom: 15px;">
            회원 탈퇴 시까지 보유하며, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다:
          </p>
          <ul style="list-style: disc; margin-left: 20px; margin-bottom: 15px;">
            <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
            <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
            <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
          </ul>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">4. 개인정보의 제3자 제공</h3>
          <p style="margin-bottom: 15px;">
            회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다:
          </p>
          <ul style="list-style: disc; margin-left: 20px; margin-bottom: 15px;">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">5. 개인정보의 처리 위탁</h3>
          <p style="margin-bottom: 10px;">회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다:</p>
          <ul style="list-style: disc; margin-left: 20px; margin-bottom: 15px;">
            <li>Supabase: 회원 정보 및 데이터 저장</li>
            <li>OpenAI, Google Gemini: AI 콘텐츠 생성 (이미지 분석 및 텍스트 생성)</li>
            <li>Cloudflare: 웹 호스팅 및 CDN 서비스</li>
          </ul>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">6. 정보주체의 권리·의무 및 행사방법</h3>
          <p style="margin-bottom: 15px;">
            이용자는 언제든지 다음의 권리를 행사할 수 있습니다:
          </p>
          <ul style="list-style: disc; margin-left: 20px; margin-bottom: 15px;">
            <li>개인정보 열람 요구</li>
            <li>개인정보 정정·삭제 요구</li>
            <li>개인정보 처리정지 요구</li>
          </ul>
          <p style="margin-bottom: 15px;">
            권리 행사는 서면, 전화, 이메일 등을 통해 가능하며, 회사는 지체 없이 조치하겠습니다.
          </p>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">7. 개인정보 보호책임자</h3>
          <p style="margin-bottom: 15px;">
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
          </p>
          <ul style="list-style: none; margin-left: 0; margin-bottom: 15px;">
            <li><strong>이메일:</strong> contentitda@naver.com</li>
            <li><strong>전화번호:</strong> 055-606-0826</li>
          </ul>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">8. 개인정보 처리방침의 변경</h3>
          <p style="margin-bottom: 15px;">
            이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
          </p>
        </div>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <button onclick="closePrivacyPolicy()" style="padding: 12px 24px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-check"></i> 확인
          </button>
        </div>
      </div>
    </div>

    <!-- 서비스 이용약관 모달 -->
    <div id="termsOfServiceModal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.6); align-items: center; justify-content: center;">
      <div class="modal-content" style="background-color: #fefefe; padding: 30px; border-radius: 16px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; margin: 50px auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f59e0b; padding-bottom: 15px;">
          <h2 style="font-size: 1.5rem; font-weight: 700; color: #1f2937;">
            <i class="fas fa-file-contract"></i> 서비스 이용약관
          </h2>
          <button onclick="closeTermsOfService()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div style="line-height: 1.8; color: #374151;">
          <p style="margin-bottom: 20px; color: #6b7280;">시행일자: 2026년 1월 2일</p>
          
          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제1조 (목적)</h3>
          <p style="margin-bottom: 15px;">
            본 약관은 하루한포 스튜디오(이하 "회사")가 제공하는 AI 콘텐츠 생성 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제2조 (정의)</h3>
          <ul style="list-style: decimal; margin-left: 20px; margin-bottom: 15px;">
            <li>"서비스"란 회사가 제공하는 AI 기반 멀티 플랫폼 콘텐츠 생성 서비스를 의미합니다.</li>
            <li>"이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li>"회원"이란 회사와 서비스 이용계약을 체결하고 아이디를 부여받은 자를 말합니다.</li>
            <li>"크레딧"이란 서비스 이용을 위해 회사가 발행하는 가상의 결제 수단을 말합니다.</li>
          </ul>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제3조 (약관의 효력 및 변경)</h3>
          <p style="margin-bottom: 15px;">
            1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.<br>
            2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 약관이 변경되는 경우 변경사항을 시행일자 7일 전에 공지합니다.<br>
            3. 이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 회원 탈퇴를 할 수 있습니다.
          </p>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제4조 (회원가입)</h3>
          <p style="margin-bottom: 15px;">
            1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.<br>
            2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:
          </p>
          <ul style="list-style: disc; margin-left: 40px; margin-bottom: 15px;">
            <li>타인의 명의를 이용한 경우</li>
            <li>허위 정보를 기재한 경우</li>
            <li>사회의 안녕과 질서 또는 미풍양속을 저해할 목적으로 신청한 경우</li>
            <li>기타 회사가 정한 이용신청 요건을 충족하지 못한 경우</li>
          </ul>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제5조 (서비스의 제공 및 변경)</h3>
          <p style="margin-bottom: 15px;">
            1. 회사는 다음과 같은 서비스를 제공합니다:
          </p>
          <ul style="list-style: disc; margin-left: 40px; margin-bottom: 15px;">
            <li>AI 기반 이미지 분석 서비스</li>
            <li>블로그, 인스타그램, 스레드, 유튜브, 틱톡 등 멀티 플랫폼 콘텐츠 생성</li>
            <li>크레딧 기반 서비스 이용</li>
            <li>기타 회사가 추가 개발하거나 제휴계약 등을 통해 이용자에게 제공하는 일체의 서비스</li>
          </ul>
          <p style="margin-bottom: 15px;">
            2. 회사는 서비스의 내용 및 제공 일자를 변경할 수 있으며, 이 경우 변경 사유 및 내용을 서비스 화면에 사전 공지합니다.
          </p>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제6조 (크레딧 및 요금)</h3>
          <p style="margin-bottom: 15px;">
            1. 서비스 이용을 위해서는 크레딧이 필요하며, 콘텐츠 생성 플랫폼별로 차등 차감됩니다.<br>
            2. 회원은 크레딧을 충전하여 사용할 수 있으며, 충전 방법 및 금액은 회사가 정한 바에 따릅니다.<br>
            3. 크레딧의 유효기간은 충전일로부터 1년이며, 기간 내 미사용 시 자동 소멸됩니다.<br>
            4. 크레딧은 타인에게 양도하거나 환불할 수 없습니다. 단, 관련 법령 또는 회사 정책에 따라 예외가 인정될 수 있습니다.
          </p>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제7조 (환불 정책)</h3>
          <p style="margin-bottom: 15px;">
            1. 다음 각 호의 경우 환불이 가능합니다:
          </p>
          <ul style="list-style: disc; margin-left: 40px; margin-bottom: 15px;">
            <li>서비스 장애로 인해 콘텐츠 생성이 불가능한 경우</li>
            <li>생성된 콘텐츠가 명백히 요청 내용과 무관한 경우</li>
            <li>기타 회사의 귀책사유로 서비스 이용이 불가능한 경우</li>
          </ul>
          <p style="margin-bottom: 15px;">
            2. 다음 각 호의 경우 환불이 불가능합니다:
          </p>
          <ul style="list-style: disc; margin-left: 40px; margin-bottom: 15px;">
            <li>이미 콘텐츠가 정상적으로 생성되어 제공된 경우</li>
            <li>이용자의 단순 변심 또는 이용자의 귀책사유로 인한 경우</li>
            <li>생성된 콘텐츠의 품질이 주관적 기대에 미치지 못하는 경우 (기술적 오류가 아닌 경우)</li>
          </ul>
          <p style="margin-bottom: 15px;">
            3. 환불 요청은 고객센터(055-606-0826 또는 contentitda@naver.com)를 통해 가능합니다.
          </p>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제8조 (이용자의 의무)</h3>
          <p style="margin-bottom: 15px;">
            이용자는 다음 행위를 하여서는 안 됩니다:
          </p>
          <ul style="list-style: disc; margin-left: 40px; margin-bottom: 15px;">
            <li>신청 또는 변경 시 허위 내용의 등록</li>
            <li>타인의 정보 도용</li>
            <li>회사가 게시한 정보의 변경</li>
            <li>회사가 정한 정보 이외의 정보 등의 송신 또는 게시</li>
            <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
            <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
            <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
          </ul>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제9조 (저작권)</h3>
          <p style="margin-bottom: 15px;">
            1. 서비스에 의해 생성된 콘텐츠의 저작권은 이용자에게 귀속됩니다.<br>
            2. 단, 회사는 서비스 개선 및 홍보 목적으로 생성된 콘텐츠를 활용할 수 있습니다. (개인정보는 제외)<br>
            3. 이용자가 업로드한 이미지 및 입력 정보는 AI 학습에 사용되지 않습니다.
          </p>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제10조 (면책조항)</h3>
          <p style="margin-bottom: 15px;">
            1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.<br>
            2. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.<br>
            3. 회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못한 것에 대하여 책임을 지지 않습니다.<br>
            4. 회사는 AI가 생성한 콘텐츠의 정확성, 신뢰성, 적법성에 대해 보증하지 않으며, 이용자는 생성된 콘텐츠를 사용하기 전 반드시 검토해야 합니다.
          </p>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">제11조 (분쟁해결)</h3>
          <p style="margin-bottom: 15px;">
            1. 회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.<br>
            2. 본 약관에 명시되지 않은 사항은 전기통신사업법 등 관계법령과 상관례에 따릅니다.<br>
            3. 서비스 이용으로 발생한 분쟁에 대해 소송이 제기될 경우 회사의 본사 소재지를 관할하는 법원을 전속 관할 법원으로 합니다.
          </p>

          <h3 style="font-weight: 600; margin: 20px 0 10px; color: #1f2937;">부칙</h3>
          <p style="margin-bottom: 15px;">
            본 약관은 2026년 1월 2일부터 시행합니다.
          </p>
        </div>
        
        <div style="display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <button onclick="closeTermsOfService()" style="padding: 12px 24px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-check"></i> 확인
          </button>
        </div>
      </div>
    </div>

    <script src="/static/i18n.js?v=14.0.0"></script>
    
    <!-- FullCalendar JS -->
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js"></script>
    
    <!-- Flatpickr JS -->
    <script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/l10n/ko.js"></script>
    
    <script src="/static/app-v3-final.js?v=14.0.0"></script>
    <script src="/static/keyword-analysis.js?v=16.0.1"></script>
    <script src="/static/keyword-extended.js?v=14.0.0"></script>
    </div><!-- max-w-7xl container -->
</body>
</html>
`;
