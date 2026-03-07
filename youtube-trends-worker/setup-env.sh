#!/bin/bash

# YouTube Trends Worker 환경 변수 설정 스크립트
# Cloudflare Pages에서 이미 사용 중인 값들을 Worker에 복사

echo "🔧 YouTube Trends Worker 환경 변수 설정"
echo "=========================================="
echo ""

cd /home/user/youtube-trends-worker

# Supabase URL (이미 확인됨)
SUPABASE_URL="https://gmjbsndricdogtqsovnb.supabase.co"

echo "📋 설정할 환경 변수:"
echo "  1. YOUTUBE_API_KEY (Cloudflare Pages에서 복사)"
echo "  2. SUPABASE_URL: $SUPABASE_URL"
echo "  3. SUPABASE_SERVICE_KEY (Supabase에서 복사)"
echo ""
echo "⚠️  주의: 각 단계에서 값을 입력해야 합니다."
echo ""
read -p "계속하시겠습니까? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "취소되었습니다."
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1/3: YOUTUBE_API_KEY 설정"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Cloudflare Pages에서 사용 중인 YouTube API 키를 입력하세요"
echo "   (Google Cloud Console > APIs & Services > Credentials에서 확인 가능)"
echo ""

# YOUTUBE_API_KEY 입력받기
read -p "YOUTUBE_API_KEY: " YOUTUBE_API_KEY

if [ -z "$YOUTUBE_API_KEY" ]; then
    echo "❌ YouTube API 키가 비어있습니다. 중단합니다."
    exit 1
fi

# Wrangler로 설정
echo "$YOUTUBE_API_KEY" | npx wrangler secret put YOUTUBE_API_KEY

if [ $? -eq 0 ]; then
    echo "✅ YOUTUBE_API_KEY 설정 완료"
else
    echo "❌ YOUTUBE_API_KEY 설정 실패"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2/3: SUPABASE_URL 설정"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Supabase URL: $SUPABASE_URL"
echo ""

# SUPABASE_URL 설정
echo "$SUPABASE_URL" | npx wrangler secret put SUPABASE_URL

if [ $? -eq 0 ]; then
    echo "✅ SUPABASE_URL 설정 완료"
else
    echo "❌ SUPABASE_URL 설정 실패"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3/3: SUPABASE_SERVICE_KEY 설정"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Supabase Dashboard > Settings > API > service_role key (Legacy)"
echo "   방금 복사한 service_role 키를 입력하세요"
echo ""

# SUPABASE_SERVICE_KEY 입력받기
read -p "SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Supabase Service 키가 비어있습니다. 중단합니다."
    exit 1
fi

# Wrangler로 설정
echo "$SUPABASE_SERVICE_KEY" | npx wrangler secret put SUPABASE_SERVICE_KEY

if [ $? -eq 0 ]; then
    echo "✅ SUPABASE_SERVICE_KEY 설정 완료"
else
    echo "❌ SUPABASE_SERVICE_KEY 설정 실패"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 모든 환경 변수 설정 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 설정된 환경 변수 확인:"
npx wrangler secret list

echo ""
echo "🚀 다음 단계: Worker 배포"
echo "   npm run deploy"
echo ""
