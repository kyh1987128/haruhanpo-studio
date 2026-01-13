// 이미지 소스 통합 시스템
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import OpenAI from 'openai';

type Bindings = {
  OPENAI_API_KEY: string;
  UNSPLASH_ACCESS_KEY?: string;
  GEMINI_API_KEY?: string;
};

const images = new Hono<{ Bindings: Bindings }>();

// CORS 설정
images.use('/*', cors());

export type ImageSource = 'user_upload' | 'unsplash' | 'ai_generated';

export interface SmartImageRequest {
  userImages: string[];      // 사용자 업로드 이미지
  keywords: string[];        // 키워드 (무료 이미지 검색용)
  requiredCount: number;     // 필요한 이미지 개수
  platform: string;          // 'naver' | 'brunch' | 'instagram' 등
}

export interface SmartImageResult {
  url: string;
  source: ImageSource;
  alt: string;
  caption?: string;
  author?: string;
}

// Unsplash API 연동
async function searchUnsplash(
  keyword: string, 
  count: number, 
  apiKey: string
): Promise<Array<{url: string, source: 'unsplash', alt: string, author: string, downloadLocation: string}>> {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=${count}&orientation=landscape`,
      { 
        headers: { 
          'Authorization': `Client-ID ${apiKey}` 
        }
      }
    );
    
    if (!response.ok) {
      console.error('Unsplash API 오류:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    const results = data.results || [];
    
    return results.map((img: any) => ({
      url: img.urls.regular, // 1080x resolution
      source: 'unsplash' as const,
      alt: img.alt_description || img.description || keyword,
      author: img.user.name,
      downloadLocation: img.links.download_location
    }));
  } catch (error) {
    console.error('Unsplash API 오류:', error);
    return [];
  }
}

// AI 이미지 생성 (DALL-E 3)
async function generateAIImage(prompt: string, apiKey: string): Promise<string> {
  console.log(`🎨 AI 이미지 생성: "${prompt}"`);
  
  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard'
    });
    
    return response.data[0].url || '';
  } catch (error) {
    console.error('DALL-E API 오류:', error);
    // 실패 시 플레이스홀더 반환
    return `https://via.placeholder.com/1024x1024.png?text=${encodeURIComponent(prompt)}`;
  }
}

// 이미지 소스 통합 함수
export async function fetchSmartImages(params: {
  userImages: string[],
  keywords: string[],
  requiredCount: number,
  unsplashKey?: string,
  openaiKey?: string
}): Promise<SmartImageResult[]> {
  const { userImages, keywords, requiredCount, unsplashKey, openaiKey } = params;
  const images: SmartImageResult[] = [];
  
  // 1️⃣ 사용자 업로드 이미지 우선 사용
  userImages.forEach((url, i) => {
    images.push({ 
      url, 
      source: 'user_upload', 
      alt: `사용자 업로드 이미지 ${i+1}`,
      caption: `업로드 이미지 ${i+1}`
    });
  });
  
  console.log(`✅ 사용자 이미지: ${images.length}개 추가`);
  
  // 2️⃣ 부족하면 Unsplash 무료 이미지 검색
  if (images.length < requiredCount && unsplashKey) {
    const needed = requiredCount - images.length;
    console.log(`🔍 Unsplash 검색 시작: "${keywords[0]}" (${needed}개 필요)`);
    
    const unsplashImages = await searchUnsplash(keywords[0], needed, unsplashKey);
    unsplashImages.forEach(img => {
      images.push({
        url: img.url,
        source: 'unsplash',
        alt: img.alt,
        caption: `Photo by ${img.author} on Unsplash`,
        author: img.author
      });
    });
    
    console.log(`✅ Unsplash 이미지: ${unsplashImages.length}개 추가`);
  }
  
  // 3️⃣ 여전히 부족하면 AI 이미지 생성
  if (images.length < requiredCount && openaiKey) {
    const needed = requiredCount - images.length;
    console.log(`🎨 AI 이미지 생성 시작: ${needed}개 필요`);
    
    for (let i = 0; i < needed; i++) {
      try {
        const aiImageUrl = await generateAIImage(
          `${keywords[0]} 관련 이미지 ${i+1}`,
          openaiKey
        );
        images.push({
          url: aiImageUrl,
          source: 'ai_generated',
          alt: `${keywords[0]} - AI 생성 이미지`,
          caption: 'AI로 생성된 이미지'
        });
      } catch (error) {
        console.error(`❌ AI 이미지 생성 실패 (${i+1}):`, error);
      }
    }
    
    console.log(`✅ AI 생성 이미지: ${needed}개 추가 시도`);
  }
  
  return images.slice(0, requiredCount);
}

// API 엔드포인트: 이미지 소스 통합
images.post('/smart-fetch', async (c) => {
  try {
    const body = await c.req.json() as SmartImageRequest;
    const { userImages, keywords, requiredCount, platform } = body;
    
    if (!keywords || keywords.length === 0) {
      return c.json({ success: false, error: '키워드가 필요합니다.' }, 400);
    }
    
    const fetchedImages = await fetchSmartImages({
      userImages: userImages || [],
      keywords,
      requiredCount: requiredCount || 3,
      unsplashKey: c.env.UNSPLASH_ACCESS_KEY,
      openaiKey: c.env.OPENAI_API_KEY
    });
    
    return c.json({ 
      success: true, 
      images: fetchedImages,
      platform 
    });
  } catch (error: any) {
    console.error('이미지 소스 통합 오류:', error);
    return c.json({ 
      success: false, 
      error: error.message || '이미지 가져오기 실패' 
    }, 500);
  }
});

export default images;
