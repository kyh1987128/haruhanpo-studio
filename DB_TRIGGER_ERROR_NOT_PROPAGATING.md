# 🚨 긴급: DB 트리거 에러 메시지 전달 안 됨

## 📋 현상

### 프론트엔드 에러:
```
Database error creating new user
```

### 백엔드 로그:
```
❌ Supabase 회원가입 실패: Mc [AuthApiError]: Database error creating new user
```

**문제**: DB 트리거의 실제 에러 메시지("탈퇴한 계정은 30일 후 재가입이 가능합니다")가 Supabase를 통해 전달되지 않음

---

## 🔍 DB 측 확인 요청

### 1️⃣ 트리거 실행 확인
```sql
-- 트리거가 실제로 발동하는지 확인
SELECT * FROM pg_stat_user_triggers 
WHERE schemaname = 'public' 
  AND tgname = 'before_user_signup_check_restriction';
```

### 2️⃣ email_restriction 테이블 확인
```sql
-- kyh1987_@naver.com 제한 상태 확인
SELECT 
  email,
  restriction_until,
  last_deletion_at,
  deletion_count,
  is_permanently_banned,
  restriction_until > NOW() as is_restricted
FROM email_restriction
WHERE email = 'kyh1987_@naver.com';
```

**예상 결과**:
- `restriction_until`: 2026-02-11 (30일 후)
- `is_restricted`: TRUE
- `deletion_count`: 1

### 3️⃣ 트리거 함수 재확인
```sql
-- check_email_restriction() 함수 내용 확인
SELECT pg_get_functiondef('public.check_email_restriction'::regproc);
```

**예상 내용**:
```sql
RAISE EXCEPTION '탈퇴한 계정은 30일 후 재가입이 가능합니다. (탈퇴일: %)', ...
```

### 4️⃣ 트리거 연결 확인
```sql
-- 트리거가 auth.users에 제대로 연결되어 있는지 확인
SELECT 
  tgname as trigger_name,
  tgtype as trigger_type,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as trigger_def
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND tgname LIKE '%restriction%';
```

---

## 💡 의심 사항

### A) 트리거가 아직 생성되지 않았음
```sql
-- 트리거 생성 확인
SELECT * FROM pg_trigger 
WHERE tgname = 'before_user_signup_check_restriction';
```

### B) 트리거가 비활성화됨
```sql
-- 트리거 활성화 상태 확인
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;
-- tgenabled: 'O' = 활성, 'D' = 비활성
```

### C) 에러 메시지가 Supabase에 의해 감춰짐
Supabase가 PostgreSQL EXCEPTION을 "Database error creating new user"로 변환할 수 있음

---

## 🔧 임시 해결책 제안

### 방법 1: 트리거를 BEFORE INSERT에서 다른 방식으로 변경

**현재 방식** (BEFORE INSERT 트리거):
```sql
CREATE TRIGGER before_user_signup_check_restriction
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION check_email_restriction();
```

**문제**: Supabase Auth가 이 에러를 감춤

**대안**: 함수를 백엔드에서 직접 호출
```typescript
// 백엔드에서 회원가입 전 체크
const { data: restriction } = await supabase
  .from('email_restriction')
  .select('*')
  .eq('email', email)
  .single();

if (restriction && restriction.restriction_until > new Date()) {
  return c.json({
    error: '탈퇴한 계정은 30일 후 재가입이 가능합니다',
    restriction_until: restriction.restriction_until
  }, 400);
}
```

---

## 🎯 질문

1. **트리거가 생성되어 있습니까?**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'before_user_signup_check_restriction';
   ```

2. **email_restriction 테이블에 kyh1987_@naver.com 레코드가 있습니까?**
   ```sql
   SELECT * FROM email_restriction WHERE email = 'kyh1987_@naver.com';
   ```

3. **트리거 함수가 제대로 생성되어 있습니까?**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'check_email_restriction';
   ```

---

## 📊 응답 형식

```
✅ 트리거 상태:
- 트리거 존재: YES/NO
- 트리거 활성화: YES/NO
- 함수 존재: YES/NO

✅ email_restriction 레코드:
- 존재 여부: YES/NO
- restriction_until: 2026-XX-XX
- is_restricted: TRUE/FALSE

✅ 발견된 문제:
(있다면 기록)

✅ 권장 조치:
(방법 1 적용 여부 등)
```

---

**우선순위**: 🔴 Critical
**예상 원인**: Supabase Auth가 PostgreSQL EXCEPTION을 감춤
**권장 해결책**: 백엔드에서 직접 email_restriction 테이블 체크
