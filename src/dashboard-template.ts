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
    <!-- 통합 헤더 컴포넌트 (인라인) -->
    <style>
      /* 통합 헤더 스타일 */
      .unified-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem 0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 1000;
      }

      .header-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .logo-section {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .logo-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
        text-decoration: none;
        font-size: 1.25rem;
        font-weight: 700;
        transition: opacity 0.2s;
      }

      .logo-link:hover {
        opacity: 0.9;
      }

      .nav-menu {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        color: white;
        text-decoration: none;
        border-radius: 0.5rem;
        font-weight: 500;
        transition: all 0.2s;
        position: relative;
      }

      .nav-link:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .nav-link.active {
        background: rgba(255, 255, 255, 0.25);
        font-weight: 600;
      }

      .badge-preparing {
        position: absolute;
        top: -0.25rem;
        right: -0.25rem;
        background: #fbbf24;
        color: #1f2937;
        font-size: 0.625rem;
        font-weight: 700;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        white-space: nowrap;
      }

      .user-section {
        display: flex !important;
        align-items: center;
        gap: 0.75rem;
        color: white;
        font-size: 0.875rem;
      }

      .user-info-text {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0;
      }

      .user-info-text span {
        white-space: nowrap;
      }

      .user-name {
        font-weight: 600;
      }

      .user-tier {
        color: #fbbf24;
        font-weight: 500;
      }

      .user-credits {
        font-size: 0.8125rem;
      }

      .divider {
        color: rgba(255, 255, 255, 0.5);
        margin: 0 0.25rem;
      }

      .header-btn {
        background: rgba(255, 255, 255, 0.2);
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        color: white;
        border: none;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
        font-size: 0.875rem;
      }

      .header-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .login-btn {
        background: rgba(255, 255, 255, 0.25);
        padding: 0.5rem 1.25rem;
      }

      /* 모바일 메뉴 토글 */
      .mobile-menu-button {
        display: none;
        background: rgba(255, 255, 255, 0.2);
        padding: 0.5rem;
        border-radius: 0.5rem;
        color: white;
        border: none;
        cursor: pointer;
      }

      /* 모바일 반응형 */
      @media (max-width: 768px) {
        .nav-menu {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          flex-direction: column;
          padding: 1rem;
          gap: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .nav-menu.active {
          display: flex;
        }

        .mobile-menu-button {
          display: block;
        }

        .credits-badge {
          font-size: 0.875rem;
          padding: 0.375rem 0.75rem;
        }

        .user-button {
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
        }
      }
    </style>

    <header class="unified-header">
      <div class="header-container">
        <!-- 로고 섹션 -->
        <div class="logo-section">
          <span class="logo-link" style="cursor: default;">
            <i class="fas fa-rocket"></i>
            <span>마케팅허브 AI</span>
          </span>
        </div>

        <!-- 네비게이션 메뉴 -->
        <nav class="nav-menu" id="navMenu">
          <a href="/postflow" class="nav-link" data-page="postflow">
            <i class="fas fa-magic"></i>
            <span>하루한포스트</span>
          </a>
          <a href="/static/trendfinder.html" class="nav-link" data-page="trendfinder">
            <i class="fas fa-chart-line"></i>
            <span>유튜브 파인더</span>
            <span class="badge-preparing">준비중</span>
          </a>
          <a href="/static/storymaker.html" class="nav-link" data-page="storymaker">
            <i class="fas fa-film"></i>
            <span>스토리 메이커</span>
            <span class="badge-preparing">준비중</span>
          </a>
          <a href="/static/community.html" class="nav-link" data-page="community">
            <i class="fas fa-users"></i>
            <span>커뮤니티</span>
            <span class="badge-preparing">준비중</span>
          </a>
        </nav>

        <!-- 사용자 섹션 -->
        <div class="user-section" id="userSection">
          <!-- 로그인 전: 로그인 버튼만 표시 -->
          <button class="header-btn login-btn" id="loginButton" onclick="if(window.openAuthModal) window.openAuthModal('login'); else location.href='/';" style="display: none;">
            <i class="fas fa-sign-in-alt"></i>
            <span>로그인</span>
          </button>

          <!-- 로그인 후: 사용자 정보 표시 -->
          <div class="user-info-text" id="userInfoText" style="display: none;">
            <span class="user-name" id="userNameDisplay">-</span>
            <span class="divider">|</span>
            <span class="user-tier" id="userTierDisplay">-</span>
            <span class="divider">|</span>
            <span class="user-credits" id="userCreditsDisplay">무료 0 / 유료 0</span>
          </div>
          
          <!-- 로그인 후: 대시보드 버튼 (로그인한 사용자만) -->
          <a href="/dashboard" class="header-btn" id="dashboardButton" style="display: none;">
            <i class="fas fa-chart-line"></i>
            <span>대시보드</span>
          </a>

          <!-- 로그인 후: 설정 버튼 -->
          <a href="/settings" class="header-btn" id="settingsButton" style="display: none;">
            <i class="fas fa-cog"></i>
            <span>설정</span>
          </a>

          <!-- 로그인 후: 로그아웃 버튼 -->
          <button class="header-btn" id="logoutButton" onclick="if(window.handleLogout) window.handleLogout(); else alert('로그아웃 기능을 초기화하는 중입니다.');" style="display: none;">
            <i class="fas fa-sign-out-alt"></i>
            <span>로그아웃</span>
          </button>

          <!-- 모바일 메뉴 버튼 -->
          <button class="mobile-menu-button" id="mobileMenuButton">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      </div>
    </header>

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

            console.log('📊 [대시보드] 초기 사용자 정보:', user);

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

                // 🔥 사용자 크레딧 정보 업데이트 (API에서 최신 정보 가져오기)
                if (data.user) {
                    console.log('✅ [대시보드] API에서 받은 사용자 정보:', data.user);
                    
                    // localStorage 업데이트
                    const updatedUser = {
                        ...user,
                        name: data.user.name || user.name,
                        email: data.user.email || user.email,
                        free_credits: data.user.free_credits || 0,
                        paid_credits: data.user.paid_credits || 0,
                        tier: data.user.tier || 'free',
                        credits: (data.user.free_credits || 0) + (data.user.paid_credits || 0),
                        isLoggedIn: true,
                        isGuest: false
                    };
                    localStorage.setItem('postflow_user', JSON.stringify(updatedUser));
                    window.currentUser = updatedUser;
                    
                    // 크레딧 카드 업데이트
                    document.getElementById('freeCredits').textContent = data.user.free_credits || 0;
                    document.getElementById('paidCredits').textContent = data.user.paid_credits || 0;
                    document.getElementById('totalCredits').textContent = (data.user.free_credits || 0) + (data.user.paid_credits || 0);
                    
                    // 헤더 업데이트
                    if (typeof window.updateHeaderUserInfo === 'function') {
                        window.updateHeaderUserInfo(updatedUser);
                    }
                    
                    console.log('✅ [대시보드] 크레딧 정보 업데이트 완료:', updatedUser);
                }

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

        // 🔥 헤더 함수들을 즉시 정의 (setTimeout 밖에서)
        // 사용자 정보 전체 업데이트
        window.updateHeaderUserInfo = function(user) {
            if (!user) {
                // 로그인 안 한 상태
                document.getElementById('loginButton').style.display = 'flex';
                document.getElementById('userInfoText').style.display = 'none';
                document.getElementById('dashboardButton').style.display = 'none';
                document.getElementById('settingsButton').style.display = 'none';
                document.getElementById('logoutButton').style.display = 'none';
                return;
            }
            
            if (user.isGuest || !user.isLoggedIn) {
                // 게스트 상태
                document.getElementById('loginButton').style.display = 'flex';
                document.getElementById('userInfoText').style.display = 'none';
                document.getElementById('dashboardButton').style.display = 'none';
                document.getElementById('settingsButton').style.display = 'none';
                document.getElementById('logoutButton').style.display = 'none';
                return;
            }

            // 로그인한 상태
            document.getElementById('loginButton').style.display = 'none';
            document.getElementById('userInfoText').style.display = 'flex';
            document.getElementById('dashboardButton').style.display = 'flex';
            document.getElementById('settingsButton').style.display = 'flex';
            document.getElementById('logoutButton').style.display = 'flex';

            // 사용자 정보 업데이트
            const userName = user.name || user.email?.split('@')[0] || '회원';
            const tier = user.tier === 'paid' ? '유료' : '무료';
            const freeCredits = user.free_credits || 0;
            const paidCredits = user.paid_credits || 0;

            document.getElementById('userNameDisplay').textContent = userName;
            document.getElementById('userTierDisplay').textContent = tier;
            document.getElementById('userCreditsDisplay').textContent = \`무료 \${freeCredits} / 유료 \${paidCredits}\`;
        };

        // 크레딧만 업데이트 (하위 호환성)
        window.updateHeaderCredits = function(credits) {
            // 크레딧 카드 업데이트용
            console.log('Header credits updated:', credits);
        };

        // 사용자 이름만 업데이트 (하위 호환성)
        window.updateHeaderUser = function(userName) {
            console.log('Header user updated:', userName);
        };

        // 헤더 UI 초기화를 위해 약간의 지연 후 실행
        setTimeout(() => {
            // 현재 페이지 하이라이트
            const currentPage = document.body.dataset.page || 'dashboard';
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                if (link.dataset.page === currentPage) {
                    link.classList.add('active');
                }
            });

            // 모바일 메뉴 토글
            const mobileMenuButton = document.getElementById('mobileMenuButton');
            const navMenu = document.getElementById('navMenu');
            
            if (mobileMenuButton) {
                mobileMenuButton.addEventListener('click', () => {
                    navMenu.classList.toggle('active');
                });
            }

            // Supabase 초기화 대기 후 사용자 정보 동기화
            function waitForSupabaseAndSync() {
                if (window.supabaseClient && window.currentUser) {
                    // 헤더 사용자 정보 업데이트
                    window.updateHeaderUserInfo(window.currentUser);
                } else {
                    setTimeout(waitForSupabaseAndSync, 100);
                }
            }

            // userUpdated 이벤트 리스너
            window.addEventListener('userUpdated', (e) => {
                const user = e.detail;
                window.updateHeaderUserInfo(user);
            });

            waitForSupabaseAndSync();
            loadDashboard();
        }, 100);
    </script>
    
    <!-- 🔥 로고 클릭 핸들러를 위한 app-v3-final.js 로드 -->
    <script src="/static/app-v3-final.js"></script>
</body>
</html>
`;
