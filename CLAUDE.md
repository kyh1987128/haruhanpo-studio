# 마케팅허브 AI 스튜디오 (haruhanpo-studio)

## 프로젝트 개요
- SNS 멀티 플랫폼 콘텐츠 자동 생성 SaaS
- 프로덕션 URL: https://marketinghub-ai.com/
- Cloudflare Pages 프로젝트명: `haruhanpo-studio-new`

## 기술 스택
- **프레임워크**: Hono (Cloudflare Pages Workers)
- **빌드**: Vite + TypeScript
- **스타일**: Tailwind CSS
- **AI**: Gemini 2.5 Flash (주), GPT-4o (폴백)
- **인증/DB**: Supabase (OAuth: Google, Kakao)
- **배포**: Cloudflare Pages (wrangler)

## 파일 구조
```
src/
├── index.tsx              # 메인 Hono 앱 (모든 API + 페이지 라우트)
├── landing-page.ts        # 비회원 랜딩 페이지 HTML
├── html-template.ts       # PostFlow 작업 페이지 HTML
├── dashboard-template.ts  # 대시보드 HTML
├── youtube-analyzer-template.ts  # 유튜브 파인더 HTML
├── prompts.ts             # 14개 플랫폼별 AI 프롬프트
├── gemini.ts              # Gemini API 연동
├── document-parser.ts     # 문서 파싱 (DOCX, PDF)
├── image-injection.ts     # 콘텐츠 이미지 삽입
├── components/            # 공통 컴포넌트 (header 등)
├── routes/                # 라우트 모듈 (payments, images, youtube, channels)
├── middleware/             # 미들웨어 (rate-limit)
├── lib/                   # Supabase 클라이언트
├── services/              # 비즈니스 로직
├── utils/                 # 유틸리티 (turnstile 등)
└── types/                 # TypeScript 타입
public/static/
├── app-v3-final.js        # 메인 프론트엔드 JS
├── image-search.js        # 이미지 검색 모듈
├── image-generator.js     # AI 이미지 생성 모듈
├── youtube-finder.js      # 유튜브 파인더 JS
└── styles.css             # 빌드된 CSS
```

## 빌드 & 배포 규칙

### 배포 방식: GitHub Actions 자동 배포
- **수동 배포 금지**: `wrangler pages deploy` 직접 실행 금지
- **배포 트리거**: GitHub `main` 브랜치에 push → 자동 빌드 + 배포
- **배포 전 필수**: `npm run build` 로컬 테스트 후 push
- **GitHub Secrets 필수**: `CF_API_TOKEN`, `CF_ACCOUNT_ID` 등록
- **워크플로우 파일**: `.github/workflows/deploy.yml`

### 코드 수정 후 반드시 아래 순서로 실행:
1. `npm run build` (rimraf dist → CSS 빌드 → vite build)
2. 빌드 성공 확인
3. `git add`, `git commit`, `git push` (push하면 자동 배포)
4. GitHub Actions에서 배포 상태 확인

### 빌드 명령어
```bash
npm run build        # 클린 빌드 (rimraf dist && build:css && vite build)
```

### 주의사항
- `dist/` 폴더는 `.gitignore`에 포함 (git에 추적 안 됨)
- 빌드 시 반드시 `rimraf dist`로 클린 빌드 (stale 파일 방지)
- `_routes.json`은 vite 빌드 시 자동 생성 (수동 편집 금지)
- 배포 후 프로덕션 확인: https://marketinghub-ai.com/

## 코드 규칙
- 한국어 주석, 커밋 메시지는 영어
- 기존 코드 패턴 분석 후 동일 패턴 준수
- 에러 핸들링, null 방어 필수
- 결제(PG) 관련 코드 수정 금지
- FEATURE_FLAGS 시스템으로 플랫폼 on/off 관리

## 인증 구조
- 클라이언트: localStorage (`postflow_token`, `postflow_user`)
- 보호 라우트: `/postflow`, `/dashboard` → `<head>` 첫 자식에 인증 가드 스크립트
- OAuth 콜백: `/auth/callback`

## 크레딧 시스템
- free_credits 우선 소비 → paid_credits
- 콘텐츠 생성: 1 크레딧/플랫폼, AI 이미지: 3, 유튜브 분석: 10

## 환경 변수 (Cloudflare Dashboard에서 설정)
- GEMINI_API_KEY, OPENAI_API_KEY
- SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
- YOUTUBE_API_KEY
- TURNSTILE_SECRET_KEY (선택)
