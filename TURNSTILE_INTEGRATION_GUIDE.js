/**
 * Turnstile 프론트엔드 통합 가이드
 * 
 * 이 파일은 실제 코드가 아니라 통합 가이드입니다.
 * 프론트엔드에서 Turnstile을 사용하려면 아래 코드를 참고하세요.
 */

/*
========================================
1. HTML에 Turnstile 스크립트 추가
========================================

<!-- 회원가입/로그인 폼이 있는 페이지에 추가 -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

========================================
2. 폼에 Turnstile 위젯 추가
========================================

<form id="signup-form">
  <input type="email" name="email" required>
  <input type="password" name="password" required>
  
  <!-- Turnstile 위젯 -->
  <div 
    class="cf-turnstile" 
    data-sitekey="YOUR_TURNSTILE_SITE_KEY"
    data-callback="onTurnstileSuccess"
    data-error-callback="onTurnstileError"
  ></div>
  
  <button type="submit">회원가입</button>
</form>

========================================
3. JavaScript 통합 코드
========================================

let turnstileToken = null;

// Turnstile 성공 콜백
function onTurnstileSuccess(token) {
  console.log('✅ Turnstile 검증 성공');
  turnstileToken = token;
}

// Turnstile 에러 콜백
function onTurnstileError() {
  console.error('❌ Turnstile 검증 실패');
  turnstileToken = null;
  showToast('봇 검증에 실패했습니다. 페이지를 새로고침해주세요.', 'error');
}

// 폼 제출
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Turnstile 토큰 확인
  if (!turnstileToken) {
    showToast('봇 검증을 완료해주세요.', 'error');
    return;
  }
  
  const formData = new FormData(e.target);
  const email = formData.get('email');
  const password = formData.get('password');
  
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        turnstileToken  // 🔑 토큰 전송
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast('회원가입이 완료되었습니다!', 'success');
      // 리디렉션 등...
    } else {
      showToast(result.error, 'error');
      
      // Turnstile 리셋 (재시도 허용)
      turnstile.reset();
      turnstileToken = null;
    }
  } catch (error) {
    console.error('회원가입 오류:', error);
    showToast('회원가입 중 오류가 발생했습니다.', 'error');
  }
});

========================================
4. 환경 변수 설정
========================================

Cloudflare Pages Dashboard에서 설정:

- TURNSTILE_SECRET_KEY: your-secret-key (백엔드용)
- TURNSTILE_ENABLED: true (활성화 여부)

프론트엔드 HTML에서 사용:
- data-sitekey: your-site-key (공개 키)

========================================
5. Feature Flag로 선택적 활성화
========================================

// 백엔드에서 자동으로 환경 변수 체크
if (isTurnstileEnabled(c.env) && c.env.TURNSTILE_SECRET_KEY) {
  // Turnstile 검증 수행
}

// 프로덕션에서만 활성화하고 싶다면:
// TURNSTILE_ENABLED=true (프로덕션 환경 변수)
// TURNSTILE_ENABLED=false (개발 환경 변수)

========================================
6. Cloudflare Turnstile 생성 방법
========================================

1. Cloudflare Dashboard 접속
2. 왼쪽 메뉴에서 "Turnstile" 선택
3. "Add Site" 클릭
4. Site Name 입력: "하루한포스트"
5. Domain 입력: 
   - haruhanpo-studio-new.pages.dev
   - 또는 커스텀 도메인
6. Widget Mode 선택: "Managed" (권장)
7. 생성 완료 후:
   - Site Key (공개): 프론트엔드에서 사용
   - Secret Key (비공개): 백엔드 환경 변수에 저장

========================================
7. 테스트 키 (개발용)
========================================

개발/테스트 시 사용 가능한 더미 키:

Site Key (공개):
1x00000000000000000000AA

Secret Key (비공개):
1x0000000000000000000000000000000AA

⚠️ 주의: 이 키들은 항상 통과하므로 프로덕션에서는 사용하지 마세요!

*/

export {};
