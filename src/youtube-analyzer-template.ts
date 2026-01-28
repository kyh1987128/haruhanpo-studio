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
  <!-- Phase 7: PDF 생성 라이브러리 -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
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
    
    /* 검색 탭 스타일 */
    .search-tab {
      padding: 10px 20px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #6b7280;
      transition: all 0.2s;
    }
    
    .search-tab:hover {
      color: #374151;
      background: #f9fafb;
    }
    
    .search-tab.active {
      color: #00B87D;
      border-bottom-color: #00B87D;
      font-weight: 600;
    }
    
    .search-panel {
      animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* 메인 콘텐츠 영역 */
    .youtube-finder-main {
      flex: 1;
      padding: 24px;
      background: #ffffff;
    }
    
    /* 반응형 디자인 - 태블릿 (768px 이하) */
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
      
      /* 검색 탭 */
      .search-tab {
        padding: 8px 12px;
        font-size: 13px;
      }
      
      /* 필터 사이드바 */
      .filter-sidebar {
        width: 100%;
        position: static;
        height: auto;
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
      }
      
      /* 3단 레이아웃 → 세로 배치 */
      .three-column-layout {
        flex-direction: column;
      }
      
      /* 상세 패널 하단으로 */
      .detail-sidebar {
        width: 100%;
        position: static;
        height: 300px;
        border-left: none;
        border-top: 1px solid #e5e7eb;
      }
    }
    
    /* 반응형 디자인 - 모바일 (480px 이하) */
    @media (max-width: 480px) {
      /* 검색 탭 가로 스크롤 */
      .search-tab {
        padding: 6px 10px;
        font-size: 12px;
        white-space: nowrap;
      }
      
      /* 검색 입력 필드 */
      #market-search-input,
      #channel-search-input {
        font-size: 14px;
        padding: 10px 12px 10px 40px;
      }
      
      /* 버튼 세로 배치 */
      .flex.gap-3.mb-3,
      .flex.gap-2.items-center {
        flex-direction: column;
        gap: 8px;
      }
      
      .flex.gap-3.mb-3 > *,
      .flex.gap-2.items-center > button {
        width: 100%;
      }
      
      /* 검색 방식 라디오 버튼 */
      .flex.items-center.gap-4 {
        flex-wrap: wrap;
        gap: 8px;
      }
      
      /* 테이블 폰트 크기 */
      .video-table {
        font-size: 12px;
      }
      
      .video-table th,
      .video-table td {
        padding: 8px 4px;
      }
      
      /* 영상 제목 */
      .video-thumbnail-cell .font-medium {
        font-size: 13px;
      }
      
      /* 채널명 */
      .video-thumbnail-cell .text-sm {
        font-size: 11px;
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
       Phase 6: 3-Tab 네비게이션 (고급 분석 추가)
       ======================================== -->
  <nav class="youtube-finder-subnav">
    <div class="subnav-container">
      <div class="subnav-item active" data-tab="market-explorer">
        <span class="subnav-icon">🔍</span>
        <span class="subnav-text">마켓 탐색 & 분석</span>
      </div>
      
      <div class="subnav-item" data-tab="advanced-analytics">
        <span class="subnav-icon">🚀</span>
        <span class="subnav-text">고급 분석</span>
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
          <h2 class="font-bold text-lg mb-4">🔍 검색 & 필터</h2>
          
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 1. 검색 방식 선택 (드롭다운) -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <div class="mb-6 pb-6 border-b border-gray-200">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">📍 검색 방식</h3>
            <select 
              id="search-type-select" 
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm font-medium"
            >
              <option value="keyword">🔍 키워드 검색</option>
              <option value="channel">👤 채널 ID/URL</option>
              <option value="category">📂 카테고리 검색</option>
            </select>
          </div>
          
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 2. 입력 필드 (동적 변경) -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          
          <!-- 2-1. 키워드 검색 입력 -->
          <div id="input-keyword" class="mb-6 pb-6 border-b border-gray-200">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">📝 키워드 입력</h3>
            <input
              type="text"
              id="market-search-input"
              placeholder="예: 게임 실황, 브이로그, 요리"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            
            <!-- 검색 모드 -->
            <div class="mt-3">
              <label class="text-xs font-semibold text-gray-600 mb-2 block">검색 모드:</label>
              <div class="flex flex-col gap-1.5">
                <label class="flex items-center cursor-pointer text-sm">
                  <input type="radio" name="search-mode" value="keyword" checked class="mr-2">
                  <span>일반 키워드</span>
                </label>
                <label class="flex items-center cursor-pointer text-sm">
                  <input type="radio" name="search-mode" value="tag" class="mr-2">
                  <span>태그 포함</span>
                </label>
                <label class="flex items-center cursor-pointer text-sm">
                  <input type="radio" name="search-mode" value="tag-only" class="mr-2">
                  <span>태그만</span>
                </label>
              </div>
            </div>
            
            <!-- 제외 키워드 -->
            <div class="mt-3">
              <label class="text-xs font-semibold text-gray-600 mb-2 block">❌ 제외 키워드 (쉼표 구분):</label>
              <input
                type="text"
                id="exclude-keywords-input"
                placeholder="예: 광고, 협찬, 뽑기"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          <!-- 2-2. 채널 검색 입력 -->
          <div id="input-channel" class="mb-6 pb-6 border-b border-gray-200" style="display: none;">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">📝 채널 ID 또는 URL</h3>
            <input
              type="text"
              id="channel-search-input"
              placeholder="UC... 또는 youtube.com/channel/..."
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p class="text-xs text-gray-500 mt-2">💡 해당 채널의 모든 영상을 분석합니다 (최대 200개)</p>
          </div>
          
          <!-- 2-3. 카테고리 검색 입력 -->
          <div id="input-category" class="mb-6 pb-6 border-b border-gray-200" style="display: none;">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">📝 카테고리 선택</h3>
            <select
              id="category-search-select"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">전체 카테고리</option>
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
          
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 3. 공통 필터 -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          
          <!-- 검색 정렬 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">📈 정렬 방식</h3>
            <select id="filter-order" class="filter-select">
              <option value="relevance">YouTube 추천</option>
              <option value="date">최신순</option>
              <option value="viewCount">조회수순</option>
              <option value="rating">평점순</option>
            </select>
          </div>
          
          <!-- 성과도 레벨 (체크박스로 변경) -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">📊 성과도 레벨</h3>
            <div class="flex flex-col gap-2">
              <label class="flex items-center cursor-pointer text-sm">
                <input type="checkbox" class="performance-checkbox mr-2" value="viral" checked>
                <span>🔥 떡상 중 (300%+)</span>
              </label>
              <label class="flex items-center cursor-pointer text-sm">
                <input type="checkbox" class="performance-checkbox mr-2" value="algorithm" checked>
                <span>🟢 알고리즘 픽 (100-300%)</span>
              </label>
              <label class="flex items-center cursor-pointer text-sm">
                <input type="checkbox" class="performance-checkbox mr-2" value="normal" checked>
                <span>⚪ 일반 (50-100%)</span>
              </label>
              <label class="flex items-center cursor-pointer text-sm">
                <input type="checkbox" class="performance-checkbox mr-2" value="low">
                <span>🔵 저조 (50% 미만)</span>
              </label>
            </div>
          </div>
          
          <!-- 최소 조회수 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">🔢 최소 조회수</h3>
            <select id="filter-min-views" class="filter-select">
              <option value="">제한 없음</option>
              <option value="1000">1천+ 조회수</option>
              <option value="10000">1만+ 조회수</option>
              <option value="100000">10만+ 조회수</option>
              <option value="1000000">100만+ 조회수</option>
              <option value="10000000">1000만+ 조회수</option>
            </select>
          </div>
          
          <!-- 조회수 기간 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">📅 조회수 기간</h3>
            <select id="filter-upload-date" class="filter-select">
              <option value="">전체</option>
              <option value="today">1일</option>
              <option value="week">1주일</option>
              <option value="month">1개월</option>
              <option value="year">1년</option>
            </select>
          </div>
          
          <!-- 글로벌 지역 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">🌍 글로벌 지역</h3>
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
            <h3 class="text-sm font-semibold text-gray-700 mb-3">👥 구독자 구간</h3>
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
            <h3 class="text-sm font-semibold text-gray-700 mb-3">⏱️ 영상 길이</h3>
            <select id="filter-duration" class="filter-select">
              <option value="">전체</option>
              <option value="short">3분 이하</option>
              <option value="medium">3-10분</option>
              <option value="long">10-30분</option>
              <option value="verylong">30분 이상</option>
            </select>
          </div>
          
          <!-- 결과 개수 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">📋 결과 개수</h3>
            <input
              type="number"
              id="filter-max-results"
              placeholder="최대 200개"
              value="50"
              min="1"
              max="200"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            />
            <p class="text-xs text-gray-500 mt-1">💡 1~200 사이로 입력하세요</p>
          </div>
          
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <!-- 4. 검색 버튼 -->
          <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
          <div class="mt-6 pt-6 border-t border-gray-200">
            <button id="market-search-btn" class="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition text-base">
              <i class="fas fa-search mr-2"></i>
              🔍 검색 시작
            </button>
            <button id="reset-filters-btn" class="w-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg mt-2 transition text-sm">
              <i class="fas fa-redo mr-2"></i>
              🔄 필터 초기화
            </button>
          </div>
        </div>
      </aside>
      
      <!-- 중앙 테이블 영역 -->
      <main class="main-table-area">
        <!-- 검색 결과 헤더 -->
        <div class="p-4 bg-white border-b">
          <div class="flex gap-2 items-center flex-wrap">
            <button 
              id="compare-videos-btn" 
              class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              <i class="fas fa-chart-bar mr-1"></i>
              선택 영상 비교 (<span id="selected-count">0</span>/3)
            </button>
            <button 
              id="bookmark-filter-btn" 
              class="px-4 py-2 text-sm border rounded-lg hover:bg-yellow-50 hover:border-yellow-400"
            >
              <i class="far fa-star text-yellow-500 mr-1"></i>
              북마크만 보기 (<span id="bookmark-count">0</span>)
            </button>
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
                <th class="text-center" style="width: 40px;">
                  <input type="checkbox" id="select-all-videos" class="w-4 h-4 cursor-pointer" title="전체 선택">
                </th>
                <th class="text-center" style="width: 40px;" title="북마크">
                  <i class="fas fa-star text-yellow-500"></i>
                </th>
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
                <td colspan="10" class="text-center py-12 text-gray-400">
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
       비교 모달
       ======================================== -->
  <div 
    id="compare-modal" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden"
    style="z-index: 9999;"
  >
    <div class="bg-white rounded-2xl shadow-2xl w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto">
      <!-- 모달 헤더 -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-900">
          <i class="fas fa-chart-bar text-blue-600 mr-2"></i>
          영상 비교 분석
        </h2>
        <button 
          id="close-compare-modal" 
          class="text-gray-400 hover:text-gray-600 text-2xl"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- 모달 본문 -->
      <div class="p-6">
        <!-- 비교 테이블 -->
        <div class="overflow-x-auto mb-6">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">지표</th>
                <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700 border" id="compare-col-1">영상 1</th>
                <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700 border" id="compare-col-2">영상 2</th>
                <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700 border" id="compare-col-3">영상 3</th>
              </tr>
            </thead>
            <tbody id="compare-table-body">
              <!-- 동적 생성 -->
            </tbody>
          </table>
        </div>
        
        <!-- 레이더 차트 -->
        <div class="bg-gray-50 rounded-xl p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-4 text-center">
            <i class="fas fa-chart-area text-green-600 mr-2"></i>
            성과 레이더 차트
          </h3>
          <div class="flex justify-center">
            <canvas id="compare-radar-chart" style="max-width: 500px; max-height: 500px;"></canvas>
          </div>
        </div>
        
        <!-- AI 비교 분석 -->
        <div class="mt-6">
          <button 
            id="generate-compare-ai-btn"
            class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center justify-center gap-2"
          >
            <i class="fas fa-robot"></i>
            AI 비교 분석 생성
          </button>
          
          <!-- AI 분석 결과 -->
          <div id="compare-ai-result" class="hidden mt-4 bg-white rounded-xl border p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4">
              <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>
              AI 비교 분석 결과
            </h3>
            <div id="compare-ai-content" class="prose max-w-none">
              <!-- 동적 생성 -->
            </div>
          </div>
        </div>
      </div>
      
      <!-- 모달 푸터 -->
      <div class="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
        <button 
          id="close-compare-modal-2" 
          class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          닫기
        </button>
      </div>
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

      </div> <!-- three-column-layout 닫기 -->
    </div> <!-- tab-market-explorer 닫기 -->

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

      <!-- ========================================
           Phase 6: 고급 분석 탭 (경쟁사 비교 + 트렌드 예측 + 대시보드)
           ======================================== -->
      <div id="tab-advanced-analytics" class="tab-content hidden">
        <div class="youtube-finder-main p-6">
          
          <!-- 섹션 헤더 -->
          <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">
              <i class="fas fa-rocket text-purple-500 mr-3"></i>
              고급 분석 & 인사이트
            </h1>
            <p class="text-gray-600">AI 기반 경쟁사 비교 분석과 트렌드 예측으로 데이터 기반 의사결정을 지원합니다</p>
          </div>

          <!-- 탭 네비게이션 (서브 탭) - 8개로 확장 -->
          <div class="bg-white rounded-xl shadow-sm border mb-6">
            <div class="flex border-b overflow-x-auto">
              <button 
                class="advanced-subtab flex-1 px-4 py-4 font-semibold transition border-b-2 border-purple-500 text-purple-600 whitespace-nowrap text-sm" 
                data-subtab="competitor"
              >
                <i class="fas fa-users mr-1"></i>경쟁사
              </button>
              <button 
                class="advanced-subtab flex-1 px-4 py-4 font-semibold text-gray-600 hover:text-gray-900 transition border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap text-sm" 
                data-subtab="prediction"
              >
                <i class="fas fa-chart-line mr-1"></i>트렌드
              </button>
              <button 
                class="advanced-subtab flex-1 px-4 py-4 font-semibold text-gray-600 hover:text-gray-900 transition border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap text-sm" 
                data-subtab="recommendation"
              >
                <i class="fas fa-star mr-1"></i>추천
              </button>
              <button 
                class="advanced-subtab flex-1 px-4 py-4 font-semibold text-gray-600 hover:text-gray-900 transition border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap text-sm" 
                data-subtab="simulator"
              >
                <i class="fas fa-calculator mr-1"></i>시뮬레이터
              </button>
              <button 
                class="advanced-subtab flex-1 px-4 py-4 font-semibold text-gray-600 hover:text-gray-900 transition border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap text-sm" 
                data-subtab="deep-analysis"
              >
                <i class="fas fa-microscope mr-1"></i>상세분석
              </button>
              <button 
                class="advanced-subtab flex-1 px-4 py-4 font-semibold text-gray-600 hover:text-gray-900 transition border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap text-sm" 
                data-subtab="growth"
              >
                <i class="fas fa-chart-area mr-1"></i>성장추적
              </button>
              <button 
                class="advanced-subtab flex-1 px-4 py-4 font-semibold text-gray-600 hover:text-gray-900 transition border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap text-sm" 
                data-subtab="ab-test"
              >
                <i class="fas fa-flask mr-1"></i>A/B테스트
              </button>
              <button 
                class="advanced-subtab flex-1 px-4 py-4 font-semibold text-gray-600 hover:text-gray-900 transition border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap text-sm" 
                data-subtab="pdf-report"
              >
                <i class="fas fa-file-pdf mr-1"></i>PDF보고서
              </button>
              <button 
                class="advanced-subtab flex-1 px-4 py-4 font-semibold text-gray-600 hover:text-gray-900 transition border-b-2 border-transparent hover:border-gray-300 whitespace-nowrap text-sm" 
                data-subtab="dashboard"
              >
                <i class="fas fa-tachometer-alt mr-1"></i>대시보드
              </button>
            </div>
          </div>

          <!-- 경쟁사 비교 분석 콘텐츠 -->
          <div id="subtab-competitor" class="advanced-subtab-content">
            <!-- 채널 입력 영역 -->
            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">
                <i class="fas fa-users mr-2 text-purple-500"></i>
                비교할 채널 입력 (최대 5개)
              </h3>
              <div class="space-y-3">
                <div class="flex gap-3" id="competitor-input-1">
                  <input 
                    type="text" 
                    placeholder="채널 1: @channelname 또는 채널 ID 입력"
                    class="competitor-channel-input flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div class="flex gap-3" id="competitor-input-2">
                  <input 
                    type="text" 
                    placeholder="채널 2: @channelname 또는 채널 ID 입력"
                    class="competitor-channel-input flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div class="flex gap-3" id="competitor-input-3">
                  <input 
                    type="text" 
                    placeholder="채널 3: @channelname 또는 채널 ID 입력 (선택)"
                    class="competitor-channel-input flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div class="flex gap-3" id="competitor-input-4">
                  <input 
                    type="text" 
                    placeholder="채널 4: @channelname 또는 채널 ID 입력 (선택)"
                    class="competitor-channel-input flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div class="flex gap-3" id="competitor-input-5">
                  <input 
                    type="text" 
                    placeholder="채널 5: @channelname 또는 채널 ID 입력 (선택)"
                    class="competitor-channel-input flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <button 
                id="compare-channels-btn"
                class="mt-4 w-full px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <i class="fas fa-chart-bar"></i>
                <span>채널 비교 분석 시작</span>
              </button>
            </div>

            <!-- 비교 결과 영역 -->
            <div id="competitor-results" class="hidden">
              <!-- 레이더 차트 -->
              <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">
                  <i class="fas fa-radar mr-2 text-purple-500"></i>
                  종합 지표 비교
                </h3>
                <div class="flex justify-center">
                  <canvas id="competitor-radar-chart" width="400" height="400"></canvas>
                </div>
              </div>

              <!-- 상세 지표 테이블 -->
              <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">
                  <i class="fas fa-table mr-2 text-purple-500"></i>
                  상세 지표 비교표
                </h3>
                <div class="overflow-x-auto">
                  <table id="competitor-table" class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-gray-50 border-b">
                        <th class="px-4 py-3 font-semibold text-gray-700">채널명</th>
                        <th class="px-4 py-3 font-semibold text-gray-700 text-right">구독자</th>
                        <th class="px-4 py-3 font-semibold text-gray-700 text-right">평균 조회수</th>
                        <th class="px-4 py-3 font-semibold text-gray-700 text-right">평균 성과도</th>
                        <th class="px-4 py-3 font-semibold text-gray-700 text-right">평균 좋아요율</th>
                        <th class="px-4 py-3 font-semibold text-gray-700 text-right">평균 댓글</th>
                        <th class="px-4 py-3 font-semibold text-gray-700 text-right">업로드 빈도</th>
                      </tr>
                    </thead>
                    <tbody id="competitor-table-body">
                      <!-- JavaScript로 동적 생성 -->
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 랭킹 카드 -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="bg-white rounded-xl shadow-sm border p-4">
                  <div class="flex items-center gap-3 mb-2">
                    <i class="fas fa-trophy text-yellow-500 text-2xl"></i>
                    <h4 class="font-semibold text-gray-700">조회수 1위</h4>
                  </div>
                  <p id="rank-views" class="text-lg font-bold text-gray-900">-</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border p-4">
                  <div class="flex items-center gap-3 mb-2">
                    <i class="fas fa-fire text-red-500 text-2xl"></i>
                    <h4 class="font-semibold text-gray-700">성과도 1위</h4>
                  </div>
                  <p id="rank-performance" class="text-lg font-bold text-gray-900">-</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border p-4">
                  <div class="flex items-center gap-3 mb-2">
                    <i class="fas fa-rocket text-blue-500 text-2xl"></i>
                    <h4 class="font-semibold text-gray-700">업로드 빈도 1위</h4>
                  </div>
                  <p id="rank-frequency" class="text-lg font-bold text-gray-900">-</p>
                </div>
              </div>
            </div>

            <!-- 로딩 상태 -->
            <div id="competitor-loading" class="hidden bg-white rounded-xl shadow-sm border p-8">
              <div class="flex flex-col items-center justify-center space-y-4">
                <div class="loading-spinner"></div>
                <div class="text-center">
                  <p class="text-lg font-semibold text-gray-900 mb-2">경쟁사 분석 중...</p>
                  <p class="text-sm text-gray-600">각 채널의 최근 50개 영상을 분석하고 있습니다</p>
                  <p class="text-xs text-gray-500 mt-2">최대 10초 소요됩니다</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 트렌드 예측 AI 콘텐츠 -->
          <div id="subtab-prediction" class="advanced-subtab-content hidden">
            <!-- 영상 URL 입력 -->
            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">
                <i class="fas fa-link mr-2 text-blue-500"></i>
                분석할 영상 URL 입력
              </h3>
              <div class="flex gap-3">
                <input 
                  type="text" 
                  id="prediction-video-url"
                  placeholder="https://youtube.com/watch?v=... 형식의 영상 URL 입력"
                  class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  id="predict-btn"
                  class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-2"
                >
                  <i class="fas fa-magic"></i>
                  <span>AI 예측 시작</span>
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>
                업로드된 지 24시간 이상 경과한 영상의 성과를 AI가 예측합니다
              </p>
            </div>

            <!-- 예측 결과 -->
            <div id="prediction-results" class="hidden">
              <!-- 예측 카드 그리드 -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-700">24시간 후 예측</h4>
                    <i class="fas fa-clock text-blue-500"></i>
                  </div>
                  <p id="predict-24h" class="text-2xl font-bold text-blue-600">-</p>
                  <p class="text-sm text-gray-500 mt-1">예상 조회수</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-700">7일 후 예측</h4>
                    <i class="fas fa-calendar-week text-green-500"></i>
                  </div>
                  <p id="predict-7d" class="text-2xl font-bold text-green-600">-</p>
                  <p class="text-sm text-gray-500 mt-1">예상 조회수</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-700">최종 예측</h4>
                    <i class="fas fa-flag-checkered text-purple-500"></i>
                  </div>
                  <p id="predict-final" class="text-2xl font-bold text-purple-600">-</p>
                  <p class="text-sm text-gray-500 mt-1">최종 예상 조회수</p>
                </div>
              </div>

              <!-- 성과도 예측 -->
              <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h4 class="font-semibold text-gray-700 mb-4">
                  <i class="fas fa-chart-pie mr-2 text-purple-500"></i>
                  예상 성과도
                </h4>
                <div class="flex items-center gap-4">
                  <div id="predict-performance-badge" class="badge badge-viral">-</div>
                  <div class="flex-1">
                    <p id="predict-performance-text" class="text-gray-700">-</p>
                    <p class="text-sm text-gray-500 mt-1">신뢰도: <span id="predict-confidence" class="font-semibold">-</span>%</p>
                  </div>
                </div>
              </div>

              <!-- AI 추천사항 -->
              <div class="bg-white rounded-xl shadow-sm border p-6">
                <h4 class="font-semibold text-gray-700 mb-4">
                  <i class="fas fa-lightbulb mr-2 text-yellow-500"></i>
                  AI 추천사항
                </h4>
                <div class="space-y-4">
                  <div>
                    <h5 class="font-semibold text-gray-700 mb-2">
                      <i class="fas fa-calendar-alt mr-2 text-blue-500"></i>최적 업로드 시간
                    </h5>
                    <p id="recommend-timing" class="text-gray-600">-</p>
                  </div>
                  <div>
                    <h5 class="font-semibold text-gray-700 mb-2">
                      <i class="fas fa-tags mr-2 text-green-500"></i>추천 키워드 TOP 10
                    </h5>
                    <div id="recommend-keywords" class="flex flex-wrap gap-2">
                      <!-- JavaScript로 동적 생성 -->
                    </div>
                  </div>
                  <div>
                    <h5 class="font-semibold text-gray-700 mb-2">
                      <i class="fas fa-video mr-2 text-purple-500"></i>권장 영상 길이
                    </h5>
                    <p id="recommend-duration" class="text-gray-600">-</p>
                  </div>
                  <div>
                    <h5 class="font-semibold text-gray-700 mb-2">
                      <i class="fas fa-image mr-2 text-red-500"></i>썸네일 개선 제안
                    </h5>
                    <p id="recommend-thumbnail" class="text-gray-600">-</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 로딩 상태 -->
            <div id="prediction-loading" class="hidden bg-white rounded-xl shadow-sm border p-8">
              <div class="flex flex-col items-center justify-center space-y-4">
                <div class="loading-spinner"></div>
                <div class="text-center">
                  <p class="text-lg font-semibold text-gray-900 mb-2">AI 예측 분석 중...</p>
                  <p class="text-sm text-gray-600">GPT-4를 활용하여 성과를 예측하고 있습니다</p>
                  <p class="text-xs text-gray-500 mt-2">최대 10초 소요됩니다</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 영상 추천 알고리즘 콘텐츠 -->
          <div id="subtab-recommendation" class="advanced-subtab-content hidden">
            <!-- 추천 모드 선택 -->
            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">
                <i class="fas fa-magic mr-2 text-yellow-500"></i>
                추천 모드 선택
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  class="recommend-mode-btn p-6 border-2 border-purple-500 bg-purple-50 rounded-lg hover:shadow-lg transition"
                  data-mode="performance"
                >
                  <i class="fas fa-trophy text-3xl text-purple-500 mb-3"></i>
                  <h4 class="font-bold text-gray-900 mb-2">성과도 기반</h4>
                  <p class="text-sm text-gray-600">높은 성과를 보이는 상위 영상 추천</p>
                </button>
                <button 
                  class="recommend-mode-btn p-6 border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 rounded-lg hover:shadow-lg transition"
                  data-mode="similarity"
                >
                  <i class="fas fa-link text-3xl text-blue-500 mb-3"></i>
                  <h4 class="font-bold text-gray-900 mb-2">유사도 기반</h4>
                  <p class="text-sm text-gray-600">첫 번째 영상과 유사한 콘텐츠 추천</p>
                </button>
                <button 
                  class="recommend-mode-btn p-6 border-2 border-transparent hover:border-green-500 hover:bg-green-50 rounded-lg hover:shadow-lg transition"
                  data-mode="niche"
                >
                  <i class="fas fa-bullseye text-3xl text-green-500 mb-3"></i>
                  <h4 class="font-bold text-gray-900 mb-2">틈새 전략</h4>
                  <p class="text-sm text-gray-600">낮은 경쟁에서 높은 성과 영상 추천</p>
                </button>
              </div>
              <button 
                id="generate-recommendations-btn"
                class="mt-6 w-full px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <i class="fas fa-magic"></i>
                <span>추천 영상 생성</span>
              </button>
              <p class="text-sm text-gray-500 mt-2 text-center">
                <i class="fas fa-info-circle mr-1"></i>
                먼저 "마켓 탐색 & 분석" 탭에서 영상을 검색해주세요
              </p>
            </div>

            <!-- 추천 결과 -->
            <div id="recommendation-results" class="hidden">
              <!-- 추천 요약 -->
              <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
                <div class="flex items-center gap-4">
                  <i class="fas fa-info-circle text-3xl text-purple-500"></i>
                  <div class="flex-1">
                    <h4 class="font-bold text-gray-900 mb-1" id="recommendation-summary-title">-</h4>
                    <p class="text-gray-600" id="recommendation-summary-desc">-</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-gray-600">전체 영상</p>
                    <p id="recommendation-total" class="text-2xl font-bold text-purple-600">-</p>
                  </div>
                </div>
              </div>

              <!-- 추천 영상 목록 -->
              <div class="bg-white rounded-xl shadow-sm border p-6">
                <h4 class="font-semibold text-gray-700 mb-4">
                  <i class="fas fa-list mr-2 text-purple-500"></i>
                  추천 영상 TOP 10
                </h4>
                <div class="space-y-3" id="recommendation-list">
                  <!-- JavaScript로 동적 생성 -->
                </div>
              </div>
            </div>

            <!-- 로딩 상태 -->
            <div id="recommendation-loading" class="hidden bg-white rounded-xl shadow-sm border p-8">
              <div class="flex flex-col items-center justify-center space-y-4">
                <div class="loading-spinner"></div>
                <div class="text-center">
                  <p class="text-lg font-semibold text-gray-900 mb-2">추천 영상 생성 중...</p>
                  <p class="text-sm text-gray-600">데이터를 분석하여 최적의 영상을 추천하고 있습니다</p>
                  <p class="text-xs text-gray-500 mt-2">1-2초 소요됩니다</p>
                </div>
              </div>
            </div>

            <!-- 빈 상태 -->
            <div id="recommendation-empty" class="bg-white rounded-xl shadow-sm border p-12 text-center">
              <i class="fas fa-search text-6xl text-gray-300 mb-4"></i>
              <h3 class="text-xl font-bold text-gray-700 mb-2">영상 데이터가 없습니다</h3>
              <p class="text-gray-500">먼저 "마켓 탐색 & 분석" 탭에서 키워드를 검색하세요</p>
            </div>
          </div>

          <!-- 성과 시뮬레이터 콘텐츠 -->
          <div id="subtab-simulator" class="advanced-subtab-content hidden">
            <!-- 입력 폼 -->
            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">
                <i class="fas fa-cog mr-2 text-blue-500"></i>
                채널 정보 입력
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- 구독자 수 -->
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    <i class="fas fa-users mr-1 text-red-500"></i>
                    현재 구독자 수 <span class="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    id="sim-subscribers"
                    placeholder="예: 5000"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <!-- 업로드 빈도 -->
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    <i class="fas fa-calendar-alt mr-1 text-green-500"></i>
                    월 업로드 횟수 <span class="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    id="sim-upload-frequency"
                    placeholder="예: 8 (주 2회)"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <!-- 평균 시청 시간 -->
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    <i class="fas fa-clock mr-1 text-purple-500"></i>
                    평균 시청 시간 (초)
                  </label>
                  <input 
                    type="number" 
                    id="sim-watch-time"
                    placeholder="예: 240 (4분)"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p class="text-xs text-gray-500 mt-1">기본값: 180초 (3분)</p>
                </div>

                <!-- 평균 좋아요율 -->
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    <i class="fas fa-thumbs-up mr-1 text-blue-500"></i>
                    평균 좋아요율 (%)
                  </label>
                  <input 
                    type="number" 
                    id="sim-like-rate"
                    placeholder="예: 5"
                    step="0.1"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p class="text-xs text-gray-500 mt-1">기본값: 3%</p>
                </div>

                <!-- 카테고리 -->
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    <i class="fas fa-tag mr-1 text-yellow-500"></i>
                    카테고리
                  </label>
                  <select 
                    id="sim-category"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택하지 않음</option>
                    <option value="10">음악</option>
                    <option value="20">게임</option>
                    <option value="24">엔터테인먼트</option>
                    <option value="22">브이로그</option>
                    <option value="27">교육</option>
                    <option value="28">과학기술</option>
                  </select>
                </div>

                <!-- 시뮬레이션 기간 -->
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    <i class="fas fa-hourglass-half mr-1 text-orange-500"></i>
                    시뮬레이션 기간 (일)
                  </label>
                  <input 
                    type="number" 
                    id="sim-period"
                    placeholder="예: 30"
                    value="30"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button 
                id="run-simulation-btn"
                class="mt-6 w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <i class="fas fa-play"></i>
                <span>시뮬레이션 실행</span>
              </button>
            </div>

            <!-- 시뮬레이션 결과 -->
            <div id="simulation-results" class="hidden">
              <!-- 예측 카드 그리드 -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-700">영상당 평균 조회수</h4>
                    <i class="fas fa-eye text-blue-500 text-2xl"></i>
                  </div>
                  <p id="sim-avg-views" class="text-3xl font-bold text-blue-600">-</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-700">총 조회수</h4>
                    <i class="fas fa-chart-line text-green-500 text-2xl"></i>
                  </div>
                  <p id="sim-total-views" class="text-3xl font-bold text-green-600">-</p>
                </div>
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-700">예상 수익</h4>
                    <i class="fas fa-won-sign text-purple-500 text-2xl"></i>
                  </div>
                  <p id="sim-revenue" class="text-3xl font-bold text-purple-600">-</p>
                </div>
              </div>

              <!-- 성장 예측 -->
              <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h4 class="font-semibold text-gray-700 mb-4">
                  <i class="fas fa-chart-area mr-2 text-green-500"></i>
                  성장 예측
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p class="text-sm text-gray-600 mb-1">현재 구독자</p>
                    <p id="sim-current-subs" class="text-2xl font-bold text-gray-900">-</p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-600 mb-1">신규 구독자</p>
                    <p id="sim-new-subs" class="text-2xl font-bold text-green-600">-</p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-600 mb-1">최종 구독자</p>
                    <p id="sim-final-subs" class="text-2xl font-bold text-blue-600">-</p>
                  </div>
                </div>
                <div class="mt-4 flex items-center gap-3">
                  <span class="text-sm text-gray-600">성장 속도:</span>
                  <div id="sim-growth-badge" class="badge badge-viral">-</div>
                  <span id="sim-growth-percentage" class="font-semibold text-gray-900">-</span>
                </div>
              </div>

              <!-- 분석 breakdown -->
              <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h4 class="font-semibold text-gray-700 mb-4">
                  <i class="fas fa-lightbulb mr-2 text-yellow-500"></i>
                  성과 요인 분석
                </h4>
                <div class="space-y-3">
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span class="text-gray-700">시청 시간 영향</span>
                    <span id="sim-factor-watch" class="px-3 py-1 rounded-full text-sm font-semibold">-</span>
                  </div>
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span class="text-gray-700">좋아요율 영향</span>
                    <span id="sim-factor-like" class="px-3 py-1 rounded-full text-sm font-semibold">-</span>
                  </div>
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span class="text-gray-700">업로드 빈도 영향</span>
                    <span id="sim-factor-upload" class="px-3 py-1 rounded-full text-sm font-semibold">-</span>
                  </div>
                  <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span class="text-gray-700">알고리즘 부스트</span>
                    <span id="sim-algorithm-boost" class="text-lg font-bold text-blue-600">-</span>
                  </div>
                </div>
              </div>

              <!-- AI 추천사항 -->
              <div class="bg-white rounded-xl shadow-sm border p-6">
                <h4 class="font-semibold text-gray-700 mb-4">
                  <i class="fas fa-robot mr-2 text-purple-500"></i>
                  개선 추천사항
                </h4>
                <div id="sim-recommendations" class="space-y-2">
                  <!-- JavaScript로 동적 생성 -->
                </div>
              </div>
            </div>

            <!-- 로딩 상태 -->
            <div id="simulation-loading" class="hidden bg-white rounded-xl shadow-sm border p-8">
              <div class="flex flex-col items-center justify-center space-y-4">
                <div class="loading-spinner"></div>
                <div class="text-center">
                  <p class="text-lg font-semibold text-gray-900 mb-2">시뮬레이션 실행 중...</p>
                  <p class="text-sm text-gray-600">채널 성과를 예측하고 있습니다</p>
                  <p class="text-xs text-gray-500 mt-2">1-2초 소요됩니다</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 영상 상세 분석 콘텐츠 -->
          <div id="subtab-deep-analysis" class="advanced-subtab-content hidden">
            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">
                <i class="fas fa-microscope mr-2 text-blue-500"></i>
                영상 URL 입력
              </h3>
              <div class="flex gap-3">
                <input 
                  type="text" 
                  id="deep-analysis-url"
                  placeholder="https://youtube.com/watch?v=..."
                  class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  id="deep-analysis-btn"
                  class="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                >
                  <i class="fas fa-search mr-2"></i>분석 시작
                </button>
              </div>
            </div>
            <div id="deep-analysis-results" class="hidden">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <h4 class="font-semibold text-gray-700 mb-4">SWOT 분석</h4>
                  <div class="space-y-3">
                    <div><strong>강점:</strong> <span id="swot-strengths">-</span></div>
                    <div><strong>약점:</strong> <span id="swot-weaknesses">-</span></div>
                    <div><strong>기회:</strong> <span id="swot-opportunities">-</span></div>
                    <div><strong>위협:</strong> <span id="swot-threats">-</span></div>
                  </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <h4 class="font-semibold text-gray-700 mb-4">제목 분석</h4>
                  <div id="title-analysis">-</div>
                </div>
              </div>
            </div>
            <div id="deep-analysis-loading" class="hidden bg-white rounded-xl shadow-sm border p-8">
              <div class="flex flex-col items-center justify-center space-y-4">
                <div class="loading-spinner"></div>
                <p class="text-lg font-semibold text-gray-900">AI 분석 중...</p>
              </div>
            </div>
          </div>

          <!-- 채널 성장 추적 콘텐츠 -->
          <div id="subtab-growth" class="advanced-subtab-content hidden">
            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">
                <i class="fas fa-chart-area mr-2 text-green-500"></i>
                채널 URL 입력
              </h3>
              <div class="flex gap-3">
                <input 
                  type="text" 
                  id="growth-channel-url"
                  placeholder="@channelname 또는 채널 URL"
                  class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select id="growth-period" class="px-4 py-3 border border-gray-300 rounded-lg">
                  <option value="7">최근 7일</option>
                  <option value="30" selected>최근 30일</option>
                  <option value="90">최근 90일</option>
                </select>
                <button 
                  id="growth-track-btn"
                  class="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                >
                  <i class="fas fa-play mr-2"></i>추적 시작
                </button>
              </div>
            </div>
            <div id="growth-results" class="hidden">
              <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h4 class="font-semibold text-gray-700 mb-4">성장 추이</h4>
                <canvas id="growth-chart"></canvas>
              </div>
            </div>
            <div id="growth-loading" class="hidden bg-white rounded-xl shadow-sm border p-8">
              <div class="flex flex-col items-center justify-center space-y-4">
                <div class="loading-spinner"></div>
                <p class="text-lg font-semibold text-gray-900">데이터 수집 중...</p>
              </div>
            </div>
          </div>

          <!-- A/B 테스트 시뮬레이터 콘텐츠 -->
          <div id="subtab-ab-test" class="advanced-subtab-content hidden">
            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h3 class="text-lg font-bold text-gray-800 mb-4">
                <i class="fas fa-flask mr-2 text-purple-500"></i>
                A/B 테스트 설정
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">변형 A 제목</label>
                  <input 
                    type="text" 
                    id="ab-title-a"
                    placeholder="리액트 완벽 가이드 2024"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">변형 B 제목</label>
                  <input 
                    type="text" 
                    id="ab-title-b"
                    placeholder="리액트 완전정복 초급부터 고급까지"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <button 
                id="ab-test-btn"
                class="mt-6 w-full px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
              >
                <i class="fas fa-play mr-2"></i>A/B 테스트 실행
              </button>
            </div>
            <div id="ab-test-results" class="hidden">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <h4 class="font-semibold text-gray-700 mb-4">변형 A</h4>
                  <div id="ab-result-a">-</div>
                </div>
                <div class="bg-white rounded-xl shadow-sm border p-6">
                  <h4 class="font-semibold text-gray-700 mb-4">변형 B</h4>
                  <div id="ab-result-b">-</div>
                </div>
              </div>
              <div class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mt-6">
                <h4 class="font-bold text-gray-900 mb-2">🏆 테스트 결과</h4>
                <p id="ab-winner" class="text-lg">-</p>
              </div>
            </div>
            <div id="ab-test-loading" class="hidden bg-white rounded-xl shadow-sm border p-8">
              <div class="flex flex-col items-center justify-center space-y-4">
                <div class="loading-spinner"></div>
                <p class="text-lg font-semibold text-gray-900">시뮬레이션 실행 중...</p>
              </div>
            </div>
          </div>

          <!-- Phase 7: PDF 보고서 생성 콘텐츠 -->
          <div id="subtab-pdf-report" class="advanced-subtab-content hidden">
            <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-200">
              <h3 class="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                <i class="fas fa-file-pdf text-red-500 mr-3"></i>
                PDF 보고서 생성
              </h3>
              <p class="text-gray-600 text-sm">
                현재 분석 결과를 종합하여 전문적인 PDF 보고서를 생성합니다.
              </p>
            </div>

            <!-- 보고서 설정 -->
            <div class="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h4 class="font-semibold text-gray-700 mb-4 flex items-center">
                <i class="fas fa-cog mr-2 text-purple-600"></i>
                보고서 설정
              </h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <!-- 보고서 제목 -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    보고서 제목
                  </label>
                  <input 
                    type="text" 
                    id="pdf-report-title"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                    placeholder="예: 2024년 1월 YouTube 성과 분석 보고서"
                    value="YouTube 분석 보고서"
                  />
                </div>
                
                <!-- 채널명 -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    채널명
                  </label>
                  <input 
                    type="text" 
                    id="pdf-channel-name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                    placeholder="채널 이름 입력"
                  />
                </div>
              </div>

              <!-- 포함할 섹션 선택 -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  <i class="fas fa-list-check mr-2"></i>포함할 분석 섹션
                </label>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <!-- 경쟁사 비교 -->
                  <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition border border-gray-200">
                    <input 
                      type="checkbox" 
                      class="pdf-section-checkbox w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" 
                      data-section="competitor"
                      checked
                    />
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      <i class="fas fa-users text-blue-500 mr-2"></i>경쟁사 비교
                    </span>
                  </label>
                  
                  <!-- 트렌드 예측 -->
                  <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition border border-gray-200">
                    <input 
                      type="checkbox" 
                      class="pdf-section-checkbox w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" 
                      data-section="prediction"
                      checked
                    />
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      <i class="fas fa-chart-line text-green-500 mr-2"></i>트렌드 예측
                    </span>
                  </label>
                  
                  <!-- 영상 추천 -->
                  <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition border border-gray-200">
                    <input 
                      type="checkbox" 
                      class="pdf-section-checkbox w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" 
                      data-section="recommendation"
                      checked
                    />
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      <i class="fas fa-star text-yellow-500 mr-2"></i>영상 추천
                    </span>
                  </label>
                  
                  <!-- 성과 시뮬레이터 -->
                  <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition border border-gray-200">
                    <input 
                      type="checkbox" 
                      class="pdf-section-checkbox w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" 
                      data-section="simulator"
                      checked
                    />
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      <i class="fas fa-calculator text-purple-500 mr-2"></i>시뮬레이터
                    </span>
                  </label>
                  
                  <!-- 영상 상세 분석 -->
                  <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition border border-gray-200">
                    <input 
                      type="checkbox" 
                      class="pdf-section-checkbox w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" 
                      data-section="deep-analysis"
                    />
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      <i class="fas fa-microscope text-indigo-500 mr-2"></i>상세 분석
                    </span>
                  </label>
                  
                  <!-- 채널 성장 추적 -->
                  <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition border border-gray-200">
                    <input 
                      type="checkbox" 
                      class="pdf-section-checkbox w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" 
                      data-section="growth"
                    />
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      <i class="fas fa-chart-area text-teal-500 mr-2"></i>성장 추적
                    </span>
                  </label>
                  
                  <!-- A/B 테스트 -->
                  <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition border border-gray-200">
                    <input 
                      type="checkbox" 
                      class="pdf-section-checkbox w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" 
                      data-section="ab-test"
                    />
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      <i class="fas fa-flask text-orange-500 mr-2"></i>A/B 테스트
                    </span>
                  </label>
                  
                  <!-- 대시보드 -->
                  <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition border border-gray-200">
                    <input 
                      type="checkbox" 
                      class="pdf-section-checkbox w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500" 
                      data-section="dashboard"
                      checked
                    />
                    <span class="ml-3 text-sm font-medium text-gray-700">
                      <i class="fas fa-chart-pie text-pink-500 mr-2"></i>대시보드
                    </span>
                  </label>
                </div>
              </div>

              <!-- 버튼 -->
              <div class="flex gap-3">
                <button 
                  id="btn-generate-pdf"
                  class="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-md hover:shadow-lg"
                >
                  <i class="fas fa-file-pdf mr-2"></i>PDF 보고서 생성
                </button>
                <button 
                  id="btn-preview-pdf"
                  class="px-6 py-3 border-2 border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition"
                >
                  <i class="fas fa-eye mr-2"></i>미리보기
                </button>
              </div>
            </div>

            <!-- 로딩 상태 -->
            <div id="pdf-loading" class="hidden bg-white rounded-xl shadow-sm border p-8 text-center">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
              <p class="text-gray-600 font-medium">PDF 보고서 생성 중...</p>
              <p class="text-sm text-gray-500 mt-2">차트와 데이터를 수집하고 있습니다. 잠시만 기다려주세요.</p>
            </div>

            <!-- 결과 (성공) -->
            <div id="pdf-result" class="hidden bg-white rounded-xl shadow-sm border overflow-hidden">
              <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                      <i class="fas fa-check text-white text-xl"></i>
                    </div>
                    <div>
                      <h4 class="font-bold text-gray-800 text-lg">PDF 보고서 생성 완료!</h4>
                      <p class="text-sm text-gray-600 mt-1">보고서가 성공적으로 생성되었습니다.</p>
                    </div>
                  </div>
                  <button id="btn-download-pdf" class="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition shadow-md hover:shadow-lg">
                    <i class="fas fa-download mr-2"></i>다운로드
                  </button>
                </div>
              </div>
              
              <!-- 보고서 정보 -->
              <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="flex items-center p-4 bg-gray-50 rounded-lg">
                    <i class="fas fa-file-pdf text-red-500 text-2xl mr-3"></i>
                    <div>
                      <p class="text-xs text-gray-500">파일 형식</p>
                      <p class="font-semibold text-gray-700">PDF</p>
                    </div>
                  </div>
                  <div class="flex items-center p-4 bg-gray-50 rounded-lg">
                    <i class="fas fa-file-lines text-blue-500 text-2xl mr-3"></i>
                    <div>
                      <p class="text-xs text-gray-500">총 페이지</p>
                      <p id="pdf-page-count" class="font-semibold text-gray-700">-</p>
                    </div>
                  </div>
                  <div class="flex items-center p-4 bg-gray-50 rounded-lg">
                    <i class="fas fa-clock text-purple-500 text-2xl mr-3"></i>
                    <div>
                      <p class="text-xs text-gray-500">생성 시간</p>
                      <p id="pdf-generated-time" class="font-semibold text-gray-700">-</p>
                    </div>
                  </div>
                </div>

                <!-- 포함된 섹션 -->
                <div class="mt-6">
                  <h5 class="font-semibold text-gray-700 mb-3 flex items-center">
                    <i class="fas fa-list mr-2 text-purple-600"></i>
                    포함된 분석 섹션
                  </h5>
                  <div id="pdf-included-sections" class="flex flex-wrap gap-2">
                    <!-- 동적 생성 -->
                  </div>
                </div>
              </div>
            </div>

            <!-- 빈 상태 -->
            <div id="pdf-empty" class="bg-white rounded-xl shadow-sm border p-12 text-center">
              <div class="text-gray-400 mb-4">
                <i class="fas fa-file-pdf text-6xl"></i>
              </div>
              <h4 class="font-semibold text-gray-700 mb-2">보고서를 생성해보세요</h4>
              <p class="text-sm text-gray-500 mb-4">위에서 설정을 완료하고 'PDF 보고서 생성' 버튼을 클릭하세요.</p>
              <div class="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div class="flex items-center">
                  <i class="fas fa-check-circle text-green-500 mr-2"></i>
                  차트 포함
                </div>
                <div class="flex items-center">
                  <i class="fas fa-check-circle text-green-500 mr-2"></i>
                  데이터 요약
                </div>
                <div class="flex items-center">
                  <i class="fas fa-check-circle text-green-500 mr-2"></i>
                  AI 인사이트
                </div>
              </div>
            </div>
          </div>

          <!-- 대시보드 콘텐츠 -->
          <div id="subtab-dashboard" class="advanced-subtab-content hidden">
            <!-- 차트 그리드 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <!-- 조회수 분포 히스토그램 -->
              <div class="bg-white rounded-xl shadow-sm border p-6">
                <h4 class="font-semibold text-gray-700 mb-4">
                  <i class="fas fa-chart-bar mr-2 text-blue-500"></i>
                  조회수 분포
                </h4>
                <canvas id="dashboard-views-chart"></canvas>
              </div>

              <!-- 성과도 파이 차트 -->
              <div class="bg-white rounded-xl shadow-sm border p-6">
                <h4 class="font-semibold text-gray-700 mb-4">
                  <i class="fas fa-chart-pie mr-2 text-purple-500"></i>
                  성과도 분포
                </h4>
                <canvas id="dashboard-performance-chart"></canvas>
              </div>

              <!-- 시계열 라인 차트 -->
              <div class="bg-white rounded-xl shadow-sm border p-6 lg:col-span-2">
                <h4 class="font-semibold text-gray-700 mb-4">
                  <i class="fas fa-chart-line mr-2 text-green-500"></i>
                  업로드 추이 (최근 30일)
                </h4>
                <canvas id="dashboard-timeline-chart"></canvas>
              </div>
            </div>

            <!-- TOP 10 리더보드 -->
            <div class="bg-white rounded-xl shadow-sm border p-6">
              <h4 class="font-semibold text-gray-700 mb-4">
                <i class="fas fa-trophy mr-2 text-yellow-500"></i>
                성과 리더보드 TOP 10
              </h4>
              <div class="space-y-2" id="dashboard-leaderboard">
                <!-- JavaScript로 동적 생성 -->
              </div>
            </div>

            <!-- 빈 상태 -->
            <div id="dashboard-empty" class="text-center py-12">
              <i class="fas fa-chart-line text-6xl text-gray-300 mb-4"></i>
              <h3 class="text-xl font-bold text-gray-700 mb-2">데이터 없음</h3>
              <p class="text-gray-500">먼저 "마켓 탐색 & 분석" 탭에서 영상을 검색하세요</p>
            </div>
          </div>

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
        } else if (tab === 'channel-analysis') {
          document.getElementById('tab-channel-analysis')?.classList.remove('hidden');
        } else if (tab === 'content-strategy') {
          document.getElementById('tab-content-strategy')?.classList.remove('hidden');
        } else if (tab === 'performance-tracking') {
          document.getElementById('tab-performance-tracking')?.classList.remove('hidden');
        } else if (tab === 'advanced-analytics') {
          document.getElementById('tab-advanced-analytics')?.classList.remove('hidden');
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
