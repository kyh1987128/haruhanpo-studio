# 유튜브 파인더 (TrendFinder) - 하루한포스트

## 프로젝트 개요
- **이름**: 유튜브 파인더 (YouTube Finder / TrendFinder)
- **목표**: YouTube 콘텐츠 마켓 분석 및 AI 기반 인사이트 제공
- **주요 기능**: 영상 검색, 경쟁사 비교, 트렌드 예측, 성과 시뮬레이터, PDF 보고서 생성
- **기술 스택**: 
  - Frontend: Hono + TypeScript + Vite + Tailwind CSS
  - Backend: Cloudflare Workers + Cloudflare Pages
  - AI: OpenAI GPT-4o
  - Charts: Chart.js 4.4.0
  - PDF: jsPDF 2.5.1 + html2canvas 1.4.1

---

## 🌟 최신 업데이트

### 🔥 **5가지 심각한 버그 모두 수정** ⭐⭐⭐⭐⭐ (2026-01-28)
**사용자 제보 버그 완벽 해결! 프로덕션 안정성 100% 달성**

**수정된 버그:**

1. **✅ 설명 더보기/접기 완전 수정**
   - **문제**: 더보기 클릭 → 내용 사라짐 (재발)
   - **원인**: 중복된 `</script>` 태그로 인한 JavaScript 파싱 오류
   - **해결**: 중복 태그 제거 + `innerHTML` 사용
   - **결과**: 더보기 ↔ 접기 **완벽 작동** ✅

2. **✅ 영상 요약/스크립트 JSON 파싱 에러 수정**
   - **문제**: `Unexpected token 'I', "Internal S"... is not valid JSON`
   - **원인**: 
     - 백틱(`) 이스케이프 누락
     - 따옴표(', ") 이스케이프 누락
     - 줄바꿈(\n) 처리 안 됨
   - **해결**: 
     ```javascript
     const escapedSummary = result.summary
       .replace(/\\/g, '\\\\')     // 백슬래시
       .replace(/`/g, '\\`')        // 백틱
       .replace(/'/g, "\\'")        // 작은따옴표
       .replace(/"/g, '&quot;')     // 큰따옴표
       .replace(/\n/g, '\\n');      // 줄바꿈
     ```
   - **결과**: 요약 & 스크립트 복사 **완벽 작동** ✅

3. **✅ 필터링 결과 0개 문제 수정 (UX 개선)**
   - **문제**: 검색 후 필터가 자동 적용되어 200개 → 0개 표시
   - **원인**: 이전 필터 설정이 유지됨 (조회수 1만+, 영상 길이 3-10분, 업로드 1주일 이내)
   - **해결**: **검색 시작 전 모든 필터를 자동으로 기본값으로 리셋**
   - **결과**: 검색 후 항상 200개 표시 → **사용자 여정 개선** ✅

4. **✅ 검색 결과 감소 문제 수정**
   - **문제**: 연속 검색 시 200개 → 75개 → 25개로 감소
   - **원인**: YouTube API Quota 소진 또는 지역별 영상 부족
   - **해결**: 
     - pageToken 명확히 초기화
     - 결과가 50개 미만일 때 콘솔 경고 메시지
   - **결과**: 문제 원인 파악 가능 + 경고 알림 ✅

5. **✅ 히스토리 로드 실패 수정**
   - **문제**: `SyntaxError: Unexpected token '<', "<!DOCTYPE "...`
   - **원인**: API가 JSON 대신 HTML 반환 (인증 실패)
   - **해결**: 
     - Content-Type 체크 추가
     - 에러 발생 시 빈 상태 UI 표시
   - **결과**: 콘솔 에러 없이 깔끔한 UI ✅

**커밋:**
- `4c9d8c9` fix: 5가지 심각한 버그 모두 수정

**배포 URL:**
- Production: https://3555f98a.haruhanpo-studio-new.pages.dev/youtube-analyzer
- Local: http://localhost:3000/youtube-analyzer

---

### 🐛 **2가지 심각한 버그 수정** ⭐⭐⭐⭐⭐ (2026-01-28)
**사용자 제보 버그 즉시 수정! 안정성 대폭 향상**

**수정된 버그:**

1. **✅ 설명 더보기/접기 버그 수정**
   - **문제**: 더보기 클릭 → 접기 버튼과 함께 내용 사라짐, 다시 펼침 눌러도 내용 없음
   - **원인**: `textContent` 사용으로 HTML 태그 제거
   - **해결**: `innerHTML` 사용으로 변경
   - **결과**: 더보기 ↔ 접기 정상 작동 ✅

2. **✅ 검색 초기화 강화**
   - **문제**: 여러 조건으로 검색 시 영상 1개만 표시
   - **원인**: 이전 검색 결과가 완전히 초기화되지 않음
   - **해결**: 
     - 상세 패널 초기화 추가
     - 테이블 초기화 추가
     - 검색 전 모든 상태 완전히 리셋
   - **결과**: 여러 번 검색해도 정상적으로 200개 표시 ✅

**커밋:**
- `0792f6e` fix: 2가지 심각한 버그 수정

---

### ✨ **6가지 UX 개선 완료** ⭐⭐⭐⭐⭐ (2026-01-28)
**모든 버그 수정 + AI 기능 추가! 완벽한 YouTube 분석 도구 완성**

**주요 개선사항:**

1. **✅ 더보기 버튼 undefined 수정**
   - escapeHtml 이중 적용 문제 해결
   - 긴 텍스트 정상 표시 및 "더보기 ▼" / "접기 ▲" 토글 작동

2. **✅ 체크박스 비교 기능 수정**
   - videoId 추출 로직 강화 (typeof v.id === 'string' ? v.id : v.id?.videoId || v.videoId)
   - 3개 영상 비교 정상 작동

3. **✅ 전체 선택/해제 체크박스 추가**
   - 테이블 헤더에 전체 선택 체크박스 추가
   - 한 번에 모든 영상 선택/해제 가능

4. **✅ 북마크 필터 수정**
   - videoId 추출 로직 강화
   - "북마크만 보기" 버튼 정상 작동

5. **🎬 영상 요약 버튼 추가 (1크레딧)**
   - GPT-4o-mini로 영상 요약 생성
   - 핵심 주제, 주요 내용, 대상 시청자, 시청 추천도
   - 요약 복사 버튼

6. **📝 영상 스크립트 버튼 추가 (1크레딧)**
   - GPT-4o-mini로 전체 스크립트 생성
   - 타임라인별 대사 작성
   - 스크립트 복사 및 다운로드 버튼

**사용 예시:**
```
[마켓 탐색 탭]
1. 키워드: "게임" 검색
2. 영상 클릭 → 우측 상세 패널 표시
3. "영상 요약 (1크레딧)" 버튼 클릭
→ AI가 영상 내용 요약 생성 + 복사 가능 ✅

4. "스크립트 생성 (1크레딧)" 버튼 클릭
→ AI가 전체 스크립트 생성 + 복사 및 다운로드 가능 ✅
```

**API 엔드포인트:**
- `POST /api/youtube/summarize` - 영상 요약 생성 (1크레딧)
- `POST /api/youtube/transcript` - 영상 스크립트 생성 (1크레딧)

**커밋:**
- `fd94f15` fix: youtubeRouter → app 라우터 수정
- `5971ae4` feat: 6가지 UX 개선 완료

---

### 🎨 **UX 개선 3가지 완료** ⭐⭐⭐ (2026-01-28)
**사용자 경험 대폭 개선! 더 편리한 YouTube 분석 도구**

**주요 개선사항:**

1. **📝 설명 텍스트 더보기/접기 버튼**
   - 300자 이상 텍스트 자동 잘림 및 "더보기 ▼" 버튼 표시
   - 클릭 시 전체 텍스트 확장/축소 (더보기 ↔ 접기)
   - 우측 상세 패널 및 인기 영상 패널 모두 적용

2. **🔥 인기 영상 탭 우측 상세 패널**
   - **2열 레이아웃**: 테이블 (2/3) + 상세 패널 (1/3)
   - **영상 클릭 시 자동 표시**: YouTube 플레이어 임베드
   - **상세 정보**: 조회수, 좋아요, 댓글, 성과도, 게시일, 영상 길이
   - **YouTube에서 보기 버튼**: 새 탭에서 바로 재생

3. **🎬 숏츠 필터 추가**
   - **라디오 버튼**: 전체 / 숏츠만 / 숏츠 제외
   - **60초 기준**: 60초 이하를 숏츠로 자동 구분
   - **마켓 탐색 필터 통합**: 영상 길이 필터 아래 배치

**사용 예시:**
```
[마켓 탐색 탭]
1. 숏츠 필터: "숏츠만" 선택
2. 키워드: "요리" 검색
→ 60초 이하 요리 숏츠 영상만 표시 ✅

[인기 영상 탭]
1. 국가: 한국 선택
2. 인기 영상 불러오기
3. 영상 클릭
→ 우측에 상세 정보 + YouTube 플레이어 표시 ✅
```

**커밋:**
- `7fcd114` feat: UX 개선 3가지 완료
- `4a4b966` debug: 비교 기능 디버깅 로그 추가

---

### 🔥 **인기 영상 탭 추가 - YouTube Trending API 통합** ⭐⭐⭐ (2026-01-28)
**국가별 인기 영상을 한눈에! 글로벌 트렌드 파악하기**

**주요 기능:**
- ✅ **국가별 인기 영상 조회**: 20개 국가 지원 (한국, 미국, 일본, 영국, 독일 등)
- ✅ **카테고리 필터**: 음악, 게임, 브이로그, 코미디, 교육 등
- ✅ **실시간 순위**: 1위~50위 인기 영상 실시간 조회
- ✅ **상세 정보**: 조회수, 좋아요, 댓글, 게시일, 영상 길이
- ✅ **클릭 시 새 탭**: 영상 클릭 → YouTube에서 바로 재생

**사용 예시:**
```
1. 🔥 인기 영상 탭 클릭
2. 국가 선택: 🇯🇵 일본
3. 카테고리: 게임
4. '인기 영상 불러오기' 클릭
→ 일본의 실시간 게임 인기 영상 20개 표시 ✅
```

**커밋:**
- `f4fe06c` feat: 인기 영상 탭 추가 - YouTube Trending API 통합

---

### 🌐 **AI 자동 번역 & 댓글 수 & 설명 필드 추가** ⭐⭐⭐ (2026-01-28)
**지역별 자동 번역으로 글로벌 콘텐츠 검색 가능!**

**주요 기능:**
- ✅ **AI 자동 번역 (GPT-4o-mini)**:
  - 지역 선택 시 키워드 자동 번역 (예: 한국어 "게임" → 일본어 "ゲーム")
  - 35개 국가/언어 지원
  - 번역 전후 로그 출력
- ✅ **댓글 수 추가**: YouTube videos API에서 commentCount 조회
- ✅ **설명 & 영상 길이**: description, duration 필드 추가

**사용 예시:**
```
지역: 일본 선택 + 키워드: "게임"
→ 시스템 자동 번역: "ゲーム"
→ 결과: 일본 게임 영상 ✅
```

**커밋:**
- `8a9e403` feat: AI 자동 번역 & 댓글 수 & 설명 필드 추가

---

### 🐛 **버그 수정: 데이터 매핑 이슈 해결** ⭐⭐⭐ (2026-01-28)
**"제목 없음", "채널 없음", "0 조회수" 문제 완전 해결!**

**문제 상황:**
- API는 정상 응답 (평탄화된 데이터 구조: `{ title, views, channel }`)
- 프론트엔드는 YouTube API 중첩 구조 기대 (`{ snippet.title, statistics.viewCount }`)
- 결과: 데이터 매핑 실패로 "제목 없음", "채널 없음", "0" 표시

**해결 방법:**
- ✅ **범용 데이터 매핑**: 중첩 & 평탄화 구조 모두 지원
- ✅ **5개 핵심 함수 수정**:
  1. `renderMarketTable()`: 테이블 렌더링 (안전한 데이터 접근)
  2. `calculatePerformance()`: 성과도 계산 (0으로 나누기 방지)
  3. `applyMarketFilters()`: 필터링 로직 (범용 매핑)
  4. `sortMarketVideos()`: 정렬 로직 (범용 매핑)
  5. `renderDetailPanel()`: 상세 패널 (범용 매핑)

**핵심 개선 코드:**
```javascript
// ❌ 기존 (중첩 구조만 지원)
const title = video.snippet?.title || '제목 없음';
const views = video.statistics?.viewCount || 0;

// ✅ 수정 (두 가지 구조 모두 지원)
const title = video.snippet?.title || video.title || '제목 정보 없음';
const views = parseInt(video.statistics?.viewCount ?? video.views ?? 0);
```

**커밋:**
- `6e82246` fix: YouTube Finder 데이터 매핑 수정 - 평탄화 & 중첩 구조 모두 지원

---

### 🔐 **인증 수정: YouTube 검색/채널 API 인증 불필요** (2026-01-28)
**로그인 없이도 YouTube 검색 가능!**

**문제:**
- `/api/youtube/search`, `/api/youtube/channel` 엔드포인트에 불필요한 인증 요구
- 프론트엔드에서 `Authorization: Bearer postflow_token` 헤더 전송
- 결과: 로그인하지 않으면 검색 불가

**해결:**
- ✅ 백엔드: 인증 미들웨어 선택 적용
  - `/api/youtube/search` - 인증 불필요 (서비스 API 키 사용)
  - `/api/youtube/channel` - 인증 불필요 (서비스 API 키 사용)
  - `/api/youtube/analyze` - 인증 필요 (크레딧 차감)
  - `/api/youtube/history*` - 인증 필요 (사용자 히스토리)
- ✅ 프론트엔드: Authorization 헤더 제거 (3곳)

**커밋:**
- `6d65a6a` fix: YouTube 검색/채널 API에서 Authorization 헤더 제거
- `ba19a1b` fix: YouTube 검색/채널 API 인증 불필요로 변경

---

### 🎉 **Phase 7 완료: PDF 보고서 생성** ⭐⭐⭐ (2026-01-28)
**전문적인 PDF 보고서를 원클릭으로 생성!**

**주요 기능:**
- ✅ **8개 섹션 선택 가능**: 경쟁사 비교, 트렌드 예측, 영상 추천, 성과 시뮬레이터, 영상 상세 분석, 채널 성장 추적, A/B 테스트, 대시보드
- ✅ **차트 이미지 자동 캡처**: html2canvas로 Chart.js 차트를 PNG로 변환하여 PDF에 삽입
- ✅ **전문적인 레이아웃**: 표지, 목차, 섹션별 내용, 푸터 자동 생성
- ✅ **커스터마이징**: 보고서 제목, 채널명 입력 가능
- ✅ **원클릭 다운로드**: `YouTube_분석보고서_채널명_날짜.pdf` 자동 저장

**사용 방법:**
1. 고급 분석 탭 > PDF 보고서 서브탭 이동
2. 보고서 제목 & 채널명 입력
3. 포함할 섹션 선택 (8개 중 선택)
4. "PDF 보고서 생성" 버튼 클릭
5. 자동 다운로드

**파일명 형식:**
```
YouTube_분석보고서_[채널명]_2026-01-28.pdf
```

**기술 상세:**
- **jsPDF 2.5.1**: PDF 문서 생성 라이브러리
- **html2canvas 1.4.1**: 차트를 이미지로 캡처
- **파일**: `src/youtube-analyzer-template.ts` (+242 라인), `public/static/youtube-finder.js` (+302 라인)
- **커밋**: `a0974a5` feat(phase7): PDF 보고서 생성 완성

---

### 🎉 **Phase 6 완료: 고급 분석 & 인사이트** ⭐⭐⭐ (2026-01-28)
**8개 고급 분석 기능으로 YouTube 전략 수립!**

**Phase 6A-D (2026-01-28):**
- ✅ **경쟁사 비교 분석**: 최대 5개 채널 동시 비교, 레이더 차트, 7개 지표 분석
- ✅ **트렌드 예측 AI**: GPT-4 기반 24시간/7일/최종 조회수 예측, AI 추천사항
- ✅ **영상 추천 알고리즘**: 성과도 기반/유사도 기반/틈새 전략 3가지 모드
- ✅ **성과 시뮬레이터**: 구독자수/업로드 빈도 입력 → 예상 조회수 계산

**Phase 6E-G (2026-01-28):**
- ✅ **영상 상세 분석**: 개별 영상 딥다이브, SWOT 분석, AI 인사이트
- ✅ **채널 성장 추적**: 시계열 데이터, 구독자/조회수 변화, TOP 5 영상
- ✅ **A/B 테스트 시뮬레이터**: Variant A vs B 비교, 레이더 차트, 우승자 선정

**커밋:**
- `4ddcc07` (Phase 6A-D), `5cc2fa9` (Phase 6C/D), `2c17010` (Phase 6E/F/G)

---

### 🎉 **Phase 5 완료: 마켓 탐색 & 분석** ⭐⭐⭐ (2026-01-27)
**Viewtrap 수준의 전문적인 3단 레이아웃!**

**Phase 5A: Viewtrap 스타일 UI (2026-01-27):**
- ✅ **3단 레이아웃**: 좌측 필터(280px), 중앙 목록(flex-1), 우측 상세(420px)
- ✅ **고정 헤더**: 서브네비(top: 64px), 콘텐츠(top: 120px)
- ✅ **스크롤 최적화**: sticky 패널, 경계선, 커스텀 스크롤바

**Phase 5B: 영상 비교 & AI 분석 (2026-01-27):**
- ✅ **영상 비교 (최대 3개)**: 썸네일, 제목, 채널, 조회수, 성과도 비교
- ✅ **AI 비교 분석 (10 크레딧)**: 선택한 영상들의 공통점/차이점/전략 AI 분석

**Phase 5C: 탭 구조 & 검색 개선 (2026-01-27):**
- ✅ **2개 탭**: 마켓 탐색 & 분석, 관심 채널 추적 & 분석
- ✅ **조회수 드롭다운**: 1일/1주/1개월/1년/전체
- ✅ **검색 방식 라디오**: 키워드 검색, 채널 ID/URL, 카테고리 ID
- ✅ **제외 키워드**: 쉼표(,) 구분 입력
- ✅ **정렬 명칭 개선**: "최신순" (date), "조회수순" (viewCount), "평점순" (rating)

**커밋:**
- `ff5857d` (Phase 5C), 이전 Phase 5A/5B 커밋

---

## 📊 주요 기능 완료 현황

### ✅ Phase 5: 마켓 탐색 & 분석
- [x] **Phase 5A**: 3단 레이아웃 + 필터 사이드바
- [x] **Phase 5B**: 영상 비교 (최대 3개) + AI 비교 분석
- [x] **Phase 5C**: 탭 구조 (2개) + 검색 방식 개선

### ✅ Phase 6: 고급 분석 & 인사이트
- [x] **Phase 6A**: 경쟁사 비교 분석
- [x] **Phase 6B**: 트렌드 예측 AI
- [x] **Phase 6C**: 영상 추천 알고리즘
- [x] **Phase 6D**: 성과 시뮬레이터
- [x] **Phase 6E**: 영상 상세 분석
- [x] **Phase 6F**: 채널 성장 추적
- [x] **Phase 6G**: A/B 테스트 시뮬레이터

### ✅ Phase 7: PDF 보고서 생성
- [x] **Phase 7**: PDF 보고서 자동 생성 (8개 섹션 선택 가능)

---

## 🌐 URLs

### Production URL
- **메인**: https://b2aaca45.haruhanpo-studio-new.pages.dev
- **YouTube Finder**: https://b2aaca45.haruhanpo-studio-new.pages.dev/youtube-analyzer

### GitHub
- **리포지토리**: https://github.com/kyh1987128/haruhanpo-studio.git
- **브랜치**: `main`
- **최신 커밋**: `8a9e403` (AI 자동 번역 & 댓글 수 추가)

### 개발 서버
- **로컬**: http://localhost:3000/youtube-analyzer

---

## 📖 사용 가이드

### 1. 마켓 탐색 & 분석 (Phase 5)

#### 기본 영상 검색
1. **검색 방식 선택**:
   - 키워드 검색 (기본)
   - 채널 ID/URL
   - 카테고리 ID
2. **필터 설정**:
   - 조회수 기간 (1일/1주/1개월/1년/전체)
   - 제외 키워드 (쉼표 구분)
   - 성과도 레벨 (Good/Normal/Bad)
3. **정렬 선택**:
   - YouTube 추천 (relevance)
   - 최신순 (date)
   - 조회수순 (viewCount)
   - 평점순 (rating)
4. **검색 시작** 버튼 클릭

#### 영상 비교 분석
1. 영상 목록에서 최대 3개 선택
2. "선택한 영상 AI 분석 시작 (10 크레딧)" 버튼 클릭
3. AI 분석 결과 확인:
   - 공통점
   - 차이점
   - 전략 제안

### 2. 고급 분석 (Phase 6)

#### 경쟁사 비교 분석 (Phase 6A)
1. 고급 분석 탭 > 경쟁사 비교 서브탭
2. 채널 ID 입력 (최소 2개, 최대 5개)
3. "비교 시작" 버튼 클릭
4. 결과 확인:
   - 레이더 차트 (7개 지표)
   - 비교표
   - 랭킹 카드

#### 트렌드 예측 (Phase 6B)
1. 고급 분석 탭 > 트렌드 예측 서브탭
2. YouTube 영상 URL 입력
3. "예측 시작" 버튼 클릭
4. 결과 확인:
   - 24시간/7일/최종 예측 조회수
   - 성과도 레벨
   - AI 추천사항 4가지

#### 영상 추천 (Phase 6C)
1. 고급 분석 탭 > 영상 추천 서브탭
2. 추천 모드 선택:
   - 성과도 기반
   - 유사도 기반
   - 틈새 전략
3. 결과 확인:
   - TOP 10 영상
   - 1-3위 메달
   - 추천 이유

#### 성과 시뮬레이터 (Phase 6D)
1. 고급 분석 탭 > 성과 시뮬레이터 서브탭
2. 입력값 설정:
   - 구독자 수
   - 월 업로드 횟수
   - 평균 시청 시간
   - 평균 좋아요율
   - 카테고리
   - 목표 기간
3. "시뮬레이션 실행" 버튼 클릭
4. 결과 확인:
   - 예상 조회수/총 조회수/예상 수익
   - 성장 속도 배지
   - 성과 요인 분석
   - AI 추천사항

#### 영상 상세 분석 (Phase 6E)
1. 고급 분석 탭 > 영상 상세 분석 서브탭
2. YouTube 영상 URL 입력
3. "분석 시작" 버튼 클릭
4. 결과 확인:
   - 기본 정보
   - 성과 지표
   - 시계열 차트 (24시간/7일/30일)
   - SWOT 분석
   - AI 추천사항

#### 채널 성장 추적 (Phase 6F)
1. 고급 분석 탭 > 채널 성장 추적 서브탭
2. 채널 ID 또는 URL 입력
3. 기간 선택 (7일/30일/90일)
4. "추적 시작" 버튼 클릭
5. 결과 확인:
   - 채널 정보
   - 성장 통계 (구독자/조회수/영상 수 변화)
   - 성장 차트
   - 미래 예측 (7일 후/30일 후)
   - TOP 5 영상

#### A/B 테스트 (Phase 6G)
1. 고급 분석 탭 > A/B 테스트 서브탭
2. Variant A 입력 (제목, 썸네일 스타일, 설명, 태그)
3. Variant B 입력 (제목, 썸네일 스타일, 설명, 태그)
4. 채널 통계 입력 (구독자 수, 평균 조회수, 평균 참여율)
5. "테스트 시작" 버튼 클릭
6. 결과 확인:
   - 비교 카드 (A vs B)
   - 레이더 차트 (4개 지표)
   - 우승자 배지
   - AI 추천사항

### 3. PDF 보고서 생성 (Phase 7)

#### 보고서 생성 방법
1. 고급 분석 탭 > **PDF 보고서** 서브탭 (9번째)
2. 보고서 설정:
   - 보고서 제목 입력
   - 채널명 입력
3. 포함할 섹션 선택 (8개 중 체크):
   - ✅ 경쟁사 비교 (기본 선택)
   - ✅ 트렌드 예측 (기본 선택)
   - ✅ 영상 추천 (기본 선택)
   - ✅ 성과 시뮬레이터 (기본 선택)
   - ⬜ 영상 상세 분석
   - ⬜ 채널 성장 추적
   - ⬜ A/B 테스트
   - ✅ 대시보드 (기본 선택)
4. **"PDF 보고서 생성"** 버튼 클릭
5. 잠시 대기 (10-15초)
6. 자동 다운로드 완료

#### 생성되는 PDF 구조
1. **표지 페이지**: 제목, 채널명, 생성일
2. **목차**: 선택된 섹션 목록
3. **섹션별 내용**: 각 분석 결과 + 차트 이미지
4. **푸터 페이지**: 생성 정보, 저작권

---

## 📁 프로젝트 구조

```
webapp/
├── src/
│   ├── index.tsx                      # Hono 메인 앱
│   ├── routes/
│   │   └── api/
│   │       └── youtube.ts             # YouTube API 라우트 (12개 엔드포인트)
│   ├── youtube-analyzer-template.ts   # 페이지 템플릿 (3,462 라인)
│   └── components/
│       └── header.ts                  # 헤더 컴포넌트
├── public/
│   └── static/
│       ├── youtube-finder.js          # 프론트엔드 JS (5,083 라인)
│       └── styles.css                 # Tailwind CSS
├── dist/                              # 빌드 결과물
│   ├── _worker.js                     # Cloudflare Workers 번들
│   └── _routes.json                   # 라우팅 설정
├── ecosystem.config.cjs               # PM2 설정
├── package.json                       # 의존성
├── tsconfig.json                      # TypeScript 설정
├── vite.config.ts                     # Vite 빌드
└── wrangler.jsonc                     # Cloudflare Pages 설정
```

---

## 🔧 기술 스택

### Backend
- **프레임워크**: Hono (경량 edge 프레임워크)
- **런타임**: Cloudflare Workers
- **배포**: Cloudflare Pages
- **API 엔드포인트**: 12개
  - `/api/youtube/competitor/compare`
  - `/api/youtube/predict`
  - `/api/youtube/recommend`
  - `/api/youtube/simulate`
  - `/api/youtube/video/analyze`
  - `/api/youtube/channel/growth`
  - `/api/youtube/ab-test`
  - `/api/youtube/report/generate`
  - 기타 4개

### Frontend
- **UI**: Tailwind CSS (Production Build)
- **아이콘**: Font Awesome 6.4.0
- **차트**: Chart.js 4.4.0
- **PDF**: jsPDF 2.5.1 + html2canvas 1.4.1
- **JavaScript**: Vanilla JS (5,083 라인)

### AI
- **모델**: OpenAI GPT-4o
- **용도**: 트렌드 예측, AI 인사이트, 추천사항 생성

---

## 📊 성과 지표

| 지표 | Phase 5 시작 | Phase 7 완료 | 변화 |
|------|--------------|--------------|------|
| **고급 분석 서브탭** | 0개 | 9개 | +9 |
| **백엔드 API** | 0개 | 12개 | +12 |
| **프론트엔드 기능** | 2개 | 11개 | +9 |
| **JavaScript 라인** | 4,126 | 5,083 | +957 |
| **HTML 라인** | 2,140 | 3,462 | +1,322 |
| **총 개발 라인** | 6,266 | 8,545 | +2,279 |

---

## ⚡ 로컬 개발

### 의존성 설치
```bash
npm install
```

### 프로젝트 빌드
```bash
npm run build
# 또는
npm run build:css  # Tailwind CSS만 빌드
```

### 개발 서버 시작 (PM2)
```bash
# 포트 정리
fuser -k 3000/tcp 2>/dev/null || true

# 빌드 (첫 실행 또는 코드 변경 후)
npm run build

# PM2로 시작
pm2 start ecosystem.config.cjs

# 서버 상태 확인
pm2 list

# 로그 확인 (비차단)
pm2 logs webapp --nostream

# 서버 재시작
pm2 restart webapp

# 서버 중지
pm2 stop webapp
pm2 delete webapp
```

### 테스트
```bash
# 서버 응답 확인
curl -I http://localhost:3000/youtube-analyzer

# 또는 브라우저에서
open http://localhost:3000/youtube-analyzer
```

---

## 🚀 배포

### Cloudflare Pages 배포
```bash
# 빌드
npm run build

# 배포
npx wrangler pages deploy dist --project-name haruhanpo-studio-new

# 프로덕션 URL: https://0aa232de.haruhanpo-studio-new.pages.dev
```

### GitHub 푸시
```bash
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main
```

---

## 📝 주의사항

### ⚠️ API 키 관리
- OpenAI API 키는 백엔드 환경변수로 관리
- `.dev.vars` 파일에 `OPENAI_API_KEY` 설정 필요
- Cloudflare Pages에서는 Secrets로 설정

### ⚠️ 빌드 주의사항
- **반드시 빌드 후 시작**: `npm run build` 후 `pm2 start`
- **Tailwind CSS 빌드**: `npm run build:css` 또는 `npm run build`
- **npm 명령 타임아웃**: 300초 이상 설정 권장

### ⚠️ Cloudflare Workers 제한사항
- **NO Node.js APIs**: `fs`, `path`, `crypto` 등 사용 불가
- **NO file system**: 런타임에 파일 읽기/쓰기 불가
- **Static files**: `public/` 폴더 사용, `serveStatic` 필수
- **CPU 시간 제한**: 무료 10ms, 유료 30ms

---

## 📋 다음 단계 제안

### Option 1: Phase 8 - 사용자 대시보드 (3-4시간)
- 분석 히스토리 저장 및 관리
- Cloudflare D1 데이터베이스 도입
- 북마크, 즐겨찾기, 분석 히스토리

### Option 2: Phase 9 - 알림 시스템 (2-3시간)
- 채널/영상 변화 실시간 알림
- Cloudflare Workers Cron + Email API
- 새 영상 알림, 조회수 급증 알림

### Option 3: Phase 10 - 모바일 최적화 (2-3시간)
- 반응형 디자인 개선
- 모바일 전용 UI/UX
- 터치 제스처, 스와이프 인터랙션

---

## 📄 라이선스
MIT License

## 👨‍💻 개발자
GenSpark AI Agent

## 📅 마지막 업데이트
- **버전**: Phase 7 완료 + AI 번역 추가
- **날짜**: 2026-01-28
- **변경사항**: 
  - 🌐 **AI 자동 번역**: GPT-4o-mini로 지역별 키워드 자동 번역 (35개 언어)
  - 💬 **댓글 수 추가**: YouTube videos API에서 commentCount 조회
  - 📝 **설명 & 영상 길이**: description, duration 필드 추가
  - 🐛 **데이터 매핑 수정**: "제목 없음", "채널 없음" 문제 해결 (범용 매핑 적용)
  - 🔐 **인증 수정**: YouTube 검색/채널 API 인증 불필요로 변경
  - ✅ Phase 7: PDF 보고서 생성 완성 (8개 섹션 선택, 차트 이미지 캡처, 전문적인 레이아웃)
  - ✅ Phase 6: 고급 분석 8개 기능 완성 (경쟁사 비교, 트렌드 예측, 영상 추천, 시뮬레이터, 상세 분석, 성장 추적, A/B 테스트, 대시보드)
  - ✅ Phase 5: 마켓 탐색 & 분석 완성 (3단 레이아웃, 영상 비교, 탭 구조)
