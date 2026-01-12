# authMode 변수 호이스팅 에러 수정 ✅

**수정 일시**: 2026-01-11 16:20 UTC  
**에러**: `Uncaught ReferenceError: Cannot access 'authMode' before initialization`  
**원인**: `authMode` 변수가 함수 선언 이후에 선언됨

---

## 🐛 에러 상황

### 콘솔 에러
```javascript
Uncaught ReferenceError: Cannot access 'authMode' before initialization
    at openAuthModal (app-v3-final.js?v=15.0.0:8617:12)
    at HTMLButtonElement.<anonymous> (app-v3-final.js?v=15.0.0:5770:47)
```

### 증상
- "회원가입" 버튼 클릭 → 에러 발생
- "로그인" 버튼 클릭 → 에러 발생
- 모달이 표시되지 않음

---

## 🔍 원인 분석

### JavaScript 호이스팅 문제

**잘못된 코드 구조**:
```javascript
// 5770번 라인: 이벤트 리스너 등록
signupBtn.addEventListener('click', () => openAuthModal('signup'));

// ... 3000줄 후 ...

// 8617번 라인: 함수 선언
function openAuthModal(mode = 'signup') {
  authMode = mode; // ❌ authMode가 아직 선언되지 않음!
  // ...
}

// 8613번 라인: 변수 선언
let authMode = 'signup'; // ❌ 함수보다 아래에 있음!
```

### 실행 순서
1. 페이지 로드 → 이벤트 리스너 등록 (5770번 라인)
2. 사용자가 버튼 클릭
3. `openAuthModal('signup')` 호출
4. 함수 내부에서 `authMode = mode` 실행
5. **에러 발생**: `authMode`가 아직 초기화되지 않음 (TDZ - Temporal Dead Zone)

### let/const의 호이스팅 특성
- `let`/`const`는 **호이스팅되지만 초기화되지 않음**
- 선언 이전에 접근하면 `ReferenceError` 발생
- `var`와 달리 TDZ(Temporal Dead Zone)가 존재

---

## ✅ 수정 내용

### 1. 전역 변수 섹션으로 이동 (7번 라인)

**수정 전** (8613번 라인):
```javascript
// ========================================
// 인증 모달 함수 (NEW v7.3 - Updated with Login Mode)
// ========================================

// 현재 인증 모드 (signup or login)
let authMode = 'signup'; // ❌ 너무 아래에 있음

// 회원가입 모달 열기 (회원가입 모드)
function openAuthModal(mode = 'signup') {
  authMode = mode;
  // ...
}
```

**수정 후** (7번 라인):
```javascript
// 전역 변수
let authMode = 'signup'; // ✅ 맨 위로 이동
let selectedImages = [];
let contentBlocks = {};
// ...
```

### 2. 중복 선언 제거

**수정 전**:
```javascript
// 7번 라인
let authMode = 'signup'; // ✅ 첫 번째 선언

// ... 8600줄 후 ...

// 8613번 라인
let authMode = 'signup'; // ❌ 중복 선언!
```

**수정 후**:
```javascript
// 7번 라인
let authMode = 'signup'; // ✅ 유일한 선언

// ... 8600줄 후 ...

// 8613번 라인
// (삭제됨)
```

---

## 🎯 변경 파일

### `public/static/app-v3-final.js`

**변경 1**: 7번 라인에 추가
```javascript
let authMode = 'signup'; // 인증 모드 (signup or login)
```

**변경 2**: 8613-8614번 라인 삭제
```javascript
// 현재 인증 모드 (signup or login)
let authMode = 'signup'; // (삭제됨)
```

---

## 🧪 테스트 결과

### 수정 전
```javascript
❌ "회원가입" 버튼 클릭 → ReferenceError
❌ "로그인" 버튼 클릭 → ReferenceError
❌ 모달 표시 안 됨
```

### 수정 후
```javascript
✅ "회원가입" 버튼 클릭 → 회원가입 모달 표시
✅ "로그인" 버튼 클릭 → 로그인 모달 표시
✅ authMode 정상 동작
```

---

## 📦 배포 정보

- **빌드 시각**: 2026-01-11 16:20 UTC
- **빌드 크기**: 556.13 kB
- **PM2 PID**: 97718
- **공개 URL**: https://3000-i41cq3n8pxi55gachwryg-de59bda9.sandbox.novita.ai

---

## ✅ 완료 체크리스트

- ✅ `authMode` 변수를 파일 맨 위로 이동 (7번 라인)
- ✅ 중복 선언 제거 (8613-8614번 라인)
- ✅ 빌드 및 배포 완료
- ✅ 서버 정상 작동 확인

---

## 🎉 최종 결과

**에러 수정 완료!**

이제:
1. ✅ "회원가입" 버튼 정상 작동
2. ✅ "로그인" 버튼 정상 작동
3. ✅ 모달 표시 정상
4. ✅ 모드 전환 정상

**테스트 방법**:
1. **강력 새로고침**: Ctrl+Shift+R (Windows/Linux) 또는 Cmd+Shift+R (Mac)
2. **회원가입 버튼 클릭** → 모달 표시 확인 ✅
3. **로그인 버튼 클릭** → 모달 표시 확인 ✅
4. **콘솔 에러 없음** ✅

---

## 📚 배운 점

### JavaScript 호이스팅 관련
1. **`let`/`const`는 TDZ가 존재**
   - 선언 이전에 접근 불가
   - `ReferenceError` 발생

2. **전역 변수는 파일 맨 위에 선언**
   - 함수보다 위에 있어야 함
   - 여러 곳에서 사용되는 변수는 최상단에 배치

3. **중복 선언 금지**
   - `let`/`const`는 같은 스코프에서 재선언 불가
   - 전역 변수는 한 번만 선언

---

**작성자**: 웹개발 빌더 AI  
**최종 업데이트**: 2026-01-11 16:20 UTC
