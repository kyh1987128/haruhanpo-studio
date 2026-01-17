import { header } from './components/header';

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
<body class="bg-gray-50" data-page="dashboard">
    ${header}

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
                <button onclick="alert('크레딧 충전 기능 준비중입니다.')" class="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
                    크레딧 충전
                </button>
            </div>

            <!-- 총 생성 횟수 -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">
                    <i class="fas fa-chart-bar text-green-500 mr-2"></i>총 생성 횟수
                </h3>
                <p class="text-3xl font-bold text-green-600" id="totalGenerations">0</p>
            </div>

            <!-- 이번 달 생성 -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <h3 class="text-lg font-semibold text-gray-700 mb-4">
                    <i class="fas fa-calendar-alt text-blue-500 mr-2"></i>2026년 1월
                </h3>
                <p class="text-3xl font-bold text-blue-600" id="monthlyGenerations">0</p>
            </div>
        </div>

        <!-- 서비스별 사용 현황 -->
        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">
                <i class="fas fa-chart-pie text-purple-500 mr-2"></i>서비스별 사용 현황
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-700 font-medium">하루한포스트</span>
                        <button onclick="location.href='/postflow'" class="text-sm text-purple-600 hover:text-purple-800">
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <p class="text-2xl font-bold text-purple-600 mt-2" id="postflowCount">0</p>
                </div>
                
                <div class="p-4 bg-gray-50 rounded-lg opacity-50">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-700 font-medium">TrendFinder</span>
                        <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">준비중</span>
                    </div>
                    <p class="text-2xl font-bold text-gray-400 mt-2">-</p>
                </div>
                
                <div class="p-4 bg-gray-50 rounded-lg opacity-50">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-700 font-medium">StoryMaker</span>
                        <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">준비중</span>
                    </div>
                    <p class="text-2xl font-bold text-gray-400 mt-2">-</p>
                </div>
            </div>
        </div>

        <!-- 최근 생성 콘텐츠 -->
        <div class="bg-white rounded-xl shadow-md p-6">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">
                <i class="fas fa-clock text-indigo-500 mr-2"></i>최근 생성 콘텐츠
            </h3>
            <div id="recentContent" class="space-y-4">
                <p class="text-gray-500 text-center py-8">생성된 콘텐츠가 없습니다.</p>
            </div>
        </div>
    </main>

    <script>
        console.log('🎯 [대시보드] 페이지 로드 시작');

        // 대시보드 데이터 로드
        async function loadDashboard() {
            try {
                console.log('📊 [대시보드] 데이터 로딩 시작...');
                
                // 로컬스토리지에서 사용자 정보 가져오기
                const storedUser = localStorage.getItem('postflow_user');
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    console.log('👤 [대시보드] 로컬스토리지 사용자:', user);
                    
                    // window.currentUser 설정
                    if (!window.currentUser) {
                        window.currentUser = user;
                    }
                }

                // 백엔드에서 대시보드 데이터 가져오기
                const userId = window.currentUser?.id || storedUser?.id;
                if (!userId) {
                    throw new Error('사용자 ID를 찾을 수 없습니다.');
                }
                
                const response = await fetch('/api/dashboard/stats?user_id=' + userId);
                
                if (!response.ok) {
                    throw new Error('대시보드 데이터를 가져올 수 없습니다.');
                }

                const data = await response.json();
                console.log('✅ [대시보드] 데이터 로드 성공:', data);

                // 사용자 정보 업데이트
                if (data.user) {
                    const updatedUser = {
                        ...window.currentUser,
                        name: data.user.name || window.currentUser?.name || '',
                        email: data.user.email || window.currentUser?.email || '',
                        free_credits: data.user.free_credits || 0,
                        paid_credits: data.user.paid_credits || 0,
                        tier: data.user.tier || 'free',
                    };

                    const totalCredits = updatedUser.free_credits + updatedUser.paid_credits;

                    updatedUser.isLoggedIn = true;
                    updatedUser.isGuest = false;

                    // 로컬스토리지 업데이트
                    localStorage.setItem('postflow_user', JSON.stringify(updatedUser));
                    window.currentUser = updatedUser;

                    // UI 업데이트
                    document.getElementById('freeCredits').textContent = updatedUser.free_credits || 0;
                    document.getElementById('paidCredits').textContent = updatedUser.paid_credits || 0;
                    document.getElementById('totalCredits').textContent = totalCredits || 0;

                    // 헤더 업데이트
                    if (window.updateHeaderUserInfo) {
                        window.updateHeaderUserInfo(updatedUser);
                        console.log('✅ [대시보드] 헤더 정보 업데이트 완료');
                    }
                }

                // 통계 데이터 업데이트
                if (data.stats) {
                    document.getElementById('totalGenerations').textContent = data.stats.total_generations || 0;
                    document.getElementById('monthlyGenerations').textContent = data.stats.monthly_generations || 0;
                    document.getElementById('postflowCount').textContent = data.stats.postflow_count || 0;
                }

                // 최근 콘텐츠 렌더링 (히스토리 UI 재사용)
                if (data.recent_content && data.recent_content.length > 0) {
                    const recentContent = document.getElementById('recentContent');
                    
                    // 플랫폼 아이콘 매핑 (히스토리와 동일)
                    const platformNames = {
                        blog: '<i class="fas fa-blog text-blue-600 mr-1"></i>네이버 블로그',
                        instagram: '<i class="fab fa-instagram text-pink-600 mr-1"></i>인스타그램',
                        instagram_feed: '<i class="fab fa-instagram text-pink-600 mr-1"></i>인스타그램 피드',
                        instagram_reels: '<i class="fab fa-instagram text-purple-600 mr-1"></i>인스타 릴스',
                        threads: '<i class="fas fa-at text-gray-800 mr-1"></i>스레드',
                        twitter: '<i class="fab fa-twitter text-blue-400 mr-1"></i>트위터(X)',
                        linkedin: '<i class="fab fa-linkedin text-blue-700 mr-1"></i>LinkedIn',
                        kakaotalk: '<i class="fas fa-comment-dots text-yellow-500 mr-1"></i>카카오톡',
                        brunch: '<i class="fas fa-book-open text-orange-600 mr-1"></i>브런치',
                        tiktok: '<i class="fab fa-tiktok text-black mr-1"></i>틱톡',
                        youtube: '<i class="fab fa-youtube text-red-600 mr-1"></i>유튜브',
                        youtube_shorts: '<i class="fab fa-youtube text-red-500 mr-1"></i>유튜브 쇼츠',
                        youtube_longform: '<i class="fab fa-youtube text-red-600 mr-1"></i>유튜브 롱폼',
                        metadata_generation: '<i class="fas fa-tags text-blue-600 mr-1"></i>메타데이터 생성',
                        shortform_multi: '<i class="fas fa-film text-purple-600 mr-1"></i>쇼폼 통합'
                    };
                    
                    recentContent.innerHTML = data.recent_content.map(content => {
                        // 플랫폼 배열 처리
                        const platforms = typeof content.platforms === 'string' 
                            ? content.platforms.split(',').map(p => p.trim())
                            : (Array.isArray(content.platforms) ? content.platforms : []);
                        
                        // 키워드 처리
                        const keywords = Array.isArray(content.keywords) 
                            ? content.keywords 
                            : (typeof content.keywords === 'string' ? content.keywords.split(',').map(k => k.trim()) : []);
                        
                        const keywordsDisplay = keywords.length > 3 
                            ? keywords.slice(0, 3).join(', ') + '...' 
                            : keywords.join(', ');
                        
                        // 제목 처리
                        const titleDisplay = content.title || content.brand || '제목 없음';
                        
                        return \`
                            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer">
                                <div class="flex justify-between items-start mb-2">
                                    <div class="flex-1">
                                        <h4 class="font-bold text-gray-800 text-base">\${titleDisplay}</h4>
                                        <div class="flex flex-wrap gap-1 mt-2">
                                            \${platforms.map(p => \`<span class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded inline-flex items-center">\${platformNames[p] || p}</span>\`).join('')}
                                        </div>
                                        \${keywordsDisplay ? \`<p class="text-sm text-gray-600 mt-2"><i class="fas fa-tags mr-1"></i>\${keywordsDisplay}</p>\` : ''}
                                    </div>
                                    <span class="text-xs text-gray-500 whitespace-nowrap ml-4">
                                        <i class="fas fa-clock mr-1"></i>\${new Date(content.created_at).toLocaleDateString('ko-KR')}
                                    </span>
                                </div>
                            </div>
                        \`;
                    }).join('');
                } else {
                    document.getElementById('recentContent').innerHTML = '<p class="text-gray-500 text-center py-8">생성된 콘텐츠가 없습니다.</p>';
                }

            } catch (error) {
                console.error('❌ [대시보드] 데이터 로드 실패:', error);
                alert('대시보드 데이터를 불러오는데 실패했습니다.');
            }
        }

        // 페이지 로드 후 대시보드 데이터 로드
        console.log('⏳ [대시보드] 초기화 시작...');
        
        // window.currentUser 대기 후 로드
        function waitForUser() {
            if (window.currentUser && window.currentUser.isLoggedIn) {
                console.log('✅ [대시보드] 사용자 확인 완료, 데이터 로드 시작');
                loadDashboard();
            } else {
                console.log('⏳ [대시보드] 사용자 정보 대기 중...');
                setTimeout(waitForUser, 100);
            }
        }

        waitForUser();
    </script>

    <!-- app-v3-final.js 로드 -->
    <script src="/static/app-v3-final.js"></script>
</body>
</html>
`;
