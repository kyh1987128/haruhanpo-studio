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

    // ✅ 회원 크레딧 체크 (차등 과금 적용)
    if (!is_guest && user_id) {
      // 🚨 크리티컬: 차등 과금 계산 (플랫폼 수에 따라)
      const platformCount = platforms.length;
      let requiredCredits = 1;
      if (platformCount >= 4) {
        requiredCredits = 4;
      } else if (platformCount >= 2) {
        requiredCredits = 2;
      }
      
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
        total: totalCredits,
        required: requiredCredits // ✅ 필요한 크레딧 추가
      });
      
      // 🚨 크리티컬: OpenAI/Gemini API 호출 전 크레딧 검증 (API 비용 낭비 방지)
      if (totalCredits < requiredCredits) {
        console.error(`❌ [백엔드 차단] 크레딧 부족: 필요 ${requiredCredits}, 보유 ${totalCredits}`);
        return c.json({
          error: '크레딧 부족',
          message: `${requiredCredits}크레딧이 필요합니다. 현재 ${totalCredits}크레딧 보유중입니다.`,
          required_credits: requiredCredits,
          free_credits: freeCredits,
          paid_credits: paidCredits,
          total_credits: totalCredits,
          redirect: '/payment'
        }, 403);
      }
      
      console.log(`✅ [백엔드 검증 통과] 크레딧 사용 가능: 무료 ${freeCredits}개 + 유료 ${paidCredits}개 = 총 ${totalCredits}개 (필요: ${requiredCredits}개)`);
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
            last_used_at: new Date().toISOString(),
            user_id: user_id || null  // 향후 사용자별 추적용
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
      // ✅ 사용량 정보 추가 (2지갑 시스템 + 차등 과금)
      usage: {
        type: deducted.type, // 'included' | 'credit' | 'none'
        monthly_remaining: deducted.monthly_remaining,
        credits_used: deducted.credits_used, // ✅ 사용된 크레딧
        free_used: deducted.free_used, // ✅ 무료에서 사용
        paid_used: deducted.paid_used, // ✅ 유료에서 사용
        free_credits: deducted.free_credits, // ✅ 남은 무료 크레딧
        paid_credits: deducted.paid_credits, // ✅ 남은 유료 크레딧
        free_remaining: deducted.free_remaining, // ✅ 하위 호환
        paid_remaining: deducted.paid_remaining, // ✅ 하위 호환
        credits_remaining: deducted.credits_remaining // ✅ 총 크레딧
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
          last_reset_date: todayString, // ✅ 오늘 날짜로 설정
          registration_completed: false, // ✅ 신규 사용자는 회원가입 미완료 상태
          phone: null,
          privacy_agreed: false,
          marketing_agreed: false
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
      registration_completed: user.registration_completed ?? false, // ✅ 회원가입 완료 여부
      phone: user.phone || null, // ✅ 연락처
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

// ===================================
// 회원가입 완료 여부 확인 API
// ===================================
app.get('/api/auth/check-registration-status', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    if (!user_id) {
      return c.json({ success: false, error: '사용자 ID가 필요합니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, registration_completed, phone, marketing_agreed')
      .eq('id', user_id)
      .single();
    
    if (error || !user) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다' }, 404);
    }
    
    return c.json({
      success: true,
      registration_completed: user.registration_completed ?? false,
      needs_phone: !user.phone,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        marketing_agreed: user.marketing_agreed
      }
    });
    
  } catch (error: any) {
    console.error('❌ 회원가입 상태 확인 실패:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ===================================
// 회원가입 완료 처리 API (연락처 + 동의)
// ===================================
app.post('/api/auth/complete-registration', async (c) => {
  try {
    const { user_id, phone, privacy_agreed, marketing_agreed } = await c.req.json();
    
    // 입력값 검증
    if (!user_id || !phone || !privacy_agreed) {
      return c.json({ 
        success: false, 
        error: '필수 정보(사용자ID, 연락처, 개인정보 동의)를 모두 입력해주세요' 
      }, 400);
    }
    
    // 연락처 형식 간단 검증
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    if (!phoneRegex.test(phone.replace(/-/g, ''))) {
      return c.json({ 
        success: false, 
        error: '올바른 연락처 형식을 입력해주세요 (예: 010-1234-5678)' 
      }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 사용자 정보 업데이트
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        phone: phone,
        privacy_agreed: privacy_agreed,
        marketing_agreed: marketing_agreed || false,
        registration_completed: true,
        registration_completed_at: new Date().toISOString(),
        terms_agreed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select('id, email, name, phone, tier, free_credits, paid_credits, registration_completed')
      .single();
    
    if (error) {
      console.error('❌ 회원가입 완료 처리 실패:', error);
      throw error;
    }
    
    console.log(`✅ 회원가입 완료: ${updatedUser.email} (연락처: ${phone})`);
    
    return c.json({
      success: true,
      message: '회원가입이 완료되었습니다',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        tier: updatedUser.tier,
        free_credits: updatedUser.free_credits,
        paid_credits: updatedUser.paid_credits,
        credits: (updatedUser.free_credits || 0) + (updatedUser.paid_credits || 0),
        registration_completed: updatedUser.registration_completed
      }
    });
    
  } catch (error: any) {
    console.error('❌ 회원가입 완료 처리 예외:', error);
    return c.json({ 
      success: false, 
      error: error.message || '회원가입 완료 처리 중 오류가 발생했습니다'
    }, 500);
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

// ===================================
// 결제 페이지 라우팅 (Cloudflare Workers 호환)
// ===================================
app.get('/payment', (c) => {
  return c.redirect('/static/payment.html');
});

app.get('/payment/success', (c) => {
  return c.redirect('/static/payment-success.html');
});

app.get('/payment/fail', (c) => {
  return c.redirect('/static/payment-fail.html');
});

// 결제 라우트 연결
app.route('/api/payments', payments);

// ===================================
// 🔥 하이브리드 크레딧 시스템 (키워드 분석)
// ===================================

// 설정 상수
const DAILY_FREE_LIMIT = 3;
const MONTHLY_FREE_CREDITS = 10;
const CREDIT_COST = 1;
const CACHE_DURATION_HOURS = 24;

// 안전한 해시 함수 (SHA-256)
function generateKeywordsHash(keywords: string): string {
  const normalized = keywords
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(',');
  
  // Web Crypto API (Cloudflare Workers 호환)
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  return crypto.subtle.digest('SHA-256', data)
    .then(hashBuffer => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 16); // 16자리로 충돌 방지
    })
    .catch(() => {
      // 폴백: 간단한 해시 (개발 환경용)
      let hash = 0;
      for (let i = 0; i < normalized.length; i++) {
        hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    });
}

// 월간 무료 크레딧 자동 갱신
async function checkAndRenewMonthlyCredits(supabase: any, userId: string): Promise<void> {
  try {
    const today = new Date();
    const currentMonth = today.getFullYear() * 12 + today.getMonth();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('last_reset_date')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      console.error('사용자 조회 실패:', error);
      return;
    }
    
    let needsReset = false;
    
    if (!user.last_reset_date) {
      needsReset = true;
    } else {
      const lastResetDate = new Date(user.last_reset_date);
      const lastResetMonth = lastResetDate.getFullYear() * 12 + lastResetDate.getMonth();
      needsReset = currentMonth > lastResetMonth;
    }
    
    if (needsReset) {
      const todayStr = today.toISOString().split('T')[0];
      const { error: updateError } = await supabase
        .from('users')
        .update({
          free_credits: MONTHLY_FREE_CREDITS,
          last_reset_date: todayStr
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('크레딧 갱신 실패:', updateError);
      } else {
        console.log(`✅ 사용자 ${userId}에게 월간 무료 크레딧 ${MONTHLY_FREE_CREDITS}개 지급`);
      }
    }
  } catch (error) {
    console.error('월간 크레딧 갱신 중 오류:', error);
  }
}

// 일일 무료 사용량 조회
async function getDailyFreeUsage(supabase: any, userId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('keyword_daily_usage')
      .select('daily_count')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .maybeSingle();
    
    if (error) {
      console.error('일일 사용량 조회 실패:', error);
      return 0;
    }
    
    return data?.daily_count || 0;
  } catch (error) {
    console.error('일일 사용량 조회 중 오류:', error);
    return 0;
  }
}

// 일일 사용량 증가 (PostgreSQL RPC 호출)
async function incrementDailyUsage(supabase: any, userId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .rpc('increment_keyword_daily_usage', {
        p_user_id: userId,
        p_usage_date: today
      });
    
    if (error) {
      console.error('일일 사용량 증가 실패:', error);
      return 0;
    }
    
    return data || 1;
  } catch (error) {
    console.error('일일 사용량 증가 중 오류:', error);
    return 0;
  }
}

// 크레딧 차감 (무료 우선, Optimistic Locking)
async function deductCredits(
  supabase: any,
  userId: string,
  amount: number
): Promise<{
  success: boolean;
  usedFree: number;
  usedPaid: number;
  remaining: { free: number; paid: number };
  error?: string;
}> {
  try {
    const { data: user, error: selectError } = await supabase
      .from('users')
      .select('free_credits, paid_credits')
      .eq('id', userId)
      .single();
    
    if (selectError || !user) {
      return {
        success: false,
        usedFree: 0,
        usedPaid: 0,
        remaining: { free: 0, paid: 0 },
        error: '사용자를 찾을 수 없습니다'
      };
    }
    
    const freeCredits = user.free_credits || 0;
    const paidCredits = user.paid_credits || 0;
    const totalCredits = freeCredits + paidCredits;
    
    if (totalCredits < amount) {
      return {
        success: false,
        usedFree: 0,
        usedPaid: 0,
        remaining: { free: freeCredits, paid: paidCredits },
        error: '크레딧이 부족합니다'
      };
    }
    
    const usedFree = Math.min(amount, freeCredits);
    const usedPaid = amount - usedFree;
    
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({
        free_credits: freeCredits - usedFree,
        paid_credits: paidCredits - usedPaid
      })
      .eq('id', userId)
      .eq('free_credits', freeCredits)
      .eq('paid_credits', paidCredits)
      .select();
    
    if (updateError || !updateResult || updateResult.length === 0) {
      console.error('크레딧 차감 실패:', updateError);
      return {
        success: false,
        usedFree: 0,
        usedPaid: 0,
        remaining: { free: freeCredits, paid: paidCredits },
        error: '크레딧 차감 중 충돌 발생 (재시도 필요)'
      };
    }
    
    return {
      success: true,
      usedFree,
      usedPaid,
      remaining: {
        free: freeCredits - usedFree,
        paid: paidCredits - usedPaid
      }
    };
    
  } catch (error) {
    console.error('크레딧 차감 예외:', error);
    return {
      success: false,
      usedFree: 0,
      usedPaid: 0,
      remaining: { free: 0, paid: 0 },
      error: '시스템 오류'
    };
  }
}

// 캐시 조회 및 접근 횟수 증가
async function getCachedAnalysis(supabase: any, keywords: string): Promise<any | null> {
  try {
    const hash = await generateKeywordsHash(keywords);
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('keyword_analysis_cache')
      .select('analysis_result, id, access_count')
      .eq('keywords_hash', hash)
      .gt('expires_at', now)
      .maybeSingle();
    
    if (error) {
      console.error('캐시 조회 실패:', error);
      return null;
    }
    
    if (data) {
      supabase
        .from('keyword_analysis_cache')
        .update({ access_count: (data.access_count || 0) + 1 })
        .eq('id', data.id)
        .then(({ error: updateError }: any) => {
          if (updateError) {
            console.error('캐시 접근 횟수 업데이트 실패:', updateError);
          }
        });
      
      return data.analysis_result;
    }
    
    return null;
  } catch (error) {
    console.error('캐시 조회 중 오류:', error);
    return null;
  }
}

// 캐시 저장
async function saveAnalysisCache(supabase: any, keywords: string, analysisResult: any): Promise<void> {
  try {
    const hash = await generateKeywordsHash(keywords);
    const expiresAt = new Date(
      Date.now() + CACHE_DURATION_HOURS * 60 * 60 * 1000
    ).toISOString();
    
    const { error } = await supabase
      .from('keyword_analysis_cache')
      .upsert({
        keywords_hash: hash,
        keywords_raw: keywords,
        analysis_result: analysisResult,
        expires_at: expiresAt,
        access_count: 1
      }, {
        onConflict: 'keywords_hash'
      });
    
    if (error) {
      console.error('캐시 저장 실패:', error);
    }
  } catch (error) {
    console.error('캐시 저장 중 오류:', error);
  }
}

// 히스토리 저장 (generations 테이블)
async function saveAnalysisHistory(
  supabase: any,
  userId: string,
  keywords: string,
  analysisResult: any,
  costType: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        analysis_type: 'keyword_analysis',
        keywords: keywords,
        content: JSON.stringify(analysisResult),
        title: `키워드 분석: ${keywords.substring(0, 50)}${keywords.length > 50 ? '...' : ''}`,
        cost_source: costType
      });
    
    if (error) {
      console.error('히스토리 저장 실패:', error);
    }
  } catch (error) {
    console.error('히스토리 저장 중 오류:', error);
  }
}

// ===================================
// API: 키워드 분석
// ===================================
app.post('/api/analyze-keywords-quality', async (c) => {
  try {
    const { keywords, user_id } = await c.req.json();
    
    // ✅ 입력값 타입 안전성 검증
    if (!keywords || typeof keywords !== 'string' || !keywords.trim()) {
      return c.json({
        success: false,
        error: 'keywords는 비어있지 않은 문자열이어야 합니다',
        received: { keywords: typeof keywords, user_id: typeof user_id }
      }, 400);
    }
    
    if (!user_id || typeof user_id !== 'string') {
      return c.json({
        success: false,
        error: 'user_id는 문자열이어야 합니다',
        received: { keywords: !!keywords, user_id: typeof user_id }
      }, 400);
    }
    
    const keywordArray = keywords
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean);
    
    if (keywordArray.length === 0) {
      return c.json({
        success: false,
        error: '유효한 키워드를 입력해주세요'
      }, 400);
    }
    
    if (keywordArray.length > 10) {
      return c.json({
        success: false,
        error: '한 번에 최대 10개까지 분석 가능합니다'
      }, 400);
    }
    
    // ✅ Service Role 클라이언트 사용
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 월간 크레딧 갱신 체크
    await checkAndRenewMonthlyCredits(supabase, user_id);
    
    // 캐시 확인
    const cachedResult = await getCachedAnalysis(supabase, keywords);
    if (cachedResult) {
      console.log(`⚡ 캐시 적중 - 무료 제공: ${keywords}`);
      
      // ✅ 최신 컬럼 포함 조회
      const { data: user } = await supabase
        .from('users')
        .select('free_credits, paid_credits')
        .eq('id', user_id)
        .single();
      
      return c.json({
        success: true,
        analysis: cachedResult,
        cached: true,
        cost_info: {
          type: 'cached',
          credits_used: 0,
          message: "이미 분석된 키워드입니다 (무료)",
          remaining_free_credits: user?.free_credits || 0,
          remaining_paid_credits: user?.paid_credits || 0
        }
      });
    }
    
    // ✅ 사용자 크레딧 조회 (간단하게 free_credits, paid_credits만)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('free_credits, paid_credits')
      .eq('id', user_id)
      .single();
    
    if (userError || !user) {
      return c.json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      }, 404);
    }
    
    const totalCredits = (user.free_credits || 0) + (user.paid_credits || 0);
    
    // 🚨 사용 권한 확인 (AI 호출 전)
    if (totalCredits <= 0) {
      return c.json({
        success: false,
        error: '크레딧이 부족합니다. 크레딧을 충전해주세요.',
        cost_info: {
          type: 'insufficient',
          free_credits: user.free_credits || 0,
          paid_credits: user.paid_credits || 0
        },
        redirect: '/payment'
      }, 402);
    }
    
    // 🔒 AI 호출 전 DB 차감 먼저 (비용 보호)
    let newFreeCredits = user.free_credits || 0;
    let newPaidCredits = user.paid_credits || 0;
    let costType: string;
    let creditsUsed = 1;  // 항상 1개 차감
    let usedFree = 0;
    let usedPaid = 0;
    
    if (newFreeCredits > 0) {
      // 무료 크레딧 차감
      newFreeCredits -= 1;
      costType = 'free_credit';
      usedFree = 1;
      console.log(`💎 [${user_id}] 무료 크레딧 차감: ${user.free_credits} → ${newFreeCredits}개`);
    } else if (newPaidCredits > 0) {
      // 유료 크레딧 차감
      newPaidCredits -= 1;
      costType = 'paid_credit';
      usedPaid = 1;
      console.log(`💳 [${user_id}] 유료 크레딧 차감: ${user.paid_credits} → ${newPaidCredits}개`);
    } else {
      // 이 경우는 위에서 402 반환했으므로 도달하지 않음
      costType = 'error';
    }
    
    // 🚨 중요: AI API 호출 **전에** DB 차감
    const updateData: any = {
      free_credits: newFreeCredits,
      paid_credits: newPaidCredits,
      updated_at: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user_id);
    
    if (updateError) {
      console.error(`❌ [${user_id}] 크레딧 차감 실패:`, updateError);
      console.error('❌ updateData:', updateData);
      console.error('❌ 차감 전 값:', { free: user.free_credits, paid: user.paid_credits, daily_used: dailyFreeUsed });
      return c.json({ success: false, error: '크레딧 차감 실패', details: updateError.message }, 500);
    }
    
    console.log(`✅ [${user_id}] 크레딧 차감 완료:`, {
      costType,
      before: { free: user.free_credits, paid: user.paid_credits },
      after: { free: newFreeCredits, paid: newPaidCredits },
      updateData
    });
    
    // 🔍 DB 업데이트 검증
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('free_credits, paid_credits')
      .eq('id', user_id)
      .single();
    
    if (verifyError) {
      console.error(`❌ [${user_id}] DB 검증 실패:`, verifyError);
    } else {
      console.log(`🔍 [${user_id}] DB 검증 성공:`, verifyUser);
      if (verifyUser.free_credits !== newFreeCredits || 
          verifyUser.paid_credits !== newPaidCredits) {
        console.error(`⚠️ [${user_id}] DB 불일치 감지!`, {
          expected: { free: newFreeCredits, paid: newPaidCredits },
          actual: verifyUser
        });
      }
    }
    
    console.log(`✅ [${user_id}] 크레딧 차감 완료, 이제 AI 호출 시작`);
    console.log(`🔍 키워드 심층 분석 시작: ${keywordArray.join(', ')}`);
    
    const analysisPrompt = `
당신은 10년 경력의 한국 시장 SEO/마케팅 전문 컨설턴트입니다. 
다음 키워드들을 2024-2025년 기준으로 종합 분석하여 **유효한 JSON만** 응답하세요.

분석 키워드: ${keywordArray.join(', ')}

⚠️ 중요: 반드시 유효한 JSON으로만 응답하세요.
- 문자열 내부에는 작은따옴표(') 사용
- 마지막 요소 뒤 쉼표 금지
- 마크다운 코드 블록 사용 금지
- 순수 JSON만 출력 (설명 문구 절대 금지)

**CRITICAL: 성의없는 답변 금지! 반드시 구체적이고 상세하게 작성하세요.**

[필수 분석 지표 - 모두 0~100점]
1. marketing_score: 마케팅 효과성 (정확한 점수, 랜덤 금지)
2. seo_score: SEO 난이도 (실제 검색량/경쟁도 반영)
3. viral_potential: 바이럴 확산 가능성
4. conversion_potential: 전환율 예상
5. trend_score: 트렌드 강도
6. competition_level: 경쟁 강도
7. saturation_level: 시장 포화도

[필수 작성 규칙]
✅ analysis: **반드시 5문장 이상**, 타겟층/시장상황/활용전략/경쟁분석/수익성 포함
✅ recommendations: **반드시 5개 이상**, 실행 가능한 구체적 전략
✅ related_keywords: **반드시 7개 이상**, 실제 검색되는 연관 키워드
✅ better_alternatives: **반드시 5개 이상**, 더 나은 키워드 + 구체적 이유
✅ market_insights: **반드시 5개 이상** (각 50자 이상), 시장 데이터/통계/출처 포함
✅ strategic_recommendations: **반드시 5개 이상** (각 50자 이상), 단계별 실행 전략

**지금 즉시 아래 JSON 형식만 출력하세요 (다른 텍스트 절대 금지):**

{
  "keywords": [
    {
      "keyword": "${keywordArray[0]}",
      "marketing_score": 85,
      "seo_score": 70,
      "viral_potential": 80,
      "conversion_potential": 90,
      "trend_score": 75,
      "trend_direction": "상승세",
      "competition_level": 85,
      "saturation_level": 80,
      "market_size": "대형 키워드",
      "total_score": 81,
      "analysis": "최소 5문장 이상의 구체적 분석 내용",
      "recommendations": ["구체적전략1", "구체적전략2", "구체적전략3", "구체적전략4", "구체적전략5"],
      "related_keywords": ["연관1", "연관2", "연관3", "연관4", "연관5", "연관6", "연관7"],
      "better_alternatives": [
        {"keyword": "대체1", "reason": "구체적 이유 (50자 이상)"},
        {"keyword": "대체2", "reason": "구체적 이유 (50자 이상)"},
        {"keyword": "대체3", "reason": "구체적 이유"},
        {"keyword": "대체4", "reason": "구체적 이유"},
        {"keyword": "대체5", "reason": "구체적 이유"}
      ]
    }
  ],
  "overall_score": 81,
  "market_insights": [
    "시장 인사이트 1 (50자 이상, 출처/통계 포함)",
    "시장 인사이트 2 (50자 이상, 출처/통계 포함)",
    "시장 인사이트 3 (50자 이상)",
    "시장 인사이트 4 (50자 이상)",
    "시장 인사이트 5 (50자 이상)"
  ],
  "strategic_recommendations": [
    "실행 전략 1 (50자 이상, 구체적 실행방법 포함)",
    "실행 전략 2 (50자 이상, 구체적 실행방법 포함)",
    "실행 전략 3 (50자 이상)",
    "실행 전략 4 (50자 이상)",
    "실행 전략 5 (50자 이상)"
  ]
}
    `;
    
    let analysis: any;
    try {
      let aiResponse: string;
      
      console.log(`🚀 [AI 진단] AI 호출 시작 - 키워드: ${keywords}`);
      
      if (c.env.GEMINI_API_KEY) {
        console.log(`🔑 [AI 진단] Gemini API 사용 (키 길이: ${c.env.GEMINI_API_KEY?.length})`);
        aiResponse = await generateContentWithGemini(
          c.env.GEMINI_API_KEY,
          analysisPrompt
        );
      } else {
        console.log(`🔑 [AI 진단] GPT API 사용 (키 길이: ${c.env.OPENAI_API_KEY?.length})`);
        const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o', // gpt-4o로 변경 (품질 향상)
          messages: [
            {
              role: 'system',
              content: '당신은 마케팅 키워드 분석 전문가입니다. JSON 형식으로만 응답하세요.'
            },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.3,
          max_tokens: 4000
          // 🔥 v15.9.0: JSON Schema 제거 - 블로그/스레드와 동일한 방식
        });
        aiResponse = completion.choices[0].message.content || '{}';
      }
      
      console.log(`✅ [AI 진단] AI 응답 성공 - 길이: ${aiResponse.length}자`);
      console.log(`📄 [AI 진단] AI 응답 원본 (첫 200자):`, aiResponse.substring(0, 200));
      
      // 🔥 3단계 안전 파싱 (JSON Schema + 후처리)
      let parsedAnalysis: any = null;
      
      // 1단계: 직접 파싱 시도
      try {
        parsedAnalysis = JSON.parse(aiResponse.trim());
        console.log(`✅ [AI 진단] 1단계 파싱 성공 - keywords: ${parsedAnalysis.keywords?.length || 0}개`);
      } catch (parseError) {
        const errorMsg = (parseError as Error).message;
        console.warn(`⚠️ [AI 진단] 1단계 파싱 실패: ${errorMsg}`);
        
        // 2단계: 안전한 문자열 정제 후 재시도
        try {
          console.log(`🔧 [AI 진단] 2단계: 문자열 정제 시도`);
          
          // 에러 위치 확인
          const posMatch = errorMsg.match(/position (\d+)/);
          if (posMatch) {
            const errorPos = parseInt(posMatch[1]);
            console.log(`📍 [AI 진단] 에러 위치: ${errorPos}자`);
            console.log(`📄 [AI 진단] 에러 주변:`, aiResponse.substring(Math.max(0, errorPos - 50), errorPos + 50));
          }
          
          // 보수적 정제: 이스케이프되지 않은 따옴표만 처리
          let cleanedResponse = aiResponse.trim();
          
          // JSON 문자열 값 내부의 이스케이프되지 않은 따옴표를 작은따옴표로 변경
          // 패턴: "key": "value with "quote"" → "key": "value with 'quote'"
          cleanedResponse = cleanedResponse.replace(
            /"([^"]*?)"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
            (match, key, value) => {
              // value 내부에 이스케이프되지 않은 따옴표가 있으면 작은따옴표로 변경
              const cleanedValue = value.replace(/(?<!\\)"/g, "'");
              return `"${key}": "${cleanedValue}"`;
            }
          );
          
          parsedAnalysis = JSON.parse(cleanedResponse);
          console.log(`✅ [AI 진단] 2단계 파싱 성공 (정제 후) - keywords: ${parsedAnalysis.keywords?.length || 0}개`);
          
        } catch (secondError) {
          console.warn(`⚠️ [AI 진단] 2단계 파싱도 실패: ${(secondError as Error).message}`);
          
          // 3단계: 마지막 완전한 객체까지만 사용
          try {
            console.log(`🔧 [AI 진단] 3단계: 불완전한 JSON 잘라내기`);
            const lastBrace = aiResponse.lastIndexOf('}');
            
            if (lastBrace > 0) {
              const truncated = aiResponse.substring(0, lastBrace + 1);
              
              // 잘라낸 JSON도 정제 시도
              let cleanedTruncated = truncated.replace(
                /"([^"]*?)"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
                (match, key, value) => {
                  const cleanedValue = value.replace(/(?<!\\)"/g, "'");
                  return `"${key}": "${cleanedValue}"`;
                }
              );
              
              parsedAnalysis = JSON.parse(cleanedTruncated);
              console.log(`✅ [AI 진단] 3단계 파싱 성공 (잘라내기 + 정제) - keywords: ${parsedAnalysis.keywords?.length || 0}개`);
            } else {
              throw new Error('마지막 중괄호를 찾을 수 없음');
            }
          } catch (thirdError) {
            console.error(`❌ [AI 진단] 모든 파싱 시도 실패`);
            console.error(`📄 [AI 진단] 원본 응답 첫 1000자:`, aiResponse.substring(0, 1000));
            console.error(`📄 [AI 진단] 원본 응답 마지막 500자:`, aiResponse.substring(aiResponse.length - 500));
            throw new Error(`JSON 파싱 완전 실패: ${errorMsg}`);
          }
        }
      }
      
      analysis = parsedAnalysis;
      
      // 🔍 AI 원본 응답 로그
      console.log(`🔍 [${user_id}] AI 원본 market_insights:`, analysis.market_insights);
      console.log(`🔍 [${user_id}] AI 원본 strategic_recommendations:`, analysis.strategic_recommendations);
      
      if (!analysis.keywords || !Array.isArray(analysis.keywords)) {
        throw new Error('Invalid analysis format');
      }
      
      analysis.keywords = analysis.keywords.map((item: any) => ({
        keyword: item.keyword || '알 수 없음',
        marketing_score: Math.min(100, Math.max(0, Math.round(item.marketing_score || 70))),
        seo_score: Math.min(100, Math.max(0, Math.round(item.seo_score || 70))),
        viral_potential: Math.min(100, Math.max(0, Math.round(item.viral_potential || 70))),
        conversion_potential: Math.min(100, Math.max(0, Math.round(item.conversion_potential || 70))),
        trend_score: Math.min(100, Math.max(0, Math.round(item.trend_score || 70))),
        trend_direction: item.trend_direction || '안정',
        competition_level: Math.min(100, Math.max(0, Math.round(item.competition_level || 60))),
        saturation_level: Math.min(100, Math.max(0, Math.round(item.saturation_level || 60))),
        market_size: item.market_size || '중형 키워드',
        total_score: Math.round(
          ((item.marketing_score || 70) + (item.seo_score || 70) +
           (item.viral_potential || 70) + (item.conversion_potential || 70)) / 4
        ),
        analysis: item.analysis || `"${item.keyword}"에 대한 마케팅 분석입니다.`,
        recommendations: Array.isArray(item.recommendations)
          ? item.recommendations
          : ['타겟 고객층 명확화', '차별화 포인트 강조', '콘텐츠 품질 향상'],
        related_keywords: Array.isArray(item.related_keywords) && item.related_keywords.length >= 7
          ? item.related_keywords
          : [`${item.keyword} 후기`, `${item.keyword} 추천`, `${item.keyword} 비교`, `${item.keyword} 가격`, `${item.keyword} 리뷰`, `${item.keyword} 순위`, `${item.keyword} 브랜드`],
        better_alternatives: Array.isArray(item.better_alternatives) && item.better_alternatives.length >= 5
          ? item.better_alternatives
          : [
            { keyword: `${item.keyword} 전문가`, reason: '전문성 강조로 신뢰도 향상 및 고객 전환율 증가' },
            { keyword: `${item.keyword} 가이드`, reason: '정보성 콘텐츠로 SEO 우위 확보 및 유입 증가' },
            { keyword: `${item.keyword} 솔루션`, reason: '문제 해결 중심 접근으로 전환율 향상' },
            { keyword: `${item.keyword} 프리미엄`, reason: '고가 시장 타겟으로 수익성 개선' },
            { keyword: `${item.keyword} 최신`, reason: '최신 트렌드 반영으로 검색량 증가' }
          ]
      }));
      
      analysis.keywords.sort((a: any, b: any) => (b.total_score || 0) - (a.total_score || 0));
      
      analysis.overall_score = Math.round(
        analysis.overall_score ||
        analysis.keywords.reduce((sum: number, k: any) => sum + (k.total_score || 0), 0) /
        Math.max(1, analysis.keywords.length)
      );
      
      // 🔥 강제 보정: AI가 5개 미만을 반환하면 무조건 기본값 5개로 대체
      if (!Array.isArray(analysis.market_insights) || analysis.market_insights.length < 5) {
        console.log(`⚠️ [${user_id}] market_insights ${analysis.market_insights?.length || 0}개 → 5개로 강제 보정`);
        analysis.market_insights = [
          '현재 시장에서 해당 키워드의 검색 수요가 꾸준히 증가하고 있습니다',
          '경쟁사 분석 결과 차별화 포인트를 통한 시장 진입이 가능합니다',
          '타겟 고객층이 명확하여 효율적인 마케팅 전략 수립이 용이합니다',
          '디지털 마케팅 채널을 통한 브랜드 인지도 향상 기회가 존재합니다',
          '장기적 관점에서 안정적인 수익 창출이 기대되는 키워드입니다'
        ];
      }
      
      if (!Array.isArray(analysis.strategic_recommendations) || analysis.strategic_recommendations.length < 5) {
        console.log(`⚠️ [${user_id}] strategic_recommendations ${analysis.strategic_recommendations?.length || 0}개 → 5개로 강제 보정`);
        analysis.strategic_recommendations = [
          '핵심 타겟 고객층을 세분화하고 맞춤형 메시지를 개발하세요',
          'SEO 최적화된 콘텐츠를 주 2-3회 이상 꾸준히 발행하세요',
          '인스타그램과 유튜브 숏폼을 활용한 바이럴 마케팅을 실행하세요',
          '고객 후기와 성공 사례를 전면에 배치하여 신뢰도를 높이세요',
          '데이터 기반 A/B 테스트로 광고 효율을 지속적으로 개선하세요'
        ];
      }
      
      console.log(`✅ [${user_id}] 최종 market_insights 개수:`, analysis.market_insights.length);
      console.log(`✅ [${user_id}] 최종 strategic_recommendations 개수:`, analysis.strategic_recommendations.length);
      
    } catch (aiError) {
      console.error('💥 [AI 진단] AI 호출 완전 실패:', {
        error_name: (aiError as Error).name,
        error_message: (aiError as Error).message,
        keywords: keywords,
        timestamp: new Date().toISOString()
      });
      
      // ✅ 템플릿 폴백 제거 - 정직한 에러 반환
      return c.json({
        success: false,
        error: 'AI 분석 서비스가 일시적으로 이용 불가합니다',
        error_code: 'AI_UNAVAILABLE',
        error_detail: `AI 연결 실패: ${(aiError as Error).message}`,
        retry_after: 300, // 5분 후 재시도 권장
        keywords: keywordArray // 입력 키워드 반환
      }, { 
        status: 503 // Service Unavailable
      });
    }
    
    // 캐싱 및 히스토리 저장
    await Promise.all([
      saveAnalysisCache(supabase, keywords, analysis),
      saveAnalysisHistory(supabase, user_id, keywords, analysis, costType)
    ]).catch(error => {
      console.error('⚠️ DB 저장 실패 (분석 결과는 반환):', error);
    });
    
    console.log(`✅ 키워드 분석 완료: 종합 점수 ${analysis.overall_score}점`);
    
    return c.json({
      success: true,
      analysis: {
        ...analysis,
        analyzed_at: new Date().toISOString(),
        keywords_count: keywordArray.length,
        analysis_version: 'v6.0_production_ready'
      },
      cost_info: {
        type: costType,
        credits_used: creditsUsed,
        used_free_credits: usedFree,
        used_paid_credits: usedPaid,
        remaining_free_credits: newFreeCredits,
        remaining_paid_credits: newPaidCredits
      }
    });
    
  } catch (error: any) {
    console.error('❌ 키워드 분석 실패:', error);
    return c.json({
      success: false,
      error: error.message || '키워드 분석 중 오류가 발생했습니다'
    }, 500);
  }
});

// ===================================
// API: 크레딧 상태 조회
// ===================================
app.get('/api/user-credits-status', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    if (!user_id) {
      return c.json({
        success: false,
        error: 'user_id 파라미터가 필요합니다'
      }, 400);
    }
    
    // ✅ Service Role 클라이언트 사용 (RLS 우회)
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 월간 크레딧 갱신 체크
    await checkAndRenewMonthlyCredits(supabase, user_id);
    
    // ✅ DB에서 크레딧 조회 (간단하게)
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('free_credits, paid_credits')
      .eq('id', user_id)
      .single();
    
    if (queryError || !user) {
      console.error('❌ 사용자 조회 실패:', queryError);
      return c.json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      }, 404);
    }
    
    const freeCredits = user.free_credits || 0;
    const paidCredits = user.paid_credits || 0;
    
    return c.json({
      success: true,
      free_credits: freeCredits,
      paid_credits: paidCredits,
      total_credits: freeCredits + paidCredits
    });
    
  } catch (error: any) {
    console.error('❌ user-credits-status API 오류:', error);
    return c.json({
      success: false,
      error: '서버 내부 오류가 발생했습니다'
    }, 500);
  }
});

// ===================================
// 키워드 분석 확장 기능 - 3가지 핵심 API
// ===================================

// 1. 분석 기록 조회 API (무료 제공)
app.get('/api/keyword-history', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    const limit = parseInt(c.req.query('limit') || '20');
    
    if (!user_id) {
      return c.json({
        success: false,
        error: '사용자 ID가 필요합니다'
      }, 400);
    }
    
    const supabase = createSupabaseAdmin(c.env);
    
    // generations 테이블에서 모든 기록 조회 (analysis_type 컬럼 없음)
    const { data, error } = await supabase
      .from('generations')
      .select('id, keywords, content, created_at, cost_source')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('히스토리 조회 실패:', error);
      return c.json({
        success: false,
        error: '히스토리 조회 중 오류가 발생했습니다'
      }, 500);
    }
    
    // 데이터 가공 (JSON 파싱 및 요약 정보 추출) - 안전한 문자열 처리
    const history = (data || []).map(item => {
      let parsedContent = null;
      try {
        parsedContent = typeof item.content === 'string' 
          ? JSON.parse(item.content) 
          : item.content;
      } catch (e) {
        console.error('JSON 파싱 실패:', e);
        parsedContent = { overall_score: 0, keywords: [] };
      }
      
      // 안전한 문자열 추출 함수
      const safeString = (value: any): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'object' && value.keyword) return String(value.keyword).trim();
        return String(value).trim();
      };
      
      return {
        id: item.id,
        keywords: item.keywords,
        overall_score: parsedContent?.overall_score || 0,
        top_keyword: safeString(parsedContent?.keywords?.[0]?.keyword || parsedContent?.keywords?.[0] || ''),
        top_keyword_score: parsedContent?.keywords?.[0]?.total_score || 0,
        cost_source: item.cost_source,
        created_at: item.created_at,
        full_result: parsedContent // 모달 재사용을 위한 전체 데이터
      };
    });
    
    console.log(`✅ 히스토리 조회 완료: ${history.length}건`);
    
    return c.json({
      success: true,
      history,
      total: history.length
    });
    
  } catch (error: any) {
    console.error('❌ 히스토리 조회 실패:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// 2. 월간 리포트 API (통계 요약)
app.get('/api/keyword-monthly-report', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    const month = c.req.query('month') || new Date().toISOString().slice(0, 7); // YYYY-MM 형식
    
    if (!user_id) {
      return c.json({
        success: false,
        error: '사용자 ID가 필요합니다'
      }, 400);
    }
    
    const supabase = createSupabaseAdmin(c.env);
    
    // 해당 월의 시작일과 종료일 계산
    const startDate = `${month}-01T00:00:00Z`;
    const endDate = new Date(`${month}-01`);
    endDate.setMonth(endDate.getMonth() + 1);
    const endDateStr = endDate.toISOString();
    
    // 월간 분석 데이터 조회 (analysis_type 컬럼 제거)
    const { data, error } = await supabase
      .from('generations')
      .select('keywords, content, cost_source, created_at')
      .eq('user_id', user_id)
      .gte('created_at', startDate)
      .lt('created_at', endDateStr)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('월간 리포트 조회 실패:', error);
      return c.json({
        success: false,
        error: '월간 리포트 조회 중 오류가 발생했습니다'
      }, 500);
    }
    
    // 통계 계산
    const totalAnalyses = data?.length || 0;
    const costBreakdown = {
      daily_free: 0,
      free_credit: 0,
      paid_credit: 0,
      cached: 0
    };
    
    let totalScore = 0;
    let highestScore = 0;
    let bestKeyword = '-';
    const keywordScores: { [key: string]: { scores: number[]; count: number } } = {};
    
    (data || []).forEach(item => {
      // 비용 타입별 집계
      if (item.cost_source && costBreakdown.hasOwnProperty(item.cost_source)) {
        costBreakdown[item.cost_source as keyof typeof costBreakdown]++;
      }
      
      // 분석 결과 파싱 및 통계 계산
      try {
        const content = typeof item.content === 'string' 
          ? JSON.parse(item.content) 
          : item.content;
        
        if (content?.overall_score) {
          totalScore += content.overall_score;
          
          if (content.overall_score > highestScore) {
            highestScore = content.overall_score;
            // 안전한 키워드 추출
            const safeKeyword = (() => {
              if (content.keywords?.[0]?.keyword) {
                return String(content.keywords[0].keyword).trim();
              }
              if (item.keywords) {
                if (typeof item.keywords === 'string') {
                  return item.keywords.split(',')[0]?.trim() || '-';
                }
                if (Array.isArray(item.keywords) && item.keywords[0]) {
                  return String(item.keywords[0]).trim();
                }
              }
              return '-';
            })();
            bestKeyword = safeKeyword;
          }
        }
        
        // 키워드별 점수 집계 (TOP 10 계산용)
        if (content?.keywords && Array.isArray(content.keywords)) {
          content.keywords.forEach((kw: any) => {
            if (kw.keyword && typeof kw.total_score === 'number') {
              const kwString = String(kw.keyword).trim();
              if (!keywordScores[kwString]) {
                keywordScores[kwString] = { scores: [], count: 0 };
              }
              keywordScores[kwString].scores.push(kw.total_score);
              keywordScores[kwString].count++;
            }
          });
        }
      } catch (e) {
        console.error('JSON 파싱 실패:', e);
      }
    });
    
    const avgScore = totalAnalyses > 0 ? Math.round(totalScore / totalAnalyses) : 0;
    
    // TOP 10 키워드 (평균 점수 기준)
    const topKeywords = Object.entries(keywordScores)
      .map(([keyword, data]) => ({
        keyword,
        avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        analysis_count: data.count
      }))
      .sort((a, b) => b.avg_score - a.avg_score)
      .slice(0, 10);
    
    // AI 인사이트 생성
    const insights = [
      totalAnalyses > 10 
        ? `이번 달 ${totalAnalyses}회 분석으로 활발한 키워드 연구를 진행하셨습니다.`
        : totalAnalyses > 0 
          ? '더 많은 키워드 분석으로 마케팅 인사이트를 확보하세요.'
          : '아직 이번 달 분석 기록이 없습니다.',
      
      topKeywords.length > 0
        ? `"${topKeywords[0].keyword}"가 가장 높은 평균 점수(${topKeywords[0].avg_score}점)를 기록했습니다.`
        : '분석된 키워드가 없습니다.',
      
      (costBreakdown.daily_free + costBreakdown.cached) / Math.max(1, totalAnalyses) > 0.5
        ? '무료 할당량과 캐시를 효율적으로 활용하고 계십니다.'
        : '유료 크레딧 사용 비중이 높습니다. 일일 무료 분석을 더 활용해보세요.'
    ];
    
    console.log(`✅ 월간 리포트 생성 완료: ${month} (${totalAnalyses}건 분석)`);
    
    return c.json({
      success: true,
      report: {
        month,
        total_analyses: totalAnalyses,
        avg_score: avgScore,
        highest_score: highestScore,
        best_keyword: bestKeyword,
        cost_breakdown: costBreakdown,
        top_keywords: topKeywords,
        insights
      }
    });
    
  } catch (error: any) {
    console.error('❌ 월간 리포트 생성 실패:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export default app;
