# DB 담당 AI 작업 리스트 (마케팅허브 v8.3+)

## 📋 **작업 개요**

**프로젝트명**: 마케팅허브 (Marketing Hub) - 구 하루한포  
**현재 버전**: v8.3 (Image Smart Placement)  
**DB 작업 우선순위**: Phase 1 워크플로우 혁신 → Phase 3 커뮤니티 시스템  
**작업 소요 시간**: Phase 1 (30분) + Phase 3 (2시간) = 총 2.5시간  

---

## 🎯 **Phase 1: 워크플로우 혁신 DB 설계 (30분)** ⭐ 최우선

### **1-1. users 테이블 확장 (15분)**

#### **추가할 컬럼**
```sql
-- SNS 링크 저장 (JSONB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS my_sns_links JSONB DEFAULT '{}';

-- AI 도구 선호도 저장 (JSONB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS my_ai_tools JSONB DEFAULT '{}';

-- 컬럼 코멘트 추가
COMMENT ON COLUMN users.my_sns_links IS '사용자의 SNS 계정 링크 (Instagram, Facebook, YouTube, Twitter, LinkedIn, Blog, TikTok 등)';
COMMENT ON COLUMN users.my_ai_tools IS '사용자가 선호하는 AI 도구 설정 (OpenAI, Gemini, Claude 등)';
```

#### **데이터 구조 예시**
```json
// my_sns_links 예시
{
  "instagram": "https://instagram.com/username",
  "facebook": "https://facebook.com/username",
  "youtube": "https://youtube.com/@username",
  "twitter": "https://twitter.com/username",
  "linkedin": "https://linkedin.com/in/username",
  "blog": "https://blog.naver.com/username",
  "tiktok": "https://tiktok.com/@username",
  "brunch": "https://brunch.co.kr/@username",
  "threads": "https://threads.net/@username",
  "twitter": "https://x.com/username",
  "linkedin": "https://linkedin.com/in/username",
  "kakaotalk": "https://pf.kakao.com/_username"
}

// my_ai_tools 예시
{
  "preferred_model": "gpt-4o",
  "image_analysis": "gemini-flash",
  "content_generation": "gpt-4o",
  "auto_hybrid": true
}
```

#### **인덱스 생성**
```sql
-- JSONB 컬럼에 GIN 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_sns_links ON users USING GIN (my_sns_links);
CREATE INDEX IF NOT EXISTS idx_users_ai_tools ON users USING GIN (my_ai_tools);
```

---

### **1-2. generations 테이블 확장 (15분)**

#### **추가할 컬럼**
```sql
-- 워크플로우 데이터 저장 (JSONB)
ALTER TABLE generations ADD COLUMN IF NOT EXISTS workflow_data JSONB DEFAULT '{}';

-- 플랫폼별 생성된 콘텐츠 저장 (JSONB)
ALTER TABLE generations ADD COLUMN IF NOT EXISTS platform_contents JSONB DEFAULT '{}';

-- 사용된 이미지 메타데이터 저장 (JSONB)
ALTER TABLE generations ADD COLUMN IF NOT EXISTS used_images JSONB DEFAULT '[]';

-- 컬럼 코멘트 추가
COMMENT ON COLUMN generations.workflow_data IS '워크플로우 메타데이터 (입력 정보, 설정값 등)';
COMMENT ON COLUMN generations.platform_contents IS '플랫폼별 생성된 콘텐츠 전체 저장 (히스토리 조회용)';
COMMENT ON COLUMN generations.used_images IS '콘텐츠 생성에 사용된 이미지 정보 (URL, 출처, 캡션 등)';
```

#### **데이터 구조 예시**
```json
// workflow_data 예시
{
  "brand": "마산 어시장",
  "keywords": ["마산", "어시장", "신선한 해산물"],
  "tone": "친근한",
  "target_age": "30-40대",
  "industry": "식품",
  "content_strategy": "auto",
  "image_placement": true,
  "unsplash_used": true,
  "ai_generated_images": 1
}

// platform_contents 예시
{
  "blog": "<h1>마산 어시장 방문 후기</h1><p>...</p>",
  "instagram": "마산 어시장에서 신선한 해산물을 만나보세요! 🐟\n\n...",
  "brunch": "# 마산 어시장 방문 후기\n\n![이미지](https://...)...",
  "threads": "마산 어시장 추천! 신선한 해산물과 활기찬 분위기...",
  "youtube_shorts": "🎬 마산 어시장 숏폼 스크립트:\n\n[장면1] ..."
}

// used_images 예시
[
  {
    "url": "https://blob.storage/img1.jpg",
    "source": "user_upload",
    "alt": "마산 어시장 전경",
    "caption": "활기찬 어시장의 모습",
    "position": 1,
    "platform": "blog"
  },
  {
    "url": "https://images.unsplash.com/photo-123",
    "source": "unsplash",
    "alt": "신선한 해산물",
    "caption": "다양한 수산물들",
    "position": 2,
    "platform": "blog"
  },
  {
    "url": "https://oaidalleapiprodscus.blob.core.windows.net/...",
    "source": "ai_generated",
    "alt": "전통 시장 분위기",
    "caption": "한국의 전통 시장 정취",
    "position": 3,
    "platform": "blog"
  }
]
```

#### **인덱스 생성**
```sql
-- JSONB 컬럼에 GIN 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generations_workflow ON generations USING GIN (workflow_data);
CREATE INDEX IF NOT EXISTS idx_generations_platform_contents ON generations USING GIN (platform_contents);
CREATE INDEX IF NOT EXISTS idx_generations_images ON generations USING GIN (used_images);
```

---

## 🗂️ **Phase 3: 커뮤니티 시스템 DB 설계 (2시간)** ⭐ Phase 1 완료 후 진행

### **3-1. 테이블 구조 설계 (4개 게시판)**

#### **게시판 구조**
1. **자유게시판** (`board_type = 'free'`)
   - 일반 사용자 자유 주제 게시판
   
2. **질문게시판** (`board_type = 'qna'`)
   - 질의응답 전용 게시판
   
3. **프롬프트 공유** (`board_type = 'prompt_share'`)
   - AI 프롬프트 공유 및 다운로드
   - PQI (Prompt Quality Index) 점수 시스템
   
4. **템플릿 공유** (`board_type = 'template_share'`)
   - 콘텐츠 생성 템플릿 공유

---

### **3-2. community_posts 테이블 (30분)**

```sql
-- 커뮤니티 게시글 테이블
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_type TEXT NOT NULL CHECK (board_type IN ('free', 'qna', 'prompt_share', 'template_share')),
  category TEXT, -- 게시판별 카테고리 (자유: 일상/정보/질문, 프롬프트: 블로그/인스타/유튜브)
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT, -- 에디터로 작성된 HTML 콘텐츠
  
  -- 프롬프트 공유 전용 필드
  prompt_text TEXT, -- 공유할 프롬프트
  prompt_metadata JSONB DEFAULT '{}', -- 프롬프트 메타데이터 (플랫폼, 톤앤매너 등)
  download_count INTEGER DEFAULT 0, -- 다운로드 횟수
  pqi_score DECIMAL(3,2) DEFAULT 0.00 CHECK (pqi_score >= 0 AND pqi_score <= 5.00), -- PQI 점수 (0.00~5.00)
  
  -- 통계
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- 상태 관리
  is_pinned BOOLEAN DEFAULT FALSE, -- 고정글
  is_featured BOOLEAN DEFAULT FALSE, -- 추천글
  is_deleted BOOLEAN DEFAULT FALSE, -- 소프트 삭제
  is_reported BOOLEAN DEFAULT FALSE, -- 신고됨
  report_count INTEGER DEFAULT 0, -- 신고 횟수
  
  -- 검색 최적화
  search_vector TSVECTOR, -- Full-text search
  
  -- 태그
  tags TEXT[] DEFAULT '{}', -- 태그 배열
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  -- 외래키 제약조건
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 테이블 코멘트
COMMENT ON TABLE community_posts IS '커뮤니티 게시글 (4개 게시판 통합)';
COMMENT ON COLUMN community_posts.board_type IS 'free(자유), qna(질문), prompt_share(프롬프트), template_share(템플릿)';
COMMENT ON COLUMN community_posts.pqi_score IS 'Prompt Quality Index (0.00~5.00, 프롬프트 공유 전용)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_board_type ON community_posts(board_type);
CREATE INDEX IF NOT EXISTS idx_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_pqi_score ON community_posts(pqi_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON community_posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_like_count ON community_posts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON community_posts(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON community_posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON community_posts USING GIN(tags);

-- Full-text search 트리거 (한글 검색 지원)
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('korean', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('korean', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('korean', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();
```

---

### **3-3. community_comments 테이블 (20분)**

```sql
-- 댓글 테이블 (대댓글 지원)
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE, -- 대댓글
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_reported BOOLEAN DEFAULT FALSE,
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- 테이블 코멘트
COMMENT ON TABLE community_comments IS '커뮤니티 댓글 (대댓글 지원)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON community_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON community_comments(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON community_comments(is_deleted) WHERE is_deleted = FALSE;
```

---

### **3-4. community_likes 테이블 (15분)**

```sql
-- 좋아요 테이블 (게시글 + 댓글)
CREATE TABLE IF NOT EXISTS community_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL, -- post_id 또는 comment_id
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 중복 방지
  CONSTRAINT unique_like UNIQUE (user_id, target_type, target_id)
);

-- 테이블 코멘트
COMMENT ON TABLE community_likes IS '좋아요 기록 (게시글 + 댓글)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON community_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON community_likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON community_likes(created_at DESC);
```

---

### **3-5. community_bookmarks 테이블 (10분)**

```sql
-- 북마크 테이블
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  folder_name TEXT DEFAULT 'default', -- 폴더별 정리
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 중복 방지
  CONSTRAINT unique_bookmark UNIQUE (user_id, post_id)
);

-- 테이블 코멘트
COMMENT ON TABLE community_bookmarks IS '북마크 기록';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON community_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON community_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON community_bookmarks(folder_name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON community_bookmarks(created_at DESC);
```

---

### **3-6. community_reports 테이블 (15분)**

```sql
-- 신고 테이블
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'copyright', 'inappropriate', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  
  -- 중복 신고 방지
  CONSTRAINT unique_report UNIQUE (reporter_id, target_type, target_id)
);

-- 테이블 코멘트
COMMENT ON TABLE community_reports IS '신고 기록';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON community_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON community_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON community_reports(created_at DESC);
```

---

### **3-7. PQI (Prompt Quality Index) 시스템 (20분)**

```sql
-- PQI 평가 테이블
CREATE TABLE IF NOT EXISTS prompt_quality_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating DECIMAL(3,2) NOT NULL CHECK (rating >= 0 AND rating <= 5.00), -- 0.00~5.00
  dimensions JSONB NOT NULL, -- 5가지 평가 차원
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 중복 평가 방지
  CONSTRAINT unique_rating UNIQUE (post_id, user_id)
);

-- 테이블 코멘트
COMMENT ON TABLE prompt_quality_ratings IS 'PQI 사용자 평가 기록';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pqi_post_id ON prompt_quality_ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_pqi_user_id ON prompt_quality_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_pqi_rating ON prompt_quality_ratings(rating DESC);

-- PQI dimensions 데이터 구조 예시:
-- {
--   "clarity": 4.5,        // 명확성 (0~5)
--   "completeness": 4.0,   // 완전성 (0~5)
--   "creativity": 4.8,     // 창의성 (0~5)
--   "effectiveness": 4.2,  // 효과성 (0~5)
--   "reusability": 4.6     // 재사용성 (0~5)
-- }
```

#### **PQI 계산 함수**
```sql
-- PQI 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_pqi_score(p_post_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  rating_count INTEGER;
  download_factor DECIMAL(3,2);
  final_score DECIMAL(3,2);
BEGIN
  -- 평균 평점 계산
  SELECT AVG(rating), COUNT(*) INTO avg_rating, rating_count
  FROM prompt_quality_ratings
  WHERE post_id = p_post_id;
  
  -- 평가가 없으면 0 반환
  IF rating_count = 0 THEN
    RETURN 0.00;
  END IF;
  
  -- 다운로드 가중치 (다운로드 많을수록 신뢰도 향상)
  SELECT 
    CASE 
      WHEN download_count >= 100 THEN 1.10
      WHEN download_count >= 50 THEN 1.05
      WHEN download_count >= 20 THEN 1.02
      ELSE 1.00
    END INTO download_factor
  FROM community_posts
  WHERE id = p_post_id;
  
  -- 최종 PQI 점수 = 평균 평점 × 다운로드 가중치
  final_score := LEAST(5.00, avg_rating * download_factor);
  
  -- community_posts 테이블 업데이트
  UPDATE community_posts
  SET pqi_score = final_score, updated_at = NOW()
  WHERE id = p_post_id;
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_pqi_score IS 'PQI 점수 자동 계산 (평균 평점 × 다운로드 가중치)';
```

#### **PQI 트리거**
```sql
-- 평가 추가/수정 시 자동 PQI 재계산
CREATE OR REPLACE FUNCTION trigger_recalculate_pqi()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_pqi_score(NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pqi_recalculate_on_rating 
  AFTER INSERT OR UPDATE ON prompt_quality_ratings
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_pqi();
```

---

### **3-8. 통계 업데이트 트리거 (10분)**

```sql
-- 게시글 통계 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_post_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 댓글 추가 시
    IF TG_TABLE_NAME = 'community_comments' THEN
      UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
    
    -- 좋아요 추가 시
    IF TG_TABLE_NAME = 'community_likes' AND NEW.target_type = 'post' THEN
      UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF TG_TABLE_NAME = 'community_likes' AND NEW.target_type = 'comment' THEN
      UPDATE community_comments SET like_count = like_count + 1 WHERE id = NEW.target_id;
    END IF;
    
    -- 북마크 추가 시
    IF TG_TABLE_NAME = 'community_bookmarks' THEN
      UPDATE community_posts SET bookmark_count = bookmark_count + 1 WHERE id = NEW.post_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- 댓글 삭제 시
    IF TG_TABLE_NAME = 'community_comments' THEN
      UPDATE community_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    END IF;
    
    -- 좋아요 취소 시
    IF TG_TABLE_NAME = 'community_likes' AND OLD.target_type = 'post' THEN
      UPDATE community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id;
    ELSIF TG_TABLE_NAME = 'community_likes' AND OLD.target_type = 'comment' THEN
      UPDATE community_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id;
    END IF;
    
    -- 북마크 삭제 시
    IF TG_TABLE_NAME = 'community_bookmarks' THEN
      UPDATE community_posts SET bookmark_count = GREATEST(0, bookmark_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_post_comment_count 
  AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_statistics();

CREATE TRIGGER update_post_like_count 
  AFTER INSERT OR DELETE ON community_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_statistics();

CREATE TRIGGER update_post_bookmark_count 
  AFTER INSERT OR DELETE ON community_bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_post_statistics();
```

---

### **3-9. RLS (Row Level Security) 정책 (10분)**

```sql
-- community_posts RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone" ON community_posts
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Users can insert own posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- community_comments RLS
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" ON community_comments
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Users can insert own comments" ON community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON community_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON community_comments
  FOR DELETE USING (auth.uid() = user_id);

-- community_likes RLS
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" ON community_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert own likes" ON community_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON community_likes
  FOR DELETE USING (auth.uid() = user_id);

-- community_bookmarks RLS
ALTER TABLE community_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookmarks" ON community_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON community_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON community_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- prompt_quality_ratings RLS
ALTER TABLE prompt_quality_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone" ON prompt_quality_ratings
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert own ratings" ON prompt_quality_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings" ON prompt_quality_ratings
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 📊 **Phase 1 + Phase 3 전체 SQL 통합 스크립트**

### **실행 순서**
1. **Phase 1 (30분)**: users 확장 + generations 확장
2. **Phase 3 (2시간)**: 커뮤니티 테이블 7개 + 트리거/함수

### **전체 SQL 파일 위치**
```
/home/user/webapp/db-migrations/
├── phase1-workflow-enhancement.sql      (Phase 1 전체)
└── phase3-community-system.sql          (Phase 3 전체)
```

---

## ✅ **DB 작업 체크리스트**

### **Phase 1: 워크플로우 혁신 (30분)**
- [ ] users 테이블 확장 (`my_sns_links`, `my_ai_tools`)
- [ ] users 인덱스 생성 (GIN 인덱스 2개)
- [ ] generations 테이블 확장 (`workflow_data`, `platform_contents`, `used_images`)
- [ ] generations 인덱스 생성 (GIN 인덱스 3개)
- [ ] 샘플 데이터 삽입 및 테스트

### **Phase 3: 커뮤니티 시스템 (2시간)**
- [ ] `community_posts` 테이블 생성 (게시글)
- [ ] `community_comments` 테이블 생성 (댓글)
- [ ] `community_likes` 테이블 생성 (좋아요)
- [ ] `community_bookmarks` 테이블 생성 (북마크)
- [ ] `community_reports` 테이블 생성 (신고)
- [ ] `prompt_quality_ratings` 테이블 생성 (PQI 평가)
- [ ] PQI 계산 함수 생성 (`calculate_pqi_score`)
- [ ] 통계 업데이트 트리거 생성 (3개)
- [ ] Full-text search 트리거 생성
- [ ] RLS 정책 생성 (6개 테이블)
- [ ] 인덱스 최적화 확인
- [ ] 샘플 데이터 삽입 및 테스트

---

## 🔍 **테스트 쿼리**

### **Phase 1 테스트**
```sql
-- users 테이블 확장 확인
SELECT id, email, my_sns_links, my_ai_tools 
FROM users 
LIMIT 1;

-- generations 테이블 확장 확인
SELECT id, user_id, workflow_data, platform_contents, used_images 
FROM generations 
LIMIT 1;
```

### **Phase 3 테스트**
```sql
-- 게시글 생성 테스트
INSERT INTO community_posts (user_id, board_type, title, content)
VALUES ('user-uuid', 'free', '테스트 게시글', '테스트 내용입니다.');

-- PQI 점수 계산 테스트
SELECT calculate_pqi_score('post-uuid');

-- 검색 테스트
SELECT * FROM community_posts
WHERE search_vector @@ to_tsquery('korean', '마케팅 | AI');

-- 통계 확인
SELECT board_type, COUNT(*) as post_count 
FROM community_posts 
WHERE is_deleted = FALSE 
GROUP BY board_type;
```

---

## 📝 **주의사항**

1. **JSONB 컬럼 활용**
   - `my_sns_links`, `my_ai_tools`, `workflow_data` 등은 모두 JSONB 타입
   - GIN 인덱스로 검색 성능 최적화
   - JSON 데이터 구조는 프론트엔드와 사전 합의 필요

2. **Full-text Search**
   - PostgreSQL의 한글 검색 지원 (`korean` dictionary)
   - `search_vector` 컬럼 자동 업데이트 트리거
   - 검색 시 `to_tsquery('korean', '검색어')` 사용

3. **PQI 시스템**
   - 5가지 평가 차원: 명확성, 완전성, 창의성, 효과성, 재사용성
   - 다운로드 횟수에 따른 가중치 적용
   - 자동 재계산 트리거

4. **통계 자동 업데이트**
   - `like_count`, `comment_count`, `bookmark_count` 등은 트리거로 자동 업데이트
   - 수동 업데이트 불필요

5. **소프트 삭제**
   - `is_deleted = TRUE`로 논리적 삭제
   - 실제 데이터는 유지 (복구 가능)

---

## 🚀 **다음 단계**

1. **DB 담당 AI**: 위 SQL 스크립트 실행 및 테스트
2. **웹 빌더 AI**: Phase 1 완료 후 프론트엔드 구현 시작
3. **협업**: DB 스키마 확정 후 API 엔드포인트 설계

---

## 📧 **문의사항**

DB 작업 중 문제 발생 시:
1. 에러 메시지 전체 복사
2. 실행한 SQL 스크립트
3. 현재 테이블 구조 (`\d table_name`)

위 정보와 함께 웹 빌더 AI에게 전달 부탁드립니다.

---

**작성일**: 2026-01-13  
**버전**: v8.3 (Image Smart Placement)  
**작성자**: 웹 빌더 AI
