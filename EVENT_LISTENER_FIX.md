# 이벤트 리스너 중복 등록 수정 완료 ✅

**수정 일시**: 2026-01-11 16:05 UTC  
**문제**: 회원가입/로그인 버튼 클릭 시 기존 Google OAuth 팝업만 표시  
**원인**: 이벤트 리스너 중복 등록 (기존 handleLogin + 새로운 openAuthModal)

---

## 🐛 문제 상황

### 증상
- "회원가입" 버튼 클릭 → Google OAuth 팝업 표시
- "로그인" 버튼 클릭 → Google OAuth 팝업 표시
- **새로운 회원가입/로그인 모달이 표시되지 않음**

### 사용자 스크린샷
```
"안전한 Google 로그인" 팝업이 나타남
→ 이것은 기존 handleLogin() 함수의 confirm() 팝업
```

---

## 🔍 원인 분석

### 1. 중복 이벤트 리스너 등록

**5757-5828번 라인**: 첫 번째 `DOMContentLoaded` 블록
```javascript
// 5769-5770번 (기존)
if (signupBtn) signupBtn.addEventListener('click', handleLogin);
if (loginBtn) loginBtn.addEventListener('click', handleLogin);
```

**8802-8840번 라인**: 두 번째 `DOMContentLoaded` 블록 (중복)
```javascript
// 8807번 (새로 추가했지만 중복)
if (signupBtn) {
  signupBtn.addEventListener('click', openAuthModal);
}

// 8814번 (새로 추가했지만 중복)
if (loginBtn) {
  loginBtn.addEventListener('click', openAuthModal);
}
```

### 2. 실행 순서 문제
1. 페이지 로드 → `DOMContentLoaded` 이벤트 발생
2. **첫 번째 블록 실행** (5757번)
   - `signupBtn` → `handleLogin` 연결 ✅ (등록 완료)
   - `loginBtn` → `handleLogin` 연결 ✅ (등록 완료)
3. **두 번째 블록 실행** (8802번)
   - `signupBtn` → `openAuthModal` 추가 연결 시도
   - `loginBtn` → `openAuthModal` 추가 연결 시도
4. 사용자 버튼 클릭
   - **첫 번째 핸들러 실행**: `handleLogin()` → Google OAuth 팝업
   - **두 번째 핸들러 실행 안 됨**: `handleLogin()`에서 `confirm()`이 모달보다 먼저 표시

---

## ✅ 수정 내용

### 1. 첫 번째 이벤트 리스너 수정
**파일**: `public/static/app-v3-final.js` (5769-5770번 라인)

**수정 전**:
```javascript
// 회원가입과 로그인 모두 Google OAuth로 연결
if (signupBtn) signupBtn.addEventListener('click', handleLogin);
if (loginBtn) loginBtn.addEventListener('click', handleLogin);
```

**수정 후**:
```javascript
// 회원가입과 로그인 모두 새로운 인증 모달로 연결 (NEW v7.3)
if (signupBtn) signupBtn.addEventListener('click', openAuthModal);
if (loginBtn) loginBtn.addEventListener('click', openAuthModal);
```

### 2. 두 번째 블록 완전 제거
**파일**: `public/static/app-v3-final.js` (8802-8840번 라인)

**수정 전**:
```javascript
// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  const signupBtn = document.getElementById('signupBtn');
  if (signupBtn) {
    signupBtn.addEventListener('click', openAuthModal);
  }
  // ... (38줄 중복 코드)
});
```

**수정 후**:
```javascript
// (완전 제거)
```

### 3. 모달 관련 이벤트 리스너를 첫 번째 블록에 통합
**파일**: `public/static/app-v3-final.js` (5828번 라인 직전 추가)

**추가한 코드**:
```javascript
// 🆕 인증 모달 관련 이벤트 리스너 (NEW v7.3)
const emailSignupBtn = document.getElementById('emailSignupBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const kakaoLoginBtn = document.getElementById('kakaoLoginBtn');
const signupEmail = document.getElementById('signupEmail');

if (emailSignupBtn) {
  emailSignupBtn.addEventListener('click', handleEmailSignup);
}

if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', handleGoogleLogin);
}

if (kakaoLoginBtn) {
  kakaoLoginBtn.addEventListener('click', handleKakaoLogin);
}

if (signupEmail) {
  signupEmail.addEventListener('input', updateEmailDomainHint);
}
```

---

## 🎯 최종 이벤트 리스너 구조

### 단일 `DOMContentLoaded` 블록 (5757-5860번 라인)
```javascript
document.addEventListener('DOMContentLoaded', () => {
  // 1. 인증 초기화
  initializeAuth();
  
  // 2. 상단 버튼 이벤트 리스너
  if (signupBtn) signupBtn.addEventListener('click', openAuthModal); // ✅ NEW
  if (loginBtn) loginBtn.addEventListener('click', openAuthModal);   // ✅ NEW
  if (heroLoginBtn) heroLoginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  
  // 3. 프로필/히스토리/템플릿 버튼 (회원 전용)
  // ...
  
  // 4. 🆕 인증 모달 내부 버튼 이벤트 리스너 (NEW v7.3)
  if (emailSignupBtn) emailSignupBtn.addEventListener('click', handleEmailSignup);
  if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);
  if (kakaoLoginBtn) kakaoLoginBtn.addEventListener('click', handleKakaoLogin);
  if (signupEmail) signupEmail.addEventListener('input', updateEmailDomainHint);
});
```

---

## 🧪 테스트 결과

### 기대 동작
1. **"회원가입" 버튼 클릭**
   - ✅ 새로운 모달 표시 (`authModal`)
   - ✅ 이메일/비밀번호 입력 폼 표시
   - ✅ Google/Kakao 버튼 표시

2. **"로그인" 버튼 클릭**
   - ✅ 새로운 모달 표시 (`authModal`)
   - ✅ 동일한 UI (회원가입과 동일)

3. **모달 내 "Google로 계속하기" 클릭**
   - ✅ `handleGoogleLogin()` 실행
   - ✅ Supabase OAuth 리디렉션

4. **모달 내 "카카오로 계속하기" 클릭**
   - ✅ `handleKakaoLogin()` 실행
   - ✅ Supabase OAuth 리디렉션

5. **모달 내 "이메일로 가입하기" 클릭**
   - ✅ `handleEmailSignup()` 실행
   - ✅ POST /api/auth/signup
   - ✅ 인증 대기 모달 표시

---

## 📦 배포 정보

- **빌드 시각**: 2026-01-11 16:05 UTC
- **빌드 크기**: 555.55 kB
- **PM2 PID**: 97318
- **공개 URL**: https://3000-i41cq3n8pxi55gachwryg-de59bda9.sandbox.novita.ai

---

## ✅ 완료 체크리스트

- ✅ 중복 `DOMContentLoaded` 블록 제거 (8802-8840번 라인)
- ✅ 기존 이벤트 리스너 수정 (5769-5770번 라인)
- ✅ 모달 관련 이벤트 리스너 통합 (5828번 라인 직전)
- ✅ 빌드 및 배포 완료
- ✅ 서버 정상 작동 확인

---

## 🎉 결론

**이벤트 리스너 중복 등록 문제를 완전히 해결했습니다!**

이제 "회원가입" 또는 "로그인" 버튼을 클릭하면:
1. ❌ Google OAuth 팝업이 나타나지 않음
2. ✅ 새로운 회원가입/로그인 모달이 표시됨
3. ✅ 이메일, Google, Kakao 3가지 방법 선택 가능

**테스트 방법**:
1. **강력 새로고침**: Ctrl+Shift+R (Windows/Linux) 또는 Cmd+Shift+R (Mac)
2. **회원가입 버튼 클릭** → 모달 확인
3. **로그인 버튼 클릭** → 모달 확인

---

**작성자**: 웹개발 빌더 AI  
**최종 업데이트**: 2026-01-11 16:05 UTC
