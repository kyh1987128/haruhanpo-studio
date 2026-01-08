// 플랫폼별 프롬프트 템플릿

interface PromptParams {
  brand: string;
  companyName?: string;
  businessType?: string;
  location?: string;
  targetGender?: string;
  contact?: string;
  website?: string;
  sns?: string;
  keywords: string;
  tone: '친근한' | '전문가' | '감성적인' | string;
  targetAge: string;
  industry: string;
  imageDescription: string;
  contentStrategy?: 'integrated' | 'image-first' | 'keyword-first' | 'auto'; // 하이브리드 전략
}

type ContentCategory = 'person' | 'service' | 'product' | 'general';

// 하이브리드 전략 타입
export type ContentStrategy = 'integrated' | 'image-first' | 'keyword-first';

// 매칭 분석 결과 인터페이스
export interface MatchingAnalysis {
  isMatch: boolean;
  confidence: number; // 0-100
  strategy: ContentStrategy;
  reason: string;
  imageSummary: string;
  userInputSummary: string;
  recommendation: string;
}

// 1) 카테고리 감지
function detectContentCategory(params: PromptParams): ContentCategory {
  const k = params.keywords.toLowerCase();
  const ind = params.industry.toLowerCase();

  if (
    k.includes('크리에이터') || k.includes('감독') ||
    k.includes('작가') || k.includes('아티스트') ||
    k.includes('디자이너') || k.includes('기획자') ||
    ind.includes('문화') || ind.includes('예술')
  ) return 'person';

  if (
    ind.includes('컨설팅') || ind.includes('에이전시') ||
    ind.includes('제작') || ind.includes('스튜디오') ||
    k.includes('서비스') || k.includes('기획')
  ) return 'service';

  if (
    k.includes('제품') || k.includes('상품') ||
    ind.includes('패션') || ind.includes('뷰티') ||
    ind.includes('식품') || ind.includes('전자')
  ) return 'product';

  return 'general';
}

// 2) 이미지 가중치
function getImageWeight(category: ContentCategory): number {
  switch (category) {
    case 'person': return 0.2;   // 인물: 이미지 보조
    case 'service': return 0.3;  // 서비스: 분위기 참고
    case 'product': return 0.7;  // 제품: 이미지 비중 높음
    default: return 0.5;
  }
}

// 3) 산업/톤/연령대별 추가 규칙 스니펫
const industryRules: Record<string, string> = {
  '패션/의류': `- 스타일, 코디, 계절감 언급을 적절히 포함한다.`,
  '뷰티/코스메틱': `- 성분, 효과, 피부 타입 등을 자연스럽게 언급한다.`,
  '문화/예술': `- 작업 세계관, 기획 의도를 중심으로 서술하되 지나치게 상업적이지 않게 한다.`,
  '': `- 산업 분야가 지정되지 않았으므로, 키워드와 맥락을 바탕으로 자유롭게 작성한다.`,
  '기본': `- 독자가 실제로 얻을 수 있는 정보와 경험에 초점을 맞춘다.`
};

const toneRules: Record<string, string> = {
  '친근한': `
- 구어체를 자연스럽게 사용하되, 과도한 비속어는 쓰지 않는다.
- 이모티콘은 적당히 사용할 수 있지만, 한 문장에 2개를 넘기지 않는다.`,
  '전문가': `
- 존댓말과 전문 용어를 적절히 사용한다.
- 이모티콘은 필요할 때만 드물게 사용하거나 사용하지 않는다.`,
  '감성적인': `
- 감정을 드러내는 표현과 비유를 적절히 사용한다.
- 분위기를 살리는 이모티콘을 소량 사용할 수 있다.`,
  '기본': `
- 과장·선동보다는 차분하고 설득력 있는 어조를 유지한다.`
};

const ageRules: Record<string, string> = {
  '10대': `
- 문장은 짧고 리듬감 있게 쓰며, 트렌디한 표현을 소량 섞을 수 있다.`,
  '20대': `
- 실용적인 정보와 라이프스타일 감성을 함께 담는다.`,
  '30대': `
- 일·생활의 균형, 현실적인 고민을 이해하는 어조를 사용한다.`,
  '기본': `
- 누구나 이해할 수 있는 평이한 어휘를 사용한다.`
};

// 헬퍼: 산업/톤/연령대 키 정규화
function pickRule(map: Record<string, string>, key: string): string {
  // 빈 문자열이면 빈 문자열 규칙 사용, 없으면 기본 규칙
  if (key === '' && map[''] !== undefined) return map[''];
  return map[key] ?? map['기본'];
}

export function getBlogPrompt(params: PromptParams): string {
  const category = detectContentCategory(params);
  const imageWeight = getImageWeight(category);

  const additionalInfo: string[] = [];
  if (params.companyName) additionalInfo.push(`회사명: ${params.companyName}`);
  if (params.businessType) additionalInfo.push(`사업자 유형: ${params.businessType}`);
  if (params.location) additionalInfo.push(`지역: ${params.location}`);
  if (params.targetGender) additionalInfo.push(`타겟 성별: ${params.targetGender}`);
  if (params.contact) additionalInfo.push(`연락처: ${params.contact}`);
  if (params.website) additionalInfo.push(`웹사이트: ${params.website}`);
  if (params.sns) additionalInfo.push(`SNS 계정: ${params.sns}`);

  // 카테고리별 구조 안내 스니펫
  const structureByCategory: Record<ContentCategory, string> = {
    person: `
- 이 글의 주제는 '인물 소개/브랜드 스토리'이다.
- 인물과 관련된 내용(배경, 가치관, 활동, 사례 등)을 중심으로 자유롭게 서술한다.
- 이미지는 전체적인 분위기와 스타일을 참고하는 정도로만 활용한다.
- 이미지에 보이는 의류나 제품을 리뷰하는 방향으로 흘러가지 않는다.`,
    service: `
- 이 글의 주제는 '서비스 소개'이다.
- 서비스와 관련된 내용(가치, 프로세스, 사례, 차별점 등)을 자유롭게 서술한다.
- 이미지는 현장 분위기나 서비스 환경을 참고하는 정도로 활용한다.`,
    product: `
- 이 글의 주제는 '제품/상품 경험'이다.
- 제품과 관련된 내용(특징, 사용 경험, 장단점 등)을 자유롭게 서술한다.
- 이미지를 적극 활용하여 제품 디테일을 구체적으로 묘사할 수 있다.`,
    general: `
- 이 글의 주제와 방향은 입력된 키워드와 맥락을 바탕으로 AI가 자유롭게 판단한다.
- 가장 자연스럽고 독자에게 유익한 구조를 선택해 작성한다.`
  };

  // 공통 ROLE + 입력
  const header = `🎯 ROLE
너는 월 100만 방문자를 보유한 파워 블로거이자 네이버 블로그 SEO 전문가다.
사람이 직접 경험하고 쓴 것처럼 자연스럽고, 광고 느낌 없이, 독자에게 진짜 도움이 되는 글을 작성한다.
어떤 산업, 어떤 제품, 어떤 타겟에도 적용 가능해야 한다.
광고 문장, 보고서 문장, 프롬프트 흔적을 절대 남기지 않는다.

⚠️ 중요: 아래 이미지 분석 결과를 반드시 기반으로 작성하세요.
절대로 상상이나 추측으로 작성하지 마세요.
이미지에 없는 내용을 임의로 추가하지 마세요.

📸 이미지 분석 결과 (⚠️ 필수 반영)
${params.imageDescription}

위 이미지 설명이 콘텐츠의 핵심 기반입니다.
이미지 내용과 일치하지 않는 주제나 소재로 작성하지 마세요.

📊 INPUT

브랜드명: ${params.brand}
${additionalInfo.length ? additionalInfo.join('\n') + '\n' : ''}핵심 키워드: ${params.keywords}
산업 분야: ${params.industry}
톤앤매너: ${params.tone}
타겟 연령대: ${params.targetAge}

📌 콘텐츠 작성 전략
1. 이미지 분석 결과를 주제의 핵심으로 설정
2. 키워드는 이미지 내용과 자연스럽게 연결
3. 이미지에 보이는 실제 요소들을 구체적으로 묘사
4. 콘텐츠 유형: 실사용 후기 / 정보 가이드 / 뉴스 분석 / 비교 리뷰 / 튜토리얼 / 경험담 / 전문 칼럼 중 선택
5. 콘텐츠 카테고리: ${category}

📊 이미지 반영 비중: ${Math.round(imageWeight * 100)}%
${structureByCategory[category]}
`;

  // 공통 최소 규칙 (하드 룰)
  const hardRules = `
📌 블로그 글 작성 필수 조건

✅ 분량 및 구성:
- 총 글자수: 3,200~3,800자 (정확히 이 범위를 준수)
- 단락 구성: 최소 8개 단락 이상
- 이모지: 15~25개 사이 (과도하지 않게, 자연스럽게)
- 키워드 밀도: 1~2% (자연스럽게 반복, 과도한 반복 금지)

✅ 콘텐츠 품질:
- 개인적 경험/일화: 최소 2개 이상 포함 ("제가 직접 해보니...", "사용해 보니..." 등)
- 독자 소통 질문: 최소 3개 이상 ("여러분은 어떠세요?", "혹시 이런 경험 있으신가요?" 등)
- 포맷: 네이버 블로그에 바로 복사-붙여넣기 가능한 순수 텍스트 (HTML 태그 일체 금지)
- 어조: 사람이 직접 경험하고 쓴 것처럼, 광고 느낌 제로

🚫 금지 사항:
- 전형적인 광고 문투 ("여러분", "~해요", "~죠?")
- 메타 표현 ("SEO", "메타", "가이드", "체크리스트")
- 모든 HTML 태그 (<p>, <div>, <table> 등)
- 과도한 이모티콘 나열
- 과장 표현 ("완벽한", "최고의", "강력 추천")
`;

  // 카테고리별 구조 안내 (권장, 필수 아님)
  const structureGuide = `
📌 글 구조 가이드 (참고용, 유연하게 조정)

${structureByCategory[category]}

아래는 참고할 수 있는 일반적인 흐름이다. 실제 내용에 맞춰 자유롭게 조정하라.

- 도입: 독자가 공감할 수 있는 상황이나 맥락 제시
- 본문: 주제에 대한 구체적인 내용 (특징, 경험, 사례, 과정 등)
- 정리: 핵심 내용 요약과 독자가 참고할 수 있는 정보
- 결론: 독자 스스로 판단할 수 있도록 여지를 남김

**중요: 위 구조는 절대적이지 않다. 입력된 브랜드/키워드/맥락에 가장 자연스러운 방식으로 작성하라.**
`;

  // 산업/톤/연령대 규칙 조합
  const dynamicRules = `
📌 산업·톤·연령대별 추가 스타일

${pickRule(industryRules, params.industry)}
${pickRule(toneRules, params.tone)}
${pickRule(ageRules, params.targetAge)}
`;

  // 출력 형식 예시 (구체적 예시 포함)
  const outputFormat = `
📝 2단계: 완전한 블로그 포스트 작성

아래 형식으로 완성된 블로그 글을 작성하세요:

# SEO 최적화 제목 (60자 이내, 메인 키워드 포함)

## 들어가며 (400-500자)
- 독자가 공감할 수 있는 상황이나 맥락 제시
- 2~3개 단락으로 구성
- 자연스러운 이모지 사용 (2~3개)
- 개인적 경험 또는 일화 1개 포함

## 소제목 1 (800-1,000자)
⚠️ "핵심 섹션"이라는 말을 절대 사용하지 마세요.
- 주제와 관련된 자연스러운 소제목 작성 (예: "렌탈스튜디오의 3가지 매력")
- 메인 키워드 자연스럽게 포함 (2~3회)
- 구체적인 경험과 사례 서술
- 이모지 3~5개
- 독자 질문 1개 포함

## 소제목 2 (800-1,000자)
⚠️ "핵심 섹션"이라는 말을 절대 사용하지 마세요.
- 주제와 관련된 자연스러운 소제목 작성 (예: "전문 장비로 퀄리티 UP")
- 서브 키워드 활용
- 비교 및 분석 내용
- 이모지 3~5개
- 독자 질문 1개 포함

## 소제목 3 (600-800자)
⚠️ "핵심 섹션"이라는 말을 절대 사용하지 마세요.
- 주제와 관련된 자연스러운 소제목 작성 (예: "실전 활용 팁")
- 실전 가이드 또는 팁
- 개인적 경험 1개 더 포함
- 이모지 2~4개
- 독자 질문 1개 포함

## 마무리 (400-500자)
- 핵심 내용 요약
- 추천 대상/비추천 대상
- 결론은 단정하지 말고 여지를 남김
- 이모지 2~3개

${params.website ? `\n추가 정보: ${params.website}` : ''}
${params.contact ? `문의: ${params.contact}` : ''}

---

#태그1 #태그2 #태그3 #태그4 #태그5 #태그6 #태그7 #태그8 #태그9 #태그10
(총 10개 태그, 메인 키워드 + 서브 키워드 + 관련 키워드)
`;

  // 전략별 추가 가이드라인
  const strategyGuide = getStrategyGuide(params.contentStrategy || 'auto', category);
  
  return header + hardRules + structureGuide + dynamicRules + strategyGuide + outputFormat;
}

// 전략별 가이드라인 생성 함수
function getStrategyGuide(strategy: string, category: ContentCategory): string {
  if (strategy === 'integrated' || strategy === 'auto') {
    return `
📌 하이브리드 콘텐츠 전략: 통합형 (이미지 + 변수 균형)

✅ 작성 방식:
- **이미지 활용**: 이미지에서 보이는 요소를 구체적으로 묘사 (제품 외관, 색상, 분위기 등)
- **변수 활용**: 사용자가 입력한 키워드, 산업분야, 톤앤매너, 타깃 연령대를 자연스럽게 반영
- **균형 유지**: 이미지와 변수가 서로 보완하며 풍부한 콘텐츠 생성

예시:
- 이미지: 카페 브런치 사진
- 변수: 키워드 "브런치 맛집", 산업분야 "카페/음식점", 톤앤매너 "친근한", 타깃 "20-30대"
→ 작성: "이 카페의 브런치 플레이트를 보면 (이미지), 20-30대가 좋아할 만한 감성적인 비주얼이에요 (변수). 친구와 함께 방문해서 브런치 맛집으로 추천하고 싶네요 (변수)"

✅ 이미지 = 시각적 설명, 변수 = 맥락과 타깃팅!
`;
  }
  
  if (strategy === 'image-first') {
    return `
📌 하이브리드 콘텐츠 전략: 이미지 중심형

⚠️ 중요 지침:
- **이미지 우선**: 이미지에 실제로 보이는 것을 중심으로 작성
- **변수는 보조**: 키워드/산업분야/톤앤매너는 이미지와 자연스럽게 연결될 때만 사용
- **억지 금지**: 이미지와 맞지 않는 변수는 과감히 생략
- **자연스러움 최우선**: 독자가 이질감을 느끼지 않도록

예시:
- 이미지: 레스토랑 스테이크 요리
- 변수: 키워드 "카페"
→ 작성: 이미지에 집중! "육즙이 가득한 스테이크의 비주얼이 압권이에요. 고기 좋아하시는 분들께 강추!" (키워드 "카페"는 생략)

✅ 이미지가 명확하면 이미지를 믿어라!
`;
  }
  
  if (strategy === 'keyword-first') {
    return `
📌 하이브리드 콘텐츠 전략: 변수 중심형 (SEO 최적화)

⚠️ 중요 지침:
- **변수 우선**: 사용자가 입력한 키워드, 산업분야, 톤앤매너, 타깃 연령대를 중심으로 작성
- **이미지는 보조**: 이미지는 분위기 참고 또는 배경 요소로만 활용
- **SEO 최우선**: 키워드 밀도 1-2% 유지 필수, 검색 의도에 맞춘 콘텐츠
- **억지 연결 금지**: 이미지와 키워드가 안 맞으면 이미지는 과감히 무시

예시:
- 이미지: 카페 인테리어
- 변수: 키워드 "보습크림 추천", 산업분야 "뷰티/코스메틱", 톤앤매너 "전문가", 타깃 "30-40대"
→ 작성: 이미지는 무시하고 변수 중심! "30-40대 여성분들께 추천하는 보습크림입니다. 전문가로서 성분을 분석해보니 세라마이드와 히알루론산이 풍부해 건조한 피부에 효과적입니다" (변수 활용, 이미지 무시)

✅ 변수(키워드/산업분야/톤앤매너/타깃)를 모두 활용!
✅ 이미지는 분위기 연출용으로만 활용하거나 무시!
`;
  }
  
  return '';
}

export function getInstagramPrompt(params: PromptParams): string {
  return `당신은 인스타그램 마케팅 전문가입니다.

브랜드: ${params.brand}
키워드: ${params.keywords}
톤: ${params.tone}
타겟: ${params.targetAge}

이미지 설명:
${params.imageDescription}

간결하고 감성적인 캡션을 작성하세요 (300-500자).
해시태그 25-30개 포함.`;
}

export function getThreadsPrompt(params: PromptParams): string {
  return `당신은 스레드(Threads) 콘텐츠 전문가입니다.

브랜드: ${params.brand}
키워드: ${params.keywords}

짧고 강렬한 포스트를 작성하세요 (200-300자).
해시태그 7-10개 포함.`;
}

export function getYouTubePrompt(params: PromptParams): string {
  return `당신은 유튜브 숏폼 전문가입니다.

브랜드: ${params.brand}
키워드: ${params.keywords}

60초 이내 스크립트와 메타데이터를 작성하세요.`;
}

export function getInstagramFeedPrompt(params: PromptParams): string {
  const category = detectContentCategory(params);
  const imageWeight = getImageWeight(category);
  
  const categoryRules = {
    person: `
🎯 **콘텐츠 카테고리: 인물 소개**
- 이 포스트는 **${params.brand}** 님의 활동과 가치관을 소개합니다.
- 이미지는 **분위기만 참고**(비중 ${imageWeight * 100}%)하세요.
- 본문의 **70% 이상**은 인물의 경력, 철학, 작업 스타일을 다루세요.
`,
    service: `
🎯 **콘텐츠 카테고리: 서비스 소개**
- 이 포스트는 **${params.brand}**의 서비스를 소개합니다.
- 이미지는 **현장 분위기 참고**(비중 ${imageWeight * 100}%)입니다.
- 포트폴리오, 프로세스, 차별점을 중심으로 작성하세요.
`,
    product: `
🎯 **콘텐츠 카테고리: 제품 소개**
- 이 포스트는 **${params.brand}** 제품을 소개합니다.
- 이미지를 **적극 활용**(비중 ${imageWeight * 100}%)하세요.
`
  };
  
  const categoryRule = categoryRules[category as keyof typeof categoryRules] || categoryRules.product;
  
  return `🎯 당신은 인스타그램 피드 전문 마케터입니다.

${categoryRule}

📊 INPUT 정보

브랜드: ${params.brand}
키워드: ${params.keywords}
산업: ${params.industry}
톤앤매너: ${params.tone}
타겟: ${params.targetAge} ${params.targetGender || '전체'}

이미지 설명:
${params.imageDescription}

📌 OUTPUT 구조

1. **캡션 (300-500자)**

[훅 문장 - 스크롤 멈추게]
감정/공감/질문으로 시작

[본문 3-5줄]
- 핵심 메시지
- 가치 제공
- 스토리텔링

[CTA]
💬 댓글: 질문으로 참여 유도
💾 저장: 저장 이유 제시
📤 공유: 공유 가치 강조

2. **해시태그 (15-30개)**

대형 (100만+): 3개
중형 (10-100만): 5-7개
소형 (1-10만): 5-7개
니치: 3-5개
브랜드: 2개

3. **카루셀 아이디어 (2-10장)**

슬라이드 1: [커버 - 훅]
슬라이드 2-8: [핵심 콘텐츠]
슬라이드 9: [요약]
슬라이드 10: [CTA]

📝 출력 형식

━━━━━━━━━━━━━━━━
📸 인스타그램 피드 캡션
━━━━━━━━━━━━━━━━

[훅 문장]

[본문 300-500자]

[CTA]
💬 [질문]
💾 [저장 유도]
📤 [공유 제안]

━━━━━━━━━━━━━━━━
#️⃣ 해시태그
━━━━━━━━━━━━━━━━

#태그1 #태그2 #태그3 #태그4 #태그5 #태그6 #태그7 #태그8 #태그9 #태그10

━━━━━━━━━━━━━━━━
📱 카루셀 구성 (선택)
━━━━━━━━━━━━━━━━

슬라이드 1: [제목/훅]
슬라이드 2: [포인트 1]
슬라이드 3: [포인트 2]
...

✅ 최종 체크:
✓ 훅 문장 강력
✓ 본문 300-500자
✓ 해시태그 15-30개
✓ CTA 명확
✓ 저장 가치 제공`;
}

// 추가 플랫폼 프롬프트 (간소화)
export function getYoutubeLongformPrompt(params: PromptParams): string {
  return `유튜브 롱폼 시나리오 전문가입니다. 5-10분 영상 시나리오를 작성하세요.`;
}

export function getShortformPrompt(params: PromptParams): string {
  return `숏폼 통합 전문가입니다. 틱톡/릴스/쇼츠 최적화 대본을 작성하세요.`;
}

export function getMetadataPrompt(params: PromptParams): string {
  return `메타데이터 생성 전문가입니다. 썸네일, 제목, 설명, 태그를 작성하세요.`;
}

// ===================================
// 신규 플랫폼: Twitter
// ===================================
export function getTwitterPrompt(params: PromptParams): string {
  return `당신은 Twitter 마케팅 전문가입니다.

브랜드: ${params.brand}
키워드: ${params.keywords}
산업: ${params.industry}
톤앤매너: ${params.tone}
타겟: ${params.targetAge}

이미지 설명:
${params.imageDescription}

**절대적 제약:**
- **최대 280자** (공백, 해시태그 포함, 초과 절대 금지)
- 한글 기준 약 140자
- 해시태그 포함 시 글자 수에 포함

작성 요구사항:
1. 훅(Hook): 첫 20자로 스크롤 멈추기
2. 핵심 메시지: 명확하고 간결하게
3. CTA: 행동 유도 (클릭, RT, 좋아요)
4. 해시태그: 3-5개 (30자 이내)
5. 이모티콘: 적절히 사용 (2-3개)

출력 형식:
━━━━━━━━━━━━━━━━
🐦 트위터 포스트
━━━━━━━━━━━━━━━━

[본문 200-250자]

#태그1 #태그2 #태그3

━━━━━━━━━━━━━━━━
📊 글자 수: [정확한 글자 수 표시]
━━━━━━━━━━━━━━━━

⚠️ 최종 체크:
✓ 280자 이내 (공백 포함) - 필수!
✓ 훅 문장 명확
✓ CTA 포함
✓ 해시태그 3-5개
✓ 이모티콘 2-3개`;
}
