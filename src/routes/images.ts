// 이미지 소스 통합 시스템
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import OpenAI from 'openai';
import { analyzeImageWithGemini } from '../gemini';

type Bindings = {
  OPENAI_API_KEY: string;
  UNSPLASH_ACCESS_KEY?: string;
  PEXELS_API_KEY?: string;
  PIXABAY_API_KEY?: string;
  GEMINI_API_KEY?: string;
};

const images = new Hono<{ Bindings: Bindings }>();

// CORS 설정
images.use('/*', cors());

export type ImageSource = 'user_upload' | 'unsplash' | 'pexels' | 'pixabay' | 'ai_generated';

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

// Pexels API 연동
async function searchPexels(
  keyword: string, 
  count: number, 
  apiKey: string
): Promise<Array<{url: string, source: 'pexels', alt: string, author: string}>> {
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=${count}&orientation=landscape`,
      { 
        headers: { 
          'Authorization': apiKey
        }
      }
    );
    
    if (!response.ok) {
      console.error('Pexels API 오류:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    const results = data.photos || [];
    
    return results.map((img: any) => ({
      url: img.src.large2x, // 1880x1253 resolution
      source: 'pexels' as const,
      alt: img.alt || keyword,
      author: img.photographer
    }));
  } catch (error) {
    console.error('Pexels API 오류:', error);
    return [];
  }
}

// Pixabay API 연동
async function searchPixabay(
  keyword: string, 
  count: number, 
  apiKey: string
): Promise<Array<{url: string, source: 'pixabay', alt: string, author: string}>> {
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(keyword)}&image_type=photo&per_page=${count}&orientation=horizontal`
    );
    
    if (!response.ok) {
      console.error('Pixabay API 오류:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    const results = data.hits || [];
    
    return results.map((img: any) => ({
      url: img.largeImageURL, // 1280x resolution
      source: 'pixabay' as const,
      alt: img.tags || keyword,
      author: img.user
    }));
  } catch (error) {
    console.error('Pixabay API 오류:', error);
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
  pexelsKey?: string,
  pixabayKey?: string,
  openaiKey?: string,
  geminiKey?: string
}): Promise<SmartImageResult[]> {
  const { userImages, keywords, requiredCount, unsplashKey, pexelsKey, pixabayKey, openaiKey, geminiKey } = params;
  const images: SmartImageResult[] = [];
  
  // 1️⃣ 사용자 업로드 이미지 우선 사용 (Gemini AI 분석)
  for (let i = 0; i < userImages.length; i++) {
    const url = userImages[i];
    let caption = `업로드 이미지 ${i+1}`;
    
    // Gemini로 이미지 분석
    if (geminiKey) {
      try {
        console.log(`🔍 이미지 ${i+1} 분석 중...`);
        const analysis = await analyzeImageWithGemini(geminiKey, url);
        caption = analysis;
        console.log(`✅ 이미지 ${i+1} 분석 완료`);
      } catch (error) {
        console.error(`❌ 이미지 ${i+1} 분석 실패:`, error);
        caption = `이미지 ${i+1}`;
      }
    }
    
    images.push({ 
      url, 
      source: 'user_upload', 
      alt: `이미지 ${i+1}`,
      caption: caption
    });
  }
  
  console.log(`✅ 사용자 이미지: ${images.length}개 추가`);
  
  // 2️⃣ 부족하면 무료 이미지 API 순차 검색 (Unsplash → Pexels → Pixabay)
  if (images.length < requiredCount) {
    const needed = requiredCount - images.length;
    const perApi = Math.ceil(needed / 3); // 각 API에서 가져올 개수
    
    // 2-1. Unsplash 검색
    if (unsplashKey) {
      console.log(`🔍 Unsplash 검색 시작: "${keywords[0]}" (${perApi}개 요청)`);
      const unsplashImages = await searchUnsplash(keywords[0], perApi, unsplashKey);
      unsplashImages.forEach(img => {
        if (images.length < requiredCount) {
          images.push({
            url: img.url,
            source: 'unsplash',
            alt: img.alt,
            caption: `Photo by ${img.author} on Unsplash`,
            author: img.author
          });
        }
      });
      console.log(`✅ Unsplash 이미지: ${unsplashImages.length}개 추가`);
    }
    
    // 2-2. Pexels 검색
    if (images.length < requiredCount && pexelsKey) {
      console.log(`🔍 Pexels 검색 시작: "${keywords[0]}" (${perApi}개 요청)`);
      const pexelsImages = await searchPexels(keywords[0], perApi, pexelsKey);
      pexelsImages.forEach(img => {
        if (images.length < requiredCount) {
          images.push({
            url: img.url,
            source: 'pexels',
            alt: img.alt,
            caption: `Photo by ${img.author} on Pexels`,
            author: img.author
          });
        }
      });
      console.log(`✅ Pexels 이미지: ${pexelsImages.length}개 추가`);
    }
    
    // 2-3. Pixabay 검색
    if (images.length < requiredCount && pixabayKey) {
      console.log(`🔍 Pixabay 검색 시작: "${keywords[0]}" (${perApi}개 요청)`);
      const pixabayImages = await searchPixabay(keywords[0], perApi, pixabayKey);
      pixabayImages.forEach(img => {
        if (images.length < requiredCount) {
          images.push({
            url: img.url,
            source: 'pixabay',
            alt: img.alt,
            caption: `Image by ${img.author} on Pixabay`,
            author: img.author
          });
        }
      });
      console.log(`✅ Pixabay 이미지: ${pixabayImages.length}개 추가`);
    }
  }
  
  // 3️⃣ 여전히 부족하면 플레이스홀더 사용 (DALL-E 3 비용 방지)
  if (images.length < requiredCount) {
    const needed = requiredCount - images.length;
    console.log(`⚠️ 이미지 부족: ${needed}개 부족 (플레이스홀더 사용)`);
    console.log(`💡 무료 API 키 상태: Unsplash=${!!unsplashKey}, Pexels=${!!pexelsKey}, Pixabay=${!!pixabayKey}`);
    
    for (let i = 0; i < needed; i++) {
      images.push({
        url: `https://via.placeholder.com/1024x1024.png?text=${encodeURIComponent(keywords[0] || '이미지')}`,
        source: 'ai_generated',
        alt: `${keywords[0]} 플레이스홀더 이미지`,
        caption: '이미지 준비 중'
      });
    }
    
    console.log(`✅ 플레이스홀더 이미지: ${needed}개 추가 (비용 0원)`);
  }
  
  // ⚠️ DALL-E 3 비용 폴백 비활성화됨
  // 이유: 예기치 않은 비용 발생 방지 ($0.04/image)
  // 필요 시 관리자가 수동으로 AI 이미지 생성 기능 활성화 가능
  
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
      pexelsKey: c.env.PEXELS_API_KEY,
      pixabayKey: c.env.PIXABAY_API_KEY,
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
