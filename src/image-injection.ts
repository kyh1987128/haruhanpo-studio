// 네이버 블로그 이미지 자동 배치 시스템
import type { SmartImageResult } from './routes/images';

/**
 * 네이버 블로그 콘텐츠에 이미지를 자동으로 배치합니다.
 * 
 * @param content - AI가 생성한 순수 텍스트 콘텐츠
 * @param images - 사용할 이미지 배열 (user_upload, unsplash, ai_generated)
 * @returns HTML 형식의 완성된 콘텐츠 (이미지 포함)
 */
export function injectImagesIntoBlogContent(
  content: string,
  images: SmartImageResult[]
): string {
  if (!images || images.length === 0) {
    return content;
  }
  
  // 문단 구분 (##로 시작하는 소제목 기준)
  const sections = content.split(/(?=##\s)/g);
  
  // 이미지가 배치될 위치 계산
  const totalSections = sections.length;
  const imageCount = images.length;
  const imageInterval = Math.max(1, Math.floor(totalSections / imageCount));
  
  let result = '';
  let imageIndex = 0;
  
  sections.forEach((section, index) => {
    // 섹션 추가
    result += section;
    
    // 이미지 삽입 (일정 간격마다 + 마지막 섹션은 제외)
    if (
      imageIndex < imageCount && 
      (index + 1) % imageInterval === 0 &&
      index < totalSections - 1
    ) {
      const img = images[imageIndex];
      result += `\n\n<figure style="text-align: center; margin: 30px 0;">\n`;
      result += `  <img src="${img.url}" alt="${img.alt}" style="max-width: 100%; height: auto; border-radius: 8px;">\n`;
      if (img.caption) {
        result += `  <figcaption style="font-size: 14px; color: #666; margin-top: 10px;">\n`;
        result += `    ${img.caption}\n`;
        result += `  </figcaption>\n`;
      }
      result += `</figure>\n\n`;
      imageIndex++;
    }
  });
  
  return result;
}

/**
 * 브런치 마크다운 콘텐츠에 이미지를 자동으로 배치합니다.
 * 
 * @param content - AI가 생성한 순수 텍스트 콘텐츠
 * @param images - 사용할 이미지 배열
 * @returns 마크다운 형식의 완성된 콘텐츠 (이미지 포함)
 */
export function injectImagesIntoBrunchContent(
  content: string,
  images: SmartImageResult[]
): string {
  if (!images || images.length === 0) {
    return content;
  }
  
  // 문단 구분 (##로 시작하는 소제목 기준)
  const sections = content.split(/(?=##\s)/g);
  
  // 이미지가 배치될 위치 계산
  const totalSections = sections.length;
  const imageCount = images.length;
  const imageInterval = Math.max(1, Math.floor(totalSections / imageCount));
  
  let result = '';
  let imageIndex = 0;
  
  sections.forEach((section, index) => {
    // 섹션 추가
    result += section;
    
    // 이미지 삽입 (마크다운 형식)
    if (
      imageIndex < imageCount && 
      (index + 1) % imageInterval === 0 &&
      index < totalSections - 1
    ) {
      const img = images[imageIndex];
      result += `\n\n![${img.alt}](${img.url})\n`;
      if (img.caption) {
        result += `*${img.caption}*\n\n`;
      }
      imageIndex++;
    }
  });
  
  return result;
}

/**
 * 인스타그램 콘텐츠에 이미지 메타데이터를 추가합니다.
 * 
 * @param content - AI가 생성한 인스타그램 콘텐츠
 * @param images - 사용할 이미지 배열
 * @returns 이미지 메타데이터가 포함된 콘텐츠
 */
export function addInstagramImageMetadata(
  content: string,
  images: SmartImageResult[]
): string {
  if (!images || images.length === 0) {
    return content;
  }
  
  // 인스타그램은 이미지를 별도로 업로드하므로
  // 콘텐츠에는 이미지 설명만 추가
  let result = content;
  
  // 이미지 정보를 콘텐츠 하단에 메모로 추가
  result += '\n\n---\n📸 이미지 정보:\n';
  images.forEach((img, index) => {
    result += `${index + 1}. ${img.alt}\n`;
    result += `   출처: ${img.source === 'user_upload' ? '사용자 업로드' : img.source === 'unsplash' ? 'Unsplash' : 'AI 생성'}\n`;
    if (img.caption) {
      result += `   캡션: ${img.caption}\n`;
    }
  });
  
  return result;
}

/**
 * HTML을 네이버 블로그 복사-붙여넣기 최적화 형식으로 변환합니다.
 * - HTML 태그 제거
 * - 이미지는 [이미지] 표시로 변환
 * - 깔끔한 순수 텍스트 유지
 */
export function convertHtmlToNaverText(html: string): string {
  return html
    // figure 태그를 [이미지] 표시로 변환
    .replace(/<figure[^>]*>.*?<\/figure>/gs, '\n\n[📸 이미지]\n\n')
    // 나머지 HTML 태그 제거
    .replace(/<[^>]+>/g, '')
    // 연속된 줄바꿈 정리
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
