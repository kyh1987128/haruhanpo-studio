// ===================================
// 하루한포 AI 스튜디오 - 비회원 랜딩 페이지
// ===================================

export const landingPageTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>하루한포 AI 스튜디오 - AI로 콘텐츠 제작을 10배 빠르게</title>
    <meta name="description" content="30초 만에 12개 플랫폼 콘텐츠 자동 생성, 유튜브 AI 분석, 영상 스토리보드 제작까지. 1개 계정으로 3개 서비스 모두 이용하세요.">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- 헤더 -->
    <header class="bg-white shadow-md sticky top-0 z-50">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <!-- 로고 -->
                <div class="flex items-center gap-2">
                    <div class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        🏠 하루한포 AI 스튜디오
                    </div>
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
                                <div class="font-semibold text-purple-600">📝 PostFlow</div>
                                <div class="text-xs text-gray-500">멀티 플랫폼 콘텐츠 생성</div>
                            </a>
                            <a href="#trendfinder" class="block px-4 py-3 hover:bg-blue-50">
                                <div class="font-semibold text-blue-600">📊 TrendFinder</div>
                                <div class="text-xs text-gray-500">유튜브 AI 분석기</div>
                            </a>
                            <a href="#storymaker" class="block px-4 py-3 hover:bg-green-50 rounded-b-lg">
                                <div class="font-semibold text-green-600">🎬 StoryMaker</div>
                                <div class="text-xs text-gray-500">AI 영상 스토리보드</div>
                            </a>
                        </div>
                    </div>
                    <a href="/community" class="text-gray-700 hover:text-purple-600 font-medium">커뮤니티</a>
                    <a href="#pricing" class="text-gray-700 hover:text-purple-600 font-medium">가격</a>
                </div>
                
                <!-- CTA 버튼 -->
                <div class="flex items-center gap-3">
                    <a href="/postflow" class="text-gray-700 hover:text-purple-600 font-medium px-4 py-2">로그인</a>
                    <a href="/postflow" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all">
                        회원가입
                    </a>
                </div>
            </div>
        </nav>
    </header>

    <!-- 히어로 섹션 -->
    <section class="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center max-w-4xl mx-auto">
                <h1 class="text-5xl md:text-6xl font-extrabold mb-6">
                    AI로 콘텐츠 제작을<br>
                    <span class="text-yellow-300">10배 빠르게</span>
                </h1>
                <p class="text-xl md:text-2xl mb-8 opacity-90">
                    30초 만에 12개 플랫폼 콘텐츠 자동 생성<br>
                    유튜브 분석부터 영상 기획까지, 모든 것을 한 곳에서
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a href="/postflow" class="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all hover:scale-105">
                        🎁 무료로 시작하기 (30 크레딧 증정 + 매월 30 크레딧)
                    </a>
                    <a href="#services" class="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all">
                        서비스 둘러보기
                    </a>
                </div>
                <p class="mt-6 text-sm opacity-75">
                    💳 신용카드 등록 불필요 · 3초 만에 시작 · 언제든 취소 가능
                </p>
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

            <!-- PostFlow -->
            <div id="postflow" class="mb-20">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div class="inline-block bg-purple-100 text-purple-600 px-4 py-2 rounded-full font-semibold mb-4">
                            📝 Service 1
                        </div>
                        <h3 class="text-3xl font-bold text-gray-900 mb-4">PostFlow</h3>
                        <p class="text-xl text-gray-600 mb-6">멀티 플랫폼 콘텐츠 생성</p>
                        <p class="text-gray-700 mb-6 leading-relaxed">
                            이미지 하나만 업로드하면 30초 만에 12개 플랫폼 맞춤 콘텐츠를 자동으로 생성합니다.
                            블로그, 인스타그램, 유튜브, 트위터 등 모든 SNS에 최적화된 콘텐츠를 한 번에!
                        </p>
                        <ul class="space-y-3 mb-8">
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-purple-600 mt-1"></i>
                                <span><strong>12개 플랫폼</strong> 동시 콘텐츠 생성</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-purple-600 mt-1"></i>
                                <span><strong>AI 이미지 분석</strong>으로 키워드 자동 추출</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-purple-600 mt-1"></i>
                                <span><strong>톤앤매너 맞춤</strong> 브랜드 맞춤 콘텐츠</span>
                            </li>
                        </ul>
                    </div>
                    <div class="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-8 h-96 flex items-center justify-center">
                        <div class="text-center">
                            <i class="fas fa-image text-8xl text-purple-600 mb-4"></i>
                            <p class="text-gray-700 font-semibold">이미지 업로드</p>
                            <p class="text-gray-500 text-sm mt-2">→ 30초 후 →</p>
                            <p class="text-purple-600 font-bold text-lg mt-2">12개 플랫폼 콘텐츠 완성!</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TrendFinder -->
            <div id="trendfinder" class="mb-20">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div class="order-2 md:order-1 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-8 h-96 flex items-center justify-center">
                        <div class="text-center">
                            <i class="fas fa-chart-line text-8xl text-blue-600 mb-4"></i>
                            <p class="text-gray-700 font-semibold">경쟁 채널 추적</p>
                            <p class="text-gray-500 text-sm mt-2">+</p>
                            <p class="text-blue-600 font-bold text-lg mt-2">바이럴 패턴 예측</p>
                        </div>
                    </div>
                    <div class="order-1 md:order-2">
                        <div class="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full font-semibold mb-4">
                            📊 Service 2
                        </div>
                        <h3 class="text-3xl font-bold text-gray-900 mb-4">TrendFinder</h3>
                        <p class="text-xl text-gray-600 mb-6">유튜브 AI 분석기</p>
                        <p class="text-gray-700 mb-6 leading-relaxed">
                            경쟁 채널을 실시간으로 추적하고, AI가 바이럴 패턴을 예측합니다.
                            "다음에 뭘 만들어야 할까?" 고민은 이제 그만!
                        </p>
                        <ul class="space-y-3 mb-8">
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-blue-600 mt-1"></i>
                                <span><strong>컴페티터 알람</strong> 실시간 추적 시스템</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-blue-600 mt-1"></i>
                                <span><strong>AI 콘텐츠 기획</strong> 자동 제안</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-blue-600 mt-1"></i>
                                <span><strong>썸네일 분석</strong> CTR 예측 모델</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- StoryMaker -->
            <div id="storymaker" class="mb-20">
                <div class="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div class="inline-block bg-green-100 text-green-600 px-4 py-2 rounded-full font-semibold mb-4">
                            🎬 Service 3
                        </div>
                        <h3 class="text-3xl font-bold text-gray-900 mb-4">StoryMaker</h3>
                        <p class="text-xl text-gray-600 mb-6">AI 영상 스토리보드 제작</p>
                        <p class="text-gray-700 mb-6 leading-relaxed">
                            영상 기획부터 콘티까지 AI가 자동으로 생성합니다.
                            TrendFinder의 인사이트를 활용해 바이럴 영상을 쉽게 제작하세요.
                        </p>
                        <ul class="space-y-3 mb-8">
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-green-600 mt-1"></i>
                                <span><strong>자동 시나리오</strong> 생성</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-green-600 mt-1"></i>
                                <span><strong>장면별 콘티</strong> 및 카메라 앵글 제안</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check-circle text-green-600 mt-1"></i>
                                <span><strong>프리뷰 영상</strong> 자동 생성 (곧 출시)</span>
                            </li>
                        </ul>
                    </div>
                    <div class="bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl p-8 h-96 flex items-center justify-center">
                        <div class="text-center">
                            <i class="fas fa-film text-8xl text-green-600 mb-4"></i>
                            <p class="text-gray-700 font-semibold">영상 아이디어</p>
                            <p class="text-gray-500 text-sm mt-2">→ AI 분석 →</p>
                            <p class="text-green-600 font-bold text-lg mt-2">완성된 스토리보드!</p>
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
                            <i class="fas fa-edit"></i> PostFlow
                        </h4>
                        <ul class="space-y-2 text-sm text-gray-700">
                            <li>• 1개 플랫폼 콘텐츠 생성 = <strong>1 크레딧</strong></li>
                            <li>• 12개 플랫폼 전체 생성 = <strong>12 크레딧</strong></li>
                            <li class="text-xs text-gray-500 pt-2">
                                예시: 이미지 1장 → 블로그/인스타/유튜브 등 12개 콘텐츠 자동 생성
                            </li>
                        </ul>
                    </div>

                    <!-- TrendFinder -->
                    <div>
                        <h4 class="font-bold text-blue-600 mb-4 flex items-center gap-2">
                            <i class="fas fa-chart-line"></i> TrendFinder
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
                            <i class="fas fa-film"></i> StoryMaker
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

    <!-- CTA 섹션 -->
    <section class="bg-gradient-to-r from-purple-600 to-blue-600 py-20">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <h2 class="text-4xl font-bold mb-6">지금 시작하세요</h2>
            <p class="text-xl mb-8 opacity-90">
                신규 가입 시 30 크레딧을 무료로 드리고, 매월 30 크레딧이 자동 지급됩니다.<br>
                신용카드 등록 없이 3초 만에 시작할 수 있어요.
            </p>
            <a href="/postflow" class="inline-block bg-white text-purple-600 px-12 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all hover:scale-105">
                무료로 시작하기 →
            </a>
        </div>
    </section>

    <!-- 푸터 -->
    <footer class="bg-gray-900 text-white py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid md:grid-cols-4 gap-8 mb-8">
                <div>
                    <h3 class="font-bold text-lg mb-4">하루한포 AI 스튜디오</h3>
                    <p class="text-gray-400 text-sm">AI로 콘텐츠 제작을 10배 빠르게</p>
                </div>
                <div>
                    <h4 class="font-semibold mb-3">서비스</h4>
                    <ul class="space-y-2 text-gray-400 text-sm">
                        <li><a href="#postflow" class="hover:text-white">PostFlow</a></li>
                        <li><a href="#trendfinder" class="hover:text-white">TrendFinder</a></li>
                        <li><a href="#storymaker" class="hover:text-white">StoryMaker</a></li>
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
                        <li><a href="#" class="hover:text-white">환불 정책</a></li>
                        <li><a href="#" class="hover:text-white">개인정보처리방침</a></li>
                        <li><a href="#" class="hover:text-white">이용약관</a></li>
                    </ul>
                </div>
            </div>
            <div class="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
                <p>© 2026 하루한포 AI 스튜디오. All rights reserved.</p>
                <p class="mt-2">문의: contentitda@naver.com</p>
            </div>
        </div>
    </footer>
</body>
</html>
`;
