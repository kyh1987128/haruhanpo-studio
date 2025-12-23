# 멀티 플랫폼 콘텐츠 자동 생성기 v3.0 - AI 전수조사 및 기능 테스트 문서

## 📋 프로젝트 개요

### 프로젝트 정보
- **프로젝트명**: Multi-Platform Content Auto-Generator v3.0
- **목적**: 이미지 및 브랜드 정보 입력으로 다중 플랫폼용 AI 콘텐츠 자동 생성
- **기술 스택**: Hono + TypeScript + Vite + OpenAI API (GPT-4o/GPT-4-turbo/GPT-3.5-turbo + Vision)
- **배포 환경**: Cloudflare Pages/Workers
- **개발 환경**: Node.js, PM2, Wrangler
- **버전**: v3.0 (2025-12-23)

### 접속 정보
- **로컬 개발**: http://localhost:3000
- **퍼블릭 URL**: https://3000-i41cq3n8pxi55gachwryg-de59bda9.sandbox.novita.ai
- **GitHub**: (설정 필요)
- **Cloudflare Pages**: (배포 필요)

---

## 🎯 핵심 기능 목록

### v3.0 신규 기능
1. **콘텐츠 템플릿 커스터마이징** ⭐ NEW
2. **배치 생성 모드 (CSV 업로드)** ⭐ NEW
3. **이미지 편집 기능 (크롭/압축/필터)** ⭐ NEW
4. **AI 모델 선택 옵션** ⭐ NEW

### v2.0 기존 기능
5. **다국어 지원** (한국어/영어/일본어/중국어)
6. **실시간 비용 계산기** (USD/KRW 동시 표시, 실시간 환율)
7. **브랜드 프로필 관리** (저장/불러오기/삭제)
8. **생성 히스토리 관리** (자동 저장/보기/재사용)
9. **확장 입력 폼** (회사명, 지역, 성별 등 11개 항목)

### v1.0 기본 기능
10. **멀티 이미지 업로드** (최대 10장, 총 50MB)
11. **4개 플랫폼 콘텐츠 생성** (Naver Blog/Instagram/Threads/YouTube Shorts)
12. **AI 이미지 분석** (OpenAI Vision API)
13. **결과 관리** (탭 표시/복사/다운로드)

---

## 📊 세부 기능 명세

### 1. 콘텐츠 템플릿 커스터마이징

#### 기능 설명
사용자가 자주 사용하는 프롬프트 템플릿을 저장하고 관리하여, 반복적인 콘텐츠 생성 시 일관성을 유지하고 시간을 절약합니다.

#### 세부 기능
- **템플릿 생성**: 플랫폼별(blog/instagram/threads/youtube) 커스텀 프롬프트 작성
- **템플릿 저장**: LocalStorage에 템플릿 저장 (최대 50개)
- **템플릿 수정**: 기존 템플릿 내용 수정
- **템플릿 적용**: 저장된 템플릿을 생성 시 프롬프트로 사용
- **템플릿 삭제**: 불필요한 템플릿 제거

#### 데이터 구조
```typescript
interface Template {
  id: string;           // 고유 ID (timestamp)
  name: string;         // 템플릿 이름
  platform: 'blog' | 'instagram' | 'threads' | 'youtube';
  content: string;      // 프롬프트 내용
  createdAt: string;    // 생성 시각 (ISO 8601)
}
```

#### UI 위치
- **진입**: 헤더의 "템플릿" 버튼 클릭
- **모달**: `#templateModal` - 중앙 팝업 형태
- **버튼**: "새 템플릿 만들기" / "수정" / "적용" / "삭제"

#### 테스트 케이스
1. **TC-TMPL-001**: 새 템플릿 생성
   - 단계: 템플릿 버튼 클릭 → 새 템플릿 만들기 → 이름/플랫폼/내용 입력
   - 예상: 템플릿 목록에 추가됨, LocalStorage 저장 확인
   
2. **TC-TMPL-002**: 템플릿 수정
   - 단계: 템플릿 목록에서 "수정" 클릭 → 내용 수정 → 저장
   - 예상: 변경 내용 반영, LocalStorage 업데이트 확인

3. **TC-TMPL-003**: 템플릿 적용
   - 단계: 템플릿 선택 → "적용" 클릭
   - 예상: 알림 메시지 표시, 생성 시 해당 템플릿 사용 (실제 적용은 백엔드 로직 필요)

4. **TC-TMPL-004**: 템플릿 삭제
   - 단계: 템플릿 선택 → "삭제" 클릭 → 확인
   - 예상: 목록에서 제거, LocalStorage에서 삭제 확인

5. **TC-TMPL-005**: 50개 제한 테스트
   - 단계: 50개 템플릿 생성 시도
   - 예상: 50개 이상 저장되지 않음 (오래된 것 삭제 또는 경고)

---

### 2. 배치 생성 모드 (CSV 업로드)

#### 기능 설명
CSV 파일로 여러 브랜드 정보를 업로드하여 한 번에 대량의 콘텐츠를 생성합니다. 마케팅 에이전시나 여러 클라이언트를 관리하는 경우에 유용합니다.

#### 세부 기능
- **CSV 파일 업로드**: `.csv` 형식 파일 선택
- **CSV 파싱**: 헤더 행 + 데이터 행 자동 파싱
- **배치 처리**: 각 행마다 콘텐츠 생성 API 호출
- **진행 상태 표시**: 로딩 인디케이터
- **결과 표시**: 브랜드별 결과를 개별 카드로 표시
- **실패 처리**: 일부 브랜드 실패 시에도 나머지 계속 진행

#### CSV 형식
```csv
brand,keywords,tone,targetAge,industry,companyName,location,targetGender,contact,website,sns
올리브영,화장품 쇼핑,캐주얼,20대,뷰티,(주)올리브영,서울,여성,02-1234-5678,https://oliveyoung.co.kr,@oliveyoung
스타벅스,커피 카페,전문가,30대,F&B,스타벅스코리아,전국,전체,1522-3232,https://starbucks.co.kr,@starbucks_korea
```

#### API 엔드포인트
- **URL**: `POST /api/generate/batch`
- **Request Body**:
  ```json
  {
    "batchData": [
      {
        "brand": "올리브영",
        "keywords": "화장품 쇼핑",
        "tone": "캐주얼",
        "targetAge": "20대",
        "industry": "뷰티",
        "companyName": "(주)올리브영",
        // ... 기타 필드
      },
      // ... 더 많은 브랜드
    ],
    "images": ["base64...", "base64..."], // 공통 이미지
    "platforms": ["blog", "instagram"],
    "aiModel": "gpt-4o"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "results": [
      {
        "success": true,
        "brand": "올리브영",
        "data": {
          "blog": "...",
          "instagram": "..."
        },
        "index": 1
      },
      // ... 더 많은 결과
    ],
    "totalCount": 2,
    "imageCount": 3
  }
  ```

#### UI 위치
- **진입**: 입력 폼 하단의 "배치 생성 모드" 섹션
- **CSV 선택**: 파일 선택 버튼
- **실행**: "배치 생성 시작" 버튼
- **결과**: `#batchResults` 컨테이너에 표시

#### 테스트 케이스
1. **TC-BATCH-001**: 유효한 CSV 파일 업로드
   - 단계: CSV 파일 선택 → 이미지 업로드 → 플랫폼 선택 → 배치 생성 시작
   - 예상: 로딩 표시 → 모든 브랜드 결과 표시 → 각 브랜드별 카드 생성

2. **TC-BATCH-002**: CSV 형식 오류
   - 단계: 잘못된 형식의 CSV 업로드 (헤더 없음, 구분자 오류 등)
   - 예상: 에러 메시지 또는 빈 결과

3. **TC-BATCH-003**: 필수 필드 누락
   - 단계: brand 또는 keywords 컬럼 누락된 CSV 업로드
   - 예상: 해당 행 건너뛰거나 에러 표시

4. **TC-BATCH-004**: 대량 데이터 (10개 이상)
   - 단계: 10개 브랜드 CSV 업로드 → 실행
   - 예상: 순차 처리 → 시간 소요 확인 → 모든 결과 표시

5. **TC-BATCH-005**: 일부 실패 시나리오
   - 단계: 일부 브랜드 데이터가 API 오류를 발생시킬 수 있는 CSV 사용
   - 예상: 성공한 브랜드는 결과 표시, 실패한 브랜드는 에러 메시지 표시

6. **TC-BATCH-006**: CSV 없이 실행
   - 단계: CSV 업로드 없이 "배치 생성 시작" 클릭
   - 예상: 경고 알림 "CSV 파일을 먼저 업로드해주세요."

7. **TC-BATCH-007**: 이미지 없이 실행
   - 단계: CSV 업로드 → 이미지 없이 실행
   - 예상: 경고 알림 "이미지를 업로드해주세요."

8. **TC-BATCH-008**: 결과 복사/다운로드
   - 단계: 배치 생성 완료 → 각 브랜드별 "복사" 버튼 클릭
   - 예상: 해당 플랫폼 콘텐츠 클립보드 복사

---

### 3. 이미지 편집 기능

#### 기능 설명
업로드한 이미지를 간단하게 편집(필터, 압축 등)하여 최적화된 이미지로 콘텐츠를 생성합니다. 별도의 이미지 편집 도구 없이 바로 편집 가능합니다.

#### 세부 기능
- **이미지 편집기 열기**: 이미지 프리뷰의 "편집" 버튼 클릭
- **Canvas 기반 편집**: HTML5 Canvas API 사용
- **필터 적용**:
  - 흑백 (Grayscale): RGB 평균값으로 변환
  - 밝게 (Brightness): 각 픽셀 밝기 +30
  - 대비 (Contrast): 대비 1.2배 증가
- **이미지 압축**: JPEG 70% 품질로 압축하여 파일 크기 감소
- **편집 저장**: 편집된 이미지를 원본 이미지로 교체
- **취소**: 편집 취소 및 모달 닫기

#### UI 위치
- **진입**: 이미지 프리뷰 우측 하단의 "편집" 아이콘 클릭
- **모달**: `#imageEditorModal` - 전체 화면 모달
- **Canvas**: `#editCanvas` - 편집 대상 이미지 표시
- **버튼**: "흑백" / "밝게" / "대비" / "압축" / "취소" / "저장"

#### 기술 구현
```javascript
// 흑백 필터
for (let i = 0; i < data.length; i += 4) {
  const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
  data[i] = data[i + 1] = data[i + 2] = avg;
}

// 압축
const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
```

#### 테스트 케이스
1. **TC-IMG-001**: 이미지 편집기 열기
   - 단계: 이미지 업로드 → 프리뷰의 "편집" 버튼 클릭
   - 예상: 편집 모달 표시, Canvas에 이미지 로드

2. **TC-IMG-002**: 흑백 필터 적용
   - 단계: 편집 모달에서 "흑백" 버튼 클릭
   - 예상: Canvas 이미지가 흑백으로 변환

3. **TC-IMG-003**: 밝기 필터 적용
   - 단계: "밝게" 버튼 클릭
   - 예상: Canvas 이미지 밝기 증가

4. **TC-IMG-004**: 대비 필터 적용
   - 단계: "대비" 버튼 클릭
   - 예상: Canvas 이미지 대비 증가

5. **TC-IMG-005**: 이미지 압축
   - 단계: "압축 (70%)" 버튼 클릭
   - 예상: 알림 "이미지가 압축되었습니다." 표시, 파일 크기 감소

6. **TC-IMG-006**: 여러 필터 조합
   - 단계: 흑백 → 밝게 → 대비 순서로 적용
   - 예상: 각 필터가 누적 적용됨

7. **TC-IMG-007**: 편집 저장
   - 단계: 필터 적용 → "저장" 버튼 클릭
   - 예상: 모달 닫힘, 프리뷰에 편집된 이미지 반영

8. **TC-IMG-008**: 편집 취소
   - 단계: 필터 적용 → "취소" 버튼 클릭
   - 예상: 모달 닫힘, 원본 이미지 유지

9. **TC-IMG-009**: 저장 후 재편집
   - 단계: 편집 저장 → 다시 편집 버튼 클릭
   - 예상: 이전 편집 결과가 Canvas에 로드됨

---

### 4. AI 모델 선택 옵션

#### 기능 설명
콘텐츠 생성 시 사용할 OpenAI 모델을 선택하여 품질, 속도, 비용을 조절할 수 있습니다.

#### 지원 모델
1. **GPT-4o** (기본값) ⭐ 추천
   - 최고 품질
   - 중간 속도
   - 중간 비용
   - 멀티모달 지원 (Vision)

2. **GPT-4 Turbo**
   - 높은 품질
   - 느린 속도
   - 높은 비용
   - 복잡한 프롬프트에 적합

3. **GPT-3.5 Turbo**
   - 기본 품질
   - 빠른 속도
   - 저렴한 비용
   - 간단한 콘텐츠에 적합

#### 비용 비교 (참고값)
- GPT-4o: $0.01/1K tokens (input), $0.03/1K tokens (output)
- GPT-4 Turbo: $0.03/1K tokens (input), $0.06/1K tokens (output)
- GPT-3.5 Turbo: $0.001/1K tokens (input), $0.002/1K tokens (output)

#### UI 위치
- **진입**: 입력 폼의 "AI 모델 선택" 드롭다운
- **Select**: `#aiModel` - 3개 옵션
- **설명**: `#aiModelDesc` - 선택된 모델 설명 표시

#### LocalStorage 저장
- **키**: `content_generator_ai_model`
- **값**: `gpt-4o` | `gpt-4-turbo` | `gpt-3.5-turbo`
- **자동 로드**: 페이지 로드 시 이전 선택값 복원

#### 테스트 케이스
1. **TC-AI-001**: 기본 모델 확인
   - 단계: 페이지 로드 → AI 모델 선택 확인
   - 예상: "GPT-4o" 선택됨, 설명 표시

2. **TC-AI-002**: 모델 변경
   - 단계: "GPT-4 Turbo" 선택 → 설명 확인
   - 예상: 설명 "높은 품질, 느린 속도" 표시, LocalStorage 저장

3. **TC-AI-003**: GPT-3.5 선택 및 생성
   - 단계: "GPT-3.5 Turbo" 선택 → 콘텐츠 생성
   - 예상: 빠른 생성, 품질 차이 확인 가능

4. **TC-AI-004**: 모델 선택 유지
   - 단계: GPT-4 선택 → 페이지 새로고침
   - 예상: GPT-4가 여전히 선택된 상태

5. **TC-AI-005**: API 요청 확인
   - 단계: 각 모델 선택 → 콘텐츠 생성 → Network 탭 확인
   - 예상: API 요청의 `aiModel` 필드에 선택된 모델 전달

---

### 5. 다국어 지원 (v2.0)

#### 지원 언어
- 🇰🇷 한국어 (ko)
- 🇺🇸 영어 (en)
- 🇯🇵 일본어 (ja)
- 🇨🇳 중국어 (zh)

#### UI 위치
- **언어 선택**: 헤더 우측 상단의 국기 아이콘 (🇰🇷 🇺🇸 🇯🇵 🇨🇳)
- **자동 번역**: 모든 UI 텍스트 즉시 변경
- **LocalStorage**: 선택 언어 자동 저장

#### 테스트 케이스
1. **TC-I18N-001**: 기본 언어 한국어
2. **TC-I18N-002**: 영어로 전환 → 모든 텍스트 영문 표시
3. **TC-I18N-003**: 일본어로 전환 → 모든 텍스트 일본어 표시
4. **TC-I18N-004**: 중국어로 전환 → 모든 텍스트 중국어 표시
5. **TC-I18N-005**: 새로고침 후 언어 유지

---

### 6. 실시간 비용 계산기 (v2.0)

#### 기능 설명
이미지 수 × 플랫폼 수에 따른 예상 비용을 USD와 KRW로 동시에 실시간 표시합니다.

#### 비용 구조
- **이미지 분석**: $0.01/장
- **블로그 생성**: $0.04
- **인스타그램 생성**: $0.03
- **스레드 생성**: $0.02
- **유튜브 숏폼 생성**: $0.04

#### 환율 정보
- **API**: https://api.exchangerate-api.com/v4/latest/USD
- **캐싱**: 24시간 LocalStorage 캐시
- **기본값**: ₩1,300/$ (API 실패 시)

#### 계산 예시
- 이미지 2장 + 블로그 + 인스타그램 = $0.02 + $0.04 + $0.03 = **$0.09 / ₩117**
- 이미지 10장 + 4개 플랫폼 = $0.10 + $0.13 = **$0.23 / ₩299**

#### UI 위치
- **카드**: 입력 폼 하단의 "예상 비용" 그라데이션 카드
- **업데이트**: 이미지 추가/삭제, 플랫폼 선택 변경 시 자동 갱신

#### 테스트 케이스
1. **TC-COST-001**: 초기 상태 (이미지 0, 플랫폼 0)
   - 예상: "이미지와 플랫폼을 선택하면 예상 비용이 표시됩니다."
   
2. **TC-COST-002**: 이미지 1장 + 블로그 1개
   - 예상: $0.05 / ₩65 표시

3. **TC-COST-003**: 이미지 10장 + 4개 플랫폼
   - 예상: $0.23 / ₩299 표시

4. **TC-COST-004**: 플랫폼 체크 해제
   - 단계: 블로그 체크 해제
   - 예상: 비용 실시간 감소

5. **TC-COST-005**: 환율 표시
   - 예상: 하단에 "환율: $1 = ₩1,XXX" 표시

---

### 7. 브랜드 프로필 관리 (v2.0)

#### 기능 설명
자주 사용하는 브랜드 정보를 프로필로 저장하여 빠르게 불러올 수 있습니다.

#### 저장 데이터
- brand, companyName, businessType, location, targetGender
- contact, website, sns
- keywords, tone, targetAge, industry

#### LocalStorage
- **키**: `content_generator_profiles`
- **최대**: 50개 프로필

#### 테스트 케이스
1. **TC-PROF-001**: 프로필 저장
2. **TC-PROF-002**: 프로필 불러오기 → 입력 폼 자동 채워짐
3. **TC-PROF-003**: 프로필 삭제
4. **TC-PROF-004**: 50개 제한 테스트

---

### 8. 생성 히스토리 관리 (v2.0)

#### 기능 설명
생성된 콘텐츠를 자동으로 저장하여 나중에 다시 확인하거나 재사용할 수 있습니다.

#### 저장 데이터
- formData (입력 정보)
- resultData (생성 결과)
- createdAt (생성 시각)

#### LocalStorage
- **키**: `content_generator_history`
- **최대**: 50개 히스토리

#### 테스트 케이스
1. **TC-HIST-001**: 자동 저장 → 히스토리 목록 확인
2. **TC-HIST-002**: 히스토리 보기 → 결과 탭에 표시
3. **TC-HIST-003**: 히스토리 삭제
4. **TC-HIST-004**: 50개 제한 테스트

---

### 9. 확장 입력 폼 (v2.0)

#### 입력 항목 (총 11개)
1. **브랜드명** (필수) - brand
2. **회사 상호명** - companyName
3. **사업자 유형** - businessType (개인/법인/프리랜서)
4. **지역** - location (서울, 경기, ... 17개 시도)
5. **타겟 성별** - targetGender (남성/여성/전체)
6. **연락처** - contact
7. **웹사이트** - website
8. **SNS 계정** - sns
9. **핵심 키워드** (필수) - keywords
10. **톤앤매너** - tone (캐주얼/전문가/감성)
11. **타겟 연령대** - targetAge (10대/20대/30대/40대/50대+)
12. **산업 분야** - industry (뷰티/패션/F&B/IT/헬스케어/라이프스타일)

#### 테스트 케이스
1. **TC-FORM-001**: 모든 필드 입력 → 생성
2. **TC-FORM-002**: 필수 필드만 입력 → 생성
3. **TC-FORM-003**: 필수 필드 누락 → 경고

---

### 10. 멀티 이미지 업로드 (v1.0)

#### 제약 사항
- **최대 장수**: 10장
- **총 용량**: 50MB
- **지원 형식**: image/* (JPEG, PNG, GIF, WEBP 등)

#### 기능
- 파일 선택 (클릭)
- 드래그앤드롭
- 실시간 프리뷰 (썸네일)
- 개별 이미지 삭제
- 이미지 편집 버튼 (v3.0 추가)

#### 테스트 케이스
1. **TC-UP-001**: 1장 업로드
2. **TC-UP-002**: 10장 업로드 → 성공
3. **TC-UP-003**: 11장 업로드 시도 → 경고 "최대 10장"
4. **TC-UP-004**: 50MB 초과 → 경고
5. **TC-UP-005**: 드래그앤드롭 → 성공
6. **TC-UP-006**: 개별 이미지 삭제 → 프리뷰 갱신
7. **TC-UP-007**: 이미지 편집 버튼 표시 확인

---

### 11. 4개 플랫폼 콘텐츠 생성 (v1.0)

#### 지원 플랫폼
1. **네이버 블로그** (blog)
   - 1,300-2,000자
   - SEO 최적화
   - 제목, 본문, 태그, 이미지 키워드

2. **인스타그램** (instagram)
   - 200-300자 캡션
   - 25-30개 해시태그
   - CTA 포함

3. **스레드** (threads)
   - 200-300자
   - 7-10개 해시태그
   - 대화형 톤

4. **유튜브 숏폼** (youtube)
   - 45-60초 스크립트
   - 제목 3개 제안
   - 설명, 태그, 썸네일 텍스트

#### 생성 프로세스
1. 이미지 Vision API 분석 (병렬)
2. 플랫폼별 프롬프트 생성
3. GPT 모델로 콘텐츠 생성 (병렬)
4. 결과 반환 (JSON)

#### 테스트 케이스
1. **TC-GEN-001**: 블로그만 선택 → 생성
2. **TC-GEN-002**: 4개 플랫폼 모두 선택 → 생성
3. **TC-GEN-003**: 플랫폼 미선택 → 경고
4. **TC-GEN-004**: 생성 시간 측정 (30-60초 예상)
5. **TC-GEN-005**: API 오류 처리 확인

---

### 12. AI 이미지 분석 (v1.0)

#### OpenAI Vision API
- **모델**: gpt-4o (Vision 지원)
- **분석 항목**:
  - 주요 피사체 및 제품
  - 색상 톤 및 분위기
  - 구도 및 레이아웃
  - 텍스트 또는 로고
  - 감정적 느낌
  - 타겟층 추측
  - 메시지 전달 의도

#### 처리 방식
- 각 이미지별 개별 분석
- 병렬 처리 (Promise.all)
- 300-500자 상세 설명
- 결과 통합하여 프롬프트에 포함

#### 테스트 케이스
1. **TC-VIS-001**: 이미지 1장 분석 → 결과 확인
2. **TC-VIS-002**: 이미지 10장 분석 → 병렬 처리 확인
3. **TC-VIS-003**: 분석 결과가 콘텐츠에 반영되는지 확인

---

### 13. 결과 관리 (v1.0)

#### 기능
- **탭 표시**: 플랫폼별 탭으로 결과 분리
- **복사**: 클립보드 복사 기능
- **다운로드**: .txt 파일로 저장
- **글자 수 표시**: 실시간 글자 수 카운트

#### 테스트 케이스
1. **TC-RES-001**: 탭 전환 → 콘텐츠 변경
2. **TC-RES-002**: 복사 버튼 → 알림 "복사되었습니다!"
3. **TC-RES-003**: 다운로드 버튼 → .txt 파일 다운로드
4. **TC-RES-004**: 글자 수 표시 확인

---

## 🔧 기술 스택 상세

### 백엔드
- **Hono**: v4.0+ (경량 웹 프레임워크)
- **OpenAI API**: v6.15.0 (GPT-4o + Vision)
- **TypeScript**: v5.0+
- **Wrangler**: v3.78+ (Cloudflare CLI)

### 프론트엔드
- **HTML5/CSS3**
- **Vanilla JavaScript** (app-v3.js)
- **Tailwind CSS** (CDN)
- **Font Awesome** (아이콘)
- **다국어**: i18n.js (커스텀 모듈)

### 배포
- **Cloudflare Workers**: 엣지 런타임
- **Cloudflare Pages**: 정적 파일 호스팅
- **LocalStorage**: 클라이언트 데이터 저장

### 개발 도구
- **Vite**: v6.4+ (빌드 도구)
- **PM2**: 프로세스 관리
- **Git**: 버전 관리
- **Node.js**: v18+

---

## 📁 프로젝트 구조

```
webapp/
├── src/
│   ├── index.tsx           # Hono 앱 메인 엔트리 (API 라우트)
│   ├── prompts.ts          # 플랫폼별 프롬프트 템플릿
│   └── html-template.ts    # HTML 템플릿 (SSR)
├── public/
│   └── static/
│       ├── app-v3.js       # 프론트엔드 메인 JavaScript (v3.0)
│       ├── app-enhanced.js # 프론트엔드 JavaScript (v2.0, 백업)
│       ├── i18n.js         # 다국어 모듈
│       └── modals.html     # 모달 HTML (참고용)
├── dist/                   # 빌드 결과물
│   ├── _worker.js          # Cloudflare Worker 번들
│   └── _routes.json        # 라우팅 설정
├── .git/                   # Git 저장소
├── .gitignore              # Git 제외 파일 목록
├── .dev.vars               # 환경 변수 (OPENAI_API_KEY)
├── ecosystem.config.cjs    # PM2 설정 (CommonJS)
├── wrangler.jsonc          # Cloudflare 설정 (JSONC, 주석 지원)
├── package.json            # NPM 패키지 설정
├── tsconfig.json           # TypeScript 설정
├── vite.config.ts          # Vite 빌드 설정
├── README.md               # 프로젝트 문서
├── TESTING_GUIDE.md        # 테스트 가이드 (v2.0)
└── AI_TESTING_FULL_SPEC.md # 이 문서 (v3.0)
```

---

## 🚀 환경 설정 및 실행

### 1. 환경 변수 설정
```bash
# .dev.vars 파일 생성
echo 'OPENAI_API_KEY=sk-proj-your-actual-openai-api-key' > .dev.vars
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 빌드
```bash
npm run build
```

### 4. 로컬 개발 서버 시작
```bash
# 방법 1: PM2 사용 (권장)
pm2 start ecosystem.config.cjs
pm2 logs webapp --nostream

# 방법 2: 직접 실행 (개발 전용)
npm run dev:sandbox
```

### 5. 테스트
```bash
curl http://localhost:3000
```

### 6. 서버 관리
```bash
pm2 list              # 프로세스 목록
pm2 restart webapp    # 재시작
pm2 stop webapp       # 중지
pm2 delete webapp     # 제거
```

---

## 🧪 전수 테스트 체크리스트

### 기본 기능 테스트 (v1.0)
- [ ] 페이지 로드 확인
- [ ] 다국어 전환 (한/영/일/중)
- [ ] 이미지 업로드 (1장/10장/드래그앤드롭)
- [ ] 이미지 개별 삭제
- [ ] 입력 폼 작성 (필수 항목)
- [ ] 플랫폼 선택 (개별/전체)
- [ ] 콘텐츠 생성 (로딩 표시)
- [ ] 결과 표시 (탭 전환)
- [ ] 결과 복사
- [ ] 결과 다운로드

### v2.0 기능 테스트
- [ ] 비용 계산 실시간 업데이트
- [ ] USD/KRW 동시 표시
- [ ] 환율 API 호출 및 캐싱
- [ ] 프로필 저장
- [ ] 프로필 불러오기
- [ ] 프로필 삭제
- [ ] 히스토리 자동 저장
- [ ] 히스토리 보기
- [ ] 히스토리 삭제
- [ ] 확장 입력 폼 (11개 항목)

### v3.0 신규 기능 테스트 ⭐
- [ ] **템플릿 생성**: 이름, 플랫폼, 내용 입력 → 저장
- [ ] **템플릿 수정**: 기존 템플릿 내용 변경
- [ ] **템플릿 적용**: 선택한 템플릿 적용 알림
- [ ] **템플릿 삭제**: 템플릿 제거 및 LocalStorage 확인
- [ ] **템플릿 50개 제한**: 최대 개수 확인
- [ ] **CSV 파일 업로드**: 유효한 CSV 선택
- [ ] **CSV 파싱**: 헤더와 데이터 행 정상 파싱
- [ ] **배치 생성 실행**: 여러 브랜드 동시 처리
- [ ] **배치 결과 표시**: 브랜드별 카드 형식
- [ ] **배치 오류 처리**: 일부 실패 시에도 계속 진행
- [ ] **이미지 편집기 열기**: 프리뷰에서 편집 버튼 클릭
- [ ] **흑백 필터 적용**: Canvas에 흑백 효과
- [ ] **밝기 필터 적용**: 밝기 증가
- [ ] **대비 필터 적용**: 대비 증가
- [ ] **이미지 압축**: 70% 품질 압축 및 알림
- [ ] **편집 저장**: 편집 결과 프리뷰 반영
- [ ] **편집 취소**: 원본 유지
- [ ] **AI 모델 선택**: GPT-4o/4-turbo/3.5-turbo 전환
- [ ] **모델 설명 표시**: 선택 시 설명 변경
- [ ] **모델 선택 저장**: LocalStorage 저장 및 로드
- [ ] **모델 적용 확인**: API 요청 시 선택 모델 전달

### 통합 테스트
- [ ] **템플릿 + 생성**: 커스텀 템플릿으로 콘텐츠 생성
- [ ] **배치 + 이미지 편집**: 편집된 이미지로 배치 생성
- [ ] **AI 모델 + 비용 계산**: 모델별 비용 차이 확인
- [ ] **다국어 + 모든 기능**: 영어 모드에서 전체 기능 테스트

### 오류 처리 테스트
- [ ] OpenAI API 키 미설정 → 에러 메시지
- [ ] 이미지 미업로드 → 경고 알림
- [ ] 플랫폼 미선택 → 경고 알림
- [ ] CSV 형식 오류 → 에러 메시지
- [ ] 네트워크 오류 시뮬레이션
- [ ] 대량 이미지 업로드 (>10장) → 제한
- [ ] 대용량 파일 (>50MB) → 제한

### 성능 테스트
- [ ] 이미지 10장 + 4개 플랫폼 생성 시간 (60-120초 예상)
- [ ] 배치 10개 브랜드 처리 시간
- [ ] LocalStorage 저장 속도 (50개 프로필/히스토리)
- [ ] 환율 API 캐싱 동작 확인

### 브라우저 호환성
- [ ] Chrome (최신)
- [ ] Firefox (최신)
- [ ] Safari (최신)
- [ ] Edge (최신)
- [ ] Mobile (iOS Safari, Android Chrome)

---

## 📊 API 엔드포인트 명세

### 1. POST /api/generate
**단일 콘텐츠 생성**

**Request:**
```json
{
  "brand": "브랜드명",
  "companyName": "회사명",
  "businessType": "법인",
  "location": "서울",
  "targetGender": "여성",
  "contact": "02-1234-5678",
  "website": "https://example.com",
  "sns": "@example",
  "keywords": "키워드1, 키워드2",
  "tone": "캐주얼",
  "targetAge": "20대",
  "industry": "뷰티",
  "images": ["data:image/png;base64,...", "..."],
  "platforms": ["blog", "instagram"],
  "aiModel": "gpt-4o"
}
```

**Response (성공):**
```json
{
  "success": true,
  "data": {
    "blog": "생성된 블로그 콘텐츠...",
    "instagram": "생성된 인스타그램 콘텐츠..."
  },
  "generatedPlatforms": ["blog", "instagram"],
  "imageCount": 2
}
```

**Response (실패):**
```json
{
  "success": false,
  "error": "에러 메시지"
}
```

---

### 2. POST /api/generate/batch
**배치 콘텐츠 생성**

**Request:**
```json
{
  "batchData": [
    {
      "brand": "브랜드1",
      "keywords": "키워드1",
      "tone": "캐주얼",
      "targetAge": "20대",
      "industry": "뷰티",
      // ... 기타 필드
    },
    {
      "brand": "브랜드2",
      // ...
    }
  ],
  "images": ["data:image/png;base64,..."],
  "platforms": ["blog", "instagram"],
  "aiModel": "gpt-4o"
}
```

**Response (성공):**
```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "brand": "브랜드1",
      "data": {
        "blog": "...",
        "instagram": "..."
      },
      "index": 1
    },
    {
      "success": false,
      "brand": "브랜드2",
      "error": "생성 오류",
      "index": 2
    }
  ],
  "totalCount": 2,
  "imageCount": 1
}
```

---

### 3. POST /api/templates/save
**템플릿 저장 (실제로는 프론트엔드 LocalStorage 관리)**

**Response:**
```json
{
  "success": true,
  "message": "Template management is handled on client-side"
}
```

---

## 🔐 환경 변수

### .dev.vars (로컬 개발)
```bash
OPENAI_API_KEY=sk-proj-your-openai-api-key
```

### Cloudflare Pages 환경 변수 (배포 시)
- **OPENAI_API_KEY**: OpenAI API 키 (wrangler secret put)

---

## 📝 데이터 구조 (LocalStorage)

### 1. 프로필 (content_generator_profiles)
```json
[
  {
    "id": "1703261234567",
    "name": "올리브영 프로필",
    "data": {
      "brand": "올리브영",
      "companyName": "(주)올리브영",
      "keywords": "화장품, 뷰티",
      "tone": "캐주얼",
      "targetAge": "20대",
      "industry": "뷰티",
      // ... 기타 필드
    },
    "createdAt": "2023-12-23T10:00:00.000Z"
  }
]
```

### 2. 히스토리 (content_generator_history)
```json
[
  {
    "id": "1703261234568",
    "formData": {
      "brand": "올리브영",
      "keywords": "화장품",
      // ...
    },
    "resultData": {
      "blog": "생성된 콘텐츠...",
      "instagram": "..."
    },
    "createdAt": "2023-12-23T10:05:00.000Z"
  }
]
```

### 3. 템플릿 (content_generator_templates) ⭐ NEW
```json
[
  {
    "id": "1703261234569",
    "name": "블로그 감성 템플릿",
    "platform": "blog",
    "content": "당신은 감성적인 블로그 작가입니다. ...",
    "createdAt": "2023-12-23T10:10:00.000Z"
  }
]
```

### 4. AI 모델 선택 (content_generator_ai_model) ⭐ NEW
```json
"gpt-4o"
```

### 5. 환율 정보 (exchange_rate, exchange_rate_time)
```json
// exchange_rate
"1300.50"

// exchange_rate_time
"1703261234570"
```

### 6. 현재 언어 (content_generator_language)
```json
"ko"
```

---

## 🎨 UI/UX 세부 사항

### 색상 팔레트
- **Primary**: Purple (#667eea ~ #764ba2) - 그라데이션
- **Secondary**: Blue (#2563eb)
- **Success**: Green (#10b981)
- **Warning**: Orange (#f59e0b)
- **Danger**: Red (#ef4444)
- **Neutral**: Gray (#6b7280)

### 폰트
- **시스템 폰트**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

### 아이콘
- **Font Awesome 6.4.0**: CDN 사용
- 주요 아이콘: fa-image, fa-upload, fa-save, fa-folder-open, fa-history, fa-file-alt, fa-edit, fa-robot

### 애니메이션
- **fade-in**: 0.3s ease-out
- **spin**: 1s linear infinite (로딩 스피너)
- **transition**: 0.2s (버튼 hover)

### 반응형 디자인
- **모바일**: 1열 레이아웃
- **태블릿**: 2열 레이아웃
- **데스크톱**: 3-4열 레이아웃
- **max-width**: 1200px (컨테이너)

---

## 🐛 알려진 이슈 및 제한사항

### 현재 제한사항
1. **템플릿 적용**: 실제로 프롬프트에 반영되는 백엔드 로직 미구현 (v3.1에서 구현 예정)
2. **이미지 크롭**: 필터만 지원, 크롭/회전 기능 없음
3. **CSV 검증**: 엄격한 형식 검증 없음, 오류 시 건너뜀
4. **배치 생성 속도**: 순차 처리로 인한 시간 소요 (10개 브랜드 = 10-15분)
5. **모바일 최적화**: 이미지 편집 기능 모바일에서 제한적

### 향후 개선 사항
- 템플릿 실제 적용 로직 구현
- 이미지 크롭/회전 기능 추가
- CSV 스키마 검증 강화
- 배치 생성 병렬 처리 (Worker Pool)
- PWA 지원 (오프라인 모드)
- 더 많은 플랫폼 지원 (TikTok, Facebook, LinkedIn)

---

## 📈 성능 메트릭

### 예상 처리 시간
- **이미지 1장 분석**: 2-3초
- **이미지 10장 분석 (병렬)**: 3-5초
- **플랫폼 1개 생성**: 5-10초
- **플랫폼 4개 생성 (병렬)**: 10-15초
- **전체 프로세스 (10장 + 4플랫폼)**: 30-60초

### 예상 비용
- **최소 (1장 + 블로그)**: $0.05 / ₩65
- **일반 (2장 + 블로그+인스타)**: $0.09 / ₩117
- **권장 (4장 + 4플랫폼)**: $0.17 / ₩221
- **최대 (10장 + 4플랫폼)**: $0.23 / ₩299

---

## 🎓 사용 가이드

### 일반 사용자 워크플로우
1. 페이지 접속
2. (선택) 언어 변경
3. 이미지 업로드 (1-10장)
4. (선택) 이미지 편집 (필터/압축)
5. 브랜드 정보 입력 (필수: 브랜드명, 키워드)
6. (선택) 추가 정보 입력
7. (선택) AI 모델 선택
8. 플랫폼 선택 (1-4개)
9. 비용 확인
10. "콘텐츠 생성" 클릭
11. 로딩 대기 (30-60초)
12. 결과 확인 (탭 전환)
13. 복사/다운로드

### 프로필 활용 워크플로우
1. 자주 사용하는 브랜드 정보 입력
2. "프로필 저장" 클릭 → 이름 입력
3. 다음 사용 시 "프로필 불러오기" → 선택
4. 자동으로 입력 폼 채워짐
5. 이미지만 업로드하고 생성

### 배치 생성 워크플로우
1. CSV 파일 준비 (예시 형식 참고)
2. CSV 파일 업로드
3. 공통 이미지 업로드
4. 플랫폼 선택
5. AI 모델 선택
6. "배치 생성 시작" 클릭
7. 진행 상황 확인
8. 브랜드별 결과 확인 및 다운로드

### 템플릿 활용 워크플로우
1. "템플릿" 버튼 클릭
2. "새 템플릿 만들기" 클릭
3. 템플릿 이름, 플랫폼, 프롬프트 내용 입력
4. 저장
5. 콘텐츠 생성 시 템플릿 적용 (현재는 알림만)

---

## 🔍 디버깅 가이드

### 브라우저 개발자 도구
- **Console**: JavaScript 오류 확인
- **Network**: API 요청/응답 확인
- **Application**: LocalStorage 데이터 확인

### PM2 로그 확인
```bash
pm2 logs webapp --nostream  # 최근 로그 확인
pm2 logs webapp             # 실시간 로그 스트림 (주의: 블로킹)
```

### 환경 변수 확인
```bash
cat .dev.vars  # API 키 설정 확인
```

### LocalStorage 초기화
```javascript
// 브라우저 Console에서 실행
localStorage.clear();
location.reload();
```

---

## 🚀 배포 가이드 (Cloudflare Pages)

### 1. API 키 설정
```bash
# Cloudflare API 키 설정 (Deploy 탭에서)
# 또는 wrangler 사용:
wrangler pages secret put OPENAI_API_KEY --project-name webapp
```

### 2. 빌드
```bash
npm run build
# dist/ 디렉토리 생성 확인
```

### 3. Cloudflare Pages 프로젝트 생성
```bash
wrangler pages project create webapp \
  --production-branch main \
  --compatibility-date 2024-01-01
```

### 4. 배포
```bash
wrangler pages deploy dist --project-name webapp
```

### 5. 배포 확인
- Production URL: https://random-id.webapp.pages.dev
- Branch URL: https://main.webapp.pages.dev

---

## 📞 지원 및 문의

### 이슈 리포트
- 버그 발견 시 상세 재현 단계와 스크린샷 포함
- 브라우저, OS, 버전 정보 명시

### 기능 요청
- 사용 사례와 기대 효과 설명
- 우선순위 제안 (필수/권장/선택)

---

## 📚 참고 자료

### 공식 문서
- [Hono 문서](https://hono.dev/)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages 문서](https://developers.cloudflare.com/pages/)

### 관련 기술
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Vite 가이드](https://vitejs.dev/guide/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)

---

## ✅ 전수조사 완료 체크

AI가 이 문서를 기반으로 전수조사를 수행한 후, 다음 사항을 확인하세요:

- [ ] 모든 기능이 명세대로 동작하는지 확인
- [ ] 테스트 케이스별 결과 기록
- [ ] 발견된 버그 목록 작성
- [ ] 개선 제안 사항 정리
- [ ] 성능 메트릭 측정 결과
- [ ] 브라우저 호환성 확인 결과
- [ ] 사용자 시나리오별 플로우 검증
- [ ] API 응답 시간 및 비용 검증

---

## 📋 변경 이력

### v3.0 (2025-12-23)
- ✨ 콘텐츠 템플릿 커스터마이징 기능 추가
- ✨ 배치 생성 모드 (CSV 업로드) 추가
- ✨ 이미지 편집 기능 (흑백/밝기/대비/압축) 추가
- ✨ AI 모델 선택 옵션 (GPT-4o/4-turbo/3.5-turbo) 추가
- 📝 전수조사용 상세 문서 작성

### v2.0 (2025-12-22)
- ✨ 다국어 지원 (한/영/일/중) 추가
- ✨ 실시간 비용 계산기 (USD/KRW) 추가
- ✨ 브랜드 프로필 관리 기능 추가
- ✨ 생성 히스토리 관리 기능 추가
- ✨ 확장 입력 폼 (11개 항목) 추가

### v1.0 (2025-12-21)
- 🎉 초기 릴리스
- 멀티 이미지 업로드 (최대 10장, 50MB)
- 4개 플랫폼 콘텐츠 생성 (블로그/인스타/스레드/유튜브)
- AI 이미지 분석 (Vision API)
- 결과 관리 (복사/다운로드)

---

**문서 버전**: v3.0  
**작성일**: 2025-12-23  
**최종 수정**: 2025-12-23  
**작성자**: AI Assistant  
**목적**: AI 전수조사 및 기능 테스트를 위한 상세 명세

---

이 문서는 AI가 프로젝트를 완벽하게 이해하고 전수조사를 수행할 수 있도록 모든 기능, API, UI, 데이터 구조, 테스트 케이스를 상세히 기술하였습니다. AI는 이 문서를 참고하여 체계적이고 포괄적인 테스트를 수행할 수 있습니다.
