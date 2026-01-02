import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import OpenAI from 'openai';
import { getBlogPrompt, getInstagramPrompt, getThreadsPrompt, getYouTubePrompt, getYoutubeLongformPrompt, getShortformPrompt, getMetadataPrompt, getInstagramFeedPrompt } from './prompts';
import { htmlTemplate } from './html-template';
import { analyzeImageWithGemini, generateContentWithGemini, calculateGeminiCost, estimateTokens } from './gemini';
import { createSupabaseAdmin, createSupabaseClient, grantMilestoneCredit, updateConsecutiveLogin, checkAndUseMonthlyQuota } from './lib/supabase';
import { parseMultipleDocuments, combineDocumentTexts, truncateText } from './document-parser';

type Bindings = {
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 설정
app.use('/api/*', cors());

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }));

// API 라우트: 템플릿 저장 (LocalStorage 사용, 프론트엔드에서 관리)
app.post('/api/templates/save', async (c) => {
  // 실제로는 프론트엔드 LocalStorage에서 관리하므로 이 API는 참고용
  return c.json({ success: true, message: 'Template management is handled on client-side' });
});

// API 라우트: 키워드 자동 추천
app.post('/api/suggest-keywords', async (c) => {
  try {
    const body = await c.req.json();
    const { images, brand, industry } = body;

    if (!images || images.length === 0) {
      return c.json(
        { success: false, error: '이미지가 필요합니다.' },
        400
      );
    }

    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json(
        { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' },
        500
      );
    }

    const openai = new OpenAI({ apiKey });

    // 이미지 분석 후 키워드 추출
    const imageContent = images.map((img: string, idx: number) => ({
      type: 'image_url' as const,
      image_url: { url: img }
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '당신은 마케팅 키워드 전문가입니다. 이미지를 분석하여 SEO 최적화된 핵심 키워드를 추천하세요.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `다음 이미지를 분석하여 마케팅에 효과적인 핵심 키워드 10개를 추천해주세요.

${brand ? `브랜드: ${brand}` : ''}
${industry ? `산업분야: ${industry}` : ''}

요구사항:
- 이미지에 실제로 보이는 것을 기반으로 추천
- SEO에 효과적인 키워드
- 한글로 작성
- 2-4단어 조합 가능
- JSON 배열로만 응답: ["키워드1", "키워드2", ...]

예시: ["스킨케어", "보습크림", "민감성피부", "수분공급", "천연성분"]`
            },
            ...imageContent
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const content = response.choices[0].message.content || '[]';
    
    // JSON 파싱 (코드블록 제거)
    let keywords = [];
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      keywords = JSON.parse(cleaned);
    } catch (e) {
      // 파싱 실패 시 줄바꿈으로 분리 시도
      keywords = content.split('\n')
        .map(line => line.trim().replace(/^[-*•]\s*/, '').replace(/^["']|["']$/g, ''))
        .filter(k => k && k.length > 1 && k.length < 30)
        .slice(0, 10);
    }

    console.log('추천 키워드:', keywords);

    return c.json({
      success: true,
      keywords: keywords
    });

  } catch (error: any) {
    console.error('키워드 추천 오류:', error);
    return c.json(
      { success: false, error: error.message || '키워드 추천 중 오류가 발생했습니다.' },
      500
    );
  }
});

// API 라우트: 배치 생성 (CSV 업로드)
app.post('/api/generate/batch', async (c) => {
  try {
    const body = await c.req.json();
    const {
      batchData, // [{brand, keywords, tone, ...}, {...}, ...]
      images, // base64 이미지 배열 (공통)
      platforms,
      aiModel = 'gpt-4o',
    } = body;

    if (!batchData || !Array.isArray(batchData) || batchData.length === 0) {
      return c.json(
        { success: false, error: '배치 데이터가 없습니다.' },
        400
      );
    }

    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json(
        { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' },
        500
      );
    }

    const openai = new OpenAI({ apiKey });

    // 이미지 분석 (공통)
    let combinedImageDescription = '';
    if (images && images.length > 0) {
      const imageAnalyses = await Promise.all(
        images.map(async (imageBase64: string, index: number) => {
          try {
            const analysis = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `이미지 ${index + 1}을 상세히 분석해주세요. 주요 피사체, 색상 톤, 분위기, 구도, 감정을 300-500자로 설명해주세요.`,
                    },
                    {
                      type: 'image_url',
                      image_url: { url: imageBase64 },
                    },
                  ],
                },
              ],
              max_tokens: 1000,
            });
            return {
              index: index + 1,
              description: analysis.choices[0].message.content || '이미지 분석 실패',
            };
          } catch (error: any) {
            return {
              index: index + 1,
              description: `이미지 ${index + 1} 분석 중 오류 발생`,
            };
          }
        })
      );

      combinedImageDescription = imageAnalyses
        .map((img) => `[이미지 ${img.index}]\n${img.description}`)
        .join('\n\n');
    }

    // 각 브랜드별 콘텐츠 생성
    const batchResults = await Promise.all(
      batchData.map(async (brandData: any, index: number) => {
        try {
          const {
            brand,
            companyName,
            businessType,
            location,
            targetGender,
            contact,
            website,
            sns,
            keywords,
            tone,
            targetAge,
            industry,
          } = brandData;

          const promptParams = {
            brand,
            companyName,
            businessType,
            location,
            targetGender,
            contact,
            website,
            sns,
            keywords,
            tone,
            targetAge,
            industry,
            imageDescription: combinedImageDescription,
            contentStrategy: 'auto' as const, // 배치 생성은 자동 전략 사용
          };

          const generationTasks = [];

          if (platforms.includes('blog')) {
            generationTasks.push(
              generateContent(openai, 'blog', getBlogPrompt(promptParams), aiModel)
            );
          }

          if (platforms.includes('instagram') || platforms.includes('instagram_feed')) {
            generationTasks.push(
              generateContent(openai, 'instagram', getInstagramPrompt(promptParams), aiModel)
            );
          }

          if (platforms.includes('threads')) {
            generationTasks.push(
              generateContent(openai, 'threads', getThreadsPrompt(promptParams), aiModel)
            );
          }

          if (platforms.includes('youtube') || platforms.includes('youtube_shorts')) {
            generationTasks.push(
              generateContent(openai, 'youtube', getYouTubePrompt(promptParams), aiModel)
            );
          }
          
          // 새로운 플랫폼: 유튜브 롱폼
          if (platforms.includes('youtube_longform')) {
            generationTasks.push(
              generateContent(openai, 'youtube_longform', getYoutubeLongformPrompt(promptParams), aiModel)
            );
          }
          
          // 새로운 플랫폼: 숏폼 (틱톡/릴스/쇼츠 통합)
          if (platforms.includes('shortform_multi') || platforms.includes('tiktok') || platforms.includes('instagram_reels')) {
            generationTasks.push(
              generateContent(openai, 'shortform_multi', getShortformPrompt(promptParams), aiModel)
            );
          }
          
          // 새로운 플랫폼: 메타데이터 생성
          if (platforms.includes('metadata_generation')) {
            generationTasks.push(
              generateContent(openai, 'metadata', getMetadataPrompt(promptParams), aiModel)
            );
          }

          const results = await Promise.all(generationTasks);

          const data: Record<string, string> = {};
          results.forEach(({ platform, content }) => {
            data[platform] = content;
          });

          return {
            success: true,
            brand: brand,
            data,
            index: index + 1,
          };
        } catch (error: any) {
          return {
            success: false,
            brand: brandData.brand || `브랜드 ${index + 1}`,
            error: error.message,
            index: index + 1,
          };
        }
      })
    );

    return c.json({
      success: true,
      results: batchResults,
      totalCount: batchData.length,
      imageCount: images?.length || 0,
    });
  } catch (error: any) {
    console.error('배치 생성 오류:', error);
    return c.json(
      {
        success: false,
        error: error.message || '배치 생성 중 오류가 발생했습니다.',
      },
      500
    );
  }
});

// API 라우트: 이미지 분석 및 콘텐츠 생성
app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json();
    const {
      user_id, // ✅ 추가: 사용자 식별
      is_guest = false, // ✅ 추가: 비회원 여부
      brand,
      companyName,
      businessType,
      location,
      targetGender,
      contact,
      website,
      sns,
      keywords,
      tone,
      targetAge,
      industry,
      images, // base64 이미지 배열
      platforms, // ['blog', 'instagram', 'threads', 'youtube']
      aiModel = 'gpt-4o', // AI 모델 선택 (기본값: gpt-4o)
      apiKey, // 클라이언트에서 전달받은 API 키
      forceGenerate = false, // 검증 우회 플래그
    } = body;

    // 입력 검증
    if (!brand || !keywords || !images || !platforms) {
      return c.json(
        {
          success: false,
          error: '필수 입력 항목이 누락되었습니다.',
        },
        400
      );
    }

    if (platforms.length === 0) {
      return c.json(
        {
          success: false,
          error: '최소 1개 플랫폼을 선택해주세요.',
        },
        400
      );
    }

    if (images.length === 0) {
      return c.json(
        {
          success: false,
          error: '최소 1장의 이미지를 업로드해주세요.',
        },
        400
      );
    }

    // ✅ Supabase Admin 클라이언트 초기화
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );

    // ✅ 비회원 체험 제한 체크 (IP 기반 1회 제한)
    if (is_guest) {
      const ipAddress = c.req.header('CF-Connecting-IP') || 
                        c.req.header('X-Forwarded-For') || 
                        c.req.header('X-Real-IP') || 
                        'unknown';
      
      const deviceFingerprint = c.req.header('X-Device-Fingerprint') || 
                                c.req.header('User-Agent') || 
                                'unknown';
      
      // 기존 체험 기록 조회
      const { data: trialData, error: trialError } = await supabase
        .from('trial_usage')
        .select('usage_count, is_blocked, block_reason')
        .eq('ip_address', ipAddress)
        .eq('device_fingerprint', deviceFingerprint)
        .single();
      
      // 차단된 경우
      if (trialData?.is_blocked) {
        return c.json({
          error: '접근 차단',
          message: trialData.block_reason || '어뷰징이 감지되어 체험이 차단되었습니다.',
          redirect: '/signup'
        }, 403);
      }
      
      // 이미 1회 사용한 경우
      if (trialData && trialData.usage_count >= 1) {
        return c.json({
          error: '무료 체험 제한',
          message: '무료 체험은 1회만 가능합니다. 회원 가입하시면 월 10회 무료로 이용하실 수 있습니다.',
          redirect: '/signup'
        }, 403);
      }
      
      console.log(`✅ 비회원 체험 허용: ${ipAddress}`);
    }

    // ✅ 회원 크레딧 및 월간 사용량 체크
    if (!is_guest && user_id) {
      // 사용자 정보 조회
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits, subscription_status, monthly_free_usage_count, monthly_limit')
        .eq('id', user_id)
        .single();
      
      if (userError || !user) {
        return c.json({
          error: '사용자 정보 조회 실패',
          message: '사용자를 찾을 수 없습니다. 다시 로그인해주세요.',
          redirect: '/login'
        }, 404);
      }
      
      console.log(`📊 사용자 상태: ${user_id} | 크레딧: ${user.credits} | 월간 사용: ${user.monthly_free_usage_count}/${user.monthly_limit || 10}`);
      
      // 유료 회원 (subscription_status === 'active')
      if (user.subscription_status === 'active') {
        // 크레딧만 체크
        if (user.credits < 1) {
          return c.json({
            error: '크레딧 부족',
            message: '크레딧이 부족합니다. 크레딧을 구매해주세요.',
            currentCredits: user.credits,
            redirect: '/payment'
          }, 403);
        }
        console.log(`✅ 유료 회원 크레딧 체크 통과: ${user.credits}크레딧`);
      } else {
        // 무료 회원: 월간 무료 사용량 체크
        const quotaResult = await checkAndUseMonthlyQuota(supabase, user_id);
        
        if (!quotaResult.available) {
          // 월간 무료 횟수 소진 → 크레딧 확인
          if (user.credits < 1) {
            return c.json({
              error: '월 10회 무료 사용 제한',
              message: '이번 달 무료 사용 횟수(10회)를 모두 소진했습니다. 크레딧을 구매하거나 다음 달을 기다려주세요.',
              monthlyUsed: user.monthly_free_usage_count,
              monthlyLimit: user.monthly_limit || 10,
              currentCredits: user.credits,
              redirect: '/payment'
            }, 403);
          }
          console.log(`⚠️ 무료 횟수 소진, 크레딧 사용 예정: ${user.credits}크레딧`);
        } else {
          console.log(`✅ 월간 무료 사용 허용: ${quotaResult.remaining}회 남음`);
        }
      }
    }

    // OpenAI API 키 확인 (환경변수에서만 읽기)
    const finalApiKey = c.env.OPENAI_API_KEY;
    if (!finalApiKey) {
      return c.json(
        {
          success: false,
          error: 'OpenAI API 키가 서버에 설정되지 않았습니다. 관리자에게 문의하세요.',
        },
        500
      );
    }

    const openai = new OpenAI({
      apiKey: finalApiKey,
    });

    // 🚀 하이브리드 전략: Gemini API 키 확인
    const geminiApiKey = c.env.GEMINI_API_KEY;
    
    // 📄 문서 파싱 제거: 이미지 + 텍스트 변수만 사용
    
    // 1단계: 모든 이미지 상세 분석 (Gemini Flash 사용 - 70% 비용 절감)
    console.log(`✨ [하이브리드] 이미지 ${images.length}장 분석 시작 (Gemini Flash)...`);
    const imageAnalyses = await Promise.all(
      images.map(async (imageBase64: string, index: number) => {
        try {
          let description = '';
          
          // Gemini API가 있으면 Gemini 사용, 없으면 OpenAI 사용
          if (geminiApiKey) {
            console.log(`  📸 이미지 ${index + 1}: Gemini Flash 분석`);
            description = await analyzeImageWithGemini(geminiApiKey, imageBase64);
          } else {
            console.log(`  📸 이미지 ${index + 1}: GPT-4o 분석 (Gemini 키 없음)`);
            const analysis = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `이미지 ${index + 1}을 매우 상세하게 분석해주세요.

다음 요소를 포함하여 분석:
- 주요 피사체 및 제품 (있다면)
- 색상 톤 및 분위기
- 구도 및 레이아웃
- 텍스트 또는 로고 (있다면)
- 감정적 느낌 (따뜻함, 세련됨, 활기참 등)
- 타겟층이 누구일지 추측
- 어떤 메시지를 전달하려는지

300-500자로 상세히 설명해주세요.`,
                    },
                    {
                      type: 'image_url',
                      image_url: { url: imageBase64 },
                    },
                  ],
                },
              ],
              max_tokens: 1000,
            });
            description = analysis.choices[0].message.content || '이미지 분석 실패';
          }

          return {
            index: index + 1,
            description,
          };
        } catch (error: any) {
          console.error(`❌ 이미지 ${index + 1} 분석 오류:`, error.message);
          return {
            index: index + 1,
            description: `[분석 실패] 이미지 ${index + 1}은(는) 처리할 수 없습니다. (파일 손상 또는 형식 문제)`,
            failed: true,
          };
        }
      })
    );

    // 모든 이미지 분석 결과를 하나의 문자열로 합침
    const combinedImageDescription = imageAnalyses
      .map((img) => `[이미지 ${img.index}]\n${img.description}`)
      .join('\n\n');

    console.log('이미지 분석 완료. 종합 검증 시스템 시작...');

    // 2단계: 🚀 종합 검증 시스템 - 모든 입력 항목의 일관성 검증
    let contentStrategy: 'integrated' | 'image-first' | 'keyword-first' | 'document-first' = 'integrated';
    let comprehensiveValidation: any = null;

    if (!forceGenerate) {
      try {
        const validationResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: '당신은 콘텐츠 마케팅 전문가입니다. 사용자가 입력한 모든 정보의 일관성을 검증하고 최적의 콘텐츠 전략을 제안합니다.',
            },
            {
              role: 'user',
              content: `사용자가 입력한 정보가 서로 일관성이 있는지 종합적으로 분석해주세요.

📸 이미지 분석 결과:
${combinedImageDescription}

📝 사용자 입력 정보:
- 브랜드명/서비스명: ${brand}
- 회사명: ${companyName || '없음'}
- 업종: ${businessType || '없음'}
- 웹사이트: ${website || '없음'}
- SNS: ${sns || '없음'}
- 핵심 키워드: ${keywords}
- 산업 분야: ${industry}
- 톤앤매너: ${tone}
- 타겟 연령대: ${targetAge}
- 타겟 성별: ${targetGender || '없음'}
- 지역: ${location || '없음'}
- 연락처: ${contact || '없음'}

아래 JSON 형식으로 응답하세요:
{
  "isConsistent": true/false,
  "overallConfidence": 0-100,
  "conflicts": [
    {
      "type": "image-keyword" | "image-brand" | "brand-website" | "industry-keyword" | "target-content",
      "severity": "high" | "medium" | "low",
      "description": "불일치 상세 설명 (한글, 100자 이내)",
      "items": ["항목1", "항목2"],
      "suggestion": "수정 제안 (한글, 100자 이내)"
    }
  ],
  "strategy": "integrated" | "image-first" | "keyword-first",
  "reason": "전략 선택 이유 (한글, 200자 이내)",
  "recommendation": "사용자에게 안내할 메시지 (한글, 150자 이내)"
}

검증 기준:

1️⃣ 이미지-키워드 일치성
   - 이미지 내용과 키워드가 관련 있는가?
   - 예: 카페 사진 + "IT 서비스" → high severity

2️⃣ 브랜드-이미지 일치성
   - 브랜드명과 이미지가 관련 있는가?
   - 예: "테슬라" + 카페 사진 → medium severity

3️⃣ 브랜드-웹사이트 일치성
   - 브랜드명과 웹사이트 도메인이 일치하는가?
   - 예: "테슬라" + "samsung.com" → medium severity

4️⃣ 산업-키워드 일치성
   - 산업 분야와 키워드가 관련 있는가?
   - 예: "제조업" + "IT 컨설팅" → low severity

5️⃣ 타겟-콘텐츠 일치성
   - 타겟 연령대/성별과 콘텐츠가 맞는가?
   - 예: "60대" + "트렌디한 SNS" → low severity

6️⃣ 종합 판단
   - high severity 충돌 2개 이상 → isConsistent: false
   - medium severity 충돌 3개 이상 → isConsistent: false
   - overallConfidence 40 미만 → isConsistent: false

전략 선택:
- integrated: 모든 요소 조화롭게 활용 (confidence 70+)
- image-first: 이미지 중심, 키워드 보조 (confidence 50-69)
- keyword-first: 키워드 중심, 이미지 참고 (confidence 30-49)

⚠️ 중요: 사소한 불일치는 허용하고, 명백한 모순만 충돌로 판단하세요.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        });

        const validationText = validationResponse.choices[0].message.content || '{}';
        const cleanedText = validationText.replace(/```json\n?|\n?```/g, '').trim();
        comprehensiveValidation = JSON.parse(cleanedText);

        console.log('종합 검증 결과:', comprehensiveValidation);

        // 전략 자동 선택
        contentStrategy = comprehensiveValidation.strategy || 'integrated';
        
        console.log(`선택된 전략: ${contentStrategy} (confidence: ${comprehensiveValidation.overallConfidence})`);
        console.log(`전략 이유: ${comprehensiveValidation.reason}`);

        // overallConfidence 40 미만 또는 high severity 충돌 있으면 경고
        const hasHighSeverity = comprehensiveValidation.conflicts?.some((c: any) => c.severity === 'high');
        
        if (comprehensiveValidation.overallConfidence < 40 || hasHighSeverity) {
          return c.json({
            success: false,
            requireConfirmation: true,
            validation: {
              isConsistent: comprehensiveValidation.isConsistent,
              confidence: comprehensiveValidation.overallConfidence,
              conflicts: comprehensiveValidation.conflicts || [],
              strategy: contentStrategy,
              reason: comprehensiveValidation.reason,
              recommendation: comprehensiveValidation.recommendation,
            },
            message: '⚠️ 입력하신 정보에 일관성 문제가 있습니다. 확인해주세요.',
          });
        }

      } catch (error: any) {
        console.error('종합 검증 오류:', error.message);
        // 검증 실패 시 기본 전략 사용
        contentStrategy = 'integrated';
        console.log('검증 분석 실패, 기본 전략(integrated) 사용');
      }
    } else {
      console.log('검증 우회 (사용자가 강제 진행 선택)');
      // 강제 진행 시 문서가 있으면 document-first, 없으면 keyword-first
      contentStrategy = 'keyword-first';
    }

    console.log(`전략 결정 완료: ${contentStrategy}. 콘텐츠 생성 시작...`);

    console.log(`하이브리드 전략 결정 완료: ${contentStrategy}. 콘텐츠 생성 시작...`);

    // 3단계: 선택된 플랫폼만 콘텐츠 생성 (병렬 처리)
    const promptParams = {
      brand,
      companyName,
      businessType,
      location,
      targetGender,
      contact,
      website,
      sns,
      keywords,
      tone,
      targetAge,
      industry,
      imageDescription: combinedImageDescription,
      contentStrategy: contentStrategy, // 하이브리드 전략 추가
    };

    // 🚀 하이브리드 전략 적용
    const generationTasks = [];
    let totalCost = { openai: 0, gemini: 0 };

    // 블로그: GPT-4o 사용 (최고 품질 필요)
    if (platforms.includes('blog')) {
      console.log('  📝 블로그: GPT-4o (최고 품질)');
      generationTasks.push(
        generateContent(openai, 'blog', getBlogPrompt(promptParams), aiModel).then(result => {
          totalCost.openai += 0.052; // 약 52원
          return result;
        })
      );
    }

    // 인스타그램: Gemini Flash (충분한 품질 + 저렴)
    if (platforms.includes('instagram')) {
      if (geminiApiKey) {
        console.log('  📷 인스타그램: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getInstagramPrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.010; // 약 10원
              return { platform: 'instagram', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'instagram', getInstagramPrompt(promptParams), aiModel));
      }
    }
    
    // 인스타그램 피드: Gemini Flash
    if (platforms.includes('instagram_feed')) {
      if (geminiApiKey) {
        console.log('  📷 인스타그램 피드: Gemini Flash');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getInstagramFeedPrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.010;
              return { platform: 'instagram_feed', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'instagram_feed', getInstagramFeedPrompt(promptParams), aiModel));
      }
    }

    // 스레드: Gemini Flash
    if (platforms.includes('threads')) {
      if (geminiApiKey) {
        console.log('  🧵 스레드: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getThreadsPrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.006; // 약 6원
              return { platform: 'threads', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'threads', getThreadsPrompt(promptParams), aiModel));
      }
    }

    // 유튜브 쇼츠: Gemini Flash
    if (platforms.includes('youtube') || platforms.includes('youtube_shorts')) {
      if (geminiApiKey) {
        console.log('  🎬 유튜브 쇼츠: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getYouTubePrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.023; // 약 23원
              return { platform: 'youtube', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'youtube', getYouTubePrompt(promptParams), aiModel));
      }
    }
    
    // 유튜브 롱폼: Gemini Flash
    if (platforms.includes('youtube_longform')) {
      if (geminiApiKey) {
        console.log('  🎥 유튜브 롱폼: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getYoutubeLongformPrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.023;
              return { platform: 'youtube_longform', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'youtube_longform', getYoutubeLongformPrompt(promptParams), aiModel));
      }
    }
    
    // 숏폼: Gemini Flash
    if (platforms.includes('shortform_multi') || platforms.includes('tiktok') || platforms.includes('instagram_reels')) {
      if (geminiApiKey) {
        console.log('  📱 숏폼: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getShortformPrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.023;
              return { platform: 'shortform_multi', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'shortform_multi', getShortformPrompt(promptParams), aiModel));
      }
    }
    
    // 메타데이터: Gemini Flash
    if (platforms.includes('metadata_generation')) {
      if (geminiApiKey) {
        console.log('  📊 메타데이터: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getMetadataPrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.015;
              return { platform: 'metadata', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'metadata', getMetadataPrompt(promptParams), aiModel));
      }
    }

    // 모든 생성 작업 완료 대기
    const results = await Promise.all(generationTasks);

    // 결과를 객체로 변환
    const data: Record<string, string> = {};
    results.forEach(({ platform, content }) => {
      data[platform] = content;
    });

    console.log('콘텐츠 생성 완료!');
    console.log(`💰 비용 추정: OpenAI $${totalCost.openai.toFixed(3)}, Gemini $${totalCost.gemini.toFixed(3)}, 총 $${(totalCost.openai + totalCost.gemini).toFixed(3)}`);

    // ✅ 크레딧 차감 로직
    let creditDeducted = false;
    let newCredits = 0;
    let usedMonthlyQuota = false;
    
    if (!is_guest && user_id) {
      // 사용자 정보 재조회
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits, subscription_status, monthly_free_usage_count, monthly_limit')
        .eq('id', user_id)
        .single();
      
      if (!userError && user) {
        // 유료 회원이거나 무료 횟수 소진한 경우 크레딧 차감
        const needCreditDeduction = 
          user.subscription_status === 'active' || 
          (user.monthly_free_usage_count >= (user.monthly_limit || 10));
        
        if (needCreditDeduction && user.credits > 0) {
          // 크레딧 1개 차감
          const { data: updatedUser, error: deductError } = await supabase
            .from('users')
            .update({ 
              credits: user.credits - 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', user_id)
            .select('credits')
            .single();
          
          if (!deductError && updatedUser) {
            newCredits = updatedUser.credits;
            creditDeducted = true;
            
            // credit_transactions 기록
            await supabase.from('credit_transactions').insert({
              user_id,
              amount: -1,
              balance_after: newCredits,
              type: 'usage',
              description: `콘텐츠 생성 (${platforms.join(', ')})`
            });
            
            console.log(`✅ 크레딧 차감: ${user_id} | -1크레딧 → 남은 크레딧 ${newCredits}`);
          } else {
            console.error('크레딧 차감 실패:', deductError);
          }
        } else if (!needCreditDeduction) {
          // 월간 무료 사용 (이미 checkAndUseMonthlyQuota에서 차감됨)
          usedMonthlyQuota = true;
          newCredits = user.credits;
          console.log(`✅ 월간 무료 사용: ${user_id} | 크레딧 차감 없음`);
        }
      }
    } else if (is_guest) {
      // 비회원 사용 기록
      const ipAddress = c.req.header('CF-Connecting-IP') || 
                        c.req.header('X-Forwarded-For') || 
                        c.req.header('X-Real-IP') || 
                        'unknown';
      
      const deviceFingerprint = c.req.header('X-Device-Fingerprint') || 
                                c.req.header('User-Agent') || 
                                'unknown';
      
      const userAgent = c.req.header('User-Agent') || 'unknown';
      
      // trial_usage 기록 업데이트
      const { data: existingTrial } = await supabase
        .from('trial_usage')
        .select('usage_count')
        .eq('ip_address', ipAddress)
        .eq('device_fingerprint', deviceFingerprint)
        .single();
      
      if (existingTrial) {
        // 기존 기록 업데이트
        await supabase
          .from('trial_usage')
          .update({
            usage_count: existingTrial.usage_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('ip_address', ipAddress)
          .eq('device_fingerprint', deviceFingerprint);
      } else {
        // 신규 기록 생성
        await supabase
          .from('trial_usage')
          .insert({
            ip_address: ipAddress,
            device_fingerprint: deviceFingerprint,
            user_agent: userAgent,
            usage_count: 1,
            last_used_at: new Date().toISOString()
          });
      }
      
      console.log(`✅ 비회원 사용 기록: ${ipAddress} | 1회 사용 완료`);
    }

    return c.json({
      success: true,
      data,
      generatedPlatforms: platforms,
      imageCount: images.length,
      strategy: {
        selected: contentStrategy,
        confidence: validation?.overallConfidence || 100,
        reason: validation?.reason || '기본 전략 사용',
        imageSummary: combinedImageDescription || '',
        userInputSummary: `${brand} - ${keywords}`,
      },
      cost: {
        openai: totalCost.openai,
        gemini: totalCost.gemini,
        total: totalCost.openai + totalCost.gemini,
        savings: geminiApiKey ? '약 52% 절감 (하이브리드 전략)' : '절감 없음',
      },
      // ✅ 크레딧 정보 추가
      credits: {
        deducted: creditDeducted,
        amount: creditDeducted ? -1 : 0,
        remaining: newCredits,
        usedMonthlyQuota: usedMonthlyQuota
      }
    });
  } catch (error: any) {
    console.error('콘텐츠 생성 오류:', error);
    return c.json(
      {
        success: false,
        error: error.message || '콘텐츠 생성 중 오류가 발생했습니다.',
      },
      500
    );
  }
});

// 콘텐츠 생성 헬퍼 함수
async function generateContent(
  openai: OpenAI,
  platform: string,
  prompt: string,
  aiModel: string = 'gpt-4o'
): Promise<{ platform: string; content: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: 'system',
          content: `당신은 ${platform} 콘텐츠 전문가입니다.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    return {
      platform,
      content: response.choices[0].message.content || `${platform} 콘텐츠 생성 실패`,
    };
  } catch (error: any) {
    console.error(`${platform} 콘텐츠 생성 오류:`, error.message);
    return {
      platform,
      content: `${platform} 콘텐츠 생성 중 오류가 발생했습니다: ${error.message}`,
    };
  }
}

// ========================================
// 인증 API (NEW v7.2)
// ========================================

// 사용자 동기화 엔드포인트
app.post('/api/auth/sync', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, email, name } = body;
    
    if (!user_id || !email) {
      return c.json({ error: 'user_id와 email은 필수입니다' }, 400);
    }
    
    // ✅ Supabase Admin 클라이언트 초기화
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // Supabase에 사용자 정보 조회 (UPSERT 대신 SELECT → INSERT/UPDATE)
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 신규 사용자인 경우
    if (selectError && selectError.code === 'PGRST116') {
      // 신규 가입: users 테이블에 INSERT (트리거가 5크레딧 자동 지급)
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user_id,
          email,
          name: name || null,
          last_login_date: today,
          consecutive_login_days: 1
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[Supabase] 사용자 생성 실패:', insertError);
        throw insertError;
      }
      
      console.log('✅ 신규 사용자 생성:', newUser.email, '5크레딧 지급');
      
      return c.json({
        success: true,
        user_id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        credits: newUser.credits, // 트리거에서 5크레딧 지급됨
        tier: 'free',
        subscription_status: newUser.subscription_status,
        monthly_free_usage_count: newUser.monthly_free_usage_count,
        monthly_limit: 10,
        monthly_remaining: 10 - newUser.monthly_free_usage_count,
        monthly_usage_reset_date: newUser.monthly_usage_reset_date,
        onboarding_completed: newUser.onboarding_completed,
        first_generation_completed: newUser.first_generation_completed,
        last_login_date: newUser.last_login_date,
        consecutive_login_days: newUser.consecutive_login_days,
        message: '신규 회원가입이 완료되었습니다. 5크레딧이 지급되었습니다.'
      });
    }
    
    // 기존 사용자인 경우: 연속 로그인 업데이트
    const loginResult = await updateConsecutiveLogin(supabase, user_id);
    
    // 사용자 정보 다시 조회
    const { data: updatedUser, error: refetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();
    
    if (refetchError) {
      throw refetchError;
    }
    
    console.log('✅ 기존 사용자 로그인:', updatedUser.email, `${updatedUser.consecutive_login_days}일 연속`);
    
    return c.json({
      success: true,
      user_id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      credits: updatedUser.credits,
      tier: updatedUser.subscription_status === 'active' ? 'paid' : 'free',
      subscription_status: updatedUser.subscription_status,
      monthly_free_usage_count: updatedUser.monthly_free_usage_count,
      monthly_limit: 10,
      monthly_remaining: 10 - updatedUser.monthly_free_usage_count,
      monthly_usage_reset_date: updatedUser.monthly_usage_reset_date,
      onboarding_completed: updatedUser.onboarding_completed,
      first_generation_completed: updatedUser.first_generation_completed,
      last_login_date: updatedUser.last_login_date,
      consecutive_login_days: updatedUser.consecutive_login_days,
      streak_reward_eligible: loginResult.streak_reward_eligible,
      message: '로그인 성공'
    });
  } catch (error: any) {
    console.error('사용자 동기화 실패:', error);
    return c.json(
      { error: '사용자 동기화 중 오류가 발생했습니다', details: error.message },
      500
    );
  }
});

// 보상 지급 엔드포인트
app.post('/api/rewards/claim', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, reward_type } = body;
    
    if (!user_id || !reward_type) {
      return c.json({ error: 'user_id와 reward_type은 필수입니다' }, 400);
    }
    
    // 보상 타입 검증
    const validRewards = ['onboarding_completed', 'first_generation_completed', 'streak_3days_completed'];
    if (!validRewards.includes(reward_type)) {
      return c.json({ error: '유효하지 않은 보상 타입입니다' }, 400);
    }
    
    // ✅ Supabase Admin 클라이언트 초기화
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const rewardAmount = 5; // 모든 보상은 5크레딧
    const rewardMessages = {
      onboarding_completed: '🎓 온보딩 완료 보상',
      first_generation_completed: '🎨 첫 콘텐츠 생성 보상',
      streak_3days_completed: '🔥 3일 연속 로그인 보상'
    };
    
    // ✅ Supabase RPC 호출: grant_milestone_credit
    const result = await grantMilestoneCredit(supabase, user_id, reward_type);
    
    if (!result.success) {
      return c.json({
        error: '보상 지급 실패',
        message: result.error || '이미 지급받은 보상입니다'
      }, 400);
    }
    
    console.log(`✅ 보상 지급: ${user_id} ${reward_type} ${rewardAmount}크레딧 → 총 ${result.new_credits}크레딧`);
    
    return c.json({
      success: true,
      reward_type,
      amount: rewardAmount,
      message: rewardMessages[reward_type],
      new_credits: result.new_credits
    });
  } catch (error: any) {
    console.error('보상 지급 실패:', error);
    return c.json(
      { error: '보상 지급 중 오류가 발생했습니다', details: error.message },
      500
    );
  }
});

// 연속 로그인 체크 엔드포인트
app.post('/api/rewards/check-streak', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id } = body;
    
    if (!user_id) {
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    // ✅ Supabase Admin 클라이언트 초기화
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // ✅ Supabase RPC 호출: update_consecutive_login
    const result = await updateConsecutiveLogin(supabase, user_id);
    
    if (result.error) {
      return c.json({
        error: '연속 로그인 체크 실패',
        message: result.error
      }, 500);
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`✅ 연속 로그인: ${user_id} ${result.consecutive_days}일 연속`);
    
    return c.json({
      success: true,
      consecutive_login_days: result.consecutive_days, // ✅ 수파베이스 컬럼명
      last_login_date: today,
      streak_reward_eligible: result.streak_reward_eligible // 3일 달성 여부
    });
  } catch (error: any) {
    console.error('연속 로그인 체크 실패:', error);
    return c.json(
      { error: '연속 로그인 체크 중 오류가 발생했습니다', details: error.message },
      500
    );
  }
});

// 사용자 정보 조회 엔드포인트
app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        is_guest: true,
        user: null
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // TODO: JWT 토큰 검증 및 Supabase에서 사용자 정보 조회
    // 현재는 임시 응답
    
    return c.json({
      is_guest: false,
      user: {
        id: 'temp-user-id',
        email: 'user@example.com',
        name: '사용자',
        credits: 3,
        subscription_status: 'free'
      }
    });
  } catch (error: any) {
    console.error('사용자 정보 조회 실패:', error);
    return c.json(
      { error: '사용자 정보 조회 중 오류가 발생했습니다' },
      500
    );
  }
});

// 메인 페이지
app.get('/', (c) => {
  return c.html(htmlTemplate);
});

export default app;
