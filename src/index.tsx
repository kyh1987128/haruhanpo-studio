import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import OpenAI from 'openai';
import { getBlogPrompt, getInstagramPrompt, getThreadsPrompt, getYouTubePrompt, getYoutubeLongformPrompt, getShortformPrompt, getMetadataPrompt, getInstagramFeedPrompt, getTwitterPrompt, getLinkedInPrompt, getKakaoTalkPrompt, getBrunchPrompt, getTikTokPrompt, getInstagramReelsPrompt } from './prompts';
import { htmlTemplate } from './html-template';
import { landingPageTemplate } from './landing-page';
import { dashboardTemplate } from './dashboard-template';
import { youtubeAnalyzerTemplate } from './youtube-analyzer-template';
import { analyzeImageWithGemini, generateContentWithGemini, calculateGeminiCost, estimateTokens } from './gemini';
import { createSupabaseAdmin, createSupabaseClient, grantMilestoneCredit, updateConsecutiveLogin, checkAndUseMonthlyQuota } from './lib/supabase';
import { parseMultipleDocuments, combineDocumentTexts, truncateText } from './document-parser';
import payments from './routes/payments';
import images, { fetchSmartImages } from './routes/images';
import youtubeApi from './routes/api/youtube';
import { injectImagesIntoBlogContent, injectImagesIntoBrunchContent, convertHtmlToNaverText, addInstagramImageMetadata, injectBlogImageGuide, injectBrunchImageGuide, injectYoutubeThumbnailGuide } from './image-injection';
import './styles.css'; // ✅ Tailwind CSS import

type Bindings = {
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  UNSPLASH_ACCESS_KEY?: string;
  YOUTUBE_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ========================================
// 크레딧 계산 상수
// ========================================
const COSTS: Record<string, number> = {
  IMAGE_ANALYSIS: 0.01,
  BLOG: 0.04,
  INSTAGRAM: 0.03,
  INSTAGRAM_FEED: 0.03,
  INSTAGRAM_REELS: 0.04,
  THREADS: 0.02,
  YOUTUBE: 0.04,
  YOUTUBE_SHORTS: 0.04,
  YOUTUBE_LONGFORM: 0.08,
  TIKTOK: 0.04,
  SHORTFORM_MULTI: 0.05,
  METADATA_GENERATION: 0.03,
  TWITTER: 0.02,
  LINKEDIN: 0.03,
  KAKAOTALK: 0.02,
  BRUNCH: 0.04
};

const EXCHANGE_RATE = 1300; // 1 USD = 1300 KRW

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

// ========================================
// API 라우트: 사용자 통계 및 사용 내역
// ========================================

// POST /api/usage-history - 사용 내역 기록
app.post('/api/usage-history', async (c) => {
  try {
    const { user_id, content_type, platform, cost, credits_used, content_title } = await c.req.json();
    
    if (!user_id || !content_type || !credits_used) {
      return c.json({ 
        success: false, 
        error: 'user_id, content_type, credits_used는 필수입니다.' 
      }, 400);
    }
    
    const supabase = createSupabaseAdmin(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    
    const { data, error } = await supabase
      .from('usage_history')
      .insert({
        user_id,
        content_type,
        platform: platform || content_type,
        cost: cost || 0,
        credits_used,
        content_title: content_title || null
      })
      .select();
    
    if (error) {
      console.error('❌ usage_history 기록 실패:', error);
      throw error;
    }
    
    console.log('✅ usage_history 기록 성공:', { user_id, content_type, credits_used });
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ usage_history API 에러:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/user/stats - 사용자 통계 조회
app.get('/api/user/stats', async (c) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'No authorization header' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Supabase에서 사용자 정보 가져오기
    const supabase = createSupabaseAdmin(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    const userId = user.id;
    
    // user_stats에서 통계 조회
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = 데이터 없음
      console.error('❌ user_stats 조회 실패:', statsError);
      throw statsError;
    }
    
    // 🆕 현재 크레딧 잔액 조회
    const { data: credits, error: creditsError } = await supabase
      .from('user_credits')
      .select('free_credits, paid_credits')
      .eq('user_id', userId)
      .single();
    
    const currentCredits = {
      free: credits?.free_credits || 0,
      paid: credits?.paid_credits || 0,
      total: (credits?.free_credits || 0) + (credits?.paid_credits || 0)
    };
    
    // 데이터가 없으면 초기화
    if (!stats) {
      return c.json({
        success: true,
        stats: {
          total_credits_used: 0,
          total_content_generated: 0,
          rank_position: null,
          rank_percentage: null,
          last_usage_at: null,
          current_credits: currentCredits
        }
      });
    }
    
    return c.json({
      success: true,
      stats: {
        total_credits_used: stats.total_credits_used || 0,
        total_content_generated: stats.total_content_generated || 0,
        rank_position: stats.rank_position,
        rank_percentage: stats.rank_percentage,
        last_usage_at: stats.last_usage_at,
        current_credits: currentCredits
      }
    });
    
  } catch (error: any) {
    console.error('❌ user/stats API 에러:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/admin/calculate-rankings - 랭킹 재계산 (관리자용)
app.post('/api/admin/calculate-rankings', async (c) => {
  try {
    // 간단한 관리자 인증 (필요시 추가)
    const adminSecret = c.req.header('X-Admin-Secret');
    // if (adminSecret !== c.env.ADMIN_SECRET) {
    //   return c.json({ success: false, error: 'Unauthorized' }, 401);
    // }
    
    const supabase = createSupabaseAdmin(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
    
    // PostgreSQL 함수 실행
    const { error } = await supabase.rpc('calculate_user_rankings');
    
    if (error) {
      console.error('❌ 랭킹 계산 실패:', error);
      throw error;
    }
    
    console.log('✅ 랭킹 계산 완료');
    
    return c.json({ success: true, message: 'Rankings calculated successfully' });
  } catch (error: any) {
    console.error('❌ calculate-rankings API 에러:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// API 라우트: 대시보드 통계
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
    const imageContent = images.map((img: any, idx: number) => {
      // 안전하게 base64 문자열 추출
      const imageUrl = typeof img === 'string' ? img : (img.base64 || String(img));
      return {
        type: 'image_url' as const,
        image_url: { url: imageUrl }
      };
    });

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
        images.map(async (img: any, index: number) => {
          try {
            // 안전하게 base64 문자열 추출
            const imageBase64 = typeof img === 'string' ? img : (img.base64 || String(img));
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
          
          // 브런치
          if (platforms.includes('brunch')) {
            generationTasks.push(
              generateContent(openai, 'brunch', getBrunchPrompt(promptParams), aiModel)
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
      images, // { base64, filename, size }[] 형태의 이미지 배열
      platforms, // ['blog', 'instagram', 'threads', 'youtube']
      aiModel = 'gpt-4o', // AI 모델 선택 (기본값: gpt-4o)
      apiKey, // 클라이언트에서 전달받은 API 키
      forceGenerate = false, // 검증 우회 플래그
      customPrompt, // ✅ 추가: 사용자 커스텀 템플릿
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

    // ✅ 이미지 없어도 콘텐츠 생성 허용 (이미지 API 통합 후 자동으로 이미지 삽입)
    // if (images.length === 0) {
    //   return c.json(
    //     {
    //       success: false,
    //       error: '최소 1장의 이미지를 업로드해주세요.',
    //     },
    //     400
    //   );
    // }

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

    // ✅ 회원 크레딧 체크 (플랫폼 1개당 1크레딧)
    if (!is_guest && user_id) {
      // 🚨 크리티컬: 플랫폼 개수 = 크레딧 (1개당 1크레딧)
      const platformCount = platforms.length;
      const requiredCredits = platformCount; // 플랫폼 개수만큼 크레딧 차감
      
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
    let contentStrategy: 'integrated' | 'image-first' | 'keyword-first' | 'document-first' = 
      images.length > 0 ? 'image-first' : 'keyword-first'; // 이미지 있으면 image-first, 없으면 keyword-first
    let comprehensiveValidation: any = null;

    // ✅ 이미지가 있을 때만 검증 (이미지 없으면 키워드 중심 생성)
    // 🔥 100자 → 50자로 완화 (고양이 이미지 등 간단한 분석도 통과)
    if (images.length > 0 && !forceGenerate && combinedImageDescription.length < 50) {
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

    // ✅ 크레딧 차감 시스템 (플랫폼 1개당 1크레딧)
    
    // 1. 필요 크레딧 계산 함수 (플랫폼 개수 = 크레딧)
    const calculateRequiredCredits = (platformCount: number): number => {
      return platformCount; // 플랫폼 1개당 1크레딧
    };
    
    const requiredCredits = calculateRequiredCredits(platforms.length);
    console.log(`📊 선택된 플랫폼: ${platforms.length}개 → 필요 크레딧: ${requiredCredits}개`);
    
    let initialFreeCredits = 0;
    let initialPaidCredits = 0;
    let freeUsed = 0;
    let paidUsed = 0;
    
    if (!is_guest && user_id) {
      try {
        // ✅ 간단한 크레딧 차감 로직 (RPC 함수 대신 직접 구현)
        
        // 1️⃣ 현재 크레딧 조회
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('free_credits, paid_credits')
          .eq('id', user_id)
          .single();
        
        if (fetchError || !userData) {
          console.error('❌ 사용자 조회 실패:', fetchError);
          return c.json({
            success: false,
            error: '사용자 조회 실패',
            message: fetchError?.message || '사용자 정보를 찾을 수 없습니다.'
          }, 500);
        }
        
        const freeCredits = userData.free_credits || 0;
        const paidCredits = userData.paid_credits || 0;
        const totalCredits = freeCredits + paidCredits;
        
        console.log(`💰 현재 크레딧: 무료 ${freeCredits}, 유료 ${paidCredits}, 합계 ${totalCredits}`);
        
        // 2️⃣ 크레딧 충분한지 확인
        if (totalCredits < requiredCredits) {
          return c.json({
            success: false,
            error: '크레딧 부족',
            message: `${requiredCredits}크레딧이 필요합니다. 현재 ${totalCredits}크레딧 보유중입니다.`,
            required_credits: requiredCredits,
            free_credits: freeCredits,
            paid_credits: paidCredits,
            total_credits: totalCredits
          }, 403);
        }
        
        // 3️⃣ 크레딧 차감 (무료 크레딧 우선 사용)
        let remainingToDeduct = requiredCredits;
        let newFreeCredits = freeCredits;
        let newPaidCredits = paidCredits;
        
        // 무료 크레딧부터 차감
        if (newFreeCredits > 0) {
          const fromFree = Math.min(newFreeCredits, remainingToDeduct);
          newFreeCredits -= fromFree;
          remainingToDeduct -= fromFree;
          freeUsed = fromFree;
          console.log(`💎 무료 크레딧 차감: ${fromFree}개`);
        }
        
        // 유료 크레딧 차감
        if (remainingToDeduct > 0) {
          const fromPaid = Math.min(newPaidCredits, remainingToDeduct);
          newPaidCredits -= fromPaid;
          remainingToDeduct -= fromPaid;
          paidUsed = fromPaid;
          console.log(`💳 유료 크레딧 차감: ${fromPaid}개`);
        }
        
        // 4️⃣ DB 업데이트
        const { error: updateError } = await supabase
          .from('users')
          .update({
            free_credits: newFreeCredits,
            paid_credits: newPaidCredits
          })
          .eq('id', user_id);
        
        if (updateError) {
          console.error('❌ 크레딧 차감 실패:', updateError);
          return c.json({
            success: false,
            error: '크레딧 차감 실패',
            message: updateError.message
          }, 500);
        }
        
        initialFreeCredits = newFreeCredits;
        initialPaidCredits = newPaidCredits;
        
        console.log(`✅ 크레딧 차감 완료: 무료 ${freeUsed}, 유료 ${paidUsed}, 남은 크레딧 ${newFreeCredits + newPaidCredits}`);
        
        // 5️⃣ credit_transactions 기록
        await supabase.from('credit_transactions').insert({
          user_id,
          amount: -requiredCredits,
          balance_after: newFreeCredits + newPaidCredits,
          type: 'usage',
          description: `콘텐츠 생성 ${platforms.length}개 플랫폼 (${platforms.join(', ')})`
        });
        
        // 6️⃣ usage_history 기록 (누적 사용량 추적)
        for (const platform of platforms) {
          const platformCost = COSTS[platform.toUpperCase()] || 0;
          const platformCredits = Math.ceil(platformCost * EXCHANGE_RATE);
          
          await supabase.from('usage_history').insert({
            user_id,
            content_type: platform,
            platform: platform,
            cost: platformCost,
            credits_used: platformCredits,
            content_title: `${brand || '콘텐츠'} - ${platform}`
          }).then(() => {
            console.log(`📊 usage_history 기록: ${platform} (${platformCredits} 크레딧)`);
          }).catch((err) => {
            console.error(`❌ usage_history 기록 실패 (${platform}):`, err);
          });
        }
        
      } catch (error: any) {
        console.error('❌ 크레딧 처리 중 오류:', error);
        return c.json({
          success: false,
          error: '크레딧 처리 오류',
          message: error.message || '크레딧 차감 중 문제가 발생했습니다.'
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
    
    // ✅ 커스텀 템플릿 처리 함수
    const getPromptForPlatform = (platform: string) => {
      // 1️⃣ 사용자 템플릿 우선 (customPrompt가 있고 유효한 경우)
      if (customPrompt && customPrompt.length > 100) {
        // ✅ 보안: 최대 8000자 제한 (프론트엔드와 동일)
        if (customPrompt.length > 8000) {
          console.warn(`⚠️ 사용자 템플릿이 너무 깁니다 (${customPrompt.length}자). 8000자로 자릅니다.`);
          const truncatedPrompt = customPrompt.substring(0, 8000);
          console.log(`  💾 사용자 템플릿 사용 (${platform}, 잘림): ${truncatedPrompt.substring(0, 50)}...`);
          return truncatedPrompt;
        }
        console.log(`  💾 사용자 템플릿 사용 (${platform}): ${customPrompt.substring(0, 50)}...`);
        return customPrompt;
      }
      
      // 2️⃣ 기본 템플릿 사용
      switch (platform) {
        case 'blog': return getBlogPrompt(promptParams);
        case 'instagram': return getInstagramPrompt(promptParams);
        case 'instagram_feed': return getInstagramFeedPrompt(promptParams);
        case 'threads': return getThreadsPrompt(promptParams);
        case 'youtube':
        case 'youtube_shorts': return getYouTubePrompt(promptParams);
        case 'youtube_longform': return getYoutubeLongformPrompt(promptParams);
        case 'shortform_multi': return getShortformPrompt(promptParams);
        case 'tiktok': return getTikTokPrompt(promptParams);
        case 'instagram_reels': return getInstagramReelsPrompt(promptParams);
        case 'twitter': return getTwitterPrompt(promptParams);
        case 'linkedin': return getLinkedInPrompt(promptParams);
        case 'kakaotalk': return getKakaoTalkPrompt(promptParams);
        case 'brunch': return getBrunchPrompt(promptParams);
        default: return getBlogPrompt(promptParams);
      }
    };

    // 블로그: GPT-4o 사용 (최고 품질 필요)
    if (platforms.includes('blog')) {
      console.log('  📝 블로그: GPT-4o (최고 품질)');
      generationTasks.push(
        generateContent(openai, 'blog', getPromptForPlatform('blog'), aiModel).then(result => {
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
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('instagram'))
            .then(content => {
              totalCost.gemini += 0.010; // 약 10원
              return { platform: 'instagram', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'instagram', getPromptForPlatform('instagram'), aiModel));
      }
    }
    
    // 인스타그램 피드: Gemini Flash
    if (platforms.includes('instagram_feed')) {
      if (geminiApiKey) {
        console.log('  📷 인스타그램 피드: Gemini Flash');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('instagram_feed'))
            .then(content => {
              totalCost.gemini += 0.010;
              return { platform: 'instagram_feed', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'instagram_feed', getPromptForPlatform('instagram_feed'), aiModel));
      }
    }

    // 스레드: Gemini Flash
    if (platforms.includes('threads')) {
      if (geminiApiKey) {
        console.log('  🧵 스레드: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('threads'))
            .then(content => {
              totalCost.gemini += 0.006; // 약 6원
              return { platform: 'threads', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'threads', getPromptForPlatform('threads'), aiModel));
      }
    }

    // 유튜브 쇼츠: Gemini Flash
    if (platforms.includes('youtube_shorts') || platforms.includes('youtube')) {
      if (geminiApiKey) {
        console.log('  🎬 유튜브 숏폼: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('youtube_shorts'))
            .then(content => {
              totalCost.gemini += 0.023; // 약 23원
              return { platform: 'youtube_shorts', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'youtube_shorts', getPromptForPlatform('youtube_shorts'), aiModel));
      }
    }
    
    // 유튜브 롱폼: Gemini Flash
    if (platforms.includes('youtube_longform')) {
      if (geminiApiKey) {
        console.log('  🎥 유튜브 롱폼: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('youtube_longform'))
            .then(content => {
              totalCost.gemini += 0.023;
              return { platform: 'youtube_longform', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'youtube_longform', getPromptForPlatform('youtube_longform'), aiModel));
      }
    }
    
    // 숏폼 멀티: Gemini Flash
    if (platforms.includes('shortform_multi')) {
      if (geminiApiKey) {
        console.log('  📱 숏폼 멀티: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('shortform_multi'))
            .then(content => {
              totalCost.gemini += 0.023;
              return { platform: 'shortform_multi', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'shortform_multi', getPromptForPlatform('shortform_multi'), aiModel));
      }
    }
    
    // 틱톡: Gemini Flash
    if (platforms.includes('tiktok')) {
      if (geminiApiKey) {
        console.log('  🎵 틱톡: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('tiktok'))
            .then(content => {
              totalCost.gemini += 0.023;
              return { platform: 'tiktok', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'tiktok', getPromptForPlatform('tiktok'), aiModel));
      }
    }
    
    // 인스타그램 릴스: Gemini Flash
    if (platforms.includes('instagram_reels')) {
      if (geminiApiKey) {
        console.log('  🎬 인스타그램 릴스: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('instagram_reels'))
            .then(content => {
              totalCost.gemini += 0.023;
              return { platform: 'instagram_reels', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'instagram_reels', getPromptForPlatform('instagram_reels'), aiModel));
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
    
    // ===================================
    // 신규 플랫폼: Twitter
    // ===================================
    if (platforms.includes('twitter')) {
      if (geminiApiKey) {
        console.log('  🐦 트위터: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('twitter'))
            .then(content => {
              totalCost.gemini += 0.006; // 짧은 글 = 저렴
              return { platform: 'twitter', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'twitter', getPromptForPlatform('twitter'), aiModel));
      }
    }
    
    // ===================================
    // 신규 플랫폼: LinkedIn
    // ===================================
    if (platforms.includes('linkedin')) {
      if (geminiApiKey) {
        console.log('  💼 LinkedIn: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('linkedin'))
            .then(content => {
              totalCost.gemini += 0.015; // 긴 글 = 약간 비쌈
              return { platform: 'linkedin', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'linkedin', getPromptForPlatform('linkedin'), aiModel));
      }
    }
    
    // ===================================
    // 신규 플랫폼: KakaoTalk
    // ===================================
    if (platforms.includes('kakaotalk')) {
      if (geminiApiKey) {
        console.log('  💬 카카오톡: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('kakaotalk'))
            .then(content => {
              totalCost.gemini += 0.008; // 짧은 글 = 저렴
              return { platform: 'kakaotalk', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'kakaotalk', getPromptForPlatform('kakaotalk'), aiModel));
      }
    }
    
    // ===================================
    // 신규 플랫폼: Brunch
    // ===================================
    if (platforms.includes('brunch')) {
      if (geminiApiKey) {
        console.log('  📖 브런치: Gemini Flash (70% 절감)');
        generationTasks.push(
          generateContentWithGemini(geminiApiKey, getPromptForPlatform('brunch'))
            .then(content => {
              totalCost.gemini += 0.020; // 긴 글 (2500-4000자) = 블로그와 유사
              return { platform: 'brunch', content };
            })
        );
      } else {
        generationTasks.push(generateContent(openai, 'brunch', getPromptForPlatform('brunch'), aiModel));
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

    // 🖼️ 이미지 자동 배치 (네이버 블로그 & 브런치)
    console.log('🖼️ 이미지 자동 배치 시작...');
    console.log(`📸 사용자 업로드 이미지: ${images.length}개`);
    
    // 🔥 사용자 업로드 이미지 우선 사용 (최대 10장)
    const smartImages = await fetchSmartImages({
      userImages: images.map((img: any) => ({
        base64: img.base64,
        filename: img.filename || `이미지${images.indexOf(img) + 1}`,
        size: img.size || 0
      })),
      keywords: keywords.split(',').map(k => k.trim()),
      requiredCount: Math.max(images.length, 3), // ✅ 사용자 이미지 개수 또는 최소 3개
      unsplashKey: c.env.UNSPLASH_ACCESS_KEY,
      pexelsKey: c.env.PEXELS_API_KEY,
      pixabayKey: c.env.PIXABAY_API_KEY,
      openaiKey: c.env.OPENAI_API_KEY,
      geminiKey: c.env.GEMINI_API_KEY
    });
    
    console.log(`✅ 이미지 ${smartImages.length}개 준비 완료 (사용자: ${images.length}개 + 무료 API: ${smartImages.length - images.length}개)`);

    // 결과를 객체로 변환 + 이미지 배치 적용
    const data: Record<string, string> = {};
    results.forEach(({ platform, content }) => {
      // 네이버 블로그: 이미지 배치 가이드 추가
      if (platform === 'blog' && smartImages.length > 0) {
        console.log('  📝 네이버 블로그에 이미지 배치 가이드 추가 중...');
        const contentWithGuide = injectImagesIntoBlogContent(content, smartImages);
        data[platform] = contentWithGuide;
        console.log(`  ✅ 네이버 블로그 이미지 가이드 ${smartImages.length}개 추가 완료`);
      }
      // 브런치: 이미지 배치 가이드 추가
      else if (platform === 'brunch' && smartImages.length > 0) {
        console.log('  📖 브런치에 이미지 배치 가이드 추가 중...');
        data[platform] = injectImagesIntoBrunchContent(content, smartImages);
        console.log(`  ✅ 브런치 이미지 가이드 ${smartImages.length}개 추가 완료`);
      }
      // 유튜브 롱폼: 썸네일 가이드 추가
      else if (platform === 'youtube_long' && smartImages.length > 0) {
        console.log('  🎬 유튜브 롱폼에 썸네일 가이드 추가 중...');
        data[platform] = injectYoutubeThumbnailGuide(content, smartImages, images.length);
        console.log(`  ✅ 유튜브 롱폼 썸네일 가이드 추가 완료`);
      }
      // 인스타그램: 이미지 메타데이터 추가 (기존 유지)
      else if ((platform === 'instagram' || platform === 'instagram_feed') && smartImages.length > 0) {
        console.log('  📸 인스타그램에 이미지 메타데이터 추가 중...');
        data[platform] = addInstagramImageMetadata(content, smartImages);
        console.log(`  ✅ 인스타그램 이미지 ${smartImages.length}개 메타데이터 추가 완료`);
      }
      // 기타 플랫폼: 원본 유지
      else {
        data[platform] = content;
      }
    });

    console.log('콘텐츠 생성 완료!');
    console.log(`💰 비용 추정: OpenAI $${totalCost.openai.toFixed(3)}, Gemini $${totalCost.gemini.toFixed(3)}, 총 $${(totalCost.openai + totalCost.gemini).toFixed(3)}`);

    // ✅ DB에 저장 (이미지 정보 포함)
    let savedGenerationId = null;
    let savedCreatedAt = new Date().toISOString();
    
    if (!is_guest && user_id) {
      try {
        console.log('💾 DB에 콘텐츠 저장 시작...');
        
        const { data: savedGeneration, error: saveError } = await supabase
          .from('generations')
          .insert({
            user_id: user_id,
            platforms: platforms,
            results: data,
            images: smartImages.length > 0 ? smartImages : null,  // ✅ 이미지 정보 저장
            brand: brand,
            keywords: keywords,
            tone: tone,
            target_age: targetAge,
            industry: industry || '',
            prompt_params: JSON.stringify(promptParams),
            publish_status: 'draft',
            created_at: savedCreatedAt
          })
          .select()
          .single();
        
        if (saveError) {
          console.error('❌ DB 저장 실패:', saveError);
          // DB 저장 실패해도 콘텐츠는 반환 (프론트에서 재시도 가능)
        } else {
          savedGenerationId = savedGeneration.id;
          savedCreatedAt = savedGeneration.created_at;
          console.log(`✅ DB 저장 완료: ID ${savedGenerationId}`);
        }
      } catch (dbError) {
        console.error('❌ DB 저장 예외:', dbError);
      }
    }

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
      id: savedGenerationId,  // ✅ DB 저장된 ID (프론트 중복 저장 방지)
      generation_id: savedGenerationId,  // ✅ 하위 호환
      created_at: savedCreatedAt,  // ✅ 생성 날짜
      data,
      generatedPlatforms: platforms,
      images: smartImages,  // ✅ 사용된 이미지 배열 (출처 정보 포함)
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

// 이메일 회원가입 엔드포인트 (NEW v7.3)
app.post('/api/auth/signup', async (c) => {
  try {
    console.log('📝 /api/auth/signup 요청 받음');
    
    const { email, password } = await c.req.json();
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    console.log('📧 회원가입 요청:', { email, ip });
    
    if (!email || !password) {
      return c.json({ 
        success: false, 
        error: '이메일과 비밀번호는 필수입니다' 
      }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 1️⃣ IP 차단 여부 확인
    const { data: blockedIP } = await supabase
      .from('ip_blocklist')
      .select('*')
      .eq('ip_address', ip)
      .gt('blocked_until', new Date().toISOString())
      .maybeSingle();
    
    if (blockedIP) {
      const blockedUntil = new Date(blockedIP.blocked_until);
      const hoursRemaining = Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60 * 60));
      
      console.warn('🚫 차단된 IP 접근:', { ip, blockedUntil });
      
      return c.json({ 
        success: false, 
        error: `이 IP는 24시간 동안 차단되었습니다. (남은 시간: ${hoursRemaining}시간)`,
        blocked_until: blockedIP.blocked_until
      }, 403);
    }
    
    // 2️⃣ 24시간 내 가입 수 확인 (3개 제한)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentSignups, error: signupError } = await supabase
      .from('ip_signup_tracking')
      .select('id, email')
      .eq('ip_address', ip)
      .gte('signup_at', oneDayAgo);
    
    if (signupError) {
      console.error('❌ IP 조회 실패:', signupError);
      return c.json({ 
        success: false, 
        error: 'IP 확인 중 오류가 발생했습니다' 
      }, 500);
    }
    
    const signupCount = recentSignups?.length || 0;
    const remainingSignups = Math.max(0, 3 - signupCount);
    
    console.log('📊 IP 가입 현황:', { ip, signupCount, remainingSignups });
    
    if (signupCount >= 3) {
      // 3개 초과 시 IP 차단
      const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      await supabase
        .from('ip_blocklist')
        .insert({
          ip_address: ip,
          blocked_until: blockedUntil,
          reason: '24시간 내 3개 계정 초과',
          signup_attempts: signupCount
        });
      
      console.warn('🚫 IP 차단 처리:', { ip, blockedUntil });
      
      return c.json({ 
        success: false, 
        error: '24시간 내 최대 3개 계정까지만 생성할 수 있습니다. IP가 24시간 동안 차단되었습니다.',
        blocked_until: blockedUntil
      }, 403);
    }
    
    // 3️⃣ 이메일 재가입 제한 확인 (Supabase 가입 전 사전 체크)
    const { data: restriction, error: restrictionError } = await supabase
      .from('email_restriction')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (restrictionError) {
      console.error('❌ 이메일 제한 조회 실패:', restrictionError);
    }
    
    if (restriction) {
      const now = new Date();
      const restrictionUntil = restriction.restriction_until ? new Date(restriction.restriction_until) : null;
      const deletionDate = restriction.last_deletion_at ? new Date(restriction.last_deletion_at).toISOString().split('T')[0] : 'Unknown';
      
      // 영구 차단
      if (restriction.is_permanently_banned) {
        console.warn('🚫 영구 차단된 이메일:', email);
        return c.json({ 
          success: false, 
          error: '이 이메일은 영구적으로 가입이 제한되어 있습니다. 고객센터에 문의해주세요.',
          error_code: 'ERR_PERMANENT_BAN'
        }, 403);
      }
      
      // 30일 재가입 제한
      if (restrictionUntil && restrictionUntil > now) {
        console.warn('⏰ 재가입 제한 중:', { email, restrictionUntil, deletionDate });
        return c.json({ 
          success: false, 
          error: `탈퇴한 계정은 30일 후 재가입이 가능합니다. (탈퇴일: ${deletionDate})`,
          error_code: 'ERR_REJOIN_LIMIT',
          restriction_until: restriction.restriction_until,
          deletion_date: deletionDate
        }, 400);
      }
    }
    
    // 4️⃣ Supabase Auth 회원가입
    console.log('🔐 Supabase 회원가입 시작:', email);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // 이메일 인증 필요
      user_metadata: {
        signup_method: 'email',
        ip_address: ip,
        user_agent: userAgent
      }
    });
    
    if (authError) {
      console.error('❌ Supabase 회원가입 실패:', authError);
      
      // NEW v7.5: DB 트리거 에러 파싱 (간단한 메시지)
      const errorMsg = authError.message || '';
      
      // 재가입 제한 - DB 메시지 그대로 전달
      if (errorMsg.includes('탈퇴한 계정은') || errorMsg.includes('30일 후 재가입')) {
        return c.json({ 
          success: false, 
          error: errorMsg, // DB 메시지 그대로 (탈퇴일 포함)
          error_code: 'ERR_REJOIN_LIMIT'
        }, 400);
      }
      
      // 영구 차단 (ERR_PERMANENT_BAN)
      if (errorMsg.includes('영구적으로 가입이 제한') || errorMsg.includes('ERR_PERMANENT_BAN')) {
        return c.json({ 
          success: false, 
          error: 'ERR_PERMANENT_BAN: 이 이메일은 가입이 제한되어 있습니다. 고객센터에 문의해주세요.',
          error_code: 'ERR_PERMANENT_BAN'
        }, 403);
      }
      
      // 이미 존재하는 이메일
      if (errorMsg.includes('already registered') || errorMsg.includes('이미 등록된')) {
        return c.json({ 
          success: false, 
          error: '이미 가입된 이메일입니다. 로그인해주세요.',
          error_code: 'EMAIL_EXISTS'
        }, 400);
      }
      
      // 기타 에러
      return c.json({ 
        success: false, 
        error: errorMsg || '회원가입 중 오류가 발생했습니다'
      }, 500);
    }
    
    const userId = authData.user?.id;
    
    console.log('✅ Supabase 회원가입 성공:', { userId, email });
    
    // 5️⃣ 이메일 인증 발송
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email
    });
    
    if (resendError) {
      console.error('❌ 인증 이메일 발송 실패:', resendError);
      // 회원가입은 성공했으므로 경고만 표시
    } else {
      console.log('📨 인증 이메일 발송 성공:', email);
    }
    
    // 6️⃣ ip_signup_tracking 기록
    const { error: trackingError } = await supabase
      .from('ip_signup_tracking')
      .insert({
        ip_address: ip,
        email,
        signup_at: new Date().toISOString(),
        user_agent: userAgent,
        is_verified: false
      });
    
    if (trackingError) {
      console.error('❌ IP 추적 기록 실패:', trackingError);
      // 회원가입은 성공했으므로 계속 진행
    }
    
    // 7️⃣ 성공 응답
    return c.json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.',
      user_id: userId,
      email,
      email_confirmation_required: true,
      remaining_signups: remainingSignups - 1
    });
    
  } catch (error: any) {
    console.error('❌ /api/auth/signup 오류:', error);
    return c.json({ 
      success: false, 
      error: error.message || '회원가입 중 오류가 발생했습니다' 
    }, 500);
  }
});

// ========================================
// 이메일 인증 콜백 (NEW v7.4)
// ========================================
app.get('/auth/callback', async (c) => {
  const code = c.req.query('code');
  const token_hash = c.req.query('token_hash');
  const type = c.req.query('type');
  
  console.log('🔐 Auth callback:', { code: !!code, token_hash: !!token_hash, type });

  if (!code && !token_hash) {
    return c.redirect('/?error=no_token');
  }

  // HTML 페이지 반환 (클라이언트에서 토큰 처리)
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>이메일 인증 처리 중...</title>
      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
      <link href="/static/styles.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen">
      <div class="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <div id="loading">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">✅ 이메일 인증 완료!</h2>
          <p class="text-gray-600">자동 로그인 중입니다...</p>
        </div>
        <div id="error" class="hidden">
          <h2 class="text-2xl font-bold text-red-600 mb-2">❌ 인증 실패</h2>
          <p class="text-gray-600 mb-4">이메일 인증에 실패했습니다.</p>
          <a href="/" class="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
            메인으로 돌아가기
          </a>
        </div>
      </div>
      
      <script>
        const SUPABASE_URL = '${c.env.SUPABASE_URL}';
        const SUPABASE_ANON_KEY = '${c.env.SUPABASE_ANON_KEY}';
        
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        async function processAuth() {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const tokenHash = urlParams.get('token_hash');
            const type = urlParams.get('type') || 'signup';
            
            console.log('🔐 Processing auth:', { code: !!code, tokenHash: !!tokenHash, type });
            
            if (code) {
              // PKCE 흐름 (OAuth - 카카오 로그인 포함)
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              
              console.log('✅ Session created via code exchange');
              
              // NEW v7.6: 카카오 로그인 DB 동기화
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const kakaoIdentity = user.identities?.find(
                  identity => identity.provider === 'kakao'
                );
                
                if (kakaoIdentity) {
                  console.log('🟡 Kakao login detected, syncing DB...');
                  
                  const kakaoId = kakaoIdentity.identity_data?.sub || kakaoIdentity.id;
                  const nickname = kakaoIdentity.identity_data?.nickname || user.user_metadata?.nickname || '카카오 사용자';
                  
                  // 백엔드 API 호출하여 DB 동기화
                  try {
                    const response = await fetch('/api/auth/sync-kakao', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        user_id: user.id,
                        kakao_id: kakaoId,
                        nickname: nickname
                      })
                    });
                    
                    const result = await response.json();
                    
                    if (!response.ok) {
                      console.error('❌ Kakao sync failed:', result.error);
                      if (result.error?.includes('재가입 제한')) {
                        alert('⚠️ ' + result.error);
                        window.location.href = '/';
                        return;
                      }
                    } else {
                      console.log('✅ Kakao login synced:', result);
                    }
                  } catch (syncError) {
                    console.error('❌ Failed to sync Kakao:', syncError);
                  }
                }
              }
            } else if (tokenHash) {
              // 이메일 인증 토큰
              const { data, error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: type
              });
              if (error) throw error;
              
              console.log('✅ Email verified via token');
            }
            
            // 성공 - 메인 페이지로 리디렉트
            setTimeout(() => {
              window.location.href = '/?welcome=true';
            }, 1500);
            
          } catch (error) {
            console.error('❌ Auth error:', error);
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('error').classList.remove('hidden');
          }
        }
        
        processAuth();
      </script>
    </body>
    </html>
  `);
});

// ========================================
// 회원 탈퇴 API (NEW v7.4)
// ========================================
app.post('/api/auth/delete-account', async (c) => {
  const { env } = c;

  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: '인증이 필요합니다' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    // Supabase Admin 클라이언트 생성
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false } }
    );

    // 사용자 클라이언트로 현재 사용자 확인
    const supabaseUser = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ User verification failed:', userError);
      return c.json({ success: false, error: '사용자 인증 실패' }, 401);
    }

    console.log('🗑️ Deleting user account:', user.id);

    // 1. DB 함수 호출 (user_credits, ip_signup_tracking, generations 삭제)
    const { data: deleteData, error: deleteError } = await supabaseAdmin
      .rpc('delete_user_account');

    if (deleteError) {
      console.error('❌ Failed to delete user data:', deleteError);
      return c.json({ success: false, error: 'DB 삭제 실패', details: deleteError.message }, 500);
    }

    console.log('✅ User data deleted from DB:', deleteData);

    // 2. auth.users 삭제 (Admin API)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (authDeleteError) {
      console.error('❌ Failed to delete auth user:', authDeleteError);
      return c.json({ success: false, error: '인증 사용자 삭제 실패', details: authDeleteError.message }, 500);
    }

    console.log('✅ Auth user deleted:', user.id);

    return c.json({
      success: true,
      message: '회원 탈퇴가 완료되었습니다',
      deleted: {
        user_id: user.id,
        email: user.email
      }
    });

  } catch (error: any) {
    console.error('❌ Unexpected error in delete-account:', error);
    return c.json({
      success: false,
      error: '예상치 못한 오류가 발생했습니다',
      details: error.message
    }, 500);
  }
});

// ========================================
// 카카오 로그인 DB 동기화 API (NEW v7.6)
// ========================================
app.post('/api/auth/sync-kakao', async (c) => {
  try {
    console.log('📝 /api/auth/sync-kakao 요청 받음');
    
    const { user_id, kakao_id, nickname } = await c.req.json();
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    
    console.log('🟡 카카오 로그인 동기화:', { user_id, kakao_id, nickname, ip });
    
    if (!user_id || !kakao_id) {
      return c.json({ 
        success: false, 
        error: 'user_id와 kakao_id는 필수입니다' 
      }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // sync_kakao_login DB 함수 호출
    const { data, error } = await supabase.rpc('sync_kakao_login', {
      p_user_id: user_id,
      p_kakao_id: kakao_id,
      p_nickname: nickname || '카카오 사용자',
      p_ip_address: ip.split(',')[0].trim()
    });
    
    if (error) {
      console.error('❌ sync_kakao_login 실패:', error);
      
      // 재가입 제한 에러
      if (error.message?.includes('재가입 제한')) {
        return c.json({ 
          success: false, 
          error: error.message,
          error_code: 'ERR_REJOIN_LIMIT'
        }, 403);
      }
      
      return c.json({ 
        success: false, 
        error: error.message || '카카오 로그인 동기화 실패' 
      }, 500);
    }
    
    console.log('✅ 카카오 로그인 동기화 완료:', data);
    
    return c.json({
      success: true,
      message: '카카오 로그인이 완료되었습니다',
      data: data
    });
    
  } catch (error: any) {
    console.error('❌ /api/auth/sync-kakao 오류:', error);
    return c.json({ 
      success: false, 
      error: error.message || '카카오 로그인 처리 중 오류가 발생했습니다' 
    }, 500);
  }
});

// 사용자 동기화 엔드포인트 (하이브리드 플랜)
app.post('/api/auth/sync', async (c) => {
  try {
    console.log('🔄 /api/auth/sync 요청 받음');
    
    // 🔥 환경 변수 확인 로그 추가
    console.log('🔐 환경 변수 상태:', {
      hasUrl: !!c.env.SUPABASE_URL,
      hasServiceKey: !!c.env.SUPABASE_SERVICE_KEY,
      urlPreview: c.env.SUPABASE_URL?.substring(0, 40) + '...',
      envKeys: Object.keys(c.env || {})
    });
    
    if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_KEY) {
      const errorMsg = 'Supabase 환경 변수가 설정되지 않았습니다';
      console.error('❌', errorMsg, {
        SUPABASE_URL: c.env.SUPABASE_URL,
        SUPABASE_SERVICE_KEY: c.env.SUPABASE_SERVICE_KEY ? '[SET]' : '[MISSING]'
      });
      return c.json({ 
        success: false,
        error: errorMsg,
        hint: '환경 변수를 확인하세요'
      }, 500);
    }
    
    const body = await c.req.json();
    const { user_id, email, name } = body;
    
    console.log('📝 요청 데이터:', { user_id, email, name });
    
    if (!user_id || !email) {
      console.error('❌ user_id 또는 email 누락:', { user_id, email });
      return c.json({ success: false, error: 'user_id와 email은 필수입니다' }, 400);
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
      
      // 💰 월간 무료 크레딧 리셋 (가입일 기준 개인별 리셋)
      // 예: 1월 15일 가입 → 매월 15일마다 30크레딧 지급
      const today = new Date(todayString + 'T00:00:00Z');
      const signupDate = new Date(existingUser.created_at);
      const lastReset = existingUser.last_reset_date 
        ? new Date(existingUser.last_reset_date + 'T00:00:00Z')
        : new Date('1970-01-01T00:00:00Z');
      
      // 가입일의 "일" 추출 (예: 15일)
      const resetDay = signupDate.getDate();
      
      // 현재 월의 마지막 날 계산 (2월 28일 등 처리)
      const lastDayOfCurrentMonth = new Date(
        today.getFullYear(), 
        today.getMonth() + 1, 
        0
      ).getDate();
      
      // 실제 리셋일 (월말 가입자 고려)
      const actualResetDay = Math.min(resetDay, lastDayOfCurrentMonth);
      
      // 이번 달의 리셋 기준일 계산
      let currentMonthResetDate = new Date(
        today.getFullYear(), 
        today.getMonth(), 
        actualResetDay
      );
      
      // 오늘이 이번 달 리셋일보다 이전이라면, 지난 달이 기준
      if (today < currentMonthResetDate) {
        currentMonthResetDate = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          actualResetDay
        );
        
        // 지난 달 마지막 날 다시 계산
        const lastDayOfPrevMonth = new Date(
          currentMonthResetDate.getFullYear(),
          currentMonthResetDate.getMonth() + 1,
          0
        ).getDate();
        
        const prevMonthActualDay = Math.min(resetDay, lastDayOfPrevMonth);
        currentMonthResetDate.setDate(prevMonthActualDay);
      }
      
      // 리셋 조건: 마지막 리셋이 이번 주기보다 이전인가?
      const needsReset = lastReset < currentMonthResetDate;
      
      console.log('🔍 월간 무료 크레딧 리셋 확인 (가입일 기준):', {
        signup_date: existingUser.created_at,
        reset_day: resetDay,
        actual_reset_day: actualResetDay,
        calculated_reset_date: currentMonthResetDate.toISOString().split('T')[0],
        last_reset_date: existingUser.last_reset_date,
        today: todayString,
        free_credits: existingUser.free_credits,
        paid_credits: existingUser.paid_credits,
        needsReset,
        계산로직: `매월 ${actualResetDay}일 기준 (가입일 앵커 고정)`
      });
      
      if (needsReset) {
        const calculatedResetDate = currentMonthResetDate.toISOString().split('T')[0];
        
        console.log('📅 가입일 기준 월간 무료 크레딧 리셋 실행!', { 
          signupDate: existingUser.created_at,
          resetDay: resetDay,
          actualResetDay: actualResetDay,
          oldResetDate: existingUser.last_reset_date,
          newResetDate: calculatedResetDate, // ⚠️ 계산된 날짜 (오늘 아님!)
          today: todayString,
          oldFreeCredits: existingUser.free_credits,
          newFreeCredits: 30,
          paidCredits: existingUser.paid_credits + ' (유지)',
          설명: `매월 ${actualResetDay}일 기준 앵커 고정`
        });
        
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            email,
            name: name || existingUser.name,
            free_credits: 30, // ✅ 무료 크레딧만 리셋
            // paid_credits는 절대 건드리지 않음!
            last_reset_date: calculatedResetDate, // ✅ 계산된 리셋 기준일로 저장 (앵커 고정!)
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
        free_credits: 30,
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
          free_credits: 30, // ✅ 월간 무료 크레딧
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
    console.error('❌❌❌ /api/auth/sync 치명적 오류 발생! ❌❌❌');
    console.error('🔍 에러 타입:', error.constructor.name);
    console.error('🔍 에러 메시지:', error.message);
    console.error('🔍 에러 코드:', error.code);
    console.error('🔍 에러 힌트:', error.hint);
    console.error('🔍 에러 상세:', error.details);
    console.error('🔍 전체 에러 객체:', JSON.stringify(error, null, 2));
    console.error('🔍 스택 트레이스:', error.stack);
    
    return c.json(
      { 
        success: false,
        error: error.message || '사용자 동기화 중 오류가 발생했습니다',
        errorType: error.constructor.name,
        errorCode: error.code,
        errorHint: error.hint, 
        details: error.message,
        hint: '환경 변수 또는 DB 연결을 확인하세요',
        code: error.code
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
    const { 
      user_id, 
      name,
      gender, 
      birth_date,
      phone, 
      terms_agreed,
      privacy_agreed,
      collection_agreed,
      personal_info_agreed,
      age_14_confirmed,
      marketing_agreed,
      custom_info_agreed
    } = await c.req.json();
    
    // 입력값 검증
    if (!user_id || !name || !gender || !birth_date || !phone) {
      return c.json({ 
        success: false, 
        error: '필수 정보(이름, 성별, 생년월일, 연락처)를 모두 입력해주세요' 
      }, 400);
    }
    
    // 필수 약관 동의 확인
    if (!terms_agreed || !privacy_agreed || !collection_agreed || !personal_info_agreed || !age_14_confirmed) {
      return c.json({ 
        success: false, 
        error: '필수 약관에 모두 동의해주세요' 
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
    
    // 만 14세 이상 확인
    const birthYear = new Date(birth_date).getFullYear();
    const currentYear = new Date().getFullYear();
    if (currentYear - birthYear < 14) {
      return c.json({ 
        success: false, 
        error: '만 14세 이상만 가입 가능합니다' 
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
        name: name,
        gender: gender,
        birth_date: birth_date,
        phone: phone,
        terms_agreed: terms_agreed,
        privacy_agreed: privacy_agreed,
        collection_agreed: collection_agreed || false,
        personal_info_agreed: personal_info_agreed || false,
        age_14_confirmed: age_14_confirmed || false,
        marketing_agreed: marketing_agreed || false,
        custom_info_agreed: custom_info_agreed || false,
        registration_completed: true,
        registration_completed_at: new Date().toISOString(),
        terms_agreed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select('id, email, name, gender, birth_date, phone, tier, free_credits, paid_credits, registration_completed')
      .single();
    
    if (error) {
      console.error('❌ 회원가입 완료 처리 실패:', error);
      throw error;
    }
    
    console.log(`✅ 회원가입 완료: ${updatedUser.email} (이름: ${name}, 연락처: ${phone})`);
    
    return c.json({
      success: true,
      message: '회원가입이 완료되었습니다',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        gender: updatedUser.gender,
        birth_date: updatedUser.birth_date,
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

// ===================================
// 워크플로우 API (SNS 바로가기 + AI 워크플로우)
// ===================================

// 1️⃣ 프로필별 워크플로우 조회
app.get('/api/profiles/:profileId/workflows', async (c) => {
  try {
    const profileId = c.req.param('profileId');
    const category = c.req.query('category'); // 'sns' 또는 'ai_tool'
    
    // 입력값 검증
    if (!profileId) {
      return c.json({ 
        success: false, 
        error: 'profileId는 필수입니다' 
      }, 400);
    }
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '인증이 필요합니다' 
      }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 토큰입니다' 
      }, 401);
    }
    
    // 프로필 소유권 확인
    console.log('🔍 프로필 조회 시도:', { profileId, userId: user.id });
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, profile_name')
      .eq('id', profileId)
      .eq('user_id', user.id)
      .single();
    
    console.log('🔍 프로필 조회 결과:', { profile, profileError });
    
    if (profileError || !profile) {
      console.error('❌ 프로필을 찾을 수 없음:', { profileId, userId: user.id, profileError });
      return c.json({ 
        success: false, 
        error: '프로필을 찾을 수 없거나 접근 권한이 없습니다',
        debug: {
          profileId,
          userId: user.id,
          error: profileError?.message || '프로필 없음'
        }
      }, 404);
    }
    
    // 워크플로우 조회 쿼리 작성
    let query = supabase
      .from('profile_workflows')
      .select(`
        id,
        is_enabled,
        created_at,
        workflow:user_workflows (
          id,
          category,
          name,
          url,
          icon,
          description,
          is_favorite,
          sort_order,
          created_at,
          updated_at
        )
      `)
      .eq('profile_id', profileId)
      .eq('user_id', user.id);
    
    // category 파라미터가 있으면 필터링
    if (category) {
      // user_workflows.category 필터링은 직접 불가능하므로, 데이터 받은 후 필터링
      const { data: allWorkflows, error: workflowError } = await query;
      
      if (workflowError) {
        console.error('❌ 워크플로우 조회 실패:', workflowError);
        throw workflowError;
      }
      
      // category로 필터링
      const filteredWorkflows = allWorkflows
        ?.filter((pw: any) => pw.workflow?.category === category)
        .map((pw: any) => ({
          id: pw.workflow.id,
          category: pw.workflow.category,
          name: pw.workflow.name,
          url: pw.workflow.url,
          icon: pw.workflow.icon,
          description: pw.workflow.description,
          is_favorite: pw.workflow.is_favorite,
          is_enabled: pw.is_enabled,
          sort_order: pw.workflow.sort_order,
          created_at: pw.workflow.created_at,
          updated_at: pw.workflow.updated_at
        }))
        .sort((a: any, b: any) => a.sort_order - b.sort_order);
      
      console.log(`✅ 워크플로우 조회 완료: ${profile.profile_name} (${category}) - ${filteredWorkflows?.length || 0}개`);
      
      return c.json({
        success: true,
        profile: {
          id: profile.id,
          name: profile.profile_name
        },
        workflows: filteredWorkflows || [],
        total: filteredWorkflows?.length || 0
      });
    }
    
    // category 파라미터가 없으면 전체 조회
    const { data: allWorkflows, error: workflowError } = await query;
    
    if (workflowError) {
      console.error('❌ 워크플로우 조회 실패:', workflowError);
      throw workflowError;
    }
    
    const workflows = allWorkflows
      ?.map((pw: any) => ({
        id: pw.workflow.id,
        category: pw.workflow.category,
        name: pw.workflow.name,
        url: pw.workflow.url,
        icon: pw.workflow.icon,
        description: pw.workflow.description,
        is_favorite: pw.workflow.is_favorite,
        is_enabled: pw.is_enabled,
        sort_order: pw.workflow.sort_order,
        created_at: pw.workflow.created_at,
        updated_at: pw.workflow.updated_at
      }))
      .sort((a: any, b: any) => a.sort_order - b.sort_order);
    
    console.log(`✅ 워크플로우 전체 조회 완료: ${profile.profile_name} - ${workflows?.length || 0}개`);
    
    return c.json({
      success: true,
      profile: {
        id: profile.id,
        name: profile.profile_name
      },
      workflows: workflows || [],
      total: workflows?.length || 0
    });
    
  } catch (error: any) {
    console.error('❌ 워크플로우 조회 예외:', error);
    return c.json({ 
      success: false, 
      error: error.message || '워크플로우 조회 중 오류가 발생했습니다'
    }, 500);
  }
});

// 1️⃣-2 계정별 워크플로우 조회 (프로필 없이)
app.get('/api/workflows', async (c) => {
  try {
    const userId = c.req.query('user_id');
    const category = c.req.query('category'); // 'sns' 또는 'ai_tool'
    
    // 입력값 검증
    if (!userId) {
      return c.json({ 
        success: false, 
        error: 'user_id는 필수입니다' 
      }, 400);
    }
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '인증이 필요합니다' 
      }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Supabase Admin 클라이언트 생성
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 토큰입니다' 
      }, 401);
    }
    
    // 본인 데이터만 조회 가능
    if (user.id !== userId) {
      return c.json({ 
        success: false, 
        error: '본인의 데이터만 조회할 수 있습니다' 
      }, 403);
    }
    
    console.log('📡 계정별 워크플로우 조회:', { userId, category });
    
    // user_workflows에서 직접 조회
    let query = supabase
      .from('user_workflows')
      .select('*')
      .eq('user_id', userId);
    
    // category 필터링
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: workflows, error: workflowError } = await query
      .order('sort_order', { ascending: true });
    
    if (workflowError) {
      console.error('❌ 워크플로우 조회 실패:', workflowError);
      throw workflowError;
    }
    
    console.log(`✅ 계정별 워크플로우 조회 완료: ${workflows?.length || 0}개`);
    
    return c.json({
      success: true,
      workflows: workflows || [],
      count: workflows?.length || 0
    });
    
  } catch (error: any) {
    console.error('❌ 계정별 워크플로우 조회 예외:', error);
    return c.json({ 
      success: false, 
      error: error.message || '워크플로우 조회 중 오류가 발생했습니다'
    }, 500);
  }
});

// 2️⃣ 워크플로우 생성
app.post('/api/workflows', async (c) => {
  try {
    const { 
      user_id,  // profile_id 대신 user_id 사용
      category, 
      name, 
      url, 
      icon, 
      description, 
      is_favorite 
    } = await c.req.json();
    
    // 입력값 검증
    if (!user_id || !category || !name) {
      return c.json({ 
        success: false, 
        error: '필수 정보(user_id, category, name)를 모두 입력해주세요' 
      }, 400);
    }
    
    // category 검증
    const validCategories = ['sns', 'ai_tool', 'analytics', 'productivity', 'other'];
    if (!validCategories.includes(category)) {
      return c.json({ 
        success: false, 
        error: `유효하지 않은 category입니다. (${validCategories.join(', ')})` 
      }, 400);
    }
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '인증이 필요합니다' 
      }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 토큰입니다' 
      }, 401);
    }
    
    // 본인 데이터만 생성 가능
    if (user.id !== user_id) {
      return c.json({ 
        success: false, 
        error: '본인의 데이터만 생성할 수 있습니다' 
      }, 403);
    }
    
    console.log('📝 워크플로우 생성:', { user_id, category, name });
    
    // user_workflows 테이블에 워크플로우 생성 (profile_workflows 매핑 제거)
    const { data: newWorkflow, error: workflowError } = await supabase
      .from('user_workflows')
      .insert({
        user_id: user_id,
        category: category,
        name: name,
        url: url || null,
        icon: icon || null,
        description: description || null,
        is_favorite: is_favorite || false,
        sort_order: 0
      })
      .select()
      .single();
    
    if (workflowError) {
      console.error('❌ 워크플로우 생성 실패:', workflowError);
      throw workflowError;
    }
    
    console.log(`✅ 워크플로우 생성 완료: ${name} (${category})`);
    
    return c.json({
      success: true,
      message: '워크플로우가 생성되었습니다',
      workflow: {
        id: newWorkflow.id,
        category: newWorkflow.category,
        name: newWorkflow.name,
        url: newWorkflow.url,
        icon: newWorkflow.icon,
        description: newWorkflow.description,
        is_favorite: newWorkflow.is_favorite,
        sort_order: newWorkflow.sort_order,
        created_at: newWorkflow.created_at,
        updated_at: newWorkflow.updated_at
      }
    });
    
  } catch (error: any) {
    console.error('❌ 워크플로우 생성 예외:', error);
    return c.json({ 
      success: false, 
      error: error.message || '워크플로우 생성 중 오류가 발생했습니다'
    }, 500);
  }
});

// 3️⃣ 워크플로우 수정
app.put('/api/workflows/:workflowId', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    const { name, url, icon, description, is_favorite, sort_order } = await c.req.json();
    
    if (!workflowId) {
      return c.json({ 
        success: false, 
        error: 'workflowId는 필수입니다' 
      }, 400);
    }
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '인증이 필요합니다' 
      }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 토큰입니다' 
      }, 401);
    }
    
    // 워크플로우 소유권 확인
    const { data: workflow, error: checkError } = await supabase
      .from('user_workflows')
      .select('id, user_id, name')
      .eq('id', workflowId)
      .eq('user_id', user.id)
      .single();
    
    if (checkError || !workflow) {
      return c.json({ 
        success: false, 
        error: '워크플로우를 찾을 수 없거나 접근 권한이 없습니다' 
      }, 404);
    }
    
    // 수정할 데이터 준비
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (icon !== undefined) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    
    // 워크플로우 수정
    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('user_workflows')
      .update(updateData)
      .eq('id', workflowId)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ 워크플로우 수정 실패:', updateError);
      throw updateError;
    }
    
    console.log(`✅ 워크플로우 수정 완료: ${updatedWorkflow.name}`);
    
    return c.json({
      success: true,
      message: '워크플로우가 수정되었습니다',
      workflow: updatedWorkflow
    });
    
  } catch (error: any) {
    console.error('❌ 워크플로우 수정 예외:', error);
    return c.json({ 
      success: false, 
      error: error.message || '워크플로우 수정 중 오류가 발생했습니다'
    }, 500);
  }
});

// 4️⃣ 워크플로우 삭제
app.delete('/api/workflows/:workflowId', async (c) => {
  try {
    const workflowId = c.req.param('workflowId');
    
    if (!workflowId) {
      return c.json({ 
        success: false, 
        error: 'workflowId는 필수입니다' 
      }, 400);
    }
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: '인증이 필요합니다' 
      }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return c.json({ 
        success: false, 
        error: '유효하지 않은 토큰입니다' 
      }, 401);
    }
    
    // 워크플로우 소유권 확인
    const { data: workflow, error: checkError } = await supabase
      .from('user_workflows')
      .select('id, user_id, name')
      .eq('id', workflowId)
      .eq('user_id', user.id)
      .single();
    
    if (checkError || !workflow) {
      return c.json({ 
        success: false, 
        error: '워크플로우를 찾을 수 없거나 접근 권한이 없습니다' 
      }, 404);
    }
    
    // 1단계: profile_workflows에서 매핑 삭제
    const { error: mappingDeleteError } = await supabase
      .from('profile_workflows')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('user_id', user.id);
    
    if (mappingDeleteError) {
      console.error('❌ 프로필 워크플로우 매핑 삭제 실패:', mappingDeleteError);
      throw mappingDeleteError;
    }
    
    // 2단계: user_workflows에서 워크플로우 삭제
    const { error: deleteError } = await supabase
      .from('user_workflows')
      .delete()
      .eq('id', workflowId)
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error('❌ 워크플로우 삭제 실패:', deleteError);
      throw deleteError;
    }
    
    console.log(`✅ 워크플로우 삭제 완료: ${workflow.name}`);
    
    return c.json({
      success: true,
      message: '워크플로우가 삭제되었습니다'
    });
    
  } catch (error: any) {
    console.error('❌ 워크플로우 삭제 예외:', error);
    return c.json({ 
      success: false, 
      error: error.message || '워크플로우 삭제 중 오류가 발생했습니다'
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

// ==================== 🆕 Profiles API (다중 프로필 관리) ====================

// 1️⃣ GET /api/profiles - 사용자의 모든 프로필 조회
app.get('/api/profiles', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    if (!user_id) {
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    console.log('📋 프로필 목록 조회:', user_id);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // RLS 정책에 의해 자동으로 본인 프로필만 조회됨
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ 프로필 목록 조회 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`✅ 프로필 목록 조회 완료: ${profiles?.length || 0}개`);
    
    return c.json({
      success: true,
      profiles: profiles || [],
      count: profiles?.length || 0
    });
  } catch (error: any) {
    console.error('❌ 프로필 목록 조회 예외:', error);
    return c.json({ error: '프로필 목록 조회 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// 2️⃣ POST /api/profiles - 새 프로필 생성
app.post('/api/profiles', async (c) => {
  try {
    console.log('💾 /api/profiles 생성 요청');
    
    const body = await c.req.json();
    const { 
      user_id, 
      profile_name,
      brand, 
      company_name, 
      business_type, 
      location, 
      target_gender, 
      contact, 
      website, 
      sns, 
      keywords, 
      tone, 
      target_age, 
      industry 
    } = body;
    
    if (!user_id) {
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    if (!profile_name) {
      return c.json({ error: 'profile_name은 필수입니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // UUID 생성
    const profileId = crypto.randomUUID();
    
    // profiles 테이블에 새 프로필 생성
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        user_id,
        profile_name,
        brand: brand || company_name,
        company_name,
        business_type,
        location,
        target_gender,
        contact,
        website,
        sns,
        keywords, // ✅ brand_keywords → keywords 변경
        tone,
        target_age,
        industry,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ 프로필 생성 실패:', insertError);
      
      // UNIQUE 제약 위반 (중복 프로필명)
      if (insertError.code === '23505') {
        return c.json({ success: false, error: '이미 존재하는 프로필 이름입니다' }, 409);
      }
      
      return c.json({ success: false, error: insertError.message }, 500);
    }
    
    console.log('✅ 프로필 생성 완료:', newProfile.profile_name);
    
    return c.json({
      success: true,
      profile: newProfile
    });
  } catch (error: any) {
    console.error('❌ 프로필 생성 예외:', error);
    return c.json({ error: '프로필 생성 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// 3️⃣ PUT /api/profiles/:id - 프로필 수정
app.put('/api/profiles/:id', async (c) => {
  try {
    const profileId = c.req.param('id');
    console.log('✏️ /api/profiles/:id 수정 요청:', profileId);
    
    const body = await c.req.json();
    const { 
      user_id,
      profile_name,
      brand, 
      company_name, 
      business_type, 
      location, 
      target_gender, 
      contact, 
      website, 
      sns, 
      keywords, 
      tone, 
      target_age, 
      industry 
    } = body;
    
    if (!user_id) {
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // RLS 정책에 의해 본인 프로필만 수정 가능
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        profile_name,
        brand: brand || company_name,
        company_name,
        business_type,
        location,
        target_gender,
        contact,
        website,
        sns,
        keywords, // ✅ brand_keywords → keywords 변경
        tone,
        target_age,
        industry,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .eq('user_id', user_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ 프로필 수정 실패:', updateError);
      
      // UNIQUE 제약 위반 (중복 프로필명)
      if (updateError.code === '23505') {
        return c.json({ success: false, error: '이미 존재하는 프로필 이름입니다' }, 409);
      }
      
      return c.json({ success: false, error: updateError.message }, 500);
    }
    
    if (!updatedProfile) {
      return c.json({ success: false, error: '프로필을 찾을 수 없거나 권한이 없습니다' }, 404);
    }
    
    console.log('✅ 프로필 수정 완료:', updatedProfile.profile_name);
    
    return c.json({
      success: true,
      profile: updatedProfile
    });
  } catch (error: any) {
    console.error('❌ 프로필 수정 예외:', error);
    return c.json({ error: '프로필 수정 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// 4️⃣ DELETE /api/profiles/:id - 프로필 삭제
app.delete('/api/profiles/:id', async (c) => {
  try {
    const profileId = c.req.param('id');
    const user_id = c.req.query('user_id');
    
    if (!user_id) {
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    console.log('🗑️ /api/profiles/:id 삭제 요청:', profileId);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // RLS 정책에 의해 본인 프로필만 삭제 가능
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId)
      .eq('user_id', user_id);
    
    if (deleteError) {
      console.error('❌ 프로필 삭제 실패:', deleteError);
      return c.json({ success: false, error: deleteError.message }, 500);
    }
    
    console.log('✅ 프로필 삭제 완료:', profileId);
    
    return c.json({
      success: true,
      message: '프로필이 삭제되었습니다'
    });
  } catch (error: any) {
    console.error('❌ 프로필 삭제 예외:', error);
    return c.json({ error: '프로필 삭제 중 오류가 발생했습니다', details: error.message }, 500);
  }
});
// ==================== Phase 1: SNS Links & AI Tools API ====================

// GET /api/profile/sns-links - SNS 링크 조회
app.get('/api/profile/sns-links', async (c) => {
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
      .select('my_sns_links')
      .eq('id', user_id)
      .single();
    
    if (error) {
      console.error('❌ SNS 링크 조회 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({
      success: true,
      sns_links: user.my_sns_links || {}
    });
  } catch (error: any) {
    console.error('❌ SNS 링크 조회 예외:', error);
    return c.json({ error: 'SNS 링크 조회 중 오류가 발생했습니다' }, 500);
  }
});

// POST /api/profile/sns-links - SNS 링크 저장
app.post('/api/profile/sns-links', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, sns_links } = body;
    
    if (!user_id) {
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data, error } = await supabase
      .from('users')
      .update({ my_sns_links: sns_links || {} })
      .eq('id', user_id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ SNS 링크 저장 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log('✅ SNS 링크 저장 완료:', user_id);
    
    return c.json({
      success: true,
      sns_links: data.my_sns_links
    });
  } catch (error: any) {
    console.error('❌ SNS 링크 저장 예외:', error);
    return c.json({ error: 'SNS 링크 저장 중 오류가 발생했습니다' }, 500);
  }
});

// GET /api/profile/ai-tools - AI 도구 설정 조회
app.get('/api/profile/ai-tools', async (c) => {
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
      .select('my_ai_tools')
      .eq('id', user_id)
      .single();
    
    if (error) {
      console.error('❌ AI 도구 설정 조회 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({
      success: true,
      ai_tools: user.my_ai_tools || {}
    });
  } catch (error: any) {
    console.error('❌ AI 도구 설정 조회 예외:', error);
    return c.json({ error: 'AI 도구 설정 조회 중 오류가 발생했습니다' }, 500);
  }
});

// POST /api/profile/ai-tools - AI 도구 설정 저장
app.post('/api/profile/ai-tools', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, ai_tools } = body;
    
    if (!user_id) {
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data, error } = await supabase
      .from('users')
      .update({ my_ai_tools: ai_tools || {} })
      .eq('id', user_id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ AI 도구 설정 저장 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log('✅ AI 도구 설정 저장 완료:', user_id);
    
    return c.json({
      success: true,
      ai_tools: data.my_ai_tools
    });
  } catch (error: any) {
    console.error('❌ AI 도구 설정 저장 예외:', error);
    return c.json({ error: 'AI 도구 설정 저장 중 오류가 발생했습니다' }, 500);
  }
});

// ==================== 히스토리 API ====================

// ========================================
// 🎯 대시보드 통계 API
// ========================================
app.get('/api/dashboard/stats', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    if (!user_id) {
      console.error('❌ [대시보드] user_id 누락');
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    console.log('📊 [대시보드] 통계 조회:', user_id);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 사용자 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();
    
    if (userError) {
      console.error('❌ [대시보드] 사용자 조회 실패:', userError);
      return c.json({ success: false, error: userError.message }, 500);
    }
    
    // 전체 생성 횟수 조회
    const { count: totalCount, error: totalError } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);
    
    if (totalError) {
      console.error('❌ [대시보드] 전체 생성 횟수 조회 실패:', totalError);
    }
    
    // 이번 달 생성 횟수 조회
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: monthlyCount, error: monthlyError } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', startOfMonth.toISOString());
    
    if (monthlyError) {
      console.error('❌ [대시보드] 월별 생성 횟수 조회 실패:', monthlyError);
    }
    
    // 최근 콘텐츠 조회
    const { data: recentContent, error: recentError } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error('❌ [대시보드] 최근 콘텐츠 조회 실패:', recentError);
    }
    
    console.log('✅ [대시보드] 통계 조회 완료');
    
    // user_stats 테이블에서 youtube_analysis_count 조회
    const { data: userStats, error: statsError } = await supabase
      .from('user_stats')
      .select('youtube_analysis_count')
      .eq('user_id', user_id)
      .single();
    
    if (statsError) {
      console.error('❌ [대시보드] user_stats 조회 실패:', statsError);
    }
    
    const youtubeAnalysisCount = userStats?.youtube_analysis_count || 0;
    
    return c.json({
      success: true,
      user: {
        name: userData.name,
        email: userData.email,
        free_credits: userData.free_credits || 0,
        paid_credits: userData.paid_credits || 0,
        tier: (userData.paid_credits || 0) > 0 ? 'paid' : 'free'
      },
      stats: {
        total_generations: totalCount || 0,
        monthly_generations: monthlyCount || 0,
        postflow_count: totalCount || 0,
        youtube_analysis_count: youtubeAnalysisCount
      },
      recent_content: recentContent || []
    });
  } catch (error: any) {
    console.error('❌ [대시보드] 통계 조회 예외:', error);
    return c.json({ error: '대시보드 통계 조회 중 오류가 발생했습니다', details: error.message }, 500);
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
    const { 
      user_id, 
      brand, 
      keywords, 
      results, 
      platforms,
      workflow_data,      // Phase 1: 워크플로우 정보
      platform_contents,  // Phase 1: 플랫폼별 콘텐츠
      used_images         // Phase 1: 사용된 이미지
    } = body;
    
    if (!user_id) {
      console.error('❌ user_id 누락');
      return c.json({ error: 'user_id는 필수입니다' }, 400);
    }
    
    console.log('💾 히스토리 저장:', user_id);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 🔥 generations 테이블에 저장 (Phase 1 필드 포함)
    const { data: newHistory, error: insertError } = await supabase
      .from('generations')
      .insert({
        user_id,
        brand: brand || '',
        keywords: Array.isArray(keywords) ? keywords : [],
        results: results || {},
        platforms: Array.isArray(platforms) ? platforms : [],
        workflow_data: workflow_data || {},          // Phase 1
        platform_contents: platform_contents || {},  // Phase 1
        used_images: used_images || [],              // Phase 1
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

// ✅ 히스토리 업데이트 (콘텐츠 수정)
app.patch('/api/history', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, generation_id, platform, content } = body;
    
    if (!user_id || !generation_id || !platform || !content) {
      console.error('❌ 필수 파라미터 누락:', body);
      return c.json({ error: '필수 파라미터가 누락되었습니다' }, 400);
    }
    
    console.log('📝 히스토리 업데이트:', { generation_id, platform, user_id });
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 기존 데이터 조회
    const { data: existing, error: fetchError } = await supabase
      .from('generations')
      .select('results')
      .eq('id', generation_id)
      .eq('user_id', user_id)
      .single();
    
    if (fetchError || !existing) {
      console.error('❌ 히스토리 조회 실패:', fetchError);
      return c.json({ success: false, error: '히스토리를 찾을 수 없습니다' }, 404);
    }
    
    // results 업데이트
    const updatedResults = {
      ...existing.results,
      [platform]: content
    };
    
    // DB 업데이트
    const { error: updateError } = await supabase
      .from('generations')
      .update({ results: updatedResults })
      .eq('id', generation_id)
      .eq('user_id', user_id);
    
    if (updateError) {
      console.error('❌ 히스토리 업데이트 실패:', updateError);
      return c.json({ success: false, error: updateError.message }, 500);
    }
    
    console.log('✅ 히스토리 업데이트 완료:', generation_id);
    
    return c.json({
      success: true,
      generation_id,
      platform,
      message: '콘텐츠가 업데이트되었습니다'
    });
  } catch (error: any) {
    console.error('❌ 히스토리 업데이트 예외:', error);
    return c.json({ error: '히스토리 업데이트 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// 비회원 랜딩 페이지
app.get('/', (c) => {
  return c.html(landingPageTemplate);
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
// 크레딧 조회 API (탭 활성화 시 동기화용)
// ===================================
app.get('/api/users/:user_id/credits', async (c) => {
  try {
    const user_id = c.req.param('user_id');
    
    if (!user_id) {
      return c.json({
        success: false,
        error: 'user_id가 필요합니다'
      }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: user, error } = await supabase
      .from('users')
      .select('free_credits, paid_credits')
      .eq('id', user_id)
      .single();
    
    if (error || !user) {
      console.error('❌ 크레딧 조회 실패:', error);
      return c.json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      }, 404);
    }
    
    return c.json({
      success: true,
      free_credits: user.free_credits || 0,
      paid_credits: user.paid_credits || 0,
      total_credits: (user.free_credits || 0) + (user.paid_credits || 0)
    });
    
  } catch (error: any) {
    console.error('❌ 크레딧 조회 예외:', error);
    return c.json({
      success: false,
      error: error.message || '크레딧 조회 중 오류가 발생했습니다'
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

// 이미지 라우트 연결
app.route('/api/images', images);

// ===================================
// 🔥 하이브리드 크레딧 시스템 (키워드 분석)
// ===================================

// 설정 상수
const DAILY_FREE_LIMIT = 3;
const MONTHLY_FREE_CREDITS = 30;
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
    
    const { data: user, error } = await supabase
      .from('users')
      .select('created_at, last_reset_date')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      console.error('사용자 조회 실패:', error);
      return;
    }
    
    // 가입일 기준 리셋 로직
    const signupDate = new Date(user.created_at);
    const lastReset = user.last_reset_date 
      ? new Date(user.last_reset_date)
      : new Date('1970-01-01');
    
    // 가입일의 "일" 추출 (예: 15일)
    const resetDay = signupDate.getDate();
    
    // 현재 월의 마지막 날 계산 (2월 28일 등 처리)
    const lastDayOfCurrentMonth = new Date(
      today.getFullYear(), 
      today.getMonth() + 1, 
      0
    ).getDate();
    
    // 실제 리셋일 (월말 가입자 고려)
    const actualResetDay = Math.min(resetDay, lastDayOfCurrentMonth);
    
    // 이번 달의 리셋 기준일 계산
    let currentMonthResetDate = new Date(
      today.getFullYear(), 
      today.getMonth(), 
      actualResetDay
    );
    
    // 오늘이 이번 달 리셋일보다 이전이라면, 지난 달이 기준
    if (today < currentMonthResetDate) {
      currentMonthResetDate = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        actualResetDay
      );
      
      // 지난 달 마지막 날 다시 계산
      const lastDayOfPrevMonth = new Date(
        currentMonthResetDate.getFullYear(),
        currentMonthResetDate.getMonth() + 1,
        0
      ).getDate();
      
      const prevMonthActualDay = Math.min(resetDay, lastDayOfPrevMonth);
      currentMonthResetDate.setDate(prevMonthActualDay);
    }
    
    // 리셋 조건: 마지막 리셋이 이번 주기보다 이전인가?
    const needsReset = lastReset < currentMonthResetDate;
    
    if (needsReset) {
      const calculatedResetDate = currentMonthResetDate.toISOString().split('T')[0];
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          free_credits: MONTHLY_FREE_CREDITS,
          last_reset_date: calculatedResetDate // ✅ 계산된 리셋 기준일로 저장 (앵커 고정!)
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('크레딧 갱신 실패:', updateError);
      } else {
        console.log(`✅ 사용자 ${userId}에게 월간 무료 크레딧 ${MONTHLY_FREE_CREDITS}개 지급 (매월 ${actualResetDay}일 기준)`);
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
    
    // 🔥 v16.0.1: 실제 분석 강제 + 유연한 파싱
    const analysisPrompt = `키워드 "${keywordArray.join(', ')}"를 한국 시장 기준으로 정확히 분석하세요.

⚠️ 중요: 각 키워드마다 다른 점수를 매겨야 합니다. 예시 점수를 그대로 쓰지 마세요!
⚠️ 중요: 모든 항목을 **구체적이고 실행 가능한 내용**으로 작성하세요. 추상적인 표현 금지!

다음 형식으로 답변하세요:

=== 점수 ===
(실제 분석한 0~100 점수)

=== 마케팅 효과 ===
(실제 분석한 0~100 점수)

=== SEO 난이도 ===
(실제 분석한 0~100 점수)

=== 바이럴 가능성 ===
(실제 분석한 0~100 점수)

=== 전환율 예상 ===
(실제 분석한 0~100 점수)

=== 종합 분석 ===
(키워드의 특성, 타겟층, 시장상황, 경쟁도를 고려한 5문장 이상의 상세 분석)

=== 추천 전략 ===
- 구체적인 실행 전략 1 (플랫폼, 포맷, 주기 등 구체적으로)
- 구체적인 실행 전략 2 (플랫폼, 포맷, 주기 등 구체적으로)
- 구체적인 실행 전략 3 (플랫폼, 포맷, 주기 등 구체적으로)
- 구체적인 실행 전략 4 (플랫폼, 포맷, 주기 등 구체적으로)
- 구체적인 실행 전략 5 (플랫폼, 포맷, 주기 등 구체적으로)

=== 관련 키워드 ===
- 실제 연관 키워드 1
- 실제 연관 키워드 2
- 실제 연관 키워드 3
- 실제 연관 키워드 4
- 실제 연관 키워드 5
- 실제 연관 키워드 6
- 실제 연관 키워드 7

=== 더 나은 대체 키워드 ===
- 대체 키워드 1 | 구체적 이유 (수치, 데이터 포함)
- 대체 키워드 2 | 구체적 이유 (수치, 데이터 포함)
- 대체 키워드 3 | 구체적 이유 (수치, 데이터 포함)
- 대체 키워드 4 | 구체적 이유 (수치, 데이터 포함)
- 대체 키워드 5 | 구체적 이유 (수치, 데이터 포함)

=== 시장 인사이트 ===
- 시장 분석 인사이트 1 (검색량, 트렌드, 경쟁도 등 구체적 데이터 포함, 최소 50자)
- 시장 분석 인사이트 2 (검색량, 트렌드, 경쟁도 등 구체적 데이터 포함, 최소 50자)
- 시장 분석 인사이트 3 (검색량, 트렌드, 경쟁도 등 구체적 데이터 포함, 최소 50자)
- 시장 분석 인사이트 4 (검색량, 트렌드, 경쟁도 등 구체적 데이터 포함, 최소 50자)
- 시장 분석 인사이트 5 (검색량, 트렌드, 경쟁도 등 구체적 데이터 포함, 최소 50자)

=== 전략적 제안 ===
- 단기 전략(1-3개월): 구체적 실행 계획 (플랫폼, 콘텐츠 형식, 주기, 목표 KPI 등 명시, 최소 50자)
- 중기 전략(3-6개월): 구체적 실행 계획 (플랫폼, 콘텐츠 형식, 주기, 목표 KPI 등 명시, 최소 50자)
- 장기 전략(6개월 이상): 구체적 실행 계획 (플랫폼, 콘텐츠 형식, 주기, 목표 KPI 등 명시, 최소 50자)
- 바이럴 전략: SNS 플랫폼별 구체적 전략 (해시태그, 포맷, 타겟층 등 명시, 최소 50자)
- 전환 최적화 전략: 랜딩 페이지, CTA, 리타게팅 등 구체적 방법 (최소 50자)

⚠️ 주의: 모든 항목을 실제 데이터와 구체적인 실행 방법으로 채워주세요!
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
          model: 'gpt-4o',
          messages: [{ role: 'user', content: analysisPrompt }],
          temperature: 0.7, // 🔥 v16.0.1: 창의성 높여서 키워드별 차별화
          max_tokens: 4000
        });
        aiResponse = completion.choices[0].message.content || '';
      }
      
      console.log(`✅ [AI 진단] AI 응답 성공 - 길이: ${aiResponse.length}자`);
      console.log(`📄 [AI 진단] 응답 미리보기:`, aiResponse.substring(0, 300));
      
      // 🔥 v16.0.1: 유연하고 강력한 텍스트 파싱
      function extractSection(text: string, sectionName: string): string {
        // 다양한 형식을 모두 허용: ===, ###, **, [], 등
        const patterns = [
          `=== ${sectionName} ===\\s*([\\s\\S]*?)(?=\\s*===|$)`,
          `### ${sectionName}\\s*([\\s\\S]*?)(?=\\s*###|$)`,
          `\\*\\*${sectionName}\\*\\*\\s*([\\s\\S]*?)(?=\\s*\\*\\*|$)`,
          `\\[${sectionName}\\]\\s*([\\s\\S]*?)(?=\\s*\\[|$)`,
          `${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\s*[가-힣A-Za-z]+:|$)`
        ];
        
        for (const pattern of patterns) {
          const regex = new RegExp(pattern, 'i');
          const match = text.match(regex);
          if (match && match[1].trim()) {
            return match[1].trim();
          }
        }
        
        return '';
      }
      
      function extractList(text: string, sectionName: string): string[] {
        const content = extractSection(text, sectionName);
        if (!content) {
          console.log(`⚠️ [파싱 실패] "${sectionName}" 섹션을 찾을 수 없습니다`);
          return [];
        }
        
        const items = content
          .split('\n')
          .map(line => line.replace(/^[-*•\d\.)\s]+/, '').trim()) // 모든 종류의 글머리기호 제거
          .filter(line => {
            // 🔥 더 유연한 필터링
            const isValid = line.length > 3 && // 3자 이상만 허용 (5→3으로 완화)
                           !line.match(/^===|^###|^\*\*/) && // 헤더 잔여물 제거
                           !line.match(/^\s*$/) && // 빈 줄 제거
                           line.length < 500; // 너무 긴 설명문 제외
            
            if (!isValid && line.length > 0) {
              console.log(`⚠️ [파싱 제외] "${sectionName}" 항목 제외: ${line.substring(0, 50)}...`);
            }
            
            return isValid;
          })
          .slice(0, 10); // 최대 10개까지만
        
        console.log(`✅ [파싱 성공] "${sectionName}" ${items.length}개 항목 추출`);
        return items;
      }
      
      function extractAlternatives(text: string, sectionName: string) {
        const content = extractSection(text, sectionName);
        if (!content) return [];
        
        return content
          .split('\n')
          .filter(line => line.includes('|') || line.includes('-'))
          .map(line => {
            let parts;
            if (line.includes('|')) {
              parts = line.split('|');
            } else {
              // | 없으면 첫 번째 단어를 키워드로, 나머지를 이유로
              const words = line.replace(/^[-*•\d\.)\s]+/, '').trim().split(' ');
              parts = [words[0], words.slice(1).join(' ')];
            }
            
            return {
              keyword: parts[0]?.replace(/^[-*•\d\.)\s]+/, '').trim() || '대체 키워드',
              reason: parts[1]?.trim() || '추가 분석 필요'
            };
          })
          .filter(item => item.keyword.length > 1)
          .slice(0, 8); // 최대 8개
      }
      
      // 🔥 실제 점수 추출 (숫자만 찾기)
      function extractScore(text: string, sectionName: string, fallback: number = 50): number {
        const content = extractSection(text, sectionName);
        if (!content) return fallback;
        
        // 숫자만 추출 (괄호, 설명 등 무시)
        const numbers = content.match(/\b(\d{1,3})\b/g);
        if (numbers) {
          const score = parseInt(numbers[0]);
          return Math.min(100, Math.max(0, score)); // 0-100 범위로 제한
        }
        
        return fallback;
      }
      
      // 점수 추출
      const totalScore = extractScore(aiResponse, '점수', 50);
      const marketingScore = extractScore(aiResponse, '마케팅 효과', 50);
      const seoScore = extractScore(aiResponse, 'SEO 난이도', 50);
      const viralPotential = extractScore(aiResponse, '바이럴 가능성', 50);
      const conversionPotential = extractScore(aiResponse, '전환율 예상', 50);
      
      console.log(`📊 [AI 진단] 추출된 점수들: 총점=${totalScore}, 마케팅=${marketingScore}, SEO=${seoScore}, 바이럴=${viralPotential}, 전환=${conversionPotential}`);
      
      // 텍스트 및 리스트 추출
      const analysisText = extractSection(aiResponse, '종합 분석') || 
        `"${keywordArray[0]}" 키워드에 대한 분석을 완료했습니다. 해당 키워드는 특정 시장 세그먼트에서 의미있는 검색 수요를 보이고 있으며, 적절한 콘텐츠 전략을 통해 타겟 고객에게 효과적으로 도달할 수 있을 것으로 판단됩니다. 경쟁 환경과 시장 포화도를 고려할 때, 차별화된 접근이 필요하며 장기적 관점에서의 브랜딩 전략이 중요합니다.`;
      
      const recommendations = extractList(aiResponse, '추천 전략');
      const relatedKeywords = extractList(aiResponse, '관련 키워드');
      const betterAlternatives = extractAlternatives(aiResponse, '더 나은 대체 키워드');
      const marketInsights = extractList(aiResponse, '시장 인사이트');
      const strategicRecs = extractList(aiResponse, '전략적 제안');
      
      // 최소한의 기본값만 제공 (파싱이 완전 실패한 경우에만)
      if (recommendations.length === 0) {
        console.log(`⚠️ [폴백] 추천 전략 파싱 실패 - 기본값 사용`);
        recommendations.push(
          `"${keywordArray[0]}" 키워드를 활용한 블로그 콘텐츠 제작 (상위 노출 가능성 높은 롱테일 키워드 포함)`, 
          `네이버 플레이스, 구글 마이 비즈니스 등 지역 기반 SEO 최적화를 통한 검색 가시성 확보`, 
          `인스타그램, 유튜브 쇼츠 등 숏폼 콘텐츠로 바이럴 마케팅 집중 (해시태그 전략 포함)`
        );
      }
      if (relatedKeywords.length === 0) {
        console.log(`⚠️ [폴백] 관련 키워드 파싱 실패 - 기본값 사용`);
        relatedKeywords.push(
          `${keywordArray[0]} 추천`, 
          `${keywordArray[0]} 가격`, 
          `${keywordArray[0]} 후기`, 
          `${keywordArray[0]} 비교`, 
          `${keywordArray[0]} 방법`, 
          `${keywordArray[0]} 장단점`
        );
      }
      if (betterAlternatives.length === 0) {
        console.log(`⚠️ [폴백] 대체 키워드 파싱 실패 - 기본값 사용`);
        betterAlternatives.push(
          { keyword: `${keywordArray[0]} 전문`, reason: '전문성 강조로 신뢰도 및 클릭률 향상 (CTR 20% 증가 예상)' },
          { keyword: `${keywordArray[0]} 추천 순위`, reason: '리스트 형식 콘텐츠로 SEO 최적화 및 체류 시간 증가' }
        );
      }
      if (marketInsights.length === 0) {
        console.log(`⚠️ [폴백] 시장 인사이트 파싱 실패 - 기본값 사용`);
        marketInsights.push(
          `"${keywordArray[0]}" 키워드는 월평균 검색량 증가 추세를 보이며, 특히 모바일 검색 비중이 70% 이상으로 높아 모바일 최적화 콘텐츠가 필수적입니다.`, 
          `경쟁사 분석 결과, 상위 10개 사이트 중 8개가 블로그 형식 콘텐츠로 구성되어 있어, 차별화된 콘텐츠 포맷(인포그래픽, 비디오 등)으로 경쟁 우위 확보 가능성이 높습니다.`,
          `최근 3개월간 연관 검색어 트렌드를 보면, "${keywordArray[0]} 가격", "${keywordArray[0]} 후기" 검색량이 급증하고 있어, 가격 비교 및 실제 사용 후기 콘텐츠 전략이 효과적일 것으로 예상됩니다.`
        );
      }
      if (strategicRecs.length === 0) {
        console.log(`⚠️ [폴백] 전략적 제안 파싱 실패 - 기본값 사용`);
        strategicRecs.push(
          `단기 전략(1-3개월): 네이버 블로그, 티스토리를 활용한 롱테일 키워드 콘텐츠 발행 (주 3-4회), 네이버 VIEW 탭 상위 노출 목표로 이미지 최적화 및 키워드 밀도 관리`,
          `중기 전략(3-6개월): 유튜브, 인스타그램 릴스를 활용한 동영상 콘텐츠 제작, 숏폼 콘텐츠로 바이럴 확산 유도 후 블로그/웹사이트로 트래픽 전환`,
          `장기 전략(6개월 이상): 자체 웹사이트 구축 및 기술 SEO 최적화 (페이지 속도, 구조화 데이터, 백링크 확보), 브랜드 키워드 검색량 증대를 위한 통합 마케팅 캠페인 진행`
        );
      }
      
      console.log(`📊 [AI 진단] 최종 파싱 결과: 추천=${recommendations.length}개, 관련=${relatedKeywords.length}개, 대체=${betterAlternatives.length}개, 인사이트=${marketInsights.length}개`);
      
      // 최종 객체 생성 (텍스트 파싱 결과 기반)
      analysis = {
        overall_score: totalScore,
        keywords: [{
          keyword: keywordArray[0],
          total_score: totalScore,
          marketing_score: marketingScore,
          seo_score: seoScore,
          viral_potential: viralPotential,
          conversion_potential: conversionPotential,
          trend_score: Math.round((totalScore + marketingScore + viralPotential) / 3),
          trend_direction: totalScore >= 70 ? "상승세" : totalScore >= 50 ? "안정적" : "관찰 필요",
          competition_level: Math.min(100, seoScore + 10), // SEO 난이도 기반
          saturation_level: Math.max(0, 100 - viralPotential), // 바이럴 가능성 역산
          market_size: totalScore >= 80 ? "대형" : totalScore >= 60 ? "중형" : "소형",
          analysis: analysisText,
          recommendations,
          related_keywords: relatedKeywords,
          better_alternatives: betterAlternatives
        }],
        market_insights: marketInsights,
        strategic_recommendations: strategicRecs
      };
      
      console.log(`✅ [AI 진단] 텍스트 파싱 성공 - JSON.parse 사용 안함`);
      console.log(`🔍 [${user_id}] 분석 결과:`, {
        overall_score: analysis.overall_score,
        keywords_count: analysis.keywords.length,
        insights_count: analysis.market_insights.length,
        recommendations_count: analysis.strategic_recommendations.length
      });
      
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

// ===================================
// Phase 3: 캘린더 기능 API
// ===================================

// 1️⃣ 발행 예정 콘텐츠 조회
app.get('/api/scheduled-content', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    const status = c.req.query('status'); // 'draft', 'scheduled', 'published', 'cancelled'
    const start_date = c.req.query('start_date'); // YYYY-MM-DD
    const end_date = c.req.query('end_date'); // YYYY-MM-DD
    
    if (!user_id) {
      return c.json({ success: false, error: '사용자 ID가 필요합니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 쿼리 빌더
    let query = supabase
      .from('generations')
      .select('*')
      .eq('user_id', user_id)
      .order('scheduled_date', { ascending: true, nullsFirst: false });
    
    // 상태 필터
    if (status) {
      query = query.eq('publish_status', status);
    }
    
    // 날짜 범위 필터
    if (start_date && end_date) {
      query = query
        .gte('scheduled_date', start_date)
        .lte('scheduled_date', end_date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ 발행 예정 콘텐츠 조회 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`✅ 발행 예정 콘텐츠 조회: ${user_id} (${data?.length || 0}건)`);
    
    return c.json({
      success: true,
      scheduled_content: data || [], // ✅ 'data' → 'scheduled_content'로 변경
      count: data?.length || 0
    });
    
  } catch (error: any) {
    console.error('❌ 발행 예정 콘텐츠 조회 오류:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2️⃣ 발행 예정일 설정/수정
app.post('/api/schedule-content', async (c) => {
  try {
    const body = await c.req.json();
    const { generation_id, scheduled_date, publish_status, user_id, platform } = body;
    
    if (!generation_id || !user_id) {
      return c.json({ 
        success: false, 
        error: 'generation_id와 user_id가 필요합니다' 
      }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 권한 확인 및 현재 데이터 조회
    const { data: existing, error: checkError } = await supabase
      .from('generations')
      .select('id, user_id, platform_status, publish_status')
      .eq('id', generation_id)
      .eq('user_id', user_id)
      .single();
    
    if (checkError || !existing) {
      return c.json({ 
        success: false, 
        error: '권한이 없거나 존재하지 않는 콘텐츠입니다' 
      }, 403);
    }
    
    // 발행 예정일 설정/수정
    const updateData: any = {};
    
    // ✅ scheduled_date는 전체 콘텐츠에 적용 (플랫폼 공유)
    if (scheduled_date !== undefined) {
      updateData.scheduled_date = scheduled_date;
    }
    
    // ✅ 플랫폼별 상태 관리
    if (publish_status !== undefined && platform) {
      // 플랫폼이 지정된 경우: 해당 플랫폼만 업데이트
      const currentPlatformStatus = existing.platform_status || {};
      currentPlatformStatus[platform] = publish_status;
      
      updateData.platform_status = currentPlatformStatus;
      
      console.log(`📝 플랫폼별 상태 설정: ${generation_id} → ${platform}: ${publish_status}`);
    } else if (publish_status !== undefined) {
      // 플랫폼이 없는 경우: 기존 방식 (하위 호환)
      updateData.publish_status = publish_status;
      
      console.log(`📝 전체 상태 설정: ${generation_id} → ${publish_status}`);
    }
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('generations')
      .update(updateData as any) // 타입 캐스팅 추가
      .eq('id', generation_id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ 발행 예정일 설정 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`✅ 발행 예정일 설정: ${generation_id} → ${scheduled_date || 'null'}`);
    
    return c.json({
      success: true,
      message: '발행 예정일이 설정되었습니다',
      data
    });
    
  } catch (error: any) {
    console.error('❌ 발행 예정일 설정 오류:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 3️⃣ 발행 상태 변경 (플랫폼별 독립 관리)
app.patch('/api/schedule-content/:id', async (c) => {
  try {
    const generation_id = c.req.param('id');
    const body = await c.req.json();
    const { publish_status, user_id, scheduled_date, platform } = body;
    
    if (!generation_id || !user_id) {
      return c.json({ 
        success: false, 
        error: 'id, user_id가 필요합니다' 
      }, 400);
    }
    
    // publish_status가 있으면 유효성 검사
    if (publish_status) {
      const validStatuses = ['draft', 'scheduled', 'published', 'cancelled'];
      if (!validStatuses.includes(publish_status)) {
        return c.json({ 
          success: false, 
          error: `유효하지 않은 상태값입니다. 허용: ${validStatuses.join(', ')}` 
        }, 400);
      }
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 권한 확인 및 현재 데이터 조회
    const { data: existing, error: checkError } = await supabase
      .from('generations')
      .select('id, user_id, platform_status, publish_status')
      .eq('id', generation_id)
      .eq('user_id', user_id)
      .single();
    
    if (checkError || !existing) {
      return c.json({ 
        success: false, 
        error: '권한이 없거나 존재하지 않는 콘텐츠입니다' 
      }, 403);
    }
    
    // 업데이트 데이터 구성
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    // ✅ 플랫폼별 상태 관리
    if (publish_status !== undefined && platform) {
      // 플랫폼이 지정된 경우: 해당 플랫폼만 업데이트
      const currentPlatformStatus = existing.platform_status || {};
      currentPlatformStatus[platform] = publish_status;
      
      updateData.platform_status = currentPlatformStatus;
      
      console.log(`📝 플랫폼별 상태 변경: ${generation_id} → ${platform}: ${publish_status}`);
    } else if (publish_status !== undefined) {
      // 플랫폼이 없는 경우: 기존 방식 (하위 호환)
      updateData.publish_status = publish_status;
      
      console.log(`📝 전체 상태 변경: ${generation_id} → ${publish_status}`);
    }
    
    // scheduled_date가 명시적으로 null이면 삭제
    if (scheduled_date === null) {
      updateData.scheduled_date = null;
    } else if (scheduled_date !== undefined) {
      updateData.scheduled_date = scheduled_date;
    }
    
    // 상태 변경
    const { data, error } = await supabase
      .from('generations')
      .update(updateData)
      .eq('id', generation_id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ 발행 상태 변경 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`✅ 발행 상태 변경 완료: ${generation_id}`);
    
    return c.json({
      success: true,
      message: '발행 상태가 변경되었습니다',
      data
    });
    
  } catch (error: any) {
    console.error('❌ 발행 상태 변경 오류:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================
// 📝 캘린더 메모 API
// ============================================================

// 1️⃣ 메모 저장 (INSERT - 여러 개 저장 가능)
app.post('/api/calendar-memo', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, date, memo } = body;
    
    if (!user_id || !date || !memo) {
      return c.json({ 
        success: false, 
        error: 'user_id, date, memo가 필요합니다' 
      }, 400);
    }
    
    console.log(`📝 캘린더 메모 저장 요청: user_id=${user_id}, date=${date}`);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // INSERT: 여러 메모 저장 가능 (UNIQUE 제약조건 제거됨)
    const { data, error } = await supabase
      .from('calendar_memos')
      .insert({
        user_id,
        date,
        memo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ 메모 저장 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`✅ 메모 저장 완료: ${date} → "${memo.substring(0, 30)}..."`);
    
    return c.json({
      success: true,
      message: '메모가 저장되었습니다',
      data
    });
    
  } catch (error: any) {
    console.error('❌ 메모 저장 오류:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2️⃣ 메모 조회
app.get('/api/calendar-memos', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    const date = c.req.query('date'); // 옵션: 특정 날짜만 조회
    
    if (!user_id) {
      return c.json({ 
        success: false, 
        error: 'user_id가 필요합니다' 
      }, 400);
    }
    
    console.log(`📝 캘린더 메모 조회: user_id=${user_id}, date=${date || 'all'}`);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    let query = supabase
      .from('calendar_memos')
      .select('*')
      .eq('user_id', user_id)
      .order('date', { ascending: false });
    
    // 특정 날짜만 조회 (timestamptz이므로 날짜 범위로 검색)
    if (date) {
      // date가 YYYY-MM-DD 형식이면 해당 날짜의 00:00:00 ~ 23:59:59 조회
      // KST 기준 (UTC+9)으로 변환
      const startOfDay = `${date}T00:00:00+09:00`;
      const endOfDay = `${date}T23:59:59+09:00`;
      
      query = query
        .gte('date', startOfDay)
        .lte('date', endOfDay);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ 메모 조회 실패:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`✅ 메모 조회 완료: ${data?.length || 0}개`);
    
    return c.json({
      success: true,
      memos: data || [],
      count: data?.length || 0
    });
    
  } catch (error: any) {
    console.error('❌ 메모 조회 오류:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 3️⃣ 메모 삭제
app.delete('/api/calendar-memo/:id', async (c) => {
  try {
    const memo_id = c.req.param('id');
    const user_id = c.req.query('user_id');
    
    if (!memo_id || !user_id) {
      return c.json({ 
        success: false, 
        error: 'id와 user_id가 필요합니다' 
      }, 400);
    }
    
    console.log(`📝 캘린더 메모 삭제: memo_id=${memo_id}, user_id=${user_id}`);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 권한 확인 + 삭제
    const { data, error } = await supabase
      .from('calendar_memos')
      .delete()
      .eq('id', memo_id)
      .eq('user_id', user_id) // RLS 보호
      .select()
      .single();
    
    if (error) {
      console.error('❌ 메모 삭제 실패:', error);
      return c.json({ 
        success: false, 
        error: error.code === 'PGRST116' 
          ? '메모를 찾을 수 없거나 권한이 없습니다' 
          : error.message 
      }, 404);
    }
    
    console.log(`✅ 메모 삭제 완료: ${memo_id}`);
    
    return c.json({
      success: true,
      message: '메모가 삭제되었습니다',
      data
    });
    
  } catch (error: any) {
    console.error('❌ 메모 삭제 오류:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4️⃣ 메모 수정
app.put('/api/calendar-memo/:id', async (c) => {
  try {
    const memo_id = c.req.param('id');
    const body = await c.req.json();
    const { user_id, memo } = body;
    
    if (!memo_id || !user_id || !memo) {
      return c.json({ 
        success: false, 
        error: 'id, user_id, memo가 필요합니다' 
      }, 400);
    }
    
    console.log(`📝 캘린더 메모 수정: memo_id=${memo_id}, user_id=${user_id}`);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 권한 확인 + 수정
    const { data, error } = await supabase
      .from('calendar_memos')
      .update({
        memo,
        updated_at: new Date().toISOString()
      })
      .eq('id', memo_id)
      .eq('user_id', user_id) // RLS 보호
      .select()
      .single();
    
    if (error) {
      console.error('❌ 메모 수정 실패:', error);
      return c.json({ 
        success: false, 
        error: error.code === 'PGRST116' 
          ? '메모를 찾을 수 없거나 권한이 없습니다' 
          : error.message 
      }, 404);
    }
    
    console.log(`✅ 메모 수정 완료: ${memo_id}`);
    
    return c.json({
      success: true,
      message: '메모가 수정되었습니다',
      data
    });
    
  } catch (error: any) {
    console.error('❌ 메모 수정 오류:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ========================================
// 📊 대시보드 통계 API
// ========================================
app.get('/api/stats', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    if (!user_id) {
      console.error('❌ [/api/stats] user_id 누락');
      return c.json({ 
        success: false, 
        error: 'user_id가 필요합니다' 
      }, 400);
    }
    
    console.log(`📊 [/api/stats] 대시보드 통계 조회 시작: user_id=${user_id}`);
    
    // 환경 변수 확인
    if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_KEY) {
      console.error('❌ [/api/stats] Supabase 환경 변수 누락:', {
        SUPABASE_URL: !!c.env.SUPABASE_URL,
        SUPABASE_SERVICE_KEY: !!c.env.SUPABASE_SERVICE_KEY
      });
      return c.json({ 
        success: false, 
        error: 'Supabase 환경 변수가 설정되지 않았습니다' 
      }, 500);
    }
    
    console.log(`🔗 [/api/stats] Supabase 연결 시도:`, c.env.SUPABASE_URL);
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 1) 사용자 정보 조회
    console.log(`👤 [/api/stats] 사용자 정보 조회 중...`);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, free_credits, paid_credits, tier')
      .eq('id', user_id)
      .maybeSingle();
    
    if (userError) {
      console.error('❌ [/api/stats] 사용자 정보 조회 실패:', {
        message: userError.message,
        code: userError.code,
        details: userError.details,
        hint: userError.hint
      });
      return c.json({ 
        success: false, 
        error: `사용자 정보 조회 실패: ${userError.message}` 
      }, 404);
    }
    
    if (!user) {
      console.error('❌ [/api/stats] 사용자를 찾을 수 없음:', user_id);
      return c.json({ 
        success: false, 
        error: '사용자를 찾을 수 없습니다' 
      }, 404);
    }
    
    console.log(`✅ [/api/stats] 사용자 조회 완료:`, {
      id: user.id,
      email: user.email,
      name: user.name
    });
    
    // 2) 총 생성 횟수
    console.log(`📝 [/api/stats] 총 생성 횟수 조회 중...`);
    const { count: totalCount, error: totalError } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);
    
    if (totalError) {
      console.error('❌ [/api/stats] 총 생성 횟수 조회 실패:', totalError);
    } else {
      console.log(`✅ [/api/stats] 총 생성 횟수: ${totalCount}`);
    }
    
    // 3) 이번 달 생성 횟수
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    console.log(`📅 [/api/stats] 이번 달 생성 횟수 조회 중... (시작일: ${startOfMonth})`);
    
    const { count: monthlyCount, error: monthlyError } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', startOfMonth);
    
    if (monthlyError) {
      console.error('❌ [/api/stats] 이번 달 생성 횟수 조회 실패:', monthlyError);
    } else {
      console.log(`✅ [/api/stats] 이번 달 생성 횟수: ${monthlyCount}`);
    }
    
    // 4) 최근 생성 콘텐츠 5개
    console.log(`🕒 [/api/stats] 최근 생성 콘텐츠 조회 중...`);
    const { data: recentContent, error: recentError } = await supabase
      .from('generations')
      .select('id, platforms, created_at, credits_used, brand, keywords')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.error('❌ [/api/stats] 최근 생성 콘텐츠 조회 실패:', recentError);
    } else {
      console.log(`✅ [/api/stats] 최근 콘텐츠: ${recentContent?.length || 0}개`);
    }
    
    // 5) 최근 크레딧 사용 내역 10개
    console.log(`💰 [/api/stats] 크레딧 사용 내역 조회 중...`);
    const { data: creditHistory, error: creditError } = await supabase
      .from('credit_transactions')
      .select('id, created_at, credits_used, amount, description')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (creditError) {
      console.error('❌ [/api/stats] 크레딧 사용 내역 조회 실패:', creditError);
    } else {
      console.log(`✅ [/api/stats] 크레딧 내역: ${creditHistory?.length || 0}개`);
    }
    
    // 응답 데이터 구성
    const stats = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        free_credits: user.free_credits || 0,
        paid_credits: user.paid_credits || 0,
        tier: user.tier || 'free'
      },
      stats: {
        total_generations: totalCount || 0,
        monthly_generations: monthlyCount || 0,
        postflow_count: totalCount || 0, // 현재는 PostFlow만 운영 중
        trendfinder_count: 0, // 준비 중
        storymaker_count: 0 // 준비 중
      },
      recent_content: recentContent || [],
      credit_history: creditHistory || []
    };
    
    console.log(`✅ [/api/stats] 대시보드 통계 조회 완료:`, {
      user_id: user_id,
      total: stats.stats.total_generations,
      monthly: stats.stats.monthly_generations,
      recent: stats.recent_content.length,
      credit_history: stats.credit_history.length
    });
    
    return c.json({
      success: true,
      data: stats
    });
    
  } catch (error: any) {
    console.error('❌ [/api/stats] 대시보드 통계 조회 오류:', {
      message: error.message,
      stack: error.stack
    });
    return c.json({ 
      success: false, 
      error: `서버 오류: ${error.message}` 
    }, 500);
  }
});

// ========================================
// 🔥 /dashboard 라우트 추가 (긴급 수정)
// ========================================
// ========================================
// Import dashboard template
// ========================================
import { dashboardTemplate } from './dashboard-template';

// ========================================
// 🔥 /dashboard 라우트 (통합 대시보드)
// ========================================
app.get('/dashboard', (c) => {
  return c.html(dashboardTemplate);
});

// YouTube 분석기 페이지
app.get('/youtube-analyzer', (c) => {
  return c.html(youtubeAnalyzerTemplate());
});

// ========================================
// 🔥 /postflow 라우트 (PostFlow 작업 공간)
// ========================================
app.get('/postflow', (c) => {
  return c.html(htmlTemplate);
});

// ========================================
// 🔥 /community 라우트 (준비중)
// ========================================
app.get('/community', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>커뮤니티 - 준비중</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 flex items-center justify-center min-h-screen">
        <div class="text-center">
            <h1 class="text-6xl font-bold text-gray-800 mb-4">🚧</h1>
            <h2 class="text-3xl font-bold text-gray-700 mb-4">커뮤니티</h2>
            <p class="text-xl text-gray-600 mb-8">준비중입니다</p>
            <button onclick="location.href='/'" class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                홈으로 돌아가기
            </button>
        </div>
    </body>
    </html>
  `);
});

// ========================================
// 🔥 Catch-all 라우트 (404 처리)
// ========================================
app.get('*', (c) => {
  const path = c.req.path;
  
  // favicon은 404 반환
  if (path === '/favicon.ico') {
    return c.text('Not Found', 404);
  }
  
  // 그 외 모든 경로는 랜딩 페이지 반환
  return c.html(landingPageTemplate);
});

// ========================================
// 👤 사용자 프로필 관리 API
// ========================================

// PUT /api/users/update-profile - 사용자 프로필 업데이트
app.put('/api/users/update-profile', async (c) => {
  try {
    console.log('📝 /api/users/update-profile 요청');
    
    // JWT 토큰 검증
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: '인증 토큰이 필요합니다' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY,
      token
    );
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ 인증 실패:', authError);
      return c.json({ success: false, error: '인증에 실패했습니다' }, 401);
    }
    
    const body = await c.req.json();
    const { user_id, name, marketing_agreed } = body;
    
    if (!user_id) {
      return c.json({ success: false, error: 'user_id는 필수입니다' }, 400);
    }
    
    // 본인 확인
    if (user.id !== user_id) {
      return c.json({ success: false, error: '본인의 정보만 수정할 수 있습니다' }, 403);
    }
    
    // 업데이트할 필드 구성
    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (marketing_agreed !== undefined) updateFields.marketing_agreed = marketing_agreed;
    
    if (Object.keys(updateFields).length === 0) {
      return c.json({ success: false, error: '업데이트할 필드가 없습니다' }, 400);
    }
    
    console.log('📡 사용자 프로필 업데이트:', { user_id, updateFields });
    
    // Supabase users 테이블 업데이트
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', user_id)
      .select('id, email, name, tier, free_credits, paid_credits, marketing_agreed')
      .single();
    
    if (updateError) {
      console.error('❌ 프로필 업데이트 실패:', updateError);
      return c.json({ success: false, error: updateError.message }, 500);
    }
    
    console.log('✅ 프로필 업데이트 완료:', updatedUser);
    
    return c.json({
      success: true,
      user: updatedUser
    });
    
  } catch (error: any) {
    console.error('❌ 프로필 업데이트 예외:', error);
    return c.json({ success: false, error: '프로필 업데이트 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// DELETE /api/users/delete-account - 회원 탈퇴
app.delete('/api/users/delete-account', async (c) => {
  try {
    console.log('🗑️ /api/users/delete-account 요청');
    
    // JWT 토큰 검증
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: '인증 토큰이 필요합니다' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY,
      token
    );
    
    // 토큰으로 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ 인증 실패:', authError);
      return c.json({ success: false, error: '인증에 실패했습니다' }, 401);
    }
    
    const body = await c.req.json();
    const { user_id } = body;
    
    if (!user_id) {
      return c.json({ success: false, error: 'user_id는 필수입니다' }, 400);
    }
    
    // 본인 확인
    if (user.id !== user_id) {
      return c.json({ success: false, error: '본인의 계정만 삭제할 수 있습니다' }, 403);
    }
    
    console.log('📡 회원 탈퇴 처리:', { user_id });
    
    // Supabase Admin 클라이언트로 사용자 삭제
    const supabaseAdmin = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // auth.users에서 사용자 삭제 (CASCADE로 관련 데이터 자동 삭제)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    
    if (deleteError) {
      console.error('❌ 회원 탈퇴 실패:', deleteError);
      return c.json({ success: false, error: deleteError.message }, 500);
    }
    
    console.log('✅ 회원 탈퇴 완료:', user_id);
    
    return c.json({
      success: true,
      message: '회원 탈퇴가 완료되었습니다'
    });
    
  } catch (error: any) {
    console.error('❌ 회원 탈퇴 예외:', error);
    return c.json({ success: false, error: '회원 탈퇴 중 오류가 발생했습니다', details: error.message }, 500);
  }
});

// YouTube 분석기 API 라우트 등록
app.route('/', youtubeApi);

export default app;
