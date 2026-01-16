// ===================================
// 마케팅허브 AI 스튜디오 - 비회원 랜딩 페이지
// ===================================

export const landingPageTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>마케팅허브 AI 스튜디오 - AI로 콘텐츠 제작을 10배 빠르게</title>
    <meta name="description" content="30초 만에 9개 플랫폼 콘텐츠 자동 생성, 유튜브 AI 분석, 영상 스토리보드 제작까지. 1개 계정으로 3개 서비스 모두 이용하세요.">
    <link href="/static/styles.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <!-- AOS Animation Library -->
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- 헤더 -->
    <header class="bg-white shadow-md sticky top-0 z-50">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <!-- 로고 -->
                <div class="flex items-center gap-2">
                    <a href="javascript:void(0)" onclick="handleLogoClick()" class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent hover:opacity-80 transition cursor-pointer">
                        🏠 마케팅허브 AI 스튜디오
                    </a>
                </div>
                
                <!-- 네비게이션 -->
                <div class="hidden md:flex items-center gap-6">
                    <div class="relative group">
                        <button class="text-gray-700 hover:text-purple-600 font-medium flex items-center gap-1">
                            서비스
                            <i class="fas fa-chevron-down text-xs"></i>
                        </button>
                        <!-- 드롭다운 -->
                        <div class="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <a href="#postflow" class="block px-4 py-3 hover:bg-purple-50 rounded-t-lg">
                                <div class="font-semibold text-purple-600">📝 하루 한포스트</div>
                                <div class="text-xs text-gray-500">멀티 플랫폼 콘텐츠 생성</div>
                            </a>
                            <a href="#trendfinder" class="block px-4 py-3 hover:bg-blue-50">
                                <div class="font-semibold text-blue-600">📊 유튜브 파인더</div>
                                <div class="text-xs text-gray-500">유튜브 AI 분석기</div>
                            </a>
                            <a href="#storymaker" class="block px-4 py-3 hover:bg-green-50 rounded-b-lg">
                                <div class="font-semibold text-green-600">🎬 스토리 메이커</div>
                                <div class="text-xs text-gray-500">AI 영상 스토리보드</div>
                            </a>
                        </div>
                    </div>
                    <a href="/community" class="text-gray-700 hover:text-purple-600 font-medium">커뮤니티</a>
                    <a href="#pricing" class="text-gray-700 hover:text-purple-600 font-medium">가격</a>
                </div>
                
                <!-- CTA 버튼 -->
                <div class="flex items-center gap-3">
                    <button onclick="openAuthModal('login')" class="text-gray-700 hover:text-purple-600 font-medium px-4 py-2">로그인</button>
                    <button onclick="openAuthModal('signup')" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all">
                        회원가입
                    </button>
                </div>
            </div>
        </nav>
    </header>

    <!-- 히어로 섹션 (개편) -->
    <section class="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-20 overflow-hidden">
        <!-- 배경 패턴 -->
        <div class="absolute inset-0 opacity-10">
            <div class="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
            <div class="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
        </div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <!-- 좌우 분할 레이아웃 -->
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <!-- 좌측: 텍스트 -->
                <div>
                    <div class="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold mb-6">
                        🔥 이번 주 1,234명이 가입했어요
                    </div>
                    
                    <h1 class="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                        <span class="block mb-2">30초 만에</span>
                        <span class="block relative inline-block">
                            <span class="bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent animate-pulse">
                                9개 플랫폼 콘텐츠
                            </span>
                        </span>
                        <span class="block mt-2">완전 정복</span>
                    </h1>
                    
                    <p class="text-xl md:text-2xl mb-8 opacity-90 leading-relaxed">
                        이미지 1장 → AI 변환 → 9개 플랫폼 콘텐츠 자동 생성<br>
                        <span class="text-yellow-300 font-semibold">네이버 블로그, 인스타그램, 스레드, 트위터</span> 모두 한 번에!
                    </p>
                    
                    <!-- CTA 버튼 (개선) -->
                    <div class="flex flex-col sm:flex-row gap-4 mb-8">
                        <button onclick="openAuthModal('signup')" class="group relative bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 text-gray-900 px-8 py-5 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-yellow-400/50 transition-all duration-300 hover:scale-105 transform">
                            <span class="relative z-10 flex items-center justify-center gap-2">
                                🎁 무료로 시작하기
                                <span class="text-sm font-normal opacity-80">(30 크레딧 증정)</span>
                            </span>
                            <div class="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-300 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur"></div>
                        </button>
                        <a href="#services" class="border-3 border-white text-white px-8 py-5 rounded-2xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
                            서비스 둘러보기
                            <i class="fas fa-arrow-down"></i>
                        </a>
                    </div>
                    
                    <div class="flex items-center gap-6 text-sm opacity-75">
                        <span class="flex items-center gap-2">
                            <i class="fas fa-check-circle text-green-300"></i>
                            신용카드 불필요
                        </span>
                        <span class="flex items-center gap-2">
                            <i class="fas fa-check-circle text-green-300"></i>
                            3초 만에 시작
                        </span>
                        <span class="flex items-center gap-2">
                            <i class="fas fa-check-circle text-green-300"></i>
                            언제든 취소
                        </span>
                    </div>
                </div>
                
                <!-- 우측: 비주얼 (모형 화면) -->
                <div class="hidden md:block relative">
                    <!-- 메인 화면 모형 -->
                    <div class="relative z-10 bg-white rounded-3xl shadow-2xl overflow-hidden transform hover:scale-105 transition-all duration-500">
                        <!-- 브라우저 헤더 바 -->
                        <div class="bg-gray-800 px-4 py-3 flex items-center gap-2">
                            <div class="flex gap-2">
                                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div class="flex-1 bg-gray-700 rounded px-3 py-1 text-xs text-gray-400">
                                marketinghub.ai/postflow
                            </div>
                        </div>
                        
                        <!-- 화면 콘텐츠 -->
                        <div class="bg-gradient-to-br from-purple-50 to-blue-50 p-8">
                            <!-- 이미지 업로드 -->
                            <div class="bg-white rounded-xl p-6 shadow-lg mb-6 border-2 border-dashed border-purple-300">
                                <div class="text-center">
                                    <i class="fas fa-cloud-upload-alt text-5xl text-purple-600 mb-3"></i>
                                    <p class="text-gray-700 font-semibold">이미지를 업로드하세요</p>
                                    <p class="text-xs text-gray-500 mt-1">30초 후 9개 콘텐츠 생성!</p>
                                </div>
                            </div>
                            
                            <!-- 플랫폼 아이콘 (9개 플랫폼 - 실제 브랜드 로고) -->
                            <div class="grid grid-cols-3 gap-3">
                                <!-- 네이버 블로그 -->
                                <div class="bg-white rounded-lg p-3 shadow text-center transform hover:scale-110 transition">
                                    <div class="text-2xl mb-1" style="color: #03C75A;">
                                        <i class="fas fa-blog"></i>
                                    </div>
                                    <p class="text-xs text-gray-600 font-medium">네이버블로그</p>
                                </div>
                                <!-- 인스타그램 -->
                                <div class="bg-white rounded-lg p-3 shadow text-center transform hover:scale-110 transition">
                                    <div class="text-2xl mb-1" style="color: #E4405F;">
                                        <i class="fab fa-instagram"></i>
                                    </div>
                                    <p class="text-xs text-gray-600 font-medium">인스타그램</p>
                                </div>
                                <!-- 스레드 -->
                                <div class="bg-white rounded-lg p-3 shadow text-center transform hover:scale-110 transition">
                                    <div class="text-2xl mb-1" style="color: #000000;">
                                        <i class="fab fa-threads"></i>
                                    </div>
                                    <p class="text-xs text-gray-600 font-medium">스레드</p>
                                </div>
                                <!-- 트위터 -->
                                <div class="bg-white rounded-lg p-3 shadow text-center transform hover:scale-110 transition">
                                    <div class="text-2xl mb-1" style="color: #1DA1F2;">
                                        <i class="fab fa-twitter"></i>
                                    </div>
                                    <p class="text-xs text-gray-600 font-medium">트위터</p>
                                </div>
                                <!-- 링크드인 -->
                                <div class="bg-white rounded-lg p-3 shadow text-center transform hover:scale-110 transition">
                                    <div class="text-2xl mb-1" style="color: #0A66C2;">
                                        <i class="fab fa-linkedin"></i>
                                    </div>
                                    <p class="text-xs text-gray-600 font-medium">링크드인</p>
                                </div>
                                <!-- 브런치 (네이버 서비스) -->
                                <div class="bg-white rounded-lg p-3 shadow text-center transform hover:scale-110 transition">
                                    <div class="text-2xl mb-1" style="color: #03C75A;">
                                        <i class="fas fa-book-open"></i>
                                    </div>
                                    <p class="text-xs text-gray-600 font-medium">브런치</p>
                                </div>
                                <!-- 틱톡 -->
                                <div class="bg-white rounded-lg p-3 shadow text-center transform hover:scale-110 transition">
                                    <div class="text-2xl mb-1" style="color: #000000;">
                                        <i class="fab fa-tiktok"></i>
                                    </div>
                                    <p class="text-xs text-gray-600 font-medium">틱톡</p>
                                </div>
                                <!-- 유튜브 -->
                                <div class="bg-white rounded-lg p-3 shadow text-center transform hover:scale-110 transition">
                                    <div class="text-2xl mb-1" style="color: #FF0000;">
                                        <i class="fab fa-youtube"></i>
                                    </div>
                                    <p class="text-xs text-gray-600 font-medium">유튜브</p>
                                </div>
                                <!-- 카카오톡 -->
                                <div class="bg-white rounded-lg p-3 shadow text-center transform hover:scale-110 transition">
                                    <div class="text-2xl mb-1" style="color: #FEE500;">
                                        <i class="fas fa-comment"></i>
                                    </div>
                                    <p class="text-xs text-gray-600 font-medium">카카오톡</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 떠다니는 요소들 -->
                    <div class="absolute -top-6 -right-6 bg-yellow-400 rounded-full p-4 shadow-2xl animate-bounce">
                        <span class="text-2xl">⚡</span>
                    </div>
                    <div class="absolute -bottom-6 -left-6 bg-green-400 rounded-full p-4 shadow-2xl animate-pulse">
                        <span class="text-2xl">✨</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 3가지 서비스 섹션 -->
    <section id="services" class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">3가지 강력한 AI 도구</h2>
                <p class="text-xl text-gray-600">1개 계정으로 모든 서비스를 자유롭게 이용하세요</p>
            </div>

            <!-- 9개 플랫폼 변환 흐름 시각화 -->
            <div class="mb-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-3xl p-12 shadow-lg" data-aos="fade-up">
                <h3 class="text-3xl font-bold text-gray-900 text-center mb-12" data-aos="fade-down">
                    <span class="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        1개 이미지 → AI 변환 → 9개 플랫폼 콘텐츠
                    </span>
                </h3>
                
                <!-- 변환 흐름 -->
                <div class="flex flex-col md:flex-row items-center justify-center gap-8">
                    <!-- 입력 -->
                    <div class="flex-shrink-0 bg-white rounded-2xl p-8 shadow-xl transform hover:scale-105 transition-all duration-300" data-aos="fade-right">
                        <div class="text-center">
                            <div class="w-24 h-24 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                                <i class="fas fa-image text-5xl text-purple-600"></i>
                            </div>
                            <p class="font-bold text-gray-900 text-lg">이미지 1장</p>
                            <p class="text-sm text-gray-500 mt-1">업로드만 하세요</p>
                        </div>
                    </div>
                    
                    <!-- 화살표 -->
                    <div class="hidden md:block">
                        <i class="fas fa-arrow-right text-4xl text-purple-400 animate-pulse"></i>
                    </div>
                    
                    <!-- AI 변환 -->
                    <div class="flex-shrink-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 shadow-xl transform hover:scale-105 transition-all duration-300" data-aos="zoom-in" data-aos-delay="200">
                        <div class="text-center text-white">
                            <div class="w-24 h-24 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
                                <i class="fas fa-brain text-5xl"></i>
                            </div>
                            <p class="font-bold text-lg">AI 자동 변환</p>
                            <p class="text-sm opacity-90 mt-1">30초 소요</p>
                        </div>
                    </div>
                    
                    <!-- 화살표 -->
                    <div class="hidden md:block">
                        <i class="fas fa-arrow-right text-4xl text-blue-400 animate-pulse"></i>
                    </div>
                    
                    <!-- 출력 (9개 플랫폼) -->
                    <div class="flex-1 bg-white rounded-2xl p-8 shadow-xl" data-aos="fade-left" data-aos-delay="400">
                        <p class="font-bold text-gray-900 text-lg text-center mb-6">9개 플랫폼 콘텐츠 완성!</p>
                        <div class="grid grid-cols-3 gap-3">
                            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center transform hover:scale-110 transition">
                                <i class="fas fa-blog text-2xl mb-1" style="color: #03C75A;"></i>
                                <p class="text-xs font-medium text-gray-700">네이버블로그</p>
                            </div>
                            <div class="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3 text-center transform hover:scale-110 transition">
                                <i class="fab fa-instagram text-2xl mb-1" style="color: #E4405F;"></i>
                                <p class="text-xs font-medium text-gray-700">인스타그램</p>
                            </div>
                            <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 text-center transform hover:scale-110 transition">
                                <i class="fab fa-threads text-2xl mb-1" style="color: #000000;"></i>
                                <p class="text-xs font-medium text-gray-700">스레드</p>
                            </div>
                            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center transform hover:scale-110 transition">
                                <i class="fab fa-twitter text-2xl mb-1" style="color: #1DA1F2;"></i>
                                <p class="text-xs font-medium text-gray-700">트위터</p>
                            </div>
                            <div class="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-3 text-center transform hover:scale-110 transition">
                                <i class="fab fa-linkedin text-2xl mb-1" style="color: #0A66C2;"></i>
                                <p class="text-xs font-medium text-gray-700">링크드인</p>
                            </div>
                            <div class="bg-gradient-to-br from-green-50 to-teal-100 rounded-lg p-3 text-center transform hover:scale-110 transition">
                                <i class="fas fa-book-open text-2xl mb-1" style="color: #03C75A;"></i>
                                <p class="text-xs font-medium text-gray-700">브런치</p>
                            </div>
                            <div class="bg-gradient-to-br from-gray-50 to-gray-200 rounded-lg p-3 text-center transform hover:scale-110 transition">
                                <i class="fab fa-tiktok text-2xl mb-1" style="color: #000000;"></i>
                                <p class="text-xs font-medium text-gray-700">틱톡</p>
                            </div>
                            <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 text-center transform hover:scale-110 transition">
                                <i class="fab fa-youtube text-2xl mb-1" style="color: #FF0000;"></i>
                                <p class="text-xs font-medium text-gray-700">유튜브</p>
                            </div>
                            <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 text-center transform hover:scale-110 transition">
                                <i class="fas fa-comment text-2xl mb-1" style="color: #FEE500;"></i>
                                <p class="text-xs font-medium text-gray-700">카카오톡</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 통계 -->
                <div class="mt-12 grid grid-cols-3 gap-8 text-center">
                    <div>
                        <div class="text-4xl font-bold text-purple-600 mb-2">30초</div>
                        <p class="text-gray-600">초고속 변환</p>
                    </div>
                    <div>
                        <div class="text-4xl font-bold text-blue-600 mb-2">9개</div>
                        <p class="text-gray-600">플랫폼 동시 생성</p>
                    </div>
                    <div>
                        <div class="text-4xl font-bold text-indigo-600 mb-2">100%</div>
                        <p class="text-gray-600">맞춤 최적화</p>
                    </div>
                </div>
            </div>

            <!-- PostFlow (호버 효과 강화) -->
            <div id="postflow" class="mb-20 group" data-aos="fade-up">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div data-aos="fade-right">
                        <div class="inline-block bg-purple-100 text-purple-600 px-4 py-2 rounded-full font-semibold mb-4">
                            📝 Service 1
                        </div>
                        <h3 class="text-3xl font-bold text-gray-900 mb-4">하루 한포스트</h3>
                        <p class="text-xl text-gray-600 mb-6">멀티 플랫폼 콘텐츠 생성</p>
                        <p class="text-gray-700 mb-6 leading-relaxed">
                            이미지 하나만 업로드하면 30초 만에 9개 플랫폼 맞춤 콘텐츠를 자동으로 생성합니다.
                            네이버 블로그, 인스타그램, 스레드, 트위터, 유튜브, 카카오톡 등 모든 SNS에 최적화된 콘텐츠를 한 번에!
                        </p>
                        <ul class="space-y-3 mb-8">
                            <li class="flex items-start gap-3 transform group-hover:translate-x-2 transition-transform duration-300">
                                <i class="fas fa-check-circle text-purple-600 mt-1"></i>
                                <span><strong>9개 플랫폼</strong> 동시 콘텐츠 생성</span>
                            </li>
                            <li class="flex items-start gap-3 transform group-hover:translate-x-2 transition-transform duration-300 delay-75">
                                <i class="fas fa-check-circle text-purple-600 mt-1"></i>
                                <span><strong>AI 이미지 분석</strong>으로 키워드 자동 추출</span>
                            </li>
                            <li class="flex items-start gap-3 transform group-hover:translate-x-2 transition-transform duration-300 delay-150">
                                <i class="fas fa-check-circle text-purple-600 mt-1"></i>
                                <span><strong>톤앤매너 맞춤</strong> 브랜드 맞춤 콘텐츠</span>
                            </li>
                        </ul>
                    </div>
                    <div class="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-8 h-96 flex items-center justify-center transform group-hover:scale-105 group-hover:shadow-2xl transition-all duration-500 cursor-pointer">
                        <div class="text-center">
                            <i class="fas fa-image text-8xl text-purple-600 mb-4 transform group-hover:scale-110 transition-transform duration-300"></i>
                            <p class="text-gray-700 font-semibold">이미지 업로드</p>
                            <p class="text-gray-500 text-sm mt-2">→ 30초 후 →</p>
                            <p class="text-purple-600 font-bold text-lg mt-2">9개 플랫폼 콘텐츠 완성!</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TrendFinder (호버 효과 강화) -->
            <div id="trendfinder" class="mb-20 group">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div class="order-2 md:order-1 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-8 h-96 flex items-center justify-center transform group-hover:scale-105 group-hover:shadow-2xl transition-all duration-500 cursor-pointer">
                        <div class="text-center">
                            <i class="fas fa-chart-line text-8xl text-blue-600 mb-4 transform group-hover:scale-110 transition-transform duration-300"></i>
                            <p class="text-gray-700 font-semibold">경쟁 채널 추적</p>
                            <p class="text-gray-500 text-sm mt-2">+</p>
                            <p class="text-blue-600 font-bold text-lg mt-2">바이럴 패턴 예측</p>
                        </div>
                    </div>
                    <div class="order-1 md:order-2">
                        <div class="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full font-semibold mb-4">
                            📊 Service 2
                        </div>
                        <h3 class="text-3xl font-bold text-gray-900 mb-4">유튜브 파인더</h3>
                        <p class="text-xl text-gray-600 mb-6">유튜브 AI 분석기</p>
                        <p class="text-gray-700 mb-6 leading-relaxed">
                            경쟁 채널을 실시간으로 추적하고, AI가 바이럴 패턴을 예측합니다.
                            "다음에 뭘 만들어야 할까?" 고민은 이제 그만!
                        </p>
                        <ul class="space-y-3 mb-8">
                            <li class="flex items-start gap-3 transform group-hover:translate-x-2 transition-transform duration-300">
                                <i class="fas fa-check-circle text-blue-600 mt-1"></i>
                                <span><strong>컴페티터 알람</strong> 실시간 추적 시스템</span>
                            </li>
                            <li class="flex items-start gap-3 transform group-hover:translate-x-2 transition-transform duration-300 delay-75">
                                <i class="fas fa-check-circle text-blue-600 mt-1"></i>
                                <span><strong>AI 콘텐츠 기획</strong> 자동 제안</span>
                            </li>
                            <li class="flex items-start gap-3 transform group-hover:translate-x-2 transition-transform duration-300 delay-150">
                                <i class="fas fa-check-circle text-blue-600 mt-1"></i>
                                <span><strong>썸네일 분석</strong> CTR 예측 모델</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- StoryMaker (호버 효과 강화) -->
            <div id="storymaker" class="mb-20 group">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div class="inline-block bg-green-100 text-green-600 px-4 py-2 rounded-full font-semibold mb-4">
                            🎬 Service 3
                        </div>
                        <h3 class="text-3xl font-bold text-gray-900 mb-4">스토리 메이커</h3>
                        <p class="text-xl text-gray-600 mb-6">AI 영상 스토리보드 제작</p>
                        <p class="text-gray-700 mb-6 leading-relaxed">
                            영상 기획부터 콘티까지 AI가 자동으로 생성합니다.
                            유튜브 파인더의 인사이트를 활용해 바이럴 영상을 쉽게 제작하세요.
                        </p>
                        <ul class="space-y-3 mb-8">
                            <li class="flex items-start gap-3 transform group-hover:translate-x-2 transition-transform duration-300">
                                <i class="fas fa-check-circle text-green-600 mt-1"></i>
                                <span><strong>자동 시나리오</strong> 생성</span>
                            </li>
                            <li class="flex items-start gap-3 transform group-hover:translate-x-2 transition-transform duration-300 delay-75">
                                <i class="fas fa-check-circle text-green-600 mt-1"></i>
                                <span><strong>장면별 콘티</strong> 및 카메라 앵글 제안</span>
                            </li>
                            <li class="flex items-start gap-3 transform group-hover:translate-x-2 transition-transform duration-300 delay-150">
                                <i class="fas fa-check-circle text-green-600 mt-1"></i>
                                <span><strong>프리뷰 영상</strong> 자동 생성 (곧 출시)</span>
                            </li>
                        </ul>
                    </div>
                    <div class="bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl p-8 h-96 flex items-center justify-center transform group-hover:scale-105 group-hover:shadow-2xl transition-all duration-500 cursor-pointer">
                        <div class="text-center">
                            <i class="fas fa-film text-8xl text-green-600 mb-4 transform group-hover:scale-110 transition-transform duration-300"></i>
                            <p class="text-gray-700 font-semibold">영상 아이디어</p>
                            <p class="text-gray-500 text-sm mt-2">→ AI 분석 →</p>
                            <p class="text-green-600 font-bold text-lg mt-2">완성된 스토리보드!</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Before/After 비교 섹션 -->
            <div class="mb-20 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 text-white overflow-hidden relative" data-aos="fade-up">
                <!-- 배경 패턴 -->
                <div class="absolute inset-0 opacity-5">
                    <div class="absolute top-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
                </div>
                
                <div class="relative z-10">
                    <h3 class="text-4xl font-bold text-center mb-4">기존 방식 vs 마케팅허브 AI</h3>
                    <p class="text-xl text-center text-gray-300 mb-12">시간을 10배 절약하세요</p>
                    
                    <div class="grid md:grid-cols-2 gap-8">
                        <!-- Before -->
                        <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                            <div class="text-center mb-6">
                                <div class="inline-block bg-red-500 px-4 py-2 rounded-full font-bold mb-4">
                                    ❌ 기존 방식
                                </div>
                            </div>
                            <ul class="space-y-4">
                                <li class="flex items-start gap-3">
                                    <i class="fas fa-times-circle text-red-400 mt-1 flex-shrink-0"></i>
                                    <div>
                                        <p class="font-semibold">플랫폼별 수동 작성</p>
                                        <p class="text-sm text-gray-300">9개 플랫폼 → 9번 복붙 및 수정</p>
                                    </div>
                                </li>
                                <li class="flex items-start gap-3">
                                    <i class="fas fa-times-circle text-red-400 mt-1 flex-shrink-0"></i>
                                    <div>
                                        <p class="font-semibold">시간 소요</p>
                                        <p class="text-sm text-gray-300">최소 4~5시간 걸림</p>
                                    </div>
                                </li>
                                <li class="flex items-start gap-3">
                                    <i class="fas fa-times-circle text-red-400 mt-1 flex-shrink-0"></i>
                                    <div>
                                        <p class="font-semibold">톤앤매너 일관성 부족</p>
                                        <p class="text-sm text-gray-300">플랫폼마다 다른 느낌</p>
                                    </div>
                                </li>
                                <li class="flex items-start gap-3">
                                    <i class="fas fa-times-circle text-red-400 mt-1 flex-shrink-0"></i>
                                    <div>
                                        <p class="font-semibold">키워드 최적화 어려움</p>
                                        <p class="text-sm text-gray-300">SEO 최적화 수동 작업</p>
                                    </div>
                                </li>
                            </ul>
                            <div class="mt-8 text-center">
                                <div class="text-5xl font-bold text-red-400">4~5시간</div>
                                <p class="text-gray-300 mt-2">소요 시간</p>
                            </div>
                        </div>
                        
                        <!-- After -->
                        <div class="bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
                            <div class="text-center mb-6">
                                <div class="inline-block bg-yellow-400 text-gray-900 px-4 py-2 rounded-full font-bold mb-4">
                                    ✅ 마케팅허브 AI
                                </div>
                            </div>
                            <ul class="space-y-4">
                                <li class="flex items-start gap-3">
                                    <i class="fas fa-check-circle text-yellow-300 mt-1 flex-shrink-0"></i>
                                    <div>
                                        <p class="font-semibold">자동 변환</p>
                                        <p class="text-sm opacity-90">9개 플랫폼 동시 생성</p>
                                    </div>
                                </li>
                                <li class="flex items-start gap-3">
                                    <i class="fas fa-check-circle text-yellow-300 mt-1 flex-shrink-0"></i>
                                    <div>
                                        <p class="font-semibold">초고속 처리</p>
                                        <p class="text-sm opacity-90">단 30초만에 완성</p>
                                    </div>
                                </li>
                                <li class="flex items-start gap-3">
                                    <i class="fas fa-check-circle text-yellow-300 mt-1 flex-shrink-0"></i>
                                    <div>
                                        <p class="font-semibold">브랜드 톤앤매너 자동 적용</p>
                                        <p class="text-sm opacity-90">일관된 브랜드 이미지</p>
                                    </div>
                                </li>
                                <li class="flex items-start gap-3">
                                    <i class="fas fa-check-circle text-yellow-300 mt-1 flex-shrink-0"></i>
                                    <div>
                                        <p class="font-semibold">AI 키워드 자동 최적화</p>
                                        <p class="text-sm opacity-90">SEO 완벽 대응</p>
                                    </div>
                                </li>
                            </ul>
                            <div class="mt-8 text-center">
                                <div class="text-5xl font-bold text-yellow-300">30초</div>
                                <p class="opacity-90 mt-2">소요 시간</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 결과 -->
                    <div class="mt-12 text-center">
                        <div class="inline-block bg-yellow-400 text-gray-900 px-8 py-4 rounded-2xl font-bold text-2xl">
                            ⚡ 10배 빠른 속도, 10배 더 정확한 결과
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- 가격 섹션 -->
    <section id="pricing" class="py-20 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">사용한 만큼만 결제</h2>
                <p class="text-xl text-gray-600">구독료 없음 · 크레딧 선불 충전 방식</p>
            </div>

            <!-- 크레딧 패키지 -->
            <div class="grid md:grid-cols-3 gap-8 mb-16">
                <!-- 100 크레딧 -->
                <div class="bg-white rounded-2xl p-8 shadow-lg">
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">스타터</h3>
                    <div class="mb-6">
                        <span class="text-4xl font-bold text-gray-900">3,000원</span>
                    </div>
                    <p class="text-gray-600 mb-6">100 크레딧</p>
                    <p class="text-sm text-gray-500 mb-4">30원/크레딧</p>
                </div>

                <!-- 500 크레딧 (인기) -->
                <div class="bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-2xl p-8 shadow-2xl transform scale-105">
                    <div class="text-center mb-4">
                        <span class="bg-yellow-400 text-purple-900 px-4 py-1 rounded-full text-sm font-bold">인기</span>
                    </div>
                    <h3 class="text-2xl font-bold mb-2">프로</h3>
                    <div class="mb-6">
                        <span class="text-4xl font-bold">14,250원</span>
                        <span class="text-sm line-through opacity-75 ml-2">15,000원</span>
                    </div>
                    <p class="opacity-90 mb-6">500 크레딧</p>
                    <p class="text-sm opacity-75 mb-4">28.5원/크레딧 (5% 할인)</p>
                </div>

                <!-- 1,000 크레딧 -->
                <div class="bg-white rounded-2xl p-8 shadow-lg">
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">프리미엄</h3>
                    <div class="mb-6">
                        <span class="text-4xl font-bold text-gray-900">27,000원</span>
                        <span class="text-sm line-through text-gray-400 ml-2">30,000원</span>
                    </div>
                    <p class="text-gray-600 mb-6">1,000 크레딧</p>
                    <p class="text-sm text-gray-500 mb-4">27원/크레딧 (10% 할인)</p>
                </div>
            </div>

            <!-- 서비스별 크레딧 사용량 -->
            <div class="bg-white rounded-2xl p-8 shadow-lg">
                <h3 class="text-2xl font-bold text-gray-900 mb-8 text-center">서비스별 크레딧 사용량</h3>
                
                <div class="grid md:grid-cols-3 gap-8">
                    <!-- PostFlow -->
                    <div>
                        <h4 class="font-bold text-purple-600 mb-4 flex items-center gap-2">
                            <i class="fas fa-edit"></i> 하루 한포스트
                        </h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• 1개 플랫폼 콘텐츠 생성 = <strong>1 크레딧</strong></li>
                            <li>• 9개 플랫폼 전체 생성 = <strong>9 크레딧</strong></li>
                            <li class="text-xs text-gray-500 pt-2">
                                예시: 이미지 1장 → 네이버 블로그/인스타/유튜브 등 9개 콘텐츠 자동 생성
                            </li>
                        </ul>
                    </div>

                    <!-- TrendFinder -->
                    <div>
                        <h4 class="font-bold text-blue-600 mb-4 flex items-center gap-2">
                            <i class="fas fa-chart-line"></i> 유튜브 파인더
                        </h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• 영상 검색·필터링 = <strong>1 크레딧</strong></li>
                            <li>• 썸네일 AI 분석 = <strong>3 크레딧</strong></li>
                            <li>• 댓글 감정 분석 = <strong>5 크레딧</strong></li>
                            <li>• AI 콘텐츠 전략 제안 = <strong>5 크레딧</strong></li>
                            <li>• 경쟁 채널 비교 = <strong>10 크레딧</strong></li>
                        </ul>
                    </div>

                    <!-- StoryMaker -->
                    <div>
                        <h4 class="font-bold text-green-600 mb-4 flex items-center gap-2">
                            <i class="fas fa-film"></i> 스토리 메이커
                        </h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• 짧은 스토리보드 (30초) = <strong>5 크레딧</strong></li>
                            <li>• 중간 스토리보드 (1~3분) = <strong>10 크레딧</strong></li>
                            <li>• 긴 스토리보드 (3~10분) = <strong>20 크레딧</strong></li>
                            <li>• 상세 콘티 생성 = <strong>+5 크레딧</strong></li>
                            <li>• AI 비디오 프리뷰 = <strong>+10 크레딧</strong></li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- 무료 크레딧 안내 -->
            <div class="mt-8 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl p-6 text-center">
                <h4 class="font-bold text-gray-900 mb-2">🎁 무료 크레딧 혜택</h4>
                <p class="text-gray-700">
                    신규 가입 시 <strong class="text-purple-600">30 크레딧</strong> 무료 제공 + 
                    매월 <strong class="text-blue-600">30 크레딧</strong> 자동 지급
                </p>
            </div>
        </div>
    </section>

    <!-- FAQ 섹션 -->
    <section class="py-20 bg-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16" data-aos="fade-up">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">자주 묻는 질문</h2>
                <p class="text-xl text-gray-600">궁금하신 점이 있으신가요?</p>
            </div>

            <!-- FAQ 아코디언 -->
            <div class="space-y-4">
                <!-- Q1 -->
                <div class="bg-gray-50 rounded-2xl overflow-hidden" data-aos="fade-up" data-aos-delay="100">
                    <button class="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-100 transition" onclick="toggleFaq('faq1')">
                        <span class="font-bold text-lg text-gray-900">💳 신용카드 등록이 필요한가요?</span>
                        <i class="fas fa-chevron-down transition-transform" id="faq1-icon"></i>
                    </button>
                    <div id="faq1" class="hidden px-8 pb-6 text-gray-700 leading-relaxed">
                        <p>아니요! 신규 가입 시 30 크레딧을 무료로 드리며, 신용카드 등록 없이 바로 사용하실 수 있습니다. 크레딧이 부족할 때만 충전하시면 됩니다.</p>
                    </div>
                </div>

                <!-- Q2 -->
                <div class="bg-gray-50 rounded-2xl overflow-hidden" data-aos="fade-up" data-aos-delay="200">
                    <button class="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-100 transition" onclick="toggleFaq('faq2')">
                        <span class="font-bold text-lg text-gray-900">📊 생성된 콘텐츠의 품질은 어떤가요?</span>
                        <i class="fas fa-chevron-down transition-transform" id="faq2-icon"></i>
                    </button>
                    <div id="faq2" class="hidden px-8 pb-6 text-gray-700 leading-relaxed">
                        <p>GPT-4 기반 AI가 각 플랫폼의 특성에 맞게 콘텐츠를 최적화합니다. 톤앤매너, 키워드, 해시태그까지 자동으로 생성되며, 언제든 수정 가능합니다.</p>
                    </div>
                </div>

                <!-- Q3 -->
                <div class="bg-gray-50 rounded-2xl overflow-hidden" data-aos="fade-up" data-aos-delay="300">
                    <button class="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-100 transition" onclick="toggleFaq('faq3')">
                        <span class="font-bold text-lg text-gray-900">⚡ 정말 30초 만에 9개 콘텐츠가 생성되나요?</span>
                        <i class="fas fa-chevron-down transition-transform" id="faq3-icon"></i>
                    </button>
                    <div id="faq3" class="hidden px-8 pb-6 text-gray-700 leading-relaxed">
                        <p>네! 이미지 1장만 업로드하면 평균 30초 내에 9개 플랫폼 맞춤 콘텐츠가 자동 생성됩니다. 네트워크 상황에 따라 최대 1분 정도 소요될 수 있습니다.</p>
                    </div>
                </div>

                <!-- Q4 -->
                <div class="bg-gray-50 rounded-2xl overflow-hidden" data-aos="fade-up" data-aos-delay="400">
                    <button class="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-100 transition" onclick="toggleFaq('faq4')">
                        <span class="font-bold text-lg text-gray-900">🔄 환불 정책은 어떻게 되나요?</span>
                        <i class="fas fa-chevron-down transition-transform" id="faq4-icon"></i>
                    </button>
                    <div id="faq4" class="hidden px-8 pb-6 text-gray-700 leading-relaxed">
                        <p>충전한 크레딧은 사용하지 않은 경우 7일 이내 100% 환불 가능합니다. 일부 사용 후에는 사용한 크레딧을 제외한 금액을 환불해드립니다.</p>
                    </div>
                </div>

                <!-- Q5 -->
                <div class="bg-gray-50 rounded-2xl overflow-hidden" data-aos="fade-up" data-aos-delay="500">
                    <button class="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-100 transition" onclick="toggleFaq('faq5')">
                        <span class="font-bold text-lg text-gray-900">💼 기업용 플랜이 있나요?</span>
                        <i class="fas fa-chevron-down transition-transform" id="faq5-icon"></i>
                    </button>
                    <div id="faq5" class="hidden px-8 pb-6 text-gray-700 leading-relaxed">
                        <p>네! 기업용 플랜은 별도 문의를 통해 맞춤 상담이 가능합니다. 대량 크레딧 할인, 전담 매니저, API 연동 등을 제공합니다. (contentitda@naver.com)</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA 섹션 -->
    <section class="bg-gradient-to-r from-purple-600 to-blue-600 py-20">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <h2 class="text-4xl font-bold mb-6">지금 시작하세요</h2>
            <p class="text-xl mb-8 opacity-90">
                신규 가입 시 30 크레딧을 무료로 드리고, 매월 30 크레딧이 자동 지급됩니다.<br>
                신용카드 등록 없이 3초 만에 시작할 수 있어요.
            </p>
            <button onclick="openAuthModal('signup')" class="inline-block bg-white text-purple-600 px-12 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all hover:scale-105">
                무료로 시작하기 →
            </button>
        </div>
    </section>

    <!-- 푸터 -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid md:grid-cols-4 gap-8 mb-8">
                <div>
                    <h3 class="font-bold text-lg mb-4">마케팅허브 AI 스튜디오</h3>
                    <p class="text-gray-400 text-sm">AI로 콘텐츠 제작을 10배 빠르게</p>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">서비스</h4>
                    <ul class="space-y-2 text-gray-400 text-sm">
                        <li><a href="#postflow" class="hover:text-white">PostFlow</a></li>
                        <li><a href="#trendfinder" class="hover:text-white">TrendFinder</a></li>
                        <li><a href="#storymaker" class="hover:text-white">스토리 메이커</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">지원</h4>
                    <ul class="space-y-2 text-gray-400 text-sm">
                        <li><a href="/community" class="hover:text-white">커뮤니티</a></li>
                        <li><a href="#" class="hover:text-white">문의하기</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">정책</h4>
                    <ul class="space-y-2 text-gray-400 text-sm">
                        <li><a href="javascript:void(0)" onclick="openPolicyModal('refund')" class="hover:text-white cursor-pointer">환불 정책</a></li>
                        <li><a href="javascript:void(0)" onclick="openPolicyModal('privacy')" class="hover:text-white cursor-pointer">개인정보처리방침</a></li>
                        <li><a href="javascript:void(0)" onclick="openPolicyModal('terms')" class="hover:text-white cursor-pointer">이용약관</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
                <p>© 2026 마케팅허브 AI 스튜디오. All rights reserved.</p>
                <p class="mt-2">문의: contentitda@naver.com</p>
            </div>
        </div>
    </footer>

    <!-- 정책 모달 -->
    <div id="policyModal" class="hidden fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex justify-between items-center">
                <h3 id="policyModalTitle" class="text-2xl font-bold">정책</h3>
                <button onclick="closePolicyModal()" class="text-white hover:text-gray-200 text-3xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="policyModalContent" class="p-8 overflow-y-auto flex-1">
                <!-- 동적 콘텐츠 -->
            </div>
        </div>
    </div>

    <!-- 회원가입/로그인 모달 -->
    <div id="authModal" class="hidden fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
        <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 w-full">
            <div class="text-center mb-6">
                <h3 id="authModalTitle" class="text-2xl font-bold text-gray-800 mb-2">
                    <i class="fas fa-user-plus mr-2 text-purple-600"></i><span id="authModalTitleText">회원가입</span>
                </h3>
                <p id="authModalSubtitle" class="text-gray-600">30개 무료 크레딧으로 시작하세요!</p>
            </div>
            
            <!-- 이메일 인증 폼 (회원가입/로그인 공용) -->
            <div id="emailAuthSection" class="space-y-4 mb-6">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">이메일</label>
                    <input 
                        type="email" 
                        id="authEmail" 
                        placeholder="your@email.com"
                        class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    >
                    <p class="text-xs text-gray-500 mt-1" id="emailDomainHint"></p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">비밀번호 <span id="passwordHint">(8자 이상)</span></label>
                    <input 
                        type="password" 
                        id="authPassword" 
                        placeholder="비밀번호"
                        class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                    >
                </div>
                <button 
                    id="emailAuthBtn" 
                    class="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
                >
                    <i class="fas fa-envelope mr-2"></i><span id="emailAuthBtnText">이메일로 가입하기</span>
                </button>
            </div>
            
            <!-- 구분선 -->
            <div class="flex items-center mb-6">
                <div class="flex-1 border-t border-gray-300"></div>
                <span class="px-4 text-gray-500 text-sm">또는</span>
                <div class="flex-1 border-t border-gray-300"></div>
            </div>
            
            <!-- OAuth 로그인 버튼들 -->
            <div class="space-y-3 mb-6">
                <!-- Google 로그인 -->
                <button 
                    id="googleLoginBtn" 
                    class="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition font-semibold flex items-center justify-center"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" class="w-5 h-5 mr-2">
                    Google로 계속하기
                </button>
                
                <!-- Kakao 로그인 -->
                <button 
                    id="kakaoLoginBtn" 
                    class="w-full px-6 py-3 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition font-semibold flex items-center justify-center"
                >
                    <i class="fas fa-comment mr-2"></i>
                    카카오로 계속하기
                </button>
            </div>
            
            <!-- 안내 문구 (회원가입 모드) -->
            <div id="signupNotice" class="bg-purple-50 border-l-4 border-purple-500 p-4 mb-4">
                <p class="text-sm text-gray-700">
                    <strong>✨ 이메일 인증 완료 시 30개 무료 크레딧!</strong><br>
                    <span class="text-gray-600">• 동일 IP에서 24시간 내 최대 3개 계정<br>
                    • 이메일 인증을 완료해야 크레딧이 지급됩니다</span>
                </p>
            </div>
            
            <!-- 모드 전환 링크 -->
            <div class="text-center mb-4">
                <button id="authModeToggle" class="text-sm text-purple-600 hover:text-purple-700 font-semibold">
                    계정이 있으신가요? <span id="authModeToggleText">로그인</span>
                </button>
            </div>
            
            <!-- 닫기 버튼 -->
            <button 
                onclick="closeAuthModal()" 
                class="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
                닫기
            </button>
        </div>
    </div>

    <!-- Toast 컨테이너 (알림 메시지용) -->
    <div id="toastContainer" style="position: fixed; top: 20px; right: 20px; z-index: 10000;"></div>

    <!-- AOS Animation Library -->
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script>
        // AOS 초기화
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100
        });
    </script>

    <!-- FAQ 토글 스크립트 -->
    <script>
        function toggleFaq(id) {
            const content = document.getElementById(id);
            const icon = document.getElementById(id + '-icon');
            
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                icon.style.transform = 'rotate(180deg)';
            } else {
                content.classList.add('hidden');
                icon.style.transform = 'rotate(0deg)';
            }
        }
    </script>

    <!-- app-v3-final.js 로드 (인증 시스템) -->
    <script src="/static/app-v3-final.js?v=24.0.0"></script>
    
    <!-- 온보딩 시스템 로드 -->
    <script src="/static/onboarding-integration.js"></script>
</body>
</html>
`;
