// 플랫폼별 프롬프트 템플릿

interface PromptParams {
  brand: string;
  companyName?: string;        // 회사 상호명
  businessType?: string;        // 사업자 유형
  location?: string;            // 지역
  targetGender?: string;        // 타겟 성별
  contact?: string;             // 연락처
  website?: string;             // 웹사이트
  sns?: string;                 // SNS 계정
  keywords: string;
  tone: string;
  targetAge: string;
  industry: string;
  imageDescription: string;
}

export function getBlogPrompt(params: PromptParams): string {
  const additionalInfo = [];
  if (params.companyName) additionalInfo.push(`회사명: ${params.companyName}`);
  if (params.businessType) additionalInfo.push(`사업자 유형: ${params.businessType}`);
  if (params.location) additionalInfo.push(`지역: ${params.location}`);
  if (params.targetGender) additionalInfo.push(`타겟 성별: ${params.targetGender}`);
  if (params.contact) additionalInfo.push(`연락처: ${params.contact}`);
  if (params.website) additionalInfo.push(`웹사이트: ${params.website}`);
  if (params.sns) additionalInfo.push(`SNS 계정: ${params.sns}`);
  
  return `당신은 SEO 전문가이자 네이버 블로그 최적화 전문 작가입니다. 아래 정보를 바탕으로 네이버 검색 상위 노출을 위한 블로그 포스팅을 작성해주세요.

📌 입력 정보
브랜드명: ${params.brand}
${additionalInfo.length > 0 ? additionalInfo.join('\n') + '\n' : ''}핵심 키워드: ${params.keywords}
톤앤매너: ${params.tone}
타겟 연령대: ${params.targetAge}
산업 분야: ${params.industry}
이미지 설명: ${params.imageDescription}

📊 작성 요구사항

1. 제목 (Title)
- SEO 최적화된 제목 1개 작성
- 30-35자 이내
- 핵심 키워드 포함 (자연스럽게)
- 클릭을 유도하는 흥미로운 표현
- 숫자나 리스트형 제목 우선 (예: "5가지 방법", "완벽 가이드")
- 이모지 1-2개 사용 가능 (과하지 않게)

2. 본문 (Content)
- 최소 1,300자 이상, 최대 2,000자 이하
- 4-6개 단락으로 구성

본문 구조:
도입부 (200-250자):
- 독자의 공감을 이끌어내는 질문이나 상황 제시
- "여러분도 이런 고민 있으시죠?" 같은 친근한 접근
- 본문에서 다룰 내용 미리보기

문제 제기 또는 배경 설명 (250-300자):
- 타겟 독자가 겪는 구체적인 문제 설명
- 실제 사례나 트렌드 언급 (가능하면)
- 이 주제가 왜 중요한지 강조

핵심 내용 (600-900자):
- 2-4개 소제목(##)으로 나누어 작성
- 각 섹션마다 이모지 활용 (📌, 💡, ✅, 🔑 등)
- 리스트 형식 적극 활용
- 중요 키워드는 **굵게** 강조
- 실용적이고 구체적인 정보 제공
- 개인적 경험이나 팁 포함 (자연스럽게)

마무리 (200-250자):
- 핵심 내용 요약
- 독자에게 질문 던지기
- 행동 유도 문구 (CTA)
- 댓글 유도 ("여러분의 경험도 댓글로 들려주세요!")

글쓰기 스타일:
✅ 대화체 사용 ("~해요", "~죠?")
✅ 다양한 문장 길이 (짧은 문장과 긴 문장 섞기)
✅ 질문형 문장으로 독자와 소통
✅ 감정을 나타내는 형용사/부사 사용
✅ 비유와 은유로 어려운 개념 쉽게 설명
✅ 개인적 의견 표현 ("제 생각에는...")
✅ 적절한 유머 사용 (너무 가볍지 않게)
✅ 개행과 띄어쓰기로 가독성 확보
🚫 딱딱한 설명조 지양
🚫 전문 용어 남발 금지 (필요 시 쉽게 풀어 설명)

3. 이미지 키워드 (Image Keywords)
- 픽사베이 등 무료 이미지 사이트용
- 3-5개 키워드 제공
- 영문으로 작성 (예: "business meeting", "cozy cafe")
- 두 번째 단락 바로 아래에 배치
- 형식: 📸 추천 이미지 키워드: keyword1, keyword2, keyword3

4. 태그 (Tags)
- 네이버 블로그용 태그 10개
- 형식: #태그1 #태그2 #태그3 ...
- 키워드 관련성 높은 순서로 배치
- 대분류 → 중분류 → 소분류 순서

5. SEO 메타데이터
- 메타 설명 (150자): 검색 결과에 표시될 요약문
- 추천 URL 슬러그: 영문으로 (예: best-skincare-routine)

📝 출력 형식

[제목]

[도입부 본문 - 200-250자]

[이미지 1 위치]

[문제 제기/배경 설명 - 250-300자]

📸 추천 이미지 키워드: keyword1, keyword2, keyword3

📌 소제목 1
[본문 내용]

✅ 포인트 1: [설명]
✅ 포인트 2: [설명]

[이미지 2 위치]

💡 소제목 2
[본문 내용]

[마무리 본문 - 200-250자]

---

태그: #태그1 #태그2 #태그3 #태그4 #태그5 #태그6 #태그7 #태그8 #태그9 #태그10

메타 설명: [150자 요약]

추천 URL: best-example-post

⚠️ 최종 검증
작성 완료 후 다음을 반드시 확인:
✓ 글자 수: 1,300자 이상 2,000자 이하 (공백 포함)
✓ 단락 수: 4-6개
✓ 키워드 자연스럽게 3-5회 포함
✓ 이모지 적절히 사용 (과하지 않게)
✓ 소제목(##) 2-4개
✓ 리스트(✅, 📌) 활용
✓ CTA 포함
✓ 이미지 키워드 제공

미달 또는 초과 시 내용을 조정하여 재작성하세요.`;
}

export function getInstagramPrompt(params: PromptParams): string {
  const additionalInfo = [];
  if (params.companyName) additionalInfo.push(`회사명: ${params.companyName}`);
  if (params.businessType) additionalInfo.push(`사업자 유형: ${params.businessType}`);
  if (params.location) additionalInfo.push(`지역: ${params.location}`);
  if (params.targetGender) additionalInfo.push(`타겟 성별: ${params.targetGender}`);
  if (params.sns) additionalInfo.push(`SNS 계정: ${params.sns}`);
  
  return `당신은 인스타그램 마케팅 전문가이자 바이럴 콘텐츠 크리에이터입니다. 아래 정보를 바탕으로 높은 참여율을 유도하는 인스타그램 포스팅을 작성해주세요.

📌 입력 정보
브랜드명: ${params.brand}
${additionalInfo.length > 0 ? additionalInfo.join('\n') + '\n' : ''}핵심 키워드: ${params.keywords}
톤앤매너: ${params.tone}
타겟 연령대: ${params.targetAge}
산업 분야: ${params.industry}
이미지 설명: ${params.imageDescription}

📊 작성 요구사항

1. 메인 캡션 (Main Caption)
- 200-300자 분량
- 3-7줄로 구성 (각 줄마다 줄바꿈)
- 첫 줄: 훅(Hook) - 스크롤을 멈추게 하는 강렬한 문장
- 중간 줄: 핵심 메시지 전달
- 마지막 줄: CTA (Call to Action)

캡션 스타일 가이드:
✅ 짧고 임팩트 있는 문장
✅ 이모지 적극 활용 (각 줄 앞에 1-2개)
✅ 질문이나 공감 유도 표현
✅ ${params.tone}에 맞는 어조
   - 캐주얼: 반말, 친근함 ("이거 완전 대박이야!")
   - 전문가: 존댓말, 전문성 ("전문가가 추천하는")
   - 감성: 서정적, 감성적 ("소중한 순간을 위해")
✅ 브랜드 가치나 제품 혜택 강조
🚫 지나치게 광고스러운 표현 지양

예시 구조:
🌟 [훅 문장 - 주목을 끄는 질문이나 선언]

✨ [핵심 메시지 1]
💡 [핵심 메시지 2]

👉 [CTA - 행동 유도]

2. 해시태그 (Hashtags)
- 총 25-30개
- 3가지 카테고리로 분류:

대분류 (5-7개):
- 산업/분야 관련 일반 태그
- 검색량 높은 태그
- 예: #뷰티, #패션, #일상, #라이프스타일

중분류 (10-12개):
- 브랜드/제품 관련 구체적 태그
- 타겟층 관련 태그
- 예: #20대뷰티, #직장인패션, #서울카페

소분류 (8-10개):
- 니치(Niche) 태그
- 브랜드만의 독특한 태그
- 예: #세라마이드크림, #강남신사동카페

해시태그 작성 규칙:
✅ 한글 + 영문 혼합 (70% 한글, 30% 영문)
✅ 인기 태그 + 틈새 태그 조합
✅ 브랜드명 태그 포함
✅ 위치 태그 (해당 시) 포함
✅ 트렌디한 태그 포함
🚫 너무 일반적인 태그만 나열 금지
🚫 관련 없는 태그 사용 금지

3. 추가 전략 정보
- 게시 최적 시간대:
  타겟 연령대별 활동 시간 고려
  예: 20-30대 직장인 → 오후 6-9시, 주말 오전

- 스토리 활용 아이디어 (3개):
  스토리용 간단한 멘트와 스티커 활용 아이디어
  예: "이 제품 써본 사람? 🙋‍♀️ [투표 스티커]"

- 릴스 연계 아이디어:
  이 포스트를 릴스로 만든다면 어떤 구성?
  15-30초 분량 스크립트 개요

📝 출력 형식

📸 인스타그램 캡션

🌟 [훅 문장]

✨ [메시지 1]
💡 [메시지 2]
🎯 [메시지 3]

.
.
.

👉 [CTA]

---

#️⃣ 해시태그

대분류: #태그1 #태그2 #태그3 #태그4 #태그5

중분류: #태그6 #태그7 #태그8 #태그9 #태그10 #태그11 #태그12 #태그13

소분류: #태그14 #태그15 #태그16 #태그17 #태그18 #태그19 #태그20 #태그21

추가 태그: #태그22 #태그23 #태그24 #태그25 #태그26 #태그27 #태그28 #태그29 #태그30

---

📊 게시 전략

최적 게시 시간: [요일] [시간대]

스토리 활용 아이디어:
1. [아이디어 1]
2. [아이디어 2]
3. [아이디어 3]

릴스 연계 아이디어: [15-30초 스크립트 개요]

⚠️ 최종 검증
✓ 캡션 200-300자
✓ 이모지 적절히 사용
✓ 해시태그 25-30개
✓ 대/중/소분류 구분
✓ 한글/영문 혼합
✓ CTA 포함
✓ 브랜드 태그 포함`;
}

export function getThreadsPrompt(params: PromptParams): string {
  const additionalInfo = [];
  if (params.companyName) additionalInfo.push(`회사명: ${params.companyName}`);
  if (params.location) additionalInfo.push(`지역: ${params.location}`);
  if (params.targetGender) additionalInfo.push(`타겟 성별: ${params.targetGender}`);
  
  return `당신은 스레드(Threads) 콘텐츠 전문가입니다. 짧고 임팩트 있는 텍스트 중심 콘텐츠로 빠른 인게이지먼트를 유도하세요.

📌 입력 정보
브랜드명: ${params.brand}
${additionalInfo.length > 0 ? additionalInfo.join('\n') + '\n' : ''}핵심 키워드: ${params.keywords}
톤앤매너: ${params.tone}
타겟 연령대: ${params.targetAge}
산업 분야: ${params.industry}
이미지 설명: ${params.imageDescription}

📊 작성 요구사항

1. 메인 포스트 텍스트
- 200-300자 분량
- 짧고 강렬한 메시지
- 스레드 특성: 트위터 같은 짧은 호흡, 인스타보다 덜 시각적

구조:
[훅 문장] 💡

[핵심 메시지 2-3줄]

[질문 또는 CTA]

스타일 가이드:
✅ 대화하듯 편안한 어조
✅ 짧은 문장, 간결한 표현
✅ 이모지 최소화 (1-3개만)
✅ 질문이나 논쟁적 의견으로 토론 유도
✅ "여러분은 어떻게 생각하세요?" 같은 참여 유도
🚫 과도한 꾸밈 금지
🚫 광고성 멘트 지양

2. 해시태그
- 7-10개만 (스레드는 해시태그 적게 사용)
- 핵심 키워드 위주
- 트렌딩 토픽 반영

3. 스레드 확장 아이디어 (선택)
- 메인 포스트 아래 이어질 2-3개 추가 스레드 제안
- 각 150자 이내

4. 인게이지먼트 전략
- 댓글 유도 질문
- 투표(Poll) 활용 아이디어
- 리포스트 유도 방법

📝 출력 형식

🧵 스레드 메인 포스트

[훅 문장] 💡

[메시지 1]
[메시지 2]

[질문 또는 CTA] 🤔

---

#️⃣ 해시태그
#태그1 #태그2 #태그3 #태그4 #태그5 #태그6 #태그7

---

🔗 확장 스레드 (선택)

스레드 2: [150자 추가 내용]

스레드 3: [150자 추가 내용]

---

💬 인게이지먼트 전략

댓글 유도 질문: "[구체적 질문]"

투표 아이디어:
- 선택지 A: [옵션]
- 선택지 B: [옵션]

리포스트 유도: [어떻게 공감과 공유를 유도할지]

⚠️ 최종 검증
✓ 200-300자
✓ 이모지 1-3개
✓ 해시태그 7-10개
✓ 참여 유도 질문 포함
✓ 톤앤매너 일치`;
}

export function getYouTubePrompt(params: PromptParams): string {
  const additionalInfo = [];
  if (params.companyName) additionalInfo.push(`회사명: ${params.companyName}`);
  if (params.location) additionalInfo.push(`지역: ${params.location}`);
  if (params.targetGender) additionalInfo.push(`타겟 성별: ${params.targetGender}`);
  if (params.website) additionalInfo.push(`웹사이트: ${params.website}`);
  
  return `당신은 유튜브 숏폼 전문 크리에이터이자 영상 마케팅 전문가입니다. 60초 이내 숏폼 영상용 완벽한 스크립트와 메타데이터를 작성하세요.

📌 입력 정보
브랜드명: ${params.brand}
${additionalInfo.length > 0 ? additionalInfo.join('\n') + '\n' : ''}핵심 키워드: ${params.keywords}
톤앤매너: ${params.tone}
타겟 연령대: ${params.targetAge}
산업 분야: ${params.industry}
이미지 설명: ${params.imageDescription}

📊 작성 요구사항

1. 영상 스크립트 (Video Script)
- 총 분량: 45-60초 (약 150-200단어)
- 3단 구조: 훅 → 메인 → CTA

훅 (Hook) - 0~3초:
- 시청자의 스크롤을 멈추게 하는 강렬한 첫 문장
- 질문, 놀라운 사실, 논쟁적 의견
- 예: "이거 모르면 손해봅니다!", "3초만 투자하세요"

메인 콘텐츠 (Main Content) - 3~45초:
- 핵심 정보를 3-5개 포인트로 나누어 전달
- 각 포인트는 간결하게 (한 문장 또는 두 문장)
- 나레이션 형태로 작성 (자막과 함께 사용 가능)
- 감정 표현과 비유 사용
- 대화하듯 자연스러운 어조

CTA (Call to Action) - 45~60초:
- 명확한 행동 유도
- 예: "좋아요와 구독!", "링크는 설명란에!", "댓글로 알려주세요!"

스크립트 작성 스타일:
✅ 구어체, 말하듯이 작성
✅ 짧은 문장 (한 문장 = 한 호흡)
✅ 감정 표현 (놀람, 공감, 유머)
✅ 리듬감 있는 전개
✅ 반복과 강조 ("정말 중요합니다", "꼭 기억하세요")
🚫 복잡한 설명 지양
🚫 전문 용어 최소화

2. 자막 표시 가이드 (Subtitle Guide)
- 스크립트의 핵심 키워드 강조 표시
- 예: **강조할 단어**, [화면에 크게 띄울 텍스트]

3. 영상 제목 (Video Title)
- 클릭을 유도하는 제목 3개 제안
- 각 제목: 40-50자 이내
- 키워드 포함 (SEO 최적화)
- 숫자, 이모지 활용 가능
- 호기심 유발 요소

제목 유형:
- 리스트형: "5가지 꿀팁", "3가지 방법"
- 질문형: "혹시 이거 아세요?", "이거 정상인가요?"
- 명령형: "지금 바로 확인하세요!", "이것만은 꼭!"
- 해결형: "○○ 고민 해결법", "완벽 가이드"

4. 영상 설명 (Description)
- 첫 3줄이 중요 (더보기 누르기 전 노출)
- 150-200자 분량
- 키워드 자연스럽게 포함
- CTA 및 링크 포함

구조:
[핵심 내용 요약 1-2줄]

[상세 설명 2-3줄]

🔗 관련 링크: [URL]
💌 협업 문의: [이메일]
📌 SNS: [인스타그램 등]

#태그1 #태그2 #태그3

5. 태그 (Tags)
- 10-15개
- 키워드 관련성 높은 순서
- 영문 + 한글 혼합
- 예: 뷰티, beauty, 스킨케어, skincare, 20대추천

6. 썸네일 텍스트 (Thumbnail Text)
- 화면에 표시될 텍스트 2-3개 제안
- 각 10자 이내
- 큰 글씨로 눈에 띄게
- 예: "대박 꿀팁", "지금 확인", "3초 정리"

7. 영상 편집 가이드 (Video Editing Guide)
- 권장 배경 음악 장르: [장르]
- 화면 전환 빈도: [초당 1-2번 / 3-4번]
- 자막 스타일: [굵게 / 그림자 / 색상 변경]
- 이펙트 추천: [줌인/줌아웃, 텍스트 애니메이션 등]

📝 출력 형식

🎬 유튜브 숏폼 스크립트

📺 스크립트 (45-60초)

[훅 - 0~3초]
[강렬한 첫 문장]

[메인 콘텐츠 - 3~45초]

포인트 1: [내용] **[강조 단어]**

포인트 2: [내용]

포인트 3: [내용] [화면 텍스트: "○○○"]

포인트 4: [내용]

[CTA - 45~60초]
[행동 유도 멘트]

---

🎯 영상 제목 (3개 제안)

1. [제목 옵션 1] (42자)
2. [제목 옵션 2] (45자) ⭐ 추천
3. [제목 옵션 3] (40자)

---

📄 영상 설명

[첫 줄 - 핵심 요약]
[둘째 줄 - 부연 설명]

[상세 설명 2-3줄]

🔗 관련 링크: [URL]
💌 협업 문의: ${params.brand}@email.com
📌 인스타그램: @${params.brand}

#태그1 #태그2 #태그3 #태그4 #태그5

---

🏷️ 태그 (10-15개)
태그1, 태그2, 태그3, 태그4, 태그5, 태그6, 태그7, 태그8, 태그9, 태그10

---

🖼️ 썸네일 텍스트 (3개 제안)

1. "[텍스트 1]" (7자)
2. "[텍스트 2]" (9자) ⭐ 추천
3. "[텍스트 3]" (10자)

---

🎨 편집 가이드

배경 음악: [장르 예: 경쾌한 팝, 차분한 어쿠스틱]

화면 전환: 3-4초마다 장면 또는 텍스트 전환

자막 스타일:
- 폰트: 굵은 고딕체
- 색상: 흰색 + 검정 외곽선
- 애니메이션: 단어별 등장

이펙트:
- 줌인/줌아웃 (강조 시)
- 텍스트 팝업 (핵심 키워드)
- 트랜지션: 빠른 컷

⚠️ 최종 검증
✓ 스크립트 45-60초 분량
✓ 훅 문장 강렬함
✓ 3-5개 포인트 구조
✓ CTA 명확함
✓ 제목 3개 제안
✓ 썸네일 텍스트 제안
✓ 태그 10-15개
✓ 편집 가이드 포함`;
}
