# YouTube Trends Worker 배포 가이드

## 📋 **사전 준비사항**

### 1. Supabase 프로젝트 설정

1. **Supabase 대시보드** (https://supabase.com/dashboard) 접속
2. **새 프로젝트 생성** 또는 기존 프로젝트 선택
3. **SQL Editor** 열기 (왼쪽 메뉴)
4. **`supabase-schema.sql` 파일 내용 복사하여 실행**
   - 테이블 3개 생성: `trending_keywords`, `trending_videos`, `channel_bookmarks`
   - 인덱스 및 RLS 정책 자동 생성
5. **Settings > API**에서 다음 정보 복사:
   - **Project URL** → `SUPABASE_URL`로 사용
   - **service_role key** (secret) → `SUPABASE_SERVICE_KEY`로 사용

### 2. YouTube API 키 발급

1. **Google Cloud Console** (https://console.cloud.google.com) 접속
2. **프로젝트 생성** 또는 기존 프로젝트 선택
3. **API 및 서비스 > 라이브러리**
4. **YouTube Data API v3** 검색 및 활성화
5. **사용자 인증 정보 > 사용자 인증 정보 만들기 > API 키**
6. 생성된 API 키 복사 → `YOUTUBE_API_KEY`로 사용

---

## 🚀 **Worker 배포 단계**

### Step 1: 환경 변수 설정

Worker에 필요한 환경 변수를 Cloudflare Secrets로 등록합니다:

```bash
cd /home/user/youtube-trends-worker

# YouTube API 키 설정
npx wrangler secret put YOUTUBE_API_KEY
# 프롬프트가 나오면 API 키 입력

# Supabase URL 설정
npx wrangler secret put SUPABASE_URL
# 프롬프트가 나오면 https://your-project.supabase.co 입력

# Supabase Service Key 설정
npx wrangler secret put SUPABASE_SERVICE_KEY
# 프롬프트가 나오면 service_role 키 입력
```

### Step 2: Worker 배포

```bash
cd /home/user/youtube-trends-worker
npm run deploy
```

배포 성공 시 다음과 같은 메시지가 출력됩니다:
```
✨ Deployed youtube-trends-worker triggers (durations)
  - https://youtube-trends-worker.YOUR_ACCOUNT.workers.dev
```

### Step 3: 배포 확인

#### 3-1. Health Check
```bash
curl https://youtube-trends-worker.YOUR_ACCOUNT.workers.dev/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2024-01-30T14:00:00.000Z"
}
```

#### 3-2. 수동 트리거 테스트
```bash
curl -X POST https://youtube-trends-worker.YOUR_ACCOUNT.workers.dev/trigger
```

예상 응답:
```json
{
  "success": true,
  "message": "트렌드 업데이트 완료",
  "timestamp": "2024-01-30T14:00:00.000Z"
}
```

#### 3-3. Supabase 데이터 확인

Supabase 대시보드에서 다음 쿼리 실행:

```sql
-- 키워드 확인
SELECT * FROM trending_keywords ORDER BY score DESC LIMIT 10;

-- 비디오 확인
SELECT * FROM trending_videos ORDER BY views DESC LIMIT 10;
```

### Step 4: Cron 로그 확인

```bash
cd /home/user/youtube-trends-worker
npm run tail
```

4시간마다 자동으로 실행되는 Cron 작업의 로그를 실시간으로 확인할 수 있습니다.

---

## 📊 **API 비용 분석**

### **현재 시스템 (개선 전)**
- **일일 API 사용량**: 9,683 units (96.89%)
- **문제점**: 사용자 요청마다 YouTube API 호출

### **개선 후 시스템 (Cron Worker)**
- **일일 API 사용량**: 6 units (0.06%)
- **API 호출 빈도**: 4시간마다 1회 (하루 6회)
- **API 호출당 비용**: 약 1 unit (카테고리 5개 × 비디오 10개)
- **절감률**: **99.94%**
- **최대 지원 사용자 수**: **1,666명/day** (10,000 units ÷ 6 units)

### **비용 계산**

| 항목 | 개선 전 | 개선 후 |
|------|---------|---------|
| 하루 API 호출 수 | 9,683회 | 6회 |
| API 할당량 사용률 | 96.89% | 0.06% |
| 일일 사용자 수 (10,000 units 기준) | 1명 | 1,666명 |
| 월간 비용 (무료 티어 초과 시) | $290 | $0.18 |

---

## ⚙️ **Cron 스케줄 설정**

현재 설정: `0 */4 * * *` (매 4시간마다 실행)

실행 시간:
- 00:00 (자정)
- 04:00 (새벽)
- 08:00 (아침)
- 12:00 (낮)
- 16:00 (오후)
- 20:00 (저녁)

### **스케줄 변경 방법**

`wrangler.toml` 파일의 `crons` 값을 수정:

```toml
# 매 2시간마다 실행
crons = ["0 */2 * * *"]

# 매 시간마다 실행
crons = ["0 * * * *"]

# 매일 특정 시간 실행 (예: 오전 9시, 오후 6시)
crons = ["0 9,18 * * *"]
```

수정 후 재배포:
```bash
npm run deploy
```

---

## 🔧 **문제 해결**

### 1. 환경 변수가 설정되지 않음
```bash
# 환경 변수 목록 확인
npx wrangler secret list

# 환경 변수 재설정
npx wrangler secret put YOUTUBE_API_KEY
```

### 2. Supabase 연결 실패
- Supabase URL이 올바른지 확인 (https://your-project.supabase.co)
- service_role 키가 올바른지 확인 (anon key가 아닌 service_role key 사용)
- Supabase 프로젝트가 활성 상태인지 확인

### 3. YouTube API 할당량 초과
- Google Cloud Console에서 할당량 확인
- Cron 실행 빈도 조정 (4시간 → 6시간 등)

### 4. Worker 로그 확인
```bash
cd /home/user/youtube-trends-worker
npm run tail
```

---

## 📚 **다음 단계**

1. **Frontend 업데이트**: Supabase에서 트렌드 데이터 읽기
2. **3탭 UI 구현**: 영상 발굴, 트렌드 인사이트, 채널 분석
3. **Realtime 연동**: Supabase Realtime으로 실시간 업데이트

---

## 📞 **지원**

문제가 발생하면 다음 정보를 함께 제공해주세요:
- Worker 로그 (`npm run tail`)
- Supabase 테이블 상태
- 오류 메시지 전체 내용
