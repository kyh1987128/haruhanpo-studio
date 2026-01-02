# 🔑 환경 변수 설정 가이드

## 📋 **필요한 환경 변수**

`.dev.vars` 파일에 다음 5개의 실제 키를 입력해야 합니다:

### **1. Supabase 설정**
```bash
SUPABASE_URL=https://gmjbsndricdogtqsovnb.supabase.co  # ✅ 이미 설정됨
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_KEY=your-supabase-service-key-here
```

**Supabase 키 찾는 방법:**
1. Supabase Dashboard 접속: https://supabase.com/dashboard
2. 프로젝트 선택: `gmjbsndricdogtqsovnb`
3. 좌측 메뉴: Settings → API
4. **Project API keys** 섹션에서:
   - `anon` `public` → `SUPABASE_ANON_KEY`
   - `service_role` `secret` → `SUPABASE_SERVICE_KEY`

⚠️ **주의:** `service_role` 키는 관리자 권한이므로 절대 노출 금지!

---

### **2. OpenAI API 키**
```bash
OPENAI_API_KEY=your-openai-api-key-here
```

**OpenAI 키 찾는 방법:**
1. OpenAI Platform 접속: https://platform.openai.com/api-keys
2. `+ Create new secret key` 클릭
3. 키 이름 입력 (예: `haruhanpo-dev`)
4. 생성된 키 복사 (형식: `sk-proj-...`)

---

### **3. Gemini API 키**
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

**Gemini 키 찾는 방법:**
1. Google AI Studio 접속: https://aistudio.google.com/app/apikey
2. `Create API Key` 클릭
3. 프로젝트 선택
4. 생성된 키 복사

---

## 🛠️ **설정 방법**

### **방법 1: 직접 편집 (권장)**
```bash
cd /home/user/webapp
vi .dev.vars
```

**vi 에디터 사용법:**
1. `i` 키 눌러서 편집 모드 진입
2. 키 값 입력 (붙여넣기: `Shift + Insert` 또는 마우스 우클릭)
3. `Esc` 키 눌러서 명령 모드로
4. `:wq` 입력하고 Enter (저장 후 종료)

---

### **방법 2: Echo 명령어 (빠른 방법)**
```bash
cd /home/user/webapp

# Supabase 키 설정
cat > .dev.vars << 'EOF'
SUPABASE_URL=https://gmjbsndricdogtqsovnb.supabase.co
SUPABASE_ANON_KEY=실제-anon-키-붙여넣기
SUPABASE_SERVICE_KEY=실제-service-키-붙여넣기
OPENAI_API_KEY=실제-openai-키-붙여넣기
GEMINI_API_KEY=실제-gemini-키-붙여넣기
EOF
```

---

## ✅ **설정 확인**

```bash
# 파일 존재 확인
ls -la /home/user/webapp/.dev.vars

# 내용 확인 (보안상 키는 마스킹됨)
cat .dev.vars | grep -v "^#" | grep "="
```

**예상 출력:**
```
SUPABASE_URL=https://gmjbsndricdogtqsovnb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...
```

---

## 🚨 **보안 주의사항**

1. ✅ `.dev.vars` 파일은 `.gitignore`에 포함되어 있음 (확인 완료)
2. ❌ 절대 Git에 커밋하지 말 것
3. ❌ `service_role` 키는 프론트엔드에 노출 금지
4. ✅ 로컬 개발 환경에서만 사용

---

## 📌 **다음 단계**

환경 변수 설정 완료 후:
```bash
# 1. 빌드
npm run build

# 2. PM2 재시작
pm2 restart webapp

# 3. 테스트
curl http://localhost:3000
```

---

**작성일:** 2026-01-02  
**대상:** 로컬 개발 환경  
**우선순위:** Critical
