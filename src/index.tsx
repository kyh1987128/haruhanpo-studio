import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import OpenAI from 'openai';
import { getBlogPrompt, getInstagramPrompt, getThreadsPrompt, getYouTubePrompt } from './prompts';
import { htmlTemplate } from './html-template';

type Bindings = {
  OPENAI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 설정
app.use('/api/*', cors());

// 정적 파일 서빙
app.use('/static/*', serveStatic({ root: './public' }));

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

    // OpenAI API 키 확인
    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      return c.json(
        {
          success: false,
          error: 'OpenAI API 키가 설정되지 않았습니다. .dev.vars 파일에 OPENAI_API_KEY를 추가해주세요.',
        },
        500
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
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

    console.log('이미지 분석 완료. 콘텐츠 생성 시작...');

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
        generateContent(openai, 'blog', getBlogPrompt(promptParams))
      );
    }

    if (platforms.includes('instagram')) {
      generationTasks.push(
        generateContent(openai, 'instagram', getInstagramPrompt(promptParams))
      );
    }

    if (platforms.includes('threads')) {
      generationTasks.push(
        generateContent(openai, 'threads', getThreadsPrompt(promptParams))
      );
    }

    if (platforms.includes('youtube')) {
      generationTasks.push(
        generateContent(openai, 'youtube', getYouTubePrompt(promptParams))
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
  prompt: string
): Promise<{ platform: string; content: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
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
