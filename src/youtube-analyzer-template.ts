// 유튜브 파인더 (TrendFinder) 페이지 템플릿
import { header } from './components/header';

export function youtubeAnalyzerTemplate() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>유튜브 파인더 (TrendFinder) - 하루한포스트</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    .analysis-card {
      transition: all 0.3s ease;
    }
    .analysis-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .loading-spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body class="bg-gray-50" data-page="youtube-analyzer">
  ${header}

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- 헤더 -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        <i class="fas fa-youtube text-red-600 mr-2"></i>유튜브 파인더 (TrendFinder)
      </h1>
      <p class="text-gray-600">YouTube 영상의 성과를 AI로 분석하고 성공 전략을 제안받으세요</p>
    </div>

    <!-- 분석 입력 섹션 -->
    <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">영상 분석 시작하기</h2>
      
      <!-- YouTube URL 입력 -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-link mr-2"></i>YouTube 영상 URL
        </label>
        <input
          type="text"
          id="youtube-url"
          placeholder="https://www.youtube.com/watch?v=..."
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p class="mt-1 text-sm text-gray-500">
          예시: https://www.youtube.com/watch?v=dQw4w9WgXcQ
        </p>
      </div>

      <!-- 분석 타입 선택 -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-3">
          <i class="fas fa-chart-line mr-2"></i>분석 타입 선택
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button onclick="selectAnalysisType('video-stats')" class="analysis-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition" data-type="video-stats">
            <div class="flex items-center space-x-3">
              <i class="fas fa-chart-bar text-2xl text-blue-600"></i>
              <div class="text-left">
                <div class="font-semibold text-gray-900">영상 통계</div>
                <div class="text-xs text-gray-500">조회수, 참여율 분석</div>
              </div>
            </div>
          </button>

          <button onclick="selectAnalysisType('success-factors')" class="analysis-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition" data-type="success-factors">
            <div class="flex items-center space-x-3">
              <i class="fas fa-trophy text-2xl text-yellow-600"></i>
              <div class="text-left">
                <div class="font-semibold text-gray-900">성공 요인</div>
                <div class="text-xs text-gray-500">성공 비결 분석</div>
              </div>
            </div>
          </button>

          <button onclick="selectAnalysisType('title-optimization')" class="analysis-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition" data-type="title-optimization">
            <div class="flex items-center space-x-3">
              <i class="fas fa-heading text-2xl text-green-600"></i>
              <div class="text-left">
                <div class="font-semibold text-gray-900">제목 최적화</div>
                <div class="text-xs text-gray-500">더 나은 제목 제안</div>
              </div>
            </div>
          </button>

          <button onclick="selectAnalysisType('sentiment-analysis')" class="analysis-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition" data-type="sentiment-analysis">
            <div class="flex items-center space-x-3">
              <i class="fas fa-smile text-2xl text-pink-600"></i>
              <div class="text-left">
                <div class="font-semibold text-gray-900">감성 분석</div>
                <div class="text-xs text-gray-500">댓글 반응 분석</div>
              </div>
            </div>
          </button>

          <button onclick="selectAnalysisType('channel-strategy')" class="analysis-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition" data-type="channel-strategy">
            <div class="flex items-center space-x-3">
              <i class="fas fa-bullseye text-2xl text-purple-600"></i>
              <div class="text-left">
                <div class="font-semibold text-gray-900">채널 전략</div>
                <div class="text-xs text-gray-500">성장 전략 제안</div>
              </div>
            </div>
          </button>

          <button onclick="selectAnalysisType('video-ideas')" class="analysis-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition" data-type="video-ideas">
            <div class="flex items-center space-x-3">
              <i class="fas fa-lightbulb text-2xl text-orange-600"></i>
              <div class="text-left">
                <div class="font-semibold text-gray-900">영상 아이디어</div>
                <div class="text-xs text-gray-500">콘텐츠 아이디어 제안</div>
              </div>
            </div>
          </button>

          <button onclick="selectAnalysisType('competitor')" class="analysis-type-btn p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition" data-type="competitor">
            <div class="flex items-center space-x-3">
              <i class="fas fa-users text-2xl text-red-600"></i>
              <div class="text-left">
                <div class="font-semibold text-gray-900">경쟁자 분석</div>
                <div class="text-xs text-gray-500">경쟁 우위 파악</div>
              </div>
            </div>
          </button>
        </div>
        <p class="mt-2 text-sm text-gray-500">
          <i class="fas fa-info-circle mr-1"></i>분석당 <strong>10 크레딧</strong> 소모 (캐시 히트 시 무료)
        </p>
      </div>

      <!-- 분석 시작 버튼 -->
      <button
        id="analyze-btn"
        onclick="startAnalysis()"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition flex items-center justify-center space-x-2"
      >
        <i class="fas fa-play-circle"></i>
        <span>분석 시작하기</span>
      </button>
    </div>

    <!-- 로딩 상태 -->
    <div id="loading-section" class="hidden bg-white rounded-xl shadow-sm border p-8 mb-8">
      <div class="flex flex-col items-center justify-center space-y-4">
        <div class="loading-spinner"></div>
        <div class="text-center">
          <p class="text-lg font-semibold text-gray-900 mb-2">분석 중입니다...</p>
          <p class="text-sm text-gray-600">YouTube 데이터를 수집하고 AI 분석을 진행하고 있습니다.</p>
          <p class="text-xs text-gray-500 mt-2">평균 3-5초 소요됩니다.</p>
        </div>
      </div>
    </div>

    <!-- 분석 결과 -->
    <div id="result-section" class="hidden bg-white rounded-xl shadow-sm border mb-8">
      <!-- 결과는 JavaScript로 동적 생성 -->
    </div>

    <!-- 히스토리 섹션 -->
    <div class="bg-white rounded-xl shadow-sm border p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">
          <i class="fas fa-history text-gray-600 mr-2"></i>분석 히스토리
        </h2>
        <button onclick="loadHistory()" class="text-blue-600 hover:text-blue-700">
          <i class="fas fa-sync-alt mr-1"></i>새로고침
        </button>
      </div>
      <div id="history-list">
        <!-- 히스토리는 JavaScript로 동적 생성 -->
      </div>
    </div>
  </div>

  <script src="https://gmjbsndricdogtqsovnb.supabase.co/storage/v1/object/public/public/supabase.js"></script>
  <script src="/static/youtube-analyzer.js"></script>
</body>
</html>
  `
}
