#!/bin/bash

# ========================================
# Worker 환경 변수 자동 설정 스크립트
# ========================================

echo "🔧 YouTube Trends Worker 환경 변수 설정"
echo "========================================="
echo ""
echo "⚠️  주의: 이 스크립트는 대화형 입력이 필요합니다."
echo ""

cd /home/user/youtube-trends-worker

# 1. Cloudflare Pages에서 환경 변수 값 가져오기
echo "📋 Step 1: Cloudflare Pages 환경 변수 확인"
echo "----------------------------------------"
echo ""
echo "다음 명령어로 Pages의 환경 변수를 확인하세요:"
echo "cd /home/user/webapp && npx wrangler pages secret list --project-name haruhanpo-studio-new"
echo ""
echo "확인된 환경 변수:"
echo "  ✅ YOUTUBE_API_KEY: Value Encrypted"
echo "  ✅ SUPABASE_URL: Value Encrypted"
echo "  ✅ SUPABASE_SERVICE_KEY: Value Encrypted"
echo ""

# 2. Worker에 환경 변수 설정
echo "📋 Step 2: Worker 환경 변수 설정"
echo "----------------------------------------"
echo ""
echo "이제 Worker에 환경 변수를 설정합니다."
echo "각 프롬프트에서 값을 입력하세요."
echo ""

# YOUTUBE_API_KEY 설정
echo "🔑 YOUTUBE_API_KEY 설정 중..."
echo "💡 Cloudflare Pages와 동일한 값을 입력하세요"
npx wrangler secret put YOUTUBE_API_KEY

echo ""
echo "✅ YOUTUBE_API_KEY 설정 완료"
echo ""

# SUPABASE_URL 설정
echo "🔑 SUPABASE_URL 설정 중..."
echo "💡 형식: https://your-project.supabase.co"
npx wrangler secret put SUPABASE_URL

echo ""
echo "✅ SUPABASE_URL 설정 완료"
echo ""

# SUPABASE_SERVICE_KEY 설정
echo "🔑 SUPABASE_SERVICE_KEY 설정 중..."
echo "💡 Supabase Dashboard > Settings > API > service_role key"
npx wrangler secret put SUPABASE_SERVICE_KEY

echo ""
echo "✅ SUPABASE_SERVICE_KEY 설정 완료"
echo ""

# 3. 설정 확인
echo "📋 Step 3: 설정 확인"
echo "----------------------------------------"
echo ""
npx wrangler secret list

echo ""
echo "========================================="
echo "✅ 환경 변수 설정 완료!"
echo "========================================="
echo ""
echo "다음 단계:"
echo "  1. npm run deploy   # Worker 배포"
echo "  2. curl -X POST https://youtube-trends-worker.YOUR_ACCOUNT.workers.dev/trigger"
echo "  3. Supabase에서 데이터 확인"
echo ""
