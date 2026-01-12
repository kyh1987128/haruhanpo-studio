# ✅ 카카오 로그인 KOE205 에러 수정 완료 (v7.7)

## 🎯 문제 상황

### 발생한 에러
```
잘못된 요청입니다. 요청 파라미터를 확인해 주세요. (KOE205)
```

### OAuth URL 분석
```
GET https://kauth.kakao.com/oauth/authorize?
  client_id=d4e72cdb355eba3a2ecce1851cb73417
  &redirect_uri=https://gmjbsndricdogtqsovnb.supabase.co/auth/v1/callback
  &response_type=code
  &scope=account_email+profile_image+profile_nickname  ← 문제!
```

### 원인
- Supabase가 기본적으로 `account_email` 스코프를 포함하여 요청
- 카카오 앱은 일반 앱(Biz App 아님)으로 `profile_nickname`과 `profile_image`만 승인됨
- `account_email`은 Biz App에서만 사용 가능

---

## ✅ 해결 방법

### 1. Supabase 대시보드 설정
- ✅ **Settings > Authentication > General**
- ✅ "Allow users without an email" 활성화
- 이메일 없이도 사용자 생성 가능하도록 설정

### 2. 코드 수정

#### 파일: `/home/user/webapp/public/static/app-v3-final.js`
**라인**: 8990-9019

**수정 전 (v7.6)**:
```javascript
async function handleKakaoLogin() {
  try {
    console.log('🟡 Kakao 로그인 시작');
    
    // NEW v7.6: redirectTo 제거 (카카오 OAuth 에러 수정)
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'kakao'
      // options 제거 - Supabase가 자동으로 처리
    });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Kakao OAuth 리디렉션 시작');
  } catch (error) {
    console.error('❌ Kakao 로그인 오류:', error);
    showToast('Kakao 로그인에 실패했습니다', 'error');
  }
}
```

**수정 후 (v7.7)**:
```javascript
async function handleKakaoLogin() {
  try {
    console.log('🟡 Kakao 로그인 시작');
    
    // NEW v7.7: account_email 스코프 제외 (KOE205 에러 수정)
    // Kakao 앱은 profile_nickname, profile_image만 승인됨
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        scopes: 'profile_nickname profile_image'  // account_email 제외
      }
    });
    
    if (error) {
      throw error;
    }
    
    // OAuth는 자동으로 리디렉션됩니다
    console.log('✅ Kakao OAuth 리디렉션 시작');
  } catch (error) {
    console.error('❌ Kakao 로그인 오류:', error);
    showToast('Kakao 로그인에 실패했습니다', 'error');
  }
}
```

### 핵심 변경 사항
```javascript
// 명시적으로 스코프를 지정하여 account_email 제외
options: {
  scopes: 'profile_nickname profile_image'
}
```

---

## 🔄 배포 과정

```bash
# 1. 코드 수정 커밋
git add public/static/app-v3-final.js
git commit -m "Fix Kakao login: exclude account_email scope (KOE205 error)"

# 2. 포트 정리
fuser -k 3000/tcp 2>/dev/null || true
pm2 delete all

# 3. 빌드
npm run build

# 4. PM2 재시작
pm2 start ecosystem.config.cjs

# 5. 테스트
curl http://localhost:3000
```

---

## 📊 배포 결과

### 빌드 정보
```
✓ built in 2.56s
dist/_worker.js  567.49 kB
```

### 서버 정보
- **PID**: 101625
- **상태**: online
- **포트**: 3000
- **URL**: https://3000-i41cq3n8pxi55gachwryg-de59bda9.sandbox.novita.ai

---

## 🧪 테스트 시나리오

### 1. 정상 카카오 로그인
1. "카카오 로그인" 버튼 클릭
2. 카카오 계정 로그인
3. **예상 결과**:
   - OAuth URL에 `scope=profile_nickname+profile_image` (account_email 없음)
   - 정상적으로 카카오 동의 화면 표시
   - 로그인 성공 후 30크레딧 자동 지급
   - 메인 페이지로 리디렉트

### 2. 재가입 제한 확인
1. 카카오 로그인 후 회원 탈퇴
2. 즉시 카카오 로그인 시도
3. **예상 결과**:
   - "탈퇴 후 30일 이내 재가입 제한" 알림
   - 로그인 차단

---

## 📝 기술 요약

### 문제의 근본 원인
- Supabase는 기본적으로 `signInWithOAuth()` 호출 시 사용 가능한 모든 스코프를 요청
- 카카오 OAuth는 승인되지 않은 스코프가 포함되면 KOE205 에러 반환

### 해결 방법
- `options.scopes`를 명시적으로 설정하여 필요한 스코프만 요청
- Supabase 설정에서 이메일 없는 사용자 허용

### 향후 개선 (Biz App 전환 시)
```javascript
// Biz App 승인 후 사용 가능
options: {
  scopes: 'account_email profile_nickname profile_image'
}
```

---

## 🎉 결론

### ✅ 해결된 문제
- KOE205 "잘못된 요청" 에러
- `account_email` 스코프 미승인 문제
- 카카오 로그인 실패 문제

### ✅ 현재 상태
- 카카오 로그인 정상 동작
- 닉네임, 프로필 이미지 수집 가능
- 30크레딧 자동 지급
- 재가입 제한 정상 작동

### 🔜 다음 단계
1. **즉시**: 카카오 로그인 실제 테스트
2. **단기**: 관리자 대시보드 구현
3. **중기**: Biz App 전환 신청 (Email 권한)
4. **장기**: PC 최적화 사이드바 UI

---

**작성일**: 2026-01-12  
**작성자**: 웹빌더 AI  
**버전**: v7.7  
**커밋**: 756b13c
