# 🗄️ DB 담당 AI - Supabase 마이그레이션 가이드

## 📋 작업 개요

**목적:** 이미지 배치 시스템 + 플랫폼별 날짜 관리 기능 추가  
**영향 테이블:** `generations`  
**작업 시간:** 약 5-10분  
**위험도:** 🟢 낮음 (기존 데이터 보존, NULL 허용 컬럼)

---

## 🎯 추가될 기능

### 1️⃣ **이미지 정보 저장 (`images` 컬럼)**
- **데이터 타입:** `JSONB`
- **목적:** 콘텐츠 생성 시 사용된 이미지 정보 저장
- **구조:**
```json
[
  {
    "url": "https://images.unsplash.com/photo-...",
    "source": "unsplash",
    "alt": "마산 어시장 전경",
    "caption": "신선한 해산물이 가득한 전통 시장",
    "author": "John Doe"
  },
  {
    "url": "https://images.pexels.com/photos/...",
    "source": "pexels",
    "alt": "해산물 요리",
    "caption": "현지 맛집의 대표 메뉴"
  }
]
```

### 2️⃣ **플랫폼별 날짜 저장 (`platform_scheduled_dates` 컬럼)**
- **데이터 타입:** `JSONB`
- **목적:** 각 플랫폼마다 다른 발행 예정일 설정
- **구조:**
```json
{
  "blog": "2026-01-21T10:00:00.000Z",
  "youtube_longform": "2026-01-21T10:00:00.000Z",
  "youtube_shorts": "2026-01-21T10:00:00.000Z",
  "tiktok": "2026-01-19T15:00:00.000Z",
  "instagram": "2026-01-19T15:00:00.000Z"
}
```

---

## ✅ 사전 확인 사항

### **1. 현재 데이터 상태 확인**
```sql
-- 1) generations 테이블 존재 확인
SELECT COUNT(*) as total_records FROM generations;

-- 2) 현재 컬럼 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'generations'
ORDER BY ordinal_position;

-- 3) scheduled_date 사용 현황 확인
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as with_scheduled_date,
  COUNT(CASE WHEN platforms IS NOT NULL THEN 1 END) as with_platforms
FROM generations;
```

**예상 결과:**
- `total_records`: 실제 콘텐츠 생성 건수 (예: 150)
- `with_scheduled_date`: 캘린더에 등록된 건수 (예: 45)
- `with_platforms`: 플랫폼 정보가 있는 건수 (예: 150)

---

## 🔧 마이그레이션 실행

### **Step 1: 백업 (선택사항, 권장)**
```sql
-- generations 테이블 백업 생성
CREATE TABLE generations_backup_20260114 AS 
SELECT * FROM generations;

-- 백업 확인
SELECT COUNT(*) FROM generations_backup_20260114;
```

### **Step 2: 컬럼 추가**
```sql
-- 새 컬럼 추가 (NULL 허용으로 안전하게)
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS platform_scheduled_dates JSONB DEFAULT NULL;
```

**⚠️ 예상 실행 시간:** 1-3초 (데이터 양에 따라 다름)  
**⚠️ 주의사항:** `IF NOT EXISTS` 사용으로 이미 존재하면 스킵

### **Step 3: 인덱스 생성**
```sql
-- JSONB 컬럼에 대한 GIN 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generations_images 
ON generations USING GIN (images);

CREATE INDEX IF NOT EXISTS idx_generations_platform_scheduled_dates
ON generations USING GIN (platform_scheduled_dates);
```

**⚠️ 예상 실행 시간:** 2-5초  
**📌 목적:** JSONB 쿼리 성능 최적화 (이미지 소스별 검색, 플랫폼별 날짜 조회)

### **Step 4: 기존 데이터 마이그레이션**
```sql
-- scheduled_date를 platform_scheduled_dates로 복사
UPDATE generations
SET platform_scheduled_dates = (
  SELECT jsonb_object_agg(platform, scheduled_date)
  FROM unnest(platforms) AS platform
)
WHERE scheduled_date IS NOT NULL
  AND platforms IS NOT NULL
  AND array_length(platforms, 1) > 0
  AND platform_scheduled_dates IS NULL;
```

**⚠️ 예상 실행 시간:** 1-5초  
**📌 로직 설명:**
- `scheduled_date`가 있는 모든 레코드에 대해
- 각 플랫폼에 동일한 날짜를 매핑하여
- `platform_scheduled_dates` JSONB 객체 생성

**예시:**
```
BEFORE:
  platforms: ['blog', 'youtube_longform', 'tiktok']
  scheduled_date: '2026-01-21T10:00:00Z'

AFTER:
  platform_scheduled_dates: {
    "blog": "2026-01-21T10:00:00Z",
    "youtube_longform": "2026-01-21T10:00:00Z",
    "tiktok": "2026-01-21T10:00:00Z"
  }
```

---

## 🧪 검증 단계

### **검증 1: 마이그레이션 성공 확인**
```sql
SELECT 
  COUNT(*) as total_generations,
  COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as with_scheduled_date,
  COUNT(CASE WHEN platform_scheduled_dates IS NOT NULL THEN 1 END) as with_platform_dates,
  COUNT(CASE WHEN images IS NOT NULL THEN 1 END) as with_images
FROM generations;
```

**예상 결과:**
| 컬럼 | 값 | 의미 |
|------|-----|------|
| total_generations | 150 | 전체 콘텐츠 수 |
| with_scheduled_date | 45 | 기존 날짜가 있던 콘텐츠 |
| with_platform_dates | 45 | 마이그레이션된 플랫폼별 날짜 |
| with_images | 0 | 신규 생성부터 채워짐 |

✅ **성공 조건:** `with_scheduled_date` == `with_platform_dates`

### **검증 2: 샘플 데이터 확인**
```sql
SELECT 
  id,
  platforms,
  scheduled_date,
  platform_scheduled_dates,
  images,
  created_at
FROM generations
WHERE scheduled_date IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**예상 출력:**
```
id: 550e8400-e29b-41d4-a716-446655440000
platforms: ['blog', 'youtube_longform']
scheduled_date: 2026-01-21T10:00:00.000Z
platform_scheduled_dates: {
  "blog": "2026-01-21T10:00:00.000Z",
  "youtube_longform": "2026-01-21T10:00:00.000Z"
}
images: null
created_at: 2026-01-14T06:30:00.000Z
```

### **검증 3: 인덱스 생성 확인**
```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'generations'
  AND (indexname LIKE '%images%' OR indexname LIKE '%platform_scheduled%')
ORDER BY indexname;
```

**예상 결과:**
```
idx_generations_images
idx_generations_platform_scheduled_dates
```

---

## 🔄 롤백 가이드 (문제 발생 시)

### **롤백 Step 1: 백업으로 복원**
```sql
-- 백업을 생성했다면
DROP TABLE generations;
ALTER TABLE generations_backup_20260114 RENAME TO generations;
```

### **롤백 Step 2: 컬럼만 제거**
```sql
-- 백업 없이 컬럼만 제거
ALTER TABLE generations 
DROP COLUMN IF EXISTS images,
DROP COLUMN IF EXISTS platform_scheduled_dates;

-- 인덱스 제거
DROP INDEX IF EXISTS idx_generations_images;
DROP INDEX IF EXISTS idx_generations_platform_scheduled_dates;
```

---

## 📊 영향 분석

### **백엔드 API 변경 사항**

#### **1. `/api/generate` (POST) - 콘텐츠 생성**
```typescript
// BEFORE (v8.x):
{
  success: true,
  data: {...},
  generatedPlatforms: [...]
}

// AFTER (v9.0):
{
  success: true,
  id: "uuid",                    // ✅ NEW
  generation_id: "uuid",          // ✅ NEW
  created_at: "2026-01-14T...",  // ✅ NEW
  images: [                       // ✅ NEW
    {
      url: "...",
      source: "unsplash",
      alt: "...",
      caption: "..."
    }
  ],
  data: {...},
  generatedPlatforms: [...]
}
```

#### **2. `/api/schedule-content` (POST) - 캘린더 등록**
```typescript
// BEFORE (v8.x):
{
  generation_id: "uuid",
  user_id: "uuid",
  scheduled_date: "2026-01-21T10:00:00Z",
  publish_status: "scheduled"
}

// AFTER (v9.0 - 호환성 유지):
{
  generation_id: "uuid",
  user_id: "uuid",
  scheduled_date: "2026-01-21T10:00:00Z",  // 여전히 사용
  publish_status: "scheduled"
}

// v9.1+ (플랫폼별 날짜 기능 추가 시):
{
  generation_id: "uuid",
  user_id: "uuid",
  platform: "blog",                         // ✅ NEW
  scheduled_date: "2026-01-21T10:00:00Z",   // 플랫폼별 날짜
  publish_status: "scheduled"
}
```

### **프론트엔드 변경 사항**

#### **1. 콘텐츠 생성 직후 날짜 표시**
```javascript
// BEFORE:
displayResults(result.data, result.generatedPlatforms);

// AFTER:
displayResults(result.data, result.generatedPlatforms, {
  createdAt: result.created_at,
  scheduledDate: null,
  images: result.images
});
```

#### **2. 중복 저장 방지**
```javascript
// BEFORE:
saveToHistory(formData, result.data);  // 항상 저장

// AFTER:
if (result.id) {
  console.log('백엔드에서 저장 완료, 중복 저장 스킵');
} else {
  saveToHistory(formData, result.data);  // 실패 시만 저장
}
```

---

## ⚠️ 주의사항

### **1. 데이터 일관성**
- ✅ `scheduled_date`는 **계속 유지**됩니다 (하위 호환성)
- ✅ `platform_scheduled_dates`는 **추가 정보**입니다
- ✅ 두 컬럼 모두 NULL 허용으로 안전합니다

### **2. 성능 영향**
- ✅ 인덱스 생성으로 JSONB 쿼리 최적화
- ✅ 기존 쿼리 성능 저하 없음
- ✅ 데이터 마이그레이션은 한 번만 실행

### **3. 앱 버전 호환성**
- ✅ v8.x 프론트: 정상 작동 (새 필드 무시)
- ✅ v9.0 프론트: 새 기능 활용
- ✅ 점진적 업그레이드 가능

---

## 📝 실행 체크리스트

### **마이그레이션 전**
- [ ] 현재 데이터 상태 확인 (`SELECT COUNT(*) FROM generations`)
- [ ] 백업 생성 (선택사항, 권장)
- [ ] Supabase Dashboard → SQL Editor 열기

### **마이그레이션 실행**
- [ ] Step 2: 컬럼 추가 실행
- [ ] Step 3: 인덱스 생성 실행
- [ ] Step 4: 기존 데이터 마이그레이션 실행

### **검증**
- [ ] 검증 1: 마이그레이션 성공 확인
- [ ] 검증 2: 샘플 데이터 확인
- [ ] 검증 3: 인덱스 생성 확인

### **앱 배포**
- [ ] 프론트엔드 AI: v9.0 배포 확인
- [ ] 백엔드 AI: v9.0 배포 확인
- [ ] 통합 테스트 실행

---

## 🚀 전체 마이그레이션 스크립트 (복사용)

```sql
-- ====================================
-- 마케팅허브 DB 스키마 통합 확장
-- ====================================
-- 목적: 이미지 정보 + 플랫폼별 날짜 추가
-- 작성일: 2026-01-14
-- 예상 실행 시간: 5-10초

-- 1단계: 컬럼 추가
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS platform_scheduled_dates JSONB DEFAULT NULL;

-- 2단계: 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generations_images 
ON generations USING GIN (images);

CREATE INDEX IF NOT EXISTS idx_generations_platform_scheduled_dates
ON generations USING GIN (platform_scheduled_dates);

-- 3단계: 기존 데이터 마이그레이션
UPDATE generations
SET platform_scheduled_dates = (
  SELECT jsonb_object_agg(platform, scheduled_date)
  FROM unnest(platforms) AS platform
)
WHERE scheduled_date IS NOT NULL
  AND platforms IS NOT NULL
  AND array_length(platforms, 1) > 0
  AND platform_scheduled_dates IS NULL;

-- 4단계: 검증
SELECT 
  COUNT(*) as total_generations,
  COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as with_scheduled_date,
  COUNT(CASE WHEN platform_scheduled_dates IS NOT NULL THEN 1 END) as with_platform_dates,
  COUNT(CASE WHEN images IS NOT NULL THEN 1 END) as with_images
FROM generations;

-- 5단계: 샘플 확인
SELECT 
  id,
  platforms,
  scheduled_date,
  platform_scheduled_dates,
  images,
  created_at
FROM generations
ORDER BY created_at DESC
LIMIT 5;
```

---

## 💬 문의 및 지원

**마이그레이션 중 문제 발생 시:**
1. 즉시 실행 중단
2. 에러 메시지 전체 복사
3. 현재 데이터 상태 확인 쿼리 실행
4. 웹빌더 AI에게 보고

**예상 에러:**
- `column "images" already exists` → 이미 추가됨, 무시 가능
- `relation "idx_generations_images" already exists` → 이미 생성됨, 무시 가능

---

## ✅ 마이그레이션 완료 보고 양식

```
DB 담당 AI → 웹빌더 AI

제목: [완료] generations 테이블 마이그레이션
일시: 2026-01-14 오후 3시

실행 결과:
- Step 2 (컬럼 추가): ✅ 성공
- Step 3 (인덱스 생성): ✅ 성공
- Step 4 (데이터 마이그레이션): ✅ 성공 (45건 처리)

검증 결과:
- total_generations: 150
- with_scheduled_date: 45
- with_platform_dates: 45
- with_images: 0

상태: ✅ 정상 완료
다음 단계: 프론트/백엔드 v9.0 배포 가능
```

---

**파일 위치:**
- 상세 스크립트: `/home/user/webapp/migrations/001_add_images_and_platform_dates.sql`
- 간편 스크립트: `/home/user/webapp/migrations/RUN_THIS_IN_SUPABASE.sql`
- 이 가이드: `/home/user/webapp/DB_MIGRATION_GUIDE.md`
