# 🚀 빠른 배포 가이드

## ✅ 확인 완료 사항

1. **YouTube API 키**: ✅ 이미 Cloudflare Pages에 설정됨
2. **Supabase 정보**: ✅ 이미 Cloudflare Pages에 설정됨
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY (또는 SUPABASE_SERVICE_ROLE_KEY)

---

## 📋 Worker 배포 3단계

### Step 1: Cloudflare Worker에 환경 변수 복사 (2분)

**같은 값을 Worker에도 설정해야 합니다.**

```bash
cd /home/user/youtube-trends-worker

# 1. YOUTUBE_API_KEY 설정
npx wrangler secret put YOUTUBE_API_KEY
# → Pages에 설정된 동일한 YouTube API 키 입력

# 2. SUPABASE_URL 설정  
npx wrangler secret put SUPABASE_URL
# → 입력: https://gmjbsndricdogtqsovnb.supabase.co

# 3. SUPABASE_SERVICE_KEY 설정
npx wrangler secret put SUPABASE_SERVICE_KEY
# → Pages의 SUPABASE_SERVICE_KEY 값 입력
```

### Step 2: Supabase 테이블 생성 (1분)

**Supabase Dashboard에서 SQL 실행:**

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (gmjbsndricdogtqsovnb)
3. **SQL Editor** 클릭
4. `/home/user/youtube-trends-worker/supabase-schema.sql` 파일 내용 복사하여 실행

또는 로컬에서 확인:
```bash
cat /home/user/youtube-trends-worker/supabase-schema.sql
```

### Step 3: Worker 배포 (1분)

```bash
cd /home/user/youtube-trends-worker
npm run deploy
```

배포 성공 시 URL 출력:
```
✨ Deployed youtube-trends-worker triggers
  - https://youtube-trends-worker.YOUR_ACCOUNT.workers.dev
```

---

## 🧪 테스트

### 1. Health Check
```bash
curl https://youtube-trends-worker.YOUR_ACCOUNT.workers.dev/health
```

예상 응답:
```json
{"status":"ok","timestamp":"2024-01-30T15:00:00.000Z"}
```

### 2. 수동 트리거 (첫 데이터 수집)
```bash
curl -X POST https://youtube-trends-worker.YOUR_ACCOUNT.workers.dev/trigger
```

예상 응답:
```json
{
  "success": true,
  "message": "트렌드 업데이트 완료",
  "timestamp": "2024-01-30T15:00:00.000Z"
}
```

### 3. Supabase 데이터 확인

**Supabase Dashboard > Table Editor:**

```sql
-- 키워드 확인
SELECT keyword, score, estimated_views 
FROM trending_keywords 
ORDER BY score DESC 
LIMIT 10;

-- 비디오 확인
SELECT title, channel_title, views 
FROM trending_videos 
ORDER BY views DESC 
LIMIT 10;
```

### 4. Frontend 확인

**Production URL 접속:**
https://ba1e7769.haruhanpo-studio-new.pages.dev/youtube-analyzer

1. **트렌드 인사이트** 탭 클릭
2. 급상승 키워드 6개 표시 확인
3. 카테고리별 인기 영상 확인

---

## ⏰ Cron 자동 실행

Worker가 배포되면 **매 4시간마다 자동으로 트렌드 데이터를 수집**합니다:

- 00:00 (자정)
- 04:00 (새벽)
- 08:00 (아침)
- 12:00 (낮)
- 16:00 (오후)
- 20:00 (저녁)

로그 확인:
```bash
cd /home/user/youtube-trends-worker
npm run tail
```

---

## 💡 빠른 참조

### 기존 환경 변수 위치

**Cloudflare Pages (haruhanpo-studio-new):**
- Dashboard: https://dash.cloudflare.com/
- Pages > haruhanpo-studio-new > Settings > Environment variables
- ✅ YOUTUBE_API_KEY (이미 설정됨)
- ✅ SUPABASE_URL (이미 설정됨)
- ✅ SUPABASE_SERVICE_KEY (이미 설정됨)

**Supabase:**
- Dashboard: https://supabase.com/dashboard
- 프로젝트: gmjbsndricdogtqsovnb
- URL: https://gmjbsndricdogtqsovnb.supabase.co
- API Keys: Settings > API

---

## 🆘 문제 해결

### 환경 변수 값을 잊어버렸다면?

**Supabase URL은 이미 알고 있습니다:**
```
https://gmjbsndricdogtqsovnb.supabase.co
```

**Service Key 확인:**
1. Supabase Dashboard 접속
2. Settings > API
3. **service_role key** 복사 (anon key 아님!)

**YouTube API Key 확인:**
- Cloudflare Pages Dashboard에서는 암호화되어 보이지 않음
- Google Cloud Console에서 확인:
  - https://console.cloud.google.com/
  - APIs & Services > Credentials
  - 기존 API 키 확인 또는 새로 생성

---

## 📊 예상 결과

### API 비용
- **개선 전**: 9,683 calls/day (96.89% 할당량)
- **개선 후**: 6 calls/day (0.06% 할당량)
- **절감률**: 99.94%

### 데이터 수집
- **키워드**: 상위 50개 (UI에는 6개 표시)
- **영상**: 카테고리별 10개씩 (총 50개)
- **업데이트**: 4시간마다 자동

### 사용자 경험
- **트렌드 탭 클릭**: 즉시 로딩 (DB 조회)
- **키워드 클릭**: 영상 발굴 탭으로 자동 검색
- **카테고리 전환**: 실시간 필터링

---

준비되셨으면 Step 1부터 진행하세요! 🚀
