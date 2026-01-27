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
    /* ========================================
       Phase 1: Viewtrap 스타일 레이아웃 
       ======================================== */
    
    /* 서브 네비게이션 (Layer 2) */
    .youtube-finder-subnav {
      background: #ffffff;
      border-bottom: 2px solid #e5e7eb;
      position: sticky;
      top: 64px; /* 공통 헤더 높이 */
      z-index: 40;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    }
    
    .subnav-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      gap: 0;
      height: 56px;
      overflow-x: auto;
    }
    
    .subnav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 24px;
      height: 100%;
      font-size: 15px;
      font-weight: 500;
      color: #6b7280;
      text-decoration: none;
      border-bottom: 3px solid transparent;
      transition: all 0.2s ease;
      white-space: nowrap;
      cursor: pointer;
    }
    
    .subnav-item:hover {
      color: #00B87D;
      background: #f9fafb;
    }
    
    .subnav-item.active {
      color: #00B87D;
      border-bottom-color: #00B87D;
      font-weight: 600;
      background: #f0fdf4;
    }
    
    .subnav-icon {
      font-size: 20px;
    }
    
    .subnav-badge {
      background: linear-gradient(135deg, #00B87D 0%, #00d68f 100%);
      color: white;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    
    /* 2단 분할 워크스페이스 */
    .youtube-finder-workspace {
      display: flex;
      gap: 0;
      max-width: 1440px;
      margin: 0 auto;
      min-height: calc(100vh - 180px);
    }
    
    /* 좌측 사이드바 */
    .youtube-finder-sidebar {
      width: 260px;
      background: #f9fafb;
      border-right: 1px solid #e5e7eb;
      padding: 24px;
      position: sticky;
      top: 120px; /* 공통헤더 + 서브네비 */
      height: calc(100vh - 120px);
      overflow-y: auto;
    }
    
    .sidebar-section {
      margin-bottom: 24px;
    }
    
    .sidebar-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .filter-group {
      margin-bottom: 16px;
    }
    
    .filter-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }
    
    .filter-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      color: #111827;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .filter-select:hover {
      border-color: #00B87D;
    }
    
    .filter-select:focus {
      outline: none;
      border-color: #00B87D;
      box-shadow: 0 0 0 3px rgba(0, 184, 125, 0.1);
    }
    
    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      color: #374151;
    }
    
    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .badge-great {
      background: #d1fae5;
      color: #065f46;
    }
    
    .badge-good {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .badge-normal {
      background: #f3f4f6;
      color: #6b7280;
    }
    
    .sidebar-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    
    .btn-reset {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: white;
      color: #6b7280;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-reset:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
    
    .btn-apply {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      background: linear-gradient(135deg, #00B87D 0%, #00d68f 100%);
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-apply:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 184, 125, 0.3);
    }
    
    /* 메인 콘텐츠 영역 */
    .youtube-finder-main {
      flex: 1;
      padding: 24px;
      background: #ffffff;
    }
    
    /* 반응형 디자인 */
    @media (max-width: 768px) {
      .youtube-finder-workspace {
        flex-direction: column;
      }
      
      .youtube-finder-sidebar {
        width: 100%;
        position: static;
        height: auto;
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .subnav-text {
        display: none;
      }
    }
    
    /* 기존 스타일 유지 */
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

  <!-- ========================================
       Phase 1: 서브 네비게이션 (Layer 2) 
       ======================================== -->
  <nav class="youtube-finder-subnav">
    <div class="subnav-container">
      <div class="subnav-item active" data-tab="video-analysis">
        <span class="subnav-icon">📊</span>
        <span class="subnav-text">영상 분석</span>
      </div>
      
      <div class="subnav-item" data-tab="channel-analysis">
        <span class="subnav-icon">📺</span>
        <span class="subnav-text">채널 분석</span>
      </div>
      
      <div class="subnav-item" data-tab="content-strategy">
        <span class="subnav-icon">💡</span>
        <span class="subnav-text">콘텐츠 전략</span>
        <span class="subnav-badge">AI</span>
      </div>
      
      <div class="subnav-item" data-tab="performance-tracking">
        <span class="subnav-icon">📈</span>
        <span class="subnav-text">성과 추적</span>
      </div>
      
      <div class="subnav-item" data-tab="my-channel">
        <span class="subnav-icon">🎬</span>
        <span class="subnav-text">내 채널</span>
      </div>
    </div>
  </nav>

  <!-- ========================================
       Phase 1: 2단 분할 워크스페이스 
       ======================================== -->
  <div class="youtube-finder-workspace">
    
    <!-- 좌측 사이드바: 필터 영역 -->
    <aside class="youtube-finder-sidebar">
      <div class="sidebar-section">
        <h3 class="sidebar-title">검색 필터</h3>
        
        <!-- 조회수 필터 -->
        <div class="filter-group">
          <label class="filter-label">조회수</label>
          <select class="filter-select" id="viewsFilter">
            <option value="all">전체</option>
            <option value="0-10k">1만 이하</option>
            <option value="10k-100k">1만 ~ 10만</option>
            <option value="100k-1m">10만 ~ 100만</option>
            <option value="1m-10m">100만 ~ 1000만</option>
            <option value="10m+">1000만 이상</option>
          </select>
        </div>
        
        <!-- 업로드 기간 -->
        <div class="filter-group">
          <label class="filter-label">업로드 기간</label>
          <select class="filter-select" id="uploadDateFilter">
            <option value="all">전체</option>
            <option value="today">오늘</option>
            <option value="week">이번 주</option>
            <option value="month">이번 달</option>
            <option value="3months">3개월</option>
            <option value="year">1년</option>
          </select>
        </div>
        
        <!-- 카테고리 필터 -->
        <div class="filter-group">
          <label class="filter-label">카테고리</label>
          <select class="filter-select" id="categoryFilter">
            <option value="all">전체</option>
            <option value="music">음악</option>
            <option value="gaming">게임</option>
            <option value="sports">스포츠</option>
            <option value="entertainment">엔터테인먼트</option>
            <option value="news">뉴스/정치</option>
            <option value="education">교육</option>
            <option value="howto">노하우/스타일</option>
            <option value="science">과학기술</option>
            <option value="comedy">코미디</option>
            <option value="people">인물/블로그</option>
          </select>
        </div>
        
        <!-- 성과도 필터 -->
        <div class="filter-group">
          <label class="filter-label">성과도</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" value="great" checked id="filterGreat">
              <span class="badge badge-great">Great</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="good" checked id="filterGood">
              <span class="badge badge-good">Good</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" value="normal" checked id="filterNormal">
              <span class="badge badge-normal">Normal</span>
            </label>
          </div>
        </div>
      </div>
      
      <!-- 필터 액션 버튼 -->
      <div class="sidebar-actions">
        <button class="btn-reset" id="resetFilters">
          <span>🔄</span>
          <span>필터 초기화</span>
        </button>
        <button class="btn-apply" id="applyFilters">
          <span>검색</span>
        </button>
      </div>
    </aside>

    <!-- 메인 콘텐츠 영역 -->
    <main class="youtube-finder-main">
      <!-- 탭 콘텐츠: 영상 분석 -->
      <div id="tab-video-analysis" class="tab-content">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            <i class="fas fa-youtube text-red-600 mr-2"></i>영상 분석
          </h1>
          <p class="text-gray-600">YouTube 영상을 검색하고 성과를 분석하세요</p>
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

      <!-- 탭 콘텐츠: 채널 분석 (준비중) -->
      <div id="tab-channel-analysis" class="tab-content hidden">
        <div class="text-center py-12">
          <i class="fas fa-tv text-6xl text-gray-300 mb-4"></i>
          <h2 class="text-2xl font-bold text-gray-700 mb-2">채널 분석</h2>
          <p class="text-gray-500">Phase 2에서 구현 예정입니다</p>
        </div>
      </div>

      <!-- 탭 콘텐츠: 콘텐츠 전략 (준비중) -->
      <div id="tab-content-strategy" class="tab-content hidden">
        <div class="text-center py-12">
          <i class="fas fa-lightbulb text-6xl text-gray-300 mb-4"></i>
          <h2 class="text-2xl font-bold text-gray-700 mb-2">콘텐츠 전략 AI</h2>
          <p class="text-gray-500">Phase 2에서 구현 예정입니다</p>
        </div>
      </div>

      <!-- 탭 콘텐츠: 성과 추적 (준비중) -->
      <div id="tab-performance-tracking" class="tab-content hidden">
        <div class="text-center py-12">
          <i class="fas fa-chart-line text-6xl text-gray-300 mb-4"></i>
          <h2 class="text-2xl font-bold text-gray-700 mb-2">성과 추적</h2>
          <p class="text-gray-500">Phase 2에서 구현 예정입니다</p>
        </div>
      </div>

      <!-- 탭 콘텐츠: 내 채널 (준비중) -->
      <div id="tab-my-channel" class="tab-content hidden">
        <div class="text-center py-12">
          <i class="fas fa-video text-6xl text-gray-300 mb-4"></i>
          <h2 class="text-2xl font-bold text-gray-700 mb-2">내 채널</h2>
          <p class="text-gray-500">Phase 2에서 구현 예정입니다</p>
        </div>
      </div>
    </main>
  </div>

  <!-- 공통 인증 및 크레딧 시스템 (Supabase 초기화 포함) -->
  <script src="/static/app-v3-final.js?v=24.0.7"></script>
  
  <!-- YouTube 분석기 (app-v3-final.js 의존) -->
  <script src="/static/youtube-analyzer.js"></script>
  
  <!-- 탭 전환 스크립트 -->
  <script>
    // 서브 네비게이션 탭 전환
    document.querySelectorAll('.subnav-item').forEach(item => {
      item.addEventListener('click', function() {
        const tab = this.dataset.tab;
        
        // 활성 탭 스타일 변경
        document.querySelectorAll('.subnav-item').forEach(el => el.classList.remove('active'));
        this.classList.add('active');
        
        // 탭 콘텐츠 표시/숨김
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById('tab-' + tab).classList.remove('hidden');
      });
    });
    
    // 필터 초기화
    document.getElementById('resetFilters')?.addEventListener('click', function() {
      document.getElementById('viewsFilter').value = 'all';
      document.getElementById('uploadDateFilter').value = 'all';
      document.getElementById('categoryFilter').value = 'all';
      document.getElementById('filterGreat').checked = true;
      document.getElementById('filterGood').checked = true;
      document.getElementById('filterNormal').checked = true;
    });
  </script>
</body>
</html>
  `
}
