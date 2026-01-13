# Supabase Functions - 배포 가이드

## 📌 개요
이 디렉토리에는 Supabase에 배포해야 하는 PostgreSQL 함수들이 포함되어 있습니다.

---

## 🔒 deduct_credits_safe.sql
**안전한 크레딧 차감 함수 (트랜잭션)**

### 기능
- 멀티탭/동시 요청 시에도 크레딧이 정확하게 차감되도록 보장
- PostgreSQL의 **FOR UPDATE**를 사용하여 행 잠금(Row Locking) 구현
- Race Condition 완전 방지
- 무료 크레딧 우선 차감 로직

### 배포 방법

#### 방법 1: Supabase Dashboard (권장)
1. **Supabase Dashboard** 접속
   - 프로젝트 선택: https://supabase.com/dashboard
2. **SQL Editor** 이동
   - 좌측 메뉴에서 **SQL Editor** 클릭
3. **New Query** 클릭
4. `deduct_credits_safe.sql` 파일의 내용을 **복사**하여 붙여넣기
5. **Run** 버튼 클릭 (또는 `Ctrl+Enter`)
6. 성공 메시지 확인: `Success. No rows returned`

#### 방법 2: Supabase CLI (개발 환경)
```bash
# Supabase CLI 설치 (한 번만 실행)
npm install -g supabase

# 프로젝트 연결
supabase link --project-ref <YOUR_PROJECT_REF>

# SQL 파일 실행
supabase db push --file supabase-functions/deduct_credits_safe.sql
```

### 사용 예시
```sql
-- 크레딧 차감 (10 크레딧)
SELECT deduct_credits_safe('user-uuid-here', 10);

-- 반환 예시:
-- {
--   "success": true,
--   "free_credits": 15,
--   "paid_credits": 0,
--   "total_remaining": 15,
--   "deducted_from_free": 10,
--   "deducted_from_paid": 0
-- }
```

### 에러 처리
```sql
-- 크레딧 부족 시
-- ERROR: Insufficient credits. Required: 10, Available: 5

-- 사용자 없음
-- ERROR: User not found: <user-uuid>
```

---

## 🧪 테스트 방법

### 1. 수동 테스트 (SQL Editor)
```sql
-- 1. 테스트 사용자 조회
SELECT id, email, free_credits, paid_credits 
FROM users 
WHERE email = 'test@example.com';

-- 2. 크레딧 차감 테스트
SELECT deduct_credits_safe(
  'user-uuid-here',  -- 위에서 조회한 사용자 ID
  5                  -- 차감할 크레딧
);

-- 3. 결과 확인
SELECT free_credits, paid_credits 
FROM users 
WHERE id = 'user-uuid-here';
```

### 2. 동시성 테스트 (멀티탭 시뮬레이션)
```sql
-- 두 개의 SQL Editor 창을 열고 동시에 실행
-- 창 1:
BEGIN;
SELECT deduct_credits_safe('user-uuid', 10);
COMMIT;

-- 창 2: (동시에 실행)
BEGIN;
SELECT deduct_credits_safe('user-uuid', 10);
COMMIT;

-- 결과: 정확히 20 크레딧 차감 (중복 없음)
```

---

## ⚠️ 주의사항

1. **배포 필수**: 
   - 이 함수를 배포하지 않으면 백엔드 API가 작동하지 않습니다
   - 에러: `function deduct_credits_safe does not exist`

2. **권한 설정**:
   - 기본적으로 `authenticated` 사용자에게 실행 권한이 부여됩니다
   - 필요시 추가 권한 설정:
   ```sql
   GRANT EXECUTE ON FUNCTION deduct_credits_safe(UUID, INTEGER) TO authenticated;
   ```

3. **롤백 불가**:
   - 크레딧 차감은 트랜잭션으로 처리되어 중간에 취소할 수 없습니다
   - 신중하게 사용하세요

4. **로그 확인**:
   - 모든 크레딧 차감은 `credit_transactions` 테이블에 기록됩니다
   ```sql
   SELECT * FROM credit_transactions 
   WHERE user_id = 'user-uuid' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## 🔄 업데이트 방법

함수를 수정한 경우:

1. `deduct_credits_safe.sql` 파일 수정
2. **배포 방법 1 또는 2** 재실행
   - `CREATE OR REPLACE FUNCTION`이므로 기존 함수를 덮어씁니다
3. 백엔드 API 재시작 (필요시)

---

## 📚 참고 자료

- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL FOR UPDATE](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)

---

## 🆘 문제 해결

### 함수가 작동하지 않음
```sql
-- 함수 존재 확인
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'deduct_credits_safe';

-- 함수 삭제 후 재배포
DROP FUNCTION IF EXISTS deduct_credits_safe(UUID, INTEGER);
-- 그 다음 deduct_credits_safe.sql 내용 실행
```

### 권한 오류
```sql
-- 권한 확인
SELECT * FROM information_schema.routine_privileges 
WHERE routine_name = 'deduct_credits_safe';

-- 권한 부여
GRANT EXECUTE ON FUNCTION deduct_credits_safe(UUID, INTEGER) TO authenticated;
```

---

**배포 완료 체크리스트:**
- [ ] Supabase Dashboard에서 SQL 실행
- [ ] 성공 메시지 확인
- [ ] 테스트 사용자로 함수 호출 테스트
- [ ] 백엔드 API 재시작
- [ ] 프론트엔드에서 콘텐츠 생성 테스트
