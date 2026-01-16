export const dashboardTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>마케팅허브 AI - 대시보드</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <!-- 헤더 -->
    <header class="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div class="container mx-auto px-6 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <a href="javascript:void(0)" onclick="handleLogoClick()" class="text-2xl font-bold hover:opacity-80 transition cursor-pointer">
                        🏠 마케팅허브 AI
                    </a>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <p class="text-sm font-semibold" id="headerUserName">사용자</p>
                        <p class="text-xs">
                            <span id="headerUserTier">무료</span> | 
                            <span id="headerUserCredits" class="font-bold">0크레딧</span>
                        </p>
                    </div>
                    <button onclick="if(window.handleLogout) window.handleLogout(); else alert('로그아웃 기능을 초기화하는 중입니다.');" class="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition text-sm font-medium">
                        <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- 네비게이션 -->
    <nav class="bg-white shadow-md">
        <div class="container mx-auto px-6 py-4">
            <div class="flex space-x-6">
                <a href="/dashboard" class="text-purple-600 border-b-2 border-purple-600 pb-2 font-medium">
                    <i class="fas fa-chart-line mr-2"></i>대시보드
                </a>
                <a href="/postflow" class="text-gray-600 hover:text-purple-600 pb-2 transition">
                    <i class="fas fa-pen-fancy mr-2"></i>하루한포스트
                </a>
                <a href="/trendfinder" class="text-gray-400 pb-2 cursor-not-allowed">
                    <i class="fas fa-chart-bar mr-2"></i>유튜브 파인더 (준비중)
                </a>
                <a href="/storymaker" class="text-gray-400 pb-2 cursor-not-allowed">
                    <i class="fas fa-video mr-2"></i>스토리 메이커 (준비중)
                </a>
                <a href="/community" class="text-gray-400 pb-2 cursor-not-allowed">
                    <i class="fas fa-users mr-2"></i>커뮤니티 (준비중)
                </a>
            </div>
        </div>
    </nav>

    <!-- 메인 콘텐츠 -->
    <main class="container mx-auto px-6 py-8">
        <!-- 통계 카드 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <!-- 크레딧 카드 -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-700">
                        <i class="fas fa-coins text-yellow-500 mr-2"></i>내 크레딧
                    </h3>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600">무료 크레딧</span>
                        <span class="text-xl font-bold text-green-600" id="freeCredits">0</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600">유료 크레딧</span>
                        <span class="text-xl font-bold text-purple-600" id="paidCredits">0</span>
                    </div>
                    <div class="border-t pt-2 mt-2">
                        <div class="flex justify-between items-center">
                            <span class="font-semibold text-gray-700">총 크레딧</span>
                            <span class="text-2xl font-bold text-blue-600" id="totalCredits">0</span>
                        </div>
                    </div>
                </div>
                <button onclick="alert('크레딧 충전 기능 준비중')" class="mt-4 w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition">
                    <i class="fas fa-plus mr-2"></i>크레딧 충전
                </button>
            </div>

            <!-- 총 생성 횟수 -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-700">
                        <i class="fas fa-file-alt text-blue-500 mr-2"></i>총 생성 횟수
                    </h3>
                </div>
                <div class="text-center">
                    <p class="text-5xl font-bold text-blue-600" id="totalGenerations">0</p>
                    <p class="text-sm text-gray-500 mt-2">전체 콘텐츠</p>
                </div>
            </div>

            <!-- 이번 달 생성 -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-700">
                        <i class="fas fa-calendar-check text-green-500 mr-2"></i>이번 달 생성
                    </h3>
                </div>
                <div class="text-center">
                    <p class="text-5xl font-bold text-green-600" id="monthlyGenerations">0</p>
                    <p class="text-sm text-gray-500 mt-2">2026년 1월</p>
                </div>
            </div>
        </div>

        <!-- 서비스별 통계 -->
        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <h3 class="text-xl font-bold text-gray-800 mb-6">
                <i class="fas fa-chart-pie text-purple-500 mr-2"></i>서비스별 사용 현황
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="border-l-4 border-purple-500 pl-4">
                    <p class="text-sm text-gray-600">하루한포스트</p>
                    <p class="text-3xl font-bold text-purple-600" id="postflowCount">0</p>
                </div>
                <div class="border-l-4 border-blue-300 pl-4 opacity-50">
                    <p class="text-sm text-gray-600">TrendFinder</p>
                    <p class="text-3xl font-bold text-blue-300">0</p>
                    <p class="text-xs text-gray-400">준비중</p>
                </div>
                <div class="border-l-4 border-green-300 pl-4 opacity-50">
                    <p class="text-sm text-gray-600">StoryMaker</p>
                    <p class="text-3xl font-bold text-green-300">0</p>
                    <p class="text-xs text-gray-400">준비중</p>
                </div>
            </div>
        </div>

        <!-- 최근 생성 콘텐츠 -->
        <div class="bg-white rounded-xl shadow-md p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-6">
                <i class="fas fa-history text-orange-500 mr-2"></i>최근 생성 콘텐츠
            </h3>
            <div id="recentContent" class="space-y-4">
                <p class="text-center text-gray-500 py-8">로딩 중...</p>
            </div>
        </div>
    </main>

    <script>
        // 페이지 로드 시 데이터 가져오기
        async function loadDashboard() {
            const user = JSON.parse(localStorage.getItem('postflow_user') || '{}');
            
            if (!user.id) {
                window.location.href = '/';
                return;
            }

            // 헤더 업데이트
            document.getElementById('headerUserName').textContent = user.name || user.email || '사용자';
            document.getElementById('headerUserTier').textContent = user.tier === 'paid' ? '유료' : '무료';
            document.getElementById('headerUserCredits').textContent = \`\${(user.free_credits || 0) + (user.paid_credits || 0)}크레딧\`;

            // 크레딧 카드 업데이트
            document.getElementById('freeCredits').textContent = user.free_credits || 0;
            document.getElementById('paidCredits').textContent = user.paid_credits || 0;
            document.getElementById('totalCredits').textContent = (user.free_credits || 0) + (user.paid_credits || 0);

            try {
                // 통계 API 호출
                console.log('📊 대시보드 통계 API 호출:', user.id);
                const response = await fetch(\`/api/stats?user_id=\${user.id}\`);
                
                if (!response.ok) {
                    throw new Error(\`API 오류: \${response.status}\`);
                }
                
                const result = await response.json();
                console.log('✅ API 응답:', result);
                
                if (!result.success || !result.data) {
                    throw new Error('유효하지 않은 응답');
                }
                
                const data = result.data;

                // 총 생성 횟수 업데이트
                document.getElementById('totalGenerations').textContent = data.stats.total_generations || 0;
                document.getElementById('monthlyGenerations').textContent = data.stats.monthly_generations || 0;
                document.getElementById('postflowCount').textContent = data.stats.postflow_count || 0;

                // 최근 콘텐츠 렌더링
                const recentContent = document.getElementById('recentContent');
                if (data.recent_content && data.recent_content.length > 0) {
                    recentContent.innerHTML = data.recent_content.map(item => {
                        // platforms 배열을 문자열로 변환
                        const platformText = Array.isArray(item.platforms) 
                            ? item.platforms.join(', ') 
                            : (item.platforms || '알 수 없음');
                        
                        // keywords 배열을 문자열로 변환
                        const keywordsText = Array.isArray(item.keywords) && item.keywords.length > 0
                            ? item.keywords.slice(0, 3).join(', ') + (item.keywords.length > 3 ? '...' : '')
                            : '';
                        
                        return \`
                            <div class="border-l-4 border-purple-500 pl-4 py-3 hover:bg-gray-50 transition rounded-r-lg">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <p class="font-semibold text-gray-800">\${platformText}</p>
                                        <p class="text-sm text-gray-600 mt-1">
                                            <i class="fas fa-building text-gray-400 mr-1"></i>\${item.brand || '브랜드 없음'}
                                        </p>
                                        \${keywordsText ? \`
                                            <p class="text-xs text-gray-500 mt-1">
                                                <i class="fas fa-tags text-gray-400 mr-1"></i>\${keywordsText}
                                            </p>
                                        \` : ''}
                                        <p class="text-xs text-gray-400 mt-2">
                                            <i class="far fa-clock mr-1"></i>\${new Date(item.created_at).toLocaleString('ko-KR')}
                                        </p>
                                    </div>
                                    <div class="text-right ml-4">
                                        <span class="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                            <i class="fas fa-coins mr-1"></i>\${item.credits_used || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        \`;
                    }).join('');
                } else {
                    recentContent.innerHTML = \`
                        <div class="text-center py-12">
                            <i class="fas fa-inbox text-gray-300 text-5xl mb-4"></i>
                            <p class="text-gray-500 text-lg">아직 생성한 콘텐츠가 없습니다</p>
                            <p class="text-gray-400 text-sm mt-2">하루한포스트에서 첫 콘텐츠를 만들어보세요!</p>
                            <button onclick="location.href='/postflow'" class="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                <i class="fas fa-plus mr-2"></i>하루한포스트 시작하기
                            </button>
                        </div>
                    \`;
                }
            } catch (error) {
                console.error('❌ 대시보드 데이터 로드 실패:', error);
                document.getElementById('recentContent').innerHTML = \`
                    <div class="text-center py-12">
                        <i class="fas fa-exclamation-triangle text-red-400 text-5xl mb-4"></i>
                        <p class="text-red-500 text-lg">데이터를 불러오지 못했습니다</p>
                        <p class="text-gray-500 text-sm mt-2">\${error.message}</p>
                        <button onclick="loadDashboard()" class="mt-4 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                            <i class="fas fa-redo mr-2"></i>다시 시도
                        </button>
                    </div>
                \`;
            }
        }

        loadDashboard();
    </script>
    
    <!-- 🔥 로고 클릭 핸들러를 위한 app-v3-final.js 로드 -->
    <script src="/static/app-v3-final.js"></script>
</body>
</html>
`;
