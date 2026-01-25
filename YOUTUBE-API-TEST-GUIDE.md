# YouTube 분석기 API 테스트 스크립트

## 환경 변수 확인
```bash
cd /home/user/webapp
cat .dev.vars
```

## 로컬 서버 빌드 및 시작
```bash
# 빌드
cd /home/user/webapp && npm run build

# PM2로 시작
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs

# 서버 확인
sleep 3
curl http://localhost:3000
```

## API 테스트

### 1. YouTube 영상 분석 (POST /api/youtube/analyze)

```bash
# 테스트 1: 영상 통계 분석
curl -X POST http://localhost:3000/api/youtube/analyze \
  -H "Content-Type: application/json" \
  -H "X-User-ID: YOUR_USER_ID" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "analysisType": "video-stats"
  }'

# 테스트 2: 성공 요인 분석
curl -X POST http://localhost:3000/api/youtube/analyze \
  -H "Content-Type: application/json" \
  -H "X-User-ID: YOUR_USER_ID" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "analysisType": "success-factors"
  }'

# 테스트 3: 제목 최적화
curl -X POST http://localhost:3000/api/youtube/analyze \
  -H "Content-Type: application/json" \
  -H "X-User-ID: YOUR_USER_ID" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "analysisType": "title-optimization"
  }'
```

### 2. 히스토리 조회 (GET /api/youtube/history)

```bash
# 전체 히스토리 조회
curl -X GET "http://localhost:3000/api/youtube/history?page=1&limit=10" \
  -H "X-User-ID: YOUR_USER_ID"

# 특정 분석 타입 필터링
curl -X GET "http://localhost:3000/api/youtube/history?page=1&limit=10&analysisType=video-stats" \
  -H "X-User-ID: YOUR_USER_ID"
```

### 3. 사용자 통계 (GET /api/youtube/stats)

```bash
curl -X GET "http://localhost:3000/api/youtube/stats" \
  -H "X-User-ID: YOUR_USER_ID"
```

### 4. 캐시 통계 (GET /api/youtube/cache/stats)

```bash
curl -X GET "http://localhost:3000/api/youtube/cache/stats" \
  -H "X-User-ID: YOUR_USER_ID"
```

## 예상 응답

### 성공 응답 (캐시 미스)
```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "videoInfo": {
      "title": "Rick Astley - Never Gonna Give You Up",
      "channel": "Rick Astley",
      "views": 1428000000,
      "likes": 15000000,
      ...
    },
    "analysisResult": {
      "engagement_rate": 1.05,
      "view_trend": "상승세",
      "summary": "..."
    },
    "aiSummary": "이 영상은 ...",
    "creditsUsed": 10,
    "wasCached": false,
    "cacheExpiresAt": "2026-01-29T..."
  }
}
```

### 성공 응답 (캐시 히트)
```json
{
  "success": true,
  "data": {
    ...
    "creditsUsed": 0,
    "wasCached": true,
    ...
  }
}
```

### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "크레딧이 부족합니다."
  }
}
```

## 디버깅

### PM2 로그 확인
```bash
pm2 logs webapp --nostream
```

### Supabase 데이터 확인
```sql
-- 캐시 데이터 확인
SELECT * FROM youtube_analysis_cache ORDER BY created_at DESC LIMIT 10;

-- 히스토리 데이터 확인
SELECT * FROM youtube_analysis_history ORDER BY created_at DESC LIMIT 10;

-- user_stats 확인
SELECT user_id, youtube_analysis_count FROM user_stats LIMIT 10;
```

## 주의사항

1. **X-User-ID 헤더**: 임시로 사용자 인증을 위해 사용. 실제로는 JWT 토큰 필요
2. **YOUR_USER_ID**: Supabase auth.users 테이블의 실제 user_id로 교체
3. **YouTube API 할당량**: 일일 10,000 units (영상 1개 분석 = 2 units)
4. **OpenAI API**: 실제 API 키가 유효해야 함

## 다음 단계

1. JWT 인증 미들웨어 구현
2. 프론트엔드 연동
3. 에러 핸들링 개선
4. 로깅 시스템 추가
5. 프로덕션 배포
