// 네이버 블로그 이미지 자동 배치 시스템
import type { SmartImageResult } from './routes/images';

/**
 * 네이버 블로그 콘텐츠에 이미지 배치 가이드를 추가합니다.
 * 
 * @param content - AI가 생성한 순수 텍스트 콘텐츠
 * @param images - 사용할 이미지 배열 (user_upload, unsplash, ai_generated)
 * @returns 이미지 배치 가이드가 포함된 콘텐츠
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
    
    // 이미지 배치 가이드 삽입 (일정 간격마다 + 마지막 섹션은 제외)
    if (
      imageIndex < imageCount && 
      (index + 1) % imageInterval === 0 &&
      index < totalSections - 1
    ) {
      const img = images[imageIndex];
      const imageNumber = imageIndex + 1;
      
      result += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      result += `📸 이미지 ${imageNumber} 배치 위치\n`;
      result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      result += `👉 파일명: ${img.alt || `이미지${imageNumber}`}\n`;
      result += `👉 설명: ${img.caption || img.alt || '이미지 설명'}\n`;
      result += `👉 출처: ${img.source === 'user_upload' ? '사용자 업로드' : img.source === 'unsplash' ? 'Unsplash' : img.source === 'pexels' ? 'Pexels' : img.source === 'pixabay' ? 'Pixabay' : 'AI 생성'}\n`;
      result += `\n💡 여기에 위 이미지를 삽입하세요\n`;
      result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      imageIndex++;
    }
  });
  
  return result;
}

/**
 * 브런치 마크다운 콘텐츠에 이미지 배치 가이드를 추가합니다.
 * 
 * @param content - AI가 생성한 순수 텍스트 콘텐츠
 * @param images - 사용할 이미지 배열
 * @returns 이미지 배치 가이드가 포함된 콘텐츠
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
    
    // 이미지 배치 가이드 삽입 (마크다운 형식)
    if (
      imageIndex < imageCount && 
      (index + 1) % imageInterval === 0 &&
      index < totalSections - 1
    ) {
      const img = images[imageIndex];
      const imageNumber = imageIndex + 1;
      
      result += `\n\n---\n`;
      result += `📸 **이미지 ${imageNumber} 배치 위치**\n\n`;
      result += `- **파일명**: ${img.alt || `이미지${imageNumber}`}\n`;
      result += `- **설명**: ${img.caption || img.alt || '이미지 설명'}\n`;
      result += `- **출처**: ${img.source === 'user_upload' ? '사용자 업로드' : img.source === 'unsplash' ? 'Unsplash' : img.source === 'pexels' ? 'Pexels' : img.source === 'pixabay' ? 'Pixabay' : 'AI 생성'}\n`;
      result += `\n💡 **마크다운 삽입 예시**:\n`;
      result += `\`\`\`\n`;
      result += `![${img.alt || '이미지'}](이미지_URL_입력)\n`;
      result += `*${img.caption || '이미지 설명'}*\n`;
      result += `\`\`\`\n`;
      result += `---\n\n`;
      
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

/**
 * 네이버 블로그/브런치 콘텐츠에 상세한 이미지 배치 가이드를 추가합니다.
 * 
 * @param content - 원본 콘텐츠
 * @param images - 사용할 이미지 배열
 * @param userUploadedCount - 사용자가 실제 업로드한 이미지 개수
 * @returns 가이드가 추가된 콘텐츠
 */
export function injectBlogImageGuide(
  content: string,
  images: SmartImageResult[],
  userUploadedCount: number
): string {
  // ✅ 이미지 가이드 완전 제거 - 콘텐츠만 반환
  return content;
}

/**
 * 유튜브 롱폼 콘텐츠에 썸네일 이미지 가이드를 추가합니다.
 * 
 * @param content - 원본 콘텐츠
 * @param images - 사용할 이미지 배열
 * @param userUploadedCount - 사용자가 실제 업로드한 이미지 개수
 * @returns 썸네일 가이드가 추가된 콘텐츠
 */
export function injectYoutubeThumbnailGuide(
  content: string,
  images: SmartImageResult[],
  userUploadedCount: number
): string {
  // ✅ 이미지 가이드 완전 제거 - 콘텐츠만 반환
  return content;
}

/**
 * 브런치 콘텐츠에 이미지 배치 가이드를 추가합니다.
 * (네이버 블로그와 동일한 형식이지만 마크다운 언급 추가)
 * 
 * @param content - 원본 콘텐츠
 * @param images - 사용할 이미지 배열
 * @param userUploadedCount - 사용자가 실제 업로드한 이미지 개수
 * @returns 가이드가 추가된 콘텐츠
 */
export function injectBrunchImageGuide(
  content: string,
  images: SmartImageResult[],
  userUploadedCount: number
): string {
  // ✅ 이미지 가이드 완전 제거 - 콘텐츠만 반환
  return content;
}
