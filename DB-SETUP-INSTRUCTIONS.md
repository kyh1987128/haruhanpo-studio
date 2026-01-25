# 🗄️ DB 담당 AI 작업 지시서 - YouTube 분석기 DB 구축

## 📋 목차
1. [작업 개요](#작업-개요)
2. [사전 확인 작업](#사전-확인-작업)
3. [백업 생성](#백업-생성)
4. [SQL 실행 단계](#sql-실행-단계)
5. [검증 단계](#검증-단계)
6. [Cron Job 설정](#cron-job-설정)
7. [테스트 데이터](#테스트-데이터)
8. [최종 체크리스트](#최종-체크리스트)

---

## 작업 개요

### 🎯 목적
- 기존 마케팅허브 시스템에 YouTube 분석기 기능 추가
- 기존 테이블 **완전 보존** (수정 금지)
- 신규 테이블 2개 추가 + 기존 테이블 1개 컬럼 추가

### 📊 작업 범위
| 작업 유형 | 대상 | 작업 내용 |
|---------|------|----------|
| **보존** | users, credit_transactions | ❌ 절대 수정 금지 |
| **신규 생성** | youtube_analysis_history | ✅ 분석 결과 저장 테이블 |
| **신규 생성** | youtube_analysis_cache | ✅ 24시간 캐싱 테이블 |
| **컬럼 추가** | user_stats | ✅ youtube_analysis_count 추가 |
| **함수 생성** | delete_expired_youtube_cache() | ✅ 캐시 자동 삭제 |
| **Trigger 생성** | increment_youtube_count() | ✅ 통계 자동 업데이트 |

**⚠️ 중요 변경사항**:
- `profiles` 테이블은 **존재하지 않음** (users 테이블에 통합됨)
- 기존 크레딧 함수 (`deduct_credit`, `add_credits` 등)를 **그대로 사용**
- users 테이블은 **82개 컬럼**으로 매우 복잡 → 수정 절대 금지

### ⏱️ 예상 소요 시간
- 사전 확인: 10분
- 백업: 5분
- SQL 실행: 5분
- 검증: 5분
- Cron 설정: 5분
- **총 30분**

---

## 사전 확인 작업

### ✅ Step 1: 기존 DB 구조 확인

**목적**: 기존 시스템과 충돌 없는지 확인

**📊 현재 DB 상태 (2026-01-28 기준)**:
- 총 테이블 수: **36개**
- 총 컬럼 수: **416개**
- 총 함수: **18개**
- 총 트리거: **7개**
- 총 RLS 정책: **102개**
- 총 인덱스: **119개**

#### 1-1. 기존 테이블 존재 확인
```sql
-- 다음 3개 테이블이 반드시 존재해야 함
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'credit_transactions', 'user_stats')
ORDER BY table_name;
```

**예상 결과**:
```
 table_name           | column_count
----------------------+-------------
 credit_transactions  | 9
 user_stats          | 7
 users               | 82
(3 rows)
```

**⚠️ 중요**: 
- `profiles` 테이블은 **없습니다** (users 테이블에 통합됨)
- users 테이블이 매우 복잡 (82개 컬럼)
- 만약 3개 중 하나라도 없으면: 즉시 작업 중단하고 보고

---

#### 1-2. users 테이블 구조 확인
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('id', 'email', 'credits', 'role', 'created_at')
ORDER BY ordinal_position;
```

**필수 컬럼 확인** (총 82개 컬럼 중 핵심만 확인):
- ✅ `id` (UUID, NOT NULL) - PRIMARY KEY
- ✅ `email` (TEXT, nullable)
- ✅ `credits` (INTEGER, nullable) - 크레딧 잔액
- ✅ `role` (VARCHAR, nullable)
- ✅ `created_at` (TIMESTAMP)

**⚠️ 주의**: 
- users 테이블은 **82개 컬럼**으로 매우 복잡합니다
- `free_credits`, `paid_credits` 대신 `credits` 단일 컬럼 사용
- 만약 위 5개 핵심 컬럼 중 하나라도 없으면: 즉시 작업 중단하고 보고

---

#### 1-3. 크레딧 관련 함수 확인
```sql
-- 기존 크레딧 함수 확인 (총 18개 함수 중 크레딧 관련 확인)
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN ('deduct_credits_safe', 'deduct_credit', 'add_credits', 'grant_initial_credits')
ORDER BY routine_name;
```

**예상 결과** (4개 함수 중 일부 또는 전부 존재):
```
 routine_name            | routine_type
-------------------------+-------------
 add_credits             | FUNCTION
 deduct_credit           | FUNCTION
 grant_initial_credits   | FUNCTION
(3 rows 이상)
```

**⚠️ 중요**: 
- 원본 설계서의 `deduct_credits_safe()` 함수가 **없을 수 있습니다**
- 대신 `deduct_credit()` 또는 `add_credits()` 함수가 존재
- **이 경우 백엔드 API에서 기존 함수를 사용해야 함**
- 만약 크레딧 관련 함수가 **하나도 없으면**: 즉시 보고

---

#### 1-4. user_stats 테이블 구조 확인
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY ordinal_position;
```

**확인 사항**:
- ✅ `user_id` 컬럼 존재
- ✅ `youtube_analysis_count` 컬럼 **없음** (우리가 추가할 예정)
- ⚠️ 만약 `youtube_analysis_count`가 **이미 있으면**: 보고 후 지시 대기

---

#### 1-5. 신규 테이블 중복 확인
```sql
-- 우리가 생성할 테이블이 이미 있는지 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('youtube_analysis_history', 'youtube_analysis_cache');
```

**예상 결과**:
```
(0 rows)  -- 아무것도 없어야 정상
```

**⚠️ 만약 테이블이 이미 있으면**: 보고 후 지시 대기 (기존 데이터 확인 필요)

---

### 📸 Step 2: 사전 확인 결과 보고

**다음 형식으로 보고**:
```
✅ 사전 확인 완료 보고

1. 기존 테이블 3개 존재: users(82컬럼), credit_transactions(9컬럼), user_stats(7컬럼)
2. users 테이블 필수 컬럼 5개 확인 (id, email, credits, role, created_at)
3. 크레딧 함수 확인: [함수명 나열]
   예: deduct_credit(), add_credits(), grant_initial_credits()
4. user_stats.youtube_analysis_count 컬럼 없음 (정상)
5. 신규 테이블 2개 없음 (정상)

📊 현재 DB 규모:
- 총 테이블: 36개
- 총 함수: 18개
- 총 트리거: 7개
- 총 RLS 정책: 102개
- 총 인덱스: 119개

→ 다음 단계 진행 가능
```

**⚠️ 만약 문제 발견 시**:
```
❌ 사전 확인 실패

문제: [구체적인 문제 설명]
예1: users 테이블에 credits 컬럼이 없음 (82개 컬럼 확인 필요)
예2: deduct_credits_safe() 함수가 없음 (대신 deduct_credit() 존재)
예3: user_stats 테이블에 youtube_analysis_count 컬럼이 이미 존재함

→ 작업 중단, 지시 대기
```

---

## 백업 생성

### 🔒 Step 3: Supabase 백업 생성 (필수!)

**작업 순서**:
1. Supabase Dashboard 로그인
2. 좌측 메뉴 → **Database** 클릭
3. 상단 탭 → **Backups** 클릭
4. 우측 상단 → **Create a backup** 버튼 클릭
5. 백업 이름 입력:
   ```
   before-youtube-analyzer-2026-01-28
   ```
6. **Create** 클릭
7. 백업 완료 대기 (약 2-3분)

**백업 완료 확인**:
```
✅ 백업 생성 완료

백업 이름: before-youtube-analyzer-2026-01-28
생성 시간: 2026-01-28 14:30:00 (UTC)
상태: Completed

→ 다음 단계 진행 가능
```

**⚠️ 주의**: 백업 완료 전에는 **절대 다음 단계 진행 금지**

---

## SQL 실행 단계

### 🔧 Step 4: SQL 스크립트 실행

**실행 방법**:
1. Supabase Dashboard → **SQL Editor** 이동
2. **New query** 클릭
3. 아래 SQL을 **전체 복사** 후 붙여넣기
4. **Run** 버튼 클릭
5. 결과 확인

---

#### SQL 스크립트 (전체 복사)

```sql
-- ============================================
-- YouTube 분석기 Supabase DB 설계 (최종 수정본)
-- 작성일: 2026-01-28
-- 목적: 마케팅허브에 YouTube 분석 기능 추가
-- ============================================

-- ============================================
-- 테이블 1: youtube_analysis_history
-- 목적: 사용자의 YouTube 분석 결과 영구 저장
-- ============================================

CREATE TABLE IF NOT EXISTS youtube_analysis_history (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- YouTube 영상 정보
  video_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_title TEXT,
  channel_name TEXT,
  channel_id TEXT,
  
  -- YouTube 통계 (분석 당시 스냅샷)
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  subscriber_count BIGINT DEFAULT 0,
  duration TEXT,
  published_at TIMESTAMP,
  
  -- 분석 정보
  analysis_type TEXT NOT NULL,
  analysis_result JSONB,
  ai_summary TEXT,
  
  -- 크레딧 정보
  credits_used INTEGER DEFAULT 0,
  was_cached BOOLEAN DEFAULT FALSE,
  
  -- 메타데이터
  metadata JSONB,
  
  -- 시간 추적
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 코멘트
COMMENT ON TABLE youtube_analysis_history IS 'YouTube 영상 분석 결과 히스토리';
COMMENT ON COLUMN youtube_analysis_history.analysis_type IS 'video-stats, success-factors, title-optimization, sentiment-analysis, channel-strategy, video-ideas, competitor';
COMMENT ON COLUMN youtube_analysis_history.was_cached IS 'true: 캐시 사용(무료), false: 신규 분석(크레딧 차감)';

-- ============================================
-- 성능 최적화 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_youtube_history_user_id 
  ON youtube_analysis_history(user_id);

CREATE INDEX IF NOT EXISTS idx_youtube_history_video_id 
  ON youtube_analysis_history(video_id);

CREATE INDEX IF NOT EXISTS idx_youtube_history_created_at 
  ON youtube_analysis_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_history_analysis_type 
  ON youtube_analysis_history(analysis_type);

CREATE INDEX IF NOT EXISTS idx_youtube_history_user_created 
  ON youtube_analysis_history(user_id, created_at DESC);

-- JSONB 검색 성능 향상
CREATE INDEX IF NOT EXISTS idx_youtube_history_analysis_gin
  ON youtube_analysis_history USING GIN (analysis_result);

-- 중복 분석 방지 (동일 사용자 + 영상 + 분석타입)
CREATE UNIQUE INDEX IF NOT EXISTS idx_youtube_history_unique
  ON youtube_analysis_history(user_id, video_id, analysis_type);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE youtube_analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own youtube history"
  ON youtube_analysis_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own youtube history"
  ON youtube_analysis_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own youtube history"
  ON youtube_analysis_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 테이블 2: youtube_analysis_cache
-- 목적: 24시간 캐싱으로 API 비용 90% 절약
-- ============================================

CREATE TABLE IF NOT EXISTS youtube_analysis_cache (
  -- 복합 기본 키
  video_id TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  
  -- 캐시 데이터
  analysis_result JSONB NOT NULL,
  video_info JSONB,
  
  -- 캐시 관리
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0,
  
  PRIMARY KEY (video_id, analysis_type)
);

COMMENT ON TABLE youtube_analysis_cache IS 'YouTube 분석 결과 24시간 캐시 (공용)';
COMMENT ON COLUMN youtube_analysis_cache.hit_count IS '캐시 히트 횟수 (인기 영상 파악용)';

-- ============================================
-- 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_youtube_cache_expires 
  ON youtube_analysis_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_youtube_cache_hit_count 
  ON youtube_analysis_cache(hit_count DESC);

-- JSONB 검색 성능 향상
CREATE INDEX IF NOT EXISTS idx_youtube_cache_analysis_gin
  ON youtube_analysis_cache USING GIN (analysis_result);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE youtube_analysis_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 캐시 읽기 가능
CREATE POLICY "Enable read access for all users"
  ON youtube_analysis_cache FOR SELECT
  USING (true);

-- 서비스 롤만 쓰기 가능
CREATE POLICY "Service role can write cache"
  ON youtube_analysis_cache FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update cache"
  ON youtube_analysis_cache FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete cache"
  ON youtube_analysis_cache FOR DELETE
  TO service_role
  USING (true);

-- ============================================
-- 만료된 캐시 자동 삭제 함수
-- ============================================

CREATE OR REPLACE FUNCTION delete_expired_youtube_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM youtube_analysis_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_expired_youtube_cache() IS '만료된 YouTube 캐시 자동 삭제 (Cron 작업용)';

-- ============================================
-- user_stats 테이블 수정
-- ============================================

ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS youtube_analysis_count INTEGER DEFAULT 0;

COMMENT ON COLUMN user_stats.youtube_analysis_count IS 
  '사용자가 분석한 YouTube 영상 총 개수 (무료 분석 포함)';

-- ============================================
-- 자동 통계 업데이트 Trigger
-- ============================================

CREATE OR REPLACE FUNCTION increment_youtube_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, youtube_analysis_count, updated_at)
  VALUES (NEW.user_id, 1, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    youtube_analysis_count = user_stats.youtube_analysis_count + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_youtube_stats ON youtube_analysis_history;

CREATE TRIGGER update_youtube_stats
AFTER INSERT ON youtube_analysis_history
FOR EACH ROW
EXECUTE FUNCTION increment_youtube_count();

COMMENT ON FUNCTION increment_youtube_count() IS 
  'YouTube 분석 시 user_stats.youtube_analysis_count 자동 증가';

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ YouTube 분석기 DB 설계 완료!';
  RAISE NOTICE '📋 생성된 테이블: youtube_analysis_history, youtube_analysis_cache';
  RAISE NOTICE '🔧 수정된 테이블: user_stats (youtube_analysis_count 컬럼 추가)';
  RAISE NOTICE '⚙️  생성된 함수: delete_expired_youtube_cache(), increment_youtube_count()';
  RAISE NOTICE '🔒 RLS 정책: 7개 생성 완료';
  RAISE NOTICE '📊 인덱스: 12개 생성 완료';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  다음 단계:';
  RAISE NOTICE '1. Supabase Dashboard → Database → Cron Jobs 설정';
  RAISE NOTICE '   - 함수: delete_expired_youtube_cache()';
  RAISE NOTICE '   - 스케줄: 0 3 * * * (매일 새벽 3시)';
  RAISE NOTICE '2. 검증 SQL 실행';
END $$;
```

---

### 📊 Step 5: 실행 결과 확인

**정상 실행 시 출력**:
```
NOTICE:  ✅ YouTube 분석기 DB 설계 완료!
NOTICE:  📋 생성된 테이블: youtube_analysis_history, youtube_analysis_cache
NOTICE:  🔧 수정된 테이블: user_stats (youtube_analysis_count 컬럼 추가)
NOTICE:  ⚙️  생성된 함수: delete_expired_youtube_cache(), increment_youtube_count()
NOTICE:  🔒 RLS 정책: 7개 생성 완료
NOTICE:  📊 인덱스: 12개 생성 완료

Success. No rows returned
```

**⚠️ 만약 에러 발생 시**:
```
ERROR:  [에러 메시지]
```
→ 에러 메시지 전체 복사하여 즉시 보고

---

## 검증 단계

### ✅ Step 6: 생성 결과 검증

#### 6-1. 테이블 생성 확인
```sql
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('youtube_analysis_history', 'youtube_analysis_cache')
ORDER BY table_name;
```

**예상 결과**:
```
 table_name                | column_count
---------------------------+-------------
 youtube_analysis_cache    | 7
 youtube_analysis_history  | 19
(2 rows)
```

✅ **통과 조건**: 2개 테이블 모두 존재

---

#### 6-2. 인덱스 생성 확인
```sql
SELECT tablename, indexname
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('youtube_analysis_history', 'youtube_analysis_cache')
ORDER BY tablename, indexname;
```

**예상 결과**: 총 **12개 인덱스**
```
 tablename                 | indexname
---------------------------+------------------------------------------
 youtube_analysis_cache    | idx_youtube_cache_analysis_gin
 youtube_analysis_cache    | idx_youtube_cache_expires
 youtube_analysis_cache    | idx_youtube_cache_hit_count
 youtube_analysis_cache    | youtube_analysis_cache_pkey
 youtube_analysis_history  | idx_youtube_history_analysis_gin
 youtube_analysis_history  | idx_youtube_history_analysis_type
 youtube_analysis_history  | idx_youtube_history_created_at
 youtube_analysis_history  | idx_youtube_history_unique
 youtube_analysis_history  | idx_youtube_history_user_created
 youtube_analysis_history  | idx_youtube_history_user_id
 youtube_analysis_history  | idx_youtube_history_video_id
 youtube_analysis_history  | youtube_analysis_history_pkey
(12 rows)
```

✅ **통과 조건**: 12개 인덱스 모두 존재

---

#### 6-3. RLS 정책 확인
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('youtube_analysis_history', 'youtube_analysis_cache')
ORDER BY tablename, policyname;
```

**예상 결과**: 총 **7개 정책**
```
 schemaname | tablename                 | policyname                              | cmd
------------+---------------------------+-----------------------------------------+--------
 public     | youtube_analysis_cache    | Enable read access for all users        | SELECT
 public     | youtube_analysis_cache    | Service role can delete cache           | DELETE
 public     | youtube_analysis_cache    | Service role can update cache           | UPDATE
 public     | youtube_analysis_cache    | Service role can write cache            | INSERT
 public     | youtube_analysis_history  | Users can delete their own youtube history | DELETE
 public     | youtube_analysis_history  | Users can insert their own youtube history | INSERT
 public     | youtube_analysis_history  | Users can view their own youtube history   | SELECT
(7 rows)
```

✅ **통과 조건**: 7개 정책 모두 존재

---

#### 6-4. 함수 생성 확인
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN ('delete_expired_youtube_cache', 'increment_youtube_count')
ORDER BY routine_name;
```

**예상 결과**:
```
 routine_name                 | routine_type
------------------------------+-------------
 delete_expired_youtube_cache | FUNCTION
 increment_youtube_count      | FUNCTION
(2 rows)
```

✅ **통과 조건**: 2개 함수 모두 존재

---

#### 6-5. Trigger 생성 확인
```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'youtube_analysis_history'
  AND trigger_name = 'update_youtube_stats';
```

**예상 결과**:
```
 trigger_name        | event_object_table       | action_statement
---------------------+--------------------------+----------------------------------
 update_youtube_stats | youtube_analysis_history | EXECUTE FUNCTION increment_youtube_count()
(1 row)
```

✅ **통과 조건**: Trigger 존재

---

#### 6-6. user_stats 컬럼 추가 확인
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_stats' 
  AND column_name = 'youtube_analysis_count';
```

**예상 결과**:
```
 column_name              | data_type | column_default
--------------------------+-----------+----------------
 youtube_analysis_count   | integer   | 0
(1 row)
```

✅ **통과 조건**: 컬럼 존재 및 기본값 0

---

### 📝 Step 7: 검증 결과 보고

**정상 완료 시**:
```
✅ 검증 완료 보고

1. 테이블 2개 생성: youtube_analysis_history, youtube_analysis_cache
2. 인덱스 12개 생성 완료
3. RLS 정책 7개 생성 완료
4. 함수 2개 생성: delete_expired_youtube_cache(), increment_youtube_count()
5. Trigger 1개 생성: update_youtube_stats
6. user_stats 컬럼 추가: youtube_analysis_count (INTEGER DEFAULT 0)

→ 다음 단계 진행 가능
```

**⚠️ 만약 검증 실패 시**:
```
❌ 검증 실패

항목: [실패한 항목]
예상: [예상 결과]
실제: [실제 결과]

→ 롤백 필요, 지시 대기
```

---

## Cron Job 설정

### ⏰ Step 8: 만료된 캐시 자동 삭제 Cron 설정

**목적**: 매일 새벽 3시에 만료된 캐시 자동 삭제

**작업 순서**:
1. Supabase Dashboard → **Database** 클릭
2. 좌측 메뉴 → **Cron Jobs** 클릭
3. 우측 상단 → **New Cron Job** 버튼 클릭
4. 다음 정보 입력:

| 항목 | 값 |
|-----|---|
| **Name** | `delete-expired-youtube-cache` |
| **Schedule (Cron expression)** | `0 3 * * *` |
| **SQL** | `SELECT delete_expired_youtube_cache();` |

5. **Create** 버튼 클릭

**Cron 표현식 설명**:
```
0 3 * * *
│ │ │ │ │
│ │ │ │ └── 요일 (매일)
│ │ │ └──── 월 (매월)
│ │ └────── 일 (매일)
│ └──────── 시 (새벽 3시)
└────────── 분 (0분)
```

**설정 완료 확인**:
```sql
-- Cron Job 목록 확인
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname = 'delete-expired-youtube-cache';
```

**예상 결과**:
```
 jobname                        | schedule    | command
--------------------------------+-------------+----------------------------------------
 delete-expired-youtube-cache   | 0 3 * * *   | SELECT delete_expired_youtube_cache();
(1 row)
```

✅ **통과 조건**: Cron Job 존재

---

## 테스트 데이터

### 🧪 Step 9: 테스트 데이터 삽입 및 검증

**목적**: Trigger 및 Constraint 정상 작동 확인

#### 9-1. 실제 user_id 확인
```sql
-- 테스트용 user_id 조회
SELECT id, email 
FROM users 
ORDER BY created_at DESC 
LIMIT 1;
```

**결과 예시**:
```
 id                                   | email
--------------------------------------+------------------
 123e4567-e89b-12d3-a456-426614174000 | user@example.com
(1 row)
```

**⚠️ 주의**: 아래 SQL의 `user_id`를 **실제 값으로 변경**

---

#### 9-2. 테스트 데이터 삽입
```sql
-- 테스트 분석 결과 삽입
INSERT INTO youtube_analysis_history (
  user_id,
  video_id,
  video_url,
  video_title,
  channel_name,
  views,
  likes,
  comments,
  analysis_type,
  analysis_result,
  ai_summary,
  credits_used,
  was_cached
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- ← 실제 user_id로 변경
  'dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Rick Astley - Never Gonna Give You Up',
  'Rick Astley',
  1400000000,
  15000000,
  2500000,
  'video-stats',
  '{"views": 1400000000, "likes": 15000000, "viral_score": 95}'::jsonb,
  '조회수 14억회의 전설적인 뮤직비디오',
  5,
  false
);
```

**예상 결과**:
```
INSERT 0 1
```

✅ **통과 조건**: INSERT 성공

---

#### 9-3. 히스토리 조회
```sql
SELECT 
  video_title,
  analysis_type,
  credits_used,
  was_cached,
  created_at
FROM youtube_analysis_history
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'  -- ← 실제 user_id로 변경
ORDER BY created_at DESC
LIMIT 1;
```

**예상 결과**:
```
 video_title                              | analysis_type | credits_used | was_cached | created_at
------------------------------------------+---------------+--------------+------------+---------------------------
 Rick Astley - Never Gonna Give You Up    | video-stats   | 5            | f          | 2026-01-28 14:35:00+00
(1 row)
```

✅ **통과 조건**: 삽입한 데이터 조회됨

---

#### 9-4. Trigger 작동 확인 (자동 통계 업데이트)
```sql
SELECT youtube_analysis_count 
FROM user_stats 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';  -- ← 실제 user_id로 변경
```

**예상 결과**:
```
 youtube_analysis_count
-----------------------
                     1
(1 row)
```

✅ **통과 조건**: 카운트가 1 증가함

**⚠️ 만약 0이면**: Trigger 작동 안 함 → 즉시 보고

---

#### 9-5. 중복 방지 테스트
```sql
-- 동일한 데이터 다시 삽입 시도 (에러 발생해야 정상)
INSERT INTO youtube_analysis_history (
  user_id, video_id, analysis_type, credits_used
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- ← 실제 user_id로 변경
  'dQw4w9WgXcQ',
  'video-stats',
  5
);
```

**예상 결과** (에러 발생):
```
ERROR:  duplicate key value violates unique constraint "idx_youtube_history_unique"
DETAIL:  Key (user_id, video_id, analysis_type)=(123e4567-e89b-12d3-a456-426614174000, dQw4w9WgXcQ, video-stats) already exists.
```

✅ **통과 조건**: 에러 발생 (중복 방지 정상 작동)

**⚠️ 만약 에러 없이 삽입되면**: UNIQUE INDEX 미작동 → 즉시 보고

---

#### 9-6. 캐시 테스트 (서비스 롤 권한)
```sql
-- 캐시 데이터 삽입 (서비스 롤로 실행되어야 함)
-- ⚠️ 주의: Supabase SQL Editor는 기본적으로 service_role 권한 사용
INSERT INTO youtube_analysis_cache (
  video_id,
  analysis_type,
  analysis_result,
  expires_at
) VALUES (
  'dQw4w9WgXcQ',
  'video-stats',
  '{"views": 1400000000, "viral_score": 95}'::jsonb,
  NOW() + INTERVAL '24 hours'
);
```

**예상 결과**:
```
INSERT 0 1
```

✅ **통과 조건**: INSERT 성공

---

#### 9-7. 캐시 조회 테스트
```sql
SELECT video_id, analysis_type, hit_count, expires_at
FROM youtube_analysis_cache
WHERE video_id = 'dQw4w9WgXcQ';
```

**예상 결과**:
```
 video_id     | analysis_type | hit_count | expires_at
--------------+---------------+-----------+---------------------------
 dQw4w9WgXcQ  | video-stats   | 0         | 2026-01-29 14:35:00+00
(1 row)
```

✅ **통과 조건**: 캐시 조회됨

---

#### 9-8. 테스트 데이터 정리
```sql
-- 테스트 완료 후 데이터 삭제
DELETE FROM youtube_analysis_history 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'  -- ← 실제 user_id로 변경
  AND video_id = 'dQw4w9WgXcQ';

DELETE FROM youtube_analysis_cache 
WHERE video_id = 'dQw4w9WgXcQ';

-- user_stats 카운트 원복
UPDATE user_stats 
SET youtube_analysis_count = youtube_analysis_count - 1
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';  -- ← 실제 user_id로 변경
```

**예상 결과**:
```
DELETE 1
DELETE 1
UPDATE 1
```

✅ **통과 조건**: 모든 테스트 데이터 삭제됨

---

## 최종 체크리스트

### ✅ Step 10: 최종 완료 확인

**다음 체크리스트를 모두 확인 후 보고**:

```
✅ 최종 체크리스트

[ ] 1. 사전 확인 완료
    [ ] 기존 테이블 4개 존재 확인
    [ ] users 테이블 필수 컬럼 확인
    [ ] deduct_credits_safe() 함수 확인
    [ ] user_stats.youtube_analysis_count 컬럼 없음 확인
    [ ] 신규 테이블 중복 없음 확인

[ ] 2. 백업 생성 완료
    [ ] Supabase 백업 생성
    [ ] 백업 상태: Completed 확인

[ ] 3. SQL 실행 완료
    [ ] 에러 없이 실행 완료
    [ ] 완료 메시지 출력 확인

[ ] 4. 검증 완료
    [ ] 테이블 2개 생성 확인
    [ ] 인덱스 12개 생성 확인
    [ ] RLS 정책 7개 생성 확인
    [ ] 함수 2개 생성 확인
    [ ] Trigger 1개 생성 확인
    [ ] user_stats 컬럼 추가 확인

[ ] 5. Cron Job 설정 완료
    [ ] delete-expired-youtube-cache 작업 생성
    [ ] 스케줄: 0 3 * * * 확인

[ ] 6. 테스트 완료
    [ ] 히스토리 삽입 성공
    [ ] Trigger 작동 확인 (카운트 증가)
    [ ] 중복 방지 작동 확인 (에러 발생)
    [ ] 캐시 삽입 성공
    [ ] 캐시 조회 성공
    [ ] 테스트 데이터 정리 완료

[ ] 7. 기존 시스템 영향 확인
    [ ] users 테이블 변경 없음
    [ ] profiles 테이블 변경 없음
    [ ] credit_transactions 테이블 변경 없음
    [ ] deduct_credits_safe() 함수 변경 없음
```

---

## 최종 보고서 양식

**작업 완료 시 다음 양식으로 보고**:

```
=====================================
YouTube 분석기 DB 구축 완료 보고서
=====================================

📅 작업 일시: 2026-01-28 14:30:00 (UTC)
👤 작업자: [DB 담당 AI 이름]
⏱️ 소요 시간: 30분

✅ 작업 완료 항목:
1. 백업 생성: before-youtube-analyzer-2026-01-28
2. 신규 테이블 2개 생성:
   - youtube_analysis_history (19개 컬럼)
   - youtube_analysis_cache (7개 컬럼)
3. user_stats 테이블 수정:
   - youtube_analysis_count 컬럼 추가
4. 함수 2개 생성:
   - delete_expired_youtube_cache()
   - increment_youtube_count()
5. Trigger 1개 생성:
   - update_youtube_stats
6. 인덱스 12개 생성 (성능 최적화)
7. RLS 정책 7개 생성 (보안)
8. Cron Job 1개 설정 (캐시 자동 삭제)

✅ 검증 결과:
- 모든 테이블 정상 생성
- 모든 인덱스 정상 생성
- 모든 RLS 정책 정상 작동
- Trigger 정상 작동 (통계 자동 업데이트 확인)
- 중복 방지 정상 작동
- 캐시 시스템 정상 작동

✅ 기존 시스템 영향:
- users 테이블: 변경 없음 ✅ (82개 컬럼 보존)
- credit_transactions 테이블: 변경 없음 ✅
- 기존 크레딧 함수: 변경 없음 ✅ (deduct_credit, add_credits 등)
- 기존 18개 함수: 영향 없음 ✅
- 기존 7개 트리거: 영향 없음 ✅
- 기존 102개 RLS 정책: 영향 없음 ✅
- 기존 119개 인덱스: 영향 없음 ✅

📊 DB 규모 변화:
- 테이블: 36개 → 38개 (+2)
- 함수: 18개 → 20개 (+2)
- 트리거: 7개 → 8개 (+1)
- RLS 정책: 102개 → 109개 (+7)
- 인덱스: 119개 → 131개 (+12)

🎯 다음 단계:
1. 웹빌더 AI에게 백엔드 API 개발 요청
2. YouTube Data API 연동
3. GPT-4 분석 엔드포인트 구현

=====================================
```

---

## ⚠️ 롤백 절차 (문제 발생 시)

**만약 심각한 문제 발생 시**:

### 방법 1: 백업 복원 (권장)
1. Supabase Dashboard → Database → Backups
2. `before-youtube-analyzer-2026-01-28` 백업 선택
3. **Restore** 버튼 클릭
4. 복원 완료 대기 (약 5분)

### 방법 2: 수동 롤백 SQL
```sql
-- 역순으로 삭제
DROP TRIGGER IF EXISTS update_youtube_stats ON youtube_analysis_history;
DROP FUNCTION IF EXISTS increment_youtube_count();
DROP FUNCTION IF EXISTS delete_expired_youtube_cache();
ALTER TABLE user_stats DROP COLUMN IF EXISTS youtube_analysis_count;
DROP TABLE IF EXISTS youtube_analysis_cache CASCADE;
DROP TABLE IF EXISTS youtube_analysis_history CASCADE;

-- Cron Job 삭제 (Supabase Dashboard에서 수동 삭제 필요)
```

---

## 📞 문의 사항

**문제 발생 시 보고 형식**:
```
❌ 문제 발생 보고

단계: [Step 번호와 이름]
문제: [구체적인 문제 설명]
에러 메시지: [전체 에러 메시지 복사]
스크린샷: [가능하면 첨부]

현재 상태:
- 백업 생성 여부: [Yes/No]
- 테이블 생성 여부: [Yes/No]
- 롤백 필요 여부: [Yes/No]
```

---

## 📚 추가 참고 자료

### DB 스키마 다이어그램
```
users (기존)
  ↓ (FK: user_id)
youtube_analysis_history (신규)
  - 분석 결과 영구 저장
  - RLS: 사용자별 접근 제어
  - Trigger: user_stats 자동 업데이트

user_stats (기존 + 컬럼 추가)
  - youtube_analysis_count ← NEW!

youtube_analysis_cache (신규)
  - 24시간 공용 캐시
  - Cron: 매일 만료 캐시 삭제
  - RLS: 서비스 롤만 쓰기
```

### 크레딧 흐름
```
1. 사용자 분석 요청
2. 캐시 확인
   ├─ 캐시 히트 → 무료 (credits_used = 0, was_cached = true)
   └─ 캐시 미스 → deduct_credits_safe() 호출 (5 크레딧 차감)
3. 분석 결과 저장
   ├─ youtube_analysis_history에 저장
   └─ youtube_analysis_cache에 저장 (24시간 TTL)
4. user_stats.youtube_analysis_count 자동 증가 (Trigger)
```

---

**이 지시서를 정확히 따라 실행하면 30분 내에 안전하게 DB 구축 완료됩니다.** 🚀
