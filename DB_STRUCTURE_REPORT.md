# 📊 하루한포 DB 구조 분석 리포트

## 🎯 현재 DB 구조

### 1. **크레딧 패키지 테이블: `credit_products`**

#### 테이블 구조 (추정)
```sql
CREATE TABLE credit_products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,           -- 'STARTER', 'PRO', 'BUSINESS' 등
  credits INTEGER NOT NULL,      -- 크레딧 개수
  price INTEGER NOT NULL,        -- 가격 (원화)
  discount_rate INTEGER,         -- 할인율 (%)
  description TEXT,              -- 설명
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,         -- 표시 순서
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### API 엔드포인트
- **조회**: `GET /api/products`
- **조건**: `is_active = true`
- **정렬**: `display_order`

#### 프론트엔드 위치
- **결제 페이지**: `/public/payment.html`
- **렌더링 방식**: 동적 생성 (JavaScript)

---

### 2. **사용자 크레딧 테이블: `users`**

#### 주요 컬럼
```sql
- id UUID PRIMARY KEY
- email TEXT UNIQUE
- free_credits INTEGER DEFAULT 5    -- 무료 크레딧
- paid_credits INTEGER DEFAULT 0    -- 유료 크레딧
- monthly_usage INTEGER DEFAULT 0   -- 월간 사용량
- monthly_limit INTEGER DEFAULT 10  -- 월간 제한
- credits INTEGER (deprecated?)     -- 구버전 호환용?
```

---

### 3. **크레딧 거래 내역: `credit_transactions`**

```sql
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- amount INTEGER                    -- 양수(충전)/음수(사용)
- balance_after INTEGER             -- 거래 후 잔액
- type TEXT                         -- 'purchase', 'use', 'reward' 등
- description TEXT
- created_at TIMESTAMP
```

---

## 🔄 크레딧 정책 변경 작업

### ✅ 방안 B 적용 내용

#### 기존 (추정)
```
STARTER    10개   ₩2,000    0%   ₩2,000
PRO        60개   ₩9,000   10%   ₩9,000
BUSINESS  100개  ₩17,000   15%  ₩17,000
```

#### 변경 후 (방안 B)
```
스타터         10개    ₩300      0%    ₩300
베이직         50개    ₩1,500    5%    ₩1,425
프로          100개    ₩3,000   10%    ₩2,700
비즈니스      500개   ₩15,000   15%   ₩12,750
엔터프라이즈 1,000개   ₩30,000   20%   ₩24,000
```

---

## 📝 다음 단계: DB 작업 지시사항

### 1️⃣ 테이블 확인 (필수)
```sql
-- Supabase Dashboard → SQL Editor에서 실행
SELECT * FROM credit_products;
```

### 2️⃣ 기존 데이터 백업
```sql
-- 백업 테이블 생성
CREATE TABLE credit_products_backup AS 
SELECT * FROM credit_products;
```

### 3️⃣ 데이터 업데이트 스크립트
```sql
-- 기존 데이터 삭제 (옵션)
DELETE FROM credit_products;

-- 새로운 데이터 삽입
INSERT INTO credit_products (name, credits, price, discount_rate, description, is_active, display_order)
VALUES
  ('스타터', 10, 300, 0, '🎯 시작하기 좋은 가격', true, 1),
  ('베이직', 50, 1425, 5, '🚀 가장 인기 있는 선택', true, 2),
  ('프로', 100, 2700, 10, '⭐ 프로를 위한 선택', true, 3),
  ('비즈니스', 500, 12750, 15, '💼 비즈니스 최적화', true, 4),
  ('엔터프라이즈', 1000, 24000, 20, '🏢 대량 사용자용', true, 5);
```

### 4️⃣ 검증 쿼리
```sql
-- 변경 사항 확인
SELECT 
  name,
  credits,
  price,
  discount_rate,
  price / credits as price_per_credit,
  is_active,
  display_order
FROM credit_products
ORDER BY display_order;
```

---

## 🚨 주의사항

1. **컬럼명 확인 필요**: 실제 테이블에 `discount_rate` 컬럼이 없을 수 있음
2. **할인가 계산**: 
   - 옵션 A: `price` 컬럼에 할인가 직접 저장
   - 옵션 B: `original_price`와 `discount_rate` 별도 저장
3. **표시 순서**: `display_order` 값 확인 필요

---

## 📊 현재 시스템 구조 요약

```
Frontend (payment.html)
  ↓ fetch('/api/products')
Backend (index.tsx)
  ↓ SELECT * FROM credit_products
Database (Supabase)
  ↓ return products
Frontend
  ↓ renderProducts()
User sees credit packages
```
