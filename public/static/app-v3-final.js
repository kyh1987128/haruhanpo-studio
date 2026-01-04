// ===================================
// Multi-Platform Content Generator v3.2 Final
// 백엔드 API 키, 확장된 프로필 관리
// ===================================

// 전역 변수
let selectedImages = []; // 더 이상 사용 안 함 (개별 콘텐츠로 변경)
let contentBlocks = {}; // { 0: { images: [], keywords: '', topic: '', description: '' }, 1: {...}, ... }
let resultData = {};
let savedProfiles = [];
let contentHistory = [];
let customTemplates = [];
let currentEditImageIndex = null;
let lastFormData = null; // 재시도용

// LocalStorage 키
const STORAGE_KEYS = {
  PROFILES: 'content_generator_profiles',
  HISTORY: 'content_generator_history',
  CURRENT_PROFILE: 'content_generator_current_profile',
  TEMPLATES: 'content_generator_templates',
};

// 비용 상수 (USD) - GPT-4o 기준
const COSTS = {
  IMAGE_ANALYSIS: 0.01, // 이미지 1장당 분석 비용
  BLOG: 0.04,
  INSTAGRAM: 0.03,
  INSTAGRAM_FEED: 0.03,
  INSTAGRAM_REELS: 0.04,
  THREADS: 0.02,
  YOUTUBE: 0.04,
  YOUTUBE_SHORTS: 0.04,
  YOUTUBE_LONGFORM: 0.08, // 롱폼은 더 길고 복잡하므로 2배
  TIKTOK: 0.04,
  SHORTFORM_MULTI: 0.05, // 멀티플랫폼 최적화 추가 비용
  METADATA_GENERATION: 0.03,
};

// 환율 정보
let EXCHANGE_RATE = 1300; // 기본값
let lastExchangeUpdate = null;

// 기본 템플릿
const DEFAULT_TEMPLATES = {
  blog: `당신은 네이버 블로그 SEO 최적화 및 마케팅 콘텐츠 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

【작성 목표】
제공된 이미지를 분석하여, 네이버 검색 상위 노출과 높은 전환율을 동시에 달성하는 블로그 포스트를 작성하세요.

【필수 작성 요소】

1. **제목 (Title)**
   - 메인 키워드를 제목 앞부분에 배치
   - 클릭을 유도하는 숫자, 질문형, 혜택 강조
   - 예: "[핵심키워드] Best 3 추천 | 2025년 최신"
   - 30자 이내

2. **서론 (100~150자)**
   - 독자 고민/문제 공감으로 시작
   - "이런 고민 하셨나요?" 형식 후킹
   - 글을 읽으면 얻을 혜택 제시

3. **본문 (1200~1600자)**
   
   3-1. 이미지 분석
   - 제공 이미지의 핵심 특징 3가지
   - 각 특징을 소제목(H3)으로 구조화
   - "왜 중요?" + "효과는?" 설명
   - 구체적 수치 포함
   
   3-2. 타겟 맞춤
   - {타겟연령대}가 공감할 사용 시나리오
   - {산업분야} 최신 트렌드 연결
   - "추천 대상" 리스트 3~5개
   
   3-3. 차별화
   - 경쟁사 대비 우위 설명
   - "다른 점" 명확히
   - 실사용 후기 느낌

4. **결론 및 CTA (150~200자)**
   - 핵심 메시지 한 문장 요약
   - 명확한 행동 유도
   - 긴급성: "한정", "이번 주" 등

5. **해시태그**
   - 키워드 5~8개
   - #핵심키워드 #브랜드명 #타겟추천

【글쓰기 규칙】

✅ 필수:
- 총 1500~2000자 (공백 포함)
- 3~5줄마다 줄바꿈
- 소제목 3~5개 (H3)
- 키워드 밀도 2~3%
- {톤앤매너} 스타일 유지

❌ 금지:
- 과장 표현
- 막연한 수식어
- 50자 넘는 문장
- 전문 용어 남발

【SEO 체크】
- 제목에 키워드 1회
- 첫 100자 내 키워드
- 소제목 3개 이상
- 본문 키워드 5~7회
- CTA 명확히`,
  
  instagram: `당신은 인스타그램 마케팅 및 비주얼 콘텐츠 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

【작성 목표】
제공된 이미지를 분석하여, 높은 참여율(좋아요, 댓글, 저장)과 브랜드 인지도를 높이는 인스타그램 게시글을 작성하세요.

【필수 작성 요소】

1. **후킹 멘트 (첫 3줄)**
   - 스크롤을 멈추게 하는 강력한 질문/공감
   - 예: "😱 이거 모르고 쓰시는 분 많아요!"
   - 이모지 2~3개로 시선 집중
   - {타겟연령대} 타겟 언어 사용

2. **본문 (300~500자)**
   
   2-1. 이미지 설명
   - 제공 이미지의 핵심 포인트 3가지
   - "1️⃣, 2️⃣, 3️⃣" 번호로 구조화
   - 각 포인트당 1~2줄 설명
   
   2-2. 감성 + 효용
   - {톤앤매너} 느낌 살리기
   - "이렇게 하면 ~할 수 있어요"
   - 구체적 혜택 제시
   
   2-3. CTA
   - "❤️ 공감되면 좋아요"
   - "💾 나중에 보려면 저장"
   - "💬 여러분은 어떠세요?"

3. **해시태그 (25~30개)**
   - 키워드 관련 해시태그 10개
   - 브랜드 해시태그 5개
   - {산업분야} 해시태그 10개
   - 타겟 해시태그 5개
   - 믹스: 대형(100만+), 중형(10만+), 소형(1만+)

【글쓰기 규칙】

✅ 필수:
- 총 300~600자 (해시태그 제외)
- 이모지 5~10개 자연스럽게
- 2~3줄마다 줄바꿈
- {톤앤매너} 스타일
- 첫 3줄이 핵심

❌ 금지:
- 딱딱한 문장
- 광고 느낌
- 이모지 과다
- 해시태그 중복

【참여 유도 전략】
- 질문으로 댓글 유도
- 저장 가치 제공
- 공감 포인트 명확히
- DM 유도 자연스럽게`,
  
  threads: `당신은 스레드(Threads) 소셜 대화형 콘텐츠 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

【작성 목표】
제공된 이미지를 분석하여, 빠른 소비와 높은 공유율을 이끌어내는 짧고 강렬한 스레드 포스트를 작성하세요.

【필수 작성 요소】

1. **후킹 (첫 줄)**
   - 충격적 사실/질문으로 시작
   - 예: "🚨 이거 모르면 손해 보는 거예요"
   - 15자 이내로 임팩트

2. **핵심 메시지 (100~250자)**
   
   2-1. 이미지 포인트
   - 제공 이미지의 가장 중요한 1가지
   - "이게 핵심이에요" 직설적 표현
   - 숫자/팩트로 신뢰도 상승
   
   2-2. 실용 정보
   - "진짜 꿀팁" 제공
   - {타겟연령대} 맞춤 언어
   - 1~2문장으로 압축
   
   2-3. 감정 자극
   - 공감/놀람/호기심 중 1개
   - 이모지 1~2개만 사용
   - {톤앤매너} 반영

3. **CTA (마지막 줄)**
   - "어떻게 생각하세요?"
   - "공유해주세요 🔁"
   - 짧고 명확하게

4. **해시태그 (7~10개)**
   - 핵심 키워드 3개
   - 트렌딩 태그 3개
   - 브랜드 태그 2개
   - {산업분야} 태그 2개

【글쓰기 규칙】

✅ 필수:
- 총 200~300자 (해시태그 제외)
- 문장 최대 20자
- 줄바꿈으로 호흡
- 구어체 사용
- {톤앤매너} 유지

❌ 금지:
- 장문 설명
- 어려운 단어
- 이모지 과다 (3개 이하)
- 광고 느낌

【스레드 특성】
- 타임라인 빠른 소비
- 대화하듯 자연스럽게
- 리스레드 유도
- 짧게, 강하게, 명확하게`,
  
  youtube: `당신은 유튜브 숏폼(Shorts) 비디오 마케팅 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

【작성 목표】
제공된 이미지를 분석하여, 60초 이내 숏폼에 최적화된 스크립트와 높은 조회수를 달성하는 메타데이터를 작성하세요.

【필수 작성 요소】

1. **영상 제목 (Title)**
   - 키워드 앞배치 + 호기심 자극
   - 예: "{키워드} 이렇게 하면 100배 효과 😱"
   - 50자 이내
   - 이모지 1~2개

2. **스크립트 (30~60초 분량)**
   
   2-1. 도입 (0~5초)
   - "😱 이거 진짜예요?"
   - 충격 팩트로 시작
   - 첫 3초가 핵심
   
   2-2. 전개 (5~45초)
   - 제공 이미지 핵심 포인트 3가지
   - 각 포인트당 10~15초
   - 짧은 문장 (1문장 5초)
   - {타겟연령대} 공감 시나리오
   - {산업분야} 트렌드 연결
   
   2-3. 마무리 (45~60초)
   - 핵심 메시지 한 줄 요약
   - "좋아요 + 구독" CTA
   - 다음 영상 티저

3. **영상 설명 (Description)**
   
   3-1. 요약 (첫 3줄)
   - 영상 핵심 내용
   - 키워드 자연스럽게 포함
   - 이모지로 가독성
   
   3-2. 타임라인
   - 0:00 인트로
   - 0:05 포인트1
   - 0:20 포인트2
   - 0:35 포인트3
   - 0:50 마무리
   
   3-3. CTA
   - "더 많은 {키워드} 정보는 구독!"
   - 관련 영상 링크

4. **해시태그 (10~15개)**
   - #Shorts (필수)
   - #{키워드} 관련 5개
   - #{산업분야} 3개
   - #브랜드명
   - 트렌딩 태그 3개

5. **자막 가이드**
   - 핵심 단어는 크게
   - 숫자/팩트 강조
   - 이모지 적절히 사용
   - 1초당 3~4글자

【글쓰기 규칙】

✅ 필수:
- 스크립트 300~500자
- 1문장 15자 이내
- {톤앤매너} 유지
- 빠른 템포
- 반복 메시지

❌ 금지:
- 느린 전개
- 복잡한 설명
- 50자 넘는 문장
- 지루한 인트로

【숏폼 최적화】
- 처음 3초가 승부
- 자막 필수
- 빠른 컷 편집 전제
- 세로 영상 (9:16)
- 트렌드 사운드 활용`,

  youtube_shorts: `당신은 유튜브 숏폼(Shorts) 비디오 마케팅 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

【작성 목표】
제공된 이미지를 분석하여, 60초 이내 숏폼에 최적화된 스크립트와 높은 조회수를 달성하는 메타데이터를 작성하세요.

【필수 작성 요소】

1. **영상 제목 (Title)**
   - 키워드 앞배치 + 호기심 자극
   - 예: "{키워드} 이렇게 하면 100배 효과 😱"
   - 50자 이내
   - 이모지 1~2개

2. **스크립트 (30~60초 분량)**
   
   2-1. 도입 (0~5초)
   - "😱 이거 진짜예요?"
   - 충격 팩트로 시작
   - 첫 3초가 핵심
   
   2-2. 전개 (5~45초)
   - 제공 이미지 핵심 포인트 3가지
   - 각 포인트당 10~15초
   - 짧은 문장 (1문장 5초)
   - {타겟연령대} 공감 시나리오
   - {산업분야} 트렌드 연결
   
   2-3. 마무리 (45~60초)
   - 핵심 메시지 한 줄 요약
   - "좋아요 + 구독" CTA
   - 다음 영상 티저

3. **영상 설명 (Description)**
   
   3-1. 요약 (첫 3줄)
   - 영상 핵심 내용
   - 키워드 자연스럽게 포함
   - 이모지로 가독성
   
   3-2. 타임라인
   - 0:00 인트로
   - 0:05 포인트1
   - 0:20 포인트2
   - 0:35 포인트3
   - 0:50 마무리
   
   3-3. CTA
   - "더 많은 {키워드} 정보는 구독!"
   - 관련 영상 링크

4. **해시태그 (10~15개)**
   - #Shorts (필수)
   - #{키워드} 관련 5개
   - #{산업분야} 3개
   - #브랜드명
   - 트렌딩 태그 3개

5. **자막 가이드**
   - 핵심 단어는 크게
   - 숫자/팩트 강조
   - 이모지 적절히 사용
   - 1초당 3~4글자

【글쓰기 규칙】

✅ 필수:
- 스크립트 300~500자
- 1문장 15자 이내
- {톤앤매너} 유지
- 빠른 템포
- 반복 메시지

❌ 금지:
- 느린 전개
- 복잡한 설명
- 50자 넘는 문장
- 지루한 인트로

【숏폼 최적화】
- 처음 3초가 승부
- 자막 필수
- 빠른 컷 편집 전제
- 세로 영상 (9:16)
- 트렌드 사운드 활용`,

  youtube_longform: `당신은 월 조회수 1억 이상의 유튜브 채널을 운영하는 전문 크리에이터입니다.
시청 유지율 70% 이상, 구독 전환율 5% 이상을 달성하는 롱폼 영상 시나리오를 작성합니다.

【브랜드 정보】
- 브랜드/채널: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}
- 예상 길이: 5-10분

【출력 구조】

━━━━━━━━━━━━━━━━━━━━
📌 영상 메타데이터
━━━━━━━━━━━━━━━━━━━━

🏷️ 제목 후보 (3개)
1. [클릭률 최적화 - 60자]
2. [SEO 최적화 - 60자]
3. [호기심 자극 - 60자]

⏱️ 예상 길이: [분:초]
🎯 타겟 유지율: 70%+

━━━━━━━━━━━━━━━━━━━━
🎬 타임라인 스크립트
━━━━━━━━━━━━━━━━━━━━

【00:00-00:30】훅 (Hook)
📹 화면: [카메라/배경/비주얼]
🎤 대사: "[첫 3초 강렬한 훅]"
📝 자막: "[키워드 강조]"
🎵 음향: [BGM/효과음]
💡 유지 전략: [3가지]

【00:30-02:00】본론 1
📌 제목: [섹션 제목]
🔑 포인트: [3가지]
📹 화면: [연출/B-roll]
🎤 대사: "[실제 대사]"
💬 참여: [댓글 유도]

【02:00-06:00】본론 2, 3
[동일 구조]

【06:00-07:00】마무리
📌 요약: [3가지]
🎯 CTA: [구독/좋아요]
🔮 예고: [다음 영상]

━━━━━━━━━━━━━━━━━━━━
🎥 제작 가이드
━━━━━━━━━━━━━━━━━━━━

📷 촬영: [장비/조명/음향]
✂️ 편집: [컷/그래픽/음악]
🔍 SEO: [키워드 배치]
🖼️ 썸네일: [베스트 컷]
📑 챕터: [마커 리스트]

【최종 체크】
✓ 첫 30초 훅 강력
✓ 30초마다 retention hook
✓ 키워드 5-8회 자연 언급
✓ B-roll 타이밍 명시
✓ 16:9 화면비 최적화`,

  shortform_multi: `당신은 틱톡 1000만, 릴스 500만 팔로워 보유 바이럴 크리에이터입니다.
완주율 80% 이상의 숏폼 콘텐츠를 제작합니다.

【브랜드 정보】
- 브랜드: {브랜드명}
- 키워드: {키워드}
- 산업: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤: {톤앤매너}
- 길이: 30-60초

【대상 플랫폼】
틱톡 + 인스타그램 릴스 + 유튜브 쇼츠

【출력 구조】

━━━━━━━━━━━━━━━━━━━━
📱 콘텐츠 전략
━━━━━━━━━━━━━━━━━━━━

💫 바이럴 점수: [1-10]
🎨 스타일: 교육/엔터/트렌드

플랫폼 특화:
📱 틱톡: [듀엣/스티치]
📸 릴스: [저장 유도]
🎬 쇼츠: [SEO/시리즈]

━━━━━━━━━━━━━━━━━━━━
⏱️ 타임라인 (9:16)
━━━━━━━━━━━━━━━━━━━━

【00-03초】훅
📹 화면: [샷/위치/동작]
📝 텍스트: "[오버레이]"
🎤 대사: "[3초 훅]"
🎵 음향: [BGM/효과음]
✂️ 편집: [컷/전환]

【03-15초】본론 1
【15-25초】본론 2
【25-35초】본론 3
【35-45초】CTA

━━━━━━━━━━━━━━━━━━━━
📱 플랫폼별 최적화
━━━━━━━━━━━━━━━━━━━━

【틱톡】
🏷️ #해시태그1 #해시태그2 #해시태그3
📝 캡션: [100자]
🎵 사운드: [트렌드]
🤝 듀엣: Yes/No

【릴스】
🏷️ #5-10개
📝 캡션: [훅+본문+CTA]
💾 저장: [유도 요소]
📖 스토리: [리포스팅 훅]

【쇼츠】
🏷️ 제목: [SEO 60자]
📝 설명: [키워드 포함]
🏷️ 태그: [5개]
🔗 시리즈: [연결]

━━━━━━━━━━━━━━━━━━━━
📐 기술 사양 (9:16)
━━━━━━━━━━━━━━━━━━━━

안전 영역:
상단 10% / 하단 15% / 좌우 5%

텍스트:
메인 12-15% / 보조 8-10%

【최종 체크】
✓ 첫 3초 훅
✓ 30-60초 분량
✓ 9:16 화면비
✓ 플랫폼별 해시태그
✓ 안전 영역 준수`,

  tiktok: `당신은 틱톡 전문 바이럴 크리에이터입니다.
트렌드를 선도하고 듀엣/스티치 유도에 능숙합니다.

【브랜드 정보】
- 브랜드: {브랜드명}
- 키워드: {키워드}
- 타겟: {타겟연령대}
- 톤: {톤앤매너}

【틱톡 특화 전략】

1. 트렌드 사운드 활용
2. 듀엣/스티치 가능성
3. 해시태그 챌린지
4. 첫 1초 강렬한 훅
5. 빠른 컷 편집

【출력 형식】

🎵 추천 사운드: [트렌드 사운드]

⏱️ 타임라인:
00-01초: [강렬한 훅]
01-10초: [메인 메시지]
10-20초: [상세 설명]
20-30초: [CTA + 루프]

🏷️ 해시태그 (3-5개):
#메인키워드 #트렌드태그 #챌린지태그

📝 캡션 (100자):
[훅 문장 + 참여 유도]

🤝 듀엣/스티치:
[가능/불가능 + 유도 전략]`,

  instagram_reels: `당신은 인스타그램 릴스 전문가입니다.
저장율과 공유율이 높은 콘텐츠를 제작합니다.

【브랜드 정보】
- 브랜드: {브랜드명}
- 키워드: {키워드}
- 타겟: {타겟연령대}
- 톤: {톤앤매너}

【릴스 특화 전략】

1. 저장 유도 가치 제공
2. 스토리 리포스팅 훅
3. 미학적 비주얼
4. 라이프스타일 연결
5. 프로필 방문 유도

【출력 형식】

⏱️ 타임라인:
00-03초: [비주얼 훅]
03-20초: [가치 제공]
20-30초: [저장 유도 CTA]

🏷️ 해시태그 (5-10개):
대형 2개 + 중형 5개 + 니치 3개

📝 캡션:
━━━━━━━━━━━━━━━━
[첫 줄 훅 - 더보기 클릭 유도]

[본문 150-300자]
[감정 연결 + 가치 제공]

💾 저장해서 나중에도 보세요
📤 친구에게 공유하기
💬 댓글로 의견 남겨주세요

#해시태그들
━━━━━━━━━━━━━━━━

💾 저장 유도 요소:
- [팁/노하우 제공]
- [다운로드/저장 가치]

📖 스토리 리포스팅:
- [공유하고 싶은 문구]`,

  instagram_feed: `당신은 인스타그램 피드 포스트 전문가입니다.
카루셀과 단일 포스트를 전략적으로 설계합니다.

【브랜드 정보】
- 브랜드: {브랜드명}
- 키워드: {키워드}
- 타겟: {타겟연령대}
- 톤: {톤앤매너}

【피드 전략】

1. 스와이프 유도 (카루셀)
2. 시각적 일관성
3. 스토리텔링
4. 프로필 그리드 조화
5. 저장/공유 가치

【카루셀 구조 (2-10장)】

슬라이드 1: [커버 - 훅]
슬라이드 2-8: [메인 콘텐츠]
슬라이드 9: [요약]
슬라이드 10: [CTA]

【캡션 구조】

━━━━━━━━━━━━━━━━
[첫 줄 강력 훅]

[본문 300-500자]
- 문단 나누기
- 이모지 적절히
- 스토리텔링

[CTA]
💬 댓글: [질문]
💾 저장: [가치]
📤 공유: [친구 태그]

#해시태그 15-30개
━━━━━━━━━━━━━━━━

【비주얼 가이드】
- 색상 팔레트: [브랜드 컬러]
- 폰트: [일관성]
- 레이아웃: [그리드 조화]`,

  metadata_generation: `당신은 유튜브 SEO 전문가이자 소셜미디어 마케팅 전문가입니다.
CTR 15% 이상, 검색 노출 최적화를 달성합니다.

【브랜드 정보】
- 브랜드: {브랜드명}
- 키워드: {키워드}
- 산업: {산업분야}
- 타겟: {타겟연령대}

【출력 구조】

━━━━━━━━━━━━━━━━━━━━
🖼️ 썸네일 전략
━━━━━━━━━━━━━━━━━━━━

텍스트 3개:
1. [임팩트형 - 10자]
2. [질문형 - 15자]
3. [숫자형 - 8자]

비주얼:
- 얼굴: [표정 제안]
- 배경: [구성]
- 그래픽: [요소]

━━━━━━━━━━━━━━━━━━━━
🏷️ 제목 최적화
━━━━━━━━━━━━━━━━━━━━

롱폼 3개:
1. SEO형: [키워드 자연 포함 60자]
2. CTR형: [감정 자극 60자]
3. 바이럴형: [공유 유도 60자]

숏폼 3개:
1. [훅 중심 40자]
2. [트렌드 연계 40자]
3. [질문형 40자]

━━━━━━━━━━━━━━━━━━━━
📝 설명글
━━━━━━━━━━━━━━━━━━━━

【유튜브】
━━━━━━━━━━━━━━━━
[첫 2줄 훅 - 검색 노출]

[본문 300-500자]
[키워드 5-8회 자연 반복]

⏰ 타임스탬프:
0:00 - [섹션1]
0:30 - [섹션2]

🔗 링크:
- [URL1]
- [URL2]

💬 CTA:
구독과 좋아요 부탁드립니다!

#키워드1 #키워드2
━━━━━━━━━━━━━━━━

【인스타그램】
[첫 줄 훅]
[본문 150-300자]
[CTA]
#해시태그들

【틱톡】
[간결 캡션 100자]
[참여 유도]
#해시태그3개

━━━━━━━━━━━━━━━━━━━━
🏷️ 태그 & 해시태그
━━━━━━━━━━━━━━━━━━━━

유튜브 태그 (15-20개):
주요: [5개]
롱테일: [5-10개]
트렌드: [3-5개]

소셜 해시태그:
대형 (100만+): [2-3개]
중형 (10-100만): [5-7개]
니치 (1-10만): [3-5개]
브랜드: [1-2개]

━━━━━━━━━━━━━━━━━━━━
📈 SEO 최적화
━━━━━━━━━━━━━━━━━━━━

주요 키워드: {키워드}
검색량: [월간]
경쟁도: 높음/중간/낮음
난이도: [1-10]

연관 키워드:
- [키워드1]
- [키워드2]
- [키워드3]

【성과 예측】
예상 CTR: [%]
바이럴 점수: [1-10]
참여율: [%]`
};

// ===================================
// 초기화
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  // 데이터 로드
  loadProfiles();
  loadHistory();
  loadTemplates();
  
  // 환율 조회
  await fetchExchangeRate();
  
  // 이벤트 리스너
  setupEventListeners();
  
  // 초기 콘텐츠 블록 생성 (1개)
  generateContentBlocks();
  
  // 비용 초기화
  updateCostEstimate();
  
  // 다국어 초기화
  if (typeof window.i18n !== 'undefined' && typeof window.i18n.init === 'function') {
    window.i18n.init();
  }
}

// ===================================
// 이벤트 리스너 설정
// ===================================
function setupEventListeners() {
  // 이미지 업로드
  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('imageInput');

  if (uploadArea) {
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
  }

  if (imageInput) {
    imageInput.addEventListener('change', handleImageSelect);
  }

  // 폼 제출
  const contentForm = document.getElementById('contentForm');
  if (contentForm) {
    contentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleGenerate();
    });
  }

  // 프로필 관리
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const loadProfileBtn = document.getElementById('loadProfileBtn');

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfile);
  }

  if (loadProfileBtn) {
    loadProfileBtn.addEventListener('click', openLoadProfileModal);
  }

  // 히스토리
  const historyBtn = document.getElementById('historyBtn');
  if (historyBtn) {
    historyBtn.addEventListener('click', openHistoryModal);
  }

  // 템플릿 관리
  const templateBtn = document.getElementById('templateBtn');
  if (templateBtn) {
    templateBtn.addEventListener('click', openTemplateModal);
  }

  // 플랫폼 선택 변경 시 비용 재계산 및 배치 계산
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]');
  platformCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      updateCostEstimate();
      updateBatchCalculation();
    });
  });
}

// ===================================
// 이미지 업로드
// ===================================
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = '#667eea';
  e.currentTarget.style.backgroundColor = '#f0f0ff';
}

function handleDragLeave(e) {
  e.currentTarget.style.borderColor = '#d1d5db';
  e.currentTarget.style.backgroundColor = 'transparent';
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = '#d1d5db';
  e.currentTarget.style.backgroundColor = 'transparent';

  const files = Array.from(e.dataTransfer.files);
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));

  if (imageFiles.length > 0) {
    processImageFiles(imageFiles);
  }
}

function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  processImageFiles(files);
}

async function processImageFiles(files) {
  if (selectedImages.length + files.length > 100) {
    showToast('❌ 최대 100장까지 업로드 가능합니다', 'error');
    return;
  }

  let totalSize = selectedImages.reduce((sum, img) => sum + img.size, 0);
  for (const file of files) {
    totalSize += file.size;
  }

  const maxSize = 200 * 1024 * 1024; // 200MB
  if (totalSize > maxSize) {
    showToast('❌ 총 파일 크기는 200MB를 초과할 수 없습니다', 'error');
    return;
  }

  for (const file of files) {
    const base64 = await fileToBase64(file);
    selectedImages.push({
      name: file.name,
      size: file.size,
      base64: base64,
      url: URL.createObjectURL(file),
    });
  }

  renderImagePreviews();
  updateCostEstimate();
  updateBatchCalculation(); // 배치 계산 업데이트
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  const container = document.getElementById('imagePreviewContainer');
  if (!container) return;

  if (selectedImages.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = selectedImages
    .map(
      (img, index) => `
    <div class="image-preview">
      <img src="${img.url}" alt="${img.name}" />
      <button class="remove-image-btn" onclick="removeImage(${index})">
        <i class="fas fa-times"></i>
      </button>
      <button class="edit-image-btn" onclick="openImageEditor(${index})" title="이미지 편집">
        <i class="fas fa-edit"></i>
      </button>
      <span class="image-name">${img.name}</span>
    </div>
  `
    )
    .join('');
}

function removeImage(index) {
  URL.revokeObjectURL(selectedImages[index].url);
  selectedImages.splice(index, 1);
  renderImagePreviews();
  updateCostEstimate();
  updateBatchCalculation(); // 배치 계산 업데이트
}

// ===================================
// 이미지 편집
// ===================================
function openImageEditor(index) {
  currentEditImageIndex = index;
  const modal = document.getElementById('imageEditorModal');
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');

  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  };
  img.src = selectedImages[index].url;

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function applyImageFilter(filter) {
  const canvas = document.getElementById('editCanvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  switch (filter) {
    case 'grayscale':
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
      break;
    case 'brightness':
      const brightness = 30;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + brightness);
        data[i + 1] = Math.min(255, data[i + 1] + brightness);
        data[i + 2] = Math.min(255, data[i + 2] + brightness);
      }
      break;
    case 'contrast':
      const contrast = 1.2;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * contrast) + 128));
        data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * contrast) + 128));
        data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * contrast) + 128));
      }
      break;
  }

  ctx.putImageData(imageData, 0, 0);
  showToast(`✅ ${filter} 필터가 적용되었습니다`, 'success');
}

function compressImage() {
  const canvas = document.getElementById('editCanvas');
  const quality = 0.7; // 70% 품질
  
  showToast('🔄 이미지 압축 중...', 'info');
  
  setTimeout(() => {
    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
    selectedImages[currentEditImageIndex].base64 = compressedBase64;
    selectedImages[currentEditImageIndex].size = Math.floor(compressedBase64.length * 0.75);
    showToast('✅ 이미지가 70% 품질로 압축되었습니다', 'success');
  }, 300);
}

function saveEditedImage() {
  const canvas = document.getElementById('editCanvas');
  const newBase64 = canvas.toDataURL('image/png');
  
  selectedImages[currentEditImageIndex].base64 = newBase64;
  URL.revokeObjectURL(selectedImages[currentEditImageIndex].url);
  selectedImages[currentEditImageIndex].url = canvas.toDataURL();
  
  renderImagePreviews();
  closeImageEditor();
  showToast('✅ 이미지 편집이 저장되었습니다', 'success');
}

function closeImageEditor() {
  const modal = document.getElementById('imageEditorModal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
  currentEditImageIndex = null;
}

// ===================================
// 비용 계산
// ===================================
async function fetchExchangeRate() {
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간
  const cachedRate = localStorage.getItem('exchange_rate');
  const cachedTime = localStorage.getItem('exchange_rate_time');

  if (cachedRate && cachedTime) {
    const timeDiff = Date.now() - parseInt(cachedTime);
    if (timeDiff < CACHE_DURATION) {
      EXCHANGE_RATE = parseFloat(cachedRate);
      lastExchangeUpdate = new Date(parseInt(cachedTime));
      return;
    }
  }

  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    EXCHANGE_RATE = data.rates.KRW;
    lastExchangeUpdate = new Date();

    localStorage.setItem('exchange_rate', EXCHANGE_RATE.toString());
    localStorage.setItem('exchange_rate_time', Date.now().toString());
  } catch (error) {
    console.error('환율 조회 실패:', error);
    EXCHANGE_RATE = 1300; // 기본값
  }
}

function updateCostEstimate() {
  // 개별 콘텐츠 블록의 총 이미지 수 계산
  let totalImageCount = 0;
  const contentCount = Object.keys(contentBlocks).length;
  
  Object.values(contentBlocks).forEach(block => {
    totalImageCount += (block.images || []).length;
  });
  
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  const platformCount = platformCheckboxes.length;

  if (totalImageCount === 0 || platformCount === 0 || contentCount === 0) {
    document.getElementById('costEstimate').innerHTML = `
      <div style="padding: 1.5rem; text-align: center; background: #f9fafb; border-radius: 12px; border: 2px dashed #d1d5db;">
        <p style="color: #6b7280; margin: 0;">
          📊 콘텐츠별 이미지와 플랫폼을 선택하면 크레딧 정보가 표시됩니다
        </p>
      </div>
    `;
    return;
  }

  // 예상 소요 시간 계산
  const imageAnalysisTime = Math.min(totalImageCount * 3, 5);
  const contentGenerationTime = Math.min(contentCount * platformCount * 10, 30);
  const totalTimeSeconds = imageAnalysisTime + contentGenerationTime;
  const totalTimeMinutes = Math.ceil(totalTimeSeconds / 60);

  // ===================================
  // NEW v7.7: 크레딧 기반 비용 표시
  // ===================================
  
  let costInfoHTML = '';
  let statusBadge = '';
  let gradientColor = '';
  
  if (currentUser.isGuest) {
    // 비회원: 체험 1회 사용
    gradientColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    statusBadge = '<span style="background: rgba(255,255,255,0.3); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">🎁 무료 체험</span>';
    
    costInfoHTML = `
      <div style="background: rgba(255,255,255,0.2); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; text-align: center;">
        <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem;">
          무료 체험 1회 사용 가능
        </div>
        <p style="font-size: 0.95rem; opacity: 0.9; margin: 0;">
          로그인하면 매달 <strong>10회 무료</strong> + 크레딧으로 무제한 사용!
        </p>
      </div>
    `;
  } else if (currentUser.tier === 'free' || currentUser.subscription_status === 'free') {
    // 무료 회원 - 크레딧 시스템 사용
    gradientColor = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    statusBadge = '<span style="background: rgba(255,255,255,0.3); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">🎉 무료 회원</span>';
    
    costInfoHTML = `
      <div style="background: rgba(255,255,255,0.2); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; text-align: center;">
        <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 0.8rem; opacity: 0.9;">
          1 크레딧 차감
        </div>
        <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.3rem;">
          현재 보유: ${currentUser.credits || 0}크레딧
        </div>
        <p style="font-size: 0.9rem; opacity: 0.9; margin: 0;">
          💡 무료 회원은 월 초 10크레딧이 자동 지급됩니다
        </p>
        ${currentUser.credits <= 3 ? `
          <div style="background: rgba(239, 68, 68, 0.3); border: 1px solid rgba(239, 68, 68, 0.5); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
            <p style="margin: 0; font-size: 0.95rem;">
              ⚠️ 크레딧이 부족합니다. <a href="/payment" style="color: white; text-decoration: underline; font-weight: 600;">충전하기</a>
            </p>
          </div>
        ` : ''}
      </div>
    `;
  } else {
    // 유료 회원
    gradientColor = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
    statusBadge = '<span style="background: rgba(255,255,255,0.3); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">⭐ 유료 회원</span>';
    
    costInfoHTML = `
      <div style="background: rgba(255,255,255,0.2); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; text-align: center;">
        <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.3rem;">
          1 크레딧 차감
        </div>
        <p style="font-size: 1.1rem; opacity: 0.9; margin: 0;">
          현재 보유: <strong>${currentUser.credits || 0}크레딧</strong>
        </p>
        ${currentUser.credits === 0 ? `
          <div style="background: rgba(239, 68, 68, 0.3); border: 1px solid rgba(239, 68, 68, 0.5); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
            <p style="margin: 0; font-size: 0.95rem;">
              ⚠️ 크레딧이 부족합니다. <a href="/payment" style="color: white; text-decoration: underline; font-weight: 600;">충전하기</a>
            </p>
          </div>
        ` : ''}
      </div>
    `;
  }

  document.getElementById('costEstimate').innerHTML = `
    <div style="padding: 1.5rem; background: ${gradientColor}; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="font-size: 1.2rem; font-weight: bold; margin: 0;">
          💰 예상 사용 크레딧 및 소요 시간
        </h3>
        ${statusBadge}
      </div>
      
      ${costInfoHTML}
      
      <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span>📸 분석할 이미지:</span>
          <span style="font-weight: 600;">${totalImageCount}장</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>✨ 생성할 콘텐츠:</span>
          <span style="font-weight: 600;">${contentCount}개 × ${platformCount}개 플랫폼</span>
        </div>
      </div>
      
      <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 1.1rem;">⏱️ 예상 소요 시간:</span>
          <span style="font-size: 1.3rem; font-weight: bold;">${totalTimeSeconds}초 (약 ${totalTimeMinutes}분)</span>
        </div>
      </div>
      
      <p style="font-size: 0.85rem; opacity: 0.9; margin-top: 1rem; text-align: center; margin-bottom: 0;">
        모델: GPT-4o + Gemini Flash (하이브리드 전략) | 1회 생성 = 1크레딧
      </p>
    </div>
  `;
}

// ===================================
// 배치 생성 계산
// ===================================
function updateBatchCalculation() {
  const contentCountSelect = document.getElementById('contentCount');
  const imagesPerContentSelect = document.getElementById('imagesPerContent');
  
  if (!contentCountSelect || !imagesPerContentSelect) return;
  
  const contentCount = parseInt(contentCountSelect.value) || 1;
  const imagesPerContent = parseInt(imagesPerContentSelect.value) || 5;
  
  // 필요한 이미지 수 계산
  const requiredImages = contentCount * imagesPerContent;
  const uploadedImages = selectedImages.length;
  
  // UI 업데이트
  document.getElementById('requiredImages').textContent = requiredImages;
  document.getElementById('uploadedImages').textContent = uploadedImages;
  
  // 경고 메시지
  const warningDiv = document.getElementById('batchWarning');
  const warningText = document.getElementById('batchWarningText');
  
  if (uploadedImages < requiredImages) {
    warningDiv.classList.remove('hidden');
    const shortage = requiredImages - uploadedImages;
    warningText.textContent = `${shortage}장의 이미지를 더 업로드해주세요. (현재: ${uploadedImages}장 / 필요: ${requiredImages}장)`;
  } else {
    warningDiv.classList.add('hidden');
  }
  
  // 분배 미리보기
  const distributionPreview = document.getElementById('distributionPreview');
  const distributionList = document.getElementById('distributionList');
  
  if (uploadedImages > 0 && contentCount > 1) {
    distributionPreview.classList.remove('hidden');
    
    let previewHTML = '<div class="space-y-1">';
    const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
    const platforms = Array.from(platformCheckboxes).map(cb => {
      const value = cb.value;
      const labels = { blog: '블로그', instagram: '인스타', threads: '스레드', youtube: '유튜브' };
      return labels[value] || value;
    }).join(' + ') || '선택된 플랫폼';
    
    // 키워드 순환 정보 추가
    const keywordsInput = document.getElementById('keywords')?.value.trim() || '';
    const keywordArray = keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    for (let i = 0; i < contentCount; i++) {
      const startIdx = i * imagesPerContent + 1;
      const endIdx = Math.min((i + 1) * imagesPerContent, uploadedImages);
      const available = endIdx >= startIdx;
      
      // 현재 콘텐츠의 키워드 결정
      const currentKeyword = keywordArray.length > 0 
        ? keywordArray[i % keywordArray.length] 
        : '';
      
      previewHTML += `
        <div class="flex items-center justify-between py-2 border-b border-gray-200">
          <div class="flex items-center gap-2">
            <span class="${available ? 'text-gray-700' : 'text-red-500'} font-medium">
              ${platforms} #${i + 1}
            </span>
            ${currentKeyword ? `<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">${currentKeyword}</span>` : ''}
          </div>
          <span class="${available ? 'text-purple-600' : 'text-red-500'} text-sm">
            ${available ? `이미지 ${startIdx}~${endIdx}번` : '이미지 부족'}
          </span>
        </div>
      `;
    }
    previewHTML += '</div>';
    
    distributionList.innerHTML = previewHTML;
  } else {
    distributionPreview.classList.add('hidden');
  }
  
  // 개별 콘텐츠 입력 필드가 열려있으면 재생성
  const batchInputsContainer = document.getElementById('batchContentInputs');
  if (batchInputsContainer && !batchInputsContainer.classList.contains('hidden')) {
    generateBatchContentInputs();
  }
}

// ===================================
// 개별 콘텐츠 정보 입력
// ===================================
function toggleBatchContentInputs() {
  const container = document.getElementById('batchContentInputs');
  const toggleText = document.getElementById('batchInputToggleText');
  const toggleIcon = document.getElementById('batchInputToggleIcon');
  
  if (container.classList.contains('hidden')) {
    container.classList.remove('hidden');
    toggleText.textContent = '개별 콘텐츠 정보 입력 접기';
    toggleIcon.classList.remove('fa-chevron-down');
    toggleIcon.classList.add('fa-chevron-up');
    generateBatchContentInputs();
  } else {
    container.classList.add('hidden');
    toggleText.textContent = '개별 콘텐츠 정보 입력하기 (선택사항)';
    toggleIcon.classList.remove('fa-chevron-up');
    toggleIcon.classList.add('fa-chevron-down');
  }
}

// ===================================
// 개별 콘텐츠 블록 생성 (NEW)
// ===================================
function generateContentBlocks() {
  const contentCountSelect = document.getElementById('contentCount');
  const container = document.getElementById('contentBlocksContainer');
  
  if (!contentCountSelect || !container) return;
  
  const contentCount = parseInt(contentCountSelect.value) || 1;
  
  // 기존 데이터 보존 (이미 입력한 내용 유지)
  const existingData = { ...contentBlocks };
  contentBlocks = {};
  
  let html = '';
  
  for (let i = 0; i < contentCount; i++) {
    // 기존 데이터 복원
    if (existingData[i]) {
      contentBlocks[i] = existingData[i];
    } else {
      contentBlocks[i] = { images: [], keywords: '', topic: '', description: '' };
    }
    
    const existingImages = contentBlocks[i].images || [];
    
    html += `
      <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span class="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
            ${i + 1}
          </span>
          콘텐츠 #${i + 1}
        </h3>
        
        <!-- 이미지 업로드 -->
        <div class="mb-4">
          <label class="block mb-2 font-semibold text-gray-700">
            <i class="fas fa-image mr-2"></i>이미지 업로드 (최대 10장)
          </label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition cursor-pointer bg-white" 
               onclick="document.getElementById('imageInput_${i}').click()">
            <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
            <input
              type="file"
              accept="image/*"
              multiple
              id="imageInput_${i}"
              class="hidden"
              onchange="handleContentImageUpload(${i})"
            />
            <p class="text-gray-600 text-sm">
              <span class="text-purple-600 font-semibold">클릭하여 이미지 선택</span>
              <span class="text-gray-500"> (${existingImages.length}/10장)</span>
            </p>
          </div>
          <div id="imagePreview_${i}" class="mt-3 grid grid-cols-5 gap-2"></div>
        </div>
        
        <!-- 키워드 + AI 추천 -->
        <div class="mb-4">
          <label class="block mb-2 font-semibold text-gray-700 flex justify-between items-center">
            <span><i class="fas fa-key mr-2"></i>핵심 키워드 <span class="text-red-500">*</span></span>
            <button
              type="button"
              onclick="suggestKeywordsForContent(${i}, event)"
              class="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-lg hover:from-purple-600 hover:to-pink-600 transition flex items-center gap-1"
              title="이 콘텐츠의 이미지로 AI 키워드 추천"
            >
              <i class="fas fa-magic"></i>
              AI 추천
            </button>
          </label>
          <input
            type="text"
            id="keyword_${i}"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="예: 수분크림, 보습, 겨울케어"
            value="${contentBlocks[i].keywords || ''}"
            onchange="updateContentData(${i}, 'keywords', this.value)"
          />
        </div>
        
        <!-- 주제 -->
        <div class="mb-4">
          <label class="block mb-2 font-semibold text-gray-700">
            <i class="fas fa-lightbulb mr-2"></i>주제/내용 (1줄 설명)
          </label>
          <input
            type="text"
            id="topic_${i}"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="예: 겨울철 건조한 피부를 위한 수분크림"
            value="${contentBlocks[i].topic || ''}"
            onchange="updateContentData(${i}, 'topic', this.value)"
          />
        </div>
        
        <!-- 추가 설명 -->
        <div>
          <label class="block mb-2 font-semibold text-gray-700">
            <i class="fas fa-comment-dots mr-2"></i>추가 설명 (선택)
          </label>
          <textarea
            id="description_${i}"
            rows="2"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
            placeholder="예: 건조한 겨울 날씨에 피부를 촉촉하게 유지하는 방법을 소개합니다"
            onchange="updateContentData(${i}, 'description', this.value)"
          >${contentBlocks[i].description || ''}</textarea>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // 기존 이미지 미리보기 복원
  for (let i = 0; i < contentCount; i++) {
    if (contentBlocks[i].images && contentBlocks[i].images.length > 0) {
      renderImagePreview(i);
    }
  }
  
  // 비용 계산 업데이트
  updateCostEstimate();
}

// 콘텐츠 데이터 업데이트
function updateContentData(index, field, value) {
  if (!contentBlocks[index]) {
    contentBlocks[index] = { images: [], keywords: '', topic: '', description: '' };
  }
  contentBlocks[index][field] = value;
}

// 개별 콘텐츠 이미지 업로드 처리
function handleContentImageUpload(index) {
  const input = document.getElementById(`imageInput_${index}`);
  const files = Array.from(input.files);
  
  if (!contentBlocks[index]) {
    contentBlocks[index] = { images: [], keywords: '', topic: '', description: '' };
  }
  
  const currentImages = contentBlocks[index].images || [];
  const availableSlots = 10 - currentImages.length;
  
  if (files.length > availableSlots) {
    showToast(`⚠️ 최대 10장까지 업로드할 수 있습니다. (현재: ${currentImages.length}장)`, 'warning');
    return;
  }
  
  // 파일을 base64로 변환
  let processedCount = 0;
  files.forEach((file, idx) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast(`❌ ${file.name}은(는) 10MB를 초과합니다`, 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      contentBlocks[index].images.push({
        base64: e.target.result,
        name: file.name,
        size: file.size
      });
      
      processedCount++;
      if (processedCount === files.length) {
        renderImagePreview(index);
        updateCostEstimate();
        showToast(`✅ ${files.length}장 업로드 완료`, 'success');
      }
    };
    reader.readAsDataURL(file);
  });
}

// 이미지 미리보기 렌더링
function renderImagePreview(index) {
  const container = document.getElementById(`imagePreview_${index}`);
  if (!container || !contentBlocks[index]) return;
  
  const images = contentBlocks[index].images || [];
  
  container.innerHTML = images.map((img, imgIdx) => `
    <div class="relative group">
      <img src="${img.base64}" class="w-full h-20 object-cover rounded-lg border-2 border-gray-200" />
      <button
        type="button"
        onclick="removeContentImage(${index}, ${imgIdx})"
        class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
      >
        ×
      </button>
    </div>
  `).join('');
  
  // 업로드 카운트 업데이트
  const uploadArea = document.getElementById(`imageInput_${index}`)?.parentElement;
  if (uploadArea) {
    const countSpan = uploadArea.querySelector('.text-gray-500');
    if (countSpan) {
      countSpan.innerHTML = ` (${images.length}/10장)`;
    }
  }
}

// 이미지 삭제
function removeContentImage(contentIndex, imageIndex) {
  if (!contentBlocks[contentIndex]) return;
  
  contentBlocks[contentIndex].images.splice(imageIndex, 1);
  renderImagePreview(contentIndex);
  updateCostEstimate();
  showToast('🗑️ 이미지 삭제 완료', 'success');
}

// 개별 콘텐츠 AI 키워드 추천
async function suggestKeywordsForContent(index, event) {
  event.preventDefault();
  event.stopPropagation();
  
  if (!contentBlocks[index] || !contentBlocks[index].images || contentBlocks[index].images.length === 0) {
    showToast('❌ 먼저 이미지를 업로드해주세요', 'error');
    return;
  }
  
  const brand = document.getElementById('brand')?.value.trim() || '';
  const industry = document.getElementById('industry')?.value || '';
  
  const btn = event.target.closest('button');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...';
  
  try {
    const response = await fetch('/api/suggest-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: contentBlocks[index].images.slice(0, 3).map(img => img.base64),
        brand: brand,
        industry: industry
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.keywords) {
      const keywordsStr = result.keywords.join(', ');
      document.getElementById(`keyword_${index}`).value = keywordsStr;
      updateContentData(index, 'keywords', keywordsStr);
      showToast('✨ 키워드 추천 완료!', 'success');
    } else {
      showToast('❌ ' + (result.error || '키워드 추천 실패'), 'error');
    }
  } catch (error) {
    console.error('키워드 추천 오류:', error);
    showToast('❌ 네트워크 오류가 발생했습니다', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

function generateBatchContentInputs() {
  // 더 이상 사용 안 함 (generateContentBlocks로 대체)
  const contentCountSelect = document.getElementById('contentCount');
  const container = document.getElementById('batchContentInputs');
  
  if (!contentCountSelect || !container) return;
  
  const contentCount = parseInt(contentCountSelect.value) || 1;
  
  let html = `
    <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-200 mb-3">
      <p class="text-sm text-indigo-800">
        <i class="fas fa-info-circle mr-2"></i>
        <strong>개별 정보 입력:</strong> 각 콘텐츠마다 다른 키워드, 주제, 설명을 입력할 수 있습니다. 
        비워두면 기본 정보가 사용됩니다.
      </p>
    </div>
  `;
  
  for (let i = 0; i < contentCount; i++) {
    html += `
      <div class="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-300 transition">
        <h4 class="font-bold text-gray-800 mb-3 flex items-center">
          <span class="bg-purple-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm mr-2">
            ${i + 1}
          </span>
          콘텐츠 #${i + 1}
        </h4>
        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">
              <i class="fas fa-key mr-1 text-purple-500"></i>키워드
            </label>
            <input
              type="text"
              id="batchKeyword_${i}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="예: 수분크림, 보습"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">
              <i class="fas fa-lightbulb mr-1 text-yellow-500"></i>주제/내용 (1줄 설명)
            </label>
            <input
              type="text"
              id="batchTopic_${i}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="예: 겨울철 피부 수분 관리법"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">
              <i class="fas fa-comment-dots mr-1 text-blue-500"></i>추가 설명 (선택)
            </label>
            <textarea
              id="batchDescription_${i}"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm resize-none"
              placeholder="예: 건조한 겨울철 피부에 필수적인 수분 공급 방법을 소개합니다"
            ></textarea>
          </div>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// ===================================
// 키워드 자동 추천
// ===================================
async function suggestKeywords(event) {
  if (selectedImages.length === 0) {
    showToast('❌ 먼저 이미지를 업로드해주세요', 'error');
    return;
  }
  
  const brand = document.getElementById('brand').value.trim();
  const industry = document.getElementById('industry').value;
  
  if (!brand) {
    showToast('⚠️ 브랜드명을 먼저 입력하면 더 정확한 키워드를 추천받을 수 있습니다', 'warning');
  }
  
  // 로딩 표시
  const btn = event ? event.target.closest('button') : document.querySelector('button[onclick*="suggestKeywords"]');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...';
  
  try {
    const response = await fetch('/api/suggest-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: selectedImages.slice(0, 3).map(img => img.base64), // 최대 3장
        brand: brand || '',
        industry: industry
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.keywords) {
      displayKeywordSuggestions(result.keywords);
      showToast('✨ 키워드 추천 완료!', 'success');
    } else {
      showToast('❌ ' + (result.error || '키워드 추천 실패'), 'error');
    }
  } catch (error) {
    console.error('키워드 추천 오류:', error);
    showToast('❌ 네트워크 오류가 발생했습니다', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

function displayKeywordSuggestions(keywords) {
  const container = document.getElementById('keywordSuggestions');
  const list = document.getElementById('suggestedKeywordsList');
  
  list.innerHTML = keywords.map(keyword => `
    <button
      type="button"
      onclick="addKeyword('${keyword.replace(/'/g, "\\'")}')"
      class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition text-sm"
    >
      + ${keyword}
    </button>
  `).join('');
  
  container.classList.remove('hidden');
}

function addKeyword(keyword) {
  const input = document.getElementById('keywords');
  const currentKeywords = input.value.trim();
  
  // 이미 있는 키워드인지 확인
  const keywordList = currentKeywords.split(',').map(k => k.trim()).filter(k => k);
  if (keywordList.includes(keyword)) {
    showToast('⚠️ 이미 추가된 키워드입니다', 'warning');
    return;
  }
  
  // 키워드 추가
  if (currentKeywords) {
    input.value = currentKeywords + ', ' + keyword;
  } else {
    input.value = keyword;
  }
  
  showToast(`✅ "${keyword}" 추가됨`, 'success');
}

// ===================================
// 콘텐츠 생성
// ===================================
async function handleGenerate() {
  // 기본 정보 수집
  const brand = document.getElementById('brand').value.trim();
  
  if (!brand) {
    showToast('❌ 브랜드명은 필수입니다', 'error');
    return;
  }

  // 플랫폼 선택 확인
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  if (platformCheckboxes.length === 0) {
    showToast('❌ 최소 1개 플랫폼을 선택해주세요', 'error');
    return;
  }
  const platforms = Array.from(platformCheckboxes).map((cb) => cb.value);
  
  // 콘텐츠 블록 검증
  const contentCount = Object.keys(contentBlocks).length;
  if (contentCount === 0) {
    showToast('❌ 생성할 콘텐츠가 없습니다', 'error');
    return;
  }
  
  // 각 콘텐츠 블록 검증
  for (let i = 0; i < contentCount; i++) {
    if (!contentBlocks[i]) {
      showToast(`❌ 콘텐츠 #${i + 1} 정보가 없습니다`, 'error');
      return;
    }
    
    if (!contentBlocks[i].images || contentBlocks[i].images.length === 0) {
      showToast(`❌ 콘텐츠 #${i + 1}에 최소 1장의 이미지를 업로드해주세요`, 'error');
      return;
    }
    
    if (!contentBlocks[i].keywords || contentBlocks[i].keywords.trim() === '') {
      showToast(`❌ 콘텐츠 #${i + 1}의 키워드를 입력해주세요`, 'error');
      return;
    }
  }
  
  // 배치 생성 실행
  if (contentCount > 1) {
    await handleNewBatchGenerate(contentCount, platforms);
    return;
  }
  
  // 단일 생성

  // 단일 콘텐츠 생성 (contentBlocks[0] 사용)
  const content = contentBlocks[0];
  
  let website = document.getElementById('website')?.value.trim() || '';
  if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
    website = 'https://' + website;
  }
  
  // 키워드에 주제와 설명 추가
  let enhancedKeywords = content.keywords;
  if (content.topic) {
    enhancedKeywords += ` (주제: ${content.topic})`;
  }
  if (content.description) {
    enhancedKeywords += ` (${content.description})`;
  }

  const formData = {
    user_id: currentUser?.id || null, // ✅ 추가: 사용자 ID
    is_guest: currentUser?.isGuest || false, // ✅ 추가: 비회원 여부
    brand,
    companyName: document.getElementById('companyName')?.value.trim() || '',
    businessType: document.getElementById('businessType')?.value.trim() || '',
    location: document.getElementById('location')?.value.trim() || '',
    targetGender: document.getElementById('targetGender')?.value || '',
    contact: document.getElementById('contact')?.value.trim() || '',
    website: website,
    sns: document.getElementById('sns')?.value.trim() || '',
    keywords: enhancedKeywords,
    tone: document.getElementById('tone')?.value || '친근한',
    targetAge: document.getElementById('targetAge')?.value || '20대',
    industry: document.getElementById('industry')?.value || '라이프스타일',
    contentStrategy: document.querySelector('input[name="contentStrategy"]:checked')?.value || 'auto', // 🔥 NEW v6.1
    images: content.images.map((img) => img.base64),
    platforms,
    aiModel: 'gpt-4o',
  };

  // 재시도용 저장
  lastFormData = formData;

  // 로딩 표시
  showLoadingOverlay();

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    // HTML 에러 페이지 체크
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      hideLoadingOverlay();
      const errorText = await response.text();
      console.error('서버 에러:', response.status, errorText.substring(0, 200));
      showErrorModal(`서버 오류가 발생했습니다. (${response.status})\n\n잠시 후 다시 시도해주세요.`);
      return;
    }

    const result = await response.json();

    // 검증 실패 시 확인 모달 표시
    if (result.requireConfirmation && result.validation) {
      hideLoadingOverlay();
      showValidationModal(result.validation, formData);
      return;
    }

    // ✅ 에러 응답 처리 (403: 크레딧/제한, 404: 사용자 없음)
    if (!response.ok) {
      hideLoadingOverlay();
      if (response.status === 403) {
        // 크레딧 부족 또는 월간 제한
        showErrorModal(result.message || result.error);
        if (result.redirect) {
          setTimeout(() => {
            window.location.href = result.redirect;
          }, 2000);
        }
        return;
      } else if (response.status === 404) {
        // 사용자 정보 없음
        showErrorModal(result.message || '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }
    }

    if (result.success) {
      hideLoadingOverlay();
      resultData = result.data;
      displayResults(result.data, result.generatedPlatforms);
      saveToHistory(formData, result.data);
      
      // ✅ 크레딧 정보 업데이트 (수정: usage 객체 사용)
      if (result.usage && result.usage.credits_remaining !== undefined) {
        currentUser.credits = result.usage.credits_remaining;
        localStorage.setItem('postflow_user', JSON.stringify(currentUser));
        updateAuthUI(); // ✅ 인증 UI 업데이트
        showToast(`✅ 콘텐츠 생성 완료! (1크레딧 사용, 남은 크레딧: ${result.usage.credits_remaining})`, 'success');
      } else {
        showToast('✅ 콘텐츠 생성 완료!', 'success');
      }
    } else {
      hideLoadingOverlay();
      showErrorModal(result.error || '알 수 없는 오류가 발생했습니다');
    }
  } catch (error) {
    console.error('생성 오류:', error);
    hideLoadingOverlay();
    showErrorModal('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
  }
}

// ===================================
// 새로운 배치 생성 (개별 콘텐츠 블록 기반)
// ===================================
async function handleNewBatchGenerate(contentCount, platforms) {
  const brand = document.getElementById('brand').value.trim();
  const companyName = document.getElementById('companyName')?.value.trim() || '';
  const businessType = document.getElementById('businessType')?.value.trim() || '';
  const location = document.getElementById('location')?.value.trim() || '';
  const targetGender = document.getElementById('targetGender')?.value || '';
  const contact = document.getElementById('contact')?.value.trim() || '';
  let website = document.getElementById('website')?.value.trim() || '';
  if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
    website = 'https://' + website;
  }
  const sns = document.getElementById('sns')?.value.trim() || '';
  const tone = document.getElementById('tone')?.value || '친근한';
  const targetAge = document.getElementById('targetAge')?.value || '20대';
  const industry = document.getElementById('industry')?.value || '라이프스타일';
  
  // 배치 생성 시작
  showBatchLoadingOverlay(contentCount);
  
  const allResults = [];
  const errors = [];
  
  for (let i = 0; i < contentCount; i++) {
    const content = contentBlocks[i];
    
    if (!content) {
      errors.push({ index: i, error: '콘텐츠 정보 없음' });
      continue;
    }
    
    // 키워드에 주제와 설명 추가
    let enhancedKeywords = content.keywords;
    if (content.topic) {
      enhancedKeywords += ` (주제: ${content.topic})`;
    }
    if (content.description) {
      enhancedKeywords += ` (${content.description})`;
    }
    
    updateBatchProgress(i + 1, contentCount, `콘텐츠 #${i + 1} 생성 중... (${content.keywords})`);
    
    const formData = {
      user_id: currentUser?.id || null, // ✅ 추가
      is_guest: currentUser?.isGuest || false, // ✅ 추가
      brand,
      companyName,
      businessType,
      location,
      targetGender,
      contact,
      website,
      sns,
      keywords: enhancedKeywords,
      tone,
      targetAge,
      industry,
      images: content.images.map((img) => img.base64),
      platforms,
      aiModel: 'gpt-4o',
    };
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        allResults.push({
          contentIndex: i,
          data: result.data,
          platforms: result.generatedPlatforms,
          keywords: content.keywords
        });
      } else {
        errors.push({ index: i, error: result.error || '알 수 없는 오류' });
      }
    } catch (error) {
      console.error(`콘텐츠 #${i + 1} 생성 오류:`, error);
      errors.push({ index: i, error: error.message });
    }
  }
  
  // 배치 생성 완료
  hideBatchLoadingOverlay();
  displayBatchResults(allResults, errors, contentCount);
  
  if (allResults.length > 0) {
    showToast(`✅ 배치 생성 완료! (성공: ${allResults.length}개, 실패: ${errors.length}개)`, 'success');
  } else {
    showToast('❌ 모든 콘텐츠 생성에 실패했습니다', 'error');
  }
}

// ===================================
// 구 배치 생성 (더 이상 사용 안 함)
// ===================================
async function handleBatchGenerate(contentCount, imagesPerContent, platforms) {
  const brand = document.getElementById('brand').value.trim();
  const companyName = document.getElementById('companyName')?.value.trim() || '';
  const businessType = document.getElementById('businessType')?.value.trim() || '';
  const location = document.getElementById('location')?.value.trim() || '';
  const targetGender = document.getElementById('targetGender')?.value || '';
  const contact = document.getElementById('contact')?.value.trim() || '';
  let website = document.getElementById('website')?.value.trim() || '';
  if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
    website = 'https://' + website;
  }
  const sns = document.getElementById('sns')?.value.trim() || '';
  const keywords = document.getElementById('keywords').value.trim();
  const tone = document.getElementById('tone')?.value || '친근한';
  const targetAge = document.getElementById('targetAge')?.value || '20대';
  const industry = document.getElementById('industry')?.value || '라이프스타일';
  
  // 배치 생성 시작
  showBatchLoadingOverlay(contentCount);
  
  // 키워드 배열로 변환 (쉼표 구분)
  const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  const allResults = [];
  const errors = [];
  
  for (let i = 0; i < contentCount; i++) {
    const startIdx = i * imagesPerContent;
    const endIdx = Math.min((i + 1) * imagesPerContent, selectedImages.length);
    const batchImages = selectedImages.slice(startIdx, endIdx);
    
    // 개별 콘텐츠 정보 확인
    const batchKeywordInput = document.getElementById(`batchKeyword_${i}`);
    const batchTopicInput = document.getElementById(`batchTopic_${i}`);
    const batchDescriptionInput = document.getElementById(`batchDescription_${i}`);
    
    // 개별 입력이 있으면 사용, 없으면 기본 키워드 순환
    let currentKeyword, currentTopic, currentDescription;
    
    if (batchKeywordInput && batchKeywordInput.value.trim()) {
      currentKeyword = batchKeywordInput.value.trim();
    } else {
      currentKeyword = keywordArray.length > 0 
        ? keywordArray[i % keywordArray.length] 
        : keywords;
    }
    
    currentTopic = batchTopicInput ? batchTopicInput.value.trim() : '';
    currentDescription = batchDescriptionInput ? batchDescriptionInput.value.trim() : '';
    
    // 주제와 설명을 키워드에 추가 (AI 프롬프트에 반영)
    let enhancedKeywords = currentKeyword;
    if (currentTopic) {
      enhancedKeywords += ` (주제: ${currentTopic})`;
    }
    if (currentDescription) {
      enhancedKeywords += ` (${currentDescription})`;
    }
    
    updateBatchProgress(i + 1, contentCount, `콘텐츠 #${i + 1} 생성 중... (${currentKeyword})`);
    
    const formData = {
      user_id: currentUser?.id || null, // ✅ 추가
      is_guest: currentUser?.isGuest || false, // ✅ 추가
      brand,
      companyName,
      businessType,
      location,
      targetGender,
      contact,
      website,
      sns,
      keywords: enhancedKeywords, // 확장된 키워드 사용
      tone,
      targetAge,
      industry,
      images: batchImages.map((img) => img.base64),
      platforms,
      aiModel: 'gpt-4o',
    };
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        allResults.push({
          index: i + 1,
          data: result.data,
          platforms: result.generatedPlatforms,
          keyword: currentKeyword, // 사용된 키워드 저장
        });
      } else {
        errors.push({
          index: i + 1,
          error: result.error || '알 수 없는 오류',
        });
      }
    } catch (error) {
      console.error(`콘텐츠 #${i + 1} 생성 오류:`, error);
      errors.push({
        index: i + 1,
        error: '네트워크 오류',
      });
    }
  }
  
  hideBatchLoadingOverlay();
  
  // 결과 표시
  if (allResults.length > 0) {
    displayBatchResults(allResults, errors);
    showToast(`✅ ${allResults.length}/${contentCount}개 콘텐츠 생성 완료!`, 'success');
  } else {
    showToast('❌ 모든 콘텐츠 생성에 실패했습니다', 'error');
    showErrorModal('배치 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
}

// 배치 로딩 오버레이
function showBatchLoadingOverlay(totalCount) {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('hidden');
  
  const loadingMessage = document.getElementById('loadingMessage');
  loadingMessage.textContent = `배치 생성 중... (0/${totalCount})`;
  
  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = '0%';
  document.getElementById('progressPercent').textContent = '0%';
}

function updateBatchProgress(current, total, message) {
  const progress = (current / total) * 100;
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const loadingMessage = document.getElementById('loadingMessage');
  
  progressBar.style.width = progress + '%';
  progressPercent.textContent = Math.floor(progress) + '%';
  loadingMessage.textContent = `${message} (${current}/${total})`;
}

function hideBatchLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  
  progressBar.style.width = '100%';
  progressPercent.textContent = '100%';
  
  setTimeout(() => {
    overlay.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    document.getElementById('loadingMessage').textContent = '이미지 분석 중...';
  }, 500);
}

// 배치 결과 표시
function displayBatchResults(allResults, errors) {
  const resultsSection = document.getElementById('resultsSection');
  if (!resultsSection) return;
  
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth' });
  
  let html = `
    <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-6 border-2 border-green-200">
      <h2 class="text-2xl font-bold text-gray-800 mb-4">
        <i class="fas fa-check-circle text-green-600 mr-2"></i>
        배치 생성 완료
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div class="bg-white rounded-lg p-4">
          <span class="text-gray-600">성공:</span>
          <span class="font-bold text-green-600 text-2xl ml-2">${allResults.length}개</span>
        </div>
        <div class="bg-white rounded-lg p-4">
          <span class="text-gray-600">실패:</span>
          <span class="font-bold text-red-600 text-2xl ml-2">${errors.length}개</span>
        </div>
      </div>
      <button
        onclick="downloadBatchExcel()"
        class="mt-4 w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-blue-700 transition"
      >
        <i class="fas fa-file-excel mr-2"></i>전체 결과 Excel 다운로드
      </button>
    </div>
  `;
  
  // 각 콘텐츠 결과 표시
  allResults.forEach((result) => {
    html += `
      <div class="bg-white rounded-xl p-6 mb-6 shadow-lg border border-gray-200">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">
            <i class="fas fa-file-alt mr-2 text-purple-600"></i>
            콘텐츠 #${result.index}
          </h3>
          <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
            <i class="fas fa-key mr-1"></i>${result.keyword || '키워드'}
          </span>
        </div>
    `;
    
    result.platforms.forEach((platform) => {
      const content = result.data[platform];
      if (!content) return;
      
      const platformNames = {
        blog: '네이버 블로그',
        instagram: '인스타그램',
        threads: '스레드',
        youtube: '유튜브 숏폼',
      };
      
      html += `
        <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 class="font-bold text-gray-700 mb-2">${platformNames[platform] || platform}</h4>
          <div class="bg-white p-4 rounded border border-gray-200 max-h-60 overflow-y-auto whitespace-pre-wrap text-sm">
            ${content}
          </div>
          <div class="mt-3 flex gap-2">
            <button
              onclick="copyToClipboard(${JSON.stringify(content).replace(/"/g, '&quot;')}, '${platformNames[platform]}')"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <i class="fas fa-copy mr-1"></i>복사
            </button>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
  });
  
  // 오류 표시
  if (errors.length > 0) {
    html += `
      <div class="bg-red-50 rounded-xl p-6 border-2 border-red-200">
        <h3 class="text-xl font-bold text-red-800 mb-4">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          생성 실패 항목
        </h3>
    `;
    
    errors.forEach((err) => {
      html += `
        <div class="bg-white p-4 rounded-lg mb-2 border border-red-200">
          <span class="font-semibold">콘텐츠 #${err.index}:</span>
          <span class="text-red-600 ml-2">${err.error}</span>
        </div>
      `;
    });
    
    html += `</div>`;
  }
  
  resultsSection.innerHTML = html;
  
  // 전역 변수에 저장 (Excel 다운로드용)
  window.batchResults = allResults;
}

// ===================================
// 로딩 오버레이
// ===================================
function showLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.remove('hidden');
  
  // 진행률 애니메이션
  let progress = 0;
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const loadingMessage = document.getElementById('loadingMessage');
  
  const messages = [
    '이미지 분석 중...',
    'AI가 콘텐츠를 생성하고 있습니다...',
    '플랫폼별 최적화 중...',
    '거의 완료되었습니다...'
  ];
  
  let messageIndex = 0;
  
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    
    progressBar.style.width = progress + '%';
    progressPercent.textContent = Math.floor(progress) + '%';
    
    if (progress > 25 * (messageIndex + 1) && messageIndex < messages.length - 1) {
      messageIndex++;
      loadingMessage.textContent = messages[messageIndex];
    }
  }, 500);
  
  overlay.dataset.intervalId = interval;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  const intervalId = overlay.dataset.intervalId;
  
  if (intervalId) {
    clearInterval(parseInt(intervalId));
  }
  
  // 완료 애니메이션
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  
  progressBar.style.width = '100%';
  progressPercent.textContent = '100%';
  
  setTimeout(() => {
    overlay.classList.add('hidden');
    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    document.getElementById('loadingMessage').textContent = '이미지 분석 중...';
  }, 500);
}

// ===================================
// 검증 모달 (이미지-내용 불일치)
// ===================================
let pendingFormData = null;

function showValidationModal(validation, formData) {
  pendingFormData = formData;
  
  const modal = document.getElementById('validationModal');
  
  // 신뢰도 표시
  const confidenceEl = document.getElementById('validationConfidence');
  const confidence = validation.confidence || 0;
  confidenceEl.textContent = `${confidence}%`;
  
  // 신뢰도에 따른 색상 변경 (안전한 방법)
  const confidenceContainer = confidenceEl.parentElement?.parentElement;
  if (confidenceContainer) {
    if (confidence < 30) {
      confidenceContainer.style.background = '#fee2e2';
      confidenceContainer.style.borderLeftColor = '#dc2626';
      confidenceEl.style.color = '#991b1b';
    } else if (confidence < 50) {
      confidenceContainer.style.background = '#fef3c7';
      confidenceContainer.style.borderLeftColor = '#f59e0b';
      confidenceEl.style.color = '#b45309';
    } else {
      confidenceContainer.style.background = '#dbeafe';
      confidenceContainer.style.borderLeftColor = '#3b82f6';
      confidenceEl.style.color = '#1e40af';
    }
  }
  
  // 충돌 목록 표시
  const conflictsListEl = document.getElementById('conflictsList');
  conflictsListEl.innerHTML = '';
  
  if (validation.conflicts && validation.conflicts.length > 0) {
    conflictsListEl.innerHTML = '<h3 style="font-weight: 600; margin-bottom: 12px; color: #1f2937;"><i class="fas fa-exclamation-triangle"></i> 발견된 충돌 (' + validation.conflicts.length + '개)</h3>';
    
    validation.conflicts.forEach((conflict, index) => {
      const severityColor = {
        high: '#dc2626',
        medium: '#f59e0b',
        low: '#3b82f6'
      }[conflict.severity] || '#6b7280';
      
      const severityLabel = {
        high: '높음',
        medium: '중간',
        low: '낮음'
      }[conflict.severity] || '알 수 없음';
      
      const typeLabel = {
        'image-keyword': '이미지-키워드',
        'image-brand': '이미지-브랜드',
        'document-keyword': '문서-키워드',
        'brand-website': '브랜드-웹사이트',
        'industry-keyword': '산업-키워드',
        'target-content': '타겟-콘텐츠'
      }[conflict.type] || conflict.type;
      
      const conflictHtml = `
        <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid ${severityColor};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 600; color: #1f2937;">
              <i class="fas fa-times-circle"></i> ${typeLabel}
            </span>
            <span style="background: ${severityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
              ${severityLabel}
            </span>
          </div>
          <p style="color: #4b5563; margin-bottom: 8px; font-size: 0.9rem;">${conflict.description}</p>
          ${conflict.items && conflict.items.length > 0 ? 
            '<p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 8px;"><strong>관련 항목:</strong> ' + conflict.items.join(', ') + '</p>' : 
            ''
          }
          <p style="color: #059669; font-size: 0.85rem;">
            <i class="fas fa-lightbulb"></i> <strong>수정 제안:</strong> ${conflict.suggestion}
          </p>
        </div>
      `;
      
      conflictsListEl.innerHTML += conflictHtml;
    });
  } else {
    conflictsListEl.innerHTML = '<p style="color: #059669;"><i class="fas fa-check-circle"></i> 충돌이 발견되지 않았습니다.</p>';
  }
  
  // 전략 및 이유 표시
  document.getElementById('validationReason').textContent = validation.reason || '상세 정보 없음';
  
  // 권장 사항 표시
  document.getElementById('validationRecommendation').textContent = validation.recommendation || '입력 정보를 수정해주세요.';
  
  modal.classList.remove('hidden');
}

function closeValidationModal() {
  const modal = document.getElementById('validationModal');
  modal.classList.add('hidden');
  pendingFormData = null;
}

async function forceGenerate() {
  if (!pendingFormData) {
    showToast('❌ 생성할 데이터가 없습니다', 'error');
    return;
  }
  
  closeValidationModal();
  showLoadingOverlay();
  
  // 검증 우회 플래그 추가
  const formDataWithForce = { ...pendingFormData, forceGenerate: true };
  
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formDataWithForce),
    });

    const result = await response.json();

    if (result.success) {
      hideLoadingOverlay();
      resultData = result.data;
      displayResults(result.data, result.generatedPlatforms);
      saveToHistory(formDataWithForce, result.data);
      
      // ✅ 크레딧 정보 업데이트 (수정: usage 객체 사용)
      if (result.usage && result.usage.credits_remaining !== undefined) {
        currentUser.credits = result.usage.credits_remaining;
        localStorage.setItem('postflow_user', JSON.stringify(currentUser));
        updateAuthUI();
        showToast(`✅ 콘텐츠 생성 완료! (1크레딧 사용, 남은 크레딧: ${result.usage.credits_remaining})`, 'success');
      } else {
        showToast('✅ 콘텐츠 생성 완료!', 'success');
      }
    } else {
      hideLoadingOverlay();
      showErrorModal(result.error || '알 수 없는 오류가 발생했습니다');
    }
  } catch (error) {
    console.error('생성 오류:', error);
    hideLoadingOverlay();
    showErrorModal('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
  }
}

// ===================================
// 에러 모달
// ===================================
function showErrorModal(errorMessage) {
  const modal = document.getElementById('errorModal');
  const errorMessageEl = document.getElementById('errorMessage');
  const errorSolutionsEl = document.getElementById('errorSolutions');
  
  errorMessageEl.textContent = errorMessage;
  
  // 에러 유형별 해결 방법
  let solutions = [];
  
  if (errorMessage.includes('API') || errorMessage.includes('key')) {
    solutions = [
      '• 관리자에게 OpenAI API 키가 올바르게 설정되었는지 확인하세요',
      '• 서버의 .env 파일에 OPENAI_API_KEY가 있는지 확인하세요',
      '• API 사용 한도가 남아있는지 확인하세요',
      '• 잠시 후 다시 시도해주세요'
    ];
  } else if (errorMessage.includes('네트워크') || errorMessage.includes('network')) {
    solutions = [
      '• 인터넷 연결을 확인해주세요',
      '• VPN을 사용 중이라면 비활성화해보세요',
      '• 브라우저 캐시를 지우고 다시 시도해보세요',
      '• 잠시 후 다시 시도해주세요'
    ];
  } else if (errorMessage.includes('이미지') || errorMessage.includes('image')) {
    solutions = [
      '• 이미지 파일이 손상되지 않았는지 확인하세요',
      '• 이미지 크기가 너무 크지 않은지 확인하세요 (최대 50MB)',
      '• 지원되는 이미지 형식인지 확인하세요 (JPG, PNG, GIF)',
      '• 다른 이미지로 다시 시도해보세요'
    ];
  } else {
    solutions = [
      '• 페이지를 새로고침하고 다시 시도해보세요',
      '• 입력한 정보가 올바른지 확인해주세요',
      '• 브라우저 콘솔(F12)에서 자세한 오류를 확인하세요',
      '• 문제가 계속되면 관리자에게 문의하세요'
    ];
  }
  
  errorSolutionsEl.innerHTML = solutions.map(s => `<li>${s}</li>`).join('');
  
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeErrorModal() {
  const modal = document.getElementById('errorModal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
}

function retryGeneration() {
  closeErrorModal();
  if (lastFormData) {
    handleGenerate();
  } else {
    showToast('❌ 재시도할 데이터가 없습니다', 'error');
  }
}

// ===================================
// 결과 표시
// ===================================
function displayResults(data, platforms) {
  const resultArea = document.getElementById('resultArea');
  const tabButtons = document.getElementById('tabButtons');
  const tabContents = document.getElementById('tabContents');
  
  const platformNames = {
    blog: '📝 네이버 블로그',
    instagram: '📸 인스타그램',
    instagram_feed: '📸 인스타그램 피드',
    threads: '🧵 스레드',
    youtube: '🎬 유튜브 숏폼',
    youtube_longform: '🎥 유튜브 롱폼',
    shortform_multi: '📱 숏폼',
    tiktok: '🎵 틱톡',
    instagram_reels: '🎬 인스타 릴스',
    metadata_generation: '📊 메타데이터'
  };
  
  // 탭 버튼 생성
  tabButtons.innerHTML = platforms.map((platform, index) => `
    <button
      class="tab-button ${index === 0 ? 'active' : ''} px-6 py-3 rounded-lg font-semibold transition"
      onclick="switchTab('${platform}')"
    >
      ${platformNames[platform]}
    </button>
  `).join('');
  
  // 탭 콘텐츠 생성
  tabContents.innerHTML = platforms.map((platform, index) => `
    <div id="tab-${platform}" class="tab-content ${index === 0 ? '' : 'hidden'}">
      <div class="bg-gray-50 rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">${platformNames[platform]}</h3>
          <div class="flex gap-2">
            <button
              onclick="editContent('${platform}')"
              class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold flex items-center gap-2"
              title="콘텐츠 수정하기"
            >
              <i class="fas fa-edit"></i>
              수정
            </button>
            <button
              onclick="downloadAsText('${platform}')"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2"
              title="텍스트 파일로 다운로드"
            >
              <i class="fas fa-download"></i>
              TXT
            </button>
            <button
              onclick="downloadAsWord('${platform}')"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center gap-2"
              title="Word 문서로 다운로드"
            >
              <i class="fas fa-file-word"></i>
              DOC
            </button>
            <button
              onclick="copyToClipboard('${platform}')"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold flex items-center gap-2"
            >
              <i class="fas fa-copy"></i>
              복사
            </button>
          </div>
        </div>
        <div id="content-display-${platform}" class="result-content bg-white p-6 rounded-lg whitespace-pre-wrap border border-gray-200">
          ${formatContent(data[platform])}
        </div>
        <textarea
          id="content-editor-${platform}"
          class="hidden w-full p-6 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
          rows="20"
          style="white-space: pre-wrap; font-family: 'Malgun Gothic', monospace;"
        >${data[platform]}</textarea>
        <div id="editor-actions-${platform}" class="hidden mt-3 flex gap-2 justify-end">
          <button
            onclick="cancelEdit('${platform}')"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            ✖ 취소
          </button>
          <button
            onclick="saveEdit('${platform}')"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            ✓ 저장
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  resultArea.classList.remove('hidden');
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatContent(content) {
  if (!content) return '<p class="text-gray-500">콘텐츠가 생성되지 않았습니다.</p>';
  
  // HTML 이스케이프 및 포맷팅
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/#(\S+)/g, '<span style="color: #3b82f6; font-weight: 600;">#$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function switchTab(platform) {
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 모든 탭 콘텐츠 숨기기
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  // 선택된 탭 활성화
  event.target.classList.add('active');
  document.getElementById(`tab-${platform}`).classList.remove('hidden');
}

function copyToClipboard(platform) {
  const content = resultData[platform];
  if (!content) {
    showToast('❌ 복사할 내용이 없습니다', 'error');
    return;
  }
  
  navigator.clipboard.writeText(content).then(() => {
    showToast('✅ 복사됨!', 'success');
  }).catch(err => {
    console.error('복사 실패:', err);
    showToast('❌ 복사에 실패했습니다', 'error');
  });
}

// ===================================
// 콘텐츠 수정 에디터
// ===================================
function editContent(platform) {
  const display = document.getElementById(`content-display-${platform}`);
  const editor = document.getElementById(`content-editor-${platform}`);
  const actions = document.getElementById(`editor-actions-${platform}`);
  
  display.classList.add('hidden');
  editor.classList.remove('hidden');
  actions.classList.remove('hidden');
  
  // textarea 높이 자동 조절
  editor.style.height = 'auto';
  editor.style.height = editor.scrollHeight + 'px';
  
  editor.focus();
  showToast('✏️ 수정 모드 활성화', 'info');
}

function cancelEdit(platform) {
  const display = document.getElementById(`content-display-${platform}`);
  const editor = document.getElementById(`content-editor-${platform}`);
  const actions = document.getElementById(`editor-actions-${platform}`);
  
  // 원본 복구
  editor.value = resultData[platform];
  
  display.classList.remove('hidden');
  editor.classList.add('hidden');
  actions.classList.add('hidden');
  
  showToast('↩️ 수정 취소', 'info');
}

function saveEdit(platform) {
  const display = document.getElementById(`content-display-${platform}`);
  const editor = document.getElementById(`content-editor-${platform}`);
  const actions = document.getElementById(`editor-actions-${platform}`);
  
  const newContent = editor.value;
  
  if (!newContent.trim()) {
    showToast('❌ 내용이 비어있습니다', 'error');
    return;
  }
  
  // resultData 업데이트
  resultData[platform] = newContent;
  
  // 디스플레이 업데이트
  display.innerHTML = formatContent(newContent);
  
  display.classList.remove('hidden');
  editor.classList.add('hidden');
  actions.classList.add('hidden');
  
  showToast('✅ 수정 내용이 저장되었습니다', 'success');
}

// ===================================
// 다운로드 기능
// ===================================
function downloadAsText(platform) {
  const content = resultData[platform];
  if (!content) {
    showToast('❌ 다운로드할 내용이 없습니다', 'error');
    return;
  }
  
  const platformNames = {
    blog: '네이버블로그',
    instagram: '인스타그램',
    instagram_feed: '인스타그램 피드',
    threads: '스레드',
    youtube: '유튜브숏폼',
    youtube_longform: '유튜브 롱폼',
    shortform_multi: '숏폼',
    tiktok: '틱톡',
    instagram_reels: '인스타 릴스',
    metadata_generation: '메타데이터'
  };
  
  const brand = document.getElementById('brand').value.trim() || 'content';
  const date = new Date().toISOString().split('T')[0];
  const filename = `${brand}_${platformNames[platform]}_${date}.txt`;
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('✅ 텍스트 파일 다운로드 완료!', 'success');
}

function downloadAsWord(platform) {
  const content = resultData[platform];
  if (!content) {
    showToast('❌ 다운로드할 내용이 없습니다', 'error');
    return;
  }
  
  const platformNames = {
    blog: '네이버블로그',
    instagram: '인스타그램',
    instagram_feed: '인스타그램 피드',
    threads: '스레드',
    youtube: '유튜브숏폼',
    youtube_longform: '유튜브 롱폼',
    shortform_multi: '숏폼',
    tiktok: '틱톡',
    instagram_reels: '인스타 릴스',
    metadata_generation: '메타데이터'
  };
  
  const brand = document.getElementById('brand').value.trim() || 'content';
  const date = new Date().toISOString().split('T')[0];
  const filename = `${brand}_${platformNames[platform]}_${date}.doc`;
  
  // HTML 형식으로 변환 (Word가 읽을 수 있는 형식)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${platformNames[platform]} - ${brand}</title>
      <style>
        body { 
          font-family: 'Malgun Gothic', sans-serif; 
          line-height: 1.8; 
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 { 
          color: #333; 
          border-bottom: 3px solid #667eea;
          padding-bottom: 10px;
        }
        pre { 
          white-space: pre-wrap; 
          word-wrap: break-word;
          font-family: 'Malgun Gothic', sans-serif;
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          line-height: 1.8;
        }
      </style>
    </head>
    <body>
      <h1>${platformNames[platform]} 콘텐츠</h1>
      <p><strong>브랜드:</strong> ${brand}</p>
      <p><strong>생성일:</strong> ${date}</p>
      <hr>
      <pre>${content}</pre>
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff', htmlContent], { 
    type: 'application/msword;charset=utf-8' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('✅ Word 문서 다운로드 완료!', 'success');
}

function downloadAllAsExcel() {
  if (!resultData || Object.keys(resultData).length === 0) {
    showToast('❌ 다운로드할 내용이 없습니다', 'error');
    return;
  }
  
  const brand = document.getElementById('brand').value.trim() || 'content';
  const date = new Date().toISOString().split('T')[0];
  const filename = `${brand}_전체콘텐츠_${date}.xls`;
  
  const platformNames = {
    blog: '네이버블로그',
    instagram: '인스타그램',
    instagram_feed: '인스타그램 피드',
    threads: '스레드',
    youtube: '유튜브숏폼',
    youtube_longform: '유튜브 롱폼',
    shortform_multi: '숏폼',
    tiktok: '틱톡',
    instagram_reels: '인스타 릴스',
    metadata_generation: '메타데이터'
  };
  
  // HTML 테이블 형식으로 변환 (Excel이 읽을 수 있는 형식)
  let tableRows = '';
  for (const [platform, content] of Object.entries(resultData)) {
    const escapedContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
    
    tableRows += `
      <tr>
        <td style="vertical-align: top; font-weight: bold; background: #f0f0f0;">${platformNames[platform]}</td>
        <td style="vertical-align: top; white-space: pre-wrap;">${escapedContent}</td>
      </tr>
    `;
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        table { 
          border-collapse: collapse; 
          width: 100%; 
          font-family: 'Malgun Gothic', sans-serif;
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 12px; 
          text-align: left;
        }
        th { 
          background-color: #667eea; 
          color: white;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h2>${brand} - 콘텐츠 전체 목록</h2>
      <p>생성일: ${date}</p>
      <table>
        <thead>
          <tr>
            <th width="150">플랫폼</th>
            <th>콘텐츠</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff', htmlContent], { 
    type: 'application/vnd.ms-excel;charset=utf-8' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('✅ Excel 파일 다운로드 완료!', 'success');
}

// 배치 Excel 다운로드
function downloadBatchExcel() {
  if (!window.batchResults || window.batchResults.length === 0) {
    showToast('❌ 다운로드할 배치 결과가 없습니다', 'error');
    return;
  }
  
  const brand = document.getElementById('brand').value.trim() || 'content';
  const date = new Date().toISOString().split('T')[0];
  const filename = `${brand}_배치생성_${date}.xls`;
  
  const platformNames = {
    blog: '네이버블로그',
    instagram: '인스타그램',
    instagram_feed: '인스타그램 피드',
    threads: '스레드',
    youtube: '유튜브숏폼',
    youtube_longform: '유튜브 롱폼',
    shortform_multi: '숏폼',
    tiktok: '틱톡',
    instagram_reels: '인스타 릴스',
    metadata_generation: '메타데이터'
  };
  
  // HTML 테이블 형식으로 변환
  let tableRows = '';
  
  window.batchResults.forEach((result) => {
    result.platforms.forEach((platform) => {
      const content = result.data[platform];
      if (!content) return;
      
      const escapedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>');
      
      tableRows += `
        <tr>
          <td style="vertical-align: top; font-weight: bold; background: #f0f0f0; text-align: center;">콘텐츠 #${result.index}</td>
          <td style="vertical-align: top; font-weight: bold; background: #f9f9f9;">${platformNames[platform]}</td>
          <td style="vertical-align: top; white-space: pre-wrap;">${escapedContent}</td>
        </tr>
      `;
    });
  });
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        table { 
          border-collapse: collapse; 
          width: 100%; 
          font-family: 'Malgun Gothic', sans-serif;
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 12px; 
          text-align: left;
        }
        th { 
          background-color: #667eea; 
          color: white;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h2>${brand} - 배치 생성 콘텐츠 (${window.batchResults.length}개)</h2>
      <p>생성일: ${date}</p>
      <table>
        <thead>
          <tr>
            <th width="100">번호</th>
            <th width="120">플랫폼</th>
            <th>콘텐츠</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff', htmlContent], { 
    type: 'application/vnd.ms-excel;charset=utf-8' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('✅ 배치 Excel 파일 다운로드 완료!', 'success');
}

// ===================================
// 토스트 메시지
// ===================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = colors[type] || colors.success;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, 3000);
}

// ===================================
// 템플릿 관리
// ===================================
function loadTemplates() {
  const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
  if (stored) {
    try {
      customTemplates = JSON.parse(stored);
    } catch (e) {
      console.error('템플릿 로드 실패:', e);
      customTemplates = [];
    }
  }
}

function saveTemplates() {
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(customTemplates));
}

function openTemplateModal() {
  const modal = document.getElementById('templateModal');
  const templateList = document.getElementById('templateList');
  
  // 템플릿 편집 UI 생성
  const platforms = ['blog', 'instagram', 'instagram_feed', 'threads', 'tiktok', 'instagram_reels', 'youtube_shorts', 'shortform_multi', 'youtube_longform', 'metadata_generation'];
  const platformNames = {
    blog: '📝 네이버 블로그',
    instagram: '📸 인스타그램 (기존)',
    instagram_feed: '📸 인스타그램 피드',
    threads: '🧵 스레드',
    tiktok: '🎵 틱톡',
    instagram_reels: '📹 인스타그램 릴스',
    youtube_shorts: '🎬 유튜브 쇼츠',
    shortform_multi: '📱 숏폼 통합 (틱톡+릴스+쇼츠)',
    youtube_longform: '🎥 유튜브 롱폼',
    metadata_generation: '🏷️ 메타데이터 생성'
  };
  
  templateList.innerHTML = `
    <div class="space-y-6">
      <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <p class="font-semibold text-blue-800 mb-2">💡 사용 가능한 변수:</p>
        <div class="text-sm text-blue-700 space-y-1">
          <p>• <code>{브랜드명}</code> - 브랜드/서비스/상품명</p>
          <p>• <code>{키워드}</code> - 핵심 키워드</p>
          <p>• <code>{톤앤매너}</code> - 콘텐츠 톤앤매너</p>
          <p>• <code>{타겟연령대}</code> - 타겟 연령대</p>
          <p>• <code>{타겟성별}</code> - 타겟 성별</p>
          <p>• <code>{산업분야}</code> - 산업 분야</p>
        </div>
      </div>
      
      ${platforms.map(platform => {
        const custom = customTemplates.find(t => t.platform === platform);
        const template = custom ? custom.template : DEFAULT_TEMPLATES[platform];
        
        return `
          <div class="border border-gray-200 rounded-lg p-6 bg-white">
            <div class="flex justify-between items-center mb-4">
              <h4 class="text-lg font-bold text-gray-800">${platformNames[platform]}</h4>
              <div class="space-x-2">
                <button
                  onclick="resetTemplate('${platform}')"
                  class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm"
                >
                  🔄 기본값
                </button>
                <button
                  onclick="saveTemplate('${platform}')"
                  class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                >
                  💾 저장
                </button>
              </div>
            </div>
            <textarea
              id="template-${platform}"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              rows="${platform.includes('longform') || platform.includes('multi') || platform.includes('metadata') ? '20' : '15'}"
              placeholder="프롬프트 템플릿을 입력하세요..."
            >${template}</textarea>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function saveTemplate(platform) {
  const textarea = document.getElementById(`template-${platform}`);
  const template = textarea.value.trim();
  
  if (!template) {
    showToast('❌ 템플릿 내용을 입력해주세요', 'error');
    return;
  }
  
  // 기존 템플릿 제거
  customTemplates = customTemplates.filter(t => t.platform !== platform);
  
  // 새 템플릿 추가
  customTemplates.push({ platform, template });
  
  saveTemplates();
  showToast(`✅ ${platform} 템플릿이 저장되었습니다`, 'success');
}

function resetTemplate(platform) {
  const textarea = document.getElementById(`template-${platform}`);
  textarea.value = DEFAULT_TEMPLATES[platform];
  
  // 커스텀 템플릿에서 제거
  customTemplates = customTemplates.filter(t => t.platform !== platform);
  saveTemplates();
  
  showToast(`✅ ${platform} 템플릿이 초기화되었습니다`, 'success');
}

// ===================================
// 프로필 관리 (확장된 구조)
// ===================================
function loadProfiles() {
  // ✅ 사용자별 프로필 로딩
  if (!currentUser || !currentUser.id) {
    savedProfiles = [];
    return;
  }
  
  const profileKey = `${STORAGE_KEYS.PROFILES}_${currentUser.id}`;
  const stored = localStorage.getItem(profileKey);
  if (stored) {
    try {
      savedProfiles = JSON.parse(stored);
    } catch (e) {
      console.error('프로필 로드 실패:', e);
      savedProfiles = [];
    }
  }
}

function saveProfile() {
  const brand = document.getElementById('brand').value.trim();
  
  if (!brand) {
    showToast('❌ 브랜드명을 입력해주세요', 'error');
    return;
  }
  
  const profileName = prompt('프로필 이름을 입력하세요:', brand);
  if (!profileName) return;
  
  // 선택된 플랫폼 가져오기
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  const selectedPlatforms = Array.from(platformCheckboxes).map(cb => cb.value);
  
  const profile = {
    id: Date.now(),
    name: profileName,
    brand: document.getElementById('brand')?.value.trim() || '',
    companyName: document.getElementById('companyName')?.value.trim() || '',
    businessType: document.getElementById('businessType')?.value.trim() || '',
    location: document.getElementById('location')?.value.trim() || '',
    targetGender: document.getElementById('targetGender')?.value || '',
    contact: document.getElementById('contact')?.value.trim() || '',
    website: document.getElementById('website')?.value.trim() || '',
    sns: document.getElementById('sns')?.value.trim() || '',
    keywords: document.getElementById('keywords')?.value.trim() || '',
    tone: document.getElementById('tone')?.value || '친근한',
    targetAge: document.getElementById('targetAge')?.value || '20대',
    industry: document.getElementById('industry')?.value || '라이프스타일',
    contentStrategy: document.querySelector('input[name="contentStrategy"]:checked')?.value || 'auto', // 🔥 NEW v6.1
    selectedPlatforms: selectedPlatforms, // 선택한 플랫폼 저장 ⭐
    createdAt: new Date().toISOString()
  };
  
  savedProfiles.unshift(profile);
  if (savedProfiles.length > 50) {
    savedProfiles = savedProfiles.slice(0, 50);
  }
  
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(savedProfiles));
  showToast('✅ 프로필이 저장되었습니다', 'success');
}

function openLoadProfileModal() {
  const modal = document.getElementById('profileModal');
  const profileList = document.getElementById('profileList');
  
  if (savedProfiles.length === 0) {
    profileList.innerHTML = '<p class="text-gray-500 text-center py-8">저장된 프로필이 없습니다</p>';
  } else {
    profileList.innerHTML = savedProfiles.map(profile => {
      const platformNames = {
        blog: '블로그',
        instagram: '인스타',
        threads: '스레드',
        youtube: '유튜브'
      };
      const platformsText = profile.selectedPlatforms 
        ? profile.selectedPlatforms.map(p => platformNames[p] || p).join(', ')
        : '플랫폼 정보 없음';
      
      return `
      <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
        <div class="flex justify-between items-start mb-2">
          <div class="flex-1">
            <h4 class="font-bold text-gray-800">${profile.name}</h4>
            <p class="text-sm text-gray-600">${profile.brand}</p>
            <p class="text-xs text-gray-500 mt-1">
              ${profile.industry || '산업분야 미설정'} | ${profile.targetAge || '연령대 미설정'} | ${profile.tone || '톤 미설정'}
            </p>
            <p class="text-xs text-purple-600 font-semibold mt-1">
              📱 ${platformsText}
            </p>
          </div>
          <div class="space-x-2">
            <button
              onclick="loadProfile(${profile.id})"
              class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
            >
              불러오기
            </button>
            <button
              onclick="deleteProfile(${profile.id})"
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
            >
              삭제
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-500">${new Date(profile.createdAt).toLocaleString()}</p>
      </div>
    `}).join('');
  }
  
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function loadProfile(id) {
  const profile = savedProfiles.find(p => p.id === id);
  if (!profile) return;
  
  // 기본 필드 (옵셔널 체이닝 추가)
  const brandEl = document.getElementById('brand');
  const keywordsEl = document.getElementById('keywords');
  
  if (brandEl) brandEl.value = profile.brand || '';
  if (document.getElementById('companyName')) document.getElementById('companyName').value = profile.companyName || '';
  if (document.getElementById('businessType')) document.getElementById('businessType').value = profile.businessType || '';
  if (document.getElementById('location')) document.getElementById('location').value = profile.location || '';
  if (document.getElementById('targetGender')) document.getElementById('targetGender').value = profile.targetGender || '';
  if (document.getElementById('contact')) document.getElementById('contact').value = profile.contact || '';
  if (document.getElementById('website')) document.getElementById('website').value = profile.website || '';
  if (document.getElementById('sns')) document.getElementById('sns').value = profile.sns || '';
  if (keywordsEl) keywordsEl.value = profile.keywords || '';
  if (document.getElementById('tone')) document.getElementById('tone').value = profile.tone || '친근한';
  if (document.getElementById('targetAge')) document.getElementById('targetAge').value = profile.targetAge || '20대';
  if (document.getElementById('industry')) document.getElementById('industry').value = profile.industry || '라이프스타일';
  
  // 플랫폼 체크박스 복원 ⭐
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]');
  platformCheckboxes.forEach(checkbox => {
    if (profile.selectedPlatforms && profile.selectedPlatforms.includes(checkbox.value)) {
      checkbox.checked = true;
    } else {
      checkbox.checked = false;
    }
  });
  
  // 비용 재계산
  updateCostEstimate();
  
  closeModal('profileModal');
  showToast('✅ 프로필이 불러와졌습니다', 'success');
}

function deleteProfile(id) {
  if (!confirm('이 프로필을 삭제하시겠습니까?')) return;
  
  savedProfiles = savedProfiles.filter(p => p.id !== id);
  
  // ✅ 사용자별 프로필 저장
  const profileKey = `${STORAGE_KEYS.PROFILES}_${currentUser.id}`;
  localStorage.setItem(profileKey, JSON.stringify(savedProfiles));
  
  openLoadProfileModal();
  showToast('✅ 프로필이 삭제되었습니다', 'success');
}

function exportProfiles() {
  if (savedProfiles.length === 0) {
    showToast('❌ 내보낼 프로필이 없습니다', 'error');
    return;
  }
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `프로필_백업_${date}.json`;
  
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    profiles: savedProfiles
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json;charset=utf-8' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`✅ 프로필 ${savedProfiles.length}개 내보내기 완료!`, 'success');
}

function importProfiles(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importData = JSON.parse(e.target.result);
      
      // 버전 체크 및 데이터 검증
      if (!importData.profiles || !Array.isArray(importData.profiles)) {
        showToast('❌ 올바른 프로필 파일이 아닙니다', 'error');
        return;
      }
      
      // 중복 체크 (브랜드명 기준)
      const existingBrands = new Set(savedProfiles.map(p => p.brand));
      const newProfiles = importData.profiles.filter(p => !existingBrands.has(p.brand));
      const duplicates = importData.profiles.length - newProfiles.length;
      
      if (newProfiles.length === 0) {
        showToast('⚠️ 모든 프로필이 이미 존재합니다', 'warning');
        return;
      }
      
      // ID 재생성 (충돌 방지)
      newProfiles.forEach(profile => {
        profile.id = Date.now() + Math.random();
      });
      
      // 기존 프로필에 추가
      savedProfiles = [...savedProfiles, ...newProfiles];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(savedProfiles));
      
      openLoadProfileModal();
      
      let message = `✅ ${newProfiles.length}개 프로필 가져오기 완료!`;
      if (duplicates > 0) {
        message += ` (${duplicates}개 중복 제외)`;
      }
      showToast(message, 'success');
      
    } catch (error) {
      console.error('프로필 가져오기 오류:', error);
      showToast('❌ 파일을 읽을 수 없습니다', 'error');
    }
  };
  
  reader.readAsText(file);
  event.target.value = ''; // 같은 파일 재선택 가능하도록
}

// ===================================
// 히스토리 관리
// ===================================
function loadHistory() {
  const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
  if (stored) {
    try {
      contentHistory = JSON.parse(stored);
    } catch (e) {
      console.error('히스토리 로드 실패:', e);
      contentHistory = [];
    }
  }
}

function saveToHistory(formData, results) {
  const historyItem = {
    id: Date.now(),
    brand: formData.brand,
    keywords: formData.keywords,
    platforms: formData.platforms,
    results: results,
    createdAt: new Date().toISOString()
  };
  
  contentHistory.unshift(historyItem);
  if (contentHistory.length > 50) {
    contentHistory = contentHistory.slice(0, 50);
  }
  
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(contentHistory));
}

function openHistoryModal() {
  const modal = document.getElementById('historyModal');
  
  // 검색/필터 초기화
  document.getElementById('historySearch').value = '';
  document.querySelectorAll('.history-platform-filter').forEach(cb => cb.checked = true);
  document.getElementById('historySortOrder').value = 'newest';
  
  filterHistory(); // 초기 렌더링
  
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function filterHistory() {
  const historyList = document.getElementById('historyList');
  const searchTerm = document.getElementById('historySearch').value.toLowerCase();
  const selectedPlatforms = Array.from(document.querySelectorAll('.history-platform-filter:checked'))
    .map(cb => cb.value);
  const sortOrder = document.getElementById('historySortOrder').value;
  
  if (contentHistory.length === 0) {
    historyList.innerHTML = '<p class="text-gray-500 text-center py-8">생성 히스토리가 없습니다</p>';
    return;
  }
  
  // 필터링
  let filtered = contentHistory.filter(item => {
    // 검색어 필터
    const matchesSearch = !searchTerm || 
      item.brand.toLowerCase().includes(searchTerm) ||
      (item.keywords && item.keywords.toLowerCase().includes(searchTerm));
    
    // 플랫폼 필터
    const matchesPlatform = selectedPlatforms.length === 0 ||
      item.platforms.some(p => selectedPlatforms.includes(p));
    
    return matchesSearch && matchesPlatform;
  });
  
  // 정렬
  filtered.sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortOrder === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortOrder === 'brand') {
      return a.brand.localeCompare(b.brand);
    }
    return 0;
  });
  
  // 렌더링
  if (filtered.length === 0) {
    historyList.innerHTML = '<p class="text-gray-500 text-center py-8">검색 결과가 없습니다</p>';
    return;
  }
  
  const platformNames = {
    blog: '📝 블로그',
    instagram: '📸 인스타',
    threads: '🧵 스레드',
    youtube: '🎬 유튜브'
  };
  
  historyList.innerHTML = filtered.map(item => `
    <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1">
          <h4 class="font-bold text-gray-800 text-lg">${item.brand}</h4>
          <div class="flex flex-wrap gap-1 mt-1">
            ${item.platforms.map(p => `<span class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">${platformNames[p]}</span>`).join('')}
          </div>
          ${item.keywords ? `<p class="text-sm text-gray-600 mt-1">키워드: ${item.keywords}</p>` : ''}
        </div>
        <div class="flex gap-2 ml-4">
          <button
            onclick="viewHistory(${item.id})"
            class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm whitespace-nowrap"
          >
            👁 보기
          </button>
          <button
            onclick="deleteHistory(${item.id})"
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm whitespace-nowrap"
          >
            🗑 삭제
          </button>
        </div>
      </div>
      <p class="text-xs text-gray-500">
        <i class="fas fa-clock mr-1"></i>${new Date(item.createdAt).toLocaleString()}
      </p>
    </div>
  `).join('');
}

function exportHistoryAsExcel() {
  if (contentHistory.length === 0) {
    showToast('❌ 내보낼 히스토리가 없습니다', 'error');
    return;
  }
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `콘텐츠생성_히스토리_${date}.xls`;
  
  const platformNames = {
    blog: '네이버블로그',
    instagram: '인스타그램',
    instagram_feed: '인스타그램 피드',
    threads: '스레드',
    youtube: '유튜브숏폼',
    youtube_longform: '유튜브 롱폼',
    shortform_multi: '숏폼',
    tiktok: '틱톡',
    instagram_reels: '인스타 릴스',
    metadata_generation: '메타데이터'
  };
  
  // HTML 테이블 형식
  let tableRows = contentHistory.map(item => {
    const platformsText = item.platforms.map(p => platformNames[p]).join(', ');
    const contentSummary = Object.entries(item.results)
      .map(([platform, content]) => `[${platformNames[platform]}]\n${content.substring(0, 100)}...`)
      .join('\n\n');
    
    return `
      <tr>
        <td>${new Date(item.createdAt).toLocaleString()}</td>
        <td>${item.brand}</td>
        <td>${item.keywords || ''}</td>
        <td>${platformsText}</td>
        <td style="white-space: pre-wrap;">${contentSummary}</td>
      </tr>
    `;
  }).join('');
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; width: 100%; font-family: 'Malgun Gothic', sans-serif; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
        th { background-color: #667eea; color: white; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>콘텐츠 생성 히스토리</h2>
      <p>내보낸 날짜: ${date}</p>
      <table>
        <thead>
          <tr>
            <th width="150">생성일시</th>
            <th width="120">브랜드명</th>
            <th width="150">키워드</th>
            <th width="120">플랫폼</th>
            <th>콘텐츠 미리보기</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff', htmlContent], { 
    type: 'application/vnd.ms-excel;charset=utf-8' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('✅ 히스토리 Excel 내보내기 완료!', 'success');
}

function viewHistory(id) {
  const item = contentHistory.find(h => h.id === id);
  if (!item) return;
  
  resultData = item.results;
  displayResults(item.results, item.platforms);
  
  closeModal('historyModal');
  showToast('✅ 히스토리를 불러왔습니다', 'success');
}

function deleteHistory(id) {
  if (!confirm('이 히스토리를 삭제하시겠습니까?')) return;
  
  contentHistory = contentHistory.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(contentHistory));
  
  openHistoryModal();
  showToast('✅ 히스토리가 삭제되었습니다', 'success');
}

// ===================================
// 모달 관리
// ===================================
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

// ===================================
// 개별 콘텐츠 문서 업로드 처리 (NEW v7.0)
// ===================================

// ===================================
// 전역 함수 노출
// ===================================
window.removeImage = removeImage;
window.openImageEditor = openImageEditor;
window.applyImageFilter = applyImageFilter;
window.compressImage = compressImage;
window.saveEditedImage = saveEditedImage;
window.closeImageEditor = closeImageEditor;
window.switchTab = switchTab;
window.copyToClipboard = copyToClipboard;
window.closeModal = closeModal;
window.saveTemplate = saveTemplate;
window.resetTemplate = resetTemplate;
window.loadProfile = loadProfile;
window.deleteProfile = deleteProfile;
window.viewHistory = viewHistory;
window.deleteHistory = deleteHistory;
window.closeErrorModal = closeErrorModal;
window.retryGeneration = retryGeneration;

// 콘텐츠 블록 생성 함수
window.generateContentBlocks = generateContentBlocks;
window.updateContentData = updateContentData;
window.suggestKeywordsForContent = suggestKeywordsForContent;

// ===================================
// 회원 인증 및 등급 관리 (NEW v7.1)
// ===================================

// Supabase 클라이언트 초기화
const SUPABASE_URL = 'https://gmjbsndricdogtqsovnb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtamJzbmRyaWNkb2d0cXNvdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzE1ODksImV4cCI6MjA4Mjg0NzU4OX0.naZnsBPYd84pdLoLAh-mEz_qerl5UakYs2FfVumnEJw';

// Supabase 클라이언트 (CDN에서 로드)
let supabaseClient = null;

// 사용자 상태 (하이브리드 플랜)
let currentUser = {
  id: null,
  isLoggedIn: false,
  isGuest: true,
  name: null,
  email: null,
  subscription_status: 'active', // 단일 구독 플랜
  monthly_included_count: 50, // 월 50회 포함
  monthly_used_count: 0, // 이번 달 사용 횟수
  monthly_remaining: 50, // 남은 포함 횟수
  credits: 0 // 추가 크레딧
};

// Supabase 클라이언트 초기화
async function initSupabase() {
  try {
    // Supabase JS SDK를 동적으로 로드
    if (typeof window.supabase === 'undefined') {
      // CDN에서 Supabase 로드
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase 클라이언트 초기화 완료');
        checkSupabaseSession();
      };
      document.head.appendChild(script);
    } else {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      checkSupabaseSession();
    }
  } catch (error) {
    console.error('❌ Supabase 초기화 실패:', error);
  }
}

// Supabase 세션 확인
async function checkSupabaseSession() {
  console.log('🔍 checkSupabaseSession 호출됨');
  
  if (!supabaseClient) {
    console.error('❌ supabaseClient가 없습니다');
    return;
  }
  
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    console.log('📦 getSession 결과:', { session: !!session, error });
    
    if (error) {
      console.error('세션 확인 실패:', error);
      return;
    }
    
    if (session) {
      // 신규 사용자 확인 (created_at과 last_sign_in_at이 거의 같으면 신규)
      const createdAt = new Date(session.user.created_at).getTime();
      const lastSignInAt = new Date(session.user.last_sign_in_at).getTime();
      const isNewUser = Math.abs(createdAt - lastSignInAt) < 5000; // 5초 이내면 신규
      
      // 로그인 상태
      currentUser = {
        id: session.user.id,  // ✅ 추가: 사용자 ID
        isLoggedIn: true,
        isGuest: false,
        name: session.user.user_metadata.full_name || session.user.email,
        email: session.user.email,
        credits: 3, // TODO: 서버에서 실제 크레딧 조회
        tier: 'free', // TODO: 서버에서 실제 등급 조회
        subscription_status: 'free'
      };
      
      localStorage.setItem('postflow_user', JSON.stringify(currentUser));
      localStorage.setItem('postflow_token', session.access_token);
      
      updateAuthUI();
      
      // 서버에 사용자 정보 동기화 (신규 여부 전달)
      syncUserToBackend(session, isNewUser);
    } else {
      // 비로그인 상태
      handleAuthError();
    }
  } catch (error) {
    console.error('세션 확인 오류:', error);
  }
}

// 서버에 사용자 정보 동기화
async function syncUserToBackend(session, isNewUser = false) {
  try {
    console.log('🚀 syncUserToBackend 시작:', {
      user_id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata.full_name || session.user.email,
      isNewUser
    });
    
    const response = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        user_id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata.full_name || session.user.email
      })
    });
    
    console.log('📡 /api/auth/sync 응답:', {
      status: response.status,
      ok: response.ok
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ /api/auth/sync 성공:', data);
      
      // 서버에서 받은 정보 업데이트
      currentUser.tier = data.tier || 'free'; // 'guest' | 'free' | 'paid'
      currentUser.credits = data.credits || 10;
      
      localStorage.setItem('postflow_user', JSON.stringify(currentUser));
      updateAuthUI();
      
      // 신규 사용자 / 기존 사용자 환영 메시지
      if (isNewUser) {
        showWelcomeMessage('signup');
      } else {
        showWelcomeMessage('login');
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: '응답 파싱 실패' }));
      console.error('❌ /api/auth/sync 실패:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
    }
  } catch (error) {
    console.error('❌ 사용자 동기화 에러:', error);
  }
}

// 환영 메시지 표시 (하이브리드 플랜)
function showWelcomeMessage(type) {
  const messages = {
    signup: {
      title: '🎉 회원가입 완료!',
      message: `환영합니다, ${currentUser.name}님!<br><br>🎁 무료 회원 혜택<br>• 매월 10크레딧 자동 지급<br>• 1크레딧 = 1회 생성<br><br>💎 유료 플랜 (₩9,900)<br>• 50크레딧 구매 (소진 시까지 유지)<br>• 추가 크레딧: ₩200/개`,
      duration: 6000
    },
    login: {
      title: '👋 다시 오신 것을 환영합니다!',
      message: `${currentUser.name}님, 반갑습니다!<br><br>${currentUser.tier === 'free' ? '🎁 무료 회원' : '💎 유료 회원'}<br>• 남은 크레딧: <strong>${currentUser.credits}개</strong><br>• 1크레딧 = 1회 생성`,
      duration: 4000
    }
  };
  
  const msg = messages[type];
  
  // 메시지 컨테이너 생성
  const messageDiv = document.createElement('div');
  messageDiv.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-fade-in';
  messageDiv.innerHTML = `
    <div class="flex items-start">
      <div class="flex-1">
        <h3 class="text-xl font-bold text-gray-800 mb-2">${msg.title}</h3>
        <p class="text-gray-600">${msg.message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600 ml-4">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(messageDiv);
  
  // 자동 제거
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.style.opacity = '0';
      messageDiv.style.transform = 'translateY(-20px) translateX(-50%)';
      setTimeout(() => messageDiv.remove(), 300);
    }
  }, msg.duration);
}

// UI 초기화
function initializeAuth() {
  // Supabase 초기화
  initSupabase();
  
  // 로컬 스토리지에서 사용자 정보 확인
  const savedUser = localStorage.getItem('postflow_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateAuthUI();
  } else {
    // 비회원 상태로 시작
    currentUser.isGuest = true;
    currentUser.tier = 'guest';
    currentUser.credits = 1;
    updateAuthUI();
  }
}

// 인증 상태 확인
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('postflow_token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser = {
        id: data.user?.id || null,  // ✅ 추가: 사용자 ID
        isLoggedIn: !data.is_guest,
        isGuest: data.is_guest,
        name: data.user?.name || '게스트',
        email: data.user?.email || null,
        credits: data.user?.credits || 1,
        tier: data.user?.subscription_status === 'active' ? 'paid' : (data.is_guest ? 'guest' : 'free'),
        subscription_status: data.user?.subscription_status
      };
      
      localStorage.setItem('postflow_user', JSON.stringify(currentUser));
      updateAuthUI();
    } else {
      // 토큰 만료 또는 유효하지 않음
      handleAuthError();
    }
  } catch (error) {
    console.error('인증 확인 실패:', error);
  }
}

// UI 업데이트
function updateAuthUI() {
  const userInfoArea = document.getElementById('userInfoArea');
  const guestArea = document.getElementById('guestArea');
  const memberFeaturesArea = document.getElementById('memberFeaturesArea');
  const heroSection = document.getElementById('heroSection');
  const userName = document.getElementById('userName');
  const userTier = document.getElementById('userTier');
  const userCredits = document.getElementById('userCredits');
  
  if (currentUser.isLoggedIn && !currentUser.isGuest) {
    // 로그인 상태 (하이브리드 플랜)
    userInfoArea.classList.remove('hidden');
    guestArea.classList.add('hidden');
    memberFeaturesArea.classList.remove('hidden');
    
    // 히어로 섹션 숨기기
    if (heroSection) {
      heroSection.classList.add('hidden');
    }
    
    userName.textContent = currentUser.name || '사용자';
    // Tier 표시
    const tierLabels = {
      'guest': '비회원',
      'free': '무료',
      'paid': '유료'
    };
    userTier.textContent = tierLabels[currentUser.tier] || '무료';
    userCredits.textContent = `${currentUser.credits}크레딧`;
  } else {
    // 비회원/게스트 상태
    userInfoArea.classList.add('hidden');
    guestArea.classList.remove('hidden');
    memberFeaturesArea.classList.add('hidden');
    
    // 히어로 섹션 표시
    if (heroSection) {
      heroSection.classList.remove('hidden');
    }
  }
}

// 인증 에러 처리 (하이브리드 플랜)
function handleAuthError() {
  localStorage.removeItem('postflow_token');
  localStorage.removeItem('postflow_user');
  currentUser = {
    id: null,
    isLoggedIn: false,
    isGuest: true,
    name: null,
    email: null,
    tier: 'guest', // 'guest' | 'free' | 'paid'
    credits: 1 // 비회원 1크레딧
  };
  updateAuthUI();
}

// Google 로그인 (Supabase OAuth)
async function handleLogin() {
  if (!supabaseClient) {
    alert('인증 시스템을 초기화하는 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  
  // 안전한 로그인 안내
  const confirmed = confirm(
    '🔐 안전한 Google 로그인\n\n' +
    '✅ Google 공식 인증 서비스를 사용합니다\n' +
    '✅ 비밀번호는 저장되지 않습니다\n' +
    '✅ 언제든지 연동을 해제할 수 있습니다\n\n' +
    '로그인하시겠습니까?'
  );
  
  if (!confirmed) {
    return;
  }
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    
    if (error) {
      console.error('Google 로그인 실패:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    }
    
    // OAuth는 자동으로 리디렉션됩니다
  } catch (error) {
    console.error('로그인 오류:', error);
    alert('로그인 중 오류가 발생했습니다.');
  }
}

// 로그아웃
async function handleLogout() {
  if (confirm('로그아웃 하시겠습니까?')) {
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          console.error('로그아웃 실패:', error);
        }
      }
      
      localStorage.removeItem('postflow_token');
      localStorage.removeItem('postflow_user');
      handleAuthError();
      showToast('로그아웃되었습니다', 'success');
      
      // 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  }
}

// 무료 체험 시작
function handleTrial() {
  if (currentUser.isGuest && currentUser.credits > 0) {
    showToast('비회원 체험 1회를 사용할 수 있습니다', 'info');
    // 콘텐츠 생성 폼으로 스크롤
    document.getElementById('contentForm').scrollIntoView({ behavior: 'smooth' });
  } else if (currentUser.credits === 0) {
    showToast('체험 횟수를 모두 사용했습니다. 로그인 후 이용해주세요', 'warning');
  }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  // 인증 초기화
  initializeAuth();
  
  // 로그인 버튼들
  const signupBtn = document.getElementById('signupBtn');
  const loginBtn = document.getElementById('loginBtn');
  const heroLoginBtn = document.getElementById('heroLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const heroTrialBtn = document.getElementById('heroTrialBtn');
  
  // 회원가입과 로그인 모두 Google OAuth로 연결
  if (signupBtn) signupBtn.addEventListener('click', handleLogin);
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (heroLoginBtn) heroLoginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (heroTrialBtn) heroTrialBtn.addEventListener('click', handleTrial);
  
  // 회원 전용 버튼 클릭 시 로그인 유도
  const memberButtons = ['saveProfileBtn', 'loadProfileBtn', 'historyBtn', 'templateBtn'];
  memberButtons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      const originalClick = btn.onclick;
      btn.addEventListener('click', (e) => {
        if (currentUser.isGuest) {
          e.preventDefault();
          e.stopPropagation();
          if (confirm('이 기능은 회원 전용입니다. 로그인 하시겠습니까?')) {
            handleLogin();
          }
          return false;
        }
      });
    }
  });
});

// 전역 노출
window.initializeAuth = initializeAuth;
window.initSupabase = initSupabase;
window.checkSupabaseSession = checkSupabaseSession;
window.checkAuthStatus = checkAuthStatus;
window.updateAuthUI = updateAuthUI;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.handleTrial = handleTrial;
window.currentUser = currentUser;
window.supabaseClient = null; // 초기화 후 접근 가능

