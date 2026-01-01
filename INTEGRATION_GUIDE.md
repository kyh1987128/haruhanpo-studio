# 🎯 하루한포 백엔드 시스템 통합 가이드

## 📁 생성된 파일 목록

```
/home/user/webapp/
├── supabase-schema.sql               # Supabase 데이터베이스 스키마
├── src/
│   ├── lib/
│   │   ├── supabase.ts               # Supabase 클라이언트 유틸리티
│   │   ├── file-processor.ts         # 파일 처리 및 컨텍스트 생성
│   │   └── storage.ts                # Supabase Storage 업로드
│   ├── middleware/
│   │   └── auth.ts                   # 인증 및 크레딧 체크 미들웨어
│   └── routes/
│       └── payments.ts               # 토스페이먼츠 결제 라우트
```

---

## ⚙️ Step 1: 의존성 설치

```bash
cd /home/user/webapp

# Supabase 클라이언트
npm install @supabase/supabase-js

# 파일 처리 (선택사항 - Cloudflare Workers에서 제한적)
# npm install pdfjs-dist mammoth

# 타입 정의
npm install -D @types/node
```

---

## 🔧 Step 2: 환경 변수 설정

### `.env.local` 파일 생성

```bash
cd /home/user/webapp

cat > .env.local << 'EOF'
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...

# 토스페이먼츠
TOSS_CLIENT_KEY=test_ck_xxx
TOSS_SECRET_KEY=test_sk_xxx
TOSS_WEBHOOK_SECRET=whsec_xxx

# Google OAuth (Supabase Auth에서 사용)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# 기존 AI 키 유지
OPENAI_API_KEY=sk-proj-xxx
GEMINI_API_KEY=AIzaSyxxx

# 앱 URL (선택사항)
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# .gitignore에 추가 (보안)
echo ".env.local" >> .gitignore
```

### `wrangler.jsonc` 환경 변수 추가

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "haruhanpo",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  
  // 프로덕션 배포 시 Cloudflare Pages에 환경 변수 설정 필요
  "vars": {
    "NEXT_PUBLIC_SUPABASE_URL": "",
    "SUPABASE_ANON_KEY": "",
    "TOSS_CLIENT_KEY": "",
    "NEXT_PUBLIC_APP_URL": "https://haruhanpo.pages.dev"
  }
}
```

---

## 🗄️ Step 3: Supabase 데이터베이스 설정

### 3.1 SQL 스키마 실행

1. Supabase Dashboard 접속
2. SQL Editor 메뉴 클릭
3. `supabase-schema.sql` 파일 내용 전체 복사
4. 붙여넣기 → **RUN** 버튼 클릭
5. 성공 확인: Tables 메뉴에서 테이블 생성 확인

### 3.2 Supabase Auth 설정

1. Authentication → Providers 메뉴
2. Google 활성화:
   - Enabled: ON
   - Client ID: (Google OAuth에서 발급)
   - Client Secret: (Google OAuth에서 발급)
3. **Save** 클릭

### 3.3 Supabase Storage 설정

1. Storage → **New bucket** 클릭
2. Name: `haruhanpo-files`
3. Public bucket: **ON** (공개 버킷)
4. **Create bucket** 클릭

---

## 🔗 Step 4: 기존 index.tsx 통합

기존 `/home/user/webapp/src/index.tsx`를 수정하여 새로운 미들웨어와 라우트를 통합합니다.

### 4.1 import 추가

```typescript
// 기존 import 유지
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import OpenAI from 'openai';
import { getBlogPrompt, getInstagramPrompt, getThreadsPrompt, getYouTubePrompt } from './prompts';
import { htmlTemplate } from './html-template';
import { analyzeImageWithGemini, generateContentWithGemini } from './gemini';

// ✅ 새로운 import 추가
import { authMiddleware, checkCredits, Env } from './middleware/auth';
import { createSupabaseAdminClient, deductCredit, saveGeneration } from './lib/supabase';
import { 
  classifyFiles, 
  processDocuments, 
  buildIntegratedContext, 
  validateFiles,
  determineScenario
} from './lib/file-processor';
import { uploadMultipleFiles, saveUploadedFile } from './lib/storage';
import payments from './routes/payments';
```

### 4.2 타입 정의 수정

```typescript
// 기존 타입 정의 수정
type Bindings = Env; // Env는 middleware/auth.ts에서 import
```

### 4.3 결제 라우트 마운트

```typescript
const app = new Hono<{ Bindings: Bindings }>();

// CORS 설정
app.use('/api/*', cors());

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }));

// ✅ 결제 라우트 마운트
app.route('/api/payments', payments);
```

### 4.4 /api/generate 엔드포인트 확장

기존 `/api/generate` 코드 위에 새로운 버전 추가:

```typescript
// ✅ 새로운 /api/generate (파일 처리 + 크레딧 시스템)
app.post('/api/generate', authMiddleware, checkCredits, async (c) => {
  const startTime = Date.now();
  
  try {
    const body = await c.req.json();
    const {
      brand,
      keywords,
      tone,
      targetAge,
      industry,
      images, // base64 이미지 배열
      documents, // base64 문서 파일 배열 (선택사항)
      platforms,
      variables = {}
    } = body;
    
    const user = c.get('user');
    const isGuest = c.get('isGuest');
    
    // 1. 파일 검증
    const allFiles = [...(images || []), ...(documents || [])];
    
    if (allFiles.length === 0) {
      return c.json({
        error: '파일 없음',
        message: '최소 1개의 파일(이미지 또는 문서)을 업로드해주세요.'
      }, 400);
    }
    
    // 2. 파일 분류
    const { images: imageFiles, documents: docFiles } = classifyFiles(allFiles);
    const { scenario, cost } = determineScenario(imageFiles.length, docFiles.length);
    
    // 3. 이미지 분석 (있을 경우만)
    let imageAnalysis: string | null = null;
    
    if (imageFiles.length > 0) {
      const geminiApiKey = c.env.GEMINI_API_KEY;
      
      if (geminiApiKey) {
        // Gemini Flash 사용
        const analyses = await Promise.all(
          imageFiles.slice(0, 5).map(img => 
            analyzeImageWithGemini(geminiApiKey, img)
          )
        );
        imageAnalysis = analyses.join('\n\n');
      } else {
        // GPT-4o Vision 사용 (fallback)
        const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });
        const analysis = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: '이미지를 상세히 분석해주세요.' },
              { type: 'image_url', image_url: { url: imageFiles[0] } }
            ]
          }],
          max_tokens: 1000
        });
        imageAnalysis = analysis.choices[0].message.content || '';
      }
    }
    
    // 4. 문서 텍스트 추출 (있을 경우만)
    const extractedTexts = docFiles.length > 0 
      ? await processDocuments(docFiles) 
      : [];
    
    // 5. 통합 컨텍스트 생성
    const context = buildIntegratedContext({
      imageAnalysis,
      extractedTexts,
      userVariables: {
        브랜드명: brand,
        산업분야: industry,
        톤앤매너: tone,
        타깃연령대: targetAge,
        ...variables
      },
      keywords
    });
    
    // 6. AI 콘텐츠 생성 (기존 로직 사용)
    const generationTasks = [];
    
    if (platforms.includes('blog')) {
      // ... 기존 블로그 생성 로직
    }
    
    // ... 나머지 플랫폼 생성
    
    const results = await Promise.all(generationTasks);
    const data: Record<string, string> = {};
    results.forEach(({ platform, content }) => {
      data[platform] = content;
    });
    
    // 7. 크레딧 차감 (회원만)
    let generationId: string | undefined;
    
    if (!isGuest && user) {
      const adminClient = createSupabaseAdminClient(
        c.env.SUPABASE_URL,
        c.env.SUPABASE_SERVICE_KEY
      );
      
      // 생성 기록 저장
      const generation = await saveGeneration(adminClient, {
        userId: user.id,
        fileType: scenario,
        imageCount: imageFiles.length,
        documentCount: docFiles.length,
        platforms,
        costKrw: cost,
        success: true,
        generationTimeMs: Date.now() - startTime
      });
      
      generationId = generation.id;
      
      // 크레딧 차감
      await deductCredit(adminClient, user.id, generationId);
    }
    
    return c.json({
      success: true,
      data,
      generatedPlatforms: platforms,
      imageCount: imageFiles.length,
      documentCount: docFiles.length,
      scenario,
      cost,
      generationTime: Date.now() - startTime
    });
  } catch (error: any) {
    console.error('콘텐츠 생성 오류:', error);
    return c.json({
      success: false,
      error: error.message || '콘텐츠 생성 중 오류가 발생했습니다.'
    }, 500);
  }
});
```

---

## ✅ Step 5: 빌드 및 테스트

```bash
cd /home/user/webapp

# 빌드
npm run build

# PM2로 개발 서버 시작
pm2 restart webapp

# 또는
npm run dev:sandbox
```

### 테스트 시나리오

```bash
# 1. 비회원 체험 테스트
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "테스트 브랜드",
    "keywords": "테스트 키워드",
    "images": ["data:image/png;base64,..."],
    "platforms": ["blog"]
  }'

# 예상: 성공 (1회만)

# 2. 회원 테스트 (Google 로그인 후)
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "테스트",
    "keywords": "키워드",
    "images": ["..."],
    "platforms": ["blog"]
  }'

# 예상: 크레딧 차감 후 성공
```

---

## 🎯 최종 체크리스트

```
□ Supabase 프로젝트 생성 완료
□ SQL 스키마 실행 완료
□ Google OAuth 설정 완료
□ Storage 버킷 생성 완료
□ .env.local 파일 설정 완료
□ 의존성 설치 완료
□ index.tsx 통합 완료
□ 빌드 성공 확인
□ 비회원 체험 테스트 통과
□ 회원 크레딧 차감 테스트 통과
□ 결제 테스트 통과 (토스페이먼츠 테스트 카드)
```

---

## 🚀 다음 단계

1. ✅ 프로덕션 배포 준비
   - Cloudflare Pages에 환경 변수 설정
   - `npx wrangler pages deploy dist`

2. ✅ 토스페이먼츠 프로덕션 전환
   - 테스트 키 → 프로덕션 키
   - Webhook URL 등록

3. ✅ 모니터링 설정
   - Sentry 연동 (에러 추적)
   - Vercel Analytics (트래픽 분석)

---

## 📞 문제 해결

### 문제 1: Supabase 연결 실패
- 환경 변수 확인: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Supabase Dashboard에서 프로젝트 상태 확인

### 문제 2: 크레딧 차감 안 됨
- PostgreSQL 함수 `deduct_credit` 실행 확인
- Supabase Logs 확인

### 문제 3: 파일 업로드 실패
- Storage 버킷 생성 확인
- Public 설정 확인
- 파일 크기 제한 확인 (10MB)

---

## 📚 참고 문서

- Supabase: https://supabase.com/docs
- Hono: https://hono.dev
- 토스페이먼츠: https://docs.tosspayments.com
- Cloudflare Workers: https://developers.cloudflare.com/workers

---

**🎉 모든 코드 생성 완료! 이제 통합 및 테스트를 진행하세요.**
