# 🛡️ 보안 강화 기능 안내

## 📋 추가된 보안 기능

### 1️⃣ Rate Limiting (요청 제한)

**목적:** IP 기반 요청 제한으로 악의적 사용 및 과도한 API 호출 방지

**적용 범위:**
- `/api/auth/*` - 인증 API: **분당 10회**
- `/api/generate*` - 콘텐츠 생성: **분당 5회**
- `/api/youtube/*` - YouTube API: **분당 20회**
- `/api/*` - 일반 API: **분당 60회**

**동작 방식:**
```
1. 클라이언트 IP 주소로 요청 추적
2. 시간 윈도우 내 요청 수 카운트
3. 제한 초과 시 429 상태 코드 반환
4. 응답 헤더에 제한 정보 포함:
   - X-RateLimit-Limit: 최대 요청 수
   - X-RateLimit-Remaining: 남은 요청 수
   - X-RateLimit-Reset: 제한 리셋 시간
   - Retry-After: 재시도 가능 시간 (초)
```

**에러 응답 예시:**
```json
{
  "error": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "retry_after": 45
}
```

**커스터마이징:**
`src/middleware/rate-limit.ts` 파일에서 설정 변경 가능:
```typescript
export const rateLimiters = {
  api: createRateLimiter({
    windowMs: 60 * 1000,    // 1분
    maxRequests: 60         // 최대 60회
  })
};
```

---

### 2️⃣ Cloudflare Turnstile (봇 방어)

**목적:** 자동화된 봇 공격 방지 (회원가입, 로그인)

**특징:**
- ✅ Google reCAPTCHA 대체 (무료, 개인정보 보호)
- ✅ Feature Flag로 선택적 활성화
- ✅ 프로덕션 환경에서만 자동 활성화

**설정 방법:**

#### 1단계: Turnstile Site 생성
```
1. Cloudflare Dashboard 접속
2. 왼쪽 메뉴 > "Turnstile" 선택
3. "Add Site" 클릭
4. 정보 입력:
   - Site Name: haruhanpo-studio
   - Domains: haruhanpo-studio-new.pages.dev
   - Widget Mode: Managed (권장)
5. 생성 완료 후 키 복사:
   - Site Key (공개 키)
   - Secret Key (비공개 키)
```

#### 2단계: 환경 변수 설정
```
Cloudflare Pages Dashboard:
Settings > Environment variables

프로덕션 환경:
- TURNSTILE_SECRET_KEY: your-secret-key
- TURNSTILE_ENABLED: true

개발 환경 (선택):
- TURNSTILE_ENABLED: false
```

#### 3단계: 프론트엔드 통합
`TURNSTILE_INTEGRATION_GUIDE.js` 파일 참고

**간단 요약:**
```html
<!-- 1. 스크립트 로드 -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>

<!-- 2. 폼에 위젯 추가 -->
<div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>

<!-- 3. 토큰을 API로 전송 -->
<script>
fetch('/api/auth/signup', {
  method: 'POST',
  body: JSON.stringify({
    email,
    password,
    turnstileToken  // ← 이 토큰 포함
  })
});
</script>
```

**테스트 키 (개발용):**
```
Site Key: 1x00000000000000000000AA
Secret Key: 1x0000000000000000000000000000000AA

⚠️ 주의: 항상 통과하므로 프로덕션에서는 사용하지 마세요!
```

---

## 📊 보안 개선 효과

### Before (개선 전)
- ❌ 무제한 API 호출 가능
- ❌ 봇 공격 방어 없음
- ⚠️ Rate Limit 소진 위험
- ⚠️ 대량 회원가입 공격 가능

### After (개선 후)
- ✅ IP당 요청 수 제한
- ✅ Turnstile 봇 검증
- ✅ Rate Limit 소진 방지
- ✅ 자동화 공격 차단

---

## 🔧 문제 해결

### Rate Limit 에러 (429)
```
문제: "요청이 너무 많습니다" 에러 발생

해결:
1. 응답 헤더의 Retry-After 확인
2. 해당 시간(초) 후 재시도
3. 정상 사용자라면 1분 후 자동 해제
```

### Turnstile 검증 실패
```
문제: "봇 검증에 실패했습니다" 에러

해결:
1. TURNSTILE_SECRET_KEY 환경 변수 확인
2. 프론트엔드 Site Key 확인
3. 토큰 만료 시 페이지 새로고침
```

### 개발 환경에서 Turnstile 비활성화
```typescript
// .dev.vars 파일에 추가
TURNSTILE_ENABLED=false
```

또는

```typescript
// wrangler.jsonc의 vars 섹션
"vars": {
  "ENVIRONMENT": "development"  // 자동으로 Turnstile 비활성화
}
```

---

## 📝 파일 구조

```
webapp/
├── src/
│   ├── middleware/
│   │   └── rate-limit.ts          # Rate Limiting 미들웨어
│   ├── utils/
│   │   └── turnstile.ts           # Turnstile 검증 유틸리티
│   └── index.tsx                  # 메인 애플리케이션 (미들웨어 적용)
├── TURNSTILE_INTEGRATION_GUIDE.js # 프론트엔드 통합 가이드
└── SECURITY_IMPROVEMENTS.md       # 이 문서
```

---

## 🎯 향후 개선 사항 (선택)

### 고려 중인 추가 개선:
1. ⏸️ Supabase 키 환경 변수 이동
2. ⏸️ JWT → HttpOnly 쿠키
3. ⏸️ 코드 스플리팅 (성능 최적화)
4. ⏸️ Sentry 로깅 통합

**현재 상태:** 보류 (현재 보안 수준으로 충분)

---

## ✅ 체크리스트

배포 전 확인 사항:

- [ ] Rate Limiting 테스트 (분당 요청 제한 확인)
- [ ] Turnstile 환경 변수 설정 완료
- [ ] 프론트엔드 Turnstile 위젯 추가 (선택)
- [ ] 프로덕션 배포 후 봇 검증 테스트
- [ ] 에러 로그 모니터링

---

**작성일:** 2026-02-03  
**버전:** 1.0.0  
**작성자:** Claude Code Assistant
