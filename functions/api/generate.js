/**
 * Cloudflare Pages Function: /api/generate
 * 콘텐츠 생성 엔드포인트
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성 헬퍼
function createSupabaseAdmin(supabaseUrl, supabaseServiceKey) {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Gemini 이미지 분석
async function analyzeImageWithGemini(imageBase64, geminiApiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: '이 이미지를 상세히 설명해주세요. 주요 요소, 색상, 분위기, 텍스트 내용 등을 포함해주세요.' },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API 오류: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Gemini 이미지 분석 실패:', error);
    return '';
  }
}

// 블로그 프롬프트
function getBlogPrompt(brand, keywords, tone, targetAge, industry, imageAnalyses) {
  return `당신은 전문 블로그 작성자입니다.

브랜드: ${brand}
키워드: ${keywords}
톤: ${tone}
타겟 연령: ${targetAge}
업종: ${industry}

이미지 분석:
${imageAnalyses.map((a, i) => `[이미지 ${i + 1}] ${a}`).join('\n')}

위 정보를 바탕으로 매력적인 블로그 포스트를 작성해주세요.

JSON 형식으로 응답:
{
  "title": "블로그 제목",
  "content": "블로그 본문 (1000자 이상)",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3"]
}`;
}

// 인스타그램 프롬프트
function getInstagramPrompt(brand, keywords, tone, targetAge, industry, imageAnalyses) {
  return `당신은 인스타그램 콘텐츠 전문가입니다.

브랜드: ${brand}
키워드: ${keywords}
톤: ${tone}
타겟 연령: ${targetAge}
업종: ${industry}

이미지 분석:
${imageAnalyses.map((a, i) => `[이미지 ${i + 1}] ${a}`).join('\n')}

위 정보를 바탕으로 인스타그램 게시물을 작성해주세요.

JSON 형식으로 응답:
{
  "title": "인스타그램 제목",
  "content": "인스타그램 본문 (500자 이내)",
  "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3"]
}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  console.log('🚀 /api/generate 요청 시작');

  try {
    const body = await request.json();
    
    const {
      user_id,
      is_guest = false,
      brand,
      keywords,
      tone = '친근한',
      targetAge = '20-30대',
      industry = '',
      images = [],
      platforms = [],
      aiModel = 'gpt-4o',
    } = body;

    // 입력 검증
    if (!brand || !keywords || !images || !platforms) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '필수 입력 항목이 누락되었습니다.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (platforms.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '최소 1개 플랫폼을 선택해주세요.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (images.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '최소 1장의 이미지를 업로드해주세요.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Supabase 클라이언트 초기화
    const supabase = createSupabaseAdmin(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY
    );

    // 비회원 체험 제한 체크
    if (is_guest) {
      const ipAddress = request.headers.get('CF-Connecting-IP') || 
                        request.headers.get('X-Forwarded-For') || 
                        request.headers.get('X-Real-IP') || 
                        'unknown';

      const { data: trialData } = await supabase
        .from('trial_usage')
        .select('usage_count, is_blocked, block_reason')
        .eq('ip_address', ipAddress)
        .single();

      if (trialData?.is_blocked) {
        return new Response(
          JSON.stringify({
            error: '접근 차단',
            message: trialData.block_reason || '어뷰징이 감지되어 체험이 차단되었습니다.',
            redirect: '/signup'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      if (trialData && trialData.usage_count >= 1) {
        return new Response(
          JSON.stringify({
            error: '무료 체험 제한',
            message: '무료 체험은 1회만 가능합니다. 회원 가입하시면 월 10회 무료로 이용하실 수 있습니다.',
            redirect: '/signup'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // 회원 크레딧 체크
    if (!is_guest && user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('tier, credits, monthly_reset_date')
        .eq('id', user_id)
        .single();

      if (!user) {
        return new Response(
          JSON.stringify({
            error: '사용자 정보 조회 실패',
            message: '사용자를 찾을 수 없습니다. 다시 로그인해주세요.',
            redirect: '/login'
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // 무료 회원 월간 리셋 체크
      if (user.tier === 'free') {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date(today).getMonth();
        const resetMonth = user.monthly_reset_date ? new Date(user.monthly_reset_date).getMonth() : -1;

        if (currentMonth !== resetMonth) {
          await supabase
            .from('users')
            .update({ 
              credits: 10,
              monthly_reset_date: today
            })
            .eq('id', user_id);
          
          user.credits = 10;
          console.log('📅 무료 회원 월간 크레딧 리셋 완료');
        }
      }

      // 크레딧 확인
      if ((user.credits || 0) <= 0) {
        return new Response(
          JSON.stringify({
            error: '크레딧 부족',
            message: user.tier === 'free' 
              ? '이번 달 무료 크레딧을 모두 사용했습니다. 다음 달에 다시 이용하거나 유료 플랜으로 업그레이드하세요.'
              : '크레딧이 부족합니다. 크레딧을 충전해주세요.',
            credits: user.credits || 0,
            redirect: '/payment'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // OpenAI API 키 확인
    const finalApiKey = env.OPENAI_API_KEY;
    if (!finalApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenAI API 키가 서버에 설정되지 않았습니다.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const openai = new OpenAI({ apiKey: finalApiKey });
    const geminiApiKey = env.GEMINI_API_KEY;

    // 이미지 분석 (Gemini 사용)
    console.log(`✨ 이미지 ${images.length}장 분석 시작...`);
    const imageAnalyses = await Promise.all(
      images.map(async (imageBase64, index) => {
        if (geminiApiKey) {
          return await analyzeImageWithGemini(imageBase64, geminiApiKey);
        }
        return `이미지 ${index + 1}`;
      })
    );

    // 플랫폼별 콘텐츠 생성
    const results = {};
    
    for (const platform of platforms) {
      let prompt = '';
      
      if (platform === 'blog') {
        prompt = getBlogPrompt(brand, keywords, tone, targetAge, industry, imageAnalyses);
      } else if (platform === 'instagram') {
        prompt = getInstagramPrompt(brand, keywords, tone, targetAge, industry, imageAnalyses);
      } else {
        continue;
      }

      try {
        const completion = await openai.chat.completions.create({
          model: aiModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });

        const content = JSON.parse(completion.choices[0].message.content);
        results[platform] = content;
      } catch (error) {
        console.error(`${platform} 생성 실패:`, error);
        results[platform] = {
          title: '생성 실패',
          content: '콘텐츠 생성에 실패했습니다.',
          hashtags: []
        };
      }
    }

    // 크레딧 차감
    if (!is_guest && user_id) {
      await supabase
        .from('users')
        .update({ credits: supabase.raw('credits - 1') })
        .eq('id', user_id);

      // 트랜잭션 기록
      await supabase
        .from('credit_transactions')
        .insert({
          user_id,
          amount: -1,
          type: 'usage',
          description: `콘텐츠 생성 (${platforms.join(', ')})`
        });
    }

    // 비회원 사용 기록
    if (is_guest) {
      const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
      
      await supabase
        .from('trial_usage')
        .upsert({
          ip_address: ipAddress,
          usage_count: 1,
          last_used_at: new Date().toISOString()
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        creditsUsed: 1,
        remainingCredits: is_guest ? 0 : null
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ /api/generate 오류:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
