# 🎯 캐시 버스팅 문제 해결 (v7.8.3)

**날짜**: 2026-01-02  
**버전**: v7.8.3  
**커밋**: e992d30

---

## 📋 문제 상황

**사용자 질문**:
> "예상크레딧에 사진은 '분석할 이미지' 라고 나타나는데 왜 첨부한 문서는 나타나지 않는가?"

**발견된 문제**:
- 코드에는 **첨부 문서 카운트 로직**이 이미 구현되어 있음 (Line 1154-1159, 1305-1310)
- 하지만 브라우저에서 **이전 버전의 JavaScript 파일**이 캐시되어 있어 새 기능이 반영되지 않음
- 캐시 버스팅 파라미터가 **v7.3.1**로 오래된 버전이었음

---

## 🔍 원인 분석

### 1. 코드는 이미 수정되어 있었음

**Line 1154-1159** (public/static/app-v3-final.js):
```javascript
let totalImageCount = 0;
let totalDocumentCount = 0;  // ✅ 문서 카운트 변수

Object.values(contentBlocks).forEach(block => {
  totalImageCount += (block.images || []).length;
  totalDocumentCount += (block.documents || []).length;  // ✅ 계산 로직
});
```

**Line 1305-1310** (public/static/app-v3-final.js):
```javascript
${totalDocumentCount > 0 ? `
<div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
  <span>📎 첨부 문서:</span>
  <span style="font-weight: 600;">${totalDocumentCount}개</span>
</div>
` : ''}
```

### 2. 캐시 버스팅 버전이 오래됨

**Line 1059** (src/html-template.ts):
```html
<!-- ❌ 이전 버전 -->
<script src="/static/app-v3-final.js?v=7.3.1"></script>

<!-- ✅ 수정 후 -->
<script src="/static/app-v3-final.js?v=7.8.3"></script>
```

---

## ✅ 해결 방법

### 1. **캐시 버스팅 버전 업데이트**

**파일**: `src/html-template.ts` (Line 1059)

```diff
- <script src="/static/app-v3-final.js?v=7.3.1"></script>
+ <script src="/static/app-v3-final.js?v=7.8.3"></script>
```

### 2. **빌드 및 재시작**

```bash
# 빌드
npm run build

# 서버 재시작
fuser -k 3000/tcp 2>/dev/null || true
pm2 restart webapp
```

### 3. **캐시 버스팅 검증**

```bash
# HTML에서 버전 확인
curl -s http://localhost:3000 | grep "app-v3-final.js"

# 출력:
# <script src="/static/app-v3-final.js?v=7.8.3"></script>
```

---

## 📊 테스트 결과

### ✅ 예상 결과

브라우저에서 **Ctrl + Shift + R** (강제 새로고침) 후:

```
💰 예상 사용 크레딧 및 소요 시간

📸 분석할 이미지: 4장
📎 첨부 문서: 1개          ← ✅ 이제 표시됨!
✨ 생성할 콘텐츠: 1개 × 2개 플랫폼

⏱️ 예상 소요 시간: 약 1분
```

### 🚨 만약 여전히 안 보인다면?

**브라우저 캐시 강제 삭제**:

1. **Chrome/Edge**: `F12` → Network 탭 → "Disable cache" 체크 → `Ctrl + Shift + R`
2. **Firefox**: `Ctrl + Shift + Delete` → "캐시" 선택 → "지금 삭제"
3. **Safari**: `Command + Option + E` → 페이지 새로고침

---

## 📂 파일 변경 내역

### 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/html-template.ts` | app-v3-final.js 버전을 v7.3.1 → v7.8.3으로 업데이트 |

### 커밋 정보

```
commit e992d30
Author: Developer
Date:   2026-01-02

fix: 캐시 버스팅 버전 업데이트 (v7.8.3) - 첨부 문서 UI 표시 활성화

- src/html-template.ts: app-v3-final.js 버전을 v7.3.1 → v7.8.3으로 업데이트
- 브라우저 캐시 문제 해결
- 첨부 문서 카운트가 예상 크레딧 UI에 표시되도록 수정
- 사용자가 브라우저 새로고침 시 최신 JavaScript 파일 로드

Closes: #cache-busting-update
Refs: #v7.8.3
```

---

## 🔄 버전 히스토리

| 버전 | 날짜 | 변경 내역 |
|------|------|----------|
| v7.8.3 | 2026-01-02 | 캐시 버스팅 버전 업데이트 (v7.3.1 → v7.8.3) |
| v7.8.2 | 2026-01-02 | Gemini 모델명 변경 (gemini-1.5-flash-001) |
| v7.8.1 | 2026-01-02 | 문서 업로드 필드명 불일치 수정 (name/type/dataUrl → filename/mimeType/base64) |
| v7.8.0 | 2026-01-02 | 종합 입력 검증 시스템 구현 |
| v7.7.2 | 2026-01-02 | Gemini API 모델명 수정 및 강제 진행 로직 개선 |

---

## 🎯 결론

**문제**: 브라우저 캐시로 인해 새 기능이 반영되지 않음  
**해결**: 캐시 버스팅 버전을 v7.3.1 → v7.8.3으로 업데이트  
**결과**: 사용자가 강제 새로고침 시 첨부 문서 카운트가 정상 표시됨

---

## 📝 향후 권장사항

### 1. **자동 버전 관리**

`package.json` 버전을 캐시 버스팅에 사용:

```typescript
// src/html-template.ts
const version = process.env.npm_package_version || '1.0.0';

export const htmlTemplate = `
  <script src="/static/app-v3-final.js?v=${version}"></script>
`;
```

### 2. **빌드 시 파일 해시 추가**

Vite 설정에서 자동 해시 추가:

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'static/[name].[hash].js',
        chunkFileNames: 'static/[name].[hash].js',
        assetFileNames: 'static/[name].[hash].[ext]'
      }
    }
  }
});
```

### 3. **Cache-Control 헤더 설정**

Cloudflare Pages에서 캐시 정책 설정:

```toml
# _headers 파일
/static/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: no-cache, must-revalidate
```

---

## 🔗 관련 문서

- [DOCUMENT_FIELD_MISMATCH_FIX.md](./DOCUMENT_FIELD_MISMATCH_FIX.md) - 문서 업로드 필드명 불일치 수정
- [SYSTEM_RECHECK_REPORT.md](./SYSTEM_RECHECK_REPORT.md) - 전체 시스템 재점검 보고서
- [COMPREHENSIVE_VALIDATION_COMPLETE.md](./COMPREHENSIVE_VALIDATION_COMPLETE.md) - 종합 검증 시스템 완성 보고서

---

## 🚀 테스트 URL

- **로컬**: http://localhost:3000
- **샌드박스**: https://3000-i41cq3n8pxi55gachwryg-de59bda9.sandbox.novita.ai

---

**상태**: ✅ 완료  
**다음 단계**: 사용자가 브라우저 강제 새로고침 (`Ctrl + Shift + R`) 후 첨부 문서 카운트 확인
