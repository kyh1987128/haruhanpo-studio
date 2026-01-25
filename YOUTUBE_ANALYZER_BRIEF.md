# 🎯 유튜브 분석기 기획을 위한 핵심 정보 (요약본)

---

## ✅ **재사용 가능한 시스템**

### **1. 회원가입 & 인증 (그대로 재사용 ✅)**
- Supabase Auth
- 카카오/구글/이메일 로그인
- JWT 토큰 (1시간 유효)

### **2. 크레딧 시스템 (그대로 재사용 ✅)**
- 무료 크레딧: 30개 (매월 갱신)
- 유료 크레딧: 결제로 구매
- **유튜브 분석 크레딧**: 5~10 크레딧 제안

### **3. 데이터베이스 (일부 재사용)**
- `users` 테이블: 그대로 재사용 ✅
- `user_stats` 테이블: 분석 건수 필드 추가
- **NEW**: `youtube_analysis_history` 테이블 생성

---

## 🆕 **신규 개발 필요 항목**

### **1. YouTube Data API v3 연동**
```typescript
// 영상 정보 조회
GET https://www.googleapis.com/youtube/v3/videos?id={videoId}&part=statistics,snippet

// 댓글 조회
GET https://www.googleapis.com/youtube/v3/commentThreads?videoId={videoId}

// 자막 조회 (가능하면)
GET https://www.googleapis.com/youtube/v3/captions
```

**쿼터 제한:**
- 일일 10,000 units
- videos.list = 1 unit
- commentThreads.list = 1 unit
- **캐싱 필수!**

### **2. API 엔드포인트**
```typescript
POST /api/youtube/analyze
Headers: Authorization: Bearer {token}
Body: {
  videoUrl: string, // 유튜브 URL
  analysisType: 'basic' | 'advanced' | 'seo'
}

Response: {
  success: true,
  data: {
    videoId: string,
    title: string,
    views: number,
    likes: number,
    comments: number,
    aiInsights: string, // GPT-4 분석
    seoScore: number,
    ...
  },
  creditsUsed: 5
}
```

### **3. 데이터베이스 스키마**
```sql
CREATE TABLE youtube_analysis_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  video_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_title TEXT,
  analysis_type TEXT, -- basic, advanced, seo
  analysis_result JSONB, -- 분석 결과 전체
  credits_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 캐시 테이블 (선택)
CREATE TABLE youtube_analysis_cache (
  video_id TEXT PRIMARY KEY,
  analysis_result JSONB,
  expires_at TIMESTAMP
);
```

### **4. 프론트엔드 UI**
```html
<!-- 입력 영역 -->
<input type="url" placeholder="유튜브 영상 URL 입력" />
<select>
  <option value="basic">기본 분석 (5 크레딧)</option>
  <option value="advanced">심화 분석 (10 크레딧)</option>
  <option value="seo">SEO 분석 (7 크레딧)</option>
</select>
<button>분석 시작</button>

<!-- 결과 표시 -->
<div class="stats-cards">
  <div>조회수: 1.2M</div>
  <div>좋아요: 15K</div>
  <div>댓글: 320</div>
</div>

<!-- 차트 (Chart.js) -->
<canvas id="viewsChart"></canvas>

<!-- AI 인사이트 -->
<div class="ai-insights">
  <h3>AI 분석 결과</h3>
  <p>이 영상은 시청 유지율이 높고...</p>
</div>
```

---

## 💰 **크레딧 비용 산정 (제안)**

| 분석 타입 | 크레딧 | API 비용 | 설명 |
|-----------|--------|---------|------|
| 기본 분석 | 5 | ~$0.02 | 조회수, 좋아요, 댓글 + 간단 AI 분석 |
| 심화 분석 | 10 | ~$0.05 | + 댓글 감성 분석 + 트렌드 |
| SEO 분석 | 7 | ~$0.03 | + 키워드, 태그, 설명 최적화 제안 |

**콘텐츠 생성 (현재) = 4 크레딧**

---

## 📈 **개발 우선순위**

### **Phase 1: MVP (2주)**
1. ✅ YouTube URL 입력
2. ✅ 기본 통계 표시 (조회수, 좋아요, 댓글)
3. ✅ 크레딧 차감 & 히스토리 저장
4. ✅ 간단한 AI 요약 (GPT-4)

### **Phase 2: 고도화 (2주)**
1. ✅ 댓글 감성 분석
2. ✅ 차트 시각화 (Chart.js)
3. ✅ SEO 분석
4. ✅ 캐싱 시스템

### **Phase 3: 추가 기능 (1~2주)**
1. ✅ 경쟁 영상 비교
2. ✅ 트렌드 분석
3. ✅ PDF 리포트 다운로드

---

## 🎨 **UI/UX 일관성**

### **디자인 시스템 재사용**
- 컬러: Primary `#667eea`, Secondary `#764ba2`
- 버튼/카드 스타일 동일
- 모달 구조 동일

### **페이지 구조**
```
/youtube-analyzer
├── 상단 네비게이션 (동일)
├── 크레딧 잔액 표시 (동일)
├── URL 입력 영역 (NEW)
├── 분석 결과 표시 (NEW)
│   ├── 통계 카드
│   ├── 차트
│   └── AI 인사이트
└── 히스토리 (동일)
```

---

## 🔧 **기술 스택 (동일)**

- **프론트엔드**: Vanilla JS + TailwindCSS
- **백엔드**: Hono (Cloudflare Workers)
- **DB**: Supabase PostgreSQL
- **AI**: OpenAI GPT-4
- **NEW**: YouTube Data API v3, Chart.js

---

## 💡 **핵심 차이점**

| 항목 | 마케팅허브 | 유튜브 분석기 |
|------|-----------|--------------|
| 입력 | 이미지 + 키워드 | YouTube URL |
| 처리 | GPT-4 생성 | YouTube API + GPT-4 분석 |
| 출력 | 텍스트 콘텐츠 | 통계 + 차트 + AI 분석 |
| 크레딧 | 4 | 5~10 |

---

## 📞 **다음 단계**

1. **기획 확정**: 분석 타입, 크레딧 비용, 기능 범위
2. **YouTube API 키 발급**: Google Cloud Console
3. **DB 스키마 생성**: youtube_analysis_history 테이블
4. **MVP 개발**: 2주 목표

---

**작성일**: 2026-01-25
**작성자**: AI Assistant

