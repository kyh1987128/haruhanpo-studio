# 무료 이미지 API 설정 가이드 (v8.3)

## 📋 **개요**

마케팅허브 v8.3의 **이미지 스마트 배치 시스템**은 3개의 무료 이미지 API를 통합하여 **1,000만+ 이미지**를 제공합니다.

### **API 통합 전략**
1. **사용자 업로드 이미지** 우선 사용
2. **Unsplash** → **Pexels** → **Pixabay** 순차 검색
3. **DALL-E 3 AI 생성** (최후 수단)

---

## 🎨 **1. Unsplash API** ⭐ 권장

### **특징**
- **이미지 수**: 300만+ 고품질 전문가 사진
- **품질**: 최고 품질 (전문 사진작가)
- **할당량**: 50 requests/hour (무료)
- **라이선스**: 무료 상업적 사용 가능
- **해상도**: 최대 6000x4000px

### **발급 방법** (5분)

#### **Step 1: 회원가입**
1. https://unsplash.com/developers 접속
2. **"Register as a Developer"** 클릭
3. 이메일/비밀번호로 회원가입 또는 Google 로그인

#### **Step 2: 애플리케이션 생성**
1. 로그인 후 **"Your apps"** 클릭
2. **"New Application"** 클릭
3. 약관 동의 체크
4. 애플리케이션 정보 입력:
   ```
   Application name: Marketing Hub Image System
   Description: Image placement system for blog and SNS content
   ```
5. **"Create application"** 클릭

#### **Step 3: API 키 복사**
1. 생성된 애플리케이션 클릭
2. **"Keys"** 탭에서 **"Access Key"** 복사
3. `.dev.vars` 파일에 추가:
   ```bash
   UNSPLASH_ACCESS_KEY=YOUR_ACCESS_KEY_HERE
   ```

### **사용 제한**
- **무료**: 50 requests/hour
- **Demo**: 50 requests/hour (애플리케이션 미승인 시)
- **Production**: 5,000 requests/hour (승인 후)

### **승인 신청** (선택사항)
1. 애플리케이션 **"Settings"** 탭
2. **"Apply for Production"** 클릭
3. 사용 사례 설명 (영문):
   ```
   We use Unsplash API to automatically place high-quality images in blog posts and SNS content. 
   Our system generates marketing content for 12 platforms including Naver Blog, Brunch, Instagram.
   Expected usage: ~200 requests/day for 100+ daily active users.
   ```
4. 1-3일 내 심사 완료

---

## 📸 **2. Pexels API**

### **특징**
- **이미지 수**: 300만+ 상업용 무료 사진
- **품질**: 고품질 (상업용 최적화)
- **할당량**: 200 requests/hour (무료)
- **라이선스**: Pexels License (무료 상업적 사용)
- **해상도**: 최대 8000x6000px

### **발급 방법** (3분)

#### **Step 1: 회원가입**
1. https://www.pexels.com/api/ 접속
2. **"Get Started"** 클릭
3. 이메일/비밀번호로 회원가입

#### **Step 2: API 키 발급**
1. 로그인 후 자동으로 API 키 생성
2. 또는 https://www.pexels.com/api/new/ 접속
3. 애플리케이션 정보 입력:
   ```
   Name: Marketing Hub
   Description: Image placement for blog content
   URL: https://your-domain.com (선택사항)
   ```
4. **"Generate API Key"** 클릭

#### **Step 3: API 키 복사**
1. 생성된 API 키 복사
2. `.dev.vars` 파일에 추가:
   ```bash
   PEXELS_API_KEY=YOUR_API_KEY_HERE
   ```

### **사용 제한**
- **무료**: 200 requests/hour
- **월간**: ~20,000 requests/month
- **필수**: API 사용 시 Pexels 크레딧 표시

---

## 🖼️ **3. Pixabay API**

### **특징**
- **이미지 수**: 430만+ 사진/일러스트/벡터
- **품질**: 중-고품질 (일러스트 풍부)
- **할당량**: 100 requests/minute (무료)
- **라이선스**: Pixabay Content License (무료 상업적 사용)
- **특수**: 일러스트, 벡터 그래픽 포함

### **발급 방법** (2분)

#### **Step 1: 회원가입**
1. https://pixabay.com/ 접속
2. 우측 상단 **"Join"** 클릭
3. 이메일/비밀번호로 회원가입

#### **Step 2: API 키 발급**
1. https://pixabay.com/api/docs/ 접속
2. 로그인 상태에서 페이지 상단에 API 키 자동 표시
3. 또는 **"API"** 탭 → **"Get API Key"** 클릭

#### **Step 3: API 키 복사**
1. 표시된 API 키 복사
2. `.dev.vars` 파일에 추가:
   ```bash
   PIXABAY_API_KEY=YOUR_API_KEY_HERE
   ```

### **사용 제한**
- **무료**: 100 requests/minute
- **일간**: ~5,000 requests/day
- **필수**: API 사용 시 Pixabay 크레딧 표시

---

## 🔧 **로컬 개발 환경 설정**

### **1. .dev.vars 파일 생성**
```bash
# .env.template 복사
cp .env.template .dev.vars

# 또는 직접 생성
cat > .dev.vars << 'EOF'
# OpenAI API
OPENAI_API_KEY=sk-proj-...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 무료 이미지 API
UNSPLASH_ACCESS_KEY=YOUR_UNSPLASH_ACCESS_KEY
PEXELS_API_KEY=YOUR_PEXELS_API_KEY
PIXABAY_API_KEY=YOUR_PIXABAY_API_KEY
EOF
```

### **2. 빌드 및 실행**
```bash
# 빌드
npm run build

# PM2로 실행
pm2 start ecosystem.config.cjs

# 로그 확인
pm2 logs webapp --nostream
```

### **3. 테스트**
```bash
# 이미지 API 테스트
curl -X POST http://localhost:3000/api/images/smart-fetch \
  -H "Content-Type: application/json" \
  -d '{
    "userImages": [],
    "keywords": ["마산 어시장", "신선한 해산물"],
    "requiredCount": 3,
    "platform": "blog"
  }'
```

---

## ☁️ **Cloudflare Pages 프로덕션 설정**

### **환경 변수 설정**
```bash
# Unsplash
npx wrangler pages secret put UNSPLASH_ACCESS_KEY --project-name webapp

# Pexels
npx wrangler pages secret put PEXELS_API_KEY --project-name webapp

# Pixabay
npx wrangler pages secret put PIXABAY_API_KEY --project-name webapp

# 설정 확인
npx wrangler pages secret list --project-name webapp
```

---

## 📊 **API 비교표**

| API | 이미지 수 | 할당량 | 품질 | 특징 | 승인 필요 |
|-----|----------|--------|------|------|----------|
| **Unsplash** | 300만+ | 50/hour | ⭐⭐⭐⭐⭐ | 전문가 사진 | ✅ Production |
| **Pexels** | 300만+ | 200/hour | ⭐⭐⭐⭐ | 상업용 최적화 | ❌ |
| **Pixabay** | 430만+ | 100/min | ⭐⭐⭐ | 일러스트 포함 | ❌ |

---

## 💡 **권장 설정 전략**

### **최소 설정** (1개)
- **Unsplash만 설정**: 고품질 보장, 50 requests/hour

### **권장 설정** (2개)
- **Unsplash + Pexels**: 할당량 250 requests/hour, 다양성 증가

### **최적 설정** (3개) ⭐
- **Unsplash + Pexels + Pixabay**: 할당량 분산, 최대 선택지

---

## 🚨 **주의사항**

### **1. API 키 보안**
- `.dev.vars` 파일은 **절대 Git에 커밋하지 마세요**
- `.gitignore`에 `.dev.vars` 포함 확인
- 프로덕션 환경은 `wrangler pages secret` 사용

### **2. 크레딧 표시**
- Unsplash: "Photo by [작가명] on Unsplash" (자동 생성)
- Pexels: "Photo by [작가명] on Pexels" (자동 생성)
- Pixabay: "Image by [작가명] on Pixabay" (자동 생성)

### **3. 할당량 관리**
- 50 requests/hour ≈ **1,200 requests/day** (Unsplash)
- 200 requests/hour ≈ **4,800 requests/day** (Pexels)
- 100 requests/min ≈ **144,000 requests/day** (Pixabay)

### **4. 실패 시 자동 폴백**
```
사용자 이미지 → Unsplash → Pexels → Pixabay → DALL-E 3
```
- 어느 한 API가 실패해도 다음 API로 자동 전환
- 모든 API 실패 시 AI 이미지 생성

---

## 🎉 **설정 완료 체크리스트**

### **Phase 1: API 키 발급** (10분)
- [ ] Unsplash 회원가입 및 애플리케이션 생성
- [ ] Pexels 회원가입 및 API 키 발급
- [ ] Pixabay 회원가입 및 API 키 확인

### **Phase 2: 로컬 개발** (5분)
- [ ] `.dev.vars` 파일에 3개 API 키 추가
- [ ] `npm run build` 실행
- [ ] `pm2 start ecosystem.config.cjs` 실행
- [ ] 이미지 API 테스트 (curl)

### **Phase 3: 프로덕션 배포** (5분)
- [ ] `wrangler pages secret put` 3회 실행
- [ ] `wrangler pages deploy` 실행
- [ ] 프로덕션 URL에서 이미지 생성 테스트

---

## 📞 **문제 해결**

### **"Unsplash API 오류: 401 Unauthorized"**
**원인**: API 키가 잘못되었거나 만료됨  
**해결**: Access Key 재확인 또는 재발급

### **"Pexels API 오류: 403 Forbidden"**
**원인**: API 키가 유효하지 않음  
**해결**: https://www.pexels.com/api/new/ 에서 재발급

### **"Pixabay API 오류: 400 Bad Request"**
**원인**: API 키 형식 오류 또는 할당량 초과  
**해결**: API 키 확인 또는 1분 후 재시도

### **"이미지가 생성되지 않음"**
**원인**: 3개 API 모두 실패 + DALL-E 3 API 키 없음  
**해결**: 최소 1개 이상의 무료 API 설정 또는 OPENAI_API_KEY 추가

---

**작성일**: 2026-01-13  
**버전**: v8.3 (Image Smart Placement)  
**작성자**: 웹 빌더 AI
