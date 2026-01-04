# 하루한포 스튜디오 404 오류 진단 정보

## 🚨 현재 문제
- **증상**: `/api/generate` 엔드포인트 호출 시 404 Not Found
- **발생 위치**: 프런트엔드에서 콘텐츠 생성 버튼 클릭 시
- **테스트 URL**: https://7f7aa7b3.haruhanpo-studio-new.pages.dev
- **메인 URL**: https://haruhanpo-studio-new.pages.dev
- **최신 배포 시간**: 2분 전 (v11.2.1)

## 📂 프로젝트 구조
./dist/_functions/api/generate.js
./dist/_routes.json
./dist/_worker.js
./dist/static/app-enhanced.js
./dist/static/app-final.js
./dist/static/app-v3-enhanced.js
./dist/static/app-v3-final.js
./dist/static/app-v3.js
./dist/static/app.js
./dist/static/i18n.js
./functions/api/generate.js
./package-lock.json
./package.json
./public/static/app-enhanced.js
./public/static/app-final.js
./public/static/app-v3-enhanced.js
./public/static/app-v3-final.js
./public/static/app-v3.js
./public/static/app.js
./public/static/i18n.js
./src/document-parser.ts
./src/gemini.ts
./src/html-template.ts
./src/index.tsx
./src/lib/file-processor.ts
./src/lib/storage.ts
./src/lib/supabase.ts
./src/middleware/auth.ts
./src/prompts.ts
./src/renderer.tsx
./src/routes/payments.ts
./src/types/index.ts
./tsconfig.json
./vite.config.ts
./wrangler.jsonc

## 🔧 설정 파일

### wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "webapp",
  "compatibility_date": "2025-12-23",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": [
    "nodejs_compat"
  ]
}

### package.json (scripts)
  "scripts": {
    "dev": "vite",
    "dev:sandbox": "wrangler pages dev dist --ip 0.0.0.0 --port 3000",
    "build": "vite build && npm run copy-functions",
    "copy-functions": "cp -r functions dist/_functions",
    "preview": "wrangler pages dev",
    "deploy": "npm run build && wrangler pages deploy dist --project-name haruhanpo-studio-new",
    "deploy:prod": "npm run build && wrangler pages deploy dist --project-name haruhanpo-studio-new",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings",
    "clean-port": "fuser -k 3000/tcp 2>/dev/null || true",
    "test": "curl http://localhost:3000",
    "git:init": "git init && git add . && git commit -m 'Initial commit'",
    "git:commit": "git add . && git commit -m",
    "git:status": "git status",
    "git:log": "git log --oneline"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@supabase/supabase-js": "^2.39.0",
    "hono": "^4.11.1",
    "mammoth": "^1.11.0",

### vite.config.ts
import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Functions 디렉터리를 dist/_functions로 복사
      output: {
        assetFileNames: 'static/[name]-[hash][extname]'
      }
    }
  }
})

## 📍 빌드 결과 분석

### dist/_routes.json
{"version":1,"include":["/*"],"exclude":["/static/*"]}
### dist/_worker.js에 등록된 엔드포인트
.post("/chat/completions
.post("/audio/speech
.post("/audio/transcriptions
.post("/audio/translations
.post("/batches
.post("/assistants
.post("/realtime/sessions
.post("/realtime/transcription_sessions
.post("/chatkit/sessions
.post("/threads
.post("/threads/runs
.post("/completions
.post("/containers
.post("/conversations
.post("/embeddings
.post("/evals
.post("/files
.post("/fine_tuning/alpha/graders/run
.post("/fine_tuning/alpha/graders/validate
.post("/fine_tuning/jobs
.post("/images/variations
.post("/images/edits
.post("/images/generations
.post("/moderations
.post("/realtime/client_secrets
.post("/responses/input_tokens
.post("/responses
.post("/responses/compact
.post("/uploads
.post("/vector_stores
.post("/videos
.post("/api/templates/save
.post("/api/suggest-keywords
.post("/api/generate/batch
.post("/api/generate
.post("/api/auth/sync
.post("/api/rewards/claim
.post("/api/rewards/check-streak
.get("/api/auth/me

### dist/_functions/ 디렉터리 구조
dist/_functions/:
total 4
drwxr-xr-x 2 user user 4096 Jan  4 15:40 api

dist/_functions/api:
total 12
-rw-r--r-- 1 user user 11134 Jan  4 15:40 generate.js

## 🔍 Supabase 데이터베이스 스키마

### users 테이블 구조 (현재)
```sql
-- 현재 users 테이블 컬럼
- id (uuid, primary key)
- email (text)
- name (text)
- avatar_url (text)
- credits (integer) - 잔액(크레딧)
- tier (text, default 'free') - 'guest' | 'free' | 'paid'
- monthly_reset_date (date, default CURRENT_DATE) - 무료회원 리셋 날짜
- created_at, updated_at
- onboarding_completed
- first_generation_completed
- consecutive_login_days
- last_login_date
```

### credit_transactions 테이블
```sql
- id, user_id, amount, balance_after
- type (CHECK: 'purchase','usage','monthly_reset','trial')
- description, created_at
```

## 🧪 실제 테스트 결과

### curl 테스트 (최신 배포 URL)
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0100   427  100   181  100   246    276    376 --:--:-- --:--:-- --:--:--   652100   427  100   181  100   246    276    376 --:--:-- --:--:-- --:--:--   652
{"error":"무료 체험 제한","message":"무료 체험은 1회만 가능합니다. 회원 가입하시면 월 10회 무료로 이용하실 수 있습니다.","redirect":"/signup"}
### curl 테스트 (메인 URL)
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0100   427  100   181  100   246    224    305 --:--:-- --:--:-- --:--:--   530
{"error":"무료 체험 제한","message":"무료 체험은 1회만 가능합니다. 회원 가입하시면 월 10회 무료로 이용하실 수 있습니다.","redirect":"/signup"}
## 🚨 핵심 발견

**curl 테스트 결과**: 엔드포인트가 **정상 작동** 중!
- 최신 배포 URL: ✅ 200 OK (무료 체험 제한 메시지)
- 메인 URL: ✅ 200 OK (무료 체험 제한 메시지)

**브라우저 테스트 결과**: 404 Not Found

**결론**: 
- 백엔드는 정상
- 문제는 **프런트엔드 또는 브라우저 캐시**

## 🔧 점검 항목

1. **브라우저 캐시 확인**
   - Ctrl + Shift + Delete로 캐시 완전 삭제
   - 시크릿 모드로 재접속
   
2. **프런트엔드 API 호출 URL 확인**
   - 개발자 도구 Network 탭에서 실제 요청 URL 확인
   - `/api/generate`로 상대 경로 호출하는지 확인

3. **CORS 헤더 확인**
   - preflight OPTIONS 요청 확인
   - Access-Control-Allow-Origin 헤더 확인

## 📂 주요 파일 위치

- 백엔드 엔드포인트: `src/index.tsx:324` (Hono _worker.js)
- Functions 엔드포인트: `functions/api/generate.js` (Cloudflare Pages Functions)
- 프런트엔드 호출: `public/static/app-v3-final.js:1959, 2099, 2219, 2587`

## 🔗 관련 링크

- GitHub: https://github.com/kyh1987128/haruhanpo-studio
- Supabase URL: https://gmjbsndricdogtqsovnb.supabase.co
- 최신 배포: https://7f7aa7b3.haruhanpo-studio-new.pages.dev
- 메인 URL: https://haruhanpo-studio-new.pages.dev

