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
}

type ContentCategory = 'person' | 'service' | 'product' | 'general';

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
  '패션': `
- 스타일, 코디, 계절감 언급을 적절히 포함한다.
- 가격·구매 링크는 과도하게 강조하지 않는다.`,
  '문화/예술': `
- 작업 세계관, 기획 의도, 관객과의 관계를 중심으로 서술한다.
- 지나치게 상업적인 표현은 자제한다.`,
  '기본': `
- 독자가 실제로 얻을 수 있는 정보와 경험에 초점을 맞춘다.`
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
- 이 글은 '인물 소개/브랜드 스토리'에 초점을 맞춘다.
- 인물의 배경, 가치관, 작업 방식, 사례 등을 중심으로 서술한다.
- 이미지는 분위기와 스타일을 참고만 하며, 의류/제품 리뷰로 흘러가지 않는다.`,
    service: `
- 이 글은 '서비스 소개'와 '문제 해결 과정'에 초점을 맞춘다.
- 고객이 겪는 문제 → 서비스가 제공하는 해결책 → 실제 사례 → 프로세스 순으로 설명한다.`,
    product: `
- 이 글은 '제품/상품 경험 리뷰'에 초점을 맞춘다.
- 다만 과장된 광고 문구 대신 실제 사용 경험과 장단점을 균형 있게 다룬다.`,
    general: `
- 이 글은 입력된 키워드와 산업 분야를 바탕으로 가장 자연스러운 구조를 자유롭게 선택해 작성한다.`
  };

  // 공통 ROLE + 입력
  const header = `🎯 ROLE
너는 네이버 블로그에 최적화된 콘텐츠 작성자다.
어떤 산업, 어떤 제품, 어떤 타겟에도 적용 가능해야 한다.
광고 문장, 보고서 문장, 프롬프트 흔적을 절대 남기지 않는다.
"사람이 직접 경험하고 쓴 글"처럼 보여야 한다.

📊 INPUT

브랜드명: ${params.brand}
${additionalInfo.length ? additionalInfo.join('\n') + '\n' : ''}핵심 키워드: ${params.keywords}
산업 분야: ${params.industry}
톤앤매너: ${params.tone}
타겟 연령대: ${params.targetAge}
콘텐츠 카테고리: ${category}
이미지 반영 비중: 약 ${Math.round(imageWeight * 100)}%

제공 이미지 설명:
${params.imageDescription}

이미지는 위 설명 수준에서만 참고한다.
핵심은 '${category}' 카테고리에 맞춰 ${
    category === 'person'
      ? '인물과 스토리'
      : category === 'service'
      ? '서비스의 가치와 문제 해결 과정'
      : category === 'product'
      ? '제품을 사용해 본 실제 경험'
      : '독자가 얻을 수 있는 정보'
  }를 중심으로 쓰는 것이다.
`;

  // 공통 최소 규칙 (하드 룰)
  const hardRules = `
📌 OUTPUT 기본 규칙 (필수)

- 공백 포함 3,000~4,000자 범위에서 자연스럽게 작성한다.
- 네이버 블로그 순수 텍스트 (HTML 태그 사용 금지).
- 문단은 2~4줄 정도로 나누되, 필요하면 유연하게 조절한다.
- 키워드는 문맥에 어색하지 않게 여러 번 등장시키되, 과도한 반복은 피한다.
- 과장·단정 표현은 피하고, 경험 기반의 표현을 사용한다.
- 이모티콘은 과하게 사용하지 않는다 (필요할 때만 소량 사용 가능).

금지 사항:
- "여러분", "~해요", "~죠?"와 같은 전형적인 광고 문투.
- "SEO", "메타", "가이드", "체크리스트" 등 메타 표현.
- <p>, <div>, <table> 등 모든 HTML 태그.
- 과도한 이모티콘 나열.
- "완벽한", "최고의", "강력 추천" 등 지나친 과장 표현.
`;

  // 카테고리별 구조 안내 (권장, 필수 아님)
  const structureGuide = `
📌 글 구조 가이드 (권장, 상황에 맞게 조정 가능)

${structureByCategory[category]}

아래 예시는 참고용 구조이며, 입력 내용과 가장 잘 맞는 흐름을 선택해 사용한다.

- 도입: 독자의 현재 상황과 고민에 공감하는 짧은 이야기.
- 본문1: 대상(인물/서비스/제품)을 처음 접했을 때의 인상, 맥락.
- 본문2: 실제로 경험하거나 사용해 본 흐름, 구체적인 상황 묘사, 장단점.
- 본문3: 다른 선택지나 이전 경험과 비교했을 때 느낀 차이.
- 정리: 이런 사람/상황에 특히 잘 맞는지, 어떤 경우에는 맞지 않을 수 있는지.
- 결론: 독자가 스스로 선택할 수 있도록 여지를 남기는 마무리.
`;

  // 산업/톤/연령대 규칙 조합
  const dynamicRules = `
📌 산업·톤·연령대별 추가 스타일

${pickRule(industryRules, params.industry)}
${pickRule(toneRules, params.tone)}
${pickRule(ageRules, params.targetAge)}
`;

  // 출력 형식 예시 (너무 촘촘하지 않게)
  const outputFormat = `
📝 출력 형식 (예시)

[제목]

[도입]
2~4줄 단락 2~3개.

[본문]
여러 단락으로 나누어 구체적인 경험과 사례를 서술한다.
편했던 점과 아쉬웠던 점을 함께 적는다.

[정리]
추천 대상/비추천 대상, 남는 인상과 판단을 담는다.
결론은 단정하지 말고, "상황에 따라 다를 수 있다"는 여지를 남긴다.

${params.website ? `\n추가 정보: ${params.website}` : ''}
${params.contact ? `문의: ${params.contact}` : ''}

---

#태그1 #태그2 #태그3 #태그4 #태그5 #태그6 #태그7 #태그8 #태그9 #태그10
`;

  return header + hardRules + structureGuide + dynamicRules + outputFormat;
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
