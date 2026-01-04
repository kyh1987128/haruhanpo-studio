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

    // ✅ 회원 사용량 체크 (하이브리드 플랜)
    if (!is_guest && user_id) {
      // 사용자 정보 조회
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('subscription_status, monthly_included_count, monthly_used_count, monthly_reset_date, credits')
        .eq('id', user_id)
        .single();
      
      if (userError || !user) {
        return c.json({
          error: '사용자 정보 조회 실패',
          message: '사용자를 찾을 수 없습니다. 다시 로그인해주세요.',
          redirect: '/login'
        }, 404);
      }
      
      console.log(`📊 사용자 상태: ${user_id} | 포함: ${user.monthly_included_count} | 사용: ${user.monthly_used_count} | 크레딧: ${user.credits}`);
      
      // 월간 리셋 체크
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.substring(0, 7) + '-01';
      if (!user.monthly_reset_date || user.monthly_reset_date < currentMonth) {
        await supabase
          .from('users')
          .update({ 
            monthly_used_count: 0,
            monthly_reset_date: today
          })
          .eq('id', user_id);
        
        user.monthly_used_count = 0;
        console.log(`📅 월간 사용량 리셋 완료`);
      }
      
      // 사용 가능 여부 체크
      const included_remaining = (user.monthly_included_count || 50) - (user.monthly_used_count || 0);
      
      if (included_remaining > 0) {
        // 포함 횟수 있음
        console.log(`✅ 포함 횟수 사용 가능: ${included_remaining}회 남음`);
      } else if ((user.credits || 0) > 0) {
        // 크레딧 있음
        console.log(`✅ 크레딧 사용 가능: ${user.credits}개 남음`);
      } else {
        // 둘 다 없음
        return c.json({
          error: '생성 횟수 부족',
          message: `월 ${user.monthly_included_count || 50}회를 모두 사용했습니다. 크레딧을 충전해주세요.`,
          monthly_used: user.monthly_used_count,
          monthly_included: user.monthly_included_count || 50,
          credits: user.credits || 0,
          redirect: '/payment'
        }, 403);
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

    // ⚠️ 플랫폼 수 제한 (타임아웃 방지)
    if (platforms.length > 3) {
      console.warn('⚠️ 플랫폼이 3개를 초과합니다. 처음 3개만 생성합니다:', platforms.slice(0, 3));
      platforms.splice(3);
    }

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

    // ✅ 사용량 차감 로직 (하이브리드 플랜)
    let deducted = {
      type: 'none', // 'included' | 'credit' | 'none'
      monthly_remaining: 0,
      credits_remaining: 0
    };
    
    if (!is_guest && user_id) {
      // 사용자 정보 재조회
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('monthly_included_count, monthly_used_count, credits')
        .eq('id', user_id)
        .single();
      
      if (!userError && user) {
        const included_remaining = (user.monthly_included_count || 50) - (user.monthly_used_count || 0);
        
        // 1. 포함 횟수 먼저 차감
        if (included_remaining > 0) {
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ 
              monthly_used_count: (user.monthly_used_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', user_id)
            .select('monthly_included_count, monthly_used_count, credits')
            .single();
          
          if (!updateError && updatedUser) {
            deducted.type = 'included';
            deducted.monthly_remaining = updatedUser.monthly_included_count - updatedUser.monthly_used_count;
            deducted.credits_remaining = updatedUser.credits || 0;
            console.log(`✅ 포함 횟수 차감: ${user_id} | ${deducted.monthly_remaining}회 남음`);
          }
        }
        // 2. 크레딧 차감
        else if ((user.credits || 0) > 0) {
          const newCredits = user.credits - 1;
          
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ 
              credits: newCredits,
              updated_at: new Date().toISOString()
            })
            .eq('id', user_id)
            .select('monthly_included_count, monthly_used_count, credits')
            .single();
          
          if (!updateError && updatedUser) {
            deducted.type = 'credit';
            deducted.monthly_remaining = 0;
            deducted.credits_remaining = updatedUser.credits;
            
            // credit_transactions 기록
            await supabase.from('credit_transactions').insert({
              user_id,
              amount: -1,
              balance_after: updatedUser.credits,
              type: 'usage',
              description: `콘텐츠 생성 (${platforms.join(', ')})`
            });
            
            console.log(`✅ 크레딧 차감: ${user_id} | ${deducted.credits_remaining}개 남음`);
          }
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
    
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // 'YYYY-MM'
    
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
      
      // 월간 크레딧 리셋 체크 (1크레딧 = 1회)
      const userResetMonth = existingUser.monthly_reset_date 
        ? existingUser.monthly_reset_date.substring(0, 7) 
        : null;
      
      const needsReset = !userResetMonth || userResetMonth < currentMonth;
      
      if (needsReset) {
        console.log('📅 월간 크레딧 리셋:', { 
          userResetMonth, 
          currentMonth,
          oldCredits: existingUser.credits
        });
        
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            email,
            name: name || existingUser.name,
            credits: 50, // ✅ 월 50크레딧으로 리셋
            monthly_reset_date: today,
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
      // 3️⃣ 신규 사용자: 생성
      console.log('🆕 신규 사용자 생성:', email);
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user_id,
          email,
          name: name || null,
          subscription_status: 'active',
          credits: 53, // ✅ 월 50크레딧 + 가입 보너스 3크레딧
          monthly_reset_date: today
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
      subscription_status: user.subscription_status,
      credits: user.credits
    });
    
    return c.json({
      success: true,
      user_id: user.id,
      email: user.email,
      name: user.name,
      subscription_status: user.subscription_status || 'active',
      credits: user.credits ?? 50, // ✅ 1크레딧 = 1회
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

// 메인 페이지
app.get('/', (c) => {
  return c.html(htmlTemplate);
});

export default app;
