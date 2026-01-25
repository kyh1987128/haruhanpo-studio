# 🎯 DB 담당 AI 작업 요약 (빠른 시작 가이드)

## 📋 작업 개요

### 목적
기존 마케팅허브(하루한포스트) 시스템에 **YouTube 분석기 기능 추가**

### 현재 DB 상태 (2026-01-28 기준)
```
📊 전체 규모:
- 총 테이블: 36개
- 총 컬럼: 416개
- 총 함수: 18개
- 총 트리거: 7개
- 총 RLS 정책: 102개
- 총 인덱스: 119개

🔑 핵심 테이블:
- users: 82개 컬럼 (매우 복잡, 절대 수정 금지!)
- credit_transactions: 9개 컬럼
- user_stats: 7개 컬럼
```

### 작업 후 변화
```
테이블: 36개 → 38개 (+2개)
함수: 18개 → 20개 (+2개)
트리거: 7개 → 8개 (+1개)
RLS 정책: 102개 → 109개 (+7개)
인덱스: 119개 → 131개 (+12개)
```

---

## ⚠️ 중요 주의사항

### 🔴 절대 수정 금지 항목
1. **users 테이블** (82개 컬럼 - 매우 복잡!)
2. **credit_transactions 테이블**
3. **기존 18개 함수** (deduct_credit, add_credits 등)
4. **기존 7개 트리거**
5. **기존 102개 RLS 정책**

### ⚠️ 원본 설계서와 다른 점
| 항목 | 원본 설계서 | 실제 DB |
|-----|-----------|---------|
| profiles 테이블 | 존재 예상 | ❌ **없음** (users에 통합) |
| users.credits | free_credits + paid_credits 분리 | ✅ **credits 단일 컬럼** |
| deduct_credits_safe() | 존재 예상 | ❌ **없음** (deduct_credit 존재) |

---

## 🚀 빠른 실행 가이드 (30분)

### Step 1: 사전 확인 (10분)
```sql
-- 1. 기존 테이블 확인 (3개 필수)
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name)
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'credit_transactions', 'user_stats');
-- 예상: users(82), credit_transactions(9), user_stats(7)

-- 2. users 핵심 컬럼 확인
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('id', 'email', 'credits', 'role', 'created_at');
-- 예상: 5개 모두 존재

-- 3. 크레딧 함수 확인
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN ('deduct_credit', 'add_credits', 'grant_initial_credits');
-- 예상: 1개 이상 존재

-- 4. 신규 테이블 중복 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('youtube_analysis_history', 'youtube_analysis_cache');
-- 예상: 0 rows (없어야 정상)
```

**✅ 통과 조건**: 
- users, credit_transactions, user_stats 존재
- users 핵심 컬럼 5개 존재
- 크레딧 함수 1개 이상 존재
- 신규 테이블 없음

**❌ 실패 시**: 즉시 보고하고 작업 중단

---

### Step 2: 백업 생성 (5분)
1. Supabase Dashboard → Database → **Backups**
2. **Create a backup** 클릭
3. 이름: `before-youtube-analyzer-2026-01-28`
4. 완료 대기 (2-3분)

**⚠️ 백업 완료 전 다음 단계 절대 금지!**

---

### Step 3: SQL 실행 (5분)

**파일 위치**: `/home/user/webapp/supabase-schema-youtube-analyzer.sql`

1. Supabase Dashboard → **SQL Editor**
2. **New query** 클릭
3. SQL 파일 내용 전체 복사 → 붙여넣기
4. **Run** 버튼 클릭

**예상 결과**:
```
NOTICE:  ✅ YouTube 분석기 DB 설계 완료!
NOTICE:  📋 생성된 테이블: youtube_analysis_history, youtube_analysis_cache
NOTICE:  🔧 수정된 테이블: user_stats (youtube_analysis_count 컬럼 추가)
NOTICE:  ⚙️  생성된 함수: delete_expired_youtube_cache(), increment_youtube_count()
NOTICE:  🔒 RLS 정책: 7개 생성 완료
NOTICE:  📊 인덱스: 12개 생성 완료

Success. No rows returned
```

**❌ 에러 발생 시**: 에러 메시지 전체 복사하여 즉시 보고

---

### Step 4: 검증 (5분)

```sql
-- 1. 테이블 생성 확인 (2개)
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('youtube_analysis_history', 'youtube_analysis_cache');
-- 예상: 2 rows

-- 2. 인덱스 생성 확인 (12개)
SELECT COUNT(*) 
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('youtube_analysis_history', 'youtube_analysis_cache');
-- 예상: 12

-- 3. RLS 정책 확인 (7개)
SELECT COUNT(*) 
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('youtube_analysis_history', 'youtube_analysis_cache');
-- 예상: 7

-- 4. 함수 확인 (2개)
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN ('delete_expired_youtube_cache', 'increment_youtube_count');
-- 예상: 2 rows

-- 5. Trigger 확인 (1개)
SELECT trigger_name 
FROM information_schema.triggers
WHERE event_object_table = 'youtube_analysis_history';
-- 예상: 1 row (update_youtube_stats)

-- 6. user_stats 컬럼 확인
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'user_stats' AND column_name = 'youtube_analysis_count';
-- 예상: 1 row
```

**✅ 통과 조건**: 모든 검증 쿼리가 예상 결과와 일치

**❌ 실패 시**: 실패한 항목과 실제 결과를 보고

---

### Step 5: Cron Job 설정 (5분)

1. Supabase Dashboard → Database → **Cron Jobs**
2. **New Cron Job** 클릭
3. 설정:
   - Name: `delete-expired-youtube-cache`
   - Schedule: `0 3 * * *`
   - SQL: `SELECT delete_expired_youtube_cache();`
4. **Create** 클릭

**검증**:
```sql
SELECT jobname, schedule 
FROM cron.job 
WHERE jobname = 'delete-expired-youtube-cache';
-- 예상: 1 row
```

---

### Step 6: 테스트 (5분)

```sql
-- 1. 실제 user_id 확인
SELECT id FROM users ORDER BY created_at DESC LIMIT 1;
-- 결과를 복사 (예: 123e4567-e89b-12d3-a456-426614174000)

-- 2. 테스트 데이터 삽입 (위의 user_id 사용)
INSERT INTO youtube_analysis_history (
  user_id, video_id, video_url, video_title, analysis_type,
  analysis_result, credits_used, was_cached
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- ← 실제 user_id로 변경
  'dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Test Video',
  'video-stats',
  '{"test": true}'::jsonb,
  5,
  false
);
-- 예상: INSERT 0 1

-- 3. Trigger 작동 확인 (카운트 증가)
SELECT youtube_analysis_count 
FROM user_stats 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
-- 예상: 1 (또는 기존 값에서 +1)

-- 4. 중복 방지 테스트 (에러 발생해야 정상)
INSERT INTO youtube_analysis_history (
  user_id, video_id, analysis_type, credits_used
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'dQw4w9WgXcQ',
  'video-stats',
  5
);
-- 예상: ERROR (duplicate key)

-- 5. 테스트 데이터 정리
DELETE FROM youtube_analysis_history 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'
  AND video_id = 'dQw4w9WgXcQ';

UPDATE user_stats 
SET youtube_analysis_count = youtube_analysis_count - 1
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
```

---

## ✅ 최종 보고서 (복사용)

```
=====================================
YouTube 분석기 DB 구축 완료 보고서
=====================================

📅 작업 일시: [날짜/시간]
⏱️ 소요 시간: 30분

✅ 작업 완료:
1. 백업: before-youtube-analyzer-2026-01-28
2. 신규 테이블 2개: youtube_analysis_history, youtube_analysis_cache
3. user_stats 수정: youtube_analysis_count 컬럼 추가
4. 함수 2개: delete_expired_youtube_cache(), increment_youtube_count()
5. Trigger 1개: update_youtube_stats
6. 인덱스 12개 생성
7. RLS 정책 7개 생성
8. Cron Job 1개 설정

✅ 검증 완료:
- 테이블 생성: ✅
- 인덱스 생성: ✅ (12개)
- RLS 정책: ✅ (7개)
- 함수 생성: ✅ (2개)
- Trigger 작동: ✅
- 중복 방지: ✅
- 캐시 시스템: ✅

✅ 기존 시스템 무영향:
- users (82컬럼): 변경 없음 ✅
- credit_transactions: 변경 없음 ✅
- 기존 18개 함수: 영향 없음 ✅
- 기존 7개 트리거: 영향 없음 ✅
- 기존 102개 RLS 정책: 영향 없음 ✅

📊 DB 규모 변화:
- 테이블: 36 → 38 (+2)
- 함수: 18 → 20 (+2)
- 트리거: 7 → 8 (+1)
- RLS: 102 → 109 (+7)
- 인덱스: 119 → 131 (+12)

🎯 다음 단계:
1. 웹빌더 AI에게 백엔드 API 개발 요청
2. YouTube Data API 연동
3. GPT-4 분석 엔드포인트 구현

=====================================
```

---

## 🆘 문제 발생 시

### 롤백 방법 1: 백업 복원 (권장)
1. Supabase Dashboard → Database → Backups
2. `before-youtube-analyzer-2026-01-28` 선택
3. **Restore** 클릭

### 롤백 방법 2: 수동 삭제
```sql
DROP TRIGGER IF EXISTS update_youtube_stats ON youtube_analysis_history;
DROP FUNCTION IF EXISTS increment_youtube_count();
DROP FUNCTION IF EXISTS delete_expired_youtube_cache();
ALTER TABLE user_stats DROP COLUMN IF EXISTS youtube_analysis_count;
DROP TABLE IF EXISTS youtube_analysis_cache CASCADE;
DROP TABLE IF EXISTS youtube_analysis_history CASCADE;
```

---

## 📚 참고 문서

- **상세 지시서**: `/home/user/webapp/DB-SETUP-INSTRUCTIONS.md` (24KB)
- **SQL 파일**: `/home/user/webapp/supabase-schema-youtube-analyzer.sql` (7KB)

---

**이 가이드만 따라하면 30분 내 안전하게 완료할 수 있습니다!** 🚀
