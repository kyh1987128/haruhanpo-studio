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
  if (!images || images.length === 0) {
    return content;
  }

  // 문단 구분 (##로 시작하는 소제목 기준)
  const sections = content.split(/(?=##\s)/g);
  const totalSections = sections.length;
  const imageCount = images.length;
  const imageInterval = Math.max(1, Math.floor(totalSections / imageCount));

  let result = '';
  let imageIndex = 0;

  sections.forEach((section, index) => {
    // 섹션 추가
    result += section;

    // 이미지 가이드 삽입 (일정 간격마다)
    if (
      imageIndex < imageCount &&
      (index + 1) % imageInterval === 0 &&
      index < totalSections - 1
    ) {
      const img = images[imageIndex];
      const sectionTitle = section.match(/##\s+(.+)/)?.[1] || `${index + 1}번째 섹션`;
      const isUserUploaded = imageIndex < userUploadedCount;

      result += '\n\n';
      result += '┌─────────────────────────────────────┐\n';
      result += `│ 📸 이미지 배치 가이드 #${imageIndex + 1}            │\n`;
      result += '├─────────────────────────────────────┤\n';
      result += `│ 배치 위치: "${sectionTitle}" 섹션 뒤  │\n`;
      result += '│                                     │\n';

      if (isUserUploaded) {
        result += `│ 1순위: 업로드한 이미지 ${imageIndex + 1}            │\n`;
        result += `│   • 설명: ${img.alt.substring(0, 20)}...         │\n`;
        if (img.caption) {
          result += `│   • 캡션: ${img.caption.substring(0, 20)}...       │\n`;
        }
      } else {
        result += '│ 1순위: 무료 이미지 사용 권장        │\n';
        result += `│   • 출처: ${img.source === 'unsplash' ? 'Unsplash' : img.source === 'pexels' ? 'Pexels' : 'Pixabay'}           │\n`;
        result += `│   • 키워드: ${img.alt.substring(0, 18)}...       │\n`;
      }

      result += '│                                     │\n';
      result += '│ 2순위: 무료 이미지 추천             │\n';
      result += '│   • Unsplash: unsplash.com/search   │\n';
      result += '│   • Pexels: pexels.com/search       │\n';
      result += '│                                     │\n';
      result += '│ 크기: 가로 100%, 세로 자동          │\n';
      result += `│ Alt 텍스트: "${img.alt.substring(0, 15)}..."     │\n`;
      result += '└─────────────────────────────────────┘\n';
      result += '\n';

      imageIndex++;
    }
  });

  return result;
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
  if (!images || images.length === 0) {
    return content;
  }

  const mainImage = images[0];
  const isUserUploaded = userUploadedCount > 0;

  let guide = '\n\n';
  guide += '═══════════════════════════════════════════════\n';
  guide += '🎬 유튜브 썸네일 이미지 가이드\n';
  guide += '═══════════════════════════════════════════════\n\n';

  guide += '┌─────────────────────────────────────┐\n';
  guide += '│ 📺 썸네일 이미지 선택                │\n';
  guide += '├─────────────────────────────────────┤\n';

  if (isUserUploaded) {
    guide += '│ 추천: 업로드한 이미지 1 (메인)      │\n';
    guide += `│   • 설명: ${mainImage.alt.substring(0, 20)}...       │\n`;
  } else {
    guide += '│ 추천: 무료 이미지 사용              │\n';
    guide += `│   • 출처: ${mainImage.source === 'unsplash' ? 'Unsplash' : mainImage.source === 'pexels' ? 'Pexels' : 'Pixabay'}              │\n`;
  }

  guide += '│                                     │\n';
  guide += '│ 권장 크기: 1280x720 (16:9 비율)     │\n';
  guide += '│ 최소 크기: 640x360                  │\n';
  guide += '│ 최대 용량: 2MB                      │\n';
  guide += '│                                     │\n';
  guide += '│ 💡 썸네일 디자인 팁:                │\n';
  guide += '│   • 제목 텍스트 오버레이 권장       │\n';
  guide += '│   • 얼굴이 있으면 시선 집중 ↑       │\n';
  guide += '│   • 밝고 선명한 이미지 선택         │\n';
  guide += '│   • 텍스트는 큰 폰트 (70pt 이상)   │\n';
  guide += '└─────────────────────────────────────┘\n\n';

  guide += '📌 유튜브 스튜디오 업로드 방법:\n';
  guide += '1. 유튜브 스튜디오 접속\n';
  guide += '2. [동영상] → [업로드] 클릭\n';
  guide += '3. 동영상 업로드 후 "썸네일" 섹션에서\n';
  guide += '4. [맞춤 썸네일 업로드] 클릭하여 이미지 추가\n\n';

  return content + guide;
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
  // 네이버 블로그와 동일한 가이드 사용
  let result = injectBlogImageGuide(content, images, userUploadedCount);

  // 브런치 전용 안내 추가
  result += '\n\n';
  result += '═══════════════════════════════════════════════\n';
  result += '📝 브런치 이미지 업로드 방법\n';
  result += '═══════════════════════════════════════════════\n\n';
  result += '1. 브런치 에디터에서 콘텐츠 작성 모드 진입\n';
  result += '2. 위 가이드 위치에서 [이미지 추가] 아이콘 클릭\n';
  result += '3. 권장 이미지 업로드 (가로 1200px 이상 권장)\n';
  result += '4. 이미지 설명(Alt)은 가이드의 텍스트 참고\n\n';
  result += '💡 브런치 팁:\n';
  result += '  • 이미지는 좌/중/우 정렬 가능\n';
  result += '  • 캡션은 이미지 아래 자동 표시\n';
  result += '  • 고품질 이미지 사용 권장 (독자 몰입도 ↑)\n\n';

  return result;
}
