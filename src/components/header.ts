// 통합 헤더 컴포넌트
export const headerStyles = `
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

  /* 헤더 높이를 CSS 변수로 동적 관리 (JS에서 측정하여 설정) */
  :root {
    --header-height: 56px;
    --subnav-height: 48px;
    --total-nav-height: calc(var(--header-height) + var(--subnav-height));
  }

  .header-container {
    width: 100%;
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
    font-size: 1.125rem;
    font-weight: 700;
    transition: opacity 0.2s;
  }

  /* 크레딧 배지 */
  .credit-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(4px);
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    white-space: nowrap;
  }

  .credit-badge i {
    color: #fbbf24;
  }

  /* 로그인 시에만 표시되는 nav 링크 */
  .nav-link-auth {
    display: none;
  }

  .nav-link-auth.visible {
    display: flex;
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

  /* 준비중 버튼 비활성화 스타일 */
  .nav-link.disabled {
    cursor: not-allowed;
    opacity: 0.6;
    pointer-events: none;
  }

  .nav-link.disabled:hover {
    background: transparent;
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

  .mobile-menu-button {
    display: none;
    background: rgba(255, 255, 255, 0.2);
    padding: 0.5rem;
    border-radius: 0.5rem;
    color: white;
    border: none;
    cursor: pointer;
  }

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

    .user-info-text {
      font-size: 0.75rem;
    }

    .header-btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }
  }
</style>
`;

export const headerHTML = `
<header class="unified-header">
  <div class="header-container">
    <!-- 로고 섹션 -->
    <div class="logo-section">
      <span class="logo-link" style="cursor: default;">
        <i class="fas fa-rocket"></i>
        <span>마케팅허브 AI 스튜디오</span>
      </span>
    </div>

    <!-- 네비게이션 메뉴 -->
    <nav class="nav-menu" id="navMenu">
      <a href="/dashboard" class="nav-link nav-link-auth" data-page="dashboard" id="navDashboardLink">
        <i class="fas fa-tachometer-alt"></i>
        <span>대시보드</span>
      </a>
      <a href="/postflow" class="nav-link" data-page="postflow">
        <i class="fas fa-magic"></i>
        <span>하루한포스트</span>
      </a>
      <a href="/youtube-analyzer" class="nav-link" data-page="youtube-analyzer">
        <i class="fas fa-chart-line"></i>
        <span>유튜브 파인더</span>
      </a>
      <div class="nav-link disabled" data-page="storymaker" title="스토리 메이커는 준비 중입니다" onclick="alert('🚧 스토리 메이커는 현재 열심히 개발 중입니다!\n곧 만나실 수 있습니다 😊')">
        <i class="fas fa-film"></i>
        <span>스토리 메이커</span>
        <span class="badge-preparing">준비중</span>
      </div>
      <div class="nav-link disabled" data-page="community" title="커뮤니티는 준비 중입니다" onclick="alert('🚧 커뮤니티는 현재 열심히 개발 중입니다!\n곧 만나실 수 있습니다 😊')">
        <i class="fas fa-users"></i>
        <span>커뮤니티</span>
        <span class="badge-preparing">준비중</span>
      </div>
    </nav>

    <!-- 사용자 섹션 -->
    <div class="user-section" id="userSection">
      <!-- 로그인 전: 로그인 버튼만 표시 -->
      <button class="header-btn login-btn" id="loginButton" onclick="if(window.openAuthModal) window.openAuthModal('login'); else location.href='/';" style="display: none;">
        <i class="fas fa-sign-in-alt"></i>
        <span>로그인</span>
      </button>

      <!-- 로그인 후: 크레딧 배지 -->
      <div class="credit-badge" id="creditBadge" style="display: none;">
        <i class="fas fa-coins"></i>
        <span id="creditBadgeText">0</span>
      </div>

      <!-- 로그인 후: 사용자 정보 표시 -->
      <div class="user-info-text" id="userInfoText" style="display: none;">
        <span class="user-name" id="userNameDisplay">-</span>
      </div>

      <!-- 로그인 후: 설정 버튼 -->
      <button class="header-btn" id="settingsButton" onclick="if(window.showSettingsModal) window.showSettingsModal(); else alert('설정 페이지를 로드하는 중입니다.');" style="display: none;">
        <i class="fas fa-cog"></i>
        <span>설정</span>
      </button>

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
`;

export const headerScript = `
<script>
  (function() {
    console.log('🔥 [헤더] 초기화 시작');
    
    // 헤더 함수들을 즉시 정의
    window.updateHeaderUserInfo = function(user) {
        console.log('🔥 [헤더] updateHeaderUserInfo 호출:', user);
        
        if (!user || user.isGuest || !user.isLoggedIn) {
            console.log('⚠️ [헤더] 비로그인 상태');
            document.getElementById('loginButton').style.display = 'flex';
            document.getElementById('userInfoText').style.display = 'none';
            document.getElementById('creditBadge').style.display = 'none';
            document.getElementById('settingsButton').style.display = 'none';
            document.getElementById('logoutButton').style.display = 'none';
            // 대시보드 nav 링크 숨김
            var navDashboard = document.getElementById('navDashboardLink');
            if (navDashboard) navDashboard.classList.remove('visible');
            return;
        }

        console.log('✅ [헤더] 로그인 상태 - UI 업데이트');

        // 로그인한 상태
        document.getElementById('loginButton').style.display = 'none';
        document.getElementById('userInfoText').style.display = 'flex';
        document.getElementById('creditBadge').style.display = 'inline-flex';
        document.getElementById('settingsButton').style.display = 'flex';
        document.getElementById('logoutButton').style.display = 'flex';
        // 대시보드 nav 링크 표시
        var navDashboard = document.getElementById('navDashboardLink');
        if (navDashboard) navDashboard.classList.add('visible');

        // 사용자 정보 업데이트
        const userName = user.name || user.email?.split('@')[0] || '회원';
        const tier = user.tier === 'paid' ? '유료' : '무료';
        const freeCredits = user.free_credits || 0;
        const paidCredits = user.paid_credits || 0;
        const totalCredits = freeCredits + paidCredits;

        // 천단위 콤마 포맷 헬퍼
        const fmt = (n) => Number(n).toLocaleString('ko-KR');

        document.getElementById('userNameDisplay').textContent = userName;
        // 크레딧 배지 업데이트
        document.getElementById('creditBadgeText').textContent = fmt(totalCredits);

        console.log('✅ [헤더] 사용자 정보 업데이트 완료:', {userName, tier, freeCredits, paidCredits, totalCredits});
    };

    window.updateHeaderCredits = function(credits) {
        console.log('💰 [헤더] 크레딧 업데이트:', credits);
        
        // ✅ 실제 UI 업데이트
        const freeCreditsEl = document.getElementById('headerFreeCredits');
        const paidCreditsEl = document.getElementById('headerPaidCredits');
        
        if (freeCreditsEl) freeCreditsEl.textContent = credits.free_credits || '0';
        if (paidCreditsEl) paidCreditsEl.textContent = credits.paid_credits || '0';
        
        // ✅ window.currentUser도 업데이트
        if (window.currentUser) {
            window.currentUser.free_credits = credits.free_credits || 0;
            window.currentUser.paid_credits = credits.paid_credits || 0;
        }
    };

    window.updateHeaderUser = function(userName) {
        console.log('👤 [헤더] 사용자 이름 업데이트:', userName);
    };

    // 모바일 메뉴 토글
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const navMenu = document.getElementById('navMenu');
    
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // 현재 페이지 하이라이트
    const currentPage = document.body.dataset.page || '';
    if (currentPage) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.dataset.page === currentPage) {
                link.classList.add('active');
            }
        });
    }

    // Supabase 및 currentUser 대기
    let attemptCount = 0;
    function waitForSupabaseAndSync() {
        attemptCount++;
        console.log(\`🔄 [헤더] 대기 시도 \${attemptCount}회: supabaseClient=\${!!window.supabaseClient}, currentUser=\${!!window.currentUser}\`);
        
        if (window.supabaseClient && window.currentUser) {
            console.log('✅ [헤더] Supabase 및 currentUser 준비 완료!');
            window.updateHeaderUserInfo(window.currentUser);
        } else {
            if (attemptCount < 50) {
                setTimeout(waitForSupabaseAndSync, 100);
            } else {
                console.error('❌ [헤더] 5초 대기 후에도 Supabase/currentUser 준비 안 됨');
            }
        }
    }

    // userUpdated 이벤트 리스너 - 크레딧 실시간 반영
    window.addEventListener('userUpdated', (e) => {
        console.log('🔔 [헤더] userUpdated 이벤트 수신:', e.detail);
        
        // 크레딧 정보가 있으면 즉시 헤더 업데이트
        if (e.detail && (e.detail.free_credits !== undefined || e.detail.paid_credits !== undefined)) {
            const freeCredits = e.detail.free_credits || 0;
            const paidCredits = e.detail.paid_credits || 0;
            const totalCredits = freeCredits + paidCredits;
            const fmt = (n) => Number(n).toLocaleString('ko-KR');

            // 크레딧 배지 업데이트
            const badgeEl = document.getElementById('creditBadgeText');
            if (badgeEl) {
                badgeEl.textContent = fmt(totalCredits);
                console.log('✅ [헤더] 크레딧 배지 실시간 업데이트:', totalCredits);
            }
        }
        
        // 전체 사용자 정보도 업데이트
        window.updateHeaderUserInfo(e.detail);
    });
    
    // ✅ BroadcastChannel로 크레딧 실시간 동기화
    try {
        const creditSyncChannel = new BroadcastChannel('marketing_hub_credits');
        creditSyncChannel.onmessage = (event) => {
            console.log('📡 [헤더] 크레딧 동기화 메시지 수신:', event.data);
            if (event.data && typeof event.data === 'object') {
                window.updateHeaderCredits(event.data);
            }
        };
        console.log('✅ [헤더] BroadcastChannel 구독 시작');
    } catch (error) {
        console.error('❌ [헤더] BroadcastChannel 오류:', error);
    }

    // 초기화 시작
    console.log('🚀 [헤더] waitForSupabaseAndSync 시작');
    waitForSupabaseAndSync();

    // ✅ 헤더 높이 측정 → CSS 변수 업데이트
    function measureHeader() {
      const headerEl = document.querySelector('.unified-header');
      if (headerEl) {
        const h = headerEl.offsetHeight;
        document.documentElement.style.setProperty('--header-height', h + 'px');
        console.log('📏 [헤더] 높이 측정:', h + 'px');
      }
    }
    // DOM 로드 후, 리사이즈 시 재측정
    measureHeader();
    window.addEventListener('resize', measureHeader);
    setTimeout(measureHeader, 300);
  })();
</script>
`;

// 전체 헤더 (스타일 + HTML + 스크립트)
export const header = headerStyles + headerHTML + headerScript;
