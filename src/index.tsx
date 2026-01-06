import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import OpenAI from 'openai';
import { getBlogPrompt, getInstagramPrompt, getThreadsPrompt, getYouTubePrompt, getYoutubeLongformPrompt, getShortformPrompt, getMetadataPrompt, getInstagramFeedPrompt } from './prompts';
import { htmlTemplate } from './html-template';
import { analyzeImageWithGemini, generateContentWithGemini, calculateGeminiCost, estimateTokens } from './gemini';
import { createSupabaseAdmin, createSupabaseClient, grantMilestoneCredit, updateConsecutiveLogin, checkAndUseMonthlyQuota } from './lib/supabase';
import { parseMultipleDocuments, combineDocumentTexts, truncateText } from './document-parser';
import payments from './routes/payments';

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

// 정적 파일 서빙 (결제 페이지 포함)
app.use('/static/*', serveStatic({ root: './public' }));
app.use('/payment*', serveStatic({ root: './public' }));

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
            console.log('🎬 YouTube Shorts 생성 시작...');
            generationTasks.push(
              generateContent(openai, 'youtube_shorts', getYouTubePrompt(promptParams), aiModel)
            );
            console.log('✅ YouTube Shorts 태스크 추가 완료');
          }
          
          // 새로운 플랫폼: 유튜브 롱폼
          if (platforms.includes('youtube_longform')) {
            generationTasks.push(
              generateContent(openai, 'youtube_longform', getYoutubeLongformPrompt(promptParams), aiModel)
            );
          }
          
          // 틱톡
          if (platforms.includes('tiktok')) {
            generationTasks.push(
              generateContent(openai, 'tiktok', getShortformPrompt(promptParams), aiModel)
            );
          }
          
          // 인스타그램 릴스
          if (platforms.includes('instagram_reels')) {
            generationTasks.push(
              generateContent(openai, 'instagram_reels', getShortformPrompt(promptParams), aiModel)
            );
          }
          
          // 새로운 플랫폼: 메타데이터 생성
          if (platforms.includes('metadata_generation')) {
            generationTasks.push(
              generateContent(openai, 'metadata', getMetadataPrompt(promptParams), aiModel)
            );
          }

          const results = await Promise.all(generationTasks);
          console.log('📊 생성된 콘텐츠 플랫폼:', results.map(r => r.platform));

          const data: Record<string, string> = {};
          results.forEach(({ platform, content }) => {
            console.log(`✅ ${platform} 콘텐츠 저장:`, content.substring(0, 50) + '...');
            data[platform] = content;
          });
          console.log('📦 최종 data 키:', Object.keys(data));

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
  console.log('🚀 /api/generate 요청 시작');
  
  try {
    const body = await c.req.json();
    console.log('📦 요청 데이터:', {
      brand: body.brand,
      keywords: body.keywords,
      imageCount: body.images?.length,
      platformCount: body.platforms?.length,
      platforms: body.platforms,
    });
    
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
      tone = '친근한', // 🎯 스마트 기본값: 친근한 톤
      targetAge = '20-30대', // 🎯 스마트 기본값: 20-30대 (가장 일반적)
      industry = '', // 🎯 스마트 기본값: 키워드에서 자동 추출 예정
      images, // base64 이미지 배열
      platforms, // ['blog', 'instagram', 'threads', 'youtube']
      aiModel = 'gpt-4o', // AI 모델 선택 (기본값: gpt-4o)
      apiKey, // 클라이언트에서 전달받은 API 키
      forceGenerate = false, // 검증 우회 플래그
    } = body;

    // 입력 검증
    if (!brand || !keywords || !images || !platforms) {
      console.error('❌ 필수 입력 항목 누락:', { brand: !!brand, keywords: !!keywords, images: !!images, platforms: !!platforms });
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

    // ✅ 회원 크레딧 체크
    if (!is_guest && user_id) {
      // 사용자 정보 조회 (2지갑 시스템)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('tier, free_credits, paid_credits, last_reset_date')
        .eq('id', user_id)
        .single();
      
      if (userError || !user) {
        console.error('❌ 사용자 조회 실패:', userError);
        return c.json({
          error: '사용자 정보 조회 실패',
          message: '사용자를 찾을 수 없습니다. 다시 로그인해주세요.',
          redirect: '/login'
        }, 404);
      }
      
      const freeCredits = user.free_credits || 0;
      const paidCredits = user.paid_credits || 0;
      const totalCredits = freeCredits + paidCredits;
      
      console.log(`📊 사용자 크레딧 상태: ${user_id}`, {
        tier: user.tier,
        free_credits: freeCredits,
        paid_credits: paidCredits,
        total: totalCredits
      });
      
      // 크레딧 확인 (둘 다 0이면 403)
      if (totalCredits <= 0) {
        return c.json({
          error: '크레딧 부족',
          message: '크레딧이 부족합니다. 크레딧을 충전해주세요.',
          free_credits: freeCredits,
          paid_credits: paidCredits,
          redirect: '/payment'
        }, 403);
      }
      
      console.log(`✅ 크레딧 사용 가능: 무료 ${freeCredits}개 + 유료 ${paidCredits}개 = 총 ${totalCredits}개`);
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

    console.log('이미지 분석 완료. 콘텐츠 생성 준비...');
    console.log('📸 결합된 이미지 설명:', combinedImageDescription.substring(0, 500) + '...');

    // 🎯 스마트 기본값: 산업 분야 자동 추출 (입력 안 했을 때만)
    let finalIndustry = industry;
    if (!industry || industry.trim() === '') {
      // 키워드에서 산업 분야 추론
      const keywordsLower = keywords.toLowerCase();
      if (keywordsLower.includes('카페') || keywordsLower.includes('음식') || keywordsLower.includes('맛집')) {
        finalIndustry = '외식업';
      } else if (keywordsLower.includes('패션') || keywordsLower.includes('옷') || keywordsLower.includes('쇼핑')) {
        finalIndustry = '패션/의류';
      } else if (keywordsLower.includes('뷰티') || keywordsLower.includes('화장품') || keywordsLower.includes('스킨케어')) {
        finalIndustry = '뷰티/코스메틱';
      } else if (keywordsLower.includes('교육') || keywordsLower.includes('학원') || keywordsLower.includes('강의')) {
        finalIndustry = '교육';
      } else if (keywordsLower.includes('스튜디오') || keywordsLower.includes('촬영') || keywordsLower.includes('렌탈')) {
        finalIndustry = '문화/예술';
      } else if (keywordsLower.includes('it') || keywordsLower.includes('소프트웨어') || keywordsLower.includes('앱')) {
        finalIndustry = 'IT/기술';
      } else {
        // 이미지 분석 결과에서 추론
        const imageLower = combinedImageDescription.toLowerCase();
        if (imageLower.includes('교육') || imageLower.includes('강의') || imageLower.includes('학습')) {
          finalIndustry = '교육';
        } else if (imageLower.includes('스튜디오') || imageLower.includes('촬영')) {
          finalIndustry = '문화/예술';
        } else {
          finalIndustry = '일반 서비스';
        }
      }
      console.log(`🎯 산업 분야 자동 설정: ${finalIndustry} (키워드: ${keywords})`);
    }

    // 2단계: 간소화된 검증 - 매우 낮은 confidence만 경고
    let contentStrategy: 'integrated' | 'image-first' | 'keyword-first' | 'document-first' = 'image-first'; // 기본값을 image-first로
    let comprehensiveValidation: any = null;

    // forceGenerate가 아니고, 이미지 설명이 너무 짧으면 경고
    if (!forceGenerate && combinedImageDescription.length < 100) {
      return c.json({
        success: false,
        requireConfirmation: true,
        validation: {
          isConsistent: false,
          confidence: 20,
          conflicts: [{
            type: 'image-analysis',
            severity: 'high',
            description: '이미지 분석 결과가 불충분합니다.',
            items: ['이미지 분석'],
            suggestion: '더 명확한 이미지를 업로드하거나, 키워드를 구체적으로 입력해주세요.'
          }],
          strategy: 'keyword-first',
          reason: '이미지 분석 실패',
          recommendation: '이미지를 다시 확인하거나, 키워드 중심으로 진행하세요.',
        },
        message: '⚠️ 이미지 분석이 불충분합니다. 확인 후 다시 시도해주세요.',
      });
    }

    console.log(`전략 결정: ${contentStrategy}. 콘텐츠 생성 시작...`);

    // ✅ 차등 과금 시스템 (플랫폼 개수별 크레딧 차감)
    
    // 1. 필요 크레딧 계산 함수
    const calculateRequiredCredits = (platformCount: number): number => {
      if (platformCount === 0) return 0;
      if (platformCount === 1) return 1;
      if (platformCount <= 3) return 2;    // 2-3개: 2크레딧
      if (platformCount <= 6) return 4;    // 4-6개: 4크레딧
      return 4;                            // 7-9개: 4크레딧 (최대 할인)
    };
    
    const requiredCredits = calculateRequiredCredits(platforms.length);
    console.log(`📊 선택된 플랫폼: ${platforms.length}개 → 필요 크레딧: ${requiredCredits}개`);
    
    let initialFreeCredits = 0;
    let initialPaidCredits = 0;
    let freeUsed = 0;
    let paidUsed = 0;
    
    if (!is_guest && user_id) {
      // 2. 사용자 크레딧 조회
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('tier, free_credits, paid_credits')
        .eq('id', user_id)
        .single();
      
      if (userError || !user) {
        console.error('❌ 사용자 조회 실패:', userError);
        return c.json({
          success: false,
          error: '사용자 정보 조회 실패',
          message: '사용자를 찾을 수 없습니다. 다시 로그인해주세요.'
        }, 404);
      }
      
      initialFreeCredits = user.free_credits || 0;
      initialPaidCredits = user.paid_credits || 0;
      const totalCredits = initialFreeCredits + initialPaidCredits;
      
      console.log(`💰 현재 보유 크레딧:`, {
        free: initialFreeCredits,
        paid: initialPaidCredits,
        total: totalCredits,
        required: requiredCredits
      });
      
      // 3. 크레딧 부족 검사
      if (totalCredits < requiredCredits) {
        console.error(`❌ 크레딧 부족: 필요 ${requiredCredits}, 보유 ${totalCredits}`);
        return c.json({
          success: false,
          error: '크레딧 부족',
          message: `${requiredCredits}크레딧이 필요합니다. 현재 ${totalCredits}크레딧 보유중입니다.`,
          required_credits: requiredCredits,
          free_credits: initialFreeCredits,
          paid_credits: initialPaidCredits,
          total_credits: totalCredits
        }, 403);
      }
      
      // 4. 우선순위 차감: 무료 → 유료
      let newFreeCredits = initialFreeCredits;
      let newPaidCredits = initialPaidCredits;
      let remaining = requiredCredits;
      
      // 무료 크레딧부터 차감
      if (newFreeCredits > 0) {
        const deductFromFree = Math.min(newFreeCredits, remaining);
        newFreeCredits -= deductFromFree;
        freeUsed = deductFromFree;
        remaining -= deductFromFree;
        console.log(`💳 무료 크레딧 차감: ${initialFreeCredits} → ${newFreeCredits} (${deductFromFree}크레딧 사용)`);
      }
      
      // 남은 금액은 유료 크레딧에서 차감
      if (remaining > 0) {
        newPaidCredits -= remaining;
        paidUsed = remaining;
        console.log(`💎 유료 크레딧 차감: ${initialPaidCredits} → ${newPaidCredits} (${remaining}크레딧 사용)`);
      }
      
      // 5. DB 업데이트
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          free_credits: newFreeCredits,
          paid_credits: newPaidCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)
        .select('tier, free_credits, paid_credits')
        .single();
      
      if (!updateError && updatedUser) {
        // credit_transactions 기록
        await supabase.from('credit_transactions').insert({
          user_id,
          amount: -requiredCredits,
          balance_after: (updatedUser.free_credits || 0) + (updatedUser.paid_credits || 0),
          type: 'usage',
          description: `콘텐츠 생성 ${platforms.length}개 (${platforms.join(', ')})`
        });
        
        console.log(`✅ 크레딧 차감 완료:`, {
          used: `${requiredCredits}크레딧 (무료 ${freeUsed} + 유료 ${paidUsed})`,
          free: `${initialFreeCredits} → ${updatedUser.free_credits}`,
          paid: `${initialPaidCredits} → ${updatedUser.paid_credits}`,
          total: (updatedUser.free_credits || 0) + (updatedUser.paid_credits || 0)
        });
        
        initialFreeCredits = updatedUser.free_credits || 0;
        initialPaidCredits = updatedUser.paid_credits || 0;
      } else {
        console.error('❌ 크레딧 차감 실패:', updateError);
        return c.json({
          success: false,
          error: '크레딧 차감 실패',
          message: '크레딧 차감 중 오류가 발생했습니다.'
        }, 500);
      }
    }

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
      industry: finalIndustry, // 🎯 스마트 기본값 적용
      imageDescription: combinedImageDescription,
      contentStrategy: contentStrategy, // 하이브리드 전략 추가
    };

    // ✅ 플랫폼 수 제한 제거 (사용자가 선택한 모든 플랫폼 생성)
    console.log(`📊 콘텐츠 생성 시작: ${platforms.length}개 플랫폼 선택됨 [${platforms.join(', ')}]`);

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
    if (platforms.includes('youtube_shorts') || platforms.includes('youtube')) {
      if (geminiApiKey) {
        console.log('  🎬 유튜브 숏폼: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getYouTubePrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.023; // 약 23원
              return { platform: 'youtube_shorts', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'youtube_shorts', getYouTubePrompt(promptParams), aiModel));
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
    
    // 숏폼 멀티: Gemini Flash
    if (platforms.includes('shortform_multi')) {
      if (geminiApiKey) {
        console.log('  📱 숏폼 멀티: Gemini Flash (70% 절감)');
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
    
    // 틱톡: Gemini Flash
    if (platforms.includes('tiktok')) {
      if (geminiApiKey) {
        console.log('  🎵 틱톡: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getShortformPrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.023;
              return { platform: 'tiktok', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'tiktok', getShortformPrompt(promptParams), aiModel));
      }
    }
    
    // 인스타그램 릴스: Gemini Flash
    if (platforms.includes('instagram_reels')) {
      if (geminiApiKey) {
        console.log('  🎬 인스타그램 릴스: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getShortformPrompt(promptParams))
            .then(content => {
              totalCost.gemini += 0.023;
              return { platform: 'instagram_reels', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'instagram_reels', getShortformPrompt(promptParams), aiModel));
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
              return { platform: 'metadata_generation', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'metadata_generation', getMetadataPrompt(promptParams), aiModel));
      }
    }

    // 모든 생성 작업 완료 대기 (순차 처리로 타임아웃 방지)
    console.log(`🔄 콘텐츠 생성 시작 (${generationTasks.length}개 플랫폼, 순차 처리)`);
    const results = [];
    for (let i = 0; i < generationTasks.length; i++) {
      console.log(`  [${i + 1}/${generationTasks.length}] 생성 중...`);
      try {
        const result = await generationTasks[i];
        results.push(result);
        console.log(`  ✅ [${i + 1}/${generationTasks.length}] 완료:`, result.platform);
      } catch (error: any) {
        console.error(`  ❌ [${i + 1}/${generationTasks.length}] 실패:`, error.message);
        // 에러 발생 시에도 계속 진행
        results.push({ platform: 'error', content: `생성 실패: ${error.message}` });
      }
    }

    // 결과를 객체로 변환
    const data: Record<string, string> = {};
    results.forEach(({ platform, content }) => {
      data[platform] = content;
    });

    console.log('콘텐츠 생성 완료!');
    console.log(`💰 비용 추정: OpenAI $${totalCost.openai.toFixed(3)}, Gemini $${totalCost.gemini.toFixed(3)}, 총 $${(totalCost.openai + totalCost.gemini).toFixed(3)}`);

    // ✅ 사용량 정보 반환 (차등 과금 정보 포함)
    let deducted = {
      type: 'credit',
      monthly_remaining: 0,
      credits_used: requiredCredits || 0, // ✅ 실제 사용된 크레딧
      free_used: freeUsed, // ✅ 무료에서 사용
      paid_used: paidUsed, // ✅ 유료에서 사용
      free_remaining: initialFreeCredits, // ✅ 남은 무료 크레딧
      paid_remaining: initialPaidCredits, // ✅ 남은 유료 크레딧
      free_credits: initialFreeCredits, // ✅ 하위 호환
      paid_credits: initialPaidCredits, // ✅ 하위 호환
      credits_remaining: initialFreeCredits + initialPaidCredits // ✅ 총 크레딧 (하위 호환)
    };
    
    if (is_guest) {
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
        confidence: comprehensiveValidation?.overallConfidence || 100,
        reason: comprehensiveValidation?.reason || '기본 전략 사용',
        imageSummary: combinedImageDescription || '',
        userInputSummary: `${brand} - ${keywords}`,
      },
      cost: {
        openai: totalCost.openai,
        gemini: totalCost.gemini,
        total: totalCost.openai + totalCost.gemini,
        savings: geminiApiKey ? '약 52% 절감 (하이브리드 전략)' : '절감 없음',
      },
      // ✅ 사용량 정보 추가 (하이브리드 플랜)
      usage: {
        type: deducted.type, // 'included' | 'credit' | 'none'
        monthly_remaining: deducted.monthly_remaining,
        credits_remaining: deducted.credits_remaining
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

// 사용자 동기화 엔드포인트 (하이브리드 플랜)
app.post('/api/auth/sync', async (c) => {
  try {
    console.log('🔄 /api/auth/sync 요청 받음');
    
    const body = await c.req.json();
    const { user_id, email, name } = body;
    
    console.log('📝 요청 데이터:', { user_id, email, name });
    
    if (!user_id || !email) {
      console.error('❌ user_id 또는 email 누락:', { user_id, email });
      return c.json({ error: 'user_id와 email은 필수입니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    // 다음 달 1일 계산 함수
    const getNextMonthFirstDay = () => {
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      return nextMonth.toISOString().split('T')[0]; // 'YYYY-MM-01'
    };
    
    // 1️⃣ 기존 사용자 조회
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();
    
    let user;
    
    if (existingUser) {
      // 2️⃣ 기존 사용자: 업데이트
      console.log('📌 기존 사용자 로그인:', existingUser.email);
      
      // 💰 월간 무료 크레딧 리셋 (가입일 기준 1개월 주기)
      // last_reset_date + 1개월 <= 오늘 날짜면 리셋
      const userResetDate = existingUser.last_reset_date 
        ? new Date(existingUser.last_reset_date + 'T00:00:00Z')
        : null;
      
      let needsReset = false;
      let nextResetDate = null;
      
      if (userResetDate) {
        // 다음 리셋 날짜 계산: last_reset_date + 1개월
        nextResetDate = new Date(userResetDate);
        nextResetDate.setUTCMonth(nextResetDate.getUTCMonth() + 1);
        
        // 오늘이 다음 리셋 날짜와 같거나 이후면 리셋
        const today = new Date(todayString + 'T00:00:00Z');
        needsReset = today >= nextResetDate;
      } else {
        // last_reset_date가 없으면 무조건 리셋
        needsReset = true;
      }
      
      console.log('🔍 월간 무료 크레딧 리셋 확인:', {
        last_reset_date: existingUser.last_reset_date,
        next_reset_date: nextResetDate ? nextResetDate.toISOString().split('T')[0] : null,
        today: todayString,
        free_credits: existingUser.free_credits,
        paid_credits: existingUser.paid_credits,
        needsReset,
        계산로직: 'last_reset_date + 1개월 <= 오늘 날짜면 리셋'
      });
      
      if (needsReset) {
        console.log('📅 월간 무료 크레딧 리셋 실행!', { 
          oldResetDate: existingUser.last_reset_date,
          newResetDate: todayString,
          oldFreeCredits: existingUser.free_credits,
          newFreeCredits: 10,
          paidCredits: existingUser.paid_credits + ' (유지)'
        });
        
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            email,
            name: name || existingUser.name,
            free_credits: 10, // ✅ 무료 크레딧만 리셋
            // paid_credits는 절대 건드리지 않음!
            last_reset_date: todayString, // ✅ 오늘 날짜로 설정
            updated_at: new Date().toISOString()
          })
          .eq('id', user_id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        user = updatedUser;
      } else {
        // 리셋 불필요: 이름만 업데이트
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            email,
            name: name || existingUser.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', user_id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        user = updatedUser;
      }
    } else {
      // 3️⃣ 신규 사용자: 무료 회원으로 생성
      console.log('🆕 신규 무료 회원 생성:', {
        email,
        free_credits: 10,
        paid_credits: 0,
        last_reset_date: todayString,
        설명: '다음 달에 무료 크레딧이 리셋됩니다'
      });
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user_id,
          email,
          name: name || null,
          tier: 'free', // ✅ 무료 회원
          free_credits: 10, // ✅ 월간 무료 크레딧
          paid_credits: 0, // ✅ 유료 크레딧 0
          last_reset_date: todayString // ✅ 오늘 날짜로 설정
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ 신규 사용자 생성 실패:', insertError);
        throw insertError;
      }
      
      user = newUser;
    }
    
    console.log('✅ 사용자 동기화 완료:', {
      email: user.email,
      tier: user.tier,
      free_credits: user.free_credits,
      paid_credits: user.paid_credits,
      total_credits: (user.free_credits || 0) + (user.paid_credits || 0)
    });
    
    return c.json({
      success: true,
      user_id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier || 'free', // 'guest' | 'free' | 'paid'
      free_credits: user.free_credits ?? 0, // ✅ 무료 크레딧
      paid_credits: user.paid_credits ?? 0, // ✅ 유료 크레딧
      credits: (user.free_credits || 0) + (user.paid_credits || 0), // ✅ 총 크레딧 (하위 호환)
      message: existingUser ? '로그인 성공' : '회원가입 완료'
    });
  } catch (error: any) {
    console.error('❌ 사용자 동기화 실패:', error);
    console.error('에러 상세:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return c.json(
      { 
        error: '사용자 동기화 중 오류가 발생했습니다', 
        details: error.message
      },
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

// 프로필 저장 API
app.post('/api/profile', async (c) => {
  try {
    console.log('💾 /api/profile 저장 요청');
    
    const body = await c.req.json();
    const { user_id, brand, company_name, business_type, location, target_gender, contact, website, sns, keywords, tone, target_age, industry } = body;
    
    if (!user_id) {
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // users 테이블에 프로필 저장
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        name: brand || company_name,
        company_name,
        business_type,
        location,
        target_gender,
        contact,
        website,
        sns,
        brand_keywords: keywords ? (Array.isArray(keywords) ? keywords : [keywords]) : null,
        tone,
        target_age,
        industry,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ 프로필 저장 실패:', updateError);
      return c.json({ success: false, error: updateError.message }, 500);
    }
    
    console.log('✅ 프로필 DB 저장 완료:', updatedUser.email);
    
    return c.json({
      success: true,
      profile: {
        brand: updatedUser.name,
        company_name: updatedUser.company_name,
        business_type: updatedUser.business_type,
        location: updatedUser.location,
        target_gender: updatedUser.target_gender,
        contact: updatedUser.contact,
        website: updatedUser.website,
        sns: updatedUser.sns,
        keywords: updatedUser.brand_keywords,
        tone: updatedUser.tone,
        target_age: updatedUser.target_age,
        industry: updatedUser.industry
      }
    });
  } catch (error: any) {
    console.error('❌ 프로필 저장 예외:', error);
    return c.json({ error: '프로필 저장 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// 프로필 조회 API
app.get('/api/profile', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    if (!user_id) {
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: user, error } = await supabase
      .from('users')
      .select('name, company_name, business_type, location, target_gender, contact, website, sns, brand_keywords, tone, target_age, industry')
      .eq('id', user_id)
      .single();
    
    if (error) {
      console.error('❌ 프로필 조회 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    // 🔥 11개 필드 모두 응답에 포함 (NULL 안전 처리 + 기본값)
    return c.json({
      success: true,
      profile: {
        brand: user.name || '',
        company_name: user.company_name || '',
        business_type: user.business_type || '선택 안 함',
        location: user.location || '선택 안 함',
        target_gender: user.target_gender || '전체',
        contact: user.contact || '',
        website: user.website || '',
        sns: user.sns || '',
        keywords: user.brand_keywords || [],
        tone: user.tone || '친근한',
        target_age: user.target_age || '20-30대',
        industry: user.industry || '선택안함 (AI가 자동 판단)'
      }
    });
  } catch (error: any) {
    console.error('❌ 프로필 조회 예외:', error);
    return c.json({ error: '프로필 조회 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// 히스토리 조회 API (보안 강화)
app.get('/api/history', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    if (!user_id) {
      console.error('❌ user_id 누락');
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    console.log('📜 히스토리 조회:', user_id);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 🔒 핵심: 본인 데이터만 조회
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('❌ 히스토리 조회 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`✅ 히스토리 조회 완료: ${data.length}개`);
    
    return c.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('❌ 히스토리 조회 예외:', error);
    return c.json({ error: '히스토리 조회 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// 히스토리 저장 API
app.post('/api/history', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, brand, keywords, results, platforms } = body;
    
    if (!user_id) {
      console.error('❌ user_id 누락');
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    console.log('💾 히스토리 저장:', user_id);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 🔥 generations 테이블에 저장 (brand, keywords, results 포함)
    const { data: newHistory, error: insertError } = await supabase
      .from('generations')
      .insert({
        user_id,
        brand: brand || '',
        keywords: Array.isArray(keywords) ? keywords : [],
        results: results || {},
        platforms: Array.isArray(platforms) ? platforms : [],
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ 히스토리 저장 실패:', insertError);
      return c.json({ success: false, error: insertError.message }, 500);
    }
    
    console.log('✅ 히스토리 저장 완료:', newHistory.id);
    
    return c.json({
      success: true,
      id: newHistory.id
    });
  } catch (error: any) {
    console.error('❌ 히스토리 저장 예외:', error);
    return c.json({ error: '히스토리 저장 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// 히스토리 삭제 API
app.delete('/api/history', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    const id = c.req.query('id');
    
    if (!user_id || !id) {
      console.error('❌ user_id 또는 id 누락');
      return c.json({ error: 'user_id와 id는 필수입니다' }, 400);
    }
    
    console.log('🗑️ 히스토리 삭제:', { id, user_id });
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 🔒 보안: 본인이 생성한 히스토리만 삭제 가능
    const { error: deleteError } = await supabase
      .from('generations')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    
    if (deleteError) {
      console.error('❌ 히스토리 삭제 실패:', deleteError);
      return c.json({ success: false, error: deleteError.message }, 500);
    }
    
    console.log('✅ 히스토리 삭제 완료:', id);
    
    return c.json({
      success: true,
      id,
      message: '히스토리가 삭제되었습니다'
    });
  } catch (error: any) {
    console.error('❌ 히스토리 삭제 예외:', error);
    return c.json({ error: '히스토리 삭제 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// 메인 페이지
app.get('/', (c) => {
  return c.html(htmlTemplate);
});

// ===================================
// 크레딧 상품 목록 API
// ===================================
app.get('/api/products', async (c) => {
  try {
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: products, error } = await supabase
      .from('credit_products')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('❌ 상품 조회 실패:', error);
      throw error;
    }

    console.log(`✅ 상품 목록 조회 완료: ${products?.length || 0}개`);
    
    return c.json({
      success: true,
      products: products || [],
      message: '상품 목록을 성공적으로 조회했습니다'
    });
  } catch (error: any) {
    console.error('❌ 상품 조회 예외:', error);
    return c.json({ 
      success: false, 
      error: error.message || '상품 조회 중 오류가 발생했습니다'
    }, 500);
  }
});

// ===================================
// 관리자 수동 충전 API (임시 - 결제 연동 전)
// ===================================
app.post('/api/admin/charge-credits', async (c) => {
  try {
    const { user_email, credits, admin_key } = await c.req.json();
    
    // 관리자 키 검증
    if (!admin_key || admin_key !== c.env.ADMIN_SECRET_KEY) {
      console.error('❌ 관리자 권한 없음');
      return c.json({ 
        success: false, 
        error: '권한이 없습니다' 
      }, 403);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 사용자 조회
    const { data: user, error: selectError } = await supabase
      .from('users')
      .select('id, email, paid_credits')
      .eq('email', user_email)
      .single();
    
    if (selectError || !user) {
      console.error('❌ 사용자 조회 실패:', selectError);
      return c.json({ 
        success: false, 
        error: '사용자를 찾을 수 없습니다' 
      }, 404);
    }
    
    const newPaidCredits = (user.paid_credits || 0) + credits;
    
    // 유료 크레딧 추가
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        paid_credits: newPaidCredits,
        updated_at: new Date().toISOString()
      })
      .eq('email', user_email);
    
    if (updateError) {
      console.error('❌ 크레딧 충전 실패:', updateError);
      throw updateError;
    }
    
    // credit_transactions 기록
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: credits,
      balance_after: newPaidCredits,
      type: 'purchase',
      description: `관리자 수동 충전 (${credits}크레딧)`
    });
    
    console.log(`✅ 관리자 충전 완료: ${user_email}에게 ${credits}크레딧 지급 (총 ${newPaidCredits})`);
    
    return c.json({
      success: true,
      user_email,
      credits_added: credits,
      new_paid_credits: newPaidCredits,
      message: `${user_email}에게 ${credits}크레딧을 성공적으로 충전했습니다`
    });
    
  } catch (error: any) {
    console.error('❌ 관리자 충전 예외:', error);
    return c.json({ 
      success: false, 
      error: error.message || '충전 중 오류가 발생했습니다'
    }, 500);
  }
});

// 결제 라우트 연결
app.route('/api/payments', payments);

export default app;
