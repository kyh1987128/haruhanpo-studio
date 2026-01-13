# DB 담당 AI에게 전달할 전체 작업 내용 요약

## 📋 **빠른 시작 가이드**

### **1단계: 문서 읽기** (5분)
```
/home/user/webapp/DB_TASK_LIST_FOR_AI.md
```
- 전체 DB 작업 개요
- Phase 1 + Phase 3 상세 설명
- 테스트 쿼리 모음

### **2단계: SQL 실행** (2.5시간)

#### **Phase 1 실행** (30분) ⭐ 최우선
```sql
-- 파일 위치: /home/user/webapp/db-migrations/phase1-workflow-enhancement.sql
-- Supabase Dashboard → SQL Editor → 파일 내용 복사 → RUN
```

**실행 내용:**
- users 테이블 확장: `my_sns_links`, `my_ai_tools` 컬럼 추가
- generations 테이블 확장: `workflow_data`, `platform_contents`, `used_images` 컬럼 추가
- GIN 인덱스 6개 생성

#### **Phase 3 실행** (2시간)
```sql
-- 파일 위치: /home/user/webapp/db-migrations/phase3-community-system.sql
-- Supabase Dashboard → SQL Editor → 파일 내용 복사 → RUN
```

**실행 내용:**
- 6개 테이블 생성 (community_posts, community_comments, community_likes, community_bookmarks, community_reports, prompt_quality_ratings)
- Full-text search 트리거 (한글 검색)
- PQI 자동 계산 함수
- 통계 자동 업데이트 트리거 3개
- RLS 정책 6개 테이블

### **3단계: 테스트** (30분)
```sql
-- users 테이블 확장 확인
SELECT id, email, my_sns_links, my_ai_tools FROM users LIMIT 1;

-- generations 테이블 확장 확인
SELECT id, user_id, workflow_data, platform_contents, used_images FROM generations LIMIT 1;

-- 커뮤니티 게시글 확인
SELECT * FROM community_posts ORDER BY created_at DESC LIMIT 5;

-- 검색 테스트
SELECT * FROM community_posts
WHERE search_vector @@ to_tsquery('korean', '마케팅 | AI');
```

---

## 📂 **전달 파일 목록**

### **1. DB_TASK_LIST_FOR_AI.md** (21KB)
**경로**: `/home/user/webapp/DB_TASK_LIST_FOR_AI.md`

**내용:**
- 전체 작업 개요 (Phase 1 + Phase 3)
- 테이블 구조 상세 설명
- 데이터 구조 예시 (JSON 샘플)
- 인덱스 설명
- 트리거 및 함수 설명
- RLS 정책
- 테스트 쿼리
- 주의사항

### **2. phase1-workflow-enhancement.sql** (6KB)
**경로**: `/home/user/webapp/db-migrations/phase1-workflow-enhancement.sql`

**내용:**
```sql
-- users 테이블 확장
ALTER TABLE users ADD COLUMN my_sns_links JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN my_ai_tools JSONB DEFAULT '{}';

-- generations 테이블 확장
ALTER TABLE generations ADD COLUMN workflow_data JSONB DEFAULT '{}';
ALTER TABLE generations ADD COLUMN platform_contents JSONB DEFAULT '{}';
ALTER TABLE generations ADD COLUMN used_images JSONB DEFAULT '[]';

-- GIN 인덱스 6개
CREATE INDEX idx_users_sns_links ON users USING GIN (my_sns_links);
CREATE INDEX idx_users_ai_tools ON users USING GIN (my_ai_tools);
CREATE INDEX idx_generations_workflow ON generations USING GIN (workflow_data);
CREATE INDEX idx_generations_platform_contents ON generations USING GIN (platform_contents);
CREATE INDEX idx_generations_images ON generations USING GIN (used_images);
```

### **3. phase3-community-system.sql** (17KB)
**경로**: `/home/user/webapp/db-migrations/phase3-community-system.sql`

**내용:**
```sql
-- 6개 테이블 생성
CREATE TABLE community_posts (...);
CREATE TABLE community_comments (...);
CREATE TABLE community_likes (...);
CREATE TABLE community_bookmarks (...);
CREATE TABLE community_reports (...);
CREATE TABLE prompt_quality_ratings (...);

-- Full-text search 트리거
CREATE FUNCTION update_post_search_vector() ...
CREATE TRIGGER tsvector_update ...

-- PQI 자동 계산 함수
CREATE FUNCTION calculate_pqi_score(UUID) ...
CREATE TRIGGER pqi_recalculate_on_rating ...

-- 통계 자동 업데이트
CREATE FUNCTION update_post_statistics() ...
CREATE TRIGGER update_post_comment_count ...
CREATE TRIGGER update_post_like_count ...
CREATE TRIGGER update_post_bookmark_count ...

-- RLS 정책 (6개 테이블)
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone" ...
(총 15개 정책)
```

---

## 🎯 **작업 우선순위**

### **즉시 실행** ⭐⭐⭐
**Phase 1: 워크플로우 혁신 (30분)**
- users + generations 테이블 확장
- 이미지 스마트 배치 시스템 (v8.3) 완벽 지원
- 프론트엔드 즉시 연동 가능

### **Phase 1 완료 후 진행**
**Phase 3: 커뮤니티 시스템 (2시간)**
- 4개 게시판 (자유/질문/프롬프트/템플릿)
- PQI 평가 시스템
- 댓글, 좋아요, 북마크, 신고 기능

---

## 📊 **데이터 구조 핵심 예시**

### **Phase 1: users.my_sns_links**
```json
{
  "instagram": "https://instagram.com/username",
  "blog": "https://blog.naver.com/username",
  "youtube": "https://youtube.com/@username",
  "brunch": "https://brunch.co.kr/@username",
  "tiktok": "https://tiktok.com/@username"
}
```

### **Phase 1: generations.used_images**
```json
[
  {
    "url": "https://blob.storage/img1.jpg",
    "source": "user_upload",
    "alt": "마산 어시장 전경",
    "caption": "활기찬 어시장의 모습",
    "position": 1,
    "platforms": ["blog", "brunch"]
  },
  {
    "url": "https://images.unsplash.com/photo-123",
    "source": "unsplash",
    "alt": "신선한 해산물",
    "caption": "다양한 수산물들",
    "position": 2,
    "platforms": ["blog", "instagram"]
  }
]
```

### **Phase 3: community_posts (프롬프트 공유)**
```sql
board_type: 'prompt_share'
title: '네이버 블로그 최적화 프롬프트'
content: '네이버 블로그에 최적화된 프롬프트입니다...'
prompt_text: '다음 키워드를 포함한 블로그 포스트를 작성해주세요: [키워드]...'
prompt_metadata: {"platform": "blog", "tone": "informative", "length": "2000"}
pqi_score: 4.75 (자동 계산)
download_count: 125
```

### **Phase 3: prompt_quality_ratings (PQI 평가)**
```json
{
  "rating": 4.75,
  "dimensions": {
    "clarity": 4.5,        // 명확성
    "completeness": 4.0,   // 완전성
    "creativity": 4.8,     // 창의성
    "effectiveness": 4.2,  // 효과성
    "reusability": 4.6     // 재사용성
  },
  "comment": "정말 유용한 프롬프트입니다!"
}
```

---

## ✅ **실행 체크리스트**

### **Phase 1** (30분)
- [ ] `phase1-workflow-enhancement.sql` 파일 읽기
- [ ] Supabase SQL Editor에서 실행
- [ ] users 테이블 확장 확인
- [ ] generations 테이블 확장 확인
- [ ] GIN 인덱스 6개 생성 확인
- [ ] 샘플 데이터 업데이트 확인
- [ ] 웹 빌더 AI에게 완료 보고

### **Phase 3** (2시간)
- [ ] `phase3-community-system.sql` 파일 읽기
- [ ] Supabase SQL Editor에서 실행
- [ ] 6개 테이블 생성 확인
- [ ] 트리거 4개 생성 확인
- [ ] 함수 3개 생성 확인
- [ ] RLS 정책 15개 확인
- [ ] 샘플 게시글 2개 확인
- [ ] 검색 기능 테스트
- [ ] PQI 계산 함수 테스트
- [ ] 웹 빌더 AI에게 완료 보고

---

## 🚨 **주의사항**

### **1. JSONB 컬럼**
- `my_sns_links`, `my_ai_tools`, `workflow_data` 등은 모두 JSONB 타입
- GIN 인덱스로 검색 성능 최적화
- JSON 구조는 프론트엔드와 사전 합의 필요

### **2. Full-text Search**
- PostgreSQL의 한글 검색 지원 (`korean` dictionary)
- `search_vector` 컬럼 자동 업데이트 트리거
- 검색 시 `to_tsquery('korean', '검색어')` 사용

### **3. PQI 시스템**
- 5가지 평가 차원: 명확성, 완전성, 창의성, 효과성, 재사용성
- 다운로드 횟수에 따른 가중치 (20회: 1.02x, 50회: 1.05x, 100회: 1.10x)
- 자동 재계산 트리거

### **4. 통계 자동 업데이트**
- `like_count`, `comment_count`, `bookmark_count` 등은 트리거로 자동 업데이트
- 수동 업데이트 불필요
- `GREATEST(0, count - 1)` 로 음수 방지

### **5. 소프트 삭제**
- `is_deleted = TRUE`로 논리적 삭제
- 실제 데이터는 유지 (복구 가능)
- 조회 시 `WHERE is_deleted = FALSE` 필수

---

## 📞 **문의 및 협업**

### **DB 작업 완료 후 보고**
```
Phase 1 완료 보고:
✅ users 테이블 확장 완료
✅ generations 테이블 확장 완료
✅ 인덱스 6개 생성 완료
✅ 샘플 데이터 테스트 완료

Phase 3 완료 보고:
✅ 6개 테이블 생성 완료
✅ 트리거 4개, 함수 3개 생성 완료
✅ RLS 정책 15개 생성 완료
✅ 검색 및 PQI 테스트 완료
```

### **에러 발생 시 전달 정보**
1. 에러 메시지 전체 복사
2. 실행한 SQL 스크립트
3. 현재 테이블 구조 (`\d table_name`)
4. PostgreSQL 버전

---

## 🎉 **최종 목표**

### **Phase 1 완료 시**
- 마케팅허브 v8.3 (이미지 스마트 배치) 완벽 지원
- 워크플로우 데이터 저장 및 조회 가능
- 사용자 SNS 링크 관리 가능

### **Phase 3 완료 시**
- 4개 게시판 운영 가능
- 프롬프트 공유 및 PQI 평가 시스템 가동
- 커뮤니티 기능 완전 활성화

---

**작성일**: 2026-01-13  
**프로젝트**: 마케팅허브 (Marketing Hub) v8.3  
**작성자**: 웹 빌더 AI  
**대상**: DB 담당 AI  

**총 작업 시간**: Phase 1 (30분) + Phase 3 (2시간) = **2.5시간**
