/**
 * Gemini API 직접 호출 (Cloudflare Workers 호환)
 * GoogleGenerativeAI SDK는 Cloudflare Workers에서 제대로 작동하지 않으므로
 * 직접 REST API를 호출합니다.
 */

/**
 * Gemini Flash 이미지 분석 (Cloudflare Workers 호환)
 */
export async function analyzeImageWithGemini(
  apiKey: string,
  imageUrl: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // 이미지 URL을 base64로 변환
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // 청크 단위로 변환하여 스택 오버플로우 방지
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);

  const apiResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            text: `이 이미지를 자세히 분석해주세요. 다음 내용을 포함해주세요:

1. 주요 피사체나 대상 (사람, 동물, 사물 등)
2. 배경이나 환경 설정
3. 색상, 분위기, 스타일
4. 특별한 특징이나 눈에 띄는 요소

예시:
- "두 마리의 주황색 고양이가 카메라를 응시하고 있습니다. 밝은 조명 아래에서 촬영되었으며, 고양이들의 황금색 눈동자가 인상적입니다."
- "강의실에서 AI 교육이 진행 중인 모습입니다. 여러 명의 학생들이 노트북으로 실습하고 있으며, 화면에는 코드가 보입니다."
- "AI CORE LAB 소개 자료 인포그래픽입니다. 파란색과 흰색의 깔끔한 디자인이며, 교육 과정과 커리큘럼이 상세히 표시되어 있습니다."

최소 50자 이상, 구체적이고 자세하게 설명해주세요.`
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64
            }
          }
        ]
      }]
    })
  });

  if (!apiResponse.ok) {
    const error = await apiResponse.text();
    throw new Error(`Gemini API Error: ${apiResponse.status} ${error}`);
  }

  const data = await apiResponse.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Gemini Flash 콘텐츠 생성 (Cloudflare Workers 호환)
 */
export async function generateContentWithGemini(
  apiKey: string,
  prompt: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * 비용 계산 (추정)
 */
export function calculateGeminiCost(inputTokens: number, outputTokens: number): number {
  // Gemini 1.5 Flash 가격
  const inputCostPer1M = 0.075; // $0.075 per 1M tokens
  const outputCostPer1M = 0.30; // $0.30 per 1M tokens
  
  const inputCost = (inputTokens / 1_000_000) * inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;
  
  return inputCost + outputCost;
}

/**
 * 토큰 수 추정 (대략적)
 */
export function estimateTokens(text: string): number {
  // 한국어는 대략 1글자 = 1.5 토큰
  return Math.ceil(text.length * 1.5);
}
