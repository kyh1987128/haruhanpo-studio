import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import OpenAI from 'openai';
import { getBlogPrompt, getInstagramPrompt, getThreadsPrompt, getYouTubePrompt } from './prompts';

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
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>멀티 플랫폼 콘텐츠 자동 생성기</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          }
          .tab-button {
            transition: all 0.2s;
          }
          .tab-button.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .loading-spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .result-content {
            max-height: 500px;
            overflow-y: auto;
          }
          .image-preview {
            position: relative;
            display: inline-block;
          }
          .remove-image {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ef4444;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
          }
        </style>
    </head>
    <body class="bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
        <div class="container mx-auto px-4 py-8 max-w-6xl">
            <div class="text-center mb-8">
                <h1 class="text-5xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    멀티 플랫폼 콘텐츠 자동 생성기
                </h1>
                <p class="text-gray-600 text-lg">
                    원하는 플랫폼만 선택하여 AI 콘텐츠 생성 ✨
                </p>
            </div>

            <!-- 입력 폼 -->
            <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <form id="contentForm" class="space-y-6">
                    <!-- 이미지 업로드 -->
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-image mr-2"></i>이미지 업로드 (최대 10장, 총 50MB)
                        </label>
                        <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition cursor-pointer" id="uploadArea">
                            <i class="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                id="imageInput"
                                class="hidden"
                            />
                            <p class="text-gray-600">
                                <span class="text-purple-600 font-semibold hover:underline">클릭하여 이미지 선택</span>
                                <span class="text-gray-500"> 또는 드래그앤드롭</span>
                            </p>
                        </div>
                        <div id="imagePreview" class="mt-4 grid grid-cols-5 gap-3"></div>
                    </div>

                    <!-- 브랜드명 -->
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-tag mr-2"></i>브랜드명
                        </label>
                        <input
                            type="text"
                            id="brand"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: 올리브영"
                            required
                        />
                    </div>

                    <!-- 키워드 -->
                    <div>
                        <label class="block mb-2 font-semibold text-gray-700">
                            <i class="fas fa-key mr-2"></i>핵심 키워드
                        </label>
                        <input
                            type="text"
                            id="keywords"
                            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: 스킨케어, 보습, 민감성피부 (쉼표로 구분)"
                            required
                        />
                    </div>

                    <!-- 톤앤매너, 연령대, 산업 -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block mb-2 font-semibold text-gray-700">
                                <i class="fas fa-palette mr-2"></i>톤앤매너
                            </label>
                            <select id="tone" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="캐주얼">캐주얼</option>
                                <option value="전문가">전문가</option>
                                <option value="감성">감성</option>
                            </select>
                        </div>
                        <div>
                            <label class="block mb-2 font-semibold text-gray-700">
                                <i class="fas fa-users mr-2"></i>타겟 연령대
                            </label>
                            <select id="targetAge" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="10대">10대</option>
                                <option value="20대" selected>20대</option>
                                <option value="30대">30대</option>
                                <option value="40대">40대</option>
                                <option value="50대+">50대+</option>
                            </select>
                        </div>
                        <div>
                            <label class="block mb-2 font-semibold text-gray-700">
                                <i class="fas fa-industry mr-2"></i>산업 분야
                            </label>
                            <select id="industry" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="뷰티">뷰티</option>
                                <option value="패션">패션</option>
                                <option value="F&B">F&B</option>
                                <option value="IT">IT/테크</option>
                                <option value="헬스케어">헬스케어</option>
                                <option value="라이프스타일" selected>라이프스타일</option>
                            </select>
                        </div>
                    </div>

                    <!-- 플랫폼 선택 -->
                    <div>
                        <label class="block mb-3 font-semibold text-gray-700">
                            <i class="fas fa-check-square mr-2"></i>생성할 플랫폼 선택 (최소 1개)
                        </label>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-purple-50 transition">
                                <input type="checkbox" name="platform" value="blog" checked class="w-5 h-5 text-purple-600">
                                <span class="font-medium">📝 네이버 블로그</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-purple-50 transition">
                                <input type="checkbox" name="platform" value="instagram" checked class="w-5 h-5 text-purple-600">
                                <span class="font-medium">📸 인스타그램</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-purple-50 transition">
                                <input type="checkbox" name="platform" value="threads" class="w-5 h-5 text-purple-600">
                                <span class="font-medium">🧵 스레드</span>
                            </label>
                            <label class="flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer hover:bg-purple-50 transition">
                                <input type="checkbox" name="platform" value="youtube" class="w-5 h-5 text-purple-600">
                                <span class="font-medium">🎬 유튜브 숏폼</span>
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        id="submitBtn"
                        class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg text-lg"
                    >
                        🎯 콘텐츠 생성하기
                    </button>
                </form>
            </div>

            <!-- 로딩 상태 -->
            <div id="loadingState" class="hidden bg-white rounded-2xl shadow-xl p-12 text-center mb-8">
                <div class="loading-spinner mx-auto mb-4"></div>
                <p class="text-gray-600 text-lg font-medium">콘텐츠 생성 중...</p>
                <p class="text-gray-500 text-sm mt-2">(약 30-60초 소요)</p>
            </div>

            <!-- 결과 표시 -->
            <div id="resultArea" class="hidden bg-white rounded-2xl shadow-xl p-8">
                <h2 class="text-2xl font-bold mb-6 text-gray-800">생성 결과</h2>
                
                <!-- 탭 버튼 -->
                <div id="tabButtons" class="flex space-x-2 mb-6 overflow-x-auto"></div>

                <!-- 탭 콘텐츠 -->
                <div id="tabContents"></div>
            </div>
        </div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

export default app;
