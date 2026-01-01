# 하루한포 백엔드 통합 가이드

## 📋 목차
1. [개요](#개요)
2. [사전 준비사항](#사전-준비사항)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [환경 변수 설정](#환경-변수-설정)
5. [코드 통합](#코드-통합)
6. [테스트 시나리오](#테스트-시나리오)
7. [배포](#배포)
8. [트러블슈팅](#트러블슈팅)

---

## 개요

**하루한포 백엔드 시스템**은 다음 핵심 기능을 제공합니다:

### ✅ 구현된 기능
- **회원 시스템**: 비회원(IP 기반 1회), 무료회원(월 3회), 유료회원(월 30회)
- **파일 처리**: 이미지(1~5장) + 문서(PDF/DOCX/TXT, 1~3개) 통합 처리
- **크레딧 시스템**: 생성 1회당 1크레딧 차감, 자동 충전, 월 리셋
- **결제 연동**: 토스페이먼츠 월 구독(₩9,900) 및 Webhook
- **동적 컨텍스트**: 3가지 시나리오(이미지만/문서만/이미지+문서)

### 📊 비용 구조
- **시나리오1 (이미지만)**: ₩92/회
- **시나리오2 (문서만)**: ₩40/회 (절감형)
- **시나리오3 (통합)**: ₩105/회 (프리미엄)

---

## 사전 준비사항

### 1. Supabase 프로젝트 생성
1. https://supabase.com 접속
2. 새 프로젝트 생성: "haruhanpo-backend"
3. 리전: Seoul (ap-northeast-2)
4. Database 비밀번호 설정 및 저장

### 2. Google OAuth 설정
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성: "하루한포"
3. API 및 서비스 → OAuth 동의 화면
   - 사용자 유형: 외부
   - 앱 이름: 하루한포
   - 지원 이메일: 본인 이메일
4. 사용자 인증 정보 → OAuth 2.0 클라이언트 ID
   - 애플리케이션 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI: 
     ```
     https://[PROJECT_ID].supabase.co/auth/v1/callback
     ```
5. **클라이언트 ID**와 **클라이언트 보안 비밀** 복사

### 3. 토스페이먼츠 개발자 등록
1. https://www.tosspayments.com 접속
2. 개발자센터 가입
3. 내 애플리케이션 → 새 애플리케이션 생성
4. **클라이언트 키**와 **시크릿 키** 복사
5. Webhook URL 설정:
   ```
   https://your-domain.pages.dev/api/payments/webhook
   ```

---

## 데이터베이스 설정

### 1. Supabase SQL 스키마 실행

**Supabase Dashboard → SQL Editor → New Query**

```bash
# 로컬에서 파일 복사
cat /home/user/webapp/supabase-schema.sql
```

전체 SQL을 복사하여 Supabase SQL Editor에 붙여넣고 **Run** 실행

### 2. 실행 결과 확인

```sql
-- 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 예상 결과:
-- users
-- generations  
-- credit_transactions
-- payments
-- uploaded_files
-- trial_usage
```

### 3. RLS 정책 확인

```sql
-- RLS가 활성화되었는지 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 모두 rowsecurity = true 여야 함
```

### 4. 함수 테스트

```sql
-- deduct_credit 함수 테스트 (실제 사용자 ID로 교체)
SELECT deduct_credit('user-uuid-here', 1);

-- 결과: true (크레딧 차감 성공)
```

---

## 환경 변수 설정

### 1. Cloudflare Workers 환경 변수

**Cloudflare Dashboard → Workers & Pages → [프로젝트] → Settings → Environment Variables**

#### Production 환경

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anon 키 | `eyJhbGc...` |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role 키 | `eyJhbGc...` |
| `TOSS_CLIENT_KEY` | 토스 클라이언트 키 | `test_ck_...` |
| `TOSS_SECRET_KEY` | 토스 시크릿 키 | `test_sk_...` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | `123456...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 비밀 | `GOCSPX-...` |
| `OPENAI_API_KEY` | OpenAI API 키 (기존) | `sk-proj-...` |
| `GEMINI_API_KEY` | Gemini API 키 (기존) | `AIzaSy...` |

#### Preview/Development 환경

동일한 변수 + 테스트용 키 사용:
- `TOSS_CLIENT_KEY`: `test_ck_...`
- `TOSS_SECRET_KEY`: `test_sk_...`

### 2. 로컬 개발 환경 (.dev.vars)

`.dev.vars` 파일 생성:

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# Google OAuth
GOOGLE_CLIENT_ID=123456...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Toss Payments (테스트 키)
TOSS_CLIENT_KEY=test_ck_...
TOSS_SECRET_KEY=test_sk_...

# OpenAI & Gemini (기존)
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
```

⚠️ **주의**: `.dev.vars`는 `.gitignore`에 포함되어야 합니다!

### 3. wrangler.jsonc 타입 바인딩 설정

`wrangler.jsonc`에 타입 정의 추가:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "haruhanpo",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  
  // 환경 변수 타입 힌트
  "vars": {
    "ENVIRONMENT": "production"
  }
}
```

### 4. TypeScript 타입 정의 확장

`src/types/bindings.d.ts` 생성:

```typescript
export interface Env {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  
  // Toss Payments
  TOSS_CLIENT_KEY: string;
  TOSS_SECRET_KEY: string;
  
  // OpenAI & Gemini
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
}
```

---

## 코드 통합

### 1. src/index.tsx 수정

기존 `src/index.tsx`에 미들웨어 및 라우트 통합:

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Env } from './types/bindings'

// 미들웨어
import { authMiddleware } from './middleware/auth'
import { checkCredits } from './middleware/credits'

// 라우트
import paymentsRouter from './routes/payments'

const app = new Hono<{ Bindings: Env }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 제공
app.use('/static/*', serveStatic({ root: './public' }))

// 인증 라우트
app.get('/api/auth/google', (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/callback`
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=openid email profile&` +
    `access_type=offline`
  
  return c.redirect(googleAuthUrl)
})

// 결제 라우트 통합
app.route('/api/payments', paymentsRouter)

// 기존 /api/generate 엔드포인트에 미들웨어 적용
app.post('/api/generate',
  authMiddleware,
  checkCredits,
  async (c) => {
    // 기존 생성 로직 유지
    // c.get('user')로 사용자 정보 접근
    // c.get('isGuest')로 비회원 여부 확인
    
    // ... 기존 코드 ...
    
    return c.json({ success: true })
  }
)

// 기존 라우트 유지
app.get('/', (c) => {
  return c.html(`<!-- 기존 HTML -->`)
})

export default app
```

### 2. 의존성 설치

```bash
cd /home/user/webapp

# Supabase 클라이언트
npm install @supabase/supabase-js

# 파일 처리 (Cloudflare Workers 호환 버전)
npm install pdf-parse mammoth

# TypeScript 타입
npm install -D @types/node
```

### 3. 빌드 및 실행

```bash
# 빌드
npm run build

# 로컬 개발 서버 (포트 정리 후)
fuser -k 3000/tcp 2>/dev/null || true
pm2 start ecosystem.config.cjs

# 테스트
curl http://localhost:3000
```

---

## 테스트 시나리오

### 1. 비회원 체험 (IP 기반 1회 제한)

```bash
# 첫 번째 요청 (성공)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["https://example.com/image.jpg"],
    "brand": "테스트",
    "platforms": ["instagram"]
  }'

# 예상 응답: { "success": true, "remaining_credits": 0 }

# 두 번째 요청 (실패 - 체험 소진)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# 예상 응답: 
# { 
#   "error": "무료 체험이 소진되었습니다.", 
#   "message": "Google 로그인하시면 월 3회 무료 크레딧을 받으실 수 있어요!" 
# }
```

### 2. Google 로그인 (무료회원 월 3회)

```bash
# 브라우저에서 접속
open http://localhost:3000/api/auth/google

# Google 로그인 후 리디렉션
# → Supabase에서 사용자 생성 및 초기 크레딧 3개 지급

# 크레딧 확인
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer [ACCESS_TOKEN]"

# 예상 응답:
# { 
#   "user": { "email": "...", "credits": 3 }, 
#   "subscription_status": "free" 
# }
```

### 3. 파일 처리 시나리오

#### 시나리오1: 이미지만 (₩92/회)

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer [TOKEN]" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "brand=카페봄날" \
  -F "platforms=instagram"

# 예상: Vision API 사용, 이미지 기반 컨텍스트 생성
```

#### 시나리오2: 문서만 (₩40/회 - 절감형)

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer [TOKEN]" \
  -F "documents=@info.pdf" \
  -F "brand=카페봄날" \
  -F "platforms=blog"

# 예상: 텍스트 추출만, 팩트 중심 콘텐츠
# 경고 메시지: "이미지가 없어 시각적 요소가 제한됩니다"
```

#### 시나리오3: 이미지+문서 (₩105/회 - 프리미엄)

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer [TOKEN]" \
  -F "images=@image1.jpg" \
  -F "documents=@menu.pdf" \
  -F "brand=카페봄날" \
  -F "platforms=instagram,blog"

# 예상: Vision + 텍스트 추출, 통합 컨텍스트
# 최고 품질 콘텐츠 생성
```

### 4. 크레딧 부족 처리

```bash
# 크레딧 0인 상태에서 생성 시도
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{ ... }'

# 예상 응답 (403):
# {
#   "error": "크레딧이 부족합니다",
#   "current_credits": 0,
#   "required_credits": 1,
#   "payment_options": {
#     "subscription": { "price": 9900, "credits": 30 },
#     "one_time": [
#       { "price": 4500, "credits": 10 },
#       { "price": 8500, "credits": 20 }
#     ]
#   }
# }
```

### 5. 토스페이먼츠 결제

#### 구독 결제 요청

```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 9900,
    "orderName": "하루한포 월 구독 (30회)",
    "customerName": "홍길동",
    "customerEmail": "test@example.com"
  }'

# 예상 응답:
# {
#   "paymentUrl": "https://pay.toss.im/...",
#   "orderId": "order-uuid-...",
#   "amount": 9900
# }

# 브라우저에서 paymentUrl 접속 → 결제 완료
# → Webhook 자동 호출 → 크레딧 30개 충전
```

#### Webhook 검증 (Toss에서 자동 호출)

```bash
# Toss Payments에서 자동 호출 (서명 검증 필수)
# POST /api/payments/webhook
# Body: { "orderId": "...", "status": "DONE", ... }

# 처리 결과:
# 1. 서명 검증 성공
# 2. payments 테이블에 기록
# 3. deduct_credit(-30) → 크레딧 충전
# 4. subscription_status = 'active'
# 5. subscription_end_date = 30일 후
```

### 6. 월 크레딧 리셋 (자동)

```sql
-- Cron으로 매일 실행되는 함수
SELECT reset_monthly_credits();

-- 매월 1일에 subscription_status='active'인 모든 사용자의
-- 크레딧을 30으로 리셋
```

---

## 배포

### 1. Cloudflare Pages 배포

```bash
cd /home/user/webapp

# 빌드
npm run build

# 배포 (프로젝트명: haruhanpo)
npx wrangler pages deploy dist --project-name haruhanpo

# 배포 URL 확인
# Production: https://haruhanpo.pages.dev
```

### 2. 환경 변수 설정 (프로덕션)

```bash
# Supabase
npx wrangler pages secret put SUPABASE_URL --project-name haruhanpo
npx wrangler pages secret put SUPABASE_ANON_KEY --project-name haruhanpo
npx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name haruhanpo

# Google OAuth
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name haruhanpo
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name haruhanpo

# Toss Payments (프로덕션 키로 교체!)
npx wrangler pages secret put TOSS_CLIENT_KEY --project-name haruhanpo
npx wrangler pages secret put TOSS_SECRET_KEY --project-name haruhanpo

# OpenAI & Gemini (기존)
npx wrangler pages secret put OPENAI_API_KEY --project-name haruhanpo
npx wrangler pages secret put GEMINI_API_KEY --project-name haruhanpo
```

### 3. 토스페이먼츠 Webhook URL 업데이트

1. https://www.tosspayments.com 로그인
2. 내 애플리케이션 → Webhook 설정
3. URL 업데이트:
   ```
   https://haruhanpo.pages.dev/api/payments/webhook
   ```
4. 저장

### 4. Google OAuth 리디렉션 URI 업데이트

1. https://console.cloud.google.com
2. API 및 서비스 → 사용자 인증 정보
3. OAuth 2.0 클라이언트 → 리디렉션 URI 추가:
   ```
   https://[SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback
   ```

### 5. 배포 검증

```bash
# 프로덕션 URL 테스트
curl https://haruhanpo.pages.dev

# API 엔드포인트 테스트
curl https://haruhanpo.pages.dev/api/health

# Google 로그인 테스트 (브라우저)
open https://haruhanpo.pages.dev/api/auth/google
```

---

## 트러블슈팅

### 1. Supabase 연결 실패

**증상**: `Error: Invalid Supabase URL`

**해결**:
```bash
# 환경 변수 확인
echo $SUPABASE_URL

# 올바른 형식: https://xxx.supabase.co
# 잘못된 형식: https://xxx.supabase.co/ (끝에 / 제거)
```

### 2. Google OAuth 리디렉션 오류

**증상**: `redirect_uri_mismatch`

**해결**:
1. Google Cloud Console에서 리디렉션 URI 확인
2. 정확히 일치해야 함:
   ```
   https://[PROJECT_ID].supabase.co/auth/v1/callback
   ```
3. Supabase Dashboard → Authentication → Providers → Google에서 설정 확인

### 3. 토스페이먼츠 서명 검증 실패

**증상**: `Invalid signature`

**해결**:
```typescript
// TOSS_SECRET_KEY가 정확한지 확인
const secretKey = c.env.TOSS_SECRET_KEY

// 서명 생성 확인
const expectedSignature = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(secretKey + webhookData.orderId)
)

console.log('Expected:', expectedSignature)
console.log('Received:', webhookData.signature)
```

### 4. 크레딧 차감 실패

**증상**: `deduct_credit returned false`

**해결**:
```sql
-- 사용자 크레딧 확인
SELECT id, email, credits FROM users WHERE id = 'user-uuid';

-- 크레딧이 0이면 차감 실패 → 정상 동작
-- 크레딧이 있는데 실패하면 함수 로그 확인:

-- 함수 재생성
DROP FUNCTION IF EXISTS deduct_credit(UUID, INTEGER);
-- supabase-schema.sql에서 deduct_credit 함수 재실행
```

### 5. 파일 업로드 실패

**증상**: `Failed to extract text from PDF`

**해결**:
```typescript
// PDF 파일 크기 확인 (최대 10MB)
const maxSize = 10 * 1024 * 1024
if (file.size > maxSize) {
  throw new Error('파일 크기가 너무 큽니다')
}

// MIME 타입 확인
const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
if (!allowedTypes.includes(file.type)) {
  throw new Error('지원하지 않는 파일 형식입니다')
}
```

### 6. RLS 정책 오류

**증상**: `new row violates row-level security policy`

**해결**:
```sql
-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Service Role Key 사용 확인
-- Service Role Key는 RLS를 우회하므로 관리 작업에 사용
```

---

## 📊 최종 체크리스트

### 데이터베이스
- [ ] Supabase 프로젝트 생성 완료
- [ ] `supabase-schema.sql` 실행 완료
- [ ] 6개 테이블 생성 확인
- [ ] RLS 정책 활성화 확인
- [ ] `deduct_credit` 함수 테스트 성공

### 환경 변수
- [ ] Cloudflare Workers에 9개 환경 변수 설정
- [ ] `.dev.vars` 파일 생성 (로컬 개발)
- [ ] `.gitignore`에 `.dev.vars` 포함 확인

### 외부 서비스
- [ ] Google OAuth 설정 완료
- [ ] 리디렉션 URI 등록 완료
- [ ] 토스페이먼츠 개발자 등록 완료
- [ ] Webhook URL 설정 완료

### 코드 통합
- [ ] 의존성 설치 완료 (`@supabase/supabase-js` 등)
- [ ] `src/index.tsx`에 미들웨어 통합
- [ ] `src/routes/payments.ts` 라우트 추가
- [ ] TypeScript 타입 정의 확장

### 테스트
- [ ] 비회원 체험 1회 제한 동작 확인
- [ ] Google 로그인 시 크레딧 3개 지급 확인
- [ ] 3가지 파일 시나리오 모두 작동 확인
- [ ] 크레딧 부족 시 403 응답 확인
- [ ] 토스페이먼츠 결제 성공 확인
- [ ] Webhook으로 크레딧 자동 충전 확인

### 배포
- [ ] 프로덕션 빌드 성공
- [ ] Cloudflare Pages 배포 완료
- [ ] 프로덕션 환경 변수 설정
- [ ] Google OAuth 프로덕션 URI 업데이트
- [ ] 토스페이먼츠 프로덕션 키로 교체
- [ ] 프로덕션 URL 동작 확인

---

## 🎯 다음 단계

### 즉시 실행 (오늘)
1. Supabase 프로젝트 생성 (10분)
2. Google OAuth 설정 (15분)
3. 토스페이먼츠 등록 (15분)
4. SQL 스키마 실행 (5분)
5. 환경 변수 설정 (10분)

**예상 소요 시간**: 55분

### 1주일 내
1. 로컬 통합 테스트 (3시간)
2. 크몽/숨고 포트폴리오 3개 생성 (2시간)
3. 프로덕션 배포 (1시간)
4. 실사용자 테스트 (1주)

### 1개월 내
1. 피드백 기반 개선
2. 추가 결제 옵션 (추가 크레딧)
3. 관리자 대시보드
4. 사용 통계 분석

---

## 📞 지원

문제가 발생하면 다음 정보를 포함하여 문의하세요:

1. **오류 메시지** (전체 스택 트레이스)
2. **재현 단계** (순서대로)
3. **환경 정보** (로컬/프로덕션, 브라우저 등)
4. **관련 로그** (Cloudflare Workers 로그, Supabase 로그)

---

**최종 업데이트**: 2025-01-01  
**버전**: v1.0.0  
**작성자**: GenSpark AI Agent  
**라이선스**: MIT
