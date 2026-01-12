# 💳 크레딧 정책 변경 완벽 가이드 (방안 B)

## 📋 목차
1. [현재 상황 파악](#1-현재-상황-파악)
2. [DB 작업 실행](#2-db-작업-실행)
3. [프론트엔드 확인](#3-프론트엔드-확인)
4. [테스트](#4-테스트)
5. [롤백 방법](#5-롤백-방법)

---

## 1️⃣ 현재 상황 파악

### ✅ DB 구조 확인 완료

#### 테이블: `credit_products`
- **위치**: Supabase Database
- **API**: `GET /api/products`
- **프론트엔드**: `/public/payment.html`

#### 주요 컬럼 (예상)
```sql
- id (UUID)
- name (TEXT) - 패키지 이름
- credits (INTEGER) - 크레딧 개수
- price (INTEGER) - 가격
- discount_rate (INTEGER) - 할인율 (%)
- description (TEXT) - 설명
- is_active (BOOLEAN) - 활성화 여부
- display_order (INTEGER) - 표시 순서
```

---

## 2️⃣ DB 작업 실행

### 🎯 방법 1: Supabase Dashboard에서 실행 (추천)

#### Step 1: Supabase 로그인
1. https://supabase.com 접속
2. 프로젝트 선택 (하루한포)

#### Step 2: SQL Editor 열기
1. 좌측 메뉴 → **SQL Editor**
2. **New Query** 클릭

#### Step 3: SQL 스크립트 복사
```bash
# 터미널에서 SQL 파일 내용 확인
cat /home/user/webapp/credit-packages-update-v2.sql
```

#### Step 4: 실행
1. SQL 전체 복사 → SQL Editor에 붙여넣기
2. **RUN** 버튼 클릭
3. 결과 확인

### ⚠️ 주의사항
- **백업 자동 생성**: 스크립트가 자동으로 `credit_products_backup_v1` 생성
- **기존 데이터 삭제**: `TRUNCATE` 명령으로 기존 데이터 삭제
- **새 데이터 삽입**: 방안 B 패키지 5개 삽입

---

## 3️⃣ 프론트엔드 확인

### 📱 결제 페이지 확인

#### 접속 URL
```
https://your-project.pages.dev/payment.html
또는
http://localhost:3000/payment.html
```

#### 확인 사항
- [ ] 5개 패키지 표시 (스타터, 베이직, 프로, 비즈니스, 엔터프라이즈)
- [ ] 가격 정확성
  - 스타터: ₩300
  - 베이직: ₩1,425
  - 프로: ₩2,700
  - 비즈니스: ₩12,750
  - 엔터프라이즈: ₩24,000
- [ ] 할인율 표시 (5%, 10%, 15%, 20%)
- [ ] 개당 가격 계산 정확성

---

## 4️⃣ 테스트

### 🧪 테스트 체크리스트

#### 1. API 테스트
```bash
# 로컬 환경
curl http://localhost:3000/api/products | jq

# 프로덕션 환경
curl https://your-project.pages.dev/api/products | jq
```

**기대 결과:**
```json
{
  "success": true,
  "products": [
    {
      "name": "스타터",
      "credits": 10,
      "price": 300,
      "discount_rate": 0,
      "description": "🎯 시작하기 좋은 가격"
    },
    // ... 나머지 4개
  ]
}
```

#### 2. 프론트엔드 테스트
1. **결제 페이지 접속**
   - URL: `/payment.html`
   - 로딩 상태 확인

2. **패키지 카드 확인**
   - 5개 카드 정상 표시
   - 가격, 할인율, 설명 정확성

3. **결제 버튼 클릭**
   - 토스페이먼츠 모달 열림 (테스트 환경)
   - 금액 정확성 확인

#### 3. DB 직접 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT 
  name AS 패키지명,
  credits AS 크레딧,
  price AS 가격,
  discount_rate AS 할인율,
  ROUND((price::NUMERIC / credits::NUMERIC), 2) AS 개당가격
FROM credit_products
WHERE is_active = true
ORDER BY display_order;
```

---

## 5️⃣ 롤백 방법

### 🔙 문제 발생 시 즉시 복구

#### Step 1: 백업 데이터 확인
```sql
-- 백업 테이블 확인
SELECT * FROM credit_products_backup_v1;
```

#### Step 2: 롤백 실행
```sql
-- 현재 데이터 삭제
TRUNCATE TABLE credit_products;

-- 백업 데이터 복원
INSERT INTO credit_products
SELECT * FROM credit_products_backup_v1;

-- 확인
SELECT * FROM credit_products ORDER BY display_order;
```

---

## 📊 새로운 정책 요약 (방안 B)

| 패키지 | 크레딧 | 정가 | 할인율 | 최종가 | 개당가 |
|--------|--------|------|--------|--------|--------|
| 스타터 | 10개 | ₩300 | 0% | ₩300 | ₩30 |
| 베이직 | 50개 | ₩1,500 | 5% | ₩1,425 | ₩28.5 |
| 프로 | 100개 | ₩3,000 | 10% | ₩2,700 | ₩27 |
| 비즈니스 | 500개 | ₩15,000 | 15% | ₩12,750 | ₩25.5 |
| 엔터프라이즈 | 1,000개 | ₩30,000 | 20% | ₩24,000 | ₩24 |

### 💡 주요 변경점
1. **가격 인하**: 전반적으로 가격 대폭 인하
2. **할인율 단순화**: 5% 단위로 명확하게 구분
3. **대량 구매 혜택**: 엔터프라이즈 20% 할인으로 매력 증가

---

## ✅ 작업 완료 체크리스트

### DB 작업
- [ ] SQL 스크립트 실행 완료
- [ ] 5개 패키지 정상 삽입 확인
- [ ] 백업 테이블 생성 확인

### 프론트엔드
- [ ] `/payment.html` 페이지 정상 표시
- [ ] 가격 정확성 확인
- [ ] 할인율 표시 확인

### API
- [ ] `GET /api/products` 정상 응답
- [ ] 데이터 구조 확인
- [ ] 정렬 순서 확인

### 테스트
- [ ] 로컬 환경 테스트 완료
- [ ] 프로덕션 환경 배포 완료
- [ ] 실제 결제 플로우 테스트 (선택)

---

## 🆘 문제 해결

### Q1: 테이블이 없다는 오류
**해결**: SQL 스크립트가 자동으로 테이블 생성함 (`CREATE TABLE IF NOT EXISTS`)

### Q2: 컬럼명이 다르다는 오류
**해결**: 
1. 실제 테이블 구조 확인: `SELECT * FROM credit_products LIMIT 1;`
2. 컬럼명 맞춰서 SQL 수정

### Q3: 프론트엔드에 데이터가 안 보임
**해결**:
1. API 응답 확인: `curl /api/products`
2. 브라우저 콘솔 확인
3. `is_active = true` 확인

### Q4: 가격이 이상하게 표시됨
**해결**:
1. DB 데이터 확인
2. `price` vs `original_price` 컬럼 확인
3. 프론트엔드 로직 확인 (`payment.html`)

---

## 📞 지원

문제 발생 시:
1. **DB 백업 확인**: `SELECT * FROM credit_products_backup_v1;`
2. **롤백 실행**: 위 "롤백 방법" 참고
3. **로그 확인**: Supabase Dashboard → Logs
4. **API 테스트**: `curl /api/products`

---

**작성일**: 2026-01-11  
**버전**: v2.0 (방안 B)  
**상태**: 준비 완료 ✅
