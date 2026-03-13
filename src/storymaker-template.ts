// 스토리 메이커 페이지 템플릿
import { header } from './components/header';

export function storymakerTemplate() {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>스토리 메이커 - 마케팅허브 AI 스튜디오</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    /* ========================================
       스토리 메이커 3단 레이아웃
       ======================================== */

    /* 3단 레이아웃 컨테이너 (서브네비 없으므로 헤더만 제외) */
    .sm-layout {
      display: flex;
      height: calc(100vh - var(--header-height, 56px));
      overflow: hidden;
      max-width: 100%;
      margin: 0;
    }

    /* 좌측 패널: 프로젝트 목록 + Step 네비 */
    .sm-left-panel {
      width: 280px;
      background: #ffffff;
      border-right: 1px solid #e5e7eb;
      overflow-y: auto;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
    }

    .sm-left-panel::-webkit-scrollbar {
      width: 6px;
    }

    .sm-left-panel::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    /* 중앙 메인 영역 */
    .sm-main-content {
      flex: 1;
      overflow-y: auto;
      background: #f9fafb;
      padding: 24px;
    }

    .sm-main-content::-webkit-scrollbar {
      width: 6px;
    }

    .sm-main-content::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    /* 우측 프리뷰 패널 */
    .sm-right-panel {
      width: 380px;
      background: #ffffff;
      border-left: 1px solid #e5e7eb;
      overflow-y: auto;
      flex-shrink: 0;
    }

    .sm-right-panel::-webkit-scrollbar {
      width: 6px;
    }

    .sm-right-panel::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    /* ========================================
       좌측 패널 스타일
       ======================================== */

    .sm-panel-header {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
    }

    .sm-new-project-btn {
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .sm-new-project-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    /* 프로젝트 목록 */
    .sm-project-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .sm-project-item {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .sm-project-item:hover {
      background: #f3f4f6;
    }

    .sm-project-item.active {
      background: #ede9fe;
      border: 1px solid #c4b5fd;
    }

    .sm-project-item-info {
      flex: 1;
      min-width: 0;
    }

    .sm-project-item-name {
      font-size: 13px;
      font-weight: 600;
      color: #1f2937;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sm-project-item-date {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 2px;
    }

    .sm-project-item-delete {
      background: none;
      border: none;
      color: #d1d5db;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      font-size: 12px;
      transition: color 0.15s;
      flex-shrink: 0;
    }

    .sm-project-item-delete:hover {
      color: #ef4444;
    }

    /* 구분선 */
    .sm-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 4px 8px;
    }

    /* Step 네비게이션 */
    .sm-step-nav {
      padding: 8px;
      border-top: 1px solid #e5e7eb;
    }

    .sm-step-nav-title {
      font-size: 11px;
      font-weight: 700;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 12px 4px;
    }

    .sm-step-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 13px;
      color: #6b7280;
    }

    .sm-step-item:hover {
      background: #f3f4f6;
    }

    .sm-step-item.active {
      background: #ede9fe;
      color: #7c3aed;
      font-weight: 600;
    }

    .sm-step-item.completed {
      color: #059669;
    }

    .sm-step-item.locked {
      color: #d1d5db;
      cursor: not-allowed;
    }

    .sm-step-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      background: #e5e7eb;
      color: #6b7280;
      flex-shrink: 0;
    }

    .sm-step-item.active .sm-step-number {
      background: #7c3aed;
      color: white;
    }

    .sm-step-item.completed .sm-step-number {
      background: #059669;
      color: white;
    }

    /* 하단 크레딧 */
    .sm-credits-info {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      font-size: 12px;
      color: #6b7280;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sm-credits-count {
      font-weight: 700;
      color: #7c3aed;
    }

    /* ========================================
       메인 영역 스타일
       ======================================== */

    /* 환영 화면 */
    .sm-welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: #6b7280;
    }

    .sm-welcome-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .sm-welcome-title {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .sm-welcome-desc {
      font-size: 14px;
      color: #9ca3af;
      max-width: 400px;
      line-height: 1.6;
    }

    /* Step 컨테이너 */
    .sm-step-container {
      display: none;
    }

    .sm-step-container.active {
      display: block;
    }

    .sm-step-header {
      margin-bottom: 24px;
    }

    .sm-step-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: #ede9fe;
      color: #7c3aed;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .sm-step-title {
      font-size: 22px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 4px;
    }

    .sm-step-desc {
      font-size: 14px;
      color: #6b7280;
    }

    /* 폼 스타일 */
    .sm-form-group {
      margin-bottom: 20px;
    }

    .sm-form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }

    .sm-form-label .required {
      color: #ef4444;
      margin-left: 2px;
    }

    .sm-form-label .hint {
      font-weight: 400;
      color: #9ca3af;
      font-size: 12px;
      margin-left: 4px;
    }

    .sm-form-input,
    .sm-form-select,
    .sm-form-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      color: #1f2937;
      background: #ffffff;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .sm-form-input:focus,
    .sm-form-select:focus,
    .sm-form-textarea:focus {
      outline: none;
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
    }

    .sm-form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .sm-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* 라디오 & 체크박스 그룹 */
    .sm-option-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .sm-option-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 13px;
      color: #4b5563;
    }

    .sm-option-item:hover {
      border-color: #7c3aed;
      background: #faf5ff;
    }

    .sm-option-item.selected {
      border-color: #7c3aed;
      background: #ede9fe;
      color: #7c3aed;
      font-weight: 600;
    }

    .sm-option-item input[type="radio"],
    .sm-option-item input[type="checkbox"] {
      display: none;
    }

    /* 토글 스위치 */
    .sm-toggle-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
    }

    .sm-toggle-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    .sm-toggle {
      position: relative;
      width: 44px;
      height: 24px;
      cursor: pointer;
    }

    .sm-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .sm-toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #d1d5db;
      border-radius: 12px;
      transition: background 0.2s;
    }

    .sm-toggle-slider::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      left: 2px;
      top: 2px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }

    .sm-toggle input:checked + .sm-toggle-slider {
      background: #7c3aed;
    }

    .sm-toggle input:checked + .sm-toggle-slider::before {
      transform: translateX(20px);
    }

    /* Step 이동 버튼 */
    .sm-step-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .sm-btn-prev {
      padding: 10px 20px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: white;
      color: #6b7280;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sm-btn-prev:hover {
      background: #f3f4f6;
    }

    .sm-btn-next {
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sm-btn-next:hover {
      opacity: 0.9;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    /* 자동저장 인디케이터 */
    .sm-autosave-indicator {
      font-size: 12px;
      color: #9ca3af;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sm-autosave-indicator.saving {
      color: #f59e0b;
    }

    .sm-autosave-indicator.saved {
      color: #059669;
    }

    /* ========================================
       우측 패널 스타일
       ======================================== */

    .sm-preview-header {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      font-weight: 700;
      color: #1f2937;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sm-preview-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: calc(100% - 52px);
      color: #9ca3af;
      font-size: 14px;
      text-align: center;
      padding: 24px;
    }

    .sm-preview-body {
      padding: 16px;
    }

    .sm-preview-section {
      margin-bottom: 16px;
    }

    .sm-preview-section-title {
      font-size: 11px;
      font-weight: 700;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .sm-preview-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px solid #f3f4f6;
    }

    .sm-preview-item-label {
      color: #6b7280;
    }

    .sm-preview-item-value {
      color: #1f2937;
      font-weight: 500;
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }

    .sm-preview-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .sm-preview-tag {
      padding: 2px 8px;
      background: #f3f4f6;
      border-radius: 4px;
      font-size: 11px;
      color: #6b7280;
    }

    /* ========================================
       반응형
       ======================================== */
    @media (max-width: 1024px) {
      .sm-right-panel {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .sm-left-panel {
        display: none;
      }

      .sm-layout {
        height: calc(100vh - var(--header-height, 56px));
      }
    }

    /* 카드 스타일 (Step 내 섹션 구분) */
    .sm-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      margin-bottom: 20px;
    }

    .sm-card-title {
      font-size: 15px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  </style>

  ${header}
</head>
<body data-page="storymaker">

  <!-- 3단 레이아웃 -->
  <div class="sm-layout">

    <!-- ========== 좌측 패널 ========== -->
    <div class="sm-left-panel">

      <!-- 새 프로젝트 버튼 -->
      <div class="sm-panel-header">
        <button class="sm-new-project-btn" onclick="smCreateProject()">
          <i class="fas fa-plus"></i>
          새 프로젝트
        </button>
      </div>

      <!-- 프로젝트 목록 -->
      <div class="sm-project-list" id="sm-project-list">
        <!-- JS로 렌더링 -->
        <div style="padding: 24px; text-align: center; color: #9ca3af; font-size: 13px;">
          <i class="fas fa-spinner fa-spin" style="margin-bottom: 8px; font-size: 20px; display: block;"></i>
          불러오는 중...
        </div>
      </div>

      <!-- 구분선 -->
      <div class="sm-divider"></div>

      <!-- Step 네비게이션 (프로젝트 선택 시 표시) -->
      <div class="sm-step-nav" id="sm-step-nav" style="display: none;">
        <div class="sm-step-nav-title">작업 단계</div>
        <div class="sm-step-item active" data-step="1" onclick="smSwitchStep(1)">
          <div class="sm-step-number">1</div>
          <span>기획 · 수집</span>
        </div>
        <div class="sm-step-item" data-step="2" onclick="smSwitchStep(2)">
          <div class="sm-step-number">2</div>
          <span>포맷 설정</span>
        </div>
        <div class="sm-step-item locked" data-step="3" onclick="smSwitchStep(3)">
          <div class="sm-step-number">3</div>
          <span>스토리보드 생성</span>
        </div>
        <div class="sm-step-item locked" data-step="4" onclick="smSwitchStep(4)">
          <div class="sm-step-number">4</div>
          <span>장면 편집</span>
        </div>
        <div class="sm-step-item locked" data-step="5" onclick="smSwitchStep(5)">
          <div class="sm-step-number">5</div>
          <span>이미지 · 음악</span>
        </div>
        <div class="sm-step-item locked" data-step="6" onclick="smSwitchStep(6)">
          <div class="sm-step-number">6</div>
          <span>최종 출력</span>
        </div>
      </div>

      <!-- 하단 크레딧 잔여 -->
      <div class="sm-credits-info">
        <i class="fas fa-coins"></i>
        크레딧: <span class="sm-credits-count" id="sm-credits-count">-</span>
      </div>

    </div>

    <!-- ========== 메인 영역 ========== -->
    <div class="sm-main-content">

      <!-- 환영 화면 (프로젝트 미선택 시) -->
      <div class="sm-welcome" id="sm-welcome">
        <div class="sm-welcome-icon">🎬</div>
        <div class="sm-welcome-title">스토리 메이커</div>
        <div class="sm-welcome-desc">
          AI가 영상 콘텐츠의 기획부터 스토리보드, 이미지, 나레이션까지<br>
          한 번에 만들어 드립니다.<br><br>
          왼쪽에서 <strong>새 프로젝트</strong>를 만들어 시작하세요.
        </div>
      </div>

      <!-- ===== Step 1: 기획 · 수집 ===== -->
      <div class="sm-step-container" id="sm-step-1">
        <div class="sm-step-header">
          <div class="sm-step-badge"><i class="fas fa-lightbulb"></i> Step 1</div>
          <div class="sm-step-title">기획 · 수집</div>
          <div class="sm-step-desc">프로젝트의 기본 정보와 핵심 아이디어를 입력하세요.</div>
        </div>

        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-info-circle" style="color: #7c3aed;"></i> 기본 정보</div>

          <div class="sm-form-group">
            <label class="sm-form-label">프로젝트 이름 <span class="required">*</span></label>
            <input type="text" class="sm-form-input" id="sm-project-name" placeholder="예: 봄맞이 신제품 홍보 영상" maxlength="100">
          </div>

          <div class="sm-form-row">
            <div class="sm-form-group">
              <label class="sm-form-label">장르 / 유형</label>
              <select class="sm-form-select" id="sm-genre">
                <option value="">선택하세요</option>
                <option value="promotion">홍보 · 광고</option>
                <option value="education">교육 · 튜토리얼</option>
                <option value="vlog">브이로그 · 일상</option>
                <option value="review">리뷰 · 언박싱</option>
                <option value="story">스토리텔링 · 드라마</option>
                <option value="news">뉴스 · 시사</option>
                <option value="music">뮤직비디오</option>
                <option value="animation">애니메이션 · 모션</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div class="sm-form-group">
              <label class="sm-form-label">타겟 오디언스</label>
              <input type="text" class="sm-form-input" id="sm-target-audience" placeholder="예: 20~30대 직장인 여성">
            </div>
          </div>
        </div>

        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-pen-fancy" style="color: #7c3aed;"></i> 콘텐츠 방향</div>

          <div class="sm-form-group">
            <label class="sm-form-label">핵심 메시지 <span class="hint">(AI가 스토리 방향을 잡는 데 활용)</span></label>
            <textarea class="sm-form-textarea" id="sm-core-message" placeholder="이 영상을 통해 전달하고 싶은 핵심 메시지를 자유롭게 적어주세요." rows="3"></textarea>
          </div>

          <div class="sm-form-group">
            <label class="sm-form-label">분위기 키워드 <span class="hint">(쉼표로 구분)</span></label>
            <input type="text" class="sm-form-input" id="sm-mood-keywords" placeholder="예: 따뜻한, 감성적인, 밝은, 프로페셔널">
          </div>

          <div class="sm-form-group">
            <label class="sm-form-label">참고 URL <span class="hint">(줄바꿈으로 구분)</span></label>
            <textarea class="sm-form-textarea" id="sm-reference-urls" placeholder="참고할 영상이나 이미지 URL을 입력하세요.&#10;https://youtube.com/watch?v=..." rows="3"></textarea>
          </div>

          <div class="sm-form-group">
            <label class="sm-form-label">추가 메모</label>
            <textarea class="sm-form-textarea" id="sm-additional-notes" placeholder="특별히 참고할 사항이나 요구사항을 적어주세요." rows="3"></textarea>
          </div>
        </div>

        <!-- Step 이동 -->
        <div class="sm-step-actions">
          <div class="sm-autosave-indicator" id="sm-autosave-1">
            <i class="fas fa-check-circle"></i> 자동 저장됨
          </div>
          <button class="sm-btn-next" onclick="smSwitchStep(2)">
            다음: 포맷 설정 <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <!-- ===== Step 2: 포맷 설정 ===== -->
      <div class="sm-step-container" id="sm-step-2">
        <div class="sm-step-header">
          <div class="sm-step-badge"><i class="fas fa-sliders-h"></i> Step 2</div>
          <div class="sm-step-title">포맷 설정</div>
          <div class="sm-step-desc">영상의 형식과 기술적 옵션을 설정하세요.</div>
        </div>

        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-video" style="color: #7c3aed;"></i> 영상 포맷</div>

          <div class="sm-form-row">
            <div class="sm-form-group">
              <label class="sm-form-label">영상 길이</label>
              <select class="sm-form-select" id="sm-video-length">
                <option value="">선택하세요</option>
                <option value="short_15">숏폼 (15초)</option>
                <option value="short_30">숏폼 (30초)</option>
                <option value="short_60">숏폼 (60초)</option>
                <option value="mid_3">미드폼 (3분)</option>
                <option value="mid_5">미드폼 (5분)</option>
                <option value="long_10">롱폼 (10분)</option>
                <option value="long_15">롱폼 (15분+)</option>
              </select>
            </div>
            <div class="sm-form-group">
              <label class="sm-form-label">장면 수</label>
              <input type="number" class="sm-form-input" id="sm-scene-count" placeholder="자동" min="1" max="50">
            </div>
          </div>

          <div class="sm-form-group">
            <label class="sm-form-label">화면 비율</label>
            <div class="sm-option-group" id="sm-aspect-ratio">
              <label class="sm-option-item" onclick="smSelectOption(this, 'sm-aspect-ratio')">
                <input type="radio" name="aspect_ratio" value="16:9">
                <i class="fas fa-tv"></i> 16:9 (가로)
              </label>
              <label class="sm-option-item" onclick="smSelectOption(this, 'sm-aspect-ratio')">
                <input type="radio" name="aspect_ratio" value="9:16">
                <i class="fas fa-mobile-alt"></i> 9:16 (세로)
              </label>
              <label class="sm-option-item" onclick="smSelectOption(this, 'sm-aspect-ratio')">
                <input type="radio" name="aspect_ratio" value="1:1">
                <i class="fas fa-square"></i> 1:1 (정방형)
              </label>
              <label class="sm-option-item" onclick="smSelectOption(this, 'sm-aspect-ratio')">
                <input type="radio" name="aspect_ratio" value="4:5">
                <i class="fas fa-portrait"></i> 4:5
              </label>
            </div>
          </div>
        </div>

        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-share-alt" style="color: #7c3aed;"></i> 타겟 플랫폼</div>

          <div class="sm-form-group">
            <label class="sm-form-label">게시 플랫폼 <span class="hint">(복수 선택 가능)</span></label>
            <div class="sm-option-group" id="sm-platforms">
              <label class="sm-option-item" onclick="smToggleOption(this)">
                <input type="checkbox" name="platforms" value="youtube"> YouTube
              </label>
              <label class="sm-option-item" onclick="smToggleOption(this)">
                <input type="checkbox" name="platforms" value="instagram_reels"> 인스타 릴스
              </label>
              <label class="sm-option-item" onclick="smToggleOption(this)">
                <input type="checkbox" name="platforms" value="tiktok"> TikTok
              </label>
              <label class="sm-option-item" onclick="smToggleOption(this)">
                <input type="checkbox" name="platforms" value="shorts"> YouTube Shorts
              </label>
              <label class="sm-option-item" onclick="smToggleOption(this)">
                <input type="checkbox" name="platforms" value="blog"> 블로그 / 웹
              </label>
            </div>
          </div>
        </div>

        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-palette" style="color: #7c3aed;"></i> 스타일 · 연출</div>

          <div class="sm-form-row">
            <div class="sm-form-group">
              <label class="sm-form-label">영상 스타일</label>
              <select class="sm-form-select" id="sm-style">
                <option value="">선택하세요</option>
                <option value="cinematic">시네마틱</option>
                <option value="minimal">미니멀 · 클린</option>
                <option value="dynamic">다이나믹 · 에너지</option>
                <option value="retro">레트로 · 빈티지</option>
                <option value="cute">귀여운 · 캐주얼</option>
                <option value="luxury">프리미엄 · 럭셔리</option>
                <option value="corporate">비즈니스 · 포멀</option>
              </select>
            </div>
            <div class="sm-form-group">
              <label class="sm-form-label">컬러 톤</label>
              <select class="sm-form-select" id="sm-color-tone">
                <option value="">선택하세요</option>
                <option value="warm">따뜻한 톤 (Warm)</option>
                <option value="cool">차가운 톤 (Cool)</option>
                <option value="pastel">파스텔</option>
                <option value="vivid">비비드 · 선명</option>
                <option value="monochrome">모노크롬</option>
                <option value="natural">자연스러운</option>
              </select>
            </div>
          </div>

          <div class="sm-form-group">
            <div class="sm-toggle-wrap">
              <span class="sm-toggle-label"><i class="fas fa-microphone" style="margin-right: 6px; color: #7c3aed;"></i> 나레이션 포함</span>
              <label class="sm-toggle">
                <input type="checkbox" id="sm-has-narration" checked>
                <span class="sm-toggle-slider"></span>
              </label>
            </div>
            <div class="sm-toggle-wrap">
              <span class="sm-toggle-label"><i class="fas fa-music" style="margin-right: 6px; color: #7c3aed;"></i> 배경 음악 포함</span>
              <label class="sm-toggle">
                <input type="checkbox" id="sm-has-bgm" checked>
                <span class="sm-toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Step 이동 -->
        <div class="sm-step-actions">
          <button class="sm-btn-prev" onclick="smSwitchStep(1)">
            <i class="fas fa-arrow-left"></i> 이전
          </button>
          <div class="sm-autosave-indicator" id="sm-autosave-2">
            <i class="fas fa-check-circle"></i> 자동 저장됨
          </div>
          <button class="sm-btn-next" onclick="smSwitchStep(3)">
            다음: 스토리보드 <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      <!-- ===== Step 3~6: 플레이스홀더 ===== -->
      <div class="sm-step-container" id="sm-step-3">
        <div class="sm-step-header">
          <div class="sm-step-badge"><i class="fas fa-film"></i> Step 3</div>
          <div class="sm-step-title">스토리보드 생성</div>
          <div class="sm-step-desc">AI가 장면별 스토리보드를 생성합니다.</div>
        </div>
        <div class="sm-card" style="text-align: center; padding: 48px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
          <div style="font-size: 16px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">준비 중</div>
          <div style="font-size: 13px; color: #9ca3af;">이 단계는 곧 업데이트됩니다.</div>
        </div>
      </div>

      <div class="sm-step-container" id="sm-step-4">
        <div class="sm-step-header">
          <div class="sm-step-badge"><i class="fas fa-edit"></i> Step 4</div>
          <div class="sm-step-title">장면 편집</div>
          <div class="sm-step-desc">각 장면의 상세 내용을 편집하세요.</div>
        </div>
        <div class="sm-card" style="text-align: center; padding: 48px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
          <div style="font-size: 16px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">준비 중</div>
          <div style="font-size: 13px; color: #9ca3af;">이 단계는 곧 업데이트됩니다.</div>
        </div>
      </div>

      <div class="sm-step-container" id="sm-step-5">
        <div class="sm-step-header">
          <div class="sm-step-badge"><i class="fas fa-image"></i> Step 5</div>
          <div class="sm-step-title">이미지 · 음악</div>
          <div class="sm-step-desc">장면별 이미지와 배경 음악을 설정하세요.</div>
        </div>
        <div class="sm-card" style="text-align: center; padding: 48px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
          <div style="font-size: 16px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">준비 중</div>
          <div style="font-size: 13px; color: #9ca3af;">이 단계는 곧 업데이트됩니다.</div>
        </div>
      </div>

      <div class="sm-step-container" id="sm-step-6">
        <div class="sm-step-header">
          <div class="sm-step-badge"><i class="fas fa-download"></i> Step 6</div>
          <div class="sm-step-title">최종 출력</div>
          <div class="sm-step-desc">완성된 스토리보드를 내보내세요.</div>
        </div>
        <div class="sm-card" style="text-align: center; padding: 48px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
          <div style="font-size: 16px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">준비 중</div>
          <div style="font-size: 13px; color: #9ca3af;">이 단계는 곧 업데이트됩니다.</div>
        </div>
      </div>

    </div>

    <!-- ========== 우측 프리뷰 패널 ========== -->
    <div class="sm-right-panel">
      <div class="sm-preview-header">
        <i class="fas fa-eye"></i> 프로젝트 요약
      </div>
      <div class="sm-preview-empty" id="sm-preview-empty">
        프로젝트를 선택하면<br>설정 요약이 표시됩니다.
      </div>
      <div class="sm-preview-body" id="sm-preview-body" style="display: none;">
        <!-- JS로 동적 렌더링 -->
      </div>
    </div>

  </div>

  <!-- 스크립트 로딩 -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <!-- 메인 앱 (인증, Supabase 초기화 등) -->
  <script src="/static/app-v3-final.js?v=8.5.0"></script>
  <!-- 스토리 메이커 전용 -->
  <script src="/static/storymaker.js?v=1.0.0"></script>

</body>
</html>
  `;
}
