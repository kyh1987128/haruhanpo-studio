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
       Phase 1.5: 풀 와이드 워크스페이스 (사이드바 제거)
       ======================================== -->
  <div class="youtube-finder-workspace" style="display: block; max-width: 1440px; margin: 0 auto; padding: 24px;">
    
    <!-- 메인 콘텐츠 영역 (전체 너비) -->
    <main class="youtube-finder-main">
      <!-- 탭 콘텐츠: 영상 분석 (Viewtrap 스타일 재구성) -->
      <div id="tab-video-analysis" class="tab-content">
        
        <!-- 검색 바 영역 -->
        <div class="search-section bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div class="flex gap-3">
            <div class="flex-1 relative">
              <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <i class="fas fa-search"></i>
              </span>
              <input
                type="text"
                id="video-search-input"
                placeholder="영상 제목, 키워드 또는 YouTube URL 입력"
                class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
              />
            </div>
            <button
              id="search-button"
              class="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
              style="background: #00B87D; white-space: nowrap;"
            >
              <i class="fas fa-search"></i>
              <span>검색</span>
            </button>
          </div>
          
          <!-- 빠른 필터 바 -->
          <div class="flex gap-3 mt-4 flex-wrap">
            <select class="filter-select-inline px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>조회수: 전체</option>
              <option>1만 ~ 10만</option>
              <option>10만 ~ 100만</option>
              <option>100만 ~ 1000만</option>
              <option>1000만 이상</option>
            </select>
            
            <select class="filter-select-inline px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>기간: 전체</option>
              <option>이번 주</option>
              <option>이번 달</option>
              <option>3개월</option>
              <option>1년</option>
            </select>
            
            <div class="flex gap-2 items-center">
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked class="w-4 h-4">
                <span class="badge badge-great">Great</span>
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked class="w-4 h-4">
                <span class="badge badge-good">Good</span>
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked class="w-4 h-4">
                <span class="badge badge-normal">Normal</span>
              </label>
            </div>
            
            <button class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
              <i class="fas fa-redo mr-1"></i>필터 초기화
            </button>
          </div>
        </div>

        <!-- 검색 결과 요약 -->
        <div class="results-summary mb-4 flex justify-between items-center">
          <span class="text-gray-600">
            총 <strong class="text-gray-900">1,923</strong>개 영상 | 
            선택: <strong id="selected-count" class="text-green-600">0</strong>개
          </span>
          <span class="text-sm text-gray-500">
            <i class="fas fa-info-circle mr-1"></i>선택한 영상을 AI 분석할 수 있습니다
          </span>
        </div>

        <!-- 데이터 테이블 -->
        <div class="table-container bg-white rounded-xl shadow-sm border overflow-hidden">
          <div class="overflow-x-auto">
            <table class="video-results-table w-full">
              <thead class="bg-gray-50 border-b">
                <tr>
                  <th class="col-checkbox px-4 py-3 text-left">
                    <input type="checkbox" id="select-all" class="w-4 h-4 cursor-pointer">
                  </th>
                  <th class="col-thumbnail px-4 py-3 text-left">썸네일</th>
                  <th class="col-title px-4 py-3 text-left">
                    <div class="flex items-center gap-1 cursor-pointer hover:text-green-600">
                      <span>제목</span>
                      <i class="fas fa-sort text-xs text-gray-400"></i>
                    </div>
                  </th>
                  <th class="col-views px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1 cursor-pointer hover:text-green-600">
                      <span>조회수</span>
                      <i class="fas fa-sort text-xs text-gray-400"></i>
                    </div>
                  </th>
                  <th class="col-subscribers px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1 cursor-pointer hover:text-green-600">
                      <span>구독자</span>
                      <i class="fas fa-sort text-xs text-gray-400"></i>
                    </div>
                  </th>
                  <th class="col-performance px-4 py-3 text-center">기여도</th>
                  <th class="col-contribution px-4 py-3 text-center">성과도</th>
                  <th class="col-videos px-4 py-3 text-right">총 영상수</th>
                  <th class="col-date px-4 py-3 text-center">
                    <div class="flex items-center justify-center gap-1 cursor-pointer hover:text-green-600">
                      <span>게시일</span>
                      <i class="fas fa-sort text-xs text-gray-400"></i>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody id="video-table-body">
                <!-- 더미 데이터 1 -->
                <tr class="video-row border-b hover:bg-gray-50 cursor-pointer transition">
                  <td class="px-4 py-3">
                    <input type="checkbox" class="video-select w-4 h-4 cursor-pointer">
                  </td>
                  <td class="px-4 py-3">
                    <img 
                      src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                      alt="썸네일"
                      class="video-thumbnail w-32 h-18 object-cover rounded"
                    >
                  </td>
                  <td class="px-4 py-3">
                    <div class="video-info">
                      <div class="video-title font-medium text-gray-900 mb-1 line-clamp-2">
                        EP.3-1 | 청담캠디 이 편만물어봐도 보면, 입이 사각사각해지는 청담동 핫플레이스
                      </div>
                      <div class="channel-info flex items-center gap-2 text-sm text-gray-600">
                        <img 
                          src="https://via.placeholder.com/24" 
                          alt="채널"
                          class="channel-icon w-6 h-6 rounded-full"
                        >
                        <span class="channel-name">채널심오야</span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-gray-900">67,119,110</td>
                  <td class="px-4 py-3 text-right text-gray-700">7,120,000</td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-good">Good</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-good">Good</span>
                  </td>
                  <td class="px-4 py-3 text-right text-gray-700">1,923</td>
                  <td class="px-4 py-3 text-center text-gray-700">22.07.31</td>
                </tr>

                <!-- 더미 데이터 2 -->
                <tr class="video-row border-b hover:bg-gray-50 cursor-pointer transition">
                  <td class="px-4 py-3">
                    <input type="checkbox" class="video-select w-4 h-4 cursor-pointer">
                  </td>
                  <td class="px-4 py-3">
                    <img 
                      src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                      alt="썸네일"
                      class="video-thumbnail w-32 h-18 object-cover rounded"
                    >
                  </td>
                  <td class="px-4 py-3">
                    <div class="video-info">
                      <div class="video-title font-medium text-gray-900 mb-1 line-clamp-2">
                        EP.3-2 | 현실 세조대왕 등장?! 역사 속 인물들의 놀라운 재해석
                      </div>
                      <div class="channel-info flex items-center gap-2 text-sm text-gray-600">
                        <img 
                          src="https://via.placeholder.com/24" 
                          alt="채널"
                          class="channel-icon w-6 h-6 rounded-full"
                        >
                        <span class="channel-name">채널심오야</span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-gray-900">36,547,892</td>
                  <td class="px-4 py-3 text-right text-gray-700">7,120,000</td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-great">Great</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-good">Good</span>
                  </td>
                  <td class="px-4 py-3 text-right text-gray-700">1,923</td>
                  <td class="px-4 py-3 text-center text-gray-700">22.08.14</td>
                </tr>

                <!-- 더미 데이터 3 -->
                <tr class="video-row border-b hover:bg-gray-50 cursor-pointer transition">
                  <td class="px-4 py-3">
                    <input type="checkbox" class="video-select w-4 h-4 cursor-pointer">
                  </td>
                  <td class="px-4 py-3">
                    <img 
                      src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                      alt="썸네일"
                      class="video-thumbnail w-32 h-18 object-cover rounded"
                    >
                  </td>
                  <td class="px-4 py-3">
                    <div class="video-info">
                      <div class="video-title font-medium text-gray-900 mb-1 line-clamp-2">
                        EP.4-1 | 먹방 유튜버의 비밀 공개! 조회수 1000만 돌파의 비결
                      </div>
                      <div class="channel-info flex items-center gap-2 text-sm text-gray-600">
                        <img 
                          src="https://via.placeholder.com/24" 
                          alt="채널"
                          class="channel-icon w-6 h-6 rounded-full"
                        >
                        <span class="channel-name">푸드파이터</span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-gray-900">12,345,678</td>
                  <td class="px-4 py-3 text-right text-gray-700">2,340,000</td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-great">Great</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-great">Great</span>
                  </td>
                  <td class="px-4 py-3 text-right text-gray-700">856</td>
                  <td class="px-4 py-3 text-center text-gray-700">23.01.22</td>
                </tr>

                <!-- 더미 데이터 4 -->
                <tr class="video-row border-b hover:bg-gray-50 cursor-pointer transition">
                  <td class="px-4 py-3">
                    <input type="checkbox" class="video-select w-4 h-4 cursor-pointer">
                  </td>
                  <td class="px-4 py-3">
                    <img 
                      src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                      alt="썸네일"
                      class="video-thumbnail w-32 h-18 object-cover rounded"
                    >
                  </td>
                  <td class="px-4 py-3">
                    <div class="video-info">
                      <div class="video-title font-medium text-gray-900 mb-1 line-clamp-2">
                        브이로그 | 일상 속 작은 행복 찾기, 나만의 힐링 루틴
                      </div>
                      <div class="channel-info flex items-center gap-2 text-sm text-gray-600">
                        <img 
                          src="https://via.placeholder.com/24" 
                          alt="채널"
                          class="channel-icon w-6 h-6 rounded-full"
                        >
                        <span class="channel-name">힐링라이프</span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-gray-900">4,567,890</td>
                  <td class="px-4 py-3 text-right text-gray-700">892,000</td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-good">Good</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-normal">Normal</span>
                  </td>
                  <td class="px-4 py-3 text-right text-gray-700">342</td>
                  <td class="px-4 py-3 text-center text-gray-700">23.05.18</td>
                </tr>

                <!-- 더미 데이터 5 -->
                <tr class="video-row border-b hover:bg-gray-50 cursor-pointer transition">
                  <td class="px-4 py-3">
                    <input type="checkbox" class="video-select w-4 h-4 cursor-pointer">
                  </td>
                  <td class="px-4 py-3">
                    <img 
                      src="https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" 
                      alt="썸네일"
                      class="video-thumbnail w-32 h-18 object-cover rounded"
                    >
                  </td>
                  <td class="px-4 py-3">
                    <div class="video-info">
                      <div class="video-title font-medium text-gray-900 mb-1 line-clamp-2">
                        게임 실황 | 레전드 플레이 모음집, 이건 미쳤다!
                      </div>
                      <div class="channel-info flex items-center gap-2 text-sm text-gray-600">
                        <img 
                          src="https://via.placeholder.com/24" 
                          alt="채널"
                          class="channel-icon w-6 h-6 rounded-full"
                        >
                        <span class="channel-name">겜덕TV</span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right font-medium text-gray-900">8,901,234</td>
                  <td class="px-4 py-3 text-right text-gray-700">1,567,000</td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-good">Good</span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="badge badge-good">Good</span>
                  </td>
                  <td class="px-4 py-3 text-right text-gray-700">634</td>
                  <td class="px-4 py-3 text-center text-gray-700">23.09.05</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 액션 바 (하단) -->
        <div class="action-bar bg-white rounded-xl shadow-sm border p-4 mt-4 flex justify-between items-center">
          <button 
            id="clear-selection-btn"
            class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            <i class="fas fa-times mr-2"></i>선택 해제
          </button>
          
          <button 
            id="analyze-selected-btn"
            class="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
            style="background: #00B87D;"
          >
            <i class="fas fa-bolt"></i>
            <span>선택한 영상 AI 분석 시작 (10 크레딧)</span>
          </button>
        </div>

        <!-- 로딩 상태 -->
        <div id="loading-section" class="hidden bg-white rounded-xl shadow-sm border p-8 mt-6">
          <div class="flex flex-col items-center justify-center space-y-4">
            <div class="loading-spinner"></div>
            <div class="text-center">
              <p class="text-lg font-semibold text-gray-900 mb-2">분석 중입니다...</p>
              <p class="text-sm text-gray-600">선택한 영상들을 AI가 분석하고 있습니다.</p>
              <p class="text-xs text-gray-500 mt-2">평균 3-5초 소요됩니다.</p>
            </div>
          </div>
        </div>

        <!-- 분석 결과 -->
        <div id="result-section" class="hidden bg-white rounded-xl shadow-sm border mt-6">
          <!-- 결과는 JavaScript로 동적 생성 -->
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
