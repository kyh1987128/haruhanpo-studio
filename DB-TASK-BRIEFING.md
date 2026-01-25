# DB담당 AI 작업 지시서

## 📋 작업 개요

**프로젝트**: 하루한포스트 마케팅허브 - YouTube 분석기 기능 추가  
**작업 유형**: 신규 테이블 2개 추가 + 기존 테이블 1개 수정  
**예상 소요 시간**: 약 30분  
**위험도**: 낮음 (기존 구조의 95% 재사용)  
**예상 효과**: API 비용 90% 절감, 캐시 히트 시 응답 0.1초

---

## 🎯 작업 목표

YouTube 동영상 분석 결과를 저장하고 24시간 캐싱하여 비용을 절감하는 시스템 구축

---

## 📊 1단계: 기존 DB 구조 확인

### 1.1 전체 구조 파악

아래 통계를 먼저 확인하여 현재 시스템 상태를 파악하세요:

```sql
-- 전체 테이블 수 확인 (예상: 36개)
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 전체 컬럼 수 확인 (예상: 416개)
SELECT COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_schema = 'public';

-- 전체 함수 수 확인 (예상: 18개)
SELECT COUNT(*) as function_count 
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- 전체 트리거 수 확인 (예상: 7개)
SELECT COUNT(*) as trigger_count 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- 전체 RLS 정책 수 확인 (예상: 102개)
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public';

-- 전체 제약조건 수 확인 (예상: 241개)
SELECT COUNT(*) as constraint_count 
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public';

-- 전체 인덱스 수 확인 (예상: 119개)
SELECT COUNT(*) as index_count 
FROM pg_indexes 
WHERE schemaname = 'public';
```

**예상 결과:**
- 총 테이블: 36개
- 총 컬럼: 416개
- 총 함수: 18개
- 총 트리거: 7개
- 총 RLS 정책: 102개
- 총 제약조건: 241개
- 총 인덱스: 119개

### 1.2 핵심 테이블 확인

이번 작업에서 의존하는 기존 테이블들을 확인하세요:

```sql
-- users 테이블 확인 (예상: 82컬럼, 13제약조건)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- user_stats 테이블 확인 (예상: 7컬럼, 3제약조건)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_stats'
ORDER BY ordinal_position;

-- credit_transactions 테이블 확인 (예상: 9컬럼)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'credit_transactions'
ORDER BY ordinal_position;
```

**확인 포인트:**
- ✅ users 테이블이 존재하고 id (uuid) 컬럼이 있는지
- ✅ user_stats 테이블이 존재하고 user_id로 users와 연결되어 있는지
- ✅ credit_transactions 테이블이 존재하고 user_id로 users와 연결되어 있는지

### 1.3 필수 함수 확인

```sql
-- deduct_credits_safe() 함수 존재 여부 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'deduct_credits_safe';
```

**확인 포인트:**
- ✅ deduct_credits_safe() 함수가 존재하는지 (크레딧 차감 로직에 필수)

---

## 📂 2단계: 작업 파일 확인

작업에 필요한 2개의 파일을 확인하세요:

### 파일 1: 상세 지시서
**경로**: `/home/user/webapp/DB-SETUP-INSTRUCTIONS.md`  
**용도**: 전체 작업의 상세 설명 및 체크리스트

### 파일 2: 실행 SQL 스크립트
**경로**: `/home/user/webapp/supabase-schema-youtube-analyzer.sql`  
**용도**: 실제 실행할 SQL 코드

**확인 명령:**
```bash
# 파일 존재 여부 확인
ls -lh /home/user/webapp/DB-SETUP-INSTRUCTIONS.md
ls -lh /home/user/webapp/supabase-schema-youtube-analyzer.sql

# 파일 내용 확인
cat /home/user/webapp/DB-SETUP-INSTRUCTIONS.md
cat /home/user/webapp/supabase-schema-youtube-analyzer.sql
```

---

## 🔧 3단계: 실제 작업 수행

### 3.1 백업 생성 (필수!)

```sql
-- Supabase Dashboard에서 수동 백업 생성
-- 백업 이름: before-youtube-analyzer-2026-01-28
```

**중요**: 백업 생성 완료 후에만 다음 단계로 진행하세요!

### 3.2 SQL 스크립트 실행

아래 순서대로 실행하세요:

1. **Supabase SQL Editor 접속**
2. **`supabase-schema-youtube-analyzer.sql` 파일 내용 복사**
3. **SQL Editor에 붙여넣기**
4. **실행 (Run)**

### 3.3 실행 내용 요약

SQL 스크립트를 실행하면 다음 작업이 자동으로 수행됩니다:

#### 📌 신규 테이블 1: youtube_analysis_history
```sql
-- 분석 결과 영구 저장용
-- 주요 컬럼: id, user_id, video_id, video_url, video_title, 
--           channel_name, analysis_type, analysis_result(JSONB), 
--           ai_summary, credits_used, was_cached 등 총 19개
-- 인덱스: 7개 (user_id, video_id, created_at, analysis_type 등)
-- RLS 정책: 3개 (사용자 자신의 기록만 조회/삽입/삭제 가능)
```

#### 📌 신규 테이블 2: youtube_analysis_cache
```sql
-- 24시간 캐싱용 (API 비용 절감)
-- PK: (video_id, analysis_type)
-- 주요 컬럼: analysis_result(JSONB), video_info(JSONB), 
--           created_at, expires_at, hit_count 등 총 7개
-- 인덱스: 4개 (expires_at, hit_count, JSONB GIN 인덱스 등)
-- RLS 정책: 4개 (모든 사용자 읽기 가능, 서비스 역할만 쓰기 가능)
```

#### 📌 기존 테이블 수정: user_stats
```sql
-- 컬럼 추가: youtube_analysis_count INTEGER DEFAULT 0
-- Trigger 추가: youtube_analysis_history INSERT 시 자동 +1
```

#### 📌 함수 2개 생성
```sql
-- 1) delete_expired_youtube_cache(): 만료된 캐시 자동 삭제
-- 2) increment_youtube_count(): user_stats.youtube_analysis_count 자동 증가
```

#### 📌 Trigger 1개 생성
```sql
-- update_youtube_stats: youtube_analysis_history INSERT 후 
--                        increment_youtube_count() 자동 호출
```

---

## ✅ 4단계: 검증 (필수!)

### 4.1 테이블 생성 확인

```sql
-- 신규 테이블 2개 생성 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('youtube_analysis_history', 'youtube_analysis_cache');

-- 예상 결과: 2개 행 반환
```

### 4.2 인덱스 확인

```sql
-- 인덱스 12개 생성 확인
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('youtube_analysis_history', 'youtube_analysis_cache');

-- 예상 결과: 12개 행 반환
```

### 4.3 RLS 정책 확인

```sql
-- RLS 정책 7개 생성 확인
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('youtube_analysis_history', 'youtube_analysis_cache');

-- 예상 결과: 7개 행 반환
```

### 4.4 Trigger 확인

```sql
-- Trigger 1개 생성 확인
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'youtube_analysis_history';

-- 예상 결과: 1개 행 (update_youtube_stats)
```

### 4.5 user_stats 컬럼 확인

```sql
-- user_stats에 youtube_analysis_count 컬럼 추가 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
AND column_name = 'youtube_analysis_count';

-- 예상 결과: 1개 행 (youtube_analysis_count, integer, 0)
```

---

## 🔄 5단계: Cron Job 설정

### Supabase Dashboard → Database → Cron Jobs

```sql
-- 매일 오전 3시에 만료된 캐시 자동 삭제
SELECT cron.schedule(
  'delete-expired-youtube-cache',
  '0 3 * * *',
  $$SELECT delete_expired_youtube_cache()$$
);
```

**설정 후 확인:**
```sql
-- Cron Job 등록 확인
SELECT * FROM cron.job WHERE jobname = 'delete-expired-youtube-cache';
```

---

## 🧪 6단계: 테스트 데이터 삽입

### 6.1 테스트 캐시 데이터 삽입

```sql
-- 서비스 역할로 실행 (Supabase SQL Editor 사용)
INSERT INTO youtube_analysis_cache (video_id, analysis_type, analysis_result, video_info, expires_at)
VALUES (
  'dQw4w9WgXcQ',
  'video-stats',
  '{"views": 1000000, "likes": 50000}'::jsonb,
  '{"title": "Test Video", "channel": "Test Channel"}'::jsonb,
  NOW() + INTERVAL '24 hours'
);

-- 조회 테스트
SELECT * FROM youtube_analysis_cache WHERE video_id = 'dQw4w9WgXcQ';
```

### 6.2 테스트 히스토리 데이터 삽입

```sql
-- 본인 user_id로 교체 필요
INSERT INTO youtube_analysis_history (
  user_id, 
  video_id, 
  video_url, 
  video_title, 
  channel_name,
  analysis_type, 
  analysis_result, 
  ai_summary,
  credits_used,
  was_cached
)
VALUES (
  'YOUR_USER_ID_HERE', -- ⚠️ 본인의 user_id로 교체
  'dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Test Video Title',
  'Test Channel',
  'video-stats',
  '{"views": 1000000, "likes": 50000}'::jsonb,
  'This is a test summary',
  10,
  false
);

-- 조회 테스트
SELECT * FROM youtube_analysis_history WHERE video_id = 'dQw4w9WgXcQ';

-- user_stats 증가 확인
SELECT youtube_analysis_count 
FROM user_stats 
WHERE user_id = 'YOUR_USER_ID_HERE'; -- ⚠️ 본인의 user_id로 교체
```

### 6.3 중복 방지 테스트

```sql
-- 같은 데이터를 다시 삽입 시도 (UNIQUE 제약조건으로 실패해야 함)
INSERT INTO youtube_analysis_history (
  user_id, 
  video_id, 
  analysis_type, 
  video_url,
  video_title,
  channel_name,
  analysis_result,
  ai_summary,
  credits_used,
  was_cached
)
VALUES (
  'YOUR_USER_ID_HERE', -- ⚠️ 본인의 user_id로 교체
  'dQw4w9WgXcQ',
  'video-stats',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Test Video Title',
  'Test Channel',
  '{"views": 1000000}'::jsonb,
  'Test',
  10,
  false
);

-- 예상 결과: ERROR - duplicate key value violates unique constraint
```

---

## 📋 7단계: 최종 체크리스트

### 완료 확인 항목

- [ ] 1. 백업 생성 완료 (before-youtube-analyzer-2026-01-28)
- [ ] 2. SQL 스크립트 실행 완료 (에러 없음)
- [ ] 3. 테이블 2개 생성 확인 (youtube_analysis_history, youtube_analysis_cache)
- [ ] 4. 인덱스 12개 생성 확인
- [ ] 5. RLS 정책 7개 생성 확인
- [ ] 6. Trigger 1개 생성 확인 (update_youtube_stats)
- [ ] 7. user_stats에 youtube_analysis_count 컬럼 추가 확인
- [ ] 8. Cron Job 설정 완료 (delete-expired-youtube-cache)
- [ ] 9. 테스트 데이터 삽입 및 조회 성공
- [ ] 10. 중복 방지 동작 확인 (UNIQUE 제약조건)
- [ ] 11. Trigger 동작 확인 (youtube_analysis_count 자동 증가)

### 기존 시스템 영향 확인

- [ ] users 테이블 변경 없음 (조회만)
- [ ] profiles 테이블 변경 없음
- [ ] credit_transactions 테이블 변경 없음
- [ ] deduct_credits_safe() 함수 변경 없음

---

## 📊 8단계: 최종 보고서 작성

작업 완료 후 아래 양식으로 보고해 주세요:

```
===========================================
YouTube 분석기 DB 구축 - 최종 보고서
===========================================

📅 작업 일시: [YYYY-MM-DD HH:MM]
👤 작업자: DB담당 AI

✅ 작업 완료 내역
- 백업 생성: [백업 이름]
- 신규 테이블 2개 생성: youtube_analysis_history, youtube_analysis_cache
- user_stats 테이블 수정: youtube_analysis_count 컬럼 추가
- 함수 2개 생성: delete_expired_youtube_cache(), increment_youtube_count()
- Trigger 1개 생성: update_youtube_stats
- 인덱스 12개 생성 (성능 최적화)
- RLS 정책 7개 생성 (보안)
- Cron Job 1개 설정 (캐시 자동 삭제)

✅ 검증 결과
- 테이블 생성: ✅ 정상
- 인덱스 생성: ✅ 정상 (12개)
- RLS 정책: ✅ 정상 (7개)
- Trigger 동작: ✅ 정상 (user_stats 자동 증가 확인)
- 중복 방지: ✅ 정상 (UNIQUE 제약조건 작동)
- 캐시 시스템: ✅ 정상 (24시간 TTL)

✅ 기존 시스템 영향
- users 테이블: ✅ 변경 없음
- profiles 테이블: ✅ 변경 없음
- credit_transactions 테이블: ✅ 변경 없음
- deduct_credits_safe() 함수: ✅ 변경 없음

📊 최종 통계 (작업 후)
- 총 테이블: 38개 (기존 36개 + 신규 2개)
- 총 함수: 20개 (기존 18개 + 신규 2개)
- 총 트리거: 8개 (기존 7개 + 신규 1개)
- 총 RLS 정책: 109개 (기존 102개 + 신규 7개)
- 총 인덱스: 131개 (기존 119개 + 신규 12개)

⏱️ 작업 소요 시간: [X분]

🎯 다음 단계
- 백엔드 API 개발 시작 가능
- YouTube Data API 연동 준비
- GPT-4 분석 엔드포인트 구현

===========================================
```

---

## 🚨 9단계: 문제 발생 시 대응

### 롤백 절차

만약 문제가 발생하면 백업으로 즉시 복구하세요:

```sql
-- 1. 신규 테이블 삭제
DROP TABLE IF EXISTS youtube_analysis_history CASCADE;
DROP TABLE IF EXISTS youtube_analysis_cache CASCADE;

-- 2. user_stats 컬럼 삭제
ALTER TABLE user_stats DROP COLUMN IF EXISTS youtube_analysis_count;

-- 3. 함수 삭제
DROP FUNCTION IF EXISTS delete_expired_youtube_cache();
DROP FUNCTION IF EXISTS increment_youtube_count();

-- 4. Cron Job 삭제
SELECT cron.unschedule('delete-expired-youtube-cache');
```

### 일반적인 오류 해결

#### 오류 1: "relation does not exist"
→ 기존 테이블(users, user_stats) 확인 필요

#### 오류 2: "function does not exist"
→ deduct_credits_safe() 함수 존재 여부 확인

#### 오류 3: "duplicate key violation"
→ 정상 동작 (중복 방지 작동 중)

#### 오류 4: RLS policy error
→ Supabase Service Role로 실행했는지 확인

---

## 📝 10단계: 참고 자료

### 주요 파일 경로
- 상세 지시서: `/home/user/webapp/DB-SETUP-INSTRUCTIONS.md`
- SQL 스크립트: `/home/user/webapp/supabase-schema-youtube-analyzer.sql`
- 빠른 시작 가이드: `/home/user/webapp/DB-SETUP-QUICK-START.md`

### 예상 성능
- API 비용 절감: 90%
- 캐시 히트 응답 시간: 0.1초
- 캐시 유효 기간: 24시간 (분석 타입별 차등 가능)

### 보안 특징
- RLS 정책: 사용자별 데이터 격리
- UNIQUE 제약: 중복 분석 방지
- Service Role 전용: 캐시 쓰기 권한 제한

---

## ✨ 작업 시작 전 체크리스트

실제 작업을 시작하기 전에 아래 항목을 모두 확인하세요:

- [ ] 기존 DB 구조 파악 완료 (1단계)
- [ ] 작업 파일 2개 확인 완료 (2단계)
- [ ] Supabase 백업 준비 완료
- [ ] SQL Editor 접근 가능 확인
- [ ] Service Role 권한 확인
- [ ] 예상 소요 시간 확보 (약 30분)

**모든 항목 확인 후 작업을 시작하세요!**

---

**작성일**: 2026-01-28  
**작성자**: 웹빌더 AI  
**버전**: 1.0  
**상태**: 작업 지시 완료 - DB담당 AI 전달 대기

