# 🔄 크레딧 사용 정책 변경 작업 가이드

## 📌 변경 요약

### 기존 (복잡한 차등 과금)
```
1개 플랫폼   = 1크레딧
2-3개 플랫폼 = 2크레딧
4-9개 플랫폼 = 4크레딧
10-12개 플랫폼 = 5크레딧
```

### 변경 후 (초간단 - 권장안 B)
```
1회 생성 = 1크레딧 (플랫폼 개수 무관)
```

---

## 🎯 수정 대상 코드

### 파일: `src/index.tsx`

#### 수정 위치 1: 라인 454-461 (초기 크레딧 체크)

**기존 코드:**
```typescript
// 🚨 크리티컬: 차등 과금 계산 (플랫폼 수에 따라)
const platformCount = platforms.length;
let requiredCredits = 1;
if (platformCount >= 4) {
  requiredCredits = 4;
} else if (platformCount >= 2) {
  requiredCredits = 2;
}
```

**변경 후:**
```typescript
// ✅ 간단 과금: 1회 생성 = 1크레딧 (플랫폼 개수 무관)
const requiredCredits = 1; // 항상 1크레딧
```

---

#### 수정 위치 2: 라인 661-667 (차등 과금 계산 함수)

**기존 코드:**
```typescript
// 1. 필요 크레딧 계산 함수
const calculateRequiredCredits = (platformCount: number): number => {
  if (platformCount === 0) return 0;
  if (platformCount === 1) return 1;
  if (platformCount <= 3) return 2;    // 2-3개: 2크레딧
  if (platformCount <= 9) return 4;    // 4-9개: 4크레딧
  return 5;                            // 10-13개: 5크레딧 ✅
};
```

**변경 후:**
```typescript
// ✅ 필요 크레딧 계산 (간단 과금: 1회 생성 = 1크레딧)
const calculateRequiredCredits = (platformCount: number): number => {
  return platformCount > 0 ? 1 : 0; // 플랫폼이 있으면 1크레딧, 없으면 0
};
```

---

#### 수정 위치 3: 라인 452, 658 (주석 변경)

**기존 주석:**
```typescript
// ✅ 회원 크레딧 체크 (차등 과금 적용)
// ✅ 차등 과금 시스템 (플랫폼 개수별 크레딧 차감)
```

**변경 후:**
```typescript
// ✅ 회원 크레딧 체크 (1회 생성 = 1크레딧)
// ✅ 크레딧 차감 시스템 (1회 생성 = 1크레딧, 플랫폼 개수 무관)
```

---

### 파일: `public/payment.html` (UI 텍스트)

#### 수정 위치: 라인 21-25

**기존 코드:**
```html
<div class="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 inline-block">
  <p class="text-white/90 text-sm">
    💡 <strong>차등 과금 안내:</strong> 1개=1크레딧 | 2-3개=2크레딧 | 4-9개=4크레딧
  </p>
</div>
```

**변경 후:**
```html
<div class="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 inline-block">
  <p class="text-white/90 text-sm">
    💡 <strong>초간단 과금:</strong> 1회 생성 = 1크레딧 (플랫폼 개수 무제한!)
  </p>
</div>
```

---

### 파일: `src/index.tsx` (메인 페이지 HTML 템플릿)

메인 페이지에서 크레딧 사용 안내가 있다면 동일하게 수정:

```typescript
// 검색: "차등 과금" 또는 "1개=1크레딧"
// 찾은 부분을 "1회 생성 = 1크레딧"로 변경
```

---

## 📝 상세 수정 단계

### Step 1: 백엔드 로직 수정

```bash
# src/index.tsx 파일 수정
# 1. 라인 454-461 단순화
# 2. 라인 661-667 함수 단순화  
# 3. 관련 주석 업데이트
```

### Step 2: 프론트엔드 UI 수정

```bash
# public/payment.html 파일 수정
# 라인 21-25 텍스트 변경
```

### Step 3: 빌드 및 테스트

```bash
# 빌드
npm run build

# 로컬 테스트
pm2 restart webapp
curl http://localhost:3000/api/generate -X POST -H "Content-Type: application/json" -d '{
  "platforms": ["blog", "instagram", "threads"],
  "images": ["test.jpg"],
  "user_id": "test-user-id",
  "is_guest": false
}'

# 크레딧 소모 확인 (1크레딧만 차감되어야 함)
```

---

## ✅ 수정 완료 체크리스트

### 백엔드
- [ ] `calculateRequiredCredits` 함수 단순화
- [ ] 초기 크레딧 체크 로직 단순화
- [ ] 관련 주석 업데이트
- [ ] 로그 메시지 확인

### 프론트엔드
- [ ] `payment.html` 안내 문구 변경
- [ ] 메인 페이지 안내 문구 확인 (있는 경우)

### 테스트
- [ ] 1개 플랫폼 선택 시 1크레딧 소모
- [ ] 3개 플랫폼 선택 시 1크레딧 소모
- [ ] 12개 플랫폼 선택 시 1크레딧 소모
- [ ] 크레딧 부족 시 에러 처리

### 배포
- [ ] 빌드 성공
- [ ] 로컬 테스트 완료
- [ ] 프로덕션 배포

---

## 🧪 테스트 시나리오

### 테스트 1: 1개 플랫폼 (기대: 1크레딧)
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["blog"],
    "images": ["test.jpg"],
    "user_id": "test-user",
    "is_guest": false
  }'

# 기대 결과: requiredCredits = 1
```

### 테스트 2: 5개 플랫폼 (기대: 1크레딧)
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["blog", "instagram", "threads", "youtube", "twitter"],
    "images": ["test.jpg"],
    "user_id": "test-user",
    "is_guest": false
  }'

# 기대 결과: requiredCredits = 1 (기존: 4크레딧)
```

### 테스트 3: 12개 플랫폼 (기대: 1크레딧)
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["blog", "instagram", "threads", "youtube", 
                  "twitter", "linkedin", "kakaotalk", "brunch", 
                  "tiktok", "instagram_reels", "youtube_shorts", "instagram_feed"],
    "images": ["test.jpg"],
    "user_id": "test-user",
    "is_guest": false
  }'

# 기대 결과: requiredCredits = 1 (기존: 5크레딧)
```

---

## 🚨 주의사항

### 1. 기존 사용자 데이터
- 기존 사용자는 영향 없음 (크레딧 잔액 유지)
- 새 정책은 변경 후 생성부터 적용

### 2. 수익 영향
- **단기**: 수익 감소 가능 (특히 대량 플랫폼 사용자)
- **장기**: 사용자 만족도 증가 → 신규 사용자 증가

### 3. 남용 방지
- Rate limiting 고려 (시간당 생성 제한)
- 모니터링 강화 (이상 사용 패턴 감지)

---

## 📊 예상 효과

### 긍정적 효과
1. ✅ **사용자 경험 개선**: 계산 불필요
2. ✅ **전환율 증가**: 부담 없는 가격
3. ✅ **마케팅 효과**: "12개 = 1크레딧" 강력한 메시지

### 주의할 점
1. ⚠️ **수익 감소**: 대량 사용자로부터 수익 감소
2. ⚠️ **남용 가능성**: 제한 없는 플랫폼 선택

### 대응 방안
1. ✅ **대량 구매 유도**: 패키지 할인 강화
2. ✅ **프리미엄 기능**: 추가 기능으로 수익 보완
3. ✅ **모니터링**: 이상 사용 패턴 감지 및 제한

---

## 📞 문제 발생 시

### 롤백 방법
```bash
# Git으로 이전 버전 복구
git diff HEAD src/index.tsx
git checkout HEAD -- src/index.tsx

# 재빌드
npm run build
pm2 restart webapp
```

### 긴급 연락
- **개발팀**: 즉시 롤백 실행
- **사용자 공지**: "일시적 오류, 복구 중"

---

**작성일**: 2026-01-11  
**권장안**: 개선안 B (1회 생성 = 1크레딧)  
**상태**: 검토 대기 중
