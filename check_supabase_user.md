# Supabase 사용자 확인 방법

## 1. Supabase Dashboard에서 확인

### Auth > Users 탭
https://supabase.com/dashboard/project/gmjbsndricdogtqsovnb/auth/users

여기서 다음 정보 확인 가능:
- User ID (UUID)
- Email
- Provider (google, github 등)
- Created At
- Last Sign In

---

## 2. 데이터베이스 테이블 구조

### auth.users (Supabase 기본 테이블)
```sql
SELECT 
  id,
  email,
  raw_user_meta_data,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'your-email@gmail.com';
```

### public.users (우리 앱의 커스텀 테이블)
```sql
SELECT 
  id,
  email,
  name,
  credits,
  subscription_status,
  created_at
FROM public.users
WHERE id = 'user-uuid-from-auth-users';
```

---

## 3. 문제 진단

현재 에러: "사용자를 찾을 수 없습니다"

### 원인 가능성:
1. auth.users에는 존재하지만 public.users에 없음
2. 백엔드의 syncUserToBackend 함수가 실패
3. user_id가 제대로 전달되지 않음

### 해결책:
1. Supabase Dashboard에서 auth.users 확인
2. public.users에 해당 사용자가 있는지 확인
3. 백엔드 로그에서 syncUserToBackend 에러 확인
