# 🚨 긴급 버그 수정 보고서 (v7.8.5)

**날짜**: 2026-01-02 11:21 - 11:35 (14분 소요)  
**버전**: v7.8.4 → v7.8.5  
**커밋**: 3f4bb8e, dc2fdbb

---

## 📋 발생한 문제

### 🔴 **사용자 화면**:
```
오류 발생
네트워크 오류가 발생했습니다. 입력한 정보를 확인해주세요.
```

### 🔍 **실제 원인**:

**PM2 로그에서 발견된 에러 2가지:**

1. **Gemini API 404 에러** (반복 발생)
```
❌ 이미지 분석 오류: [GoogleGenerativeAI Error]: 
Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent
[404 Not Found] models/gemini-1.5-flash-001 is not found for API version v1beta
```

2. **문서 파싱 오류** (반복 발생)
```
❌ 문서 파싱 오류: Cannot read properties of undefined (reading 'includes')
```

---

## 🔍 원인 분석

### **버그 1: Gemini API 404 에러**

**문제**:
- `gemini-1.5-flash-001` 모델이 v1beta API에서 더 이상 지원되지 않음
- 이전에 `gemini-1.5-flash-001`로 수정했지만, 실제로는 이 모델도 존재하지 않음

**실제 지원되는 모델**:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=XXX"

# 응답:
{
  "name": "models/gemini-2.5-flash",
  "version": "001",
  "displayName": "Gemini 2.5 Flash",
  "description": "Stable version of Gemini 2.5 Flash, mid-size multimodal model"
}
```

**결론**: Gemini 1.5 시리즈가 아닌 **Gemini 2.5 Flash**로 업그레이드 필요!

---

### **버그 2: 문서 파싱 오류**

**문제**:
```javascript
// parseDocument 함수 (Line 29)
if (fileType === 'application/pdf' || fileType.includes('pdf')) {
  // ❌ fileType이 undefined일 때 에러!
}
```

**원인**:
- 프론트엔드: `{ filename, content, mimeType }` 전송
- 백엔드: `{ name, dataUrl, type }` 기대
- **필드명 불일치!**

**parseMultipleDocuments 함수**:
```typescript
// 이전 코드 (버그)
documents.map(async (doc) => {
  const text = await parseDocument(doc.dataUrl, doc.type);  
  // ❌ doc.type이 undefined (실제로는 doc.mimeType)
})
```

---

## ✅ 해결 방법

### **수정 1: Gemini 모델 업그레이드**

**파일**: `src/gemini.ts`

```diff
- const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });
+ const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
```

**변경 위치**:
- Line 11: `analyzeImageWithGemini` 함수
- Line 59: `generateContentWithGemini` 함수

---

### **수정 2: 문서 파싱 필드명 정규화**

**파일**: `src/document-parser.ts`

#### 2-1. parseMultipleDocuments 함수 수정

```typescript
export async function parseMultipleDocuments(
  documents: Array<{ 
    dataUrl?: string;       // ✅ 선택적 필드
    content?: string;       // ✅ 선택적 필드
    type?: string;          // ✅ 선택적 필드
    mimeType?: string;      // ✅ 선택적 필드
    name?: string;          // ✅ 선택적 필드
    filename?: string;      // ✅ 선택적 필드
  }>
): Promise<string[]> {
  const parsedTexts = await Promise.all(
    documents.map(async (doc, index) => {
      // 필드명 정규화: 자동 매핑
      const base64Data = doc.content || doc.dataUrl || '';
      const fileType = doc.mimeType || doc.type || '';
      const fileName = doc.filename || doc.name || 'Untitled';
      
      const text = await parseDocument(base64Data, fileType);
      return text;
    })
  );
}
```

#### 2-2. parseDocument 함수에 입력 검증 추가

```typescript
export async function parseDocument(
  base64Data: string,
  fileType: string
): Promise<string> {
  try {
    // ✅ 입력 검증 추가
    if (!base64Data) {
      throw new Error('문서 데이터가 없습니다.');
    }
    if (!fileType) {
      throw new Error('파일 형식 정보가 없습니다.');
    }

    // Base64 변환 및 파싱
    const base64Content = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;
    
    const buffer = Buffer.from(base64Content, 'base64');

    // PDF 파싱
    if (fileType === 'application/pdf' || fileType.includes('pdf')) {
      // ...
    }
  } catch (error: any) {
    console.error('❌ 문서 파싱 오류:', error.message);
    return `[문서 파싱 중 오류 발생: ${error.message}]`;
  }
}
```

---

## 📊 수정 내역

### **커밋 1: v7.8.4 (3f4bb8e)**

```
fix: 긴급 버그 2개 수정 (v7.8.4)

**문제 1: Gemini API 404 에러**
- 해결: gemini-1.5-flash-001 → gemini-1.5-flash

**문제 2: 문서 파싱 오류**
- 해결: 필드명 정규화 (content/dataUrl, mimeType/type, filename/name)
```

### **커밋 2: v7.8.5 (dc2fdbb)**

```
fix: Gemini 모델을 2.5 Flash로 업그레이드 (v7.8.5)

- gemini-1.5-flash → gemini-2.5-flash
- API 확인: /v1beta/models에서 gemini-2.5-flash 지원 확인
- 개선: 더 빠르고 정확한 분석
```

---

## 🧪 테스트 결과

### **빌드 상태**

```bash
✅ npm run build
   - 시간: 6.25s
   - 크기: 938.47 kB
   - 모델: gemini-2.5-flash (2곳)

✅ pm2 restart webapp
   - PID: 26257
   - 재시작: 27회
   - 상태: online
```

### **API 응답**

```bash
# 수정 전
❌ 이미지 분석 오류: models/gemini-1.5-flash-001 is not found
❌ 문서 파싱 오류: Cannot read properties of undefined

# 수정 후
✅ [하이브리드] 이미지 분석 시작 (총 4장)
✅ 📚 첨부 문서 파싱 중...
✅ 종합 검증 결과 (confidence: 20-30)
```

---

## 🔗 테스트 URL

**샌드박스**: https://3000-i41cq3n8pxi55gachwryg-de59bda9.sandbox.novita.ai

**테스트 순서**:
1. **브라우저 강제 새로고침** (`Ctrl + Shift + R`)
2. 이미지 업로드 (4장)
3. 문서 첨부 (PDF)
4. 키워드 입력
5. **콘텐츠 생성 버튼 클릭**

**기대 결과**:
- ✅ "오류 발생" 팝업 사라짐
- ✅ 이미지 분석 성공
- ✅ 문서 파싱 성공
- ✅ 검증 모달 표시 (불일치 항목 포함)

---

## 📝 향후 개선사항

### 1. **에러 메시지 개선**

**현재**:
```
오류 발생
네트워크 오류가 발생했습니다. 입력한 정보를 확인해주세요.
```

**개선안**:
```javascript
// 에러 타입별 메시지
if (error.status === 403) {
  return '크레딧이 부족하거나 일일 한도에 도달했습니다.';
} else if (error.status === 429) {
  return 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
} else if (error.message.includes('Gemini')) {
  return '이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.';
} else {
  return '네트워크 오류가 발생했습니다. 입력한 정보를 확인해주세요.';
}
```

### 2. **Gemini 모델 자동 감지**

```typescript
async function getAvailableGeminiModel(apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const data = await response.json();
  
  // 사용 가능한 Flash 모델 찾기
  const flashModel = data.models.find((m: any) => 
    m.name.includes('flash') && 
    m.supportedGenerationMethods.includes('generateContent')
  );
  
  return flashModel?.name.replace('models/', '') || 'gemini-2.5-flash';
}
```

### 3. **IP 기반 크레딧 한도 메시지 개선**

```typescript
if (error.status === 403 && is_guest) {
  if (reachedIpLimit) {
    return '비회원 체험 한도에 도달했습니다. 로그인하면 무료 크레딧을 받을 수 있습니다.';
  } else {
    return '크레딧이 부족합니다. 크레딧을 충전해주세요.';
  }
}
```

---

## 🎯 결론

**수정 완료**:
- ✅ Gemini 2.5 Flash로 업그레이드
- ✅ 문서 파싱 필드명 불일치 해결
- ✅ 입력 검증 추가
- ✅ 빌드 및 재시작 완료

**다음 단계**:
1. 사용자가 샌드박스에서 테스트 (`Ctrl + Shift + R` 후)
2. 에러 메시지 개선 (우선순위 2)
3. Cloudflare Pages 배포 (우선순위 3)

---

**상태**: ✅ 수정 완료  
**소요 시간**: 14분  
**빌드 크기**: 938.47 kB  
**서버 상태**: Online (PID 26257)
