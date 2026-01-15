// 스마트 추천 시스템: 플랫폼별 도구 매핑
// 콘텐츠 생성 후 다음 단계 도구를 자동으로 추천

// HTML 로드 및 삽입
let recommendationPanelLoaded = false;

async function loadRecommendationPanelHTML() {
  if (recommendationPanelLoaded) return;
  
  try {
    const response = await fetch('/static/recommendation-panel.html');
    const html = await response.text();
    
    // body 끝에 추가
    document.body.insertAdjacentHTML('beforeend', html);
    recommendationPanelLoaded = true;
  } catch (error) {
    console.error('추천 패널 HTML 로드 실패:', error);
  }
}

const platformToolRecommendations = {
  // Instagram 릴스
  instagram_reels: {
    videoTools: ['runway', 'pika', 'capcut', 'clipchamp'],
    imageTools: ['canva', 'midjourney', 'dalle', 'photopea'],
    otherTools: ['chatgpt', 'claude', 'gemini']
  },
  
  // YouTube 숏폼
  youtube_shorts: {
    videoTools: ['capcut', 'runway', 'pika', 'clipchamp'],
    imageTools: ['canva', 'photopea', 'pixlr'],
    otherTools: ['chatgpt', 'claude', 'vrew']
  },
  
  // YouTube 롱폼
  youtube_longform: {
    videoTools: ['capcut', 'clipchamp', 'descript', 'vrew'],
    imageTools: ['canva', 'photopea', 'pixlr'],
    otherTools: ['chatgpt', 'claude', 'gemini']
  },
  
  // 네이버 블로그
  naver_blog: {
    imageTools: ['canva', 'photopea', 'pixlr', 'removebg'],
    videoTools: [],
    otherTools: ['chatgpt', 'claude', 'gemini']
  },
  
  // 브런치
  brunch: {
    imageTools: ['canva', 'photopea', 'pixlr'],
    videoTools: [],
    otherTools: ['chatgpt', 'claude', 'gemini']
  },
  
  // 기본 (플랫폼 매핑 없을 때)
  default: {
    imageTools: ['canva', 'photopea', 'pixlr'],
    videoTools: ['capcut', 'clipchamp'],
    otherTools: ['chatgpt', 'claude', 'gemini']
  }
};

// 플랫폼별 SNS 채널 매핑
const platformSNSMapping = {
  instagram_reels: 'instagram',
  youtube_shorts: 'youtube',
  youtube_longform: 'youtube',
  naver_blog: 'naver_blog',
  brunch: 'brunch'
};

// 추천 도구 가져오기
function getRecommendedTools(platform) {
  const mapping = platformToolRecommendations[platform] || platformToolRecommendations.default;
  return {
    sns: platformSNSMapping[platform] || null,
    videoTools: mapping.videoTools || [],
    imageTools: mapping.imageTools || [],
    otherTools: mapping.otherTools || []
  };
}

// 사용자 워크플로우에서 매칭되는 도구 찾기
function findUserWorkflows(toolNames, category, userWorkflows) {
  const categoryWorkflows = userWorkflows[category] || [];
  return toolNames
    .map(toolName => {
      // 이름으로 매칭 (예: 'runway' → 'Runway Gen-3')
      return categoryWorkflows.find(w => 
        w.name.toLowerCase().includes(toolName.toLowerCase()) ||
        w.display_name.toLowerCase().includes(toolName.toLowerCase())
      );
    })
    .filter(Boolean); // null 제거
}

// 기본 도구에서 추천 가져오기
async function getDefaultToolRecommendations(toolNames, category) {
  if (!window.supabaseClient) return [];
  
  try {
    const { data, error } = await window.supabaseClient
      .from('default_tool_recommendations')
      .select('*')
      .eq('category', category)
      .in('name', toolNames)
      .order('priority_order', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('기본 도구 추천 가져오기 실패:', error);
    return [];
  }
}

// 최종 추천 목록 생성 (사용자 도구 우선)
async function generateRecommendations(platform, userWorkflows) {
  const recommended = getRecommendedTools(platform);
  const result = {
    sns: [],
    videoTools: [],
    imageTools: [],
    otherTools: []
  };

  // SNS 채널 추천
  if (recommended.sns) {
    const userSNS = (userWorkflows.sns || []).find(w => 
      w.name.toLowerCase().includes(recommended.sns.toLowerCase())
    );
    if (userSNS) {
      result.sns.push(userSNS);
    } else {
      // 기본 도구에서 가져오기
      const defaultSNS = await getDefaultToolRecommendations([recommended.sns], 'sns');
      result.sns = defaultSNS;
    }
  }

  // 영상 도구 추천
  const userVideoTools = findUserWorkflows(recommended.videoTools, 'video_tool', userWorkflows);
  if (userVideoTools.length > 0) {
    result.videoTools = userVideoTools;
  } else {
    const defaultVideoTools = await getDefaultToolRecommendations(recommended.videoTools, 'video_tool');
    result.videoTools = defaultVideoTools.slice(0, 3); // 최대 3개
  }

  // 이미지 도구 추천
  const userImageTools = findUserWorkflows(recommended.imageTools, 'image_tool', userWorkflows);
  if (userImageTools.length > 0) {
    result.imageTools = userImageTools;
  } else {
    const defaultImageTools = await getDefaultToolRecommendations(recommended.imageTools, 'image_tool');
    result.imageTools = defaultImageTools.slice(0, 3); // 최대 3개
  }

  // 기타 도구 추천
  const userOtherTools = findUserWorkflows(recommended.otherTools, 'other_tool', userWorkflows);
  if (userOtherTools.length > 0) {
    result.otherTools = userOtherTools.slice(0, 2); // 최대 2개
  } else {
    const defaultOtherTools = await getDefaultToolRecommendations(recommended.otherTools, 'other_tool');
    result.otherTools = defaultOtherTools.slice(0, 2); // 최대 2개
  }

  return result;
}

// 추천 패널 표시 (콘텐츠 생성 완료 후 호출)
async function showSmartRecommendations(platforms) {
  if (!platforms || platforms.length === 0) return;
  
  // HTML 먼저 로드
  await loadRecommendationPanelHTML();
  
  // showRecommendationPanel은 recommendation-panel.html에 정의됨
  if (typeof window.showRecommendationPanel === 'function') {
    window.showRecommendationPanel(platforms);
  }
}

// 전역 함수 노출
window.getRecommendedTools = getRecommendedTools;
window.generateRecommendations = generateRecommendations;
window.showSmartRecommendations = showSmartRecommendations;
window.loadRecommendationPanelHTML = loadRecommendationPanelHTML;
