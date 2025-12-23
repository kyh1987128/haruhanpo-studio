# 멀티 플랫폼 콘텐츠 자동 생성기

## 프로젝트 개요
- **이름**: 멀티 플랫폼 콘텐츠 자동 생성기
- **목표**: 이미지와 브랜드 정보를 입력받아 원하는 플랫폼만 선택하여 최적화된 콘텐츠를 AI로 자동 생성
- **기술 스택**: Hono + TypeScript + Vite + OpenAI API (GPT-4o + Vision)

## 주요 기능

### ✨ 핵심 기능
1. **다중 이미지 업로드** (최대 10장, 총 50MB)
   - 드래그 앤 드롭 지원
   - 실시간 미리보기
   - 이미지 개별 삭제 기능

2. **브랜드 정보 입력**
   - 브랜드명
   - 핵심 키워드 (쉼표로 구분)
   - 톤앤매너 선택 (캐주얼/전문가/감성)
   - 타겟 연령대 (10대~50대+)
   - 산업 분야 (뷰티/패션/F&B/IT/헬스케어/라이프스타일)

3. **플랫폼 선택형 콘텐츠 생성**
   - ✅ 네이버 블로그 (1,300~2,000자)
   - ✅ 인스타그램 (캡션 + 해시태그 25-30개)
   - ✅ 스레드 (200-300자 + 해시태그 7-10개)
   - ✅ 유튜브 숏폼 (스크립트 + 제목 + 설명 + 태그)
   - 최소 1개 이상 선택 가능

4. **AI 이미지 분석**
   - OpenAI Vision API로 각 이미지 상세 분석
   - 색상 톤, 분위기, 구도, 감정적 느낌 등 종합 분석
   - 다중 이미지 동시 분석 지원

5. **결과 관리**
   - 탭 형태로 각 플랫폼 결과 표시
   - 복사 버튼 (클립보드)
   - 다운로드 버튼 (.txt 파일)
   - 생성 시간 및 이미지 개수 표시

## URLs
- **로컬 개발**: http://localhost:3000
- **공개 URL**: https://3000-i41cq3n8pxi55gachwryg-de59bda9.sandbox.novita.ai

## 데이터 아키텍처

### 입력 데이터 구조
```typescript
{
  brand: string;           // 브랜드명
  keywords: string;        // 핵심 키워드 (쉼표 구분)
  tone: string;            // 톤앤매너
  targetAge: string;       // 타겟 연령대
  industry: string;        // 산업 분야
  images: string[];        // base64 이미지 배열
  platforms: string[];     // 선택된 플랫폼 ['blog', 'instagram', 'threads', 'youtube']
}
```

### 출력 데이터 구조
```typescript
{
  success: boolean;
  data: {
    blog?: string;         // 네이버 블로그 콘텐츠
    instagram?: string;    // 인스타그램 콘텐츠
    threads?: string;      // 스레드 콘텐츠
    youtube?: string;      // 유튜브 숏폼 콘텐츠
  };
  generatedPlatforms: string[];
  imageCount: number;
}
```

### AI 처리 흐름
1. **이미지 분석**: OpenAI Vision API로 각 이미지 상세 분석 (병렬 처리)
2. **프롬프트 생성**: 플랫폼별 맞춤 프롬프트 생성
3. **콘텐츠 생성**: GPT-4o로 플랫폼별 콘텐츠 생성 (병렬 처리)
4. **결과 반환**: 생성된 콘텐츠를 JSON 형태로 반환

## 사용 가이드

### 1. 환경 설정

#### OpenAI API 키 설정
`.dev.vars` 파일에 OpenAI API 키를 추가하세요:

```bash
# .dev.vars
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
```

**⚠️ 중요**: `.dev.vars` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

### 2. 로컬 개발

```bash
# 의존성 설치
npm install

# 프로젝트 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 서버 상태 확인
pm2 list

# 로그 확인 (비차단)
pm2 logs webapp --nostream

# 서버 재시작
fuser -k 3000/tcp 2>/dev/null || true
pm2 restart webapp

# 서버 중지
pm2 stop webapp
pm2 delete webapp
```

### 3. 사용 방법

1. **이미지 업로드**
   - 드래그 앤 드롭 또는 클릭하여 이미지 선택
   - 최대 10장, 총 50MB까지 업로드 가능

2. **정보 입력**
   - 브랜드명, 키워드, 톤앤매너, 타겟 연령대, 산업 분야 입력

3. **플랫폼 선택**
   - 생성하고 싶은 플랫폼 체크박스 선택 (최소 1개)

4. **콘텐츠 생성**
   - "콘텐츠 생성하기" 버튼 클릭
   - 약 30-60초 대기 (이미지 개수와 플랫폼 개수에 따라 다름)

5. **결과 확인**
   - 탭을 클릭하여 각 플랫폼 콘텐츠 확인
   - 복사 또는 다운로드 버튼으로 콘텐츠 저장

## 프로젝트 구조

```
webapp/
├── src/
│   ├── index.tsx          # 메인 Hono 애플리케이션 및 API 라우트
│   ├── prompts.ts         # 플랫폼별 프롬프트 템플릿
│   └── renderer.tsx       # SSR 렌더러
├── public/
│   └── static/
│       └── app.js         # 프론트엔드 JavaScript
├── dist/                  # 빌드 결과물 (자동 생성)
│   └── _worker.js         # Cloudflare Workers 번들
├── .dev.vars              # 개발 환경 변수 (OpenAI API 키)
├── .gitignore             # Git 제외 파일
├── ecosystem.config.cjs   # PM2 설정
├── package.json           # 의존성 및 스크립트
├── tsconfig.json          # TypeScript 설정
├── vite.config.ts         # Vite 빌드 설정
└── wrangler.jsonc         # Cloudflare Pages 설정
```

## 기술 상세

### 백엔드 (Hono)
- **프레임워크**: Hono (경량, 빠른 edge 프레임워크)
- **런타임**: Cloudflare Workers (edge 환경)
- **API 엔드포인트**: `/api/generate`
- **CORS**: 모든 `/api/*` 경로에 CORS 활성화

### 프론트엔드
- **UI 프레임워크**: Tailwind CSS (CDN)
- **아이콘**: Font Awesome (CDN)
- **JavaScript**: Vanilla JS (프레임워크 없음)
- **기능**: 이미지 업로드, 폼 처리, 결과 표시, 복사/다운로드

### AI 처리
- **모델**: GPT-4o (텍스트 생성 + 이미지 분석)
- **Vision API**: 이미지 상세 분석 (색상, 분위기, 구도 등)
- **병렬 처리**: 이미지 분석 및 콘텐츠 생성 동시 진행
- **토큰 최적화**: 프롬프트 최적화로 비용 절감

## 비용 예상

### OpenAI API 비용 (GPT-4o 기준)

**1. 이미지 분석**
- 이미지 1장당: 약 $0.01
- 10장 최대: 약 $0.10

**2. 콘텐츠 생성**
- 블로그: 약 $0.04 (2,000자 생성)
- 인스타그램: 약 $0.03 (캡션 + 해시태그)
- 스레드: 약 $0.02 (짧은 텍스트)
- 유튜브: 약 $0.04 (스크립트 + 메타데이터)

**예상 총 비용 (4개 플랫폼 모두 + 이미지 10장)**
- 이미지 분석: $0.10
- 콘텐츠 생성: $0.13
- **총합: 약 $0.23 per request**

**선택형 플랫폼 (블로그만)**
- 이미지 분석: $0.02 (2장)
- 블로그 생성: $0.04
- **총합: 약 $0.06 per request**

## 배포

### Cloudflare Pages 배포

1. **Cloudflare API 키 설정**
```bash
# setup_cloudflare_api_key 도구 사용 권장
```

2. **프로젝트 생성 및 배포**
```bash
# 빌드
npm run build

# Cloudflare Pages 프로젝트 생성
npx wrangler pages project create webapp --production-branch main

# 배포
npm run deploy:prod
```

3. **환경 변수 설정**
```bash
# OpenAI API 키 등록
npx wrangler pages secret put OPENAI_API_KEY --project-name webapp
```

4. **배포 확인**
```bash
# 프로덕션 URL: https://webapp.pages.dev
# 또는 커스텀 도메인 설정 가능
```

## 주의사항

### ⚠️ OpenAI API 키 보안
- `.dev.vars` 파일을 절대 Git에 커밋하지 마세요
- 프로덕션에서는 Cloudflare Pages Secrets 사용
- API 키를 프론트엔드에 노출하지 마세요

### ⚠️ 이미지 크기 제한
- 최대 10장, 총 50MB 제한
- 대용량 이미지는 처리 시간이 길어질 수 있음
- 권장: 이미지당 5MB 이하

### ⚠️ API 비용 관리
- 각 요청마다 OpenAI API 비용 발생
- 이미지 개수와 플랫폼 개수에 따라 비용 증가
- 테스트 시 소량의 이미지와 플랫폼으로 시작 권장

## 트러블슈팅

### 1. "OpenAI API 키가 설정되지 않았습니다" 오류
- `.dev.vars` 파일에 `OPENAI_API_KEY` 추가
- 프로덕션: Cloudflare Pages Secrets에 API 키 등록

### 2. 이미지 업로드 실패
- 파일 크기 확인 (총 50MB 이하)
- 이미지 형식 확인 (JPEG, PNG, GIF 등)
- 브라우저 콘솔에서 에러 확인

### 3. 콘텐츠 생성 오류
- OpenAI API 키 유효성 확인
- 네트워크 연결 확인
- 서버 로그 확인: `pm2 logs webapp --nostream`

### 4. 서버 시작 실패
- 포트 3000 사용 중 확인: `fuser -k 3000/tcp`
- 빌드 재실행: `npm run build`
- PM2 재시작: `pm2 restart webapp`

## 개발 로드맵

### 완료된 기능
- ✅ 다중 이미지 업로드 (10장, 50MB)
- ✅ 4개 플랫폼 콘텐츠 생성
- ✅ 선택형 플랫폼 생성
- ✅ 이미지 AI 분석
- ✅ 복사/다운로드 기능
- ✅ 반응형 UI

### 향후 계획
- 📋 콘텐츠 히스토리 저장
- 📋 템플릿 커스터마이징
- 📋 다국어 지원
- 📋 추가 플랫폼 (페이스북, 링크드인 등)
- 📋 이미지 편집 기능
- 📋 콘텐츠 스케줄링

## 라이선스
MIT License

## 개발자
GenSpark AI Agent

## 마지막 업데이트
2025-12-23
