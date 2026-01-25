# 📊 마케팅허브 현재 시스템 정보
> 유튜브 분석기 기획을 위한 기술 스펙 및 시스템 구조

---

## 🏗️ 1. 기술 스택

### **프론트엔드**
- **프레임워크**: Vanilla JavaScript (No Framework)
- **스타일링**: TailwindCSS (CDN)
- **아이콘**: Font Awesome 6
- **HTTP 클라이언트**: Axios (CDN)

### **백엔드**
- **런타임**: Cloudflare Workers (Edge)
- **프레임워크**: Hono v4
- **언어**: TypeScript 5
- **배포**: Cloudflare Pages

### **데이터베이스**
- **주 DB**: Supabase PostgreSQL
- **인증**: Supabase Auth
- **파일 저장**: Supabase Storage
- **실시간**: PostgreSQL Functions (RPC)

### **외부 API**
- **AI**: OpenAI GPT-4o-mini
- **이미지 생성**: DALL-E 3
- **이미지 검색**: Pexels API
- **결제**: Toss Payments

---

## 👥 2. 회원가입 & 인증 시스템

### **회원가입 방식 (3가지)**
1. **이메일 인증**
   - Supabase Auth 사용
   - 이메일 + 비밀번호
   - 이메일 인증 필수

2. **카카오 로그인**
   - Kakao OAuth 2.0
   - 자동 회원가입
   - 프로필 사진 동기화

3. **Google 로그인**
   - Google OAuth 2.0
   - 자동 회원가입
   - 프로필 정보 동기화

### **인증 흐름**
```
1. 사용자 로그인 → Supabase Auth
2. Access Token 발급 (1시간 유효)
3. Refresh Token 저장 (로컬스토리지)
4. 모든 API 요청에 Bearer Token 포함
```

### **회원 정보 (users 테이블)**
```sql
- id (UUID, Primary Key)
- email (TEXT, UNIQUE)
- name (TEXT)
- profile_image_url (TEXT)
- auth_provider (TEXT) -- email, kakao, google
- free_credits (INTEGER) -- 무료 크레딧
- paid_credits (INTEGER) -- 유료 크레딧
- created_at (TIMESTAMP)
- last_reset_date (DATE) -- 크레딧 리셋 기준일
```

---

## 💳 3. 크레딧 시스템 (핵심!)

### **크레딧 종류**
1. **무료 크레딧**
   - 신규 가입 시: 30 크레딧 지급
   - 매월 자동 갱신: 가입일 기준 (예: 15일 가입 → 매월 15일 갱신)
   - 우선 차감

2. **유료 크레딧**
   - 결제로 구매
   - 만료 없음
   - 무료 크레딧 소진 후 차감

### **크레딧 차감 로직**
```typescript
// 우선순위: 무료 → 유료
무료 크레딧 = min(차감할_크레딧, 현재_무료_크레딧)
유료 크레딧 = 차감할_크레딧 - 무료_크레딧

// 예시
현재: 무료 10, 유료 20
차감: 15 크레딧
결과: 무료 0, 유료 15 (무료 10 + 유료 5 차감)
```

### **크레딧 비용 (현재)**
| 콘텐츠 타입 | 크레딧 |
|-------------|--------|
| 블로그 | 4 |
| 인스타그램 피드 | 4 |
| 인스타그램 릴스 | 4 |
| 유튜브 쇼츠 | 4 |
| 유튜브 롱폼 | 4 |
| 키워드 분석 | 1 (일 3회 무료) |

### **크레딧 상품 (credit_products)**
```sql
- id (UUID)
- name (TEXT) -- 예: "크레딧 100개"
- credits (INTEGER) -- 100
- price (INTEGER) -- 9900 (원)
- is_active (BOOLEAN)
- display_order (INTEGER)
```

### **크레딧 거래 기록 (credit_transactions)**
```sql
- id (UUID)
- user_id (UUID)
- amount (INTEGER) -- 차감/충전 크레딧
- balance_after (INTEGER) -- 거래 후 잔액
- type (TEXT) -- usage, purchase, refund
- description (TEXT)
- created_at (TIMESTAMP)
```

---

## 🎯 4. 콘텐츠 생성 워크플로우

### **입력 → 생성 → 저장 흐름**
```
1. 사용자 입력
   - 이미지 업로드 (선택)
   - 프로필 선택 (브랜드 정보)
   - 키워드 입력
   
2. 크레딧 확인
   - 잔액 확인
   - 부족 시 에러

3. AI 생성 (OpenAI GPT-4o-mini)
   - 프롬프트 구성
   - 스트리밍 응답 (실시간 표시)
   - 이미지 생성 (DALL-E 3)
   
4. 크레딧 차감
   - PostgreSQL Function (deduct_credits_safe)
   - 트랜잭션 보장
   
5. 히스토리 저장 (usage_history)
   - 생성된 콘텐츠 저장
   - 메타데이터 저장
   
6. 통계 업데이트 (user_stats)
   - 누적 사용량 증가
   - 랭킹 자동 재계산 (DB Trigger)
```

### **API 엔드포인트**
```typescript
POST /api/generate
Headers: Authorization: Bearer {token}
Body: {
  contentType: 'blog' | 'instagram-feed' | ...,
  keywords: string,
  profile: { name, description, targetGender, targetAge, ... },
  imageUrl?: string
}

Response: {
  success: true,
  content: { title, body, hashtags, ... },
  images: [{ url, prompt }],
  credits: { used: 4, remaining: 26 }
}
```

---

## 📊 5. 데이터베이스 스키마 (주요 테이블)

### **users** (사용자)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  auth_provider TEXT, -- email, kakao, google
  free_credits INTEGER DEFAULT 30,
  paid_credits INTEGER DEFAULT 0,
  last_reset_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **profiles** (프로필 = 브랜드 정보)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL, -- 브랜드명
  description TEXT, -- 브랜드 설명
  target_gender TEXT, -- 주 고객층 성별
  target_age TEXT, -- 주 연령층
  tone_manner TEXT, -- 말투와 분위기
  contact TEXT, -- 연락처
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **usage_history** (사용 내역)
```sql
CREATE TABLE usage_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content_type TEXT NOT NULL, -- blog, instagram-feed, ...
  platform TEXT, -- blog, instagram, youtube
  cost NUMERIC(10,2), -- API 비용
  credits_used INTEGER, -- 차감 크레딧
  content_title TEXT,
  content_body TEXT,
  metadata JSONB, -- 추가 정보
  created_at TIMESTAMP DEFAULT NOW()
);

-- DB Trigger: usage_history INSERT 시 user_stats 자동 업데이트
```

### **user_stats** (사용자 통계)
```sql
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  total_credits_used INTEGER DEFAULT 0, -- 누적 사용량
  total_content_generated INTEGER DEFAULT 0, -- 생성 건수
  rank_position INTEGER, -- 순위
  rank_percentage NUMERIC(5,2), -- 상위 X%
  last_usage_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- DB Trigger: 자동 랭킹 재계산 (실시간)
```

### **ai_workflows** (AI 빠른 설정)
```sql
CREATE TABLE ai_workflows (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tool_name TEXT NOT NULL, -- ChatGPT, Claude, ...
  tool_url TEXT,
  icon TEXT, -- 아이콘 이모지
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **sns_links** (SNS 바로가기)
```sql
CREATE TABLE sns_links (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  platform TEXT NOT NULL, -- instagram, youtube, ...
  url TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 6. UX/UI 구조

### **페이지 구조**
```
/ (랜딩 페이지)
├── 히어로 섹션
├── 기능 소개
├── 가격 안내
└── 회원가입/로그인

/app (메인 앱 - 로그인 후)
├── 상단 네비게이션
│   ├── 로고
│   ├── 크레딧 잔액 표시
│   ├── 설정 버튼
│   └── 로그아웃
│
├── 빠른 기능 버튼 (6개)
│   ├── 새 프로필 저장
│   ├── 프로필 관리
│   ├── 히스토리
│   ├── 템플릿
│   ├── SNS 바로가기
│   ├── AI 빠른 설정
│   └── 도움말 (NEW!)
│
├── 콘텐츠 생성 영역
│   ├── 이미지 업로드
│   ├── 프로필 선택
│   ├── 키워드 입력
│   └── 9개 플랫폼 버튼
│
└── 결과 표시 영역
    ├── 생성된 콘텐츠
    ├── 이미지 (AI 생성)
    ├── 복사 버튼
    └── 히스토리 저장
```

### **주요 모달**
1. **프로필 저장 모달**
   - 브랜드 정보 입력
   - 7개 필드 (이름, 설명, 주 연령층, 주 고객층 성별, 말투, 연락처, 기본 설정)

2. **프로필 관리 모달**
   - 저장된 프로필 목록
   - 수정/삭제/기본 설정

3. **히스토리 모달**
   - 캘린더 뷰
   - 날짜별 생성 내역
   - 재사용/삭제

4. **설정 모달**
   - 회원 정보
   - 크레딧 잔액 (실시간)
   - 가입일
   - 비밀번호 변경 (이메일 인증만)
   - 회원 탈퇴

5. **도움말 가이드 모달 (NEW!)**
   - 6개 가이드 (블로그, 인스타, 유튜브, 무료 이미지)
   - 활용법 상세 설명

### **디자인 시스템**
- **컬러**: 
  - Primary: `#667eea` (보라)
  - Secondary: `#764ba2` (진한 보라)
  - Success: `#10b981` (초록)
  - Error: `#ef4444` (빨강)
  
- **타이포그래피**: 
  - 시스템 폰트 (San Francisco, Segoe UI, ...)
  
- **컴포넌트**:
  - 버튼: 둥근 모서리 (8px~12px)
  - 카드: 그림자 + 호버 효과
  - 입력: 테두리 + 포커스 효과

---

## 💰 7. 결제 시스템

### **결제 플로우**
```
1. 사용자: 크레딧 충전 클릭
2. 상품 선택 (100개, 500개, ...)
3. Toss Payments 결제창 열기
4. 결제 완료
5. Webhook → 크레딧 자동 충전
6. credit_transactions 기록
```

### **Toss Payments 연동**
```typescript
// 결제 요청
POST /api/payments/checkout
Body: { productId, amount }

// Webhook (결제 완료)
POST /api/payments/webhook
Body: { orderId, status, amount }

// 성공 시: paid_credits 증가 + 거래 기록
```

### **현재 상품 (예시)**
| 상품명 | 크레딧 | 가격 | 보너스 |
|--------|--------|------|--------|
| 크레딧 100개 | 100 | 9,900원 | - |
| 크레딧 500개 | 500 | 39,000원 | +50 |
| 크레딧 1,000개 | 1,000 | 69,000원 | +200 |

---

## 🔐 8. 보안 & 권한

### **인증 방식**
- **JWT**: Supabase Access Token (1시간)
- **Refresh Token**: 로컬스토리지 저장
- **API 인증**: Bearer Token 필수

### **권한 관리**
```typescript
// 모든 API에서 사용자 인증
const token = c.req.header('Authorization')?.replace('Bearer ', '');
const { data: user } = await supabase.auth.getUser(token);

if (!user) {
  return c.json({ error: 'Unauthorized' }, 401);
}
```

### **민감 정보 처리**
- **환경변수**: Cloudflare Secrets
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `OPENAI_API_KEY`
  - `TOSS_SECRET_KEY`
  
- **클라이언트**: 퍼블릭 키만 노출
  - `SUPABASE_ANON_KEY`

---

## 📈 9. 통계 & 랭킹 시스템

### **사용자 통계 (실시간)**
- **누적 사용량**: `total_credits_used`
- **생성 건수**: `total_content_generated`
- **순위**: `rank_position` (1, 2, 3, ...)
- **상위 퍼센트**: `rank_percentage` (33.33% 등)

### **랭킹 계산 (DB Trigger 자동)**
```sql
-- usage_history INSERT 시 자동 실행
CREATE TRIGGER trigger_update_user_stats
AFTER INSERT ON usage_history
FOR EACH ROW
EXECUTE FUNCTION update_user_stats();

-- 함수: user_stats 업데이트 + 랭킹 재계산
CREATE FUNCTION update_user_stats() ...
CREATE FUNCTION calculate_user_rankings() ...
```

### **설정 모달 표시**
- "현재 크레딧: 무료 18 · 유료 8 (총 26)"
- "상위 33% 사용자" (뱃지)

---

## 🚀 10. 배포 & 인프라

### **배포 환경**
- **Production**: Cloudflare Pages
- **URL**: https://haruhanpo-studio-new.pages.dev
- **Edge 위치**: 전 세계 300+ 도시

### **성능**
- **첫 바이트 시간**: ~50ms (Edge)
- **빌드 시간**: ~20초
- **배포 시간**: ~5초

### **CI/CD**
```bash
# 로컬 빌드
npm run build

# 배포
npx wrangler pages deploy dist --project-name haruhanpo-studio-new
```

---

## 🔄 11. API 응답 속도 (참고)

| API | 응답 시간 |
|-----|-----------|
| `/api/generate` (콘텐츠 생성) | 5~10초 (스트리밍) |
| `/api/user/stats` | 50~100ms |
| `/api/profiles` | 50~100ms |
| `/api/history` | 100~200ms |
| `/api/suggest-keywords` | 2~3초 |

---

## 📝 12. 키워드 분석 (특수 기능)

### **하이브리드 시스템**
1. **일일 무료 3회** (keyword_daily_usage)
2. **캐시 24시간** (keyword_analysis_cache)
3. **4회부터 크레딧 차감** (1 크레딧)

### **로직**
```typescript
1. 캐시 확인 (keywords_hash)
2. 캐시 Hit → 무료 반환
3. 캐시 Miss → 일일 사용량 확인
4. 3회 이하 → 무료 + 캐시 저장
5. 4회 이상 → 크레딧 차감 + 캐시 저장
```

---

## 🎯 13. 유튜브 분석기에 적용 가능한 패턴

### **추천 구조**
```
1. 인증 시스템
   ✅ 동일하게 Supabase Auth 사용
   ✅ 카카오/구글 로그인 재사용
   
2. 크레딧 시스템
   ✅ 동일한 users 테이블 공유
   ✅ 유튜브 분석 = 5~10 크레딧 (콘텐츠보다 비쌈)
   
3. 분석 결과 저장
   ✅ youtube_analysis_history 테이블 신규 생성
   ✅ user_stats에 분석 건수 추가
   
4. API 구조
   POST /api/youtube/analyze
   - videoUrl (YouTube URL)
   - analysisType (transcript, comments, seo, ...)
   
5. 결과 표시
   - 차트 (Chart.js)
   - 표 (조회수, 좋아요, 댓글 분석)
   - AI 요약 (GPT-4)
```

---

## 📦 14. 프로젝트 구조

```
webapp/
├── src/
│   ├── index.tsx          # 메인 서버 (Hono)
│   ├── landing-page.ts    # 랜딩 페이지 HTML
│   ├── payments.ts        # 결제 API
│   └── images.ts          # 이미지 API
├── public/
│   └── static/
│       ├── app-v3-final.js  # 프론트엔드 JS (12,000줄)
│       └── styles.css       # TailwindCSS 빌드
├── migrations/            # DB 마이그레이션
├── dist/                  # 빌드 결과
├── wrangler.jsonc         # Cloudflare 설정
├── package.json
└── README.md
```

---

## 💡 15. 핵심 차이점 (유튜브 분석기 vs 현재)

| 항목 | 마케팅허브 | 유튜브 분석기 |
|------|-----------|--------------|
| **입력** | 이미지 + 키워드 | YouTube URL |
| **처리** | GPT-4 콘텐츠 생성 | YouTube Data API + GPT-4 분석 |
| **출력** | 텍스트 콘텐츠 | 통계 + 차트 + AI 인사이트 |
| **크레딧** | 4 크레딧/건 | 5~10 크레딧/건 (예상) |
| **저장** | usage_history | youtube_analysis_history |
| **외부 API** | OpenAI, DALL-E, Pexels | YouTube Data API v3, OpenAI |

---

## 🔗 16. 참고 URL

- **프로덕션**: https://haruhanpo-studio-new.pages.dev
- **Supabase**: https://supabase.com/dashboard
- **GitHub**: (설정 필요)
- **Cloudflare**: https://dash.cloudflare.com

---

## 📞 17. 다음 단계

### **유튜브 분석기 기획 시 고려사항**
1. ✅ **인증/크레딧 시스템 재사용** (개발 시간 단축)
2. ✅ **YouTube Data API 쿼터 관리** (일일 10,000 units)
3. ✅ **분석 결과 캐싱** (같은 영상 재분석 방지)
4. ✅ **크레딧 비용 산정** (API 비용 기반)
5. ✅ **UI/UX 일관성** (동일한 디자인 시스템)

---

**작성일**: 2026-01-25  
**버전**: v1.0  
**작성자**: AI Assistant

