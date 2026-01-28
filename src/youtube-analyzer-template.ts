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
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    /* ========================================
       Phase 5A: Viewtrap 수준 3단 레이아웃 
       ======================================== */
    
    /* 서브 네비게이션 (Layer 2) - 2개 탭으로 축소 */
    .youtube-finder-subnav {
      background: #ffffff;
      border-bottom: 2px solid #e5e7eb;
      position: sticky;
      top: 64px; /* 공통 헤더 높이 */
      z-index: 40;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    }
    
    /* 3단 레이아웃 컨테이너 */
    .three-column-layout {
      display: flex;
      height: calc(100vh - 120px); /* 헤더 + 서브네비 제외 */
      overflow: hidden;
      max-width: 100%;
      margin: 0;
    }
    
    /* 좌측 필터 사이드바 */
    .filter-sidebar {
      width: 280px;
      background: #ffffff;
      border-right: 1px solid #e5e7eb;
      overflow-y: auto;
      position: sticky;
      top: 120px;
      height: calc(100vh - 120px);
      flex-shrink: 0;
    }
    
    .filter-sidebar::-webkit-scrollbar {
      width: 6px;
    }
    
    .filter-sidebar::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }
    
    /* 중앙 테이블 영역 */
    .main-table-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #f9fafb;
    }
    
    /* 우측 상세 패널 */
    .detail-sidebar {
      width: 420px;
      background: #ffffff;
      border-left: 1px solid #e5e7eb;
      overflow-y: auto;
      position: sticky;
      top: 120px;
      height: calc(100vh - 120px);
      flex-shrink: 0;
    }
    
    .detail-sidebar::-webkit-scrollbar {
      width: 6px;
    }
    
    .detail-sidebar::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }
    
    /* 빈 상태 */
    .detail-sidebar-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #9ca3af;
      font-size: 14px;
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
    
    /* ========================================
       Viewtrap 수준 테이블 스타일 
       ======================================== */
    
    /* 테이블 컨테이너 */
    .table-container {
      flex: 1;
      overflow: auto;
      background: #ffffff;
    }
    
    /* 테이블 */
    .video-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    
    /* 고정 헤더 */
    .video-table thead {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .video-table th {
      padding: 16px 12px;
      text-align: left;
      font-weight: 700;
      color: #111827;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    
    .video-table th:hover {
      background: #f3f4f6;
    }
    
    .video-table th.sortable::after {
      content: '⇅';
      margin-left: 6px;
      color: #9ca3af;
      font-size: 12px;
    }
    
    .video-table th.sorted-asc::after {
      content: '↑';
      color: #00B87D;
    }
    
    .video-table th.sorted-desc::after {
      content: '↓';
      color: #00B87D;
    }
    
    /* 테이블 행 */
    .video-table tbody tr {
      border-bottom: 1px solid #f3f4f6;
      transition: background-color 0.15s;
      cursor: pointer;
    }
    
    .video-table tbody tr:hover {
      background: #f9fafb;
    }
    
    .video-table tbody tr.selected {
      background: #ecfdf5;
      border-left: 3px solid #00B87D;
    }
    
    .video-table td {
      padding: 12px;
      vertical-align: middle;
    }
    
    /* 썸네일 셀 */
    .video-thumbnail-cell {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      min-width: 400px;
    }
    
    .video-thumbnail-wrapper {
      position: relative;
      flex-shrink: 0;
      width: 180px;
      height: 101px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    
    .video-thumbnail-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .video-duration-badge {
      position: absolute;
      bottom: 4px;
      right: 4px;
      background: rgba(0,0,0,0.85);
      color: white;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    
    .video-info {
      flex: 1;
      min-width: 0;
    }
    
    .video-title {
      font-weight: 700;
      font-size: 15px;
      color: #111827;
      line-height: 1.4;
      margin-bottom: 6px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .video-title:hover {
      color: #00B87D;
    }
    
    .video-channel-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #6b7280;
    }
    
    .channel-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
    
    /* 숫자 셀 */
    .metric-cell {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    
    .metric-value {
      font-weight: 700;
      font-size: 16px;
      color: #111827;
    }
    
    .metric-change {
      font-size: 12px;
      margin-top: 2px;
    }
    
    .metric-change.positive {
      color: #10b981;
    }
    
    .metric-change.negative {
      color: #ef4444;
    }
    
    /* 성과도 배지 */
    .performance-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    
    .performance-badge.viral {
      background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
      color: white;
    }
    
    .performance-badge.algorithm {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    
    .performance-badge.normal {
      background: #e5e7eb;
      color: #374151;
    }
    
    .performance-badge.low {
      background: #dbeafe;
      color: #1e40af;
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
    
    /* 스켈레톤 로딩 애니메이션 */
    @keyframes skeleton-loading {
      0% {
        background-position: -200px 0;
      }
      100% {
        background-position: calc(200px + 100%) 0;
      }
    }
    
    .skeleton {
      background: linear-gradient(90deg, #f3f4f6 0px, #e5e7eb 40px, #f3f4f6 80px);
      background-size: 200px 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
    }
    
    .skeleton-thumbnail {
      width: 180px;
      height: 101px;
      border-radius: 8px;
    }
    
    .skeleton-text {
      height: 14px;
      border-radius: 4px;
    }
    
    .skeleton-text-large {
      height: 18px;
      border-radius: 4px;
    }
    
    .skeleton-circle {
      border-radius: 50%;
    }
    
    /* 로딩 오버레이 */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    
    .loading-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #00B87D;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-text {
      margin-top: 16px;
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
    
    .loading-progress {
      margin-top: 8px;
      font-size: 12px;
      color: #9ca3af;
    }
    
    /* 반응형 디자인 */
    
    /* 태블릿 (768px 이하) */
    @media (max-width: 768px) {
      .youtube-finder-workspace {
        flex-direction: column;
      }
      
      .filter-sidebar {
        position: relative;
        top: 0;
        width: 100%;
        height: auto;
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
        padding: 16px;
      }
      
      .filter-section {
        margin-bottom: 16px;
      }
      
      .detail-sidebar {
        position: relative;
        width: 100%;
        height: auto;
        border-left: none;
        border-top: 1px solid #e5e7eb;
        padding: 16px;
      }
      
      .video-table-container {
        overflow-x: auto;
      }
      
      .video-table {
        min-width: 800px;
      }
      
      .video-thumbnail-cell {
        min-width: 300px;
      }
      
      /* 테이블 헤더 고정 해제 */
      .video-table thead {
        position: relative;
        top: 0;
      }
    }
    
    /* 모바일 (480px 이하) */
    @media (max-width: 480px) {
      .subnav-container {
        padding: 12px 16px;
        height: auto;
        overflow-x: auto;
      }
      
      .subnav-item {
        padding: 12px 16px;
        font-size: 14px;
        white-space: nowrap;
      }
      
      .filter-sidebar {
        padding: 12px;
      }
      
      .filter-section {
        margin-bottom: 12px;
      }
      
      .filter-label {
        font-size: 12px;
      }
      
      .filter-select {
        padding: 8px;
        font-size: 14px;
      }
      
      .search-bar {
        flex-direction: column;
        gap: 12px;
      }
      
      .search-bar input {
        width: 100%;
      }
      
      .action-buttons {
        flex-direction: column;
        gap: 8px;
      }
      
      .action-buttons button {
        width: 100%;
      }
      
      .video-table {
        min-width: 600px;
      }
      
      .video-thumbnail-wrapper {
        width: 120px !important;
        height: 68px !important;
      }
      
      .video-thumbnail-cell {
        min-width: 250px;
      }
      
      .video-title {
        font-size: 13px;
      }
      
      .channel-name {
        font-size: 11px;
      }
      
      .detail-sidebar {
        padding: 12px;
      }
      
      .detail-video-player {
        height: 200px;
      }
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
       Phase 5A: 2-Tab 네비게이션 
       ======================================== -->
  <nav class="youtube-finder-subnav">
    <div class="subnav-container">
      <div class="subnav-item active" data-tab="market-explorer">
        <span class="subnav-icon">🔍</span>
        <span class="subnav-text">마켓 탐색 & 분석</span>
      </div>
      
      <div class="subnav-item" data-tab="channel-tracking">
        <span class="subnav-icon">📊</span>
        <span class="subnav-text">관심 채널 추적 & 분석</span>
      </div>
    </div>
  </nav>

  <!-- ========================================
       Phase 5A: 3단 레이아웃 - 마켓 탐색 & 분석
       ======================================== -->
  <div id="tab-market-explorer" class="tab-content">
    <div class="three-column-layout">
      
      <!-- 좌측 필터 사이드바 -->
      <aside class="filter-sidebar">
        <div class="p-4">
          <h2 class="font-bold text-lg mb-4">🔍 상세 필터</h2>
          
          <!-- 검색 정렬 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">정렬</h3>
            <select id="filter-order" class="filter-select">
              <option value="relevance">관련성순</option>
              <option value="date">최신순</option>
              <option value="viewCount">조회수순</option>
              <option value="rating">평점순</option>
            </select>
          </div>
          
          <!-- 카테고리 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">카테고리</h3>
            <select id="filter-category" class="filter-select">
              <option value="">모든 카테고리</option>
              <option value="1">영화/애니메이션</option>
              <option value="2">자동차/교통수단</option>
              <option value="10">음악</option>
              <option value="15">애완동물/동물</option>
              <option value="17">스포츠</option>
              <option value="19">여행/이벤트</option>
              <option value="20">게임</option>
              <option value="22">브이로그</option>
              <option value="23">코미디</option>
              <option value="24">엔터테인먼트</option>
              <option value="25">뉴스/정치</option>
              <option value="26">노하우/스타일</option>
              <option value="27">교육</option>
              <option value="28">과학기술</option>
            </select>
          </div>
          
          <!-- 국가 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">국가</h3>
            <select id="filter-region" class="filter-select">
              <option value="">전 세계</option>
              <option value="KR">한국</option>
              <option value="US">미국</option>
              <option value="JP">일본</option>
              <option value="GB">영국</option>
              <option value="IN">인도</option>
              <option value="DE">독일</option>
              <option value="FR">프랑스</option>
              <option value="CA">캐나다</option>
              <option value="AU">호주</option>
            </select>
          </div>
          
          <!-- 구독자 구간 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">구독자 구간</h3>
            <select id="filter-subscribers" class="filter-select">
              <option value="">전체</option>
              <option value="0-10000">1만 미만</option>
              <option value="10000-100000">1만-10만</option>
              <option value="100000-1000000">10만-100만</option>
              <option value="1000000-10000000">100만-1000만</option>
              <option value="10000000+">1000만 이상</option>
            </select>
          </div>
          
          <!-- 영상 길이 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">영상 길이</h3>
            <select id="filter-duration" class="filter-select">
              <option value="">전체</option>
              <option value="short">3분 이하</option>
              <option value="medium">3-10분</option>
              <option value="long">10-30분</option>
              <option value="verylong">30분 이상</option>
            </select>
          </div>
          
          <!-- 성과도 등급 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">성과도</h3>
            <select id="filter-performance" class="filter-select">
              <option value="">전체</option>
              <option value="viral">🔥 떡상 중 (300%+)</option>
              <option value="algorithm">🟢 알고리즘 픽 (100-300%)</option>
              <option value="normal">⚪ 일반 (50-100%)</option>
              <option value="low">🔵 저조 (50% 미만)</option>
            </select>
          </div>
          
          <!-- 조회수 범위 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">최소 조회수</h3>
            <input 
              type="number" 
              id="filter-min-views"
              placeholder="예: 10000"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          
          <!-- 업로드 기간 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">업로드 기간</h3>
            <select id="filter-upload-date" class="filter-select">
              <option value="">전체</option>
              <option value="hour">1시간 이내</option>
              <option value="today">오늘</option>
              <option value="week">이번 주</option>
              <option value="month">이번 달</option>
              <option value="3months">최근 3개월</option>
              <option value="6months">최근 6개월</option>
              <option value="year">올해</option>
              <option value="2years">최근 2년</option>
            </select>
          </div>
          
          <!-- 필터 적용 버튼 -->
          <div class="mt-6">
            <button id="apply-filters-btn" class="btn-apply w-full">
              필터 적용
            </button>
            <button id="reset-filters-btn" class="btn-reset w-full mt-2">
              초기화
            </button>
          </div>
        </div>
      </aside>
      
      <!-- 중앙 테이블 영역 -->
      <main class="main-table-area">
        <!-- 검색 바 -->
        <div class="p-4 bg-white border-b">
          <div class="flex gap-3 mb-3">
            <div class="flex-1 relative">
              <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <i class="fas fa-search"></i>
              </span>
              <input
                type="text"
                id="market-search-input"
                placeholder="키워드 또는 채널 URL 입력 (200개 결과 수집)"
                class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              id="market-search-btn"
              class="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
              style="background: #00B87D;"
            >
              <i class="fas fa-search mr-2"></i>
              검색
            </button>
          </div>
          
          <!-- 액션 버튼 -->
          <div class="flex gap-2">
            <button id="export-csv-btn" class="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
              📥 CSV 다운로드
            </button>
            <button id="export-excel-btn" class="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
              📊 Excel 다운로드
            </button>
            <span id="result-count" class="px-4 py-2 text-sm text-gray-600">
              총 0개 결과
            </span>
          </div>
        </div>
        
        <!-- 테이블 컨테이너 -->
        <div class="table-container">
          <table class="video-table">
            <thead>
              <tr>
                <th class="sortable" data-sort="title">영상</th>
                <th class="sortable text-right" data-sort="views">조회수</th>
                <th class="sortable text-center" data-sort="performance">성과도</th>
                <th class="sortable text-right" data-sort="subscribers">구독자</th>
                <th class="sortable text-right" data-sort="likeRate">좋아요율</th>
                <th class="sortable text-right" data-sort="comments">댓글</th>
                <th class="sortable text-center" data-sort="publishedAt">업로드</th>
                <th class="text-center">길이</th>
              </tr>
            </thead>
            <tbody id="video-table-body">
              <!-- 빈 상태 -->
              <tr>
                <td colspan="8" class="text-center py-12 text-gray-400">
                  <i class="fas fa-search text-4xl mb-3"></i>
                  <p class="text-lg">키워드를 입력하여 검색을 시작하세요</p>
                  <p class="text-sm mt-1">최대 200개의 영상을 분석합니다</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
      
      <!-- 우측 상세 패널 -->
      <aside class="detail-sidebar">
        <div id="detail-panel-content" class="detail-sidebar-empty">
          영상을 선택하세요
        </div>
      </aside>
      
    </div>
  </div>
  
  <!-- ========================================
       Tab 2: 관심 채널 추적 & 분석 (기존 코드 유지)
       ======================================== -->
        
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

        <!-- 더 보기 버튼 (Phase 3: 페이지네이션) -->
        <div id="load-more-container" class="mt-6 flex justify-center">
          <!-- JavaScript로 동적 생성 -->
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

      <!-- 탭 콘텐츠: 채널 분석 -->
      <div id="tab-channel-analysis" class="tab-content hidden">
        <!-- 채널 검색 영역 -->
        <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4">
            <i class="fas fa-tv mr-2" style="color: #00B87D;"></i>
            채널 분석
          </h3>
          <div class="flex gap-3">
            <input 
              type="text" 
              id="channel-search-input"
              placeholder="채널 URL 또는 채널 ID를 입력하세요 (예: @channelname, UCxxxxxx)"
              class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button 
              id="channel-search-button"
              class="px-8 py-3 text-white font-semibold rounded-lg transition"
              style="background: #00B87D;"
              onmouseover="this.style.background='#00a06f'" 
              onmouseout="this.style.background='#00B87D'"
            >
              <i class="fas fa-search mr-2"></i>
              분석 시작
            </button>
          </div>
          <p class="text-sm text-gray-500 mt-2">
            💡 예시: youtube.com/@channelname, youtube.com/channel/UCxxxxxx, 또는 UCxxxxxx
          </p>
        </div>

        <!-- 로딩 상태 -->
        <div id="channel-loading" class="hidden bg-white rounded-xl shadow-sm border p-8 mb-6">
          <div class="flex flex-col items-center justify-center space-y-4">
            <div class="loading-spinner"></div>
            <div class="text-center">
              <p class="text-lg font-semibold text-gray-900">채널 분석 중...</p>
              <p class="text-sm text-gray-600 mt-1">채널 정보와 인기 영상을 불러오고 있습니다.</p>
            </div>
          </div>
        </div>

        <!-- 채널 정보 카드 -->
        <div id="channel-info-card" class="hidden bg-white rounded-xl shadow-sm border p-6 mb-6">
          <!-- JavaScript로 동적 생성 -->
        </div>

        <!-- 인기 영상 TOP 10 -->
        <div id="channel-top-videos" class="hidden bg-white rounded-xl shadow-sm border p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4">
            <i class="fas fa-fire mr-2 text-orange-500"></i>
            인기 영상 TOP 10
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b">
                <tr>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">순위</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">썸네일</th>
                  <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">제목</th>
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-600">조회수</th>
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-600">좋아요</th>
                  <th class="px-4 py-3 text-center text-sm font-semibold text-gray-600">게시일</th>
                  <th class="px-4 py-3 text-center text-sm font-semibold text-gray-600">액션</th>
                </tr>
              </thead>
              <tbody id="channel-videos-body">
                <!-- JavaScript로 동적 생성 -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 탭 콘텐츠: 콘텐츠 전략 (준비중) -->
      <div id="tab-content-strategy" class="tab-content hidden">
        <!-- Phase 4: 콘텐츠 전략 AI -->
        
        <!-- 전략 생성 영역 -->
        <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4">
            <i class="fas fa-lightbulb mr-2" style="color: #00B87D;"></i>
            AI 콘텐츠 전략 생성
          </h3>
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div class="flex items-start gap-3">
              <i class="fas fa-info-circle text-blue-600 mt-1"></i>
              <div class="text-sm text-blue-800">
                <p class="font-semibold mb-1">분석된 영상을 기반으로 AI가 콘텐츠 전략을 제안합니다</p>
                <p class="text-blue-700">영상 분석 탭에서 3개 이상의 영상을 분석한 후 이용하세요.</p>
              </div>
            </div>
          </div>

          <!-- 전략 설정 -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">목표 설정</label>
              <select 
                id="strategy-goal" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="views">조회수 증가</option>
                <option value="subscribers">구독자 증가</option>
                <option value="engagement">참여율 증가</option>
                <option value="viral">바이럴 콘텐츠</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">분석 영상 수</label>
              <div class="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                <i class="fas fa-video text-gray-600"></i>
                <span id="analyzed-count" class="font-semibold text-gray-900">0개</span>
                <span class="text-sm text-gray-500">분석됨</span>
              </div>
            </div>
          </div>

          <button 
            id="generate-strategy-btn"
            class="w-full px-8 py-3 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            style="background: #00B87D;"
            onmouseover="this.style.background='#00a06f'" 
            onmouseout="this.style.background='#00B87D'"
          >
            <i class="fas fa-magic"></i>
            <span>AI 전략 생성하기</span>
          </button>
        </div>

        <!-- 로딩 상태 -->
        <div id="strategy-loading" class="hidden bg-white rounded-xl shadow-sm border p-8 mb-6">
          <div class="flex flex-col items-center justify-center space-y-4">
            <div class="loading-spinner"></div>
            <div class="text-center">
              <p class="text-lg font-semibold text-gray-900">AI 전략 생성 중...</p>
              <p class="text-sm text-gray-600 mt-1">분석된 영상 데이터를 기반으로 전략을 생성하고 있습니다.</p>
            </div>
          </div>
        </div>

        <!-- 전략 결과 -->
        <div id="strategy-results" class="hidden space-y-6">
          <!-- 1. 트렌드 분석 -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-chart-line text-green-600"></i>
              트렌드 분석
            </h3>
            <div id="trend-analysis"></div>
          </div>

          <!-- 2. 콘텐츠 제안 -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-lightbulb text-yellow-600"></i>
              추천 콘텐츠 아이디어 (TOP 5)
            </h3>
            <div id="content-suggestions"></div>
          </div>

          <!-- 3. 실행 전략 -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-tasks text-blue-600"></i>
              실행 전략
            </h3>
            <div id="action-plan"></div>
          </div>
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

      <!-- 탭 콘텐츠: 내 채널 -->
      <div id="tab-my-channel" class="tab-content hidden">
        <!-- Phase 4: 내 채널 관리 UI -->
        <!-- 이름은 "관심 채널 추적 & 분석"으로 변경되었지만 ID는 유지 -->
        <!-- JavaScript에서 'channel-tracking' 탭 클릭 시 'my-channel' ID를 호출 -->
        <!-- 채널 추가 섹션 -->
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-2xl font-bold text-gray-800 mb-2">
                <i class="fas fa-bookmark text-blue-500 mr-2"></i>
                즐겨찾기 채널 관리
              </h2>
              <p class="text-gray-600">관심 채널을 등록하고 성장 추이를 추적하세요</p>
            </div>
          </div>

          <!-- 채널 추가 입력 폼 -->
          <div class="bg-white rounded-xl p-6 shadow-sm">
            <label class="block text-sm font-semibold text-gray-700 mb-3">
              채널 URL 또는 ID 입력
            </label>
            <div class="flex gap-3">
              <input
                type="text"
                id="channel-input"
                placeholder="https://youtube.com/@channelname 또는 채널 ID"
                class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                id="add-channel-btn"
                class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition flex items-center gap-2"
              >
                <i class="fas fa-plus"></i>
                추가
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              <i class="fas fa-info-circle mr-1"></i>
              예시: https://youtube.com/@haruhanpo 또는 @haruhanpo 또는 UCxxxxx
            </p>
          </div>
        </div>

        <!-- 즐겨찾기 채널 목록 -->
        <div id="favorite-channels-list">
          <!-- 로딩 상태 -->
          <div id="channels-loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p class="text-gray-500 mt-4">즐겨찾기 채널 불러오는 중...</p>
          </div>

          <!-- 빈 상태 -->
          <div id="channels-empty" class="hidden text-center py-12">
            <i class="fas fa-bookmark text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-bold text-gray-700 mb-2">등록된 채널이 없습니다</h3>
            <p class="text-gray-500">위 입력창에 채널 URL을 입력하여 즐겨찾기에 추가하세요</p>
          </div>

          <!-- 채널 카드 그리드 -->
          <div id="channels-grid" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- JavaScript로 동적 생성 -->
          </div>
        </div>
      </div>

      <!-- Phase 3: 영상 상세 모달 -->
      <div id="video-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4" style="backdrop-filter: blur(4px);">
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
          <!-- 닫기 버튼 -->
          <button 
            id="close-modal-btn" 
            class="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition z-10"
            aria-label="닫기"
          >
            <i class="fas fa-times text-gray-600"></i>
          </button>

          <!-- 모달 콘텐츠 -->
          <div id="modal-content" class="p-8">
            <!-- JavaScript로 동적 생성 -->
            <div class="animate-pulse">
              <div class="bg-gray-200 h-64 rounded-xl mb-4"></div>
              <div class="bg-gray-200 h-8 rounded mb-2"></div>
              <div class="bg-gray-200 h-6 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Phase 4: 채널 상세 모달 -->
      <div id="channel-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4" style="backdrop-filter: blur(4px);">
        <div class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
          <!-- 닫기 버튼 -->
          <button 
            id="close-channel-modal-btn" 
            class="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition z-10"
            aria-label="닫기"
          >
            <i class="fas fa-times text-gray-600"></i>
          </button>

          <!-- 모달 콘텐츠 -->
          <div id="channel-modal-content" class="p-8">
            <!-- 로딩 -->
            <div id="channel-modal-loading" class="text-center py-12">
              <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
              <p class="text-gray-500 mt-4">채널 데이터 불러오는 중...</p>
            </div>

            <!-- 채널 정보 (JavaScript로 동적 생성) -->
            <div id="channel-modal-data" class="hidden">
              <!-- 헤더 -->
              <div class="flex items-center gap-6 mb-8 pb-6 border-b">
                <img id="channel-modal-thumbnail" src="" alt="" class="w-24 h-24 rounded-full object-cover shadow-lg" />
                <div class="flex-1">
                  <h2 id="channel-modal-name" class="text-3xl font-bold text-gray-800 mb-2"></h2>
                  <p id="channel-modal-description" class="text-gray-600 line-clamp-2"></p>
                </div>
              </div>

              <!-- 현재 통계 -->
              <div class="grid grid-cols-3 gap-4 mb-8">
                <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 text-center">
                  <div class="text-sm text-gray-600 mb-2">구독자</div>
                  <div id="channel-modal-subscribers" class="text-3xl font-bold text-red-600"></div>
                </div>
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
                  <div class="text-sm text-gray-600 mb-2">총 영상</div>
                  <div id="channel-modal-videos" class="text-3xl font-bold text-blue-600"></div>
                </div>
                <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center">
                  <div class="text-sm text-gray-600 mb-2">총 조회수</div>
                  <div id="channel-modal-views" class="text-3xl font-bold text-green-600"></div>
                </div>
              </div>

              <!-- 기간 선택 -->
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-800">
                  <i class="fas fa-chart-line text-blue-500 mr-2"></i>
                  성장 추이
                </h3>
                <div class="flex gap-2">
                  <button 
                    class="chart-period-btn px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold transition" 
                    data-days="7"
                  >
                    7일
                  </button>
                  <button 
                    class="chart-period-btn px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-semibold transition" 
                    data-days="30"
                  >
                    30일
                  </button>
                  <button 
                    class="chart-period-btn px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-semibold transition" 
                    data-days="90"
                  >
                    90일
                  </button>
                </div>
              </div>

              <!-- 차트 -->
              <div class="bg-gray-50 rounded-xl p-6">
                <canvas id="channel-growth-chart" width="800" height="400"></canvas>
              </div>

              <!-- 증가율 요약 -->
              <div id="channel-growth-summary" class="mt-6 grid grid-cols-3 gap-4">
                <!-- JavaScript로 동적 생성 -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- 공통 인증 및 크레딧 시스템 (Supabase 초기화 포함) -->
  <script src="/static/app-v3-final.js?v=24.0.7"></script>
  
  <!-- YouTube 분석기 (app-v3-final.js 의존) -->
  <script src="/static/youtube-analyzer.js"></script>
  
  <!-- Phase 2: YouTube Finder 검색 기능 -->
  <script src="/static/youtube-finder.js"></script>
  
  <!-- Phase 5A: 탭 전환 스크립트 (2개 탭) -->
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
        
        // 새로운 탭 구조에 맞게 매핑
        if (tab === 'market-explorer') {
          document.getElementById('tab-market-explorer')?.classList.remove('hidden');
        } else if (tab === 'channel-tracking') {
          // 'channel-tracking' 탭은 기존 'my-channel' ID를 사용
          document.getElementById('tab-my-channel')?.classList.remove('hidden');
          // 즐겨찾기 채널 목록 로드
          if (typeof loadFavoriteChannels === 'function') {
            loadFavoriteChannels();
          }
        }
      });
    });
    
    // 필터 초기화 (기존 유지)
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
