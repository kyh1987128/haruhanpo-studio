import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini Flash 이미지 분석
 */
export async function analyzeImageWithGemini(
  apiKey: string,
  imageUrl: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  // 이미지 URL을 base64로 변환 (대용량 이미지 안전 처리)
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

  const result = await model.generateContent([
    {
      text: `이 이미지를 분석하여 다음 정보를 추출하세요:

1. 주요 객체 및 요소
2. 색상 및 분위기
3. 텍스트 (있다면)
4. 전체적인 컨셉과 느낌
5. 마케팅 포인트

간결하고 구체적으로 설명해주세요.`
    },
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64
      }
    }
  ]);

  return result.response.text();
}

/**
 * Gemini Flash 콘텐츠 생성
 */
export async function generateContentWithGemini(
  apiKey: string,
  prompt: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash-latest',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4000,
    }
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
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
