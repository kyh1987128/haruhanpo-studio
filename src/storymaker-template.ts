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

    /* 참고 URL 칩 UI */
    .sm-url-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 8px;
    }

    .sm-url-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f3f4f6;
      border-radius: 8px;
      font-size: 13px;
      color: #374151;
      transition: background 0.15s;
    }

    .sm-url-chip:hover {
      background: #e5e7eb;
    }

    .sm-url-chip-text {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sm-url-chip-remove {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 11px;
      flex-shrink: 0;
      transition: color 0.15s;
    }

    .sm-url-chip-remove:hover {
      color: #ef4444;
    }

    .sm-url-add-row {
      display: flex;
      gap: 8px;
    }

    .sm-url-add-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 13px;
      color: #1f2937;
    }

    .sm-url-add-input:focus {
      outline: none;
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
    }

    .sm-url-add-btn {
      padding: 8px 14px;
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.15s;
    }

    .sm-url-add-btn:hover {
      opacity: 0.9;
    }

    .sm-url-add-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }

    /* 장면 수 슬라이더 */
    .sm-slider-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .sm-slider-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #6b7280;
    }

    .sm-slider-value {
      font-size: 20px;
      font-weight: 700;
      color: #7c3aed;
    }

    .sm-slider-range {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: #e5e7eb;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }

    .sm-slider-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: #7c3aed;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);
      transition: transform 0.15s;
    }

    .sm-slider-range::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }

    .sm-slider-range::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: #7c3aed;
      border: none;
      border-radius: 50%;
      cursor: pointer;
    }

    .sm-slider-empty {
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      font-size: 13px;
      color: #9ca3af;
      text-align: center;
    }

    /* 타겟 오디언스 AI 추천 */
    .sm-ai-recommend-wrap {
      position: relative;
    }

    .sm-ai-recommend-btn {
      margin-top: 6px;
      padding: 6px 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: opacity 0.15s;
    }

    .sm-ai-recommend-btn:hover {
      opacity: 0.9;
    }

    .sm-ai-recommend-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .sm-ai-recommend-result {
      margin-top: 8px;
      padding: 10px 12px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      font-size: 13px;
      color: #166534;
      line-height: 1.5;
      display: none;
    }

    .sm-ai-recommend-result.visible {
      display: block;
    }

    /* 파일 업로드 드롭존 */
    .sm-file-dropzone {
      border: 2px dashed #d1d5db;
      border-radius: 12px;
      padding: 28px 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #fafbfc;
      position: relative;
    }

    .sm-file-dropzone:hover,
    .sm-file-dropzone.dragover {
      border-color: #7c3aed;
      background: #faf5ff;
    }

    .sm-file-dropzone-icon {
      font-size: 28px;
      color: #9ca3af;
      margin-bottom: 8px;
    }

    .sm-file-dropzone.dragover .sm-file-dropzone-icon {
      color: #7c3aed;
    }

    .sm-file-dropzone-text {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.5;
    }

    .sm-file-dropzone-text strong {
      color: #7c3aed;
    }

    .sm-file-dropzone-formats {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .sm-file-dropzone input[type="file"] {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    /* 파일 그리드 */
    .sm-file-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 10px;
      margin-top: 12px;
    }

    .sm-file-card {
      position: relative;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: box-shadow 0.15s;
    }

    .sm-file-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .sm-file-card-thumb {
      width: 100%;
      height: 80px;
      object-fit: cover;
      display: block;
      background: #e5e7eb;
    }

    .sm-file-card-icon {
      width: 100%;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ede9fe;
      font-size: 28px;
      color: #7c3aed;
    }

    .sm-file-card-info {
      padding: 6px 8px;
      width: 100%;
      text-align: center;
    }

    .sm-file-card-name {
      font-size: 11px;
      font-weight: 500;
      color: #374151;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }

    .sm-file-card-size {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 2px;
    }

    .sm-file-card-remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(0,0,0,0.5);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      opacity: 0;
      transition: opacity 0.15s;
    }

    .sm-file-card:hover .sm-file-card-remove {
      opacity: 1;
    }

    .sm-file-card-remove:hover {
      background: #ef4444;
    }

    /* 파일 카운터 */
    .sm-file-counter {
      margin-top: 8px;
      font-size: 12px;
      color: #9ca3af;
    }

    /* 업로드 진행 오버레이 */
    .sm-file-card-uploading {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
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

    /* ===== 장르 카드 그리드 ===== */
    .sm-genre-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 8px;
    }
    .sm-genre-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px 8px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      background: #fff;
      min-height: 100px;
    }
    .sm-genre-card:hover {
      border-color: #7c3aed;
      background: #faf5ff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(124,58,237,0.1);
    }
    .sm-genre-card.selected {
      border-color: #7c3aed;
      background: #ede9fe;
      box-shadow: 0 0 0 3px rgba(124,58,237,0.15);
    }
    .sm-genre-card .sm-genre-icon {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .sm-genre-card .sm-genre-name {
      font-size: 13px;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.3;
    }
    .sm-genre-card .sm-genre-desc {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
      line-height: 1.3;
    }
    .sm-genre-card.selected .sm-genre-name { color: #7c3aed; }
    .sm-genre-card.selected .sm-genre-desc { color: #7c3aed; }

    /* ===== 콘텐츠 유형 대형 카드 ===== */
    .sm-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .sm-type-card {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 32px 20px; border: 2px solid #e5e7eb; border-radius: 16px;
      cursor: pointer; transition: all 0.2s; background: white; text-align: center;
    }
    .sm-type-card:hover { border-color: #c4b5fd; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(124,58,237,0.1); }
    .sm-type-card.selected { border-color: #7c3aed; background: #faf5ff; box-shadow: 0 0 0 3px rgba(124,58,237,0.15); }
    .sm-type-icon { font-size: 48px; margin-bottom: 12px; }
    .sm-type-name { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
    .sm-type-desc { font-size: 13px; color: #6b7280; }

    /* ===== 사진 카드 ===== */
    .sm-photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .sm-photo-grid-small { grid-template-columns: repeat(3, 1fr); }
    .sm-photo-grid-2col { grid-template-columns: repeat(2, 1fr); }
    .sm-photo-card {
      position: relative; border-radius: 12px; overflow: hidden;
      cursor: pointer; border: 2px solid #e5e7eb; transition: all 0.2s; background: #f9fafb;
    }
    .sm-photo-card:hover { border-color: #c4b5fd; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .sm-photo-card.selected { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.2); }
    .sm-photo-card.selected::after {
      content: '\\2713'; position: absolute; top: 6px; right: 6px;
      background: #7c3aed; color: white; width: 22px; height: 22px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .sm-photo-card img { width: 100%; height: 120px; object-fit: cover; display: block; }
    .sm-photo-label {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 6px 10px; background: linear-gradient(transparent, rgba(0,0,0,0.7));
      color: white; font-size: 13px; font-weight: 600; text-align: center;
    }

    /* ===== 컬러 팔레트 카드 ===== */
    .sm-color-card { border-radius: 12px; }
    .sm-color-card .sm-color-label { padding: 8px 10px; text-align: center; font-size: 13px; font-weight: 600; color: #374151; }

    /* ===== 캐릭터 시트 / 로케이션 보드 ===== */
    .sm-character-sheet, .sm-location-board {
      background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 16px; margin-bottom: 12px;
    }
    .sm-add-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; padding: 14px; border: 2px dashed #d1d5db; border-radius: 12px;
      background: transparent; color: #7c3aed; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
    }
    .sm-add-btn:hover { border-color: #7c3aed; background: #faf5ff; }

    /* ===== 태그 그리드 ===== */
    .sm-tag-grid { display: flex; flex-wrap: wrap; gap: 6px; }

    /* ===== 소재 유형 카드 ===== */
    .sm-source-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 8px;
    }
    .sm-source-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 12px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      background: #fff;
    }
    .sm-source-card:hover {
      border-color: #7c3aed;
      background: #faf5ff;
    }
    .sm-source-card.selected {
      border-color: #7c3aed;
      background: #ede9fe;
      box-shadow: 0 0 0 3px rgba(124,58,237,0.15);
    }
    .sm-source-card .sm-source-icon { font-size: 28px; margin-bottom: 8px; }
    .sm-source-card .sm-source-name { font-size: 14px; font-weight: 700; color: #1f2937; }
    .sm-source-card .sm-source-desc { font-size: 11px; color: #9ca3af; margin-top: 4px; line-height: 1.4; }
    .sm-source-card.selected .sm-source-name,
    .sm-source-card.selected .sm-source-desc { color: #7c3aed; }

    /* 소재별 동적 영역 */
    .sm-source-panel { display: none; }
    .sm-source-panel.active { display: block; }

    /* 프리셋 카드 추천 배지 */
    .sm-preset-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #7c3aed;
      color: white;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }
    .sm-source-card { position: relative; }

    /* Step 2 비활성 옵션 */
    .sm-option-item.disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }
    .sm-option-item.disabled::after {
      content: '🔒';
      margin-left: 4px;
      font-size: 11px;
    }

    /* ===== 분위기 태그 선택 ===== */
    .sm-mood-category { margin-bottom: 12px; }
    .sm-mood-category-label {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .sm-mood-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .sm-mood-tag {
      padding: 6px 14px;
      border: 1px solid #d1d5db;
      border-radius: 20px;
      font-size: 13px;
      color: #4b5563;
      cursor: pointer;
      transition: all 0.15s;
      background: #fff;
    }
    .sm-mood-tag:hover {
      border-color: #7c3aed;
      background: #faf5ff;
    }
    .sm-mood-tag.selected {
      border-color: #7c3aed;
      background: #ede9fe;
      color: #7c3aed;
      font-weight: 600;
    }
    .sm-mood-custom-row {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .sm-mood-custom-input {
      flex: 1;
      padding: 6px 12px;
      border: 1px solid #d1d5db;
      border-radius: 20px;
      font-size: 13px;
      outline: none;
    }
    .sm-mood-custom-input:focus { border-color: #7c3aed; }
    .sm-mood-custom-btn {
      padding: 6px 14px;
      border: 1px solid #7c3aed;
      border-radius: 20px;
      background: #faf5ff;
      color: #7c3aed;
      font-size: 13px;
      cursor: pointer;
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

    /* 토스트 알림 */
    .sm-toast {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9999;
      opacity: 0;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      pointer-events: none;
    }

    .sm-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .sm-toast-error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .sm-toast-success {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }

    .sm-toast-info {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }

    /* 필드 에러 하이라이트 */
    .sm-field-error {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
      animation: smShake 0.4s ease;
    }

    .sm-option-group.sm-field-error {
      padding: 4px;
      border-radius: 10px;
      border: 2px solid #ef4444 !important;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
    }

    @keyframes smShake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
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
          <span>세계관 · 에셋</span>
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
          <span>최종 출력</span>
        </div>
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
          <div class="sm-step-desc">어떤 콘텐츠를 만들지 선택하고 기본 정보를 입력하세요.</div>
        </div>

        <!-- 1) 콘텐츠 유형 선택 -->
        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-film" style="color: #7c3aed;"></i> 콘텐츠 유형 <span class="required">*</span></div>
          <select class="sm-form-select" id="sm-genre" style="display:none;">
            <option value="">선택하세요</option>
            <option value="drama_film">드라마 · 영화</option>
            <option value="webtoon">웹툰 · 숏툰</option>
          </select>
          <div class="sm-type-grid">
            <div class="sm-type-card" data-type="drama_film" onclick="smSelectContentType(this)">
              <div class="sm-type-icon">🎬</div>
              <div class="sm-type-name">드라마 · 영화</div>
              <div class="sm-type-desc">영화, 드라마, 숏필름, 뮤직비디오 등</div>
            </div>
            <div class="sm-type-card" data-type="webtoon" onclick="smSelectContentType(this)">
              <div class="sm-type-icon">📖</div>
              <div class="sm-type-name">웹툰 · 숏툰</div>
              <div class="sm-type-desc">웹툰, 4컷만화, 카드형 만화 등</div>
            </div>
          </div>
        </div>

        <!-- 2) 추천 포맷 (콘텐츠 유형 바로 아래) -->
        <div class="sm-card" id="sm-preset-card" style="display:none;">
          <div class="sm-card-title"><i class="fas fa-magic" style="color: #7c3aed;"></i> 추천 포맷</div>
          <div class="sm-source-grid" id="sm-preset-grid"></div>
          <div style="font-size:12px; color:#9ca3af; text-align:center; margin-top:8px;">포맷은 나중에 변경할 수 있습니다.</div>
        </div>

        <!-- 3) 장르톤 (사진 카드) -->
        <div class="sm-card" id="sm-genre-tone-card" style="display:none;">
          <div class="sm-card-title"><i class="fas fa-theater-masks" style="color: #7c3aed;"></i> 장르 · 톤 <span class="hint">(최대 3개 선택)</span></div>
          <div class="sm-photo-grid" id="sm-genre-tone-grid">
            <!-- JS: smRenderGenreToneCards()가 채움 -->
          </div>
        </div>

        <!-- 4) 제목 -->
        <div class="sm-card" id="sm-basic-info-card" style="display:none;">
          <div class="sm-card-title"><i class="fas fa-edit" style="color: #7c3aed;"></i> 제목 <span class="required">*</span></div>
          <input class="sm-form-input" id="sm-title" placeholder="작품 제목을 입력하세요">
        </div>

        <!-- 5) 소재 유형 -->
        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-pen-fancy" style="color: #7c3aed;"></i> 콘텐츠 소재를 어떻게 준비할까요?</div>
          <div class="sm-source-grid" id="sm-source-grid">
            <div class="sm-source-card selected" data-source="topic" onclick="smSelectSource(this)">
              <div class="sm-source-icon">💡</div>
              <div class="sm-source-name">직접 기획</div>
              <div class="sm-source-desc">위 시놉시스로<br>AI가 기획</div>
            </div>
            <div class="sm-source-card" data-source="url" onclick="smSelectSource(this)">
              <div class="sm-source-icon">🔗</div>
              <div class="sm-source-name">웹링크 참고</div>
              <div class="sm-source-desc">참고 URL을 분석해서<br>콘텐츠 기획</div>
            </div>
            <div class="sm-source-card" data-source="file" onclick="smSelectSource(this)">
              <div class="sm-source-icon">📎</div>
              <div class="sm-source-name">파일 첨부</div>
              <div class="sm-source-desc">PDF, 이미지, PPT 등을<br>분석해서 기획</div>
            </div>
          </div>
          <div style="font-size:12px; color:#9ca3af; text-align:center;">※ 하나를 선택하세요. 각 방식에 맞는 입력 폼이 표시됩니다.</div>
        </div>

        <!-- 숨겨진 호환 필드 -->
        <input type="hidden" id="sm-mood-keywords">
        <input type="hidden" id="sm-project-name" value="">
        <input type="hidden" id="sm-core-message" value="">
        <input type="hidden" id="sm-target-audience" value="">
        <input type="hidden" id="sm-additional-notes" value="">

        <!-- 소재별 동적 입력 -->
        <div class="sm-source-panel active" id="sm-source-panel-topic">
          <div class="sm-card">
            <div class="sm-card-title"><i class="fas fa-lightbulb" style="color: #f59e0b;"></i> 줄거리 · 기획 의도</div>
            <textarea class="sm-form-textarea" id="sm-synopsis" placeholder="어떤 이야기인가요? 줄거리, 컨셉, 전달하고 싶은 메시지 등을 자유롭게 적어주세요." rows="5"></textarea>
          </div>
        </div>
        <div class="sm-source-panel" id="sm-source-panel-url">
          <div class="sm-card">
            <div class="sm-card-title"><i class="fas fa-link" style="color: #3b82f6;"></i> 참고 URL <span class="hint" id="sm-url-counter">(0/5)</span></div>
            <div class="sm-url-list" id="sm-url-list"></div>
            <div class="sm-url-add-row" id="sm-url-add-row">
              <input type="text" class="sm-url-add-input" id="sm-url-input" placeholder="https://..." onkeydown="if(event.key==='Enter'){event.preventDefault();smAddUrl();}">
              <button class="sm-url-add-btn" id="sm-url-add-btn" onclick="smAddUrl()"><i class="fas fa-plus"></i> 추가</button>
            </div>
            <div class="sm-form-group" style="margin-top:12px;">
              <label class="sm-form-label">기획 방향 <span class="hint">(선택)</span></label>
              <textarea class="sm-form-textarea" id="sm-url-direction" placeholder="예: 이 링크의 스타일을 참고해서 만들어줘" rows="2"></textarea>
            </div>
          </div>
        </div>
        <div class="sm-source-panel" id="sm-source-panel-file">
          <div class="sm-card">
            <div class="sm-card-title"><i class="fas fa-paperclip" style="color: #10b981;"></i> 참고 파일 <span class="hint" id="sm-file-counter">(0/10, 0MB/50MB)</span></div>
            <div class="sm-file-dropzone" id="sm-file-dropzone">
              <input type="file" id="sm-file-input" multiple accept=".jpg,.jpeg,.png,.gif,.pdf,.ppt,.pptx,.doc,.docx" onchange="smOnFilesSelected(event)">
              <div class="sm-file-dropzone-icon"><i class="fas fa-cloud-upload-alt"></i></div>
              <div class="sm-file-dropzone-text"><strong>드래그하거나 클릭</strong>하여 업로드</div>
              <div class="sm-file-dropzone-formats">PDF, 이미지(JPG/PNG/GIF), PPT, Word · 최대 10개, 총 50MB</div>
            </div>
            <div class="sm-file-grid" id="sm-file-grid"></div>
            <div class="sm-form-group" style="margin-top:12px;">
              <label class="sm-form-label">기획 방향 <span class="hint">(선택)</span></label>
              <textarea class="sm-form-textarea" id="sm-file-direction" placeholder="예: 이 자료를 기반으로 스토리보드를 만들어줘" rows="2"></textarea>
            </div>
          </div>
        </div>

        <!-- Step 이동 -->
        <div class="sm-step-actions">
          <div class="sm-autosave-indicator" id="sm-autosave-1"><i class="fas fa-check-circle"></i> 자동 저장됨</div>
          <button class="sm-btn-next" onclick="smSwitchStep(2)">다음: 세계관 · 에셋 <i class="fas fa-arrow-right"></i></button>
        </div>
      </div>

      <!-- ===== Step 2: 세계관 · 에셋 ===== -->
      <div class="sm-step-container" id="sm-step-2">
        <div class="sm-step-header">
          <div class="sm-step-badge"><i class="fas fa-globe"></i> Step 2</div>
          <div class="sm-step-title">세계관 · 에셋</div>
          <div class="sm-step-desc">캐릭터, 장소, 비주얼 스타일을 설정하세요. 모든 장면에서 일관되게 적용됩니다.</div>
        </div>

        <!-- 1) 캐릭터 시트 -->
        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-user-friends" style="color: #7c3aed;"></i> 캐릭터 시트</div>
          <div id="sm-characters-list">
            <div style="text-align:center;color:#9ca3af;padding:20px;">캐릭터를 추가해주세요</div>
          </div>
          <button class="sm-add-btn" onclick="smAddCharacter()"><i class="fas fa-plus"></i> 캐릭터 추가</button>
        </div>

        <!-- 2) 로케이션 보드 -->
        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-map-marker-alt" style="color: #7c3aed;"></i> 로케이션 보드</div>
          <div id="sm-locations-list">
            <div style="text-align:center;color:#9ca3af;padding:20px;">장소를 추가해주세요</div>
          </div>
          <button class="sm-add-btn" onclick="smAddLocation()"><i class="fas fa-plus"></i> 장소 추가</button>
        </div>

        <!-- 3) 비주얼 스타일 -->
        <div class="sm-card">
          <div class="sm-card-title"><i class="fas fa-palette" style="color: #7c3aed;"></i> 비주얼 스타일</div>

          <!-- 드라마용: 촬영 스타일 -->
          <div id="sm-shooting-style-section">
            <div class="sm-form-group" style="margin-bottom:16px;">
              <label class="sm-form-label">촬영 스타일</label>
              <div class="sm-photo-grid sm-photo-grid-2col" id="sm-shooting-style-grid">
                <!-- JS 렌더링 -->
              </div>
            </div>
          </div>

          <!-- 웹툰용: 그림체 -->
          <div id="sm-art-style-section" style="display:none;">
            <div class="sm-form-group" style="margin-bottom:16px;">
              <label class="sm-form-label">그림체</label>
              <div class="sm-photo-grid sm-photo-grid-2col" id="sm-art-style-grid">
                <!-- JS 렌더링 -->
              </div>
            </div>
          </div>

          <!-- 공통: 색감 -->
          <div class="sm-form-group">
            <label class="sm-form-label">색감 팔레트</label>
            <div class="sm-photo-grid sm-photo-grid-small" id="sm-color-palette-grid">
              <!-- JS 렌더링 -->
            </div>
          </div>
        </div>

        <!-- 포맷 설정은 Step 1 프리셋에서 처리됨 (중복 제거) -->

        <!-- Step 이동 -->
        <div class="sm-step-actions">
          <button class="sm-btn-prev" onclick="smSwitchStep(1)"><i class="fas fa-arrow-left"></i> 이전</button>
          <div class="sm-autosave-indicator" id="sm-autosave-2"><i class="fas fa-check-circle"></i> 자동 저장됨</div>
          <button class="sm-btn-next" onclick="smSwitchStep(3)">다음: 스토리보드 <i class="fas fa-arrow-right"></i></button>
        </div>
      </div>

      <!-- ===== Step 3~5: 플레이스홀더 ===== -->
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
          <div class="sm-step-badge"><i class="fas fa-download"></i> Step 5</div>
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
  <script src="/static/storymaker-cards.js?v=2.0.0"></script>
  <script src="/static/storymaker.js?v=2.0.0"></script>

</body>
</html>
  `;
}
