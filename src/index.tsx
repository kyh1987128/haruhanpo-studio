import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import OpenAI from 'openai';
import { getBlogPrompt, getInstagramPrompt, getThreadsPrompt, getYouTubePrompt, getYoutubeLongformPrompt, getShortformPrompt, getMetadataPrompt } from './prompts';
import { htmlTemplate } from './html-template';

type Bindings = {
  OPENAI_API_KEY: string;
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

    // 1단계: 모든 이미지 상세 분석
    console.log(`이미지 ${images.length}장 분석 시작...`);
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

          return {
            index: index + 1,
            description: analysis.choices[0].message.content || '이미지 분석 실패',
          };
        } catch (error: any) {
          console.error(`이미지 ${index + 1} 분석 오류:`, error.message);
          return {
            index: index + 1,
            description: `이미지 ${index + 1} 분석 중 오류가 발생했습니다.`,
          };
        }
      })
    );

    // 모든 이미지 분석 결과를 하나의 문자열로 합침
    const combinedImageDescription = imageAnalyses
      .map((img) => `[이미지 ${img.index}]\n${img.description}`)
      .join('\n\n');

    console.log('이미지 분석 완료. 일치성 검증 시작...');

    // 2단계: 이미지와 사용자 입력 정보의 일치성 검증 (forceGenerate가 false일 때만)
    if (!forceGenerate) {
      try {
      const validationResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '당신은 이미지 분석과 사용자 입력 정보의 연관성을 판단하는 전문가입니다.',
          },
          {
            role: 'user',
            content: `다음 이미지 분석 결과와 사용자 입력 정보가 서로 일치하는지 검증해주세요.

📸 이미지 분석 결과:
${combinedImageDescription}

📝 사용자 입력 정보:
- 브랜드명/서비스명: ${brand}
- 핵심 키워드: ${keywords}
- 산업 분야: ${industry}
- 톤앤매너: ${tone}
- 타겟 연령대: ${targetAge}

아래 JSON 형식으로만 응답하세요:
{
  "isMatch": true 또는 false,
  "confidence": 0-100 사이의 숫자 (일치 확신도),
  "reason": "불일치 이유 (한글, 100자 이내)",
  "imageSummary": "이미지 주요 내용 요약 (한글, 50자 이내)",
  "userInputSummary": "사용자 입력 요약 (한글, 50자 이내)",
  "recommendation": "사용자에게 제안할 조치 (한글, 100자 이내)"
}

판단 기준:
- confidence 70 이상: 일치 (isMatch: true)
- confidence 70 미만: 불일치 (isMatch: false)
- 이미지 내용과 브랜드/키워드/산업분야가 명확히 다른 경우 불일치
- 약간의 차이는 허용 (예: 카페 이미지 + 레스토랑 키워드 → 일치 가능)`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const validationText = validationResponse.choices[0].message.content || '{}';
      // JSON 코드 블록 제거
      const cleanedText = validationText.replace(/```json\n?|\n?```/g, '').trim();
      const validation = JSON.parse(cleanedText);

        console.log('검증 결과:', validation);

        // 불일치 감지 시 경고 반환
        if (!validation.isMatch || validation.confidence < 70) {
          return c.json({
            success: false,
            requireConfirmation: true,
            validation: {
              isMatch: validation.isMatch,
              confidence: validation.confidence,
              reason: validation.reason,
              imageSummary: validation.imageSummary,
              userInputSummary: validation.userInputSummary,
              recommendation: validation.recommendation,
            },
            message: '이미지와 입력 정보가 일치하지 않습니다.',
          });
        }
      } catch (error: any) {
        console.error('검증 오류:', error.message);
        // 검증 실패 시 경고 없이 진행 (서비스 중단 방지)
      }
    } else {
      console.log('검증 우회 (사용자가 강제 진행 선택)');
    }

    console.log('검증 통과. 콘텐츠 생성 시작...');

    // 2단계: 선택된 플랫폼만 콘텐츠 생성 (병렬 처리)
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

    // 모든 생성 작업 완료 대기
    const results = await Promise.all(generationTasks);

    // 결과를 객체로 변환
    const data: Record<string, string> = {};
    results.forEach(({ platform, content }) => {
      data[platform] = content;
    });

    console.log('콘텐츠 생성 완료!');

    return c.json({
      success: true,
      data,
      generatedPlatforms: platforms,
      imageCount: images.length,
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

// 메인 페이지
app.get('/', (c) => {
  return c.html(htmlTemplate);
});

export default app;
