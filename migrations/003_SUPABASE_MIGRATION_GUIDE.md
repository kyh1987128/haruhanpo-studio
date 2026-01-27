# 🗄️ Supabase Migration 003: 즐겨찾기 채널 관리

## 📋 **실행 방법**

### **Option 1: Supabase SQL Editor (추천)**
1. Supabase Dashboard 접속: https://supabase.com/dashboard/project/gmjbsndricdogtqsovnb
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. **New Query** 클릭
4. `003_add_favorite_channels.sql` 파일 내용 복사 & 붙여넣기
5. **Run** 버튼 클릭

### **Option 2: Wrangler CLI (로컬 개발)**
```bash
# D1 데이터베이스용 (현재 사용 안 함)
# npx wrangler d1 migrations apply webapp-production --local
```

---

## 📊 **생성되는 테이블**

### **1. favorite_channels**
사용자의 즐겨찾기 채널 목록
- `id`: UUID (Primary Key)
- `user_id`: UUID (FK to auth.users)
- `channel_id`: TEXT (YouTube 채널 ID)
- `channel_name`: TEXT
- `channel_description`: TEXT
- `channel_thumbnail`: TEXT
- `subscriber_count`: BIGINT
- `total_videos`: INTEGER
- `total_views`: BIGINT
- `added_at`: TIMESTAMP
- `last_updated`: TIMESTAMP

### **2. channel_snapshots**
채널 데이터 스냅샷 (시계열)
- `id`: UUID (Primary Key)
- `channel_id`: TEXT
- `snapshot_date`: DATE (매일 1개씩 저장)
- `subscriber_count`: BIGINT
- `total_videos`: INTEGER
- `total_views`: BIGINT
- `recent_video_avg_views`: BIGINT
- `created_at`: TIMESTAMP

---

## 🔒 **RLS (Row Level Security) 정책**

### **favorite_channels**
- ✅ 사용자는 **자신의 즐겨찾기만** 조회/추가/수정/삭제 가능
- ❌ 다른 사용자의 즐겨찾기는 접근 불가

### **channel_snapshots**
- ✅ 모든 인증된 사용자는 **조회 가능**
- ❌ 삽입/수정/삭제는 **service_role만** 가능 (서버 측 API에서만)

---

## 🚀 **자동화 기능**

### **1. 트리거: create_initial_snapshot**
- 채널 추가 시 **첫 스냅샷 자동 생성**
- `favorite_channels` INSERT → `channel_snapshots` INSERT

### **2. 뷰: channel_growth_stats**
- 채널별 **7일/30일 증가율 자동 계산**
- 프론트엔드에서 바로 조회 가능

---

## ✅ **마이그레이션 확인**

실행 후 다음 쿼리로 확인:
```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('favorite_channels', 'channel_snapshots');

-- RLS 정책 확인
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('favorite_channels', 'channel_snapshots');

-- 트리거 확인
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_initial_snapshot';
```

---

## 📝 **다음 단계**
1. ✅ 마이그레이션 실행
2. 🔄 백엔드 API 구현 (`/api/channels/favorite`, `/api/channels/snapshots`)
3. 🎨 프론트엔드 UI 구현 (내 채널 관리 탭)

---

**실행 완료 후 이 문서에 체크 표시해주세요**: ⬜ → ✅
