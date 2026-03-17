// ===================================
// Multi-Platform Content Generator v3.2 Final
// 백엔드 API 키, 확장된 프로필 관리
// ===================================

// 전역 변수
let authMode = 'signup'; // 인증 모드 (signup or login)

// 인앱 브라우저 감지 (Google OAuth 차단 대응)
function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  // 카카오톡, 네이버, 인스타그램, 페이스북, 라인, 밴드, 트위터 등 인앱 브라우저
  const inAppPatterns = [
    'KAKAOTALK', 'NAVER', 'Instagram', 'FBAN', 'FBAV', 'FB_IAB',
    'Line/', 'BAND/', 'Daum', 'Twitter', 'Snapchat',
    'wv', 'WebView'  // Android WebView 일반
  ];
  return inAppPatterns.some(p => ua.includes(p));
}
let selectedImages = []; // 더 이상 사용 안 함 (개별 콘텐츠로 변경)
let contentBlocks = {}; // { 0: { images: [], keywords: '', topic: '', description: '' }, 1: {...}, ... }
let contentPlatforms = {}; // 콘텐츠별 플랫폼 선택 상태 (Option B)
let resultData = {};
let _previewFrameEnabled = true; // 프리뷰 프레임 토글 상태 (기본: ON)
let savedProfiles = [];
let contentHistory = [];
let customTemplates = [];
let currentEditImageIndex = null;
let currentEditingProfileId = null; // 프로필 수정 시 사용
let lastFormData = null; // 재시도용

// 🔄 멀티탭 크레딧 동기화
const creditSyncChannel = new BroadcastChannel('marketing_hub_credits');

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

// ===================================
// Feature Flags (안전 배포용)
// ===================================
const FEATURE_FLAGS = {
  ENABLE_CUSTOM_TEMPLATES: true, // 템플릿 저장 기능
  ENABLE_TWITTER: false,          // Twitter 플랫폼
  ENABLE_LINKEDIN: false,         // LinkedIn 플랫폼
  ENABLE_KAKAOTALK: false,        // KakaoTalk 플랫폼
  ENABLE_SCHEDULE: false,         // 발행 예정 기능
};

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
  
  twitter: `당신은 트위터(X) 마이크로블로깅 마케팅 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

【작성 목표】
제공된 이미지를 분석하여, 280자 제한 내에서 최대의 바이럴 효과와 참여를 이끌어내는 트윗을 작성하세요.

【필수 작성 요소】

1. **후킹 (첫 줄, 30자 이내)**
   - 충격/질문/숫자로 시작
   - 예: "🔥 이거 모르면 손해봅니다"
   - 스크롤을 멈추게 하는 첫인상

2. **핵심 메시지 (100~200자)**
   
   2-1. 이미지 핵심 포인트
   - 제공 이미지의 가장 중요한 1가지
   - "핵심은 이거예요" 직설적 표현
   - 사실/숫자로 신뢰도 확보
   
   2-2. 가치 제공
   - {타겟연령대}가 원하는 정보
   - 1~2문장으로 압축
   - 즉시 활용 가능한 팁
   
   2-3. 감정 자극
   - 공감/놀람/긴급성 중 1개
   - 이모지 1~2개만 사용
   - {톤앤매너} 반영

3. **CTA (마지막 줄, 20자 이내)**
   - "어떻게 생각하세요?"
   - "RT 부탁드립니다 🔁"
   - 명확한 행동 유도

4. **해시태그 (3~5개)**
   - 핵심 키워드 2개
   - 트렌딩 태그 1~2개
   - 브랜드 태그 1개

【글쓰기 규칙】

✅ 필수:
- 총 250~280자 (해시태그 포함)
- 문장 최대 30자
- 줄바꿈 최소화 (2개 이내)
- 구어체 자연스럽게
- {톤앤매너} 일관성

❌ 금지:
- 장문 설명 (간결하게!)
- 전문 용어 남발
- 이모지 과다 (3개 이하)
- 과도한 홍보 느낌

【트위터 특성】
- 280자 엄격 제한
- 빠른 소비와 확산
- 리트윗/댓글 유도
- 한 줄에 모든 것을 담기
- 타임라인 경쟁 고려`,
  
  linkedin: `당신은 LinkedIn 비즈니스 콘텐츠 마케팅 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

【작성 목표】
제공된 이미지를 분석하여, 전문성과 신뢰도를 갖춘 LinkedIn 포스트를 작성하세요. 비즈니스 인사이트와 실행 가능한 가치를 제공하는 것이 핵심입니다.

【필수 작성 요소】

1. **후킹 헤드라인 (30자 이내)**
   - 전문적이면서 호기심 자극
   - 예: "💡 3년간의 실패에서 배운 {키워드} 전략"
   - 비즈니스 가치 명확히

2. **본문 (1500~3000자)**
   
   2-1. 문제 제기 (200자)
   - 독자가 공감하는 비즈니스 과제
   - 통계/데이터로 신뢰성 확보
   - "{산업분야}에서 이런 문제 겪고 계신가요?"
   
   2-2. 이미지 분석 (300자)
   - 제공 이미지의 핵심 포인트
   - 비즈니스 맥락에서 해석
   - 실제 사례 연결
   
   2-3. 솔루션/인사이트 (600자)
   - 구체적이고 실행 가능한 조언
   - 3-5가지 핵심 팁
   - 각 팁마다 "어떻게, 왜" 설명
   - {타겟연령대} 전문가 관점
   
   2-4. 스토리텔링 (400자)
   - 개인 경험 또는 고객 사례
   - 감정적 연결
   - 진정성 있는 톤

3. **CTA (마무리, 100자)**
   - 의견 요청: "여러분의 경험은 어떠신가요?"
   - 연결 제안: "더 자세한 이야기 나누고 싶으신 분은 연결 요청 주세요"
   - 토론 유도

4. **해시태그 (3~5개)**
   - 전문 용어 중심
   - 산업 관련 태그
   - 브랜드 태그
   - 예: #비즈니스전략 #마케팅인사이트 #{산업분야}

【글쓰기 규칙】

✅ 필수:
- 총 1500~3000자
- 전문적이지만 접근하기 쉬운 톤
- 단락 구분 명확 (2-3줄씩)
- 이모티콤 최소화 (1-2개)
- {톤앤매너} 반영하되 전문성 유지
- 데이터/숫자로 신뢰성 확보
- 실행 가능한 팁 제공

❌ 금지:
- 과도한 홍보
- 전문 용어 남발
- 이모티콘 과다
- 짧은 글 (최소 1500자)

【LinkedIn 특성】
- 비즈니스 네트워킹 플랫폼
- 전문성과 인사이트 중시
- 긴 글도 환영 (3000자 OK)
- 댓글과 토론 활발
- 신뢰도가 핵심`,
  
  kakaotalk: `당신은 카카오톡 채널 메시지 마케팅 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

【작성 목표】
제공된 이미지를 분석하여, 카카오톡 채널에 최적화된 짧고 친근한 메시지를 작성하세요. 모바일 메신저 환경에서 빠르게 읽히고 즉각적인 행동을 유도하는 것이 핵심입니다.

【필수 작성 요소】

1. **인사/훅 (20자 이내)**
   - 친근한 첫인사 + 이모티콘
   - 예: "안녕하세요! 🎉"
   - 또는 충격적 훅: "오늘만 특가! 🔥"

2. **핵심 메시지 (50~100자)**
   - 한눈에 이해되는 가치 제안
   - "{브랜드명}의 {키워드} 소식이에요"
   - 짧고 명확하게
   - 이모티콘 1-2개

3. **이미지 포인트 (100~150자)**
   - 제공 이미지의 핵심 1-2가지
   - "이 이미지 보셨나요? ✨"
   - 포인트 1: [특징]
   - 포인트 2: [혜택]
   - 줄바꿈으로 가독성 확보

4. **특별 혜택/이벤트 (100~150자)**
   - 할인, 쿠폰, 이벤트 안내
   - "🎁 지금 가입하면"
   - "⏰ 오늘까지만"
   - 긴급성/희소성 강조
   - 숫자로 명확히 (예: "50% 할인")

5. **CTA (30자 이내)**
   - 명확한 행동 유도
   - "👉 지금 바로 확인하기"
   - "👉 예약하러 가기"
   - "👉 쿠폰 받기"

6. **이모티콘 (5~7개)**
   - 적극 활용
   - 각 섹션마다 1-2개
   - 친근함과 가독성 향상

【글쓰기 규칙】

✅ 필수:
- 총 400~500자
- 반말 또는 존댓말 ({톤앤매너}에 맞춤)
- 줄바꿈 자주 (2-3줄마다)
- 짧은 문장 (10-15자)
- 이모티콘 5-7개
- 긴급성/희소성 강조
- CTA 버튼형 문구

❌ 금지:
- 장문 설명 (500자 초과)
- 딱딱한 말투
- 줄바꿈 없는 긴 문장
- 이모티콘 없음 (필수!)
- 애매한 CTA

【카카오톡 특성】
- 모바일 메신저 환경
- 빠른 읽기와 즉시 행동
- 친구처럼 말하기
- 푸시 알림 최적화
- 짧고 강렬하게`,
  
  brunch: `당신은 브런치(Brunch) 에세이 및 스토리텔링 콘텐츠 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

【작성 목표】
제공된 이미지를 분석하여, 브런치 플랫폼 특성에 맞는 감성적이고 깊이 있는 스토리텔링 콘텐츠를 작성하세요. 독자에게 여운을 남기고, 공감과 울림을 주는 것이 핵심입니다.

【필수 작성 요소】

1. **제목 (Title)**
   - 감성적이고 은유적인 표현
   - 호기심과 공감을 동시에 자극
   - 예: "그날, 나는 {키워드}를 통해 나를 발견했다"
   - 예: "{키워드}가 내게 가르쳐준 삶의 의미"
   - 20~30자 이내
   - 이모지 사용 자제 (텍스트 중심)

2. **서론 (200~300자)**
   - 개인적 경험이나 일상의 순간으로 시작
   - 독자가 공감할 수 있는 감정 묘사
   - "{타겟연령대}라면 누구나 경험했을 그 순간"
   - 부드러운 도입으로 독자 몰입 유도
   - 문학적 표현 활용

3. **본문 (2000~3500자)**
   
   3-1. 이미지 스토리텔링 (600자)
   - 제공된 이미지를 감성적으로 해석
   - "이 사진 속에는 ___의 이야기가 담겨 있다"
   - 이미지의 분위기, 색감, 구도를 문학적으로 묘사
   - 독자가 함께 그 장면을 상상하도록 유도
   
   3-2. 개인적 경험/인사이트 (800자)
   - {브랜드명}과의 경험을 스토리로 풀어냄
   - 변화의 순간, 깨달음의 과정
   - "처음엔 ___했지만, 이제는 ___하게 되었다"
   - {산업분야}와 관련된 개인적 통찰
   - 솔직하고 진솔한 톤
   
   3-3. 보편적 공감 (600자)
   - 개인 경험을 보편적 주제로 확장
   - "{타겟연령대}라면 누구나 느끼는 감정"
   - 삶, 관계, 성장 등 본질적 주제 연결
   - 독자 스스로 생각해보게 하는 질문 던지기
   
   3-4. 실용적 가치 (500자)
   - 감성 속에 실용성 녹이기
   - {키워드}를 통해 얻은 구체적 변화 3가지
   - 추천하는 이유를 스토리로 포장
   - "당신에게도 이런 변화가 찾아올 것"

4. **마무리 (200~300자)**
   - 여운을 남기는 문장
   - 독자에게 건네는 따뜻한 메시지
   - "당신의 이야기도 들려주세요" 형태로 소통 유도
   - 희망적이거나 위로하는 톤
   - 강요하지 않는 자연스러운 마무리

5. **부제/소제목 (선택)**
   - 본문을 2-3개 섹션으로 나눌 경우 사용
   - 감성적이고 운율 있는 표현
   - 예: "첫 번째 문을 열다"
   - 예: "그리고 나는 변화했다"

【글쓰기 규칙】

✅ 필수:
- 총 2500~4000자 (장문 환영)
- 문학적이고 감성적인 문체
- 단락 구분 명확 (3-5줄씩)
- 줄바꿈으로 호흡 조절
- 이모지 최소화 (없거나 1-2개)
- {톤앤매너} 반영하되 진솔함 유지
- 개인 경험 + 보편적 공감 조화
- 독자와의 교감 중시
- 사진/이미지 묘사 문학적으로

❌ 금지:
- 과도한 홍보성 문구
- 딱딱하고 기계적인 문체
- 짧은 글 (최소 2500자)
- 이모지 남발
- 단순 정보 나열
- 명령조/강요 톤

【브런치 플랫폼 특성】
- 긴 글 읽기에 최적화된 환경
- 에세이, 칼럼, 스토리텔링 중심
- 독자들이 깊이 있는 콘텐츠 선호
- 댓글과 공감으로 소통
- 작가의 개성과 목소리 중요
- 감성과 실용의 균형
- 브랜드보다 사람이 먼저`,
  
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
참여율: [%]`,

  // ===================================
  // 신규 플랫폼: Twitter
  // ===================================
  twitter: `당신은 X(트위터) 마케팅 전문가입니다.

【브랜드 정보】
- 브랜드/서비스/상품: {브랜드명}
- 핵심 키워드: {키워드}
- 산업 분야: {산업분야}
- 타겟: {타겟연령대} {타겟성별}
- 톤앤매너: {톤앤매너}

**절대적 제약:**
- **최대 280자** (공백, 해시태그 포함, 초과 절대 금지)
- 한글 기준 약 140자
- 해시태그 포함 시 글자 수에 포함

【작성 요구사항】

1. **훅(Hook)** - 첫 20자
   - 스크롤을 멈추게 하는 강렬한 시작
   - 질문형, 숫자형, 충격형 중 선택
   - 예: "90%가 놓치는...", "당신도 이랬나요?", "결론부터 말하면..."

2. **핵심 메시지** - 60-80자
   - 단 하나의 명확한 메시지
   - 이미지 내용과 연결
   - {키워드} 자연스럽게 포함

3. **CTA** - 20-30자
   - 명확한 행동 유도
   - "RT하면...", "답글로 공유", "링크 확인" 등

4. **해시태그** - 3-5개 (30자 이내)
   - 메인 키워드 + 트렌딩 태그
   - #브랜드명 #키워드 #산업분야

5. **이모티콘** - 2-3개
   - 감정 표현 또는 강조용
   - 과도하지 않게

【출력 형식】

━━━━━━━━━━━━━━━━
🐦 트위터 포스트
━━━━━━━━━━━━━━━━

[훅 문장] 🔥

[핵심 메시지 2-3문장]

[CTA] 👉

#태그1 #태그2 #태그3

━━━━━━━━━━━━━━━━
📊 글자 수: [정확한 글자 수]
━━━━━━━━━━━━━━━━

⚠️ 최종 체크:
✓ 280자 이내 (공백 포함) - 필수!
✓ 훅 문장 명확
✓ CTA 포함
✓ 해시태그 3-5개
✓ 이모티콘 2-3개

【금지 사항】
❌ 280자 초과 (절대 불가)
❌ 긴 문장 (Twitter는 짧고 강렬하게)
❌ 과도한 이모티콘 (3개 이상)
❌ 해시태그 남발 (5개 이하)`
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
  
  // 온보딩 초기화 (사용자 로그인 후) - 비활성화
  // 사용자 피드백: 팝업이 부담스럽다는 의견으로 비활성화
  /*
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      // 온보딩 시스템 초기화
      if (typeof window.initOnboarding === 'function') {
        await window.initOnboarding(user.id);
      }
    }
  } catch (error) {
    console.error('온보딩 초기화 실패:', error);
  }
  */
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

  // 히스토리와 템플릿 버튼은 5857줄에서 처리됨 (중복 제거)

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
  // 💎 최신 크레딧 정보 동기화 (window.userCreditsInfo 우선 사용)
  if (window.userCreditsInfo && window.currentUser) {
    window.currentUser.free_credits = window.userCreditsInfo.free_credits ?? window.currentUser.free_credits ?? 0;
    window.currentUser.paid_credits = window.userCreditsInfo.paid_credits ?? window.currentUser.paid_credits ?? 0;
    console.log('💎 하단 크레딧 표시 동기화:', {
      free: window.currentUser.free_credits,
      paid: window.currentUser.paid_credits,
      total: window.currentUser.free_credits + window.currentUser.paid_credits
    });
  } else if (window.currentUser && window.currentUser.id && !window.currentUser.isGuest) {
    // 🔥 크레딧 정보가 없으면 즉시 로드 시도
    console.log('⚠️ window.userCreditsInfo 없음, 크레딧 정보 로드 시도');
    if (typeof loadKeywordCreditStatus === 'function') {
      loadKeywordCreditStatus(); // 크레딧 정보 로드
    }
  }
  
  // 개별 콘텐츠 블록의 총 이미지 수 계산
  let totalImageCount = 0;
  const contentCount = Object.keys(contentBlocks).length;
  
  Object.values(contentBlocks).forEach(block => {
    totalImageCount += (block.images || []).length;
  });
  
  const platformCheckboxes = document.querySelectorAll('input[name="platform"]:checked');
  const platformCount = platformCheckboxes.length;
  
  // ✅ costEstimate 엘리먼트 존재 확인 (하단 일괄 생성 UI 제거로 인한 null 방지)
  const costElement = document.getElementById('costEstimate');
  if (!costElement) {
    console.log('ℹ️ costEstimate 엘리먼트 없음 (개별 생성 모드)');
    return;
  }

  if (totalImageCount === 0 || platformCount === 0 || contentCount === 0) {
    costElement.innerHTML = `
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
  // NEW v11.34.0: 크레딧 계산 (플랫폼 1개당 1크레딧)
  // ===================================
  
  // 플랫폼 1개당 1크레딧 로직 (콘텐츠 개수 × 플랫폼 개수)
  const creditsNeeded = contentCount * platformCount;
  
  // 🔥 크레딧 정보 가져오기 (window.userCreditsInfo 우선, 없으면 currentUser 사용)
  const freeCredits = window.userCreditsInfo?.free_credits ?? currentUser.free_credits ?? 0;
  const paidCredits = window.userCreditsInfo?.paid_credits ?? currentUser.paid_credits ?? 0;
  const totalCredits = freeCredits + paidCredits;
  
  console.log('📊 [updateCostEstimate] 크레딧 정보:', {
    source: window.userCreditsInfo ? 'window.userCreditsInfo' : 'currentUser',
    free: freeCredits,
    paid: paidCredits,
    total: totalCredits,
    needed: creditsNeeded,
    sufficient: totalCredits >= creditsNeeded  // ✅ 충분한지 여부 추가
  });
  
  let costInfoHTML = '';
  let statusBadge = '';
  let gradientColor = '';
  
  if (currentUser.isGuest) {
    // 비회원: 로그인 유도
    gradientColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    statusBadge = '<span style="background: rgba(255,255,255,0.3); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">🔐 로그인 필요</span>';
    
    costInfoHTML = `
      <div style="background: rgba(255,255,255,0.2); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; text-align: center;">
        <div style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem;">
          로그인이 필요한 서비스입니다
        </div>
        <p style="font-size: 0.95rem; opacity: 0.9; margin: 0;">
          가입만 해도 <strong>월 30크레딧 무료</strong> 제공!
        </p>
      </div>
    `;
  } else if (currentUser.tier === 'free' || currentUser.subscription_status === 'free') {
    // 무료 회원 - 2지갑 크레딧 시스템
    gradientColor = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    statusBadge = '<span style="background: rgba(255,255,255,0.3); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">🎉 무료 회원</span>';
    
    let creditDisplayText = '';
    if (freeCredits === 0 && paidCredits > 0) {
      creditDisplayText = `${totalCredits}개 (유료)`;
    } else if (paidCredits === 0 && freeCredits > 0) {
      creditDisplayText = `${totalCredits}개 (무료)`;
    } else if (freeCredits > 0 && paidCredits > 0) {
      creditDisplayText = `${totalCredits}개 (무료 ${freeCredits} + 유료 ${paidCredits})`;
    } else {
      creditDisplayText = `0개`;
    }
    
    costInfoHTML = `
      <div style="background: rgba(255,255,255,0.2); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; text-align: center;">
        <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 0.8rem; opacity: 0.9;">
          ${creditsNeeded} 크레딧 차감
        </div>
        <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.3rem;">
          현재 보유: ${creditDisplayText}
        </div>
        ${totalCredits < creditsNeeded ? `
          <div style="background: rgba(239, 68, 68, 0.3); border: 1px solid rgba(239, 68, 68, 0.5); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
            <p style="margin: 0; font-size: 0.95rem;">
              ⚠️ 크레딧이 부족합니다 (보유: ${totalCredits}개, 필요: ${creditsNeeded}개). <a href="/payment" style="color: white; text-decoration: underline; font-weight: 600;">충전하기</a>
            </p>
          </div>
        ` : ''}
      </div>
    `;
  } else {
    // 유료 회원
    gradientColor = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
    statusBadge = '<span style="background: rgba(255,255,255,0.3); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">⭐ 유료 회원</span>';
    
    let creditDisplayText = '';
    if (freeCredits === 0 && paidCredits > 0) {
      creditDisplayText = `${totalCredits}개 (유료)`;
    } else if (paidCredits === 0 && freeCredits > 0) {
      creditDisplayText = `${totalCredits}개 (무료)`;
    } else if (freeCredits > 0 && paidCredits > 0) {
      creditDisplayText = `${totalCredits}개 (무료 ${freeCredits} + 유료 ${paidCredits})`;
    } else {
      creditDisplayText = `0개`;
    }
    
    costInfoHTML = `
      <div style="background: rgba(255,255,255,0.2); padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; text-align: center;">
        <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.3rem;">
          ${creditsNeeded} 크레딧 차감
        </div>
        <p style="font-size: 1.1rem; opacity: 0.9; margin: 0;">
          현재 보유: <strong>${creditDisplayText}</strong>
        </p>
        ${totalCredits < creditsNeeded ? `
          <div style="background: rgba(239, 68, 68, 0.3); border: 1px solid rgba(239, 68, 68, 0.5); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
            <p style="margin: 0; font-size: 0.95rem;">
              ⚠️ 크레딧이 부족합니다 (보유: ${totalCredits}개, 필요: ${creditsNeeded}개). <a href="/payment" style="color: white; text-decoration: underline; font-weight: 600;">충전하기</a>
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
        💡 플랫폼 1개당 1크레딧 (선택한 플랫폼 개수만큼 차감)
      </p>
    </div>
  `;
  
  // 🚨 크리티컬: 생성 버튼 실시간 비활성화 (API 비용 낭비 방지)
  const generateBtn = document.querySelector('button[type="submit"]');
  const batchGenerateBtn = document.getElementById('batchGenerateBtn');
  
  const isInsufficientCredits = !currentUser.isGuest && currentUser.id && totalCredits < creditsNeeded;
  
  if (generateBtn) {
    generateBtn.disabled = isInsufficientCredits;
    generateBtn.style.opacity = isInsufficientCredits ? '0.5' : '1';
    generateBtn.style.cursor = isInsufficientCredits ? 'not-allowed' : 'pointer';
    
    if (isInsufficientCredits) {
      generateBtn.title = `크레딧 부족 (필요: ${creditsNeeded}, 보유: ${totalCredits})`;
    } else {
      generateBtn.title = '';
    }
  }
  
  if (batchGenerateBtn) {
    batchGenerateBtn.disabled = isInsufficientCredits;
    batchGenerateBtn.style.opacity = isInsufficientCredits ? '0.5' : '1';
    batchGenerateBtn.style.cursor = isInsufficientCredits ? 'not-allowed' : 'pointer';
    
    if (isInsufficientCredits) {
      batchGenerateBtn.title = `크레딧 부족 (필요: ${creditsNeeded}, 보유: ${totalCredits})`;
    } else {
      batchGenerateBtn.title = '';
    }
  }
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
            <i class="fas fa-image mr-2"></i>이미지 업로드 (최대 10장, 1장당 10MB)
          </label>
          <p class="text-sm text-gray-600 mb-2">
            <i class="fas fa-info-circle mr-1"></i>
            💡 콘텐츠 생성 시 참고할 이미지를 업로드해주세요 (제품 사진, 로고, 참고 자료 등)
          </p>
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
        <div class="mb-4">
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
        
        <!-- 플랫폼 선택 (Option B) -->
        <div class="mb-4">
          <label class="block mb-2 font-semibold text-gray-700">
            <i class="fas fa-share-alt mr-2"></i>발행할 플랫폼 콘텐츠 선택 <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2" id="platformSelect_${i}">
            <!-- 블로그 & SNS 포스트 -->
            <label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="blog" onchange="updateContentPlatforms(${i})">
              <i class="fas fa-blog text-blue-600"></i>
              <span class="text-sm font-medium">네이버 블로그</span>
            </label>
            <label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="instagram_feed" onchange="updateContentPlatforms(${i})">
              <i class="fab fa-instagram text-pink-600"></i>
              <span class="text-sm font-medium">인스타그램 피드</span>
            </label>
            <label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="threads" onchange="updateContentPlatforms(${i})">
              <i class="fas fa-at text-gray-800"></i>
              <span class="text-sm font-medium">스레드</span>
            </label>
            ${FEATURE_FLAGS.ENABLE_TWITTER ? `<label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="twitter" onchange="updateContentPlatforms(${i})">
              <span style="font-size: 1.25rem; font-weight: 600;">𝕏</span>
              <span class="text-sm font-medium">트위터(X)</span>
            </label>` : ''}
            ${FEATURE_FLAGS.ENABLE_LINKEDIN ? `<label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="linkedin" onchange="updateContentPlatforms(${i})">
              <i class="fab fa-linkedin text-blue-700"></i>
              <span class="text-sm font-medium">LinkedIn</span>
            </label>` : ''}
            ${FEATURE_FLAGS.ENABLE_KAKAOTALK ? `<label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="kakaotalk" onchange="updateContentPlatforms(${i})">
              <i class="fas fa-comment-dots text-yellow-500"></i>
              <span class="text-sm font-medium">카카오톡</span>
            </label>` : ''}
            <label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="brunch" onchange="updateContentPlatforms(${i})">
              <i class="fas fa-book-open text-orange-600"></i>
              <span class="text-sm font-medium">브런치</span>
            </label>
            
            <!-- 숏폼 영상 -->
            <label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="tiktok" onchange="updateContentPlatforms(${i})">
              <i class="fab fa-tiktok text-black"></i>
              <span class="text-sm font-medium">틱톡</span>
            </label>
            <label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="instagram_reels" onchange="updateContentPlatforms(${i})">
              <i class="fab fa-instagram text-purple-600"></i>
              <span class="text-sm font-medium">인스타 릴스</span>
            </label>
            <label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="youtube_shorts" onchange="updateContentPlatforms(${i})">
              <i class="fab fa-youtube text-red-500"></i>
              <span class="text-sm font-medium">유튜브 쇼츠</span>
            </label>
            
            <!-- 롱폼 영상 -->
            <label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="youtube_longform" onchange="updateContentPlatforms(${i})">
              <i class="fab fa-youtube text-red-600"></i>
              <span class="text-sm font-medium">유튜브 롱폼</span>
            </label>
            <label class="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition">
              <input type="checkbox" class="content-platform-checkbox" data-content="${i}" value="metadata_generation" onchange="updateContentPlatforms(${i})">
              <i class="fas fa-tags text-blue-600"></i>
              <span class="text-sm font-medium">메타데이터 생성</span>
            </label>
          </div>
        </div>
        
        <!-- 개별 생성 버튼 (Option B) -->
        <div id="contentBlock_${i}" class="flex flex-col gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">💰 예상 크레딧 차감</p>
              <div id="contentCredit_${i}" class="flex items-baseline gap-2">
                <span class="text-2xl font-bold text-purple-600">0 크레딧</span>
              </div>
            </div>
            <button
              type="button"
              onclick="generateSingleContent(${i})"
              class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg whitespace-nowrap"
              id="generateBtn_${i}"
            >
              <i class="fas fa-magic mr-2"></i>
              콘텐츠 #${i + 1} 생성하기
            </button>
          </div>
          <p class="text-xs text-gray-500">
            💡 플랫폼 1개당 1크레딧 (선택한 플랫폼 개수만큼 차감)
          </p>
        </div>
        
        <!-- 개별 결과 영역 (Option B) -->
        <div id="contentResult_${i}" class="hidden mt-4"></div>
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
    <div class="relative group w-full max-h-[200px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200">
      <img src="${img.base64}" class="w-full h-full object-contain" />
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

// 🔒 AI 추천 횟수 제한 (계정별 + 콘텐츠별 독립)
function getAIRecommendKey(contentIndex) {
  const userId = window.currentUser?.id || 'guest';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `ai_recommend_${userId}_content_${contentIndex}_${today}`;
}

function checkAIRecommendLimit(contentIndex) {
  const key = getAIRecommendKey(contentIndex);
  const count = parseInt(localStorage.getItem(key) || '0');
  return count < 10;
}

function incrementAIRecommendCount(contentIndex) {
  const key = getAIRecommendKey(contentIndex);
  const currentCount = parseInt(localStorage.getItem(key) || '0');
  const newCount = currentCount + 1;
  localStorage.setItem(key, newCount.toString());
  
  if (newCount >= 10) {
    console.log(`⚠️ AI 추천 일일 한도 도달 (콘텐츠 #${contentIndex + 1}: ${newCount}/10)`);
    // 해당 콘텐츠의 AI 추천 버튼만 비활성화
    const btn = document.querySelector(`[onclick*="suggestKeywordsForContent(${contentIndex}"]`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-ban"></i> 오늘 한도 초과';
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }
  
  return newCount;
}

// 개별 콘텐츠 AI 키워드 추천
async function suggestKeywordsForContent(index, event) {
  event.preventDefault();
  event.stopPropagation();
  
  // 🔒 콘텐츠별 일일 3회 제한 체크
  if (!checkAIRecommendLimit(index)) {
    showToast(`❌ 콘텐츠 #${index + 1}의 AI 추천은 하루 10회까지만 가능합니다`, 'error');
    return;
  }
  
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
        images: contentBlocks[index].images.slice(0, 3).map(img => ({
          base64: img.base64,
          filename: img.name || `이미지${contentBlocks[index].images.indexOf(img) + 1}`,
          size: img.size || 0
        })),
        brand: brand,
        industry: industry
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.keywords) {
      const keywordsStr = result.keywords.join(', ');
      document.getElementById(`keyword_${index}`).value = keywordsStr;
      updateContentData(index, 'keywords', keywordsStr);
      
      // 🔒 성공 시에만 카운트 증가 (콘텐츠별)
      const currentCount = incrementAIRecommendCount(index);
      
      // ✨ 크레딧 실시간 갱신
      if (result.credits) {
        updateCreditsUI(result.credits);
        // 헤더 크레딧도 업데이트
        if (window.updateHeaderCredits) {
          window.updateHeaderCredits(result.credits);
        }
      }
      
      showToast(`✨ 키워드 추천 완료! (콘텐츠 #${index + 1}: ${currentCount}/3)`, 'success');
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
        images: selectedImages.slice(0, 3).map(img => ({
          base64: img.base64,
          filename: img.name || `이미지${selectedImages.indexOf(img) + 1}`,
          size: img.size || 0
        })), // 최대 3장
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
  // 🔒 로그인 체크 (최우선)
  if (!window.currentUser || window.currentUser.isGuest || !window.currentUser.id) {
    const goToLogin = confirm(
      '🔐 로그인이 필요한 서비스입니다\n\n' +
      '• 가입만 해도 월 30크레딧 무료 지급\n' +
      '• 5개 플랫폼 맞춤 콘텐츠 자동 생성\n' +
      '• 30초 안에 완성되는 AI 콘텐츠\n\n' +
      '로그인 페이지로 이동하시겠습니까?'
    );
    
    if (goToLogin) {
      window.location.href = '/';
    }
    return;
  }
  
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
  
  // 🚨 크리티컬: 서버 요청 전 크레딧 사전 검증 (API 비용 낭비 방지)
  const platformCount = platforms.length;
  const creditPerContent = platformCount;
  
  // ✅ 콘텐츠 개수 확인
  const contentCount = Object.keys(contentBlocks).length;
  const creditsNeeded = creditPerContent * contentCount;
  
  console.log(`💰 [크레딧 계산] 플랫폼: ${platformCount}개, 콘텐츠: ${contentCount}개, 크레딧/콘텐츠: ${creditPerContent}, 총 필요: ${creditsNeeded}`);
  
  // 현재 보유 크레딧 확인 (로그인 사용자만)
  if (!currentUser.isGuest && currentUser.id) {
    // ✅ window.userCreditsInfo 우선 참조 (최신 DB 값)
    const freeCredits = window.userCreditsInfo?.free_credits ?? currentUser.free_credits ?? 0;
    const paidCredits = window.userCreditsInfo?.paid_credits ?? currentUser.paid_credits ?? 0;
    const totalCredits = freeCredits + paidCredits;
    
    console.log('💰 [콘텐츠 생성] 크레딧 체크:', {
      userCreditsInfo: window.userCreditsInfo,
      currentUser_credits: {
        free: currentUser.free_credits,
        paid: currentUser.paid_credits
      },
      final: { freeCredits, paidCredits, totalCredits }
    });
    
    // 🚨 크레딧 부족 시 즉시 차단 (서버 요청 없음 = API 비용 0원)
    if (totalCredits < creditsNeeded) {
      console.error(`❌ [프론트엔드 차단] 크레딧 부족: 필요 ${creditsNeeded}, 보유 ${totalCredits}`);
      
      const goToPayment = confirm(
        `⛔ 크레딧이 부족합니다!\n\n` +
        `• 필요: ${creditsNeeded}크레딧\n` +
        `• 보유: ${totalCredits}크레딧 (무료 ${freeCredits} + 유료 ${paidCredits})\n\n` +
        `💳 충전 옵션:\n` +
        `• STARTER (10크레딧): ₩5,000 (₩500/크레딧)\n` +
        `• PRO (50크레딧): ₩23,750 (₩475/크레딧, 5% 할인) 🔥\n` +
        `• BUSINESS (100크레딧): ₩45,000 (₩450/크레딧, 10% 할인)\n\n` +
        `충전 페이지로 이동하시겠습니까?`
      );
      
      if (goToPayment) {
        window.location.href = '/static/payment.html';
      }
      return; // ✅ 함수 종료 - 서버 요청 없음!
    }
    
    console.log(`✅ [프론트엔드 검증 통과] 필요: ${creditsNeeded}, 보유: ${totalCredits}`);
  }
  
  // 콘텐츠 블록 검증 (contentCount는 이미 2360번 줄에서 선언됨)
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
    images: content.images.map((img) => ({
      base64: img.base64,
      filename: img.name || `이미지${content.images.indexOf(img) + 1}`,
      size: img.size || 0
    })),
    platforms,
    aiModel: 'gpt-4o',
    customPrompt: getSelectedTemplateContent(), // ✅ 추가: 사용자 템플릿
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
    
    // 🔍 디버깅: 백엔드 응답 전체 로그
    console.log('🔍 [CRITICAL] 백엔드 응답 전체:', JSON.stringify(result, null, 2));
    console.log('🔍 [CRITICAL] result.usage:', result.usage);

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
      
      // ✅ generationId 저장 (캘린더 등록용)
      const generationId = result.id || result.generation_id || `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      window.lastGenerationId = generationId;
      console.log('✅ 일괄 생성 ID 저장:', generationId);
      
      // ✅ 날짜 + 이미지 정보 포함해서 표시
      displayResults(result.data, result.generatedPlatforms, {
        createdAt: result.created_at || new Date().toISOString(),
        scheduledDate: null,  // 아직 등록 전
        images: result.images || []
      });
      
      // ✅ 백엔드에서 이미 저장했으면 중복 저장 방지
      if (result.id) {
        console.log('✅ 백엔드에서 저장 완료, 프론트 중복 저장 스킵');
      } else {
        console.warn('⚠️ 백엔드 저장 실패, 프론트엔드에서 저장 시도');
        saveToHistory(formData, result.data);
      }
      
      // ✅ 크레딧 정보 업데이트 (키 매핑 + 2지갑 시스템)
      if (result.usage) {
        console.log('🔍 백엔드 응답 usage:', result.usage);
        
        const usage = result.usage;
        
        // 1️⃣ 무료 크레딧 업데이트 (여러 키 지원)
        if (usage.free_credits !== undefined || usage.free_remaining !== undefined) {
          currentUser.free_credits = usage.free_credits ?? usage.free_remaining ?? 0;
        }
        
        // 2️⃣ 유료 크레딧 업데이트 (여러 키 지원)
        if (usage.paid_credits !== undefined || usage.paid_remaining !== undefined) {
          currentUser.paid_credits = usage.paid_credits ?? usage.paid_remaining ?? 0;
        }
        
        // 3️⃣ 총 크레딧 계산
        if (usage.credits_remaining !== undefined) {
          currentUser.credits = usage.credits_remaining;
        } else {
          currentUser.credits = (currentUser.free_credits || 0) + (currentUser.paid_credits || 0);
        }
        
        // 🔥 중요: window.userCreditsInfo 동기화 (키워드 AI 화면 크레딧 실시간 반영)
        window.userCreditsInfo = {
          free_credits: currentUser.free_credits,
          paid_credits: currentUser.paid_credits,
          total_credits: currentUser.credits
        };
        console.log('✅ window.userCreditsInfo 동기화:', window.userCreditsInfo);
        
        // 2️⃣ 로컬스토리지 업데이트
        localStorage.setItem('postflow_user', JSON.stringify(currentUser));
        
        // 3️⃣ updateAuthUI() 호출 (전체 UI 업데이트 - 2지갑 표시 포함)
        updateAuthUI();
        
        // 4️⃣ 하단 크레딧 박스 업데이트 (즉시 반영)
        updateCostEstimate();
        
        // 5️⃣ 토스트 메시지 (2지갑 정보 + 플랫폼당 1크레딧)
        const freeCredits = currentUser.free_credits || 0;
        const paidCredits = currentUser.paid_credits || 0;
        const totalCredits = freeCredits + paidCredits;
        const creditsUsed = usage.credits_used || 1;
        
        let creditInfo = `남은 크레딧: ${totalCredits}`;
        if (freeCredits > 0 && paidCredits > 0) {
          creditInfo = `남은 크레딧: ${totalCredits} (무료 ${freeCredits} + 유료 ${paidCredits})`;
        } else if (freeCredits > 0) {
          creditInfo = `남은 크레딧: ${totalCredits} (무료)`;
        } else if (paidCredits > 0) {
          creditInfo = `남은 크레딧: ${totalCredits} (유료)`;
        }
        
        console.log('✅ 크레딧 UI 업데이트 완료:', {
          free: currentUser.free_credits,
          paid: currentUser.paid_credits,
          total: totalCredits,
          used: creditsUsed,
          display: creditInfo
        });
        
        showToast(`✅ 콘텐츠 생성 완료! (${creditsUsed}크레딧 사용, ${creditInfo})`, 'success');
        
        // 온보딩 시스템: 콘텐츠 생성 카운트 증가
        if (currentUser?.id && typeof window.incrementContentCount === 'function') {
          await window.incrementContentCount(currentUser.id);
        }
        
        // 스마트 추천 시스템: 다음 도구 추천
        if (typeof window.showSmartRecommendations === 'function' && formData.platforms) {
          window.showSmartRecommendations(formData.platforms);
        }
        // 통계 시스템: 콘텐츠 생성 통계 업데이트
        if (typeof window.updateContentGenerationStats === 'function' && formData.platforms) {
          window.updateContentGenerationStats(formData.platforms);
        }
      } else {
        showToast('✅ 콘텐츠 생성 완료!', 'success');
        
        // 온보딩 시스템: 콘텐츠 생성 카운트 증가
        if (currentUser?.id && typeof window.incrementContentCount === 'function') {
          await window.incrementContentCount(currentUser.id);
        }
        
        // 스마트 추천 시스템: 다음 도구 추천
        if (typeof window.showSmartRecommendations === 'function' && formData.platforms) {
          window.showSmartRecommendations(formData.platforms);
        }
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
      images: content.images.map((img) => ({
        base64: img.base64,
        filename: img.name || `이미지${content.images.indexOf(img) + 1}`,
        size: img.size || 0
      })),
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
      
      // ✅ 크레딧 동기화 (배치 생성에도 추가)
      if (result.usage) {
        console.log('🔍 [배치] 백엔드 응답 usage:', result.usage);
        
        const usage = result.usage;
        
        // 1️⃣ 무료 크레딧 업데이트
        if (usage.free_credits !== undefined || usage.free_remaining !== undefined) {
          currentUser.free_credits = usage.free_credits ?? usage.free_remaining ?? 0;
        }
        
        // 2️⃣ 유료 크레딧 업데이트
        if (usage.paid_credits !== undefined || usage.paid_remaining !== undefined) {
          currentUser.paid_credits = usage.paid_credits ?? usage.paid_remaining ?? 0;
        }
        
        // 3️⃣ 총 크레딧 계산
        if (usage.credits_remaining !== undefined) {
          currentUser.credits = usage.credits_remaining;
        } else {
          currentUser.credits = (currentUser.free_credits || 0) + (currentUser.paid_credits || 0);
        }
        
        // 4️⃣ window.userCreditsInfo 동기화
        window.userCreditsInfo = {
          free_credits: currentUser.free_credits,
          paid_credits: currentUser.paid_credits,
          total_credits: currentUser.credits
        };
        
        // 5️⃣ 로컬스토리지 업데이트
        localStorage.setItem('postflow_user', JSON.stringify(currentUser));
        
        // 6️⃣ UI 업데이트
        updateAuthUI();
        updateCostEstimate();
        
        console.log('✅ [배치] 크레딧 동기화 완료:', {
          free: currentUser.free_credits,
          paid: currentUser.paid_credits,
          total: currentUser.credits
        });
      }
      
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
      images: batchImages.map((img) => ({
        base64: img.base64,
        filename: img.name || `이미지${batchImages.indexOf(img) + 1}`,
        size: img.size || 0
      })),
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
            콘텐츠 #${result.contentIndex + 1}
          </h3>
          <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
            <i class="fas fa-key mr-1"></i>${result.keywords || '키워드'}
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
              type="button"
              onclick="copyContentFromBatch(${result.contentIndex}, '${platform}', '${platformNames[platform]}')"
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
          <span class="font-semibold">콘텐츠 #${err.index + 1}:</span>
          <span class="text-red-600 ml-2">${err.error}</span>
        </div>
      `;
    });
    
    html += `</div>`;
  }
  
  resultsSection.innerHTML = html;
  
  // 전역 변수에 저장 (Excel 다운로드용)
  window.batchResults = allResults;

  // 이미지 도구 버튼 직접 활성화
  var _imgBtn1 = document.getElementById('freeImageSearchBtn');
  var _imgBtn2 = document.getElementById('aiImageGenBtn');
  var _imgHint = document.getElementById('imageToolsHint');
  if (_imgBtn1) _imgBtn1.disabled = false;
  if (_imgBtn2) _imgBtn2.disabled = false;
  if (_imgHint) _imgHint.style.display = 'none';
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
      
      // ✅ generationId 저장 (캘린더 등록용)
      const generationId = result.id || result.generation_id || `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      window.lastGenerationId = generationId;
      console.log('✅ 재생성 ID 저장:', generationId);
      
      // ✅ 날짜 + 이미지 정보 포함해서 표시
      displayResults(result.data, result.generatedPlatforms, {
        createdAt: result.created_at || new Date().toISOString(),
        scheduledDate: null,  // 아직 등록 전
        images: result.images || []
      });
      
      // ✅ 백엔드에서 이미 저장했으면 중복 저장 방지
      if (result.id) {
        console.log('✅ 백엔드에서 저장 완료, 프론트 중복 저장 스킵');
      } else {
        console.warn('⚠️ 백엔드 저장 실패, 프론트엔드에서 저장 시도');
        // 🔥 히스토리 자동저장 (await 추가)
        await saveToHistory(formDataWithForce, result.data);
      }
      
      // ✅ 크레딧 정보 업데이트 (키 매핑 + 2지갑 시스템)
      if (result.usage) {
        console.log('🔍 백엔드 응답 usage:', result.usage);
        
        const usage = result.usage;
        
        // 1️⃣ 무료 크레딧 업데이트 (여러 키 지원)
        if (usage.free_credits !== undefined || usage.free_remaining !== undefined) {
          currentUser.free_credits = usage.free_credits ?? usage.free_remaining ?? 0;
        }
        
        // 2️⃣ 유료 크레딧 업데이트 (여러 키 지원)
        if (usage.paid_credits !== undefined || usage.paid_remaining !== undefined) {
          currentUser.paid_credits = usage.paid_credits ?? usage.paid_remaining ?? 0;
        }
        
        // 3️⃣ 총 크레딧 계산
        if (usage.credits_remaining !== undefined) {
          currentUser.credits = usage.credits_remaining;
        } else {
          currentUser.credits = (currentUser.free_credits || 0) + (currentUser.paid_credits || 0);
        }
        
        // 🔥 중요: window.userCreditsInfo 동기화 (키워드 AI 화면 크레딧 실시간 반영)
        window.userCreditsInfo = {
          free_credits: currentUser.free_credits,
          paid_credits: currentUser.paid_credits,
          total_credits: currentUser.credits
        };
        console.log('✅ window.userCreditsInfo 동기화:', window.userCreditsInfo);
        
        // 2️⃣ 로컬스토리지 업데이트
        localStorage.setItem('postflow_user', JSON.stringify(currentUser));
        
        // 3️⃣ updateAuthUI() 호출 (전체 UI 업데이트 - 2지갑 표시 포함)
        updateAuthUI();
        
        // 4️⃣ 하단 크레딧 박스 업데이트 (즉시 반영)
        updateCostEstimate();
        
        // 5️⃣ 토스트 메시지 (2지갑 정보 + 플랫폼당 1크레딧)
        const freeCredits = currentUser.free_credits || 0;
        const paidCredits = currentUser.paid_credits || 0;
        const totalCredits = freeCredits + paidCredits;
        const creditsUsed = usage.credits_used || 1;
        
        let creditInfo = `남은 크레딧: ${totalCredits}`;
        if (freeCredits > 0 && paidCredits > 0) {
          creditInfo = `남은 크레딧: ${totalCredits} (무료 ${freeCredits} + 유료 ${paidCredits})`;
        } else if (freeCredits > 0) {
          creditInfo = `남은 크레딧: ${totalCredits} (무료)`;
        } else if (paidCredits > 0) {
          creditInfo = `남은 크레딧: ${totalCredits} (유료)`;
        }
        
        console.log('✅ 크레딧 UI 업데이트 완료:', {
          free: currentUser.free_credits,
          paid: currentUser.paid_credits,
          total: totalCredits,
          used: creditsUsed,
          display: creditInfo
        });
        
        showToast(`✅ 콘텐츠 생성 완료! (${creditsUsed}크레딧 사용, ${creditInfo})`, 'success');
        
        // 온보딩 시스템: 콘텐츠 생성 카운트 증가
        if (currentUser?.id && typeof window.incrementContentCount === 'function') {
          await window.incrementContentCount(currentUser.id);
        }
        
        // 스마트 추천 시스템: 다음 도구 추천
        if (typeof window.showSmartRecommendations === 'function' && formData.platforms) {
          window.showSmartRecommendations(formData.platforms);
        }
        // 통계 시스템: 콘텐츠 생성 통계 업데이트
        if (typeof window.updateContentGenerationStats === 'function' && formData.platforms) {
          window.updateContentGenerationStats(formData.platforms);
        }
      } else {
        showToast('✅ 콘텐츠 생성 완료!', 'success');
        
        // 온보딩 시스템: 콘텐츠 생성 카운트 증가
        if (currentUser?.id && typeof window.incrementContentCount === 'function') {
          await window.incrementContentCount(currentUser.id);
        }
        
        // 스마트 추천 시스템: 다음 도구 추천
        if (typeof window.showSmartRecommendations === 'function' && formData.platforms) {
          window.showSmartRecommendations(formData.platforms);
        }
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
function displayResults(data, platforms, options = {}) {
  const resultArea = document.getElementById('resultArea');
  const tabButtons = document.getElementById('tabButtons');
  const tabContents = document.getElementById('tabContents');
  
  // ✅ 옵션: hideCalendarButton (캘린더 버튼 숨기기)
  const hideCalendarButton = options.hideCalendarButton || false;
  
  // ✅ 날짜 정보 옵션
  const createdAt = options.createdAt || null;
  const scheduledDate = options.scheduledDate || null;
  
  const platformNames = {
    blog: '<i class="fas fa-blog text-blue-600 mr-2"></i>네이버 블로그',
    instagram: '<i class="fab fa-instagram text-pink-600 mr-2"></i>인스타그램',
    instagram_feed: '<i class="fab fa-instagram text-pink-600 mr-2"></i>인스타그램 피드',
    threads: '<i class="fas fa-at text-gray-800 mr-2"></i>스레드',
    twitter: '<span style="font-size: 1rem; font-weight: 600; color: #000; margin-right: 0.5rem;">𝕏</span>트위터(X)',
    linkedin: '<i class="fab fa-linkedin text-blue-700 mr-2"></i>LinkedIn',
    kakaotalk: '<i class="fas fa-comment text-yellow-500 mr-2"></i>카카오톡',
    brunch: '<i class="fas fa-book-open text-orange-600 mr-2"></i>브런치',
    youtube: '<i class="fab fa-youtube text-red-600 mr-2"></i>유튜브',
    youtube_shorts: '<i class="fab fa-youtube text-red-600 mr-2"></i>유튜브 숏폼',
    youtube_longform: '<i class="fab fa-youtube text-red-600 mr-2"></i>유튜브 롱폼',
    shortform_multi: '<i class="fas fa-film text-purple-600 mr-2"></i>숏폼',
    tiktok: '<i class="fab fa-tiktok text-gray-900 mr-2"></i>틱톡',
    instagram_reels: '<i class="fab fa-instagram text-pink-600 mr-2"></i>인스타 릴스',
    metadata_generation: '<i class="fas fa-tags text-purple-600 mr-2"></i>메타데이터'
  };
  
  // ✅ HTML 태그 제거 (onclick 속성에서 사용)
  const getPlatformText = (platform) => {
    const html = platformNames[platform] || platform;
    return html.replace(/<[^>]*>/g, '').trim();
  };
  
  // ✅ 날짜 정보 헤더 생성
  let dateInfoHTML = '';
  if (createdAt || scheduledDate) {
    dateInfoHTML = `
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-6">
        ${createdAt ? `
          <div class="flex items-center gap-2">
            <i class="fas fa-clock text-blue-600"></i>
            <span class="text-sm font-semibold text-gray-700">생성일:</span>
            <span class="text-sm text-gray-900">${new Date(createdAt).toLocaleString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}</span>
          </div>
        ` : ''}
        ${scheduledDate ? `
          <div class="flex items-center gap-2">
            <i class="fas fa-calendar-check text-green-600"></i>
            <span class="text-sm font-semibold text-gray-700">발행 예정일:</span>
            <span class="text-sm text-gray-900">${new Date(scheduledDate).toLocaleString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // 탭 버튼 생성
  tabButtons.innerHTML = dateInfoHTML + platforms.map((platform, index) => `
    <button
      type="button"
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
          <div class="flex gap-2 flex-wrap">
            ${!hideCalendarButton ? `
            <button
              type="button"
              onclick="openDateTimeModalForGeneration('${platform}')"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
              title="캘린더에 등록하기"
            >
              <i class="fas fa-calendar-plus"></i>
              캘린더
            </button>
            ` : ''}
            <button
              type="button"
              onclick="editContent('${platform}')"
              class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-semibold flex items-center gap-2"
              title="콘텐츠 수정하기"
            >
              <i class="fas fa-edit"></i>
              수정
            </button>
            <button
              type="button"
              onclick="downloadAsTextFromResult('${platform}', '${getPlatformText(platform)}.txt')"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2"
              title="텍스트 파일로 다운로드"
            >
              <i class="fas fa-download"></i>
              TXT
            </button>
            <button
              type="button"
              onclick="copyToClipboardFromResult('${platform}', '${getPlatformText(platform)}')"
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
            type="button"
            onclick="cancelEdit('${platform}')"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            ✖ 취소
          </button>
          <button
            type="button"
            onclick="saveEdit('${platform}')"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            ✓ 저장
          </button>
        </div>
        <div id="preview-frame-${platform}" class="hidden" style="margin-top:16px;"></div>
      </div>
    </div>
  `).join('');

  // 좌측 패널 미리보기 표시 + 첫 번째 플랫폼 렌더링
  const leftPreview = document.getElementById('leftPanelPreview');
  const leftPreviewContent = document.getElementById('leftPanelPreviewContent');
  if (leftPreview && leftPreviewContent) {
    leftPreview.classList.remove('hidden');
    const firstPlatform = platforms[0];
    if (firstPlatform) {
      renderPreviewToLeftPanel(firstPlatform);
    }
  }

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
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 이모지를 FontAwesome 아이콘으로 치환
    .replace(/📝/g, '<i class="fas fa-blog"></i>')           // 네이버 블로그
    .replace(/📸/g, '<i class="fab fa-instagram"></i>')     // 인스타그램 피드
    .replace(/🎬/g, '<i class="fas fa-video"></i>')         // 인스타그램 릴스
    .replace(/🧵/g, '<i class="fab fa-threads"></i>')       // 스레드
    .replace(/🐦/g, '<span style="font-weight: 600; color: #000;">𝕏</span>')       // 트위터
    .replace(/💼/g, '<i class="fab fa-linkedin"></i>')      // LinkedIn
    .replace(/💬/g, '<i class="fas fa-comment"></i>')       // 카카오톡
    .replace(/🎥/g, '<i class="fab fa-youtube"></i>')       // 유튜브 롱폼
    .replace(/📱/g, '<i class="fas fa-mobile-alt"></i>')    // 유튜브 숏폼
    .replace(/📖/g, '<i class="fas fa-book-open"></i>')     // 브런치
    .replace(/🎵/g, '<i class="fab fa-tiktok"></i>');       // 틱톡
}

// =============================================
// 📱 SNS 플랫폼 미리보기 프레임 시스템
// =============================================

// 공통 HTML 이스케이프
const _esc = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// 프리뷰용 이미지 1장 가져오기
function getPreviewImage() {
  const imgs = getPreviewImages();
  return imgs.length > 0 ? imgs[0] : null;
}

// 프리뷰용 이미지 복수 가져오기 (카드뉴스/캐러셀 대응)
function getPreviewImages() {
  if (selectedImages && selectedImages.length > 0) {
    return selectedImages.map(img => {
      if (typeof img === 'string') return img;
      if (img && img.url) return img.url;
      if (img && img.base64) return img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}`;
      return null;
    }).filter(Boolean);
  }
  if (contentBlocks) {
    const imgs = [];
    Object.values(contentBlocks).forEach(block => {
      if (block && block.images) {
        block.images.forEach(img => {
          if (typeof img === 'string') imgs.push(img);
          else if (img && img.base64) imgs.push(img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}`);
          else if (img && img.url) imgs.push(img.url);
        });
      }
    });
    if (imgs.length > 0) return imgs;
  }
  return [];
}

// 프리뷰용 브랜드명 가져오기
function getPreviewBrand() {
  const brandEl = document.getElementById('brand');
  return brandEl?.value?.trim() || '브랜드';
}

// 캐러셀 상태 관리
const _carouselState = {};
function carouselNav(platform, direction) {
  const images = getPreviewImages();
  if (images.length <= 1) return;
  if (!_carouselState[platform]) _carouselState[platform] = { idx: 0 };
  const s = _carouselState[platform];
  s.idx = Math.max(0, Math.min(s.idx + direction, images.length - 1));
  updateCarouselUI(platform, images);
}
function updateCarouselUI(platform, images) {
  const s = _carouselState[platform] || { idx: 0 };
  const imgEl = document.getElementById(`preview-img-${platform}`);
  const countEl = document.getElementById(`preview-count-${platform}`);
  const dotsEl = document.getElementById(`preview-dots-${platform}`);
  if (imgEl) imgEl.src = images[s.idx];
  if (countEl) countEl.textContent = `${s.idx + 1}/${images.length}`;
  if (dotsEl) {
    dotsEl.innerHTML = images.map((_, i) =>
      `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin:0 2px;background:${i===s.idx?'#fff':'rgba(255,255,255,0.5)'}"></span>`
    ).join('');
  }
}

// 콘텐츠 파싱: 캡션 + 해시태그 분리
function parseContentParts(text) {
  if (!text) return { title: '', caption: '', hashtags: [], fullText: '' };
  const hashtagRegex = /#[^\s#]+/g;
  const hashtags = text.match(hashtagRegex) || [];
  const lines = text.split('\n');
  const captionLines = [];
  let hashtagBlockStarted = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed && /^[#\s]+$/.test(trimmed.replace(/#[^\s#]+/g, '').trim()) && /#/.test(trimmed)) {
      hashtagBlockStarted = true;
    } else if (hashtagBlockStarted && !trimmed) {
      continue;
    } else {
      captionLines.unshift(...lines.slice(0, i + 1));
      break;
    }
  }
  let caption = captionLines.length > 0 ? captionLines.join('\n').trim() : text.replace(hashtagRegex, '').trim();
  caption = caption.replace(/^[📸📝🎬🧵🐦💼💬🎥📱📖🎵]\s*/g, '').trim();
  const title = caption.split('\n')[0]?.substring(0, 80) || '';
  return { title, caption, hashtags, fullText: text };
}
// 하위 호환
function parseInstagramContent(text) { return parseContentParts(text); }

// 이미지 영역 공통 렌더 (캐러셀 지원)
function _renderImageArea(platform, ratio, rounded) {
  const images = getPreviewImages();
  const rd = rounded || '0';
  if (images.length === 0) {
    return `<div style="width:100%;aspect-ratio:${ratio};background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;border-radius:${rd};overflow:hidden;">
      <div style="color:rgba(255,255,255,0.7);text-align:center;padding:20px;"><i class="fas fa-image" style="font-size:40px;display:block;margin-bottom:8px;"></i><span style="font-size:13px;">이미지 미포함</span></div></div>`;
  }
  _carouselState[platform] = _carouselState[platform] || { idx: 0 };
  const idx = _carouselState[platform].idx || 0;
  const multi = images.length > 1;
  return `<div style="position:relative;width:100%;aspect-ratio:${ratio};background:#000;overflow:hidden;border-radius:${rd};">
    <img id="preview-img-${platform}" src="${_esc(images[idx])}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"/>
    ${multi ? `
      <button onclick="carouselNav('${platform}',-1)" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.8);border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">‹</button>
      <button onclick="carouselNav('${platform}',1)" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.8);border:none;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">›</button>
      <div id="preview-count-${platform}" style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.6);color:#fff;font-size:12px;padding:2px 8px;border-radius:10px;">${idx+1}/${images.length}</div>
      <div id="preview-dots-${platform}" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;">
        ${images.map((_,i)=>`<span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin:0 2px;background:${i===idx?'#fff':'rgba(255,255,255,0.5)'}"></span>`).join('')}
      </div>` : ''}
  </div>`;
}

// 프레임 래퍼 (공통 외곽)
function _frameWrap(platform, label, icon, maxW, inner) {
  return `<div class="mt-6 mb-2">
    <div class="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2"><i class="${icon}"></i>${_esc(label)} 미리보기</div>
    <div style="max-width:${maxW};margin:0 auto;background:#fff;border:1px solid #dbdbdb;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      ${inner}
    </div>
  </div>`;
}

// ======== 인스타그램 피드 ========
function renderInstagramFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { caption, hashtags } = parseContentParts(text);
  const brandName = getPreviewBrand();
  const brandInitial = brandName.charAt(0).toUpperCase();
  const maxLen = 100;
  const short = caption.length > maxLen ? caption.substring(0, maxLen) + '...' : caption;
  const hasMore = caption.length > maxLen;

  const inner = `
    <div style="display:flex;align-items:center;padding:12px 14px;gap:10px;">
      <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">${_esc(brandInitial)}</div>
      <span style="font-weight:600;font-size:14px;color:#262626;flex:1;">${_esc(brandName)}</span>
      <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="6" r="1.5" fill="#262626"/><circle cx="12" cy="12" r="1.5" fill="#262626"/><circle cx="12" cy="18" r="1.5" fill="#262626"/></svg>
    </div>
    ${_renderImageArea(platform, '1/1', '0')}
    <div style="padding:12px 14px 8px;display:flex;justify-content:space-between;">
      <div style="display:flex;gap:16px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </div>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </div>
    <div style="padding:0 14px 8px;font-weight:600;font-size:14px;color:#262626;">좋아요 0개</div>
    <div style="padding:0 14px 8px;font-size:14px;color:#262626;line-height:1.5;">
      <span style="font-weight:600;">${_esc(brandName)}</span> ${_esc(short).replace(/\n/g,' ')}${hasMore?'<span style="color:#8e8e8e;cursor:pointer;"> ...더 보기</span>':''}
    </div>
    ${hashtags.length>0?`<div style="padding:0 14px 10px;font-size:14px;line-height:1.6;">${hashtags.map(t=>`<span style="color:#00376b;">${_esc(t)}</span>`).join(' ')}</div>`:''}
    <div style="padding:10px 14px;border-top:1px solid #efefef;display:flex;align-items:center;gap:12px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#262626" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
      <span style="color:#8e8e8e;font-size:14px;flex:1;">댓글 달기...</span>
    </div>`;
  frameEl.innerHTML = _frameWrap(platform, '인스타그램', 'fab fa-instagram text-pink-500', '420px', inner);
}

// ======== 네이버 블로그 ========
function renderNaverBlogFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { title, caption } = parseContentParts(text);
  const brandName = getPreviewBrand();
  const short = caption.length > 200 ? caption.substring(0, 200) + '...' : caption;

  const inner = `
    <div style="background:#03C75A;padding:10px 14px;display:flex;align-items:center;gap:8px;">
      <span style="font-size:18px;">📗</span>
      <span style="color:#fff;font-weight:600;font-size:14px;">${_esc(brandName)}의 블로그</span>
    </div>
    <div style="padding:16px;">
      <h4 style="font-size:18px;font-weight:700;color:#333;margin:0 0 12px;line-height:1.4;">${_esc(title)}</h4>
      ${_renderImageArea(platform, '16/10', '8px')}
      <p style="margin:12px 0 0;font-size:14px;color:#333;line-height:1.8;white-space:pre-wrap;">${_esc(short).replace(/\n/g,'<br>')}</p>
    </div>
    <div style="padding:10px 16px;border-top:1px solid #eee;display:flex;gap:16px;font-size:13px;color:#888;">
      <span>♡ 공감 0</span><span>💬 댓글 0</span><span>🔗 공유</span>
    </div>`;
  frameEl.innerHTML = _frameWrap(platform, '네이버 블로그', 'fas fa-blog text-green-600', '420px', inner);
}

// ======== 스레드 ========
function renderThreadsFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { caption, hashtags } = parseContentParts(text);
  const brandName = getPreviewBrand();
  const brandInitial = brandName.charAt(0).toUpperCase();
  const images = getPreviewImages();

  const inner = `
    <div style="display:flex;align-items:flex-start;padding:14px;gap:12px;">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#333,#000);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;">${_esc(brandInitial)}</div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-weight:600;font-size:14px;color:#000;">${_esc(brandName)}</span>
          <span style="color:#999;font-size:13px;">방금</span>
        </div>
        <p style="font-size:14px;color:#000;line-height:1.5;margin:0 0 10px;white-space:pre-wrap;">${_esc(caption.substring(0,300)).replace(/\n/g,'<br>')}</p>
        ${images.length>0?_renderImageArea(platform,'1/1','12px'):''}
        ${hashtags.length>0?`<div style="margin-top:8px;font-size:14px;">${hashtags.map(t=>`<span style="color:#0095f6;">${_esc(t)}</span>`).join(' ')}</div>`:''}
        <div style="display:flex;gap:20px;margin-top:12px;color:#999;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </div>
      </div>
    </div>`;
  frameEl.innerHTML = _frameWrap(platform, '스레드', 'fas fa-at text-gray-800', '420px', inner);
}

// ======== 트위터/X ========
function renderTwitterFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { caption, hashtags } = parseContentParts(text);
  const brandName = getPreviewBrand();
  const brandInitial = brandName.charAt(0).toUpperCase();
  const charCount = text.length;
  const images = getPreviewImages();

  const inner = `
    <div style="padding:14px;">
      <div style="display:flex;gap:10px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#1DA1F2;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0;">${_esc(brandInitial)}</div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:4px;">
            <span style="font-weight:700;font-size:15px;color:#0f1419;">${_esc(brandName)}</span>
            <span style="color:#536471;font-size:15px;">@${_esc(brandName.toLowerCase().replace(/\s/g,''))} · 방금</span>
          </div>
          <p style="font-size:15px;color:#0f1419;line-height:1.4;margin:8px 0;white-space:pre-wrap;">${_esc(caption.substring(0,280)).replace(/\n/g,'<br>')}</p>
          ${hashtags.length>0?`<div style="margin-bottom:8px;">${hashtags.map(t=>`<span style="color:#1d9bf0;font-size:15px;">${_esc(t)}</span>`).join(' ')}</div>`:''}
          ${images.length>0?`<div style="margin-bottom:10px;">${_renderImageArea(platform,'16/9','16px')}</div>`:''}
          <div style="color:#536471;font-size:12px;margin-bottom:8px;">${charCount > 280 ? `<span style="color:#f4212e;">${charCount}/280</span>` : `${charCount}/280`}</div>
          <div style="display:flex;justify-content:space-between;max-width:300px;color:#536471;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
          </div>
        </div>
      </div>
    </div>`;
  frameEl.innerHTML = _frameWrap(platform, '트위터(X)', 'fab fa-x-twitter text-gray-900', '420px', inner);
}

// ======== LinkedIn ========
function renderLinkedinFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { caption, hashtags } = parseContentParts(text);
  const brandName = getPreviewBrand();
  const brandInitial = brandName.charAt(0).toUpperCase();
  const short = caption.length > 150 ? caption.substring(0, 150) + '...' : caption;
  const hasMore = caption.length > 150;

  const inner = `
    <div style="padding:14px;">
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <div style="width:48px;height:48px;border-radius:8px;background:#0a66c2;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;flex-shrink:0;">${_esc(brandInitial)}</div>
        <div>
          <span style="font-weight:600;font-size:14px;color:#000;display:block;">${_esc(brandName)}</span>
          <span style="color:#666;font-size:12px;">마케팅 담당자 · 방금 · 🌐</span>
        </div>
      </div>
      <p style="font-size:14px;color:#000;line-height:1.5;margin:0 0 10px;white-space:pre-wrap;">${_esc(short).replace(/\n/g,'<br>')}${hasMore?'<span style="color:#0a66c2;cursor:pointer;font-weight:600;"> ...더 보기</span>':''}</p>
      ${hashtags.length>0?`<div style="margin-bottom:10px;">${hashtags.map(t=>`<span style="color:#0a66c2;font-size:14px;">${_esc(t)}</span>`).join(' ')}</div>`:''}
    </div>
    ${_renderImageArea(platform,'16/10','0')}
    <div style="padding:8px 14px;display:flex;justify-content:space-around;border-top:1px solid #e0e0e0;color:#666;font-size:13px;">
      <span>👍 좋아요</span><span>💬 댓글</span><span>🔁 공유</span><span>➤ 보내기</span>
    </div>`;
  frameEl.innerHTML = _frameWrap(platform, 'LinkedIn', 'fab fa-linkedin text-blue-700', '420px', inner);
}

// ======== 브런치 ========
function renderBrunchFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { title, caption } = parseContentParts(text);
  const brandName = getPreviewBrand();
  const short = caption.length > 150 ? caption.substring(0, 150) + '...' : caption;

  const inner = `
    ${_renderImageArea(platform,'4/3','0')}
    <div style="padding:20px;">
      <h4 style="font-size:22px;font-weight:700;color:#333;margin:0 0 8px;line-height:1.3;">${_esc(title)}</h4>
      <p style="font-size:13px;color:#999;margin:0 0 12px;">by ${_esc(brandName)}</p>
      <p style="font-size:15px;color:#555;line-height:1.7;">${_esc(short).replace(/\n/g,'<br>')}</p>
    </div>
    <div style="padding:10px 20px;border-top:1px solid #eee;display:flex;gap:16px;color:#aaa;font-size:13px;">
      <span>♡ 좋아요</span><span>💬 댓글</span>
    </div>`;
  frameEl.innerHTML = _frameWrap(platform, '브런치', 'fas fa-book-open text-orange-600', '420px', inner);
}

// ======== 틱톡 ========
function renderTiktokFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { caption, hashtags } = parseContentParts(text);
  const brandName = getPreviewBrand();
  const brandInitial = brandName.charAt(0).toUpperCase();
  const images = getPreviewImages();
  const bgImg = images.length > 0 ? images[0] : '';
  const short = caption.length > 60 ? caption.substring(0, 60) + '...' : caption;

  frameEl.innerHTML = `
    <div class="mt-6 mb-2">
      <div class="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2"><i class="fab fa-tiktok"></i>틱톡 미리보기</div>
      <div style="max-width:280px;margin:0 auto;aspect-ratio:9/16;border-radius:16px;overflow:hidden;position:relative;background:${bgImg?'#000':'linear-gradient(135deg,#667eea,#764ba2)'};font-family:-apple-system,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
        ${bgImg?`<img src="${_esc(bgImg)}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;"/>`:''}
        <div style="position:absolute;inset:0;background:linear-gradient(transparent 50%,rgba(0,0,0,0.7) 100%);"></div>
        <div style="position:absolute;right:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:20px;align-items:center;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#fe2c55,#25f4ee);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">${_esc(brandInitial)}</div>
          <div style="text-align:center;color:#fff;"><svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><div style="font-size:11px;margin-top:2px;">0</div></div>
          <div style="text-align:center;color:#fff;"><svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><div style="font-size:11px;margin-top:2px;">0</div></div>
          <div style="text-align:center;color:#fff;"><svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><line x1="22" y1="2" x2="11" y2="13" stroke="#fff" stroke-width="2"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="#fff"/></svg><div style="font-size:11px;margin-top:2px;">공유</div></div>
        </div>
        <div style="position:absolute;bottom:16px;left:12px;right:60px;color:#fff;">
          <p style="font-weight:700;font-size:14px;margin:0 0 6px;">@${_esc(brandName)}</p>
          <p style="font-size:13px;margin:0 0 6px;line-height:1.3;">${_esc(short)}</p>
          ${hashtags.length>0?`<p style="font-size:12px;margin:0 0 6px;">${hashtags.slice(0,5).map(t=>`<span style="font-weight:600;">${_esc(t)}</span>`).join(' ')}</p>`:''}
          <p style="font-size:11px;margin:0;opacity:0.8;">🎵 원본 사운드 - ${_esc(brandName)}</p>
        </div>
      </div>
    </div>`;
}

// ======== 유튜브 쇼츠 ========
function renderYoutubeShortsFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { title, caption } = parseContentParts(text);
  const brandName = getPreviewBrand();
  const images = getPreviewImages();
  const bgImg = images.length > 0 ? images[0] : '';
  const short = caption.length > 60 ? caption.substring(0, 60) + '...' : caption;

  frameEl.innerHTML = `
    <div class="mt-6 mb-2">
      <div class="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2"><i class="fab fa-youtube text-red-600"></i>유튜브 Shorts 미리보기</div>
      <div style="max-width:280px;margin:0 auto;aspect-ratio:9/16;border-radius:16px;overflow:hidden;position:relative;background:${bgImg?'#000':'linear-gradient(135deg,#ff0000,#cc0000)'};font-family:-apple-system,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
        ${bgImg?`<img src="${_esc(bgImg)}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;"/>`:''}
        <div style="position:absolute;inset:0;background:linear-gradient(transparent 50%,rgba(0,0,0,0.7) 100%);"></div>
        <div style="position:absolute;right:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:20px;align-items:center;">
          <div style="text-align:center;color:#fff;"><svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg><div style="font-size:11px;margin-top:2px;">0</div></div>
          <div style="text-align:center;color:#fff;"><svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M10 15V9a3 3 0 0 1 3-3l4 9v11H5.72a2 2 0 0 1-2-1.7l-1.38-9a2 2 0 0 1 2-2.3zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" transform="rotate(180 12 12)"/></svg><div style="font-size:11px;margin-top:2px;">0</div></div>
          <div style="text-align:center;color:#fff;"><svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><div style="font-size:11px;margin-top:2px;">0</div></div>
        </div>
        <div style="position:absolute;bottom:16px;left:12px;right:60px;color:#fff;">
          <p style="font-weight:600;font-size:14px;margin:0 0 6px;">${_esc(brandName)}</p>
          <p style="font-size:13px;margin:0;line-height:1.3;">${_esc(short)}</p>
        </div>
      </div>
    </div>`;
}

// ======== 유튜브 롱폼 ========
function renderYoutubeLongFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { title } = parseContentParts(text);
  const brandName = getPreviewBrand();
  const brandInitial = brandName.charAt(0).toUpperCase();

  const inner = `
    <div style="position:relative;">
      ${_renderImageArea(platform,'16/9','0')}
      <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.8);color:#fff;font-size:12px;padding:2px 6px;border-radius:4px;">12:34</div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
        <div style="width:60px;height:60px;border-radius:50%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </div>
    </div>
    <div style="padding:12px 14px;display:flex;gap:10px;">
      <div style="width:36px;height:36px;border-radius:50%;background:#ff0000;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;">${_esc(brandInitial)}</div>
      <div style="flex:1;">
        <p style="font-size:14px;font-weight:600;color:#0f0f0f;margin:0 0 4px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${_esc(title)}</p>
        <p style="font-size:12px;color:#606060;margin:0;">${_esc(brandName)} · 조회수 0회 · 방금</p>
      </div>
    </div>`;
  frameEl.innerHTML = _frameWrap(platform, '유튜브', 'fab fa-youtube text-red-600', '420px', inner);
}

// ======== 카카오톡 ========
function renderKakaotalkFrame(platform) {
  const frameEl = document.getElementById(`preview-frame-${platform}`);
  if (!frameEl) return;
  const text = resultData[platform] || '';
  const { title, caption } = parseContentParts(text);
  const short = caption.length > 100 ? caption.substring(0, 100) + '...' : caption;

  const inner = `
    <div style="background:#FEE500;padding:10px 14px;display:flex;align-items:center;gap:8px;">
      <span style="font-size:18px;">💬</span>
      <span style="font-weight:600;font-size:14px;color:#3C1E1E;">카카오톡 채널</span>
    </div>
    ${_renderImageArea(platform,'16/10','0')}
    <div style="padding:14px;">
      <h4 style="font-size:16px;font-weight:700;color:#333;margin:0 0 8px;">${_esc(title)}</h4>
      <p style="font-size:14px;color:#555;line-height:1.5;">${_esc(short).replace(/\n/g,'<br>')}</p>
    </div>
    <div style="padding:0 14px 14px;">
      <div style="background:#FEE500;color:#3C1E1E;text-align:center;padding:10px;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">자세히 보기</div>
    </div>`;
  frameEl.innerHTML = _frameWrap(platform, '카카오톡', 'fas fa-comment text-yellow-500', '420px', inner);
}

// ======== 플랫폼 프레임 라우터 ========
function getFrameRenderer(platform) {
  const k = (platform || '').toLowerCase();
  if (['instagram','instagram_feed'].includes(k)) return renderInstagramFrame;
  if (['blog','naver_blog'].includes(k)) return renderNaverBlogFrame;
  if (k === 'threads') return renderThreadsFrame;
  if (['twitter','x'].includes(k)) return renderTwitterFrame;
  if (k === 'linkedin') return renderLinkedinFrame;
  if (k === 'brunch') return renderBrunchFrame;
  if (k === 'tiktok') return renderTiktokFrame;
  if (['youtube_shorts','instagram_reels'].includes(k)) return renderYoutubeShortsFrame;
  if (['youtube','youtube_longform','youtube_long'].includes(k)) return renderYoutubeLongFrame;
  if (['kakaotalk','kakao'].includes(k)) return renderKakaotalkFrame;
  return null;
}

// 프리뷰 프레임 토글
function togglePreviewFrame(platform) {
  _previewFrameEnabled = !_previewFrameEnabled;
  const leftPreview = document.getElementById('leftPanelPreview');

  if (_previewFrameEnabled) {
    if (leftPreview) leftPreview.classList.remove('hidden');
    renderPreviewToLeftPanel(platform);
  } else {
    if (leftPreview) leftPreview.classList.add('hidden');
  }
}

// displaySingleContentResult용 프리뷰 토글 (좌측 패널)
function toggleSinglePreviewFrame(contentIndex, platform) {
  _previewFrameEnabled = !_previewFrameEnabled;
  const leftPreview = document.getElementById('leftPanelPreview');

  if (_previewFrameEnabled) {
    if (leftPreview) leftPreview.classList.remove('hidden');
    renderPreviewToLeftPanel(platform);
  } else {
    if (leftPreview) leftPreview.classList.add('hidden');
  }
}

// 하위 호환
function isInstagramPlatform(platform) {
  return platform === 'instagram' || platform === 'instagram_feed';
}

function switchTab(platform, eventOrElement) {
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 모든 탭 콘텐츠 숨기기
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  // 선택된 탭 활성화
  if (eventOrElement && eventOrElement.target) {
    // 이벤트 객체인 경우
    eventOrElement.target.classList.add('active');
  } else if (eventOrElement && eventOrElement.classList) {
    // DOM 요소인 경우
    eventOrElement.classList.add('active');
  } else {
    // 문자열만 전달된 경우 - 해당 탭 버튼 찾기
    const tabButton = document.querySelector(`[onclick*="switchTab('${platform}'"]`);
    if (tabButton) {
      tabButton.classList.add('active');
    }
  }
  
  // ✅ null 체크 추가
  const tabContent = document.getElementById(`tab-${platform}`);
  if (tabContent) {
    tabContent.classList.remove('hidden');
  } else {
    console.error(`Tab content not found: tab-${platform}`);
  }

  // 좌측 패널 미리보기 연동
  renderPreviewToLeftPanel(platform);
}

// 좌측 패널에 미리보기 렌더링
function renderPreviewToLeftPanel(platform) {
  const container = document.getElementById('leftPanelPreviewContent');
  if (!container) return;
  const renderer = getFrameRenderer(platform);
  if (!renderer) {
    container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">이 플랫폼은 미리보기를 지원하지 않습니다.</p>';
    return;
  }
  // 임시 div에 렌더링 후 좌측 패널로 이동
  const tempId = `preview-frame-${platform}`;
  let tempEl = document.getElementById(tempId);
  if (!tempEl) {
    tempEl = document.createElement('div');
    tempEl.id = tempId;
    tempEl.style.display = 'none';
    document.body.appendChild(tempEl);
  }
  renderer(platform);
  // 렌더링된 내용을 좌측 패널로 복사
  container.innerHTML = tempEl.innerHTML;
}

// displayResults용 헬퍼 함수 (resultData에서 참조)
function copyToClipboardFromResult(platform, platformName) {
  const content = resultData[platform];
  if (!content) {
    showToast('❌ 복사할 내용이 없습니다', 'error');
    return;
  }
  
  navigator.clipboard.writeText(content).then(() => {
    showToast(`✅ ${platformName || '콘텐츠'} 복사됨!`, 'success');
  }).catch(err => {
    console.error('복사 실패:', err);
    showToast('❌ 복사에 실패했습니다', 'error');
  });
}

// ✅ displaySingleContentResult용 헬퍼 함수들
function copyToClipboardFromSingle(contentIndex, platform, platformName) {
  const content = document.getElementById(`content_${contentIndex}_${platform}`)?.textContent;
  if (!content) {
    showToast('❌ 복사할 내용이 없습니다', 'error');
    return;
  }
  
  navigator.clipboard.writeText(content).then(() => {
    showToast(`✅ ${platformName || '콘텐츠'} 복사됨!`, 'success');
  }).catch(err => {
    console.error('복사 실패:', err);
    showToast('❌ 복사에 실패했습니다', 'error');
  });
}

function downloadAsTextFromSingle(contentIndex, platform, filename) {
  const content = document.getElementById(`content_${contentIndex}_${platform}`)?.textContent;
  if (!content) {
    showToast('❌ 다운로드할 내용이 없습니다', 'error');
    return;
  }
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `content_${platform}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('✅ 텍스트 파일 다운로드 완료!', 'success');
}

// ✅ displayBatchResults용 헬퍼 함수
function copyContentFromBatch(contentIndex, platform, platformName) {
  // displayBatchResults에서 생성한 콘텐츠 영역에서 텍스트 추출
  const contentElements = document.querySelectorAll('.bg-gray-50.rounded-lg.border');
  if (!contentElements || contentElements.length === 0) {
    showToast('❌ 복사할 내용이 없습니다', 'error');
    return;
  }
  
  // contentIndex에 해당하는 영역 찾기
  let targetContent = null;
  contentElements.forEach((el) => {
    const textContent = el.textContent || '';
    if (textContent.includes(platformName)) {
      const contentDiv = el.querySelector('.bg-white.p-4.rounded');
      if (contentDiv) {
        targetContent = contentDiv.textContent?.trim();
      }
    }
  });
  
  if (!targetContent) {
    showToast('❌ 복사할 내용이 없습니다', 'error');
    return;
  }
  
  navigator.clipboard.writeText(targetContent).then(() => {
    showToast(`✅ ${platformName} 복사됨!`, 'success');
  }).catch(err => {
    console.error('복사 실패:', err);
    showToast('❌ 복사에 실패했습니다', 'error');
  });
}

function downloadAsTextFromResult(platform, filename) {
  const content = resultData[platform];
  if (!content) {
    showToast('❌ 다운로드할 내용이 없습니다', 'error');
    return;
  }
  
  if (!filename) {
    const date = new Date().toISOString().split('T')[0];
    filename = `content_${date}.txt`;
  }
  
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

function copyToClipboard(content, platformName) {
  if (!content) {
    showToast('❌ 복사할 내용이 없습니다', 'error');
    return;
  }
  
  navigator.clipboard.writeText(content).then(() => {
    showToast(`✅ ${platformName || '콘텐츠'} 복사됨!`, 'success');
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
  
  // ✅ 히스토리 DB에도 업데이트
  if (window.lastGenerationId) {
    updateHistoryContent(window.lastGenerationId, platform, newContent);
  }
  
  // 디스플레이 업데이트
  display.innerHTML = formatContent(newContent);

  // ✅ 프리뷰 프레임 갱신 (모든 플랫폼)
  if (_previewFrameEnabled) {
    const renderer = getFrameRenderer(platform);
    if (renderer) renderer(platform);
  }

  display.classList.remove('hidden');
  editor.classList.add('hidden');
  actions.classList.add('hidden');

  // ✅ 캘린더 새로고침 플래그 설정 (항상 실행)
  window.needsCalendarRefresh = true;
  
  // ✅ 캘린더가 열려있으면 즉시 이벤트 새로고침
  if (window.calendarInstance) {
    console.log('🔄 캘린더 이벤트 새로고침 시작...');
    setTimeout(() => {
      window.calendarInstance.refetchEvents();
      window.needsCalendarRefresh = false; // 새로고침 완료 후 플래그 해제
      console.log('✅ 캘린더 이벤트 새로고침 완료');
    }, 500);
  } else {
    console.log('📌 캘린더가 숨겨져 있음. 다음 열릴 때 새로고침 예정');
  }
  
  // ✅ window.contentHistory도 업데이트 (히스토리 모달용)
  if (window.contentHistory && window.lastGenerationId) {
    const historyItem = window.contentHistory.find(h => h.id === window.lastGenerationId);
    if (historyItem && historyItem.results) {
      historyItem.results[platform] = newContent;
      console.log('✅ window.contentHistory 업데이트 완료');
    }
  }
  
  // ✅ 히스토리 모달이 열려있으면 히스토리 새로고침 (즉시 반영)
  const historyModal = document.getElementById('historyModal');
  if (historyModal && !historyModal.classList.contains('hidden')) {
    console.log('🔄 히스토리 모달이 열려있어서 히스토리 새로고침 시작...');
    setTimeout(() => {
      loadHistory();
      console.log('✅ 히스토리 새로고침 완료');
    }, 500);
  }
  
  showToast('✅ 수정 내용이 저장되었습니다', 'success');
}

// ✅ 히스토리 업데이트 함수
async function updateHistoryContent(generationId, platform, newContent) {
  const user = window.currentUser;
  if (!user || !user.id) return;
  
  try {
    const response = await fetch('/api/history', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        generation_id: generationId,
        platform: platform,
        content: newContent
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      console.error('히스토리 업데이트 실패:', data.error);
    }
  } catch (error) {
    console.error('히스토리 업데이트 오류:', error);
  }
}

// ===================================
// 다운로드 기능
// ===================================
function downloadAsText(content, filename) {
  if (!content) {
    showToast('❌ 다운로드할 내용이 없습니다', 'error');
    return;
  }
  
  // filename이 없으면 기본값 생성
  if (!filename) {
    const date = new Date().toISOString().split('T')[0];
    filename = `content_${date}.txt`;
  }
  
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
    metadata_generation: '메타데이터',
    twitter: '트위터(X)' // ✅ 신규 추가
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
    metadata_generation: '메타데이터',
    twitter: '트위터(X)' // ✅ 신규 추가
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
    metadata_generation: '메타데이터',
    twitter: '트위터(X)' // ✅ 신규 추가
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
  
  // 컨테이너가 없으면 생성
  if (!container) {
    const newContainer = document.createElement('div');
    newContainer.id = 'toastContainer';
    newContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
    document.body.appendChild(newContainer);
  }
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    background: ${colors[type] || colors.success};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    margin-bottom: 10px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    min-width: 300px;
    max-width: 500px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;
  
  const toastContainer = document.getElementById('toastContainer');
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toastContainer.contains(toast)) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }, 5000); // 5초로 증가 (긴 메시지 읽기 시간 확보)
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
  const platforms = ['blog', 'instagram_feed', 'threads', 'twitter', 'linkedin', 'kakaotalk', 'brunch', 'tiktok', 'instagram_reels', 'youtube_shorts', 'youtube_longform', 'metadata_generation'];
  const platformNames = {
    blog: '네이버 블로그',
    instagram: '인스타그램 (기존)',
    instagram_feed: '인스타그램 피드',
    threads: '스레드',
    twitter: '트위터(X)',
    linkedin: 'LinkedIn',
    kakaotalk: '카카오톡',
    brunch: '브런치',
    tiktok: '틱톡',
    instagram_reels: '인스타그램 릴스',
    youtube_shorts: '유튜브 쇼츠',
    youtube_longform: '유튜브 롱폼',
    metadata_generation: '메타데이터 생성'
  };
  
  const platformIcons = {
    blog: '<i class="fas fa-blog text-blue-600 mr-2"></i>',
    instagram: '<i class="fab fa-instagram text-pink-600 mr-2"></i>',
    instagram_feed: '<i class="fab fa-instagram text-pink-600 mr-2"></i>',
    threads: '<i class="fas fa-at text-gray-800 mr-2"></i>',
    twitter: '<span style="font-size: 1rem; font-weight: 600; color: #000; margin-right: 0.5rem;">𝕏</span>',
    linkedin: '<i class="fab fa-linkedin text-blue-700 mr-2"></i>',
    kakaotalk: '<i class="fas fa-comment-dots text-yellow-500 mr-2"></i>',
    brunch: '<i class="fas fa-book-open text-orange-600 mr-2"></i>',
    tiktok: '<i class="fab fa-tiktok text-black mr-2"></i>',
    instagram_reels: '<i class="fab fa-instagram text-purple-600 mr-2"></i>',
    youtube_shorts: '<i class="fab fa-youtube text-red-500 mr-2"></i>',
    youtube_longform: '<i class="fab fa-youtube text-red-600 mr-2"></i>',
    metadata_generation: '<i class="fas fa-tags text-blue-600 mr-2"></i>'
  };
  
  templateList.innerHTML = `
    <div class="space-y-6">
      <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <p class="font-semibold text-blue-800 mb-2">💡 사용 가능한 변수:</p>
        <div class="text-sm text-blue-700 space-y-1">
          <p>• <code>{브랜드명}</code> - 브랜드/서비스/상품명</p>
          <p>• <code>{키워드}</code> - 핵심 키워드</p>
          <p>• <code>{톤앤매너}</code> - 콘텐츠 톤앤매너</p>
          <p>• <code>{타겟연령대}</code> - 주 연령층</p>
          <p>• <code>{타겟성별}</code> - 주 고객층 성별</p>
          <p>• <code>{산업분야}</code> - 산업 분야</p>
        </div>
      </div>
      
      ${platforms.map(platform => {
        const custom = customTemplates.find(t => t.platform === platform);
        const template = custom ? custom.template : DEFAULT_TEMPLATES[platform];
        
        return `
          <div class="border border-gray-200 rounded-lg p-6 bg-white">
            <div class="flex justify-between items-center mb-4">
              <h4 class="text-lg font-bold text-gray-800">${platformIcons[platform] || ''}${platformNames[platform]}</h4>
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
  const textarea = document.getElementById(`template_${platform}`);
  if (!textarea) {
    showToast('❌ 템플릿을 찾을 수 없습니다', 'error');
    return;
  }
  
  const template = textarea.value.trim();
  
  if (!template) {
    showToast('❌ 템플릿 내용을 입력해주세요', 'error');
    return;
  }
  
  if (template.length > 8000) {
    showToast('❌ 템플릿은 최대 8000자까지 가능합니다', 'error');
    return;
  }
  
  // 기존 템플릿 제거
  customTemplates = customTemplates.filter(t => t.platform !== platform);
  
  // 새 템플릿 추가
  customTemplates.push({ platform, template });
  
  saveTemplates();
  showToast(`✅ ${platform} 템플릿이 저장되었습니다`, 'success');
  
  console.log(`✅ 템플릿 저장 완료: ${platform} (${template.length}자)`);
}

function resetTemplate(platform) {
  const textarea = document.getElementById(`template_${platform}`);
  if (!textarea) {
    showToast('❌ 템플릿을 찾을 수 없습니다', 'error');
    return;
  }
  
  textarea.value = DEFAULT_TEMPLATES[platform] || '';
  
  // 커스텀 템플릿에서 제거
  customTemplates = customTemplates.filter(t => t.platform !== platform);
  saveTemplates();
  
  showToast(`✅ ${platform} 템플릿이 초기화되었습니다`, 'success');
  
  console.log(`✅ 템플릿 초기화 완료: ${platform}`);
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

// 🔥 기존 saveProfile 함수는 deprecated (새 모달 시스템 사용)
// 하위 호환성을 위해 유지하지만 새 시스템으로 리다이렉트
function saveProfile() {
  console.warn('⚠️ saveProfile() is deprecated. Use openProfileSaveModal() instead.');
  openProfileSaveModal();
}

// 🔥 DEPRECATED: 단일 프로필 시스템 (하위 호환성용)
// 새로운 다중 프로필 시스템(/api/profiles)을 사용하세요
async function saveProfileToDB(profile) {
  console.warn('⚠️ saveProfileToDB() is deprecated. This saves to old single-profile system.');
  console.warn('⚠️ Use the new multi-profile system: openProfileSaveModal()');
  
  // 기존 코드는 users 테이블에 덮어쓰기만 함 (사용 금지)
  return;
}

// 🔥 DB에서 프로필 로드 함수 수정
async function loadProfileFromDB(userId) {
  try {
    if (!userId) {
      const storedUser = localStorage.getItem('postflow_user');
      if (!storedUser) {
        console.log('❌ 로그인 정보 없음');
        return;
      }
      userId = JSON.parse(storedUser).id;
    }
    
    console.log('📖 프로필 로드 시작:', userId);
    
    const response = await fetch(`/api/profile?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('🔍 API 응답 (11개 필드 확인):', result);
    
    if (result.success && result.profile) {
      const p = result.profile;
      
      // 🔥 11개 필드 정확한 매핑 (HTML ID와 DB 컬럼 매핑)
      setElementValue('brandName', p.brand || '');  // ✅ brand → brandName
      setElementValue('companyName', p.company_name || '');
      setElementValue('businessType', p.business_type || '');
      setElementValue('region', p.location || '');  // ✅ location → region
      setElementValue('targetGender', p.target_gender || '');
      setElementValue('contact', p.contact || '');
      setElementValue('website', p.website || '');
      setElementValue('snsAccount', p.sns || '');  // ✅ sns → snsAccount
      
      // 키워드 배열 처리 → keywordAnalysisInput에 입력
      const keywordsStr = Array.isArray(p.keywords) 
        ? p.keywords.join(', ') 
        : (p.keywords || '');
      setElementValue('keywordAnalysisInput', keywordsStr);  // ✅ keywords → keywordAnalysisInput
      
      setElementValue('toneAndManner', p.tone || '');  // ✅ tone → toneAndManner
      setElementValue('targetAge', p.target_age || '');
      setElementValue('industry', p.industry || '');
      
      console.log('✅ 11개 필드 모두 자동 입력 완료');
    } else {
      console.log('⚠️ 저장된 프로필이 없습니다');
    }
  } catch (error) {
    console.error('❌ 프로필 로드 예외:', error);
  }
}

// 헬퍼 함수 추가
function setElementValue(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.value = value;
    return true;
  }
  console.warn(`Element not found: ${id}`);
  return false;
}

// ✅ 프로필 불러오기 모달 (새 다중 프로필 시스템 사용)
async function openLoadProfileModal() {
  console.warn('⚠️ openLoadProfileModal() redirecting to new multi-profile system');
  openProfileListModal();
}

// ✅ DB 프로필을 폼에 적용 (loadProfileFromDB 재사용)
async function applyStoredProfile() {
  const userData = localStorage.getItem('postflow_user');
  if (!userData) {
    showToast('로그인이 필요합니다', 'error');
    return;
  }
  
  const user = JSON.parse(userData);
  const userId = user.id;
  
  // 기존 loadProfileFromDB 재사용
  await loadProfileFromDB(userId);
  
  // 모달 닫기
  closeProfileModal();
  
  showToast('프로필을 불러왔습니다!', 'success');
}

// ✅ 프로필 모달 닫기
function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
}

// ⚠️ 구버전 함수 (DB 기반으로 교체됨, 호환성을 위해 유지)
function loadProfile(id) {
  console.warn('⚠️ loadProfile() is deprecated. Use applyStoredProfile() instead.');
}

function deleteProfile(id) {
  console.warn('⚠️ deleteProfile() is deprecated.');
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
// ✅ DB 기반 히스토리 로드 (보안 적용)
async function loadHistory() {
  const userData = localStorage.getItem('postflow_user');
  if (!userData) {
    console.warn('⚠️ 로그인 정보 없음 - 히스토리 로드 불가');
    window.contentHistory = [];
    return;
  }
  
  const user = JSON.parse(userData);
  const userId = user.id;
  
  if (!userId) {
    console.warn('⚠️ 사용자 ID 없음 - 히스토리 로드 불가');
    window.contentHistory = [];
    return;
  }
  
  try {
    console.log('📖 히스토리 조회 시작:', userId);
    
    const response = await fetch(`/api/history?user_id=${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ DB 히스토리:', result);
    
    if (!result.success) {
      console.warn('⚠️ 히스토리 조회 실패:', result.error);
      window.contentHistory = [];
      return;
    }
    
    // 🔥 핵심 수정: DB 데이터를 프론트엔드 형식으로 변환 + 전역 변수에 저장
    window.contentHistory = (result.data || []).map(item => {
      return {
        id: item.id,
        brand: item.brand || '',
        keywords: item.keywords || '',
        platforms: Array.isArray(item.platforms) ? item.platforms : (item.platforms ? [item.platforms] : []),
        results: item.results || {},
        createdAt: item.created_at || item.createdAt || new Date().toISOString()  // ← 스네이크 케이스 → 카멜 케이스
      };
    });
    
    console.log(`✅ 히스토리 변환 완료: ${window.contentHistory.length}개`);
    console.log('📊 변환된 데이터 샘플:', window.contentHistory[0]);
    console.log('🌐 window.contentHistory 전역 저장 완료');
    
  } catch (error) {
    console.error('❌ 히스토리 로드 실패:', error);
    window.contentHistory = [];
  }
}

// ✅ DB 기반 히스토리 저장 (보안 적용)
async function saveToHistory(formData, results) {
  const userData = localStorage.getItem('postflow_user');
  if (!userData) {
    console.warn('⚠️ 로그인 정보 없음 - 히스토리 저장 불가');
    return;
  }
  
  const user = JSON.parse(userData);
  const userId = user.id;
  
  if (!userId) {
    console.warn('⚠️ 사용자 ID 없음 - 히스토리 저장 불가');
    return;
  }
  
  const historyItem = {
    user_id: userId, // ✅ 보안: user_id 추가
    brand: formData.brand,
    keywords: formData.keywords,
    platforms: formData.platforms,
    results: results,
    created_at: new Date().toISOString()
  };
  
  try {
    console.log('💾 히스토리 저장 시작:', historyItem);
    console.log('📊 상세 데이터:', {
      user_id: userId,
      brand: formData.brand,
      keywords: formData.keywords,
      platforms: formData.platforms,
      results_keys: Object.keys(results || {})
    });
    
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(historyItem)
    });
    
    console.log('📡 API 응답 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API 에러 응답:', errorData);
      throw new Error(`HTTP ${response.status}: ${errorData.error || '알 수 없는 오류'}`);
    }
    
    const result = await response.json();
    console.log('✅ 히스토리 저장 완료:', result);
    
    // ✅ generation_id를 전역 변수에 저장 (캘린더 등록용)
    window.lastGenerationId = result.id;
    console.log('📝 Generation ID 저장:', window.lastGenerationId);
    
    // 로컬 배열 업데이트 (UI 즉시 반영)
    contentHistory.unshift({
      id: result.id || Date.now(),
      brand: formData.brand,
      keywords: formData.keywords,
      platforms: formData.platforms,
      results: results,
      createdAt: new Date().toISOString()
    });
    
    if (contentHistory.length > 50) {
      contentHistory = contentHistory.slice(0, 50);
    }
    
    
    // ✅ 저장된 ID 반환 (캘린더 등록용)
    return { success: true, id: result.id };
    
  } catch (error) {
    console.error('❌ 히스토리 저장 실패:', error);
    return { success: false, error: error.message };
  }
}

// ✅ DB 기반 히스토리 모달 (자동 로드)
async function openHistoryModal() {
  console.log('🔵 openHistoryModal 호출됨');
  
  const modal = document.getElementById('historyModal');
  const historyList = document.getElementById('historyList');
  
  // 🔥 핵심 수정: 모달을 body 직속으로 이동 (부모의 display:none 영향 차단)
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
    console.log('✅ historyModal을 body 직속으로 이동');
  }
  
  console.log('🔵 modal:', modal);
  console.log('🔵 historyList:', historyList);
  
  if (!modal || !historyList) {
    console.error('❌ 히스토리 모달 요소를 찾을 수 없습니다!');
    showToast('히스토리 모달을 열 수 없습니다.', 'error');
    return;
  }
  
  // 검색/필터 초기화 (UI 제거로 주석 처리)
  // document.getElementById('historySearch').value = '';
  // document.querySelectorAll('.history-platform-filter').forEach(cb => cb.checked = true);
  // document.getElementById('historySortOrder').value = 'newest';
  
  // 로딩 표시
  historyList.innerHTML = '<p class="text-gray-500 text-center py-8">🔄 히스토리 불러오는 중...</p>';
  
  // ✅ 히스토리 모달 표시 (z-index: 9000)
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  // 🔥 CRITICAL: setAttribute로 강제 설정 (CSS !important 우선순위 문제 해결)
  modal.setAttribute('style', 'display: flex !important; visibility: visible !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; background-color: rgba(0, 0, 0, 0.5) !important; z-index: 9999 !important; align-items: center !important; justify-content: center !important; opacity: 1 !important;');
  
  console.log('🔵 모달 강제 표시 완료 - display:', modal.style.display);
  console.log('🔵 모달 visibility:', modal.style.visibility);
  console.log('🔵 모달 classList:', modal.classList.toString());
  
  // DB에서 히스토리 로드
  await loadHistory();
  
  console.log('🔵 히스토리 로드 완료, window.contentHistory:', window.contentHistory?.length || 0);
  
  // 렌더링
  renderHistory();
  
  console.log('🔵 렌더링 완료');
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  
  console.log('🔵 renderHistory 시작, window.contentHistory:', window.contentHistory?.length || 0);
  
  if (!window.contentHistory || window.contentHistory.length === 0) {
    historyList.innerHTML = '<p class="text-gray-500 text-center py-8">생성 히스토리가 없습니다</p>';
    console.log('🔵 히스토리 없음 - 빈 메시지 표시');
    return;
  }
  
  // 최신순으로 정렬 (검색/필터 기능 제거)
  const sorted = [...window.contentHistory].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  console.log('🔵 정렬 완료:', sorted.length, '개');
  
  // 🔥 플랫폼 표시명 확장 (FontAwesome 아이콘 사용, 콘텐츠 블록과 동일)
  const platformNames = {
    blog: '<i class="fas fa-blog text-blue-600 mr-2"></i>네이버 블로그',
    instagram: '<i class="fab fa-instagram text-pink-600 mr-2"></i>인스타그램',
    instagram_feed: '<i class="fab fa-instagram text-pink-600 mr-2"></i>인스타그램 피드',
    instagram_reels: '<i class="fab fa-instagram text-purple-600 mr-2"></i>인스타 릴스',
    threads: '<i class="fas fa-at text-gray-800 mr-2"></i>스레드',
    twitter: '<span style="font-size: 1rem; font-weight: 600; color: #000; margin-right: 0.5rem;">𝕏</span>트위터(X)',
    linkedin: '<i class="fab fa-linkedin text-blue-700 mr-2"></i>LinkedIn',
    kakaotalk: '<i class="fas fa-comment-dots text-yellow-500 mr-2"></i>카카오톡',
    brunch: '<i class="fas fa-book-open text-orange-600 mr-2"></i>브런치',
    tiktok: '<i class="fab fa-tiktok text-black mr-2"></i>틱톡',
    youtube: '<i class="fab fa-youtube text-red-600 mr-2"></i>유튜브',
    youtube_shorts: '<i class="fab fa-youtube text-red-500 mr-2"></i>유튜브 쇼츠',
    youtube_longform: '<i class="fab fa-youtube text-red-600 mr-2"></i>유튜브 롱폼',
    metadata_generation: '<i class="fas fa-tags text-blue-600 mr-2"></i>메타데이터 생성',
    shortform_multi: '<i class="fas fa-film text-purple-600 mr-2"></i>숏폼 통합' // 레거시 데이터용
  };
  
  historyList.innerHTML = sorted.map(item => {
    const itemPlatforms = Array.isArray(item.platforms) ? item.platforms : [item.platforms];
    const keywordsDisplay = Array.isArray(item.keywords) 
      ? item.keywords.join(', ') 
      : (item.keywords || '');
    
    // 🔥 UX 개선: 브랜드명 + 키워드 미리보기 (가독성 향상)
    const titleDisplay = keywordsDisplay 
      ? `${item.brand || '브랜드명 없음'} (${keywordsDisplay.substring(0, 30)}${keywordsDisplay.length > 30 ? '...' : ''})`
      : (item.brand || '브랜드명 없음');
    
    return `
    <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
      <div class="flex justify-between items-start mb-2">
        <div class="flex-1">
          <h4 class="font-bold text-gray-800 text-lg">${titleDisplay}</h4>
          <div class="flex flex-wrap gap-1 mt-1">
            ${itemPlatforms.map(p => `<span class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">${platformNames[p] || p}</span>`).join('')}
          </div>
        </div>
        <div class="flex gap-2 ml-4">
          <button
            onclick="viewHistory('${item.id}')"
            class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm whitespace-nowrap"
          >
            👁 보기
          </button>
          <button
            onclick="openDateTimeModal('${item.id}', '${itemPlatforms[0] || 'blog'}')"
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm whitespace-nowrap"
            title="발행 예정일 설정"
          >
            📅 예정일
          </button>
          <button
            onclick="deleteHistory('${item.id}')"
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm whitespace-nowrap"
          >
            🗑 삭제
          </button>
        </div>
      </div>
      <p class="text-xs text-gray-500">
        <i class="fas fa-clock mr-1"></i>${(() => {
          const date = new Date(item.createdAt);
          // UTC 시간에 9시간 추가 (KST)
          const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
          return kstDate.toLocaleString('ko-KR', { 
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        })()}
      </p>
    </div>
  `;
  }).join('');
  
  console.log('🔵 historyList HTML 길이:', historyList.innerHTML.length);
  console.log('🔵 historyList 첫 100자:', historyList.innerHTML.substring(0, 100));
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
    metadata_generation: '메타데이터',
    twitter: '트위터(X)' // ✅ 신규 추가
  };
  
  // HTML 테이블 형식
  let tableRows = contentHistory.map(item => {
    const platformsText = item.platforms.map(p => platformNames[p]).join(', ');
    const contentSummary = Object.entries(item.results)
      .map(([platform, content]) => `[${platformNames[platform]}]\n${content.substring(0, 100)}...`)
      .join('\n\n');
    
    return `
      <tr>
        <td>${(() => {
          const date = new Date(item.createdAt);
          // UTC 시간에 9시간 추가 (KST)
          const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
          return kstDate.toLocaleString('ko-KR', { 
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        })()}</td>
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
  console.log('🔵 viewHistory 실행:', id);
  
  // 🔥 전역 변수 확인
  if (!window.contentHistory || window.contentHistory.length === 0) {
    console.error('❌ window.contentHistory가 비어있습니다!');
    showToast('히스토리 데이터를 불러올 수 없습니다', 'error');
    return;
  }
  
  const item = window.contentHistory.find(h => h.id === id);
  if (!item) {
    console.error('❌ 히스토리 항목 없음:', id);
    showToast('해당 히스토리를 찾을 수 없습니다', 'error');
    return;
  }
  
  console.log('✅ 히스토리 항목 발견:', item);
  
  // ✅ generation_id 저장 (캘린더 등록 및 수정 기능에 필요)
  window.lastGenerationId = id;
  resultData = item.results;
  
  // 🔥 contentBlocks 배열 초기화 (캘린더 등록 기능에 필요)
  contentBlocks = [{
    generationId: id,
    images: [],
    platforms: item.platforms || [],
    keywords: item.keywords || '',
    brand: item.brand || '',
    topic: '',
    description: ''
  }];
  console.log('✅ contentBlocks 초기화 완료:', contentBlocks[0]);
  
  // 🔥 화면 모드 전환: 캘린더 뷰 → 콘텐츠 뷰
  const calendarWrapper = document.getElementById('calendarWrapper');
  const mainContent = document.querySelector('.main-content');
  const leftPanel = document.querySelector('.left-panel');
  
  // 캘린더 숨기기
  if (calendarWrapper) {
    calendarWrapper.classList.add('hidden');
    calendarWrapper.style.display = 'none';
    console.log('✅ 캘린더 숨김');
  }
  
  // 메인 콘텐츠 영역 표시
  if (mainContent) {
    mainContent.classList.remove('hidden');
    mainContent.style.setProperty('display', 'block', 'important');
    console.log('✅ 메인 콘텐츠 표시');
  }
  
  // 좌측 패널 표시 (입력 폼)
  if (leftPanel) {
    leftPanel.classList.remove('hidden');
    leftPanel.style.setProperty('display', 'block', 'important');
    console.log('✅ 좌측 패널 표시');
  }
  
  // 🔥 결과 영역을 정상 위치로 이동 및 표시
  const resultArea = document.getElementById('resultArea');
  if (resultArea) {
    // 🔥 핵심: resultArea가 이상한 곳에 있으면 원래 위치로 이동
    const currentParent = resultArea.parentElement;
    if (currentParent && currentParent.id === 'emailVerificationModal') {
      console.log('⚠️ resultArea가 emailVerificationModal 안에 있음! 빼내기 시작...');
      
      // 푸터 찾기
      const footer = document.querySelector('footer');
      if (footer) {
        // 푸터 바로 앞에 삽입
        footer.parentElement.insertBefore(resultArea, footer);
        console.log('✅ resultArea를 푸터 바로 위로 이동 완료');
      } else {
        // main-content 찾기 (콘텐츠 블록이 있는 곳)
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          // main-content 끝에 추가
          mainContent.appendChild(resultArea);
          console.log('✅ resultArea를 main-content로 이동 완료');
        } else {
          // 둘 다 없으면 body에 추가
          document.body.appendChild(resultArea);
          console.log('✅ resultArea를 body로 이동 완료');
        }
      }
    }
    
    resultArea.classList.remove('hidden');
    resultArea.style.cssText = `
      display: block !important;
      width: 100% !important;
      max-width: 1200px !important;
      margin: 20px auto !important;
      padding: 32px !important;
      background: white !important;
      border-radius: 16px !important;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1) !important;
    `;
    console.log('✅ 결과 영역 강제 표시');
  }
  
  // 콘텐츠 렌더링 (날짜 정보 포함)
  displayResults(item.results, item.platforms, {
    createdAt: item.created_at,
    scheduledDate: item.scheduled_date
  });
  console.log('✅ displayResults 호출 완료 (생성일:', item.created_at, ', 예정일:', item.scheduled_date, ')');
  
  // 모달 닫기
  closeModal('historyModal');
  console.log('✅ 히스토리 모달 닫기');
  
  // 화면 상태 변경
  window.isCalendarView = false;
  
  // 스크롤 이동 (약간 지연)
  setTimeout(() => {
    if (resultArea) {
      resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log('✅ 결과 영역으로 스크롤 완료');
      
      // 최종 크기 확인
      const rect = resultArea.getBoundingClientRect();
      console.log('📊 최종 resultArea 크기:', {
        width: rect.width,
        height: rect.height,
        top: rect.top
      });
    }
  }, 300);
  
  showToast('✅ 콘텐츠를 불러왔습니다', 'success');
  console.log('🎉 viewHistory 실행 완료!');
}

// 전역 노출 확인
window.viewHistory = viewHistory;

// 🔥 DB 기반 히스토리 삭제 (실제 삭제)
async function deleteHistory(id) {
  if (!confirm('이 히스토리를 삭제하시겠습니까?')) return;
  
  const userData = localStorage.getItem('postflow_user');
  if (!userData) {
    showToast('❌ 로그인이 필요합니다', 'error');
    return;
  }
  
  const user = JSON.parse(userData);
  const userId = user.id;
  
  try {
    console.log('🗑️ 히스토리 삭제 시작:', id);
    
    // 🔥 실제 DB 삭제 API 호출
    const response = await fetch(`/api/history?id=${id}&user_id=${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📡 삭제 API 응답:', result);
    
    if (!result.success) {
      showToast('❌ 삭제 실패: ' + result.error, 'error');
      return;
    }
    
    // ✅ DB 삭제 성공 후에만 로컬 배열 업데이트
    contentHistory = contentHistory.filter(h => h.id !== id);
    filterHistory();
    showToast('✅ 히스토리가 삭제되었습니다', 'success');
    
    console.log('✅ 히스토리 삭제 완료:', id);
    
  } catch (error) {
    console.error('❌ 히스토리 삭제 오류:', error);
    showToast('❌ 네트워크 오류가 발생했습니다', 'error');
  }
}

// ===================================
// 모달 관리
// ===================================
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // ✅ 확실한 숨김 처리 (!important 사용)
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.setProperty('display', 'none', 'important');
    modal.style.setProperty('visibility', 'hidden', 'important');
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
window.renderPreviewToLeftPanel = renderPreviewToLeftPanel;
window.togglePreviewFrame = togglePreviewFrame;
window.toggleSinglePreviewFrame = toggleSinglePreviewFrame;
window.carouselNav = carouselNav;
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
window.openHistoryModal = openHistoryModal;
window.closeHistoryModal = () => closeModal('historyModal');

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

// 환경 변수를 window 객체에 노출 (다른 스크립트에서 사용)
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// Supabase 클라이언트 (CDN에서 로드)
let supabaseClient = null;

// 사용자 상태 (하이브리드 플랜) - 전역 객체로 변경
window.currentUser = {
  id: null,
  isLoggedIn: false,
  isGuest: true,
  name: null,
  email: null,
  subscription_status: 'active', // 단일 구독 플랜
  monthly_included_count: 50, // 월 50회 포함
  monthly_used_count: 0, // 이번 달 사용 횟수
  monthly_remaining: 50, // 남은 포함 횟수
  credits: 0, // 추가 크레딧 (하위 호환)
  free_credits: 0, // ✅ 무료 크레딧 (월간 지급)
  paid_credits: 0  // ✅ 유료 크레딧 (구매분)
};

// 하위 호환성을 위한 로컬 참조
let currentUser = window.currentUser;

// Supabase 클라이언트 초기화
async function initSupabase() {
  console.log('🔧 [Supabase] initSupabase 시작');
  try {
    // Supabase JS SDK를 동적으로 로드
    if (typeof window.supabase === 'undefined') {
      console.log('📦 [Supabase] CDN에서 SDK 로드 중...');
      // CDN에서 Supabase 로드
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => {
        console.log('✅ [Supabase] SDK 로드 완료');
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabaseClient = supabaseClient; // 🔥 전역 노출
        console.log('✅ Supabase 클라이언트 초기화 완료');
        console.log('✅ window.supabaseClient 전역 노출 완료');
        checkSupabaseSession();
        setupAuthStateListener(); // 🔒 세션 만료 감지
      };
      script.onerror = (error) => {
        console.error('❌ [Supabase] SDK 로드 실패:', error);
      };
      document.head.appendChild(script);
    } else {
      console.log('✅ [Supabase] SDK 이미 로드됨');
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.supabaseClient = supabaseClient; // 🔥 전역 노출
      console.log('✅ Supabase 클라이언트 초기화 완료');
      console.log('✅ window.supabaseClient 전역 노출 완료');
      checkSupabaseSession();
      setupAuthStateListener(); // 🔒 세션 만료 감지
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
      // 🔥 CRITICAL FIX: Supabase 세션에서 받은 최신 사용자 정보로 강제 갱신
      console.log('🔥 [세션 갱신] Supabase에서 받은 최신 사용자 정보:', {
        user_id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata.full_name || session.user.email
      });
      
      // 신규 사용자 확인 (created_at과 last_sign_in_at이 거의 같으면 신규)
      const createdAt = new Date(session.user.created_at).getTime();
      const lastSignInAt = new Date(session.user.last_sign_in_at).getTime();
      const isNewUser = Math.abs(createdAt - lastSignInAt) < 5000; // 5초 이내면 신규
      
      // 🔥 최신 세션 정보로 currentUser 강제 갱신 (localStorage의 오래된 값 무시!)
      window.currentUser = {
        id: session.user.id,  // ✅ Supabase에서 받은 최신 ID
        isLoggedIn: true,
        isGuest: false,
        name: session.user.user_metadata.full_name || session.user.email,
        email: session.user.email,  // ✅ Supabase에서 받은 최신 이메일
        free_credits: 0, // ✅ 서버 동기화 후 업데이트
        paid_credits: 0, // ✅ 서버 동기화 후 업데이트
        credits: 0, // ✅ 서버 동기화 후 업데이트
        tier: 'free', // ✅ 서버에서 실제 등급 조회
        subscription_status: 'free'
      };
      currentUser = window.currentUser; // 로컬 참조 동기화
      
      // 🔥 CRITICAL: localStorage에 최신 정보 강제 저장 (덮어쓰기)
      console.log('💾 [localStorage 강제 갱신] 오래된 값 덮어쓰기:', window.currentUser);
      localStorage.setItem('postflow_user', JSON.stringify(window.currentUser));
      localStorage.setItem('postflow_token', session.access_token);
      
      // ✅ 랜딩 페이지에서 로그인되어 있으면 대시보드로 자동 리디렉션
      // ⚠️ OAuth 콜백 후 (URL에 access_token이 있으면) 무조건 리디렉션
      if (window.location.pathname === '/') {
        // OAuth 콜백인지 확인 (URL에 access_token이 있으면)
        const isOAuthCallback = window.location.hash.includes('access_token');
        
        // error 파라미터 확인 (OAuth 취소 또는 실패)
        const urlParams = new URLSearchParams(window.location.search);
        const hasError = urlParams.get('error') || window.location.hash.includes('error=');
        
        if (hasError) {
          console.log('❌ OAuth 오류 또는 취소 - 로그아웃 처리');
          // 세션 클리어
          if (supabaseClient) {
            await supabaseClient.auth.signOut();
          }
          localStorage.removeItem('postflow_token');
          localStorage.removeItem('postflow_user');
          handleAuthError();
          return; // 리디렉션 방지
        }
        
        if (isOAuthCallback) {
          console.log('🔄 OAuth 콜백 감지 - 대시보드로 리디렉션');
          window.location.href = '/dashboard';
          return; // 리디렉션 중이므로 아래 코드 실행 방지
        }
        
        // ⚠️ 중요: 로그인 상태면 대시보드로 리디렉션 (redirect 파라미터가 있으면 해당 페이지로)
        const urlParams2 = new URLSearchParams(window.location.search);
        const redirectTo = urlParams2.get('redirect');
        const allowedRedirects = ['/postflow', '/dashboard', '/youtube-analyzer'];
        const targetPage = (redirectTo && allowedRedirects.includes(redirectTo)) ? redirectTo : '/dashboard';
        console.log('🔄 로그인 상태 감지 - 리디렉션:', targetPage);
        window.location.href = targetPage;
        return; // 리디렉션 중이므로 아래 코드 실행 방지
      }
      
      // ✅ UI는 일단 기본 상태로 업데이트
      updateAuthUI();
      
      // 🔥 서버에 사용자 정보 동기화 (신규 여부 전달)
      // syncUserToBackend에서 최신 DB 데이터를 받아 currentUser 업데이트 + localStorage 저장
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
      
      // 서버에서 받은 정보 업데이트 (2지갑 시스템)
      // 🔥 가장 중요: ID와 이메일 먼저 설정!
      window.currentUser.id = session.user.id;
      window.currentUser.email = session.user.email;
      window.currentUser.tier = data.tier || 'free'; // 'guest' | 'free' | 'paid'
      window.currentUser.free_credits = data.free_credits ?? 0; // ✅ 무료 크레딧
      window.currentUser.paid_credits = data.paid_credits ?? 0; // ✅ 유료 크레딧
      window.currentUser.credits = (data.free_credits ?? 0) + (data.paid_credits ?? 0); // ✅ 총 크레딧 계산
      window.currentUser.registration_completed = Boolean(data.registration_completed ?? true); // ✅ 명시적 Boolean 변환
      window.currentUser.phone = data.phone || null; // ✅ 연락처
      
      // 🔥 핵심: 로그인 상태 명시적 설정
      window.currentUser.isGuest = false;
      window.currentUser.isLoggedIn = true;
      
      console.log('📊 window.currentUser 업데이트:', {
        id: window.currentUser.id,
        email: window.currentUser.email,
        tier: window.currentUser.tier,
        free_credits: window.currentUser.free_credits,
        paid_credits: window.currentUser.paid_credits,
        total_credits: window.currentUser.credits,
        isGuest: window.currentUser.isGuest,
        isLoggedIn: window.currentUser.isLoggedIn,
        registration_completed: window.currentUser.registration_completed,
        phone: window.currentUser.phone
      });
      
      localStorage.setItem('postflow_user', JSON.stringify(window.currentUser));
      
      // 🚨 신규회원 체크를 대시보드 로드보다 먼저 실행!
      if (!window.currentUser.registration_completed) {
        console.log('🔔 회원가입 미완료 → 모달 먼저 표시 (대시보드 로드 지연)');
        // 기본 UI만 업데이트 (대시보드 데이터 로드는 하지 않음)
        updateAuthUI();
        showRegistrationCompleteModal(session.user.id);
        // ⚠️ userUpdated 이벤트와 loadProfileFromDB는 모달 완료 후 실행됨
      } else {
        console.log('✅ 회원가입 이미 완료 - 대시보드 정상 로드');
        // 🔔 모든 컴포넌트에 알림 (핵심!)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('userUpdated', {
            detail: window.currentUser
          }));
          console.log('🔔 userUpdated 이벤트 발생! (지연 실행)');
        }, 100);
        
        updateAuthUI();
        
        // 🔥 프로필 자동 로드 추가
        loadProfileFromDB(session.user.id);
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: '응답 파싱 실패' }));
      console.error('❌❌❌ /api/auth/sync 실패! ❌❌❌');
      console.error('🔍 HTTP 상태:', response.status, response.statusText);
      console.error('🔍 서버 응답:', JSON.stringify(errorData, null, 2));
      console.error('🔍 요청 URL:', '/api/auth/sync');
      console.error('🔍 에러 타입:', errorData.errorType);
      console.error('🔍 에러 코드:', errorData.errorCode);
      console.error('🔍 에러 힌트:', errorData.errorHint);
      
      // 🔥 사용자에게 상세 오류 표시
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      if (errorData.error) {
        errorMessage += `\n\n${errorData.error}`;
      }
      if (errorData.errorCode) {
        errorMessage += `\n\n오류 코드: ${errorData.errorCode}`;
      }
      if (errorData.errorHint) {
        errorMessage += `\n\n힌트: ${errorData.errorHint}`;
      }
      
      alert(errorMessage);
      
      // 🔥 사용자 친화적 오류 메시지 표시
      if (response.status === 500) {
        showToast('⚠️ 서버 오류가 발생했습니다. 개발자 도구(F12) 콘솔을 확인해주세요.', 'error', 10000);
      } else if (response.status === 401) {
        showToast('⚠️ 로그인이 만료되었습니다. 다시 로그인해주세요.', 'warning', 5000);
      } else {
        showToast(`⚠️ 로그인 오류 (${response.status})`, 'error', 5000);
      }
      
      // 🔥 API 실패 시에도 최소한의 정보 저장 (히스토리 접근 가능하도록)
      window.currentUser.id = session.user.id;
      window.currentUser.email = session.user.email;
      window.currentUser.isGuest = false;
      window.currentUser.isLoggedIn = true;
      localStorage.setItem('postflow_user', JSON.stringify(window.currentUser));
      updateAuthUI();
      console.log('⚠️ API 실패했지만 기본 정보는 저장함');
    }
  } catch (error) {
    console.error('❌ 사용자 동기화 에러:', error);
    console.error('🔍 에러 상세:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    showToast('⚠️ 네트워크 오류가 발생했습니다. 페이지를 새로고침해주세요.', 'error', 5000);
  }
}

// 환영 메시지 표시 (하이브리드 플랜)
// ⚠️ 사용자 피드백: 대시보드 이동 시 팝업이 부담스럽다는 의견으로 완전 비활성화
function showWelcomeMessage(type) {
  console.log('⚠️ showWelcomeMessage 호출됨 - 하지만 비활성화되어 실행 안 함');
  return; // ⛔ 즉시 종료
  
  const user = window.currentUser; // ✅ 전역 객체 참조
  
  // ✅ 안전한 이름 가져오기
  if (!user || !user.id || user.isGuest) {
    console.log('⚠️ 유효한 사용자 정보 없음, 환영 메시지 스킵');
    return;
  }
  
  const displayName = user.name || user.email?.split('@')[0] || '회원';
  
  // null, undefined 체크
  if (!displayName || displayName === 'null' || displayName === 'undefined') {
    console.log('⚠️ 유효한 사용자 이름 없음, 환영 메시지 스킵');
    return;
  }
  
  const messages = {
    signup: {
      title: '🎉 회원가입 완료!',
      message: `환영합니다, ${displayName}님!<br><br>🎁 무료 회원 혜택<br>• 매월 10크레딧 자동 지급<br>• 1크레딧 = 1회 생성<br><br>💎 크레딧 충전 옵션<br>• STARTER: ₩5,000 (10크레딧, ₩500/크레딧)<br>• PRO: ₩23,750 (50크레딧, ₩475/크레딧, 5% 할인) 🔥<br>• BUSINESS: ₩45,000 (100크레딧, ₩450/크레딧, 10% 할인)`,
      duration: 6000
    },
    login: {
      title: '👋 다시 오신 것을 환영합니다!',
      message: `${displayName}님, 반갑습니다!<br><br>${user.tier === 'free' ? '🎁 무료 회원' : '💎 유료 회원'}<br>• 남은 크레딧: <strong>${user.credits}개</strong><br>• 1크레딧 = 1회 생성`,
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

// ===================================
// 회원가입 완료 모달 (연락처 + 동의)
// ===================================
function showRegistrationCompleteModal(userId) {
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById('registrationModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modalHTML = `
    <div id="registrationModal" style="
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.8); z-index: 10000; 
      display: flex; align-items: center; justify-content: center;
      overflow-y: auto;
    ">
      <div style="
        background: white; border-radius: 20px; padding: 2rem; 
        max-width: 520px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        margin: 2rem auto; max-height: 90vh; overflow-y: auto;
      ">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🎉</div>
          <h2 style="font-size: 1.8rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem;">
            환영합니다!
          </h2>
          <p style="color: #6b7280; font-size: 1rem;">
            서비스 이용을 위해 정보를 입력해주세요
          </p>
        </div>
        
        <form id="registrationCompleteForm">
          <!-- 이름 -->
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
              이름 <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="text" 
              id="userName" 
              placeholder="홍길동" 
              required
              style="
                width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; 
                border-radius: 10px; font-size: 1rem; outline: none;
              "
            />
          </div>
          
          <!-- 이메일 (자동채우기 + 수정 가능) -->
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
              이메일 <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="email" 
              id="userEmail" 
              placeholder="example@email.com" 
              required
              style="
                width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; 
                border-radius: 10px; font-size: 1rem; outline: none;
              "
            />
            <p style="font-size: 0.8rem; color: #9ca3af; margin-top: 0.4rem;">
              서비스 안내 및 고객 문의에 사용됩니다. 다른 이메일을 원하시면 수정해주세요.
            </p>
          </div>
          
          <!-- 성별 -->
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
              성별 <span style="color: #ef4444;">*</span>
            </label>
            <div style="display: flex; gap: 1rem;">
              <label style="flex: 1; display: flex; align-items: center; padding: 0.875rem; border: 2px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: border-color 0.2s;">
                <input type="radio" name="gender" value="male" required style="margin-right: 0.5rem;">
                남성
              </label>
              <label style="flex: 1; display: flex; align-items: center; padding: 0.875rem; border: 2px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: border-color 0.2s;">
                <input type="radio" name="gender" value="female" required style="margin-right: 0.5rem;">
                여성
              </label>
            </div>
          </div>
          
          <!-- 생년월일 -->
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
              생년월일 <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="date" 
              id="userBirthDate" 
              required
              max="${new Date().toISOString().split('T')[0]}"
              style="
                width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; 
                border-radius: 10px; font-size: 1rem; outline: none;
              "
            />
          </div>
          
          <!-- 연락처 -->
          <div style="margin-bottom: 1.5rem;">
            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
              휴대전화번호 <span style="color: #ef4444;">*</span>
            </label>
            <input 
              type="tel" 
              id="userPhone" 
              placeholder="010-1234-5678" 
              required
              style="
                width: 100%; padding: 0.875rem; border: 2px solid #e5e7eb; 
                border-radius: 10px; font-size: 1rem; outline: none;
              "
            />
            <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">
              고객문의, 환불 처리를 위해 필요합니다
            </p>
          </div>
          
          <!-- 약관 동의 -->
          <div style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 12px; border: 2px solid #e5e7eb;">
            <!-- 전체동의 -->
            <label style="
              display: flex; align-items: center; padding-bottom: 1rem; margin-bottom: 1rem; 
              border-bottom: 2px solid #e5e7eb; cursor: pointer; font-size: 1.05rem;
            ">
              <input 
                type="checkbox" 
                id="agreeAll" 
                style="width: 20px; height: 20px; margin-right: 0.75rem; cursor: pointer;"
              >
              <span style="font-weight: bold; color: #1f2937;">
                전체동의
              </span>
            </label>
            
            <!-- 이용약관 동의 -->
            <label style="
              display: flex; align-items: flex-start; margin-bottom: 0.75rem; 
              cursor: pointer; font-size: 0.95rem;
            ">
              <input 
                type="checkbox" 
                class="agreement-checkbox required-checkbox"
                id="agreeTerms" 
                required 
                style="width: 18px; height: 18px; margin-right: 0.75rem; margin-top: 0.15rem; cursor: pointer;"
              >
              <span style="color: #374151; line-height: 1.6;">
                <strong style="color: #ef4444;">[필수]</strong> 이용약관에 동의합니다
                <a href="#" onclick="showTermsOfService(); return false;" style="color: #667eea; text-decoration: underline; margin-left: 0.5rem;">보기</a>
              </span>
            </label>
            
            <!-- 개인정보처리방침 동의 -->
            <label style="
              display: flex; align-items: flex-start; margin-bottom: 0.75rem; 
              cursor: pointer; font-size: 0.95rem;
            ">
              <input 
                type="checkbox" 
                class="agreement-checkbox required-checkbox"
                id="agreePrivacy" 
                required 
                style="width: 18px; height: 18px; margin-right: 0.75rem; margin-top: 0.15rem; cursor: pointer;"
              >
              <span style="color: #374151; line-height: 1.6;">
                <strong style="color: #ef4444;">[필수]</strong> 개인정보처리방침에 동의합니다
                <a href="#" onclick="showPrivacyPolicy(); return false;" style="color: #667eea; text-decoration: underline; margin-left: 0.5rem;">보기</a>
              </span>
            </label>
            
            <!-- 개인정보 수집/이용 동의 -->
            <label style="
              display: flex; align-items: flex-start; margin-bottom: 0.75rem; 
              cursor: pointer; font-size: 0.95rem;
            ">
              <input 
                type="checkbox" 
                class="agreement-checkbox required-checkbox"
                id="agreeCollection" 
                required 
                style="width: 18px; height: 18px; margin-right: 0.75rem; margin-top: 0.15rem; cursor: pointer;"
              >
              <span style="color: #374151; line-height: 1.6;">
                <strong style="color: #ef4444;">[필수]</strong> 개인정보 수집 및 이용에 동의합니다
              </span>
            </label>
            
            <!-- 성별/생년월일 정보 수집 동의 -->
            <label style="
              display: flex; align-items: flex-start; margin-bottom: 0.75rem; 
              cursor: pointer; font-size: 0.95rem;
            ">
              <input 
                type="checkbox" 
                class="agreement-checkbox required-checkbox"
                id="agreePersonalInfo" 
                required 
                style="width: 18px; height: 18px; margin-right: 0.75rem; margin-top: 0.15rem; cursor: pointer;"
              >
              <span style="color: #374151; line-height: 1.6;">
                <strong style="color: #ef4444;">[필수]</strong> 성별 및 생년월일 정보 수집 및 이용에 동의합니다
              </span>
            </label>
            
            <!-- 이벤트/마케팅 수신 동의 -->
            <label style="
              display: flex; align-items: flex-start; margin-bottom: 0.75rem; 
              cursor: pointer; font-size: 0.95rem;
            ">
              <input 
                type="checkbox" 
                class="agreement-checkbox optional-checkbox"
                id="agreeMarketing" 
                style="width: 18px; height: 18px; margin-right: 0.75rem; margin-top: 0.15rem; cursor: pointer;"
              >
              <span style="color: #6b7280; line-height: 1.6;">
                <strong style="color: #3b82f6;">[선택]</strong> 이벤트/마케팅 정보 이메일 수신에 동의합니다
              </span>
            </label>
            
            <!-- 생년월일 맞춤 정보 수신 동의 -->
            <label style="
              display: flex; align-items: flex-start; margin-bottom: 1rem; 
              cursor: pointer; font-size: 0.95rem;
            ">
              <input 
                type="checkbox" 
                class="agreement-checkbox optional-checkbox"
                id="agreeCustomInfo" 
                style="width: 18px; height: 18px; margin-right: 0.75rem; margin-top: 0.15rem; cursor: pointer;"
              >
              <span style="color: #6b7280; line-height: 1.6;">
                <strong style="color: #3b82f6;">[선택]</strong> 생년월일 정보를 활용한 맞춤 정보 수신에 동의합니다
              </span>
            </label>
            
            <!-- 만 14세 이상 확인 -->
            <label style="
              display: flex; align-items: flex-start; cursor: pointer; 
              padding-top: 1rem; border-top: 2px solid #e5e7eb; font-size: 0.95rem;
            ">
              <input 
                type="checkbox" 
                class="agreement-checkbox required-checkbox"
                id="agreeAge14" 
                required 
                style="width: 18px; height: 18px; margin-right: 0.75rem; margin-top: 0.15rem; cursor: pointer;"
              >
              <span style="color: #374151; line-height: 1.6;">
                <strong style="color: #ef4444;">[필수]</strong> 만 14세 이상입니다
              </span>
            </label>
          </div>
          
          <!-- 제출 버튼 -->
          <button 
            type="submit" 
            id="registrationSubmitBtn"
            style="
              width: 100%; padding: 1rem; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; font-weight: bold; font-size: 1.1rem; 
              border: none; border-radius: 12px; cursor: pointer;
              transition: transform 0.2s ease;
            "
            onmouseover="this.style.transform='translateY(-2px)'"
            onmouseout="this.style.transform='translateY(0)'"
          >
            가입하기
          </button>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // 이메일 자동채우기 (구글/카카오/이메일 가입 모두 대응)
  const emailInput = document.getElementById('userEmail');
  if (emailInput) {
    const autoEmail = window.currentUser?.email || '';
    if (autoEmail) {
      emailInput.value = autoEmail;
      console.log('📧 이메일 자동채우기:', autoEmail);
    }
  }
  
  // 전체동의 체크박스 로직
  const agreeAllCheckbox = document.getElementById('agreeAll');
  const agreementCheckboxes = document.querySelectorAll('.agreement-checkbox');
  
  agreeAllCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    agreementCheckboxes.forEach(checkbox => {
      checkbox.checked = isChecked;
    });
  });
  
  // 개별 체크박스 변경 시 전체동의 상태 업데이트
  agreementCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const allChecked = Array.from(agreementCheckboxes).every(cb => cb.checked);
      agreeAllCheckbox.checked = allChecked;
    });
  });
  
  // 폼 제출 이벤트 처리
  document.getElementById('registrationCompleteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const birthDate = document.getElementById('userBirthDate').value;
    const phone = document.getElementById('userPhone').value.trim();
    
    // 약관 동의
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const agreePrivacy = document.getElementById('agreePrivacy').checked;
    const agreeCollection = document.getElementById('agreeCollection').checked;
    const agreePersonalInfo = document.getElementById('agreePersonalInfo').checked;
    const agreeAge14 = document.getElementById('agreeAge14').checked;
    const agreeMarketing = document.getElementById('agreeMarketing').checked;
    const agreeCustomInfo = document.getElementById('agreeCustomInfo').checked;
    
    // 입력값 검증
    if (!name) {
      showToast('❌ 이름을 입력해주세요', 'error');
      document.getElementById('userName').focus();
      return;
    }
    
    if (!email || !email.includes('@')) {
      showToast('❌ 올바른 이메일을 입력해주세요', 'error');
      document.getElementById('userEmail').focus();
      return;
    }
    
    if (!gender) {
      showToast('❌ 성별을 선택해주세요', 'error');
      return;
    }
    
    if (!birthDate) {
      showToast('❌ 생년월일을 입력해주세요', 'error');
      document.getElementById('userBirthDate').focus();
      return;
    }
    
    // 만 14세 이상 확인
    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    if (currentYear - birthYear < 14) {
      showToast('❌ 만 14세 이상만 가입 가능합니다', 'error');
      return;
    }
    
    if (!phone) {
      showToast('❌ 휴대전화번호를 입력해주세요', 'error');
      document.getElementById('userPhone').focus();
      return;
    }
    
    // 필수 약관 동의 확인
    if (!agreeTerms) {
      showToast('❌ 이용약관에 동의해주세요', 'error');
      return;
    }
    
    if (!agreePrivacy) {
      showToast('❌ 개인정보처리방침에 동의해주세요', 'error');
      return;
    }
    
    if (!agreeCollection) {
      showToast('❌ 개인정보 수집 및 이용에 동의해주세요', 'error');
      return;
    }
    
    if (!agreePersonalInfo) {
      showToast('❌ 성별 및 생년월일 정보 수집에 동의해주세요', 'error');
      return;
    }
    
    if (!agreeAge14) {
      showToast('❌ 만 14세 이상임을 확인해주세요', 'error');
      return;
    }
    
    // 로딩 상태
    const submitBtn = document.getElementById('registrationSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '가입 중...';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';
    
    try {
      console.log('📝 회원가입 완료 처리 시작:', { 
        userId, name, email, gender, birthDate, phone,
        agreeTerms, agreePrivacy, agreeCollection, agreePersonalInfo, 
        agreeAge14, agreeMarketing, agreeCustomInfo
      });
      
      const response = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: name,
          email: email,
          gender: gender,
          birth_date: birthDate,
          phone: phone,
          terms_agreed: agreeTerms,
          privacy_agreed: agreePrivacy,
          collection_agreed: agreeCollection,
          personal_info_agreed: agreePersonalInfo,
          age_14_confirmed: agreeAge14,
          marketing_agreed: agreeMarketing,
          custom_info_agreed: agreeCustomInfo
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ 회원가입 완료 성공:', data.user);
        
        // 사용자 정보 업데이트
        window.currentUser = {
          ...window.currentUser,
          ...data.user,
          isLoggedIn: true,
          isGuest: false,
          registration_completed: true
        };
        currentUser = window.currentUser; // 로컬 참조 동기화
        localStorage.setItem('postflow_user', JSON.stringify(window.currentUser));
        
        // 모달 닫기
        document.getElementById('registrationModal').remove();
        
        // 성공 메시지
        showToast('🎉 회원가입이 완료되었습니다! 서비스를 이용해보세요.', 'success');
        
        // UI 업데이트
        updateAuthUI();
        updateCostEstimate();
        
        // 🔥 모달 완료 후 대시보드 로드 실행 (신규회원 순서 보장)
        console.log('🔥 모달 완료 → 대시보드 데이터 로드 시작');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('userUpdated', {
            detail: window.currentUser
          }));
          console.log('🔔 userUpdated 이벤트 발생! (모달 완료 후)');
        }, 100);
        loadProfileFromDB(userId);
        
      } else {
        console.error('❌ 회원가입 완료 실패:', data.error);
        showToast(`❌ ${data.error}`, 'error');
      }
    } catch (error) {
      console.error('❌ 회원가입 완료 예외:', error);
      showToast('❌ 회원가입 완료 중 오류가 발생했습니다', 'error');
    } finally {
      // 버튼 상태 복원
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    }
  });
  
  // 이름 입력 필드에 자동 포커스
  setTimeout(() => {
    const nameInput = document.getElementById('userName');
    if (nameInput) nameInput.focus();
  }, 100);
}

// 📋 정책 모달 관련 함수
function openPolicyModal(type) {
  const modal = document.getElementById('policyModal');
  const title = document.getElementById('policyModalTitle');
  const content = document.getElementById('policyModalContent');
  
  const policies = {
    refund: {
      title: '환불 정책',
      content: `
        <h4 class="text-xl font-bold text-gray-800 mb-4">환불 정책</h4>
        <div class="space-y-4 text-gray-600">
          <p><strong>1. 환불 가능 조건</strong></p>
          <ul class="list-disc pl-6 space-y-2">
            <li>크레딧 구매 후 7일 이내, 사용하지 않은 크레딧에 한해 환불 가능</li>
            <li>시스템 장애로 인한 서비스 이용 불가 시 전액 환불</li>
            <li>서비스 품질 불만족 시 사용하지 않은 크레딧 부분 환불</li>
          </ul>
          <p><strong>2. 환불 불가 조건</strong></p>
          <ul class="list-disc pl-6 space-y-2">
            <li>이미 사용한 크레딧</li>
            <li>프로모션이나 이벤트로 무료로 지급받은 크레딧</li>
            <li>구매 후 7일 경과</li>
          </ul>
          <p><strong>3. 환불 절차</strong></p>
          <p>고객센터(marketinghubai2026@gmail.com)로 환불 요청 → 검토 후 3-5영업일 내 처리</p>
        </div>
      `
    },
    privacy: {
      title: '개인정보처리방침',
      content: `
        <h4 class="text-xl font-bold text-gray-800 mb-4">개인정보처리방침</h4>
        <div class="space-y-4 text-gray-600">
          <p><strong>1. 수집하는 개인정보</strong></p>
          <ul class="list-disc pl-6 space-y-2">
            <li>필수: 이메일 주소, 이름</li>
            <li>선택: 프로필 이미지, 전화번호</li>
            <li>자동 수집: IP 주소, 쿠키, 서비스 이용 기록</li>
          </ul>
          <p><strong>2. 개인정보의 이용 목적</strong></p>
          <ul class="list-disc pl-6 space-y-2">
            <li>회원 가입 및 관리</li>
            <li>서비스 제공 및 개선</li>
            <li>고객 문의 응대</li>
            <li>마케팅 및 광고 (동의 시)</li>
          </ul>
          <p><strong>3. 개인정보의 보유 및 이용 기간</strong></p>
          <p>회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다. 단, 관련 법령에 따라 일부 정보는 일정 기간 보관될 수 있습니다.</p>
          <p><strong>4. 개인정보 보호책임자</strong></p>
          <p>성명: 김용현</p>
          <p>이메일: marketinghubai2026@gmail.com</p>
          <p>전화: 055-606-0826</p>
        </div>
      `
    },
    terms: {
      title: '이용약관',
      content: `
        <h4 class="text-xl font-bold text-gray-800 mb-4">이용약관</h4>
        <div class="space-y-4 text-gray-600">
          <p><strong>제1조 (목적)</strong></p>
          <p>본 약관은 김선수컴퍼니(이하 "회사")가 운영하는 마케팅허브 AI 스튜디오에서 제공하는 AI 콘텐츠 생성 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          
          <p><strong>제2조 (정의)</strong></p>
          <ul class="list-disc pl-6 space-y-2">
            <li>"서비스"란 회사가 제공하는 PostFlow, TrendFinder, StoryMaker 등 모든 AI 기반 콘텐츠 생성 도구를 말합니다.</li>
            <li>"회원"이란 본 약관에 동의하고 회사와 서비스 이용계약을 체결한 자를 말합니다.</li>
            <li>"크레딧"이란 서비스 이용을 위한 가상의 화폐 단위를 말합니다.</li>
          </ul>
          
          <p><strong>제3조 (회원 가입)</strong></p>
          <ul class="list-disc pl-6 space-y-2">
            <li>회원 가입은 이메일 인증 또는 소셜 로그인(Google, Kakao)으로 가능합니다.</li>
            <li>회원은 정확한 정보를 제공해야 하며, 허위 정보 제공 시 서비스 이용이 제한될 수 있습니다.</li>
          </ul>
          
          <p><strong>제4조 (서비스 이용)</strong></p>
          <ul class="list-disc pl-6 space-y-2">
            <li>서비스는 크레딧 소비 방식으로 제공됩니다.</li>
            <li>무료 회원은 가입 시 30개 무료 크레딧을 지급받으며, 매월 30개 크레딧이 자동 충전됩니다.</li>
            <li>AI 생성 콘텐츠의 저작권은 회원에게 있으나, 불법적인 용도로 사용할 수 없습니다.</li>
          </ul>
          
          <p><strong>제5조 (서비스 이용 제한)</strong></p>
          <p>회사는 다음 각 호에 해당하는 경우 서비스 이용을 제한하거나 계약을 해지할 수 있습니다:</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>타인의 정보를 도용한 경우</li>
            <li>서비스를 불법적인 목적으로 이용한 경우</li>
            <li>서비스 운영을 고의로 방해한 경우</li>
          </ul>
          
          <p class="mt-6 text-sm text-gray-500">최종 업데이트: 2026년 1월</p>
        </div>
      `
    }
  };
  
  const policy = policies[type];
  if (policy) {
    title.textContent = policy.title;
    content.innerHTML = policy.content;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // 스크롤 방지
  }
}

function closePolicyModal() {
  const modal = document.getElementById('policyModal');
  modal.classList.add('hidden');
  document.body.style.overflow = ''; // 스크롤 복원
}

// 🏠 로고 클릭 핸들러 (로그인 상태면 /dashboard로, 비로그인이면 / 유지)
function handleLogoClick() {
  const savedUser = localStorage.getItem('postflow_user');
  const savedToken = localStorage.getItem('postflow_token');
  
  // 로그인 상태 확인: localStorage와 window.currentUser 둘 다 체크
  const isLoggedIn = savedUser && savedToken && 
                     window.currentUser && 
                     !window.currentUser.isGuest && 
                     window.currentUser.isLoggedIn;
  
  if (isLoggedIn) {
    // 로그인 상태: /dashboard로 이동 (이미 /dashboard면 스킵)
    if (window.location.pathname !== '/dashboard') {
      console.log('🏠 [로고 클릭] 로그인 상태 - /dashboard로 이동');
      sessionStorage.setItem('landing_page_visited', 'true');
      window.location.href = '/dashboard';
    } else {
      console.log('🏠 [로고 클릭] 이미 대시보드 페이지 - 새로고침 방지');
    }
  } else {
    // 비로그인 상태: / (메인)로 이동
    console.log('🏠 [로고 클릭] 비로그인 상태 - 메인으로 이동');
    sessionStorage.removeItem('landing_page_visited');
    
    // 현재 경로가 이미 / 인 경우 새로고침 방지
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }
}

// UI 초기화
function initializeAuth() {
  console.log('🚀 [초기화] initializeAuth 시작');
  
  // ✅ NEW v7.4: 이메일 인증 완료 환영 메시지
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('welcome') === 'true') {
    showToast('🎉 이메일 인증이 완료되었습니다! 30개 무료 크레딧이 지급되었습니다.', 'success');
    // URL 정리
    window.history.replaceState(null, '', window.location.pathname);
  }
  
  // Supabase 초기화
  initSupabase();
  
  // 로컬 스토리지에서 사용자 정보 확인
  const savedUser = localStorage.getItem('postflow_user');
  const savedToken = localStorage.getItem('postflow_token');
  
  if (savedUser && savedToken) {
    window.currentUser = JSON.parse(savedUser);
    console.log('✅ [초기화] localStorage에서 사용자 복원:', window.currentUser);
    
    // 🔥 로그인 상태 명시적 설정 (중요!)
    window.currentUser.isGuest = false;
    window.currentUser.isLoggedIn = true;
    
    // 🔥 메인 페이지에서만 로그인된 상태면 자동으로 /dashboard로 이동
    // (다른 페이지는 그대로 유지 - YouTube Finder, PostFlow 등)
    if (window.location.pathname === '/' && !sessionStorage.getItem('landing_page_visited')) {
      console.log('🔄 [메인 페이지] 로그인 상태 감지 - /dashboard로 자동 이동');
      sessionStorage.setItem('landing_page_visited', 'true');
      window.location.href = '/dashboard';
      return;
    }
    
    updateAuthUI();
  } else {
    // 비회원 상태로 시작
    window.currentUser.isGuest = true;
    window.currentUser.isLoggedIn = false;
    window.currentUser.tier = 'guest';
    window.currentUser.credits = 1;
    console.log('📝 [초기화] 비회원 상태로 시작:', window.currentUser);
    updateAuthUI();
  }
  
  // 전역 노출 (디버깅용)
  console.log('🌐 [초기화] window.currentUser 전역 노출 완료:', window.currentUser);
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
      window.currentUser = {
        id: data.user?.id || null,  // ✅ 추가: 사용자 ID
        isLoggedIn: !data.is_guest,
        isGuest: data.is_guest,
        name: data.user?.name || '게스트',
        email: data.user?.email || null,
        credits: data.user?.credits || 1,
        tier: data.user?.subscription_status === 'active' ? 'paid' : (data.is_guest ? 'guest' : 'free'),
        subscription_status: data.user?.subscription_status
      };
      
      localStorage.setItem('postflow_user', JSON.stringify(window.currentUser));
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
  const user = window.currentUser; // ✅ 전역 객체만 참조
  
  const userInfoArea = document.getElementById('userInfoArea');
  const guestArea = document.getElementById('guestArea');
  const memberFeaturesArea = document.getElementById('memberFeaturesArea');
  const heroSection = document.getElementById('heroSection');
  const userName = document.getElementById('userName');
  const userTier = document.getElementById('userTier');
  const userCredits = document.getElementById('userCredits');
  
  if (user.isLoggedIn && !user.isGuest) {
    // 로그인 상태 (하이브리드 플랜)
    if (userInfoArea) userInfoArea.classList.remove('hidden');
    if (guestArea) guestArea.classList.add('hidden');
    if (memberFeaturesArea) memberFeaturesArea.classList.remove('hidden');
    
    // 📅 Phase 3: 캘린더 섹션 표시
    showScheduledContentArea();
    
    // 🔥 Phase 4&5: 왼쪽 패널 회원 전용 기능 표시
    const leftPanelMemberFeatures = document.getElementById('leftPanelMemberFeatures');
    if (leftPanelMemberFeatures) {
      leftPanelMemberFeatures.classList.remove('hidden');
    }
    
    // 🔄 프로필 자동 로드 (로그인 시 한 번만)
    if (!window.cachedProfiles) {
      loadUserProfiles().catch(err => {
        console.error('❌ 프로필 로드 실패:', err);
      });
    }
    
    // 히어로 섹션 숨기기
    if (heroSection) {
      heroSection.classList.add('hidden');
    }
    
    if (userName) userName.textContent = user.name || user.email?.split('@')[0] || '회원';
    // Tier 표시
    const tierLabels = {
      'guest': '비회원',
      'free': '무료',
      'paid': '유료'
    };
    if (userTier) userTier.textContent = tierLabels[user.tier] || '무료';
    
    // ✅ 2지갑 크레딧 표시 개선
    const freeCredits = user.free_credits || 0;
    const paidCredits = user.paid_credits || 0;
    const totalCredits = freeCredits + paidCredits;
    
    // 🔥 키워드 분석과 동일한 포맷 사용 (가운뎃점 ·)
    const _fmt = (n) => Number(n).toLocaleString('ko-KR');
    let creditText = `무료 ${_fmt(freeCredits)} · 유료 ${_fmt(paidCredits)}`;
    
    if (userCredits) userCredits.textContent = creditText;
    
    // 시각적 효과
    if (userCredits) {
      userCredits.style.transition = 'color 0.3s ease';
      userCredits.style.color = '#4f46e5';
      setTimeout(() => {
        userCredits.style.color = '';
      }, 500);
    }
    
    console.log('✅ updateAuthUI 크레딧 표시 업데이트:', {
      free: freeCredits,
      paid: paidCredits,
      total: totalCredits,
      display: creditText
    });
  } else {
    // 비회원/게스트 상태
    if (userInfoArea) userInfoArea.classList.add('hidden');
    if (guestArea) guestArea.classList.remove('hidden');
    if (memberFeaturesArea) memberFeaturesArea.classList.add('hidden');
    
    // 📅 Phase 3: 캘린더 섹션 숨김
    hideScheduledContentArea();
    
    // 히어로 섹션 표시
    if (heroSection) {
      heroSection.classList.remove('hidden');
    }
  }
}

// 인증 에러 처리 (하이브리드 플랜)
// 🔒 Supabase onAuthStateChange 리스너 — 세션 만료/로그아웃 자동 감지
function setupAuthStateListener() {
  if (!supabaseClient) return;
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('🔄 [Auth State Change]', event);
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
      // 세션 만료 또는 로그아웃
      console.log('🔒 세션 만료/로그아웃 감지 → 상태 초기화');
      handleAuthError();
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // 토큰 자동 갱신 성공
      console.log('✅ 토큰 자동 갱신 완료');
      localStorage.setItem('postflow_token', session.access_token);
    }
  });
  console.log('✅ [Auth] onAuthStateChange 리스너 등록 완료');
}

function handleAuthError() {
  localStorage.removeItem('postflow_token');
  localStorage.removeItem('postflow_user');
  window.currentUser = {
    id: null,
    isLoggedIn: false,
    isGuest: true,
    name: null,
    email: null,
    tier: 'guest', // 'guest' | 'free' | 'paid'
    credits: 1, // 비회원 1크레딧
    free_credits: 0,
    paid_credits: 0
  };

  // 🔒 클라이언트 라우트 가드: 비로그인 시 보호 페이지 접근 차단
  const protectedPaths = ['/postflow', '/dashboard'];
  const currentPath = window.location.pathname;
  if (protectedPaths.includes(currentPath)) {
    console.log('🔒 [라우트 가드] 비로그인 상태 - 홈으로 리다이렉트:', currentPath);
    window.location.href = '/?redirect=' + encodeURIComponent(currentPath);
    return;
  }

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
  console.log('🚪 로그아웃 시도...');
  if (confirm('로그아웃 하시겠습니까?')) {
    try {
      // 1. Supabase 세션 종료
      if (supabaseClient) {
        console.log('🔓 Supabase 로그아웃 시작...');
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          console.error('로그아웃 실패:', error);
        } else {
          console.log('✅ Supabase 로그아웃 성공');
        }
      }
      
      // 2. 모든 로컬 저장소 클리어
      console.log('🗑️ 로컬 저장소 클리어 중...');
      localStorage.removeItem('postflow_token');
      localStorage.removeItem('postflow_user');
      sessionStorage.removeItem('landing_page_visited');
      
      // 3. Supabase 관련 저장소도 클리어
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('supabase')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('✅ 로컬 저장소 클리어 완료:', keysToRemove);
      
      // 4. currentUser 초기화
      handleAuthError();
      showToast('로그아웃되었습니다', 'success');
      
      // 5. 랜딩 페이지로 리디렉션 (캐시 방지)
      console.log('🔄 랜딩 페이지로 리디렉션...');
      setTimeout(() => {
        window.location.href = '/?t=' + Date.now();
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
  
  // 회원가입과 로그인 버튼 (NEW v7.3 - 모드 분리)
  if (signupBtn) {
    signupBtn.addEventListener('click', () => openAuthModal('signup'));
  }
  if (loginBtn) {
    loginBtn.addEventListener('click', () => openAuthModal('login'));
  }
  if (heroLoginBtn) heroLoginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (heroTrialBtn) heroTrialBtn.addEventListener('click', handleTrial);
  
  // 회원 전용 버튼 클릭 시 로그인 유도 + 프로필 모달 연결
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const loadProfileBtn = document.getElementById('loadProfileBtn');
  const historyBtn = document.getElementById('historyBtn');
  const templateBtn = document.getElementById('templateBtn');
  
  // 프로필 저장 버튼
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', (e) => {
      if (currentUser.isGuest) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('이 기능은 회원 전용입니다. 로그인 하시겠습니까?')) {
          handleLogin();
        }
        return false;
      }
      // 로그인 상태: 모달 열기
      openProfileSaveModal();
    });
  }
  
  // 프로필 관리 버튼
  if (loadProfileBtn) {
    loadProfileBtn.addEventListener('click', (e) => {
      if (currentUser.isGuest) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('이 기능은 회원 전용입니다. 로그인 하시겠습니까?')) {
          handleLogin();
        }
        return false;
      }
      // 로그인 상태: 모달 열기
      openProfileListModal();
    });
  }
  
  // 히스토리 버튼
  if (historyBtn) {
    historyBtn.addEventListener('click', (e) => {
      console.log('🟢 히스토리 버튼 클릭됨', currentUser);
      
      if (currentUser.isGuest) {
        console.log('🟡 게스트 상태 - 로그인 유도');
        e.preventDefault();
        e.stopPropagation();
        if (confirm('이 기능은 회원 전용입니다. 로그인 하시겠습니까?')) {
          handleLogin();
        }
        return false;
      }
      // 로그인 상태: 히스토리 모달 열기
      console.log('🟢 로그인 상태 - openHistoryModal 호출');
      openHistoryModal();
    });
    console.log('✅ 히스토리 버튼 이벤트 리스너 등록 완료');
  } else {
    console.error('❌ historyBtn 요소를 찾을 수 없습니다!');
  }
  
  // 템플릿 버튼
  if (templateBtn) {
    templateBtn.addEventListener('click', (e) => {
      if (currentUser.isGuest) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('이 기능은 회원 전용입니다. 로그인 하시겠습니까?')) {
          handleLogin();
        }
        return false;
      }
      // 로그인 상태: 템플릿 기능 체크
      if (FEATURE_FLAGS.ENABLE_CUSTOM_TEMPLATES) {
        openTemplateEditor();
      } else {
        showToast('⚠️ 템플릿 기능은 현재 준비 중입니다', 'warning');
      }
    });
  }
  
  // SNS 바로가기 버튼
  const snsLinksBtn = document.getElementById('snsLinksBtn');
  if (snsLinksBtn) {
    snsLinksBtn.addEventListener('click', () => {
      openSnsLinksModal();
    });
    console.log('✅ SNS 바로가기 버튼 이벤트 리스너 등록 완료');
  } else {
    console.error('❌ snsLinksBtn 요소를 찾을 수 없습니다!');
  }
  
  // AI 빠른 설정 버튼
  const aiWorkflowBtn = document.getElementById('aiWorkflowBtn');
  if (aiWorkflowBtn) {
    aiWorkflowBtn.addEventListener('click', () => {
      openAiWorkflowModal();
    });
    console.log('✅ AI 빠른 설정 버튼 이벤트 리스너 등록 완료');
  } else {
    console.error('❌ aiWorkflowBtn 요소를 찾을 수 없습니다!');
  }
  
  // 🔍 디버깅: 함수와 데이터 검증 (개발자 콘솔에서 확인 가능)
  setTimeout(() => {
    console.log('🔍 === 히스토리/캘린더 검증 ===');
    console.log('1️⃣ openHistoryModal:', typeof window.openHistoryModal);
    console.log('2️⃣ viewHistory:', typeof window.viewHistory);
    console.log('3️⃣ loadCalendarEvents:', typeof window.loadCalendarEvents);
    console.log('4️⃣ contentHistory:', window.contentHistory ? `${window.contentHistory.length}개` : 'undefined');
    console.log('5️⃣ historyBtn:', document.getElementById('historyBtn') ? '✅ 존재' : '❌ 없음');
    console.log('6️⃣ currentUser:', window.currentUser);
    console.log('================================');
  }, 1000);
  
  // 🆕 인증 모달 내부 버튼 이벤트 리스너 (NEW v7.3)
  const emailAuthBtn = document.getElementById('emailAuthBtn');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const kakaoLoginBtn = document.getElementById('kakaoLoginBtn');
  const authEmail = document.getElementById('authEmail');
  const authModeToggle = document.getElementById('authModeToggle');
  
  if (emailAuthBtn) {
    emailAuthBtn.addEventListener('click', handleEmailAuth);
  }
  
  if (googleLoginBtn) {
    if (isInAppBrowser()) {
      // 인앱 브라우저: Google 버튼 비활성화 + 안내 표시
      googleLoginBtn.style.opacity = '0.5';
      googleLoginBtn.style.pointerEvents = 'none';
      googleLoginBtn.style.position = 'relative';
      const notice = document.createElement('div');
      notice.style.cssText = 'font-size:11px;color:#dc2626;margin-top:4px;text-align:center;';
      notice.textContent = '인앱 브라우저에서는 Google 로그인이 불가합니다. Chrome/Safari에서 열어주세요.';
      googleLoginBtn.parentNode.insertBefore(notice, googleLoginBtn.nextSibling);
    } else {
      googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
  }
  
  if (kakaoLoginBtn) {
    kakaoLoginBtn.addEventListener('click', handleKakaoLogin);
  }
  
  if (authEmail) {
    authEmail.addEventListener('input', updateEmailDomainHint);
  }
  
  if (authModeToggle) {
    authModeToggle.addEventListener('click', toggleAuthMode);
  }
});

// 선택된 템플릿 가져오기 (향후 UI 연동용)
function getSelectedTemplateContent() {
  // 현재는 전역 템플릿 설정 없이 플랫폼별 자동 적용
  // customTemplates에서 플랫폼별로 찾아서 반환
  // 백엔드에서 플랫폼별로 알아서 적용하므로 null 반환
  return null;
}

// ===================================
// 템플릿 저장 기능
// ===================================

// 템플릿 로드
function loadCustomTemplates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    customTemplates = stored ? JSON.parse(stored) : [];
    console.log(`✅ 템플릿 로드 완료: ${customTemplates.length}개`);
    return customTemplates;
  } catch (error) {
    console.error('❌ 템플릿 로드 실패:', error);
    customTemplates = [];
    return [];
  }
}

// 템플릿 저장
function saveCustomTemplate(name, platform, content) {
  try {
    if (!name || !platform || !content) {
      showToast('❌ 템플릿 이름, 플랫폼, 내용을 모두 입력해주세요', 'error');
      return false;
    }
    
    // 최대 길이 체크 (8000자)
    if (content.length > 8000) {
      showToast('❌ 템플릿이 너무 깁니다 (최대 8000자)', 'error');
      return false;
    }
    
    const template = {
      id: Date.now().toString(),
      name,
      platform,
      content,
      created_at: new Date().toISOString()
    };
    
    customTemplates.push(template);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(customTemplates));
    
    console.log(`✅ 템플릿 저장 완료: ${name}`);
    showToast(`✅ "${name}" 템플릿 저장 완료`, 'success');
    return true;
  } catch (error) {
    console.error('❌ 템플릿 저장 실패:', error);
    showToast('❌ 템플릿 저장 중 오류가 발생했습니다', 'error');
    return false;
  }
}

// 템플릿 삭제
function deleteCustomTemplate(templateId) {
  try {
    const index = customTemplates.findIndex(t => t.id === templateId);
    if (index === -1) {
      showToast('❌ 템플릿을 찾을 수 없습니다', 'error');
      return false;
    }
    
    const templateName = customTemplates[index].name;
    customTemplates.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(customTemplates));
    
    console.log(`✅ 템플릿 삭제 완료: ${templateName}`);
    showToast(`✅ "${templateName}" 템플릿 삭제 완료`, 'success');
    return true;
  } catch (error) {
    console.error('❌ 템플릿 삭제 실패:', error);
    showToast('❌ 템플릿 삭제 중 오류가 발생했습니다', 'error');
    return false;
  }
}

// 템플릿 에디터 열기
function openTemplateEditor() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); display: flex; align-items: center;
    justify-content: center; z-index: 10000;
  `;
  
  // 템플릿 편집 UI 생성
  const platforms = ['blog', 'instagram_feed', 'threads', 'twitter', 'linkedin', 'kakaotalk', 'brunch', 'tiktok', 'instagram_reels', 'youtube_shorts', 'youtube_longform', 'metadata_generation'];
  const platformNames = {
    blog: '네이버 블로그',
    instagram: '인스타그램 (기존)',
    instagram_feed: '인스타그램 피드',
    threads: '스레드',
    twitter: '트위터(X)',
    linkedin: 'LinkedIn',
    kakaotalk: '카카오톡',
    brunch: '브런치',
    tiktok: '틱톡',
    instagram_reels: '인스타그램 릴스',
    youtube_shorts: '유튜브 쇼츠',
    youtube_longform: '유튜브 롱폼',
    metadata_generation: '메타데이터 생성'
  };
  
  const platformIcons = {
    blog: '<i class="fas fa-blog text-blue-600 mr-2"></i>',
    instagram: '<i class="fab fa-instagram text-pink-600 mr-2"></i>',
    instagram_feed: '<i class="fab fa-instagram text-pink-600 mr-2"></i>',
    threads: '<i class="fas fa-at text-gray-800 mr-2"></i>',
    twitter: '<span style="font-size: 1rem; font-weight: 600; color: #000; margin-right: 0.5rem;">𝕏</span>',
    linkedin: '<i class="fab fa-linkedin text-blue-700 mr-2"></i>',
    kakaotalk: '<i class="fas fa-comment-dots text-yellow-500 mr-2"></i>',
    brunch: '<i class="fas fa-book-open text-orange-600 mr-2"></i>',
    tiktok: '<i class="fab fa-tiktok text-black mr-2"></i>',
    instagram_reels: '<i class="fab fa-instagram text-purple-600 mr-2"></i>',
    youtube_shorts: '<i class="fab fa-youtube text-red-500 mr-2"></i>',
    youtube_longform: '<i class="fab fa-youtube text-red-600 mr-2"></i>',
    metadata_generation: '<i class="fas fa-tags text-blue-600 mr-2"></i>'
  };
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 20px; padding: 2rem; max-width: 1200px; width: 95%; max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0;">💾 템플릿 관리</h2>
        <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">✕</button>
      </div>
      
      <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <p style="margin: 0; font-weight: 600; color: #0c4a6e; margin-bottom: 0.5rem;">💡 사용 가능한 변수:</p>
        <div style="font-size: 0.9rem; color: #075985;">
          <code>{브랜드명}</code> <code>{키워드}</code> <code>{톤앤매너}</code> <code>{타겟연령대}</code> <code>{타겟성별}</code> <code>{산업분야}</code>
        </div>
      </div>
      
      <div id="templateList" style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${platforms.map(platform => {
          const custom = customTemplates.find(t => t.platform === platform);
          const template = custom ? custom.template : DEFAULT_TEMPLATES[platform];
          
          return `
            <div style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; background: #fafafa;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 style="margin: 0; font-size: 1.1rem; color: #1f2937;">${platformIcons[platform] || ''}${platformNames[platform]}</h4>
                <div style="display: flex; gap: 0.5rem;">
                  <button
                    onclick="resetTemplate('${platform}')"
                    style="padding: 0.5rem 1rem; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;"
                    onmouseover="this.style.background='#4b5563'"
                    onmouseout="this.style.background='#6b7280'"
                  >
                    🔄 기본값
                  </button>
                  <button
                    onclick="saveTemplate('${platform}')"
                    style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;"
                    onmouseover="this.style.background='#059669'"
                    onmouseout="this.style.background='#10b981'"
                  >
                    💾 저장
                  </button>
                </div>
              </div>
              <textarea
                id="template_${platform}"
                style="width: 100%; height: 200px; padding: 1rem; border: 1px solid #d1d5db; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 0.85rem; resize: vertical; background: white;"
                placeholder="템플릿 내용을 입력하세요..."
              >${template || ''}</textarea>
              <div style="text-align: right; margin-top: 0.5rem; color: #6b7280; font-size: 0.85rem;">
                <span id="charCount_${platform}">0</span> / 8000자
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 글자 수 카운터 초기화
  platforms.forEach(platform => {
    const textarea = document.getElementById(`template_${platform}`);
    const charCount = document.getElementById(`charCount_${platform}`);
    
    if (textarea && charCount) {
      // 초기 글자 수 설정
      charCount.textContent = textarea.value.length;
      
      // 입력 이벤트 리스너
      textarea.addEventListener('input', () => {
        charCount.textContent = textarea.value.length;
        if (textarea.value.length > 8000) {
          charCount.style.color = '#ef4444';
          charCount.style.fontWeight = '600';
        } else {
          charCount.style.color = '#6b7280';
          charCount.style.fontWeight = 'normal';
        }
      });
    }
  });
}

// 템플릿 저장 핸들러
function handleSaveTemplate() {
  const name = document.getElementById('templateName').value.trim();
  const platform = document.getElementById('templatePlatform').value;
  const content = document.getElementById('templateContent').value.trim();
  
  if (saveCustomTemplate(name, platform, content)) {
    openTemplateEditor(); // 모달 새로고침
  }
}

// 템플릿 삭제 핸들러
function handleDeleteTemplate(templateId) {
  if (confirm('정말 이 템플릿을 삭제하시겠습니까?')) {
    if (deleteCustomTemplate(templateId)) {
      openTemplateEditor(); // 모달 새로고침
    }
  }
}

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
window.openTemplateEditor = openTemplateEditor;
window.saveTemplate = saveTemplate;
window.resetTemplate = resetTemplate;


// ========================================
// Phase 3: 콘텐츠 관리 캘린더 (완전 개편)
// ========================================

// 전역 변수
let calendarInstance = null;
let flatpickrInstance = null;
let quickAddFlatpickr = null;
let pendingScheduleData = null;
let isCalendarView = true;

/**
 * FullCalendar 초기화
 */
function initFullCalendar() {
  const calendarEl = document.getElementById('fullCalendar');
  if (!calendarEl) return;

  if (calendarInstance) {
    calendarInstance.destroy();
  }

  calendarInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ko',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    buttonText: {
      today: '오늘',
      month: '월',
      week: '주'
    },
    height: 'auto',
    eventClassNames: function(arg) {
      const status = arg.event.extendedProps.publish_status || 'draft';
      return [`fc-event-${status}`];
    },
    eventClick: function(info) {
      const eventType = info.event.extendedProps.type;
      if (eventType === 'memo') {
        // 메모 클릭 → 메모 수정 모달
        openMemoModal(info.event.extendedProps.memo_date, info.event.extendedProps.memo_id);
      } else {
        // 예정일 클릭 → 상세 모달
        showEventDetails(info.event);
      }
    },
    dateClick: function(info) {
      // 빈 날짜 클릭 시 메모 입력 모달 열기
      // toISOString()은 UTC 변환하므로 직접 문자열 조합
      const year = info.date.getFullYear();
      const month = String(info.date.getMonth() + 1).padStart(2, '0');
      const day = String(info.date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      console.log('📅 dateClick - 클릭한 날짜:', dateStr);
      openMemoModal(dateStr);
    },
    events: async function(fetchInfo, successCallback, failureCallback) {
      try {
        const events = await loadCalendarEvents();
        successCallback(events);
      } catch (error) {
        console.error('캘린더 이벤트 로드 오류:', error);
        failureCallback(error);
      }
    },
    // ✅ 커스텀 이벤트 렌더링 (Font Awesome 아이콘 사용)
    eventContent: function(arg) {
      const props = arg.event.extendedProps;
      const platform = props.platform;
      const status = props.publish_status || 'draft';
      
      // 상태별 배경색
      const bgColors = {
        published: '#10b981',
        cancelled: '#ef4444',
        scheduled: '#3b82f6',
        draft: '#3b82f6'
      };
      const bgColor = bgColors[status] || '#3b82f6';
      
      // Font Awesome 아이콘 매핑
      const platformIcons = {
        blog: { class: 'fas fa-blog', color: '#ffffff' },
        instagram: { class: 'fab fa-instagram', color: '#ffffff' },
        instagramFeed: { class: 'fab fa-instagram', color: '#ffffff' },
        instagram_feed: { class: 'fab fa-instagram', color: '#ffffff' },
        instagram_reels: { class: 'fab fa-instagram', color: '#ffffff' },
        threads: { class: 'fas fa-at', color: '#ffffff' },
        youtube: { class: 'fab fa-youtube', color: '#ffffff' },
        youtube_longform: { class: 'fab fa-youtube', color: '#ffffff' },
        youtube_shorts: { class: 'fab fa-youtube', color: '#ffffff' },
        youtubeLongform: { class: 'fab fa-youtube', color: '#ffffff' },
        linkedin: { class: 'fab fa-linkedin', color: '#ffffff' },
        facebook: { class: 'fab fa-facebook', color: '#ffffff' },
        twitter: { text: '𝕏', color: '#ffffff' },
        kakaotalk: { class: 'fas fa-comment-dots', color: '#ffffff' },
        brunch: { class: 'fas fa-book-open', color: '#ffffff' },
        naverband: { class: 'fas fa-users', color: '#ffffff' },
        band: { class: 'fas fa-users', color: '#ffffff' },
        telegram: { class: 'fab fa-telegram', color: '#ffffff' },
        tiktok: { class: 'fab fa-tiktok', color: '#ffffff' },
        shortform_multi: { class: 'fas fa-film', color: '#ffffff' }
      };
      
      const iconData = platformIcons[platform] || { class: 'fas fa-file', color: '#ffffff' };
      
      // 아이콘 HTML 생성 (text 또는 class 기반)
      const iconHtml = iconData.text 
        ? `<span style="font-weight: 600; margin-right: 4px; color: ${iconData.color};">${iconData.text}</span>`
        : `<i class="${iconData.class}" style="margin-right: 4px; color: ${iconData.color};"></i>`;
      
      // 메모인 경우 기본 렌더링
      if (props.type === 'memo') {
        return {
          html: `<div class="fc-event-main-frame" style="background-color: #f59e0b; color: white; padding: 2px 4px; border-radius: 3px;">
            ${arg.timeText ? `<div class="fc-event-time">${arg.timeText}</div>` : ''}
            <div class="fc-event-title-container">
              <div class="fc-event-title fc-sticky">${arg.event.title}</div>
            </div>
          </div>`
        };
      }
      
      // 예정일 이벤트: Font Awesome 아이콘 + 제목 + 배경색
      return {
        html: `<div class="fc-event-main-frame" style="background-color: ${bgColor}; color: white; padding: 2px 4px; border-radius: 3px;">
          ${arg.timeText ? `<div class="fc-event-time">${arg.timeText}</div>` : ''}
          <div class="fc-event-title-container">
            <div class="fc-event-title fc-sticky">
              ${iconHtml}
              ${arg.event.title}
            </div>
          </div>
        </div>`
      };
    },
    dayCellContent: function(arg) {
      // 메모가 있는 날짜에 아이콘 표시 (나중에 구현)
      return { html: arg.dayNumberText };
    }
  });

  calendarInstance.render();
  console.log('✅ FullCalendar 초기화 완료');
}

/**
 * 캘린더 이벤트 로드 (예정일 + 메모)
 */
async function loadCalendarEvents() {
  const user = window.currentUser;
  if (!user || !user.id) return [];

  try {
    // 1️⃣ 예정일 로드
    const scheduleResponse = await fetch(`/api/scheduled-content?user_id=${user.id}`);
    const scheduleData = await scheduleResponse.json();

    // 2️⃣ 메모 로드
    const memoResponse = await fetch(`/api/calendar-memos?user_id=${user.id}`);
    const memoData = await memoResponse.json();

    const events = [];

    // 예정일 이벤트 추가
    if (scheduleData.success && scheduleData.scheduled_content) {
      // ✅ 이모지는 캘린더용 (FullCalendar는 HTML 미지원)
      const platformEmojis = {
        blog: '📝',
        instagram: '📷',
        instagramFeed: '📷',
        instagram_feed: '📷',
        instagram_reels: '🎬',
        threads: '@',
        youtube: '▶️',
        youtube_longform: '▶️',
        youtube_shorts: '▶️',
        youtubeLongform: '▶️',
        linkedin: '💼',
        facebook: '📘',
        twitter: '🐦',
        kakaotalk: '💬',
        brunch: '📖',
        naverband: '🎵',
        telegram: '✈️',
        tiktok: '🎵',
        band: '🎵',
        shortform_multi: '🎬'
      };

      const platformNames = {
        blog: '블로그',
        instagram: '인스타그램',
        instagramFeed: '인스타피드',
        instagram_feed: '인스타피드',
        instagram_reels: '인스타릴스',
        threads: '스레드',
        youtube: '유튜브',
        youtube_shorts: '유튜브쇼츠',
        youtube_longform: '유튜브롱폼',
        youtubeLongform: '유튜브롱폼',
        linkedin: 'LinkedIn',
        facebook: '페이스북',
        twitter: '트위터',
        kakaotalk: '카카오톡',
        naverband: '밴드',
        telegram: '텔레그램',
        tiktok: '틱톡',
        shortform_multi: '숏폼'
      };

      // ✅ Font Awesome 아이콘 매핑 (목록/모달용)
      const platformIcons = {
        blog: { class: 'fas fa-blog', color: 'text-blue-600' },
        instagram: { class: 'fab fa-instagram', color: 'text-pink-600' },
        instagramFeed: { class: 'fab fa-instagram', color: 'text-pink-600' },
        instagram_feed: { class: 'fab fa-instagram', color: 'text-pink-600' },
        instagram_reels: { class: 'fab fa-instagram', color: 'text-purple-600' },
        threads: { class: 'fas fa-at', color: 'text-gray-800' },
        youtube: { class: 'fab fa-youtube', color: 'text-red-600' },
        youtube_longform: { class: 'fab fa-youtube', color: 'text-red-600' },
        youtube_shorts: { class: 'fab fa-youtube', color: 'text-red-500' },
        youtubeLongform: { class: 'fab fa-youtube', color: 'text-red-600' },
        linkedin: { class: 'fab fa-linkedin', color: 'text-blue-700' },
        facebook: { class: 'fab fa-facebook', color: 'text-blue-600' },
        twitter: { text: '𝕏', color: 'text-gray-900' },
        kakaotalk: { class: 'fas fa-comment-dots', color: 'text-yellow-500' },
        brunch: { class: 'fas fa-book-open', color: 'text-orange-600' },
        naverband: { class: 'fas fa-users', color: 'text-green-600' },
        band: { class: 'fas fa-users', color: 'text-green-600' },
        telegram: { class: 'fab fa-telegram', color: 'text-blue-500' },
        tiktok: { class: 'fab fa-tiktok', color: 'text-black' },
        shortform_multi: { class: 'fas fa-film', color: 'text-purple-600' }
      };

      scheduleData.scheduled_content.forEach(item => {
        // ✅ platform_status 우선, 없으면 기존 publish_status 사용
        const platformStatus = item.platform_status || {};
        const fallbackStatus = item.publish_status || 'draft';
        
        // 각 플랫폼마다 별도 이벤트 생성
        if (item.platforms && Array.isArray(item.platforms)) {
          item.platforms.forEach((platform, index) => {
            // ✅ 플랫폼별 상태 사용
            const status = platformStatus[platform] || fallbackStatus;
            
            // ✅ scheduled_date가 없거나 draft 상태면 캘린더에 표시하지 않음
            if (!item.scheduled_date || status === 'draft') {
              return; // 건너뛰기
            }
            
            const backgroundColor = status === 'published' ? '#10b981' : status === 'cancelled' ? '#ef4444' : '#3b82f6';
            
            const emoji = platformEmojis[platform] || '📄';
            const platformName = platformNames[platform] || platform || '콘텐츠';
            
            // results (jsonb)에서 해당 플랫폼의 데이터 추출
            let title = platformName; // 기본값: 플랫폼 이름
            let content = '내용 없음';
            
            if (item.results && typeof item.results === 'object') {
              const platformData = item.results[platform];
              
              if (platformData) {
                // ✅ 콘텐츠가 문자열로 직접 저장되어 있는 경우
                if (typeof platformData === 'string') {
                  content = platformData;
                  title = platformData.substring(0, 50) + (platformData.length > 50 ? '...' : '');
                }
                // ✅ 객체인 경우
                else if (typeof platformData === 'object') {
                  // 제목 추출
                  if (platformData.title) {
                    title = platformData.title;
                  } else if (platformData.content) {
                    // 제목이 없으면 콘텐츠의 첫 50자를 제목으로 사용
                    const contentText = platformData.content;
                    if (contentText && contentText.length > 0) {
                      title = contentText.substring(0, 50) + (contentText.length > 50 ? '...' : '');
                    }
                  }
                  // 콘텐츠 추출
                  if (platformData.content) {
                    content = platformData.content;
                  }
                }
              }
            }
            
            // 이벤트 추가
            // ✅ 날짜만 표시 (시간 제거)
            const scheduledDate = new Date(item.scheduled_date);
            const dateOnly = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`;
            
            events.push({
              id: `${item.id}-${platform}-${index}`, // 고유 ID
              title: `${platformName}: ${title}`, // ✅ 이모지 제거, 플랫폼 이름만
              start: dateOnly, // ✅ 날짜만 (시간 제거)
              allDay: true, // ✅ 종일 이벤트로 설정
              backgroundColor: backgroundColor,
              extendedProps: {
                type: 'schedule',
                generation_id: item.id,
                platform: platform, // ✅ 플랫폼 정보 저장 (eventContent에서 사용)
                platforms: item.platforms,
                publish_status: status, // ✅ 플랫폼별 상태
                content: content,
                content_title: title,
                created_at: item.created_at,
                results: item.results,
                scheduled_date_full: item.scheduled_date // ✅ 원본 날짜 저장 (시간 포함)
              }
            });
          });
        } else {
          // platforms 배열이 없는 경우 (기존 방식)
          const platform = item.platform || 'unknown';
          const emoji = platformEmojis[platform] || '📄';
          const platformName = platformNames[platform] || platform || '콘텐츠';
          
          let title = platformName;
          let content = '내용 없음';
          
          if (item.results && typeof item.results === 'object') {
            const firstPlatform = Object.keys(item.results)[0];
            if (firstPlatform && item.results[firstPlatform]) {
              const firstData = item.results[firstPlatform];
              // ✅ 문자열로 직접 저장된 경우
              if (typeof firstData === 'string') {
                content = firstData;
                title = firstData.substring(0, 50) + (firstData.length > 50 ? '...' : '');
              }
              // ✅ 객체인 경우
              else if (typeof firstData === 'object') {
                if (firstData.title) {
                  title = firstData.title;
                } else if (firstData.content) {
                  title = firstData.content.substring(0, 50) + (firstData.content.length > 50 ? '...' : '');
                }
                if (firstData.content) {
                  content = firstData.content;
                }
              }
            }
          }
          
          // ✅ 날짜만 표시 (시간 제거)
          const scheduledDate = new Date(item.scheduled_date);
          const dateOnly = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`;
          
          events.push({
            id: item.id,
            title: `${platformName}: ${title}`, // ✅ 이모지 제거, 플랫폼 이름만
            start: dateOnly, // ✅ 날짜만 (시간 제거)
            allDay: true, // ✅ 종일 이벤트로 설정
            backgroundColor: backgroundColor,
            extendedProps: {
              type: 'schedule',
              generation_id: item.id,
              platform: platform, // ✅ 플랫폼 정보 저장 (eventContent에서 사용)
              platforms: [platform],
              publish_status: status,
              content: content,
              content_title: title,
              created_at: item.created_at,
              results: item.results,
              scheduled_date_full: item.scheduled_date // ✅ 원본 날짜 저장 (시간 포함)
            }
          });
        }
      });
    }

    // 메모 이벤트 추가
    if (memoData.success && memoData.memos) {
      memoData.memos.forEach(memo => {
        // memo.date는 UTC 형식이므로 KST로 변환 후 날짜 추출
        const utcDate = new Date(memo.date);
        const year = utcDate.getFullYear();
        const month = String(utcDate.getMonth() + 1).padStart(2, '0');
        const day = String(utcDate.getDate()).padStart(2, '0');
        const memoDate = `${year}-${month}-${day}`;
        
        events.push({
          id: `memo-${memo.id}`,
          title: `📝 ${memo.memo.substring(0, 20)}${memo.memo.length > 20 ? '...' : ''}`,
          start: memoDate, // 날짜만 표시 (시간 제거)
          backgroundColor: '#f59e0b',
          extendedProps: {
            type: 'memo',
            memo_id: memo.id,
            memo_text: memo.memo,
            memo_date: memoDate, // 날짜만 저장
            memo_time: memo.date // 전체 timestamp 보관
          }
        });
      });
    }

    const scheduledEventCount = events.filter(e => e.extendedProps?.type !== 'memo').length;
    const memoCount = events.filter(e => e.extendedProps?.type === 'memo').length;
    
    console.log(`✅ 캘린더 이벤트 로드: API ${scheduleData.scheduled_content?.length || 0}개 → 필터링 후 ${scheduledEventCount}개 (scheduled_date 있음), 메모 ${memoCount}개`);
    return events;
    
  } catch (error) {
    console.error('캘린더 이벤트 로드 오류:', error);
    return [];
  }
}

/**
 * 이벤트 상세 정보 표시
 */
function showEventDetails(event) {
  const props = event.extendedProps;
  const statusLabels = {
    draft: '초안',
    scheduled: '📅 예정',
    published: '✅ 발행완료',
    cancelled: '❌ 취소'
  };

  const platformNames = {
    blog: '네이버블로그',
    instagram: '인스타그램',
    instagramFeed: '인스타그램 피드',
    threads: '스레드',
    youtube: '유튜브',
    youtubeLongform: '유튜브 롱폼',
    linkedin: 'LinkedIn',
    facebook: '페이스북',
    twitter: '트위터(X)',
    kakaotalk: '카카오톡',
    naverband: '네이버 밴드',
    telegram: '텔레그램'
  };

  // ✅ Font Awesome 아이콘 매핑 (캘린더와 동일)
  const platformIcons = {
    blog: { class: 'fas fa-blog', color: 'text-blue-600' },
    instagram: { class: 'fab fa-instagram', color: 'text-pink-600' },
    instagramFeed: { class: 'fab fa-instagram', color: 'text-pink-600' },
    instagram_feed: { class: 'fab fa-instagram', color: 'text-pink-600' },
    instagram_reels: { class: 'fab fa-instagram', color: 'text-purple-600' },
    threads: { class: 'fas fa-at', color: 'text-gray-800' },
    youtube: { class: 'fab fa-youtube', color: 'text-red-600' },
    youtube_longform: { class: 'fab fa-youtube', color: 'text-red-600' },
    youtube_shorts: { class: 'fab fa-youtube', color: 'text-red-500' },
    youtubeLongform: { class: 'fab fa-youtube', color: 'text-red-600' },
    linkedin: { class: 'fab fa-linkedin', color: 'text-blue-700' },
    facebook: { class: 'fab fa-facebook', color: 'text-blue-600' },
    twitter: { text: '𝕏', color: 'text-gray-900' },
    kakaotalk: { class: 'fas fa-comment-dots', color: 'text-yellow-500' },
    brunch: { class: 'fas fa-book-open', color: 'text-orange-600' },
    naverband: { class: 'fas fa-users', color: 'text-green-600' },
    band: { class: 'fas fa-users', color: 'text-green-600' },
    telegram: { class: 'fab fa-telegram', color: 'text-blue-500' },
    tiktok: { class: 'fab fa-tiktok', color: 'text-black' },
    shortform_multi: { class: 'fas fa-film', color: 'text-purple-600' }
  };

  const status = statusLabels[props.publish_status] || '초안';
  const platform = platformNames[props.platform] || props.platform;
  const iconData = platformIcons[props.platform] || { class: 'fas fa-file', color: 'text-gray-600' };
  
  // 아이콘 HTML 생성 (text 또는 class 기반)
  const iconHtml = iconData.text 
    ? `<span class="text-5xl font-bold" style="color: ${iconData.color === 'text-gray-900' ? '#111' : iconData.color};">${iconData.text}</span>`
    : `<i class="${iconData.class} ${iconData.color}"></i>`;
  const title = props.content_title || event.title.replace(/^[^\s]+\s/, ''); // 이모지 제거
  const content = props.content ? props.content.substring(0, 300) : '내용 없음';
  
  // ✅ 원본 날짜 사용 (시간 포함)
  const scheduledDateFull = props.scheduled_date_full || event.start;
  const scheduledDate = new Date(scheduledDateFull).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  // ✅ 생성일 추가
  const createdDate = props.created_at ? new Date(props.created_at).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : '정보 없음';

  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center" id="eventDetailsModal">
      <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-lg mx-4 w-full max-h-[90vh] overflow-y-auto">
        <div class="text-center mb-6">
          <div class="text-5xl mb-4">
            ${iconHtml}
          </div>
          <h3 class="text-2xl font-bold text-gray-800 mb-2">${platform}</h3>
          <p class="text-gray-600">${status}</p>
        </div>
        
        <div class="space-y-4 mb-6">
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-calendar mr-2"></i>발행 예정일
            </p>
            <p class="text-gray-800">${scheduledDate}</p>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-clock mr-2"></i>생성일
            </p>
            <p class="text-gray-800">${createdDate}</p>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-heading mr-2"></i>제목
            </p>
            <p class="text-sm text-gray-800 font-medium">${title}</p>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-file-alt mr-2"></i>콘텐츠 미리보기
            </p>
            <p class="text-sm text-gray-600 whitespace-pre-wrap">${content}</p>
          </div>
        </div>
        
        <div class="flex gap-2 mb-4">
          <button onclick="changeEventStatus('${props.generation_id}', '${props.platform}', 'scheduled')" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
            <i class="fas fa-calendar-check mr-1"></i>예정
          </button>
          <button onclick="changeEventStatus('${props.generation_id}', '${props.platform}', 'published')" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
            <i class="fas fa-check mr-1"></i>발행
          </button>
          <button onclick="changeEventStatus('${props.generation_id}', '${props.platform}', 'cancelled')" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
            <i class="fas fa-times mr-1"></i>취소
          </button>
        </div>
        
        <div class="flex gap-2 mb-4">
          <button onclick="viewFullContent('${props.generation_id}', '${props.platform}')" class="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm">
            <i class="fas fa-eye mr-1"></i>보기
          </button>
          <button onclick="deleteScheduledEvent('${props.generation_id}', '${props.platform}')" class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm">
            <i class="fas fa-trash mr-1"></i>삭제
          </button>
        </div>
        
        <button onclick="closeEventDetailsModal()" class="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
          닫기
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * 이벤트 상세 모달 닫기
 */
function closeEventDetailsModal() {
  const modal = document.getElementById('eventDetailsModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 이벤트 상태 변경 (플랫폼별)
 * @param {string} generationId - 원본 generation ID
 * @param {string} platform - 플랫폼 이름 (예: 'blog', 'instagram')
 * @param {string} newStatus - 새 상태 ('draft', 'scheduled', 'published', 'cancelled')
 */
async function changeEventStatus(generationId, platform, newStatus) {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다.', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/schedule-content/${generationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        platform: platform, // ✅ 플랫폼 정보 전달
        publish_status: newStatus
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '상태 변경 실패');
    }

    showToast(`${platform} 발행 상태가 변경되었습니다.`, 'success');
    closeEventDetailsModal();
    
    // 캘린더 새로고침
    if (calendarInstance) {
      calendarInstance.refetchEvents();
    }
  } catch (error) {
    console.error('발행 상태 변경 오류:', error);
    showToast('발행 상태 변경에 실패했습니다.', 'error');
  }
}

/**
 * 예정일 이벤트 삭제 (특정 플랫폼만)
 */
async function deleteScheduledEvent(eventId, platform) {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다.', 'error');
    return;
  }

  if (!confirm(`이 플랫폼(${platform})의 예정일을 삭제하시겠습니까?`)) {
    return;
  }

  try {
    // ✅ 해당 플랫폼만 'draft' 상태로 변경 (scheduled_date는 유지)
    const response = await fetch(`/api/schedule-content/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        platform: platform, // ✅ 플랫폼 지정
        publish_status: 'draft' // ✅ draft로 변경하여 캘린더에서 숨김
        // ✅ scheduled_date는 보내지 않음 (다른 플랫폼 유지)
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '삭제 실패');
    }

    showToast('✅ 예정일이 삭제되었습니다', 'success');
    closeEventDetailsModal();
    
    // 캘린더 새로고침
    if (calendarInstance) {
      calendarInstance.refetchEvents();
    }
  } catch (error) {
    console.error('예정일 삭제 오류:', error);
    showToast('예정일 삭제에 실패했습니다', 'error');
  }
}

/**
 * 전체 콘텐츠 보기 (히스토리처럼)
 */
async function viewFullContent(generationId, platform) {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다.', 'error');
    return;
  }

  try {
    let item = null;
    
    // 1차 시도: 히스토리에서 찾기
    try {
      const historyResponse = await fetch(`/api/history?user_id=${user.id}`);
      const historyData = await historyResponse.json();
      
      if (historyData.success) {
        item = (historyData.history || []).find(h => h.id === generationId);
      }
    } catch (err) {
      console.warn('히스토리 조회 실패:', err);
    }
    
    // 2차 시도: scheduled-content에서 찾기
    if (!item) {
      try {
        const scheduleResponse = await fetch(`/api/scheduled-content?user_id=${user.id}`);
        const scheduleData = await scheduleResponse.json();
        
        if (scheduleData.success) {
          item = (scheduleData.scheduled_content || []).find(h => h.id === generationId);
        }
      } catch (err) {
        console.warn('scheduled-content 조회 실패:', err);
      }
    }
    
    // 콘텐츠를 찾지 못한 경우
    if (!item) {
      showToast('콘텐츠를 찾을 수 없습니다', 'error');
      return;
    }
    
    // ✅ generation_id 저장 (캘린더 등록 및 수정 기능에 필요)
    window.lastGenerationId = generationId;
    
    // 🔥 결과 영역을 정상 위치로 이동 및 표시
    const resultArea = document.getElementById('resultArea');
    if (resultArea) {
      // 🔥 핵심: resultArea가 이상한 곳에 있으면 원래 위치로 이동
      const currentParent = resultArea.parentElement;
      if (currentParent && currentParent.id === 'emailVerificationModal') {
        console.log('⚠️ resultArea가 emailVerificationModal 안에 있음! 빼내기 시작...');
        
        // 푸터 찾기
        const footer = document.querySelector('footer');
        if (footer) {
          // 푸터 바로 앞에 삽입
          footer.parentElement.insertBefore(resultArea, footer);
          console.log('✅ resultArea를 푸터 바로 위로 이동 완료');
        }
      }
      
      resultArea.classList.remove('hidden');
      resultArea.style.cssText = `
        display: block !important;
        width: 100% !important;
        max-width: 1200px !important;
        margin: 20px auto !important;
        padding: 32px !important;
        background: white !important;
        border-radius: 16px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1) !important;
      `;
      console.log('✅ 결과 영역 강제 표시');
    }
    
    // ✅ 방법 1: platform이 없으면 전체 표시, 있으면 해당 플랫폼만 표시
    if (platform && item.results[platform]) {
      // 특정 플랫폼만 표시
      resultData = { [platform]: item.results[platform] };
      displayResults(resultData, [platform], { 
        hideCalendarButton: true,
        createdAt: item.created_at,
        scheduledDate: item.scheduled_date
      });
    } else if (!platform) {
      // platform이 없으면 전체 표시
      resultData = item.results;
      const allPlatforms = Object.keys(item.results);
      displayResults(item.results, allPlatforms, { 
        hideCalendarButton: true,
        createdAt: item.created_at,
        scheduledDate: item.scheduled_date
      });
    } else {
      // platform은 있는데 해당 데이터가 없는 경우만 에러
      showToast('❌ 해당 플랫폼의 콘텐츠가 없습니다', 'error');
      return;
    }
    
    // 모달 닫기
    closeEventDetailsModal();
    
    // 결과 영역으로 스크롤
    setTimeout(() => {
      if (resultArea) {
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('📍 스크롤: resultArea로 이동');
      }
    }, 300);
    
    showToast('✅ 콘텐츠를 불러왔습니다', 'success');
    
  } catch (error) {
    console.error('콘텐츠 보기 오류:', error);
    showToast('콘텐츠를 불러오는데 실패했습니다', 'error');
  }
}

/**
 * 날짜/시간 선택 모달 열기
 */
function openDateTimeModal(generationId, platform) {
  console.log('📅 openDateTimeModal 호출:', { generationId, platform });
  
  const modal = document.getElementById('dateTimeModal');
  const platformLabel = document.getElementById('dateTimeModalPlatform');
  
  if (!modal) {
    console.error('❌ dateTimeModal 요소 없음');
    alert('모달을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
    return;
  }

  pendingScheduleData = { generationId, platform };
  console.log('💾 pendingScheduleData 저장:', pendingScheduleData);
  
  if (platformLabel) {
    const platformNames = {
      blog: '📝 네이버블로그',
      instagram: '📷 인스타그램',
      instagramFeed: '📷 인스타그램 피드',
      threads: '🧵 스레드',
      youtube: '🎥 유튜브',
      youtubeLongform: '🎬 유튜브 롱폼',
      linkedin: '💼 LinkedIn',
      facebook: '👍 페이스북',
      twitter: '🐦 트위터(X)',
      kakaotalk: '💬 카카오톡',
      naverband: '🎵 네이버 밴드',
      telegram: '✈️ 텔레그램'
    };
    platformLabel.textContent = platformNames[platform] || platform;
  }

  console.log('🎨 모달 표시 시작');
  modal.classList.remove('hidden');
  console.log('✅ 모달 표시 완료');

  // Flatpickr 초기화
  try {
    if (typeof flatpickr === 'undefined') {
      console.error('❌ Flatpickr 라이브러리 로드 안 됨');
      alert('날짜 선택기가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    if (!flatpickrInstance) {
      console.log('🗓️ Flatpickr 초기화 시작');
      flatpickrInstance = flatpickr('#dateTimePicker', {
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        time_24hr: false,
        locale: 'ko',
        minDate: 'today',
        defaultDate: new Date()
      });
      console.log('✅ Flatpickr 초기화 완료');
    }
  } catch (error) {
    console.error('❌ Flatpickr 초기화 실패:', error);
  }
}

/**
 * 날짜/시간 선택 모달 닫기
 */
function closeDateTimeModal() {
  const modal = document.getElementById('dateTimeModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  pendingScheduleData = null;
  
  if (flatpickrInstance) {
    flatpickrInstance.clear();
  }
}

/**
 * 날짜/시간 선택 확인
 */
async function confirmDateTimeSelection() {
  if (!pendingScheduleData) return;

  const dateInput = document.getElementById('dateTimePicker');
  const selectedDate = dateInput.value;

  if (!selectedDate) {
    showToast('날짜와 시간을 선택해주세요.', 'error');
    return;
  }

  const { generationId, platform } = pendingScheduleData;
  
  await saveSchedule(generationId, platform, selectedDate);
  closeDateTimeModal();
}

/**
 * 발행 예정일 저장
 */
async function saveSchedule(generationId, platform, scheduledDate) {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다.', 'error');
    return;
  }

  try {
    const response = await fetch('/api/schedule-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation_id: generationId,
        user_id: user.id,
        scheduled_date: scheduledDate,
        publish_status: 'scheduled',
        platform: platform // ✅ 플랫폼 정보 추가
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '발행 예정일 설정 실패');
    }

    showToast('발행 예정일이 설정되었습니다.', 'success');
    
    // 캘린더 새로고침
    if (calendarInstance) {
      calendarInstance.refetchEvents();
    }
    
    // 🔥 목록 보기도 새로고침 (현재 목록 보기 상태라면)
    if (!isCalendarView) {
      await loadScheduledContent('all');
    }
  } catch (error) {
    console.error('발행 예정일 저장 오류:', error);
    showToast('발행 예정일 설정에 실패했습니다.', 'error');
  }
}

/**
 * 빠른 등록 모달 열기
 */
/**
 * 캘린더/리스트 뷰 전환
 */
function toggleCalendarView() {
  const calendarView = document.getElementById('calendarView');
  const listView = document.getElementById('listView');
  const toggleBtn = document.querySelector('[onclick="toggleCalendarView()"]');

  if (!calendarView || !listView || !toggleBtn) return;

  isCalendarView = !isCalendarView;

  if (isCalendarView) {
    calendarView.classList.remove('hidden');
    listView.classList.add('hidden');
    toggleBtn.innerHTML = '<i class="fas fa-list mr-1"></i>목록 보기';
    
    // 🔥 캘린더 새로고침 (플래그 확인)
    if (calendarInstance) {
      if (window.needsCalendarRefresh) {
        console.log('🔄 플래그 감지! 캘린더 새로고침 실행...');
        calendarInstance.refetchEvents();
        window.needsCalendarRefresh = false;
        console.log('✅ 캘린더 새로고침 완료 (플래그 해제)');
      } else {
        calendarInstance.refetchEvents();
      }
    }
  } else {
    calendarView.classList.add('hidden');
    listView.classList.remove('hidden');
    toggleBtn.innerHTML = '<i class="fas fa-calendar mr-1"></i>달력 보기';
    
    // 리스트 로드
    loadScheduledContent('all');
  }
}

/**
 * 발행 예정 콘텐츠 목록 로드 (리스트 뷰)
 */
async function loadScheduledContent(status = 'all') {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다.', 'error');
    return;
  }

  try {
    const params = new URLSearchParams({ user_id: user.id });
    if (status !== 'all') {
      params.append('status', status);
    }

    const response = await fetch(`/api/scheduled-content?${params.toString()}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '발행 예정 콘텐츠 조회 실패');
    }

    // ✅ scheduled_date가 있는 콘텐츠만 필터링
    const scheduledOnly = (data.scheduled_content || []).filter(item => item.scheduled_date);
    console.log(`✅ 캘린더 목록 보기: 전체 ${data.scheduled_content?.length || 0}개 중 예정일 설정 ${scheduledOnly.length}개`);
    
    renderScheduledContentList(scheduledOnly);
  } catch (error) {
    console.error('발행 예정 콘텐츠 로드 오류:', error);
    showToast('발행 예정 콘텐츠를 불러올 수 없습니다.', 'error');
  }
}

/**
 * 발행 예정 콘텐츠 목록 렌더링 (리스트 뷰)
 */
function renderScheduledContentList(contentList) {
  const container = document.getElementById('scheduledContentList');
  if (!container) return;

  if (!contentList || contentList.length === 0) {
    container.innerHTML = `
      <div class="text-center text-gray-500 py-8">
        <i class="fas fa-calendar-check text-4xl mb-3 text-gray-300"></i>
        <p>발행 예정된 콘텐츠가 없습니다.</p>
        <p class="text-xs text-gray-400 mt-2">히스토리에서 콘텐츠의 발행 예정일을 설정할 수 있습니다.</p>
      </div>
    `;
    return;
  }

  const platformNames = {
    blog: '네이버블로그',
    instagram: '인스타그램',
    instagramFeed: '인스타그램 피드',
    instagram_feed: '인스타그램 피드',
    instagram_reels: '인스타그램 릴스',
    threads: '스레드',
    youtube: '유튜브',
    youtube_shorts: '유튜브 쇼츠',
    youtubeLongform: '유튜브 롱폼',
    linkedin: 'LinkedIn',
    facebook: '페이스북',
    twitter: '트위터(X)',
    kakaotalk: '카카오톡',
    naverband: '네이버 밴드',
    telegram: '텔레그램',
    tiktok: '틱톡',
    shortform_multi: '숏폼 통합'
  };

  // ✅ Font Awesome 아이콘 매핑
  const platformIcons = {
    blog: { class: 'fas fa-blog', color: 'text-blue-600' },
    instagram: { class: 'fab fa-instagram', color: 'text-pink-600' },
    instagramFeed: { class: 'fab fa-instagram', color: 'text-pink-600' },
    instagram_feed: { class: 'fab fa-instagram', color: 'text-pink-600' },
    instagram_reels: { class: 'fab fa-instagram', color: 'text-pink-600' },
    threads: { class: 'fas fa-at', color: 'text-gray-800' },
    youtube: { class: 'fab fa-youtube', color: 'text-red-600' },
    youtube_shorts: { class: 'fab fa-youtube', color: 'text-red-600' },
    youtube_longform: { class: 'fab fa-youtube', color: 'text-red-600' },
    youtubeLongform: { class: 'fab fa-youtube', color: 'text-red-600' },
    linkedin: { class: 'fab fa-linkedin', color: 'text-blue-800' },
    facebook: { class: 'fab fa-facebook', color: 'text-blue-700' },
    twitter: { text: '𝕏', color: 'text-gray-900' },
    kakaotalk: { class: 'fas fa-comment-dots', color: 'text-yellow-500' },
    naverband: { class: 'fas fa-users', color: 'text-green-700' },
    band: { class: 'fas fa-users', color: 'text-green-700' },
    telegram: { class: 'fab fa-telegram', color: 'text-blue-500' },
    tiktok: { class: 'fab fa-tiktok', color: 'text-black' },
    shortform_multi: { class: 'fas fa-film', color: 'text-purple-600' }
  };

  const statusBadges = {
    draft: '<span class="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">초안</span>',
    scheduled: '<span class="px-2 py-1 bg-blue-200 text-blue-700 rounded text-xs">📅 예정</span>',
    published: '<span class="px-2 py-1 bg-green-200 text-green-700 rounded text-xs">✅ 발행완료</span>',
    cancelled: '<span class="px-2 py-1 bg-red-200 text-red-700 rounded text-xs">❌ 취소</span>'
  };

  container.innerHTML = contentList.map(item => {
    const scheduledDate = item.scheduled_date 
      ? new Date(item.scheduled_date).toLocaleString('ko-KR', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      : '미설정';
    
    // ✅ 생성일 추가
    const createdDate = item.created_at 
      ? new Date(item.created_at).toLocaleString('ko-KR', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      : '정보 없음';
    
    const statusBadge = statusBadges[item.publish_status] || statusBadges.draft;

    // platforms 배열의 모든 플랫폼 표시 (draft 제외)
    const platformsList = (item.platforms || [item.platform])
      .filter(platform => {
        // ✅ draft 상태인 플랫폼 제외
        const platformStatus = (item.platform_status && item.platform_status[platform]) || item.publish_status || 'draft';
        return platformStatus !== 'draft';
      })
      .map(platform => {
      const platformName = platformNames[platform] || platform || '알 수 없음';
      const iconData = platformIcons[platform] || { class: 'fas fa-file', color: 'text-gray-600' };
      
      // 아이콘 HTML 생성 (text 또는 class 기반)
      const iconHtml = iconData.text 
        ? `<span style="font-weight: 600; margin-right: 4px;">${iconData.text}</span>`
        : `<i class="${iconData.class} ${iconData.color} mr-1"></i>`;
      
      // ✅ 플랫폼별 상태 사용
      const platformStatus = (item.platform_status && item.platform_status[platform]) || item.publish_status || 'draft';
      const platformStatusBadge = statusBadges[platformStatus] || statusBadges.draft;
      
      // results (jsonb)에서 해당 플랫폼의 제목과 콘텐츠 추출
      let title = platformName;
      let content = '내용 없음';
      
      if (item.results && typeof item.results === 'object') {
        const platformData = item.results[platform];
        if (platformData) {
          // ✅ 문자열로 직접 저장된 경우
          if (typeof platformData === 'string') {
            content = platformData;
            title = platformData.substring(0, 50) + (platformData.length > 50 ? '...' : '');
          }
          // 객체인 경우
          else if (typeof platformData === 'object') {
            if (platformData.title) {
              title = platformData.title;
            } else if (platformData.content) {
              const contentText = platformData.content;
              if (contentText && contentText.length > 0) {
                title = contentText.substring(0, 50) + (contentText.length > 50 ? '...' : '');
              }
            }
            if (platformData.content) {
              content = platformData.content;
            }
          }
        }
      }

      return `
        <div class="border-l-4 border-blue-400 pl-3 mb-2">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-lg font-bold text-gray-800">
              ${iconHtml}${platformName}
            </span>
            ${platformStatusBadge}
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span><i class="fas fa-clock mr-1"></i>생성: ${createdDate}</span>
          </div>
          <p class="text-sm font-medium text-gray-800 mb-1">${title}</p>
          <p class="text-sm text-gray-600 line-clamp-2">${content.substring(0, 100)}${content.length > 100 ? '...' : ''}</p>
          <div class="flex gap-1 mt-2">
            <button onclick="changePublishStatus('${item.id}', '${platform}', 'scheduled')" class="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition" title="예정으로 변경">
              <i class="fas fa-calendar-check"></i>
            </button>
            <button onclick="changePublishStatus('${item.id}', '${platform}', 'published')" class="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition" title="발행완료로 변경">
              <i class="fas fa-check"></i>
            </button>
            <button onclick="changePublishStatus('${item.id}', '${platform}', 'cancelled')" class="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition" title="취소">
              <i class="fas fa-times"></i>
            </button>
            <button onclick="viewFullContent('${item.id}', '${platform}')" class="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition" title="전체 보기">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // ✅ 모든 플랫폼이 draft면 카드 전체를 숨김
    if (!platformsList || platformsList.trim() === '') {
      return '';
    }

    return `
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition mb-3">
        <div class="flex justify-between items-start mb-3">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-semibold text-gray-700">
              <i class="fas fa-calendar-alt mr-1"></i>발행 예정: ${scheduledDate}
            </span>
          </div>
        </div>
        
        <div class="space-y-3">
          ${platformsList}
        </div>
      </div>
    `;
  }).filter(html => html !== '').join('');
}

/**
 * 발행 상태 변경 (리스트 뷰 - 플랫폼별)
 */
async function changePublishStatus(generationId, platform, newStatus) {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다.', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/schedule-content/${generationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        platform: platform, // ✅ 플랫폼 정보 전달
        publish_status: newStatus
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '상태 변경 실패');
    }

    showToast('발행 상태가 변경되었습니다.', 'success');
    loadScheduledContent('all'); // 목록 새로고침
  } catch (error) {
    console.error('발행 상태 변경 오류:', error);
    showToast('발행 상태 변경에 실패했습니다.', 'error');
  }
}

/**
 * 캘린더 섹션 표시 (로그인 시)
 */
function showScheduledContentArea() {
  const area = document.getElementById('scheduledContentArea');
  if (area) {
    area.classList.remove('hidden');
    
    // FullCalendar 초기화
    setTimeout(() => {
      initFullCalendar();
    }, 100);
  }
}

/**
 * 캘린더 섹션 숨김 (로그아웃 시)
 */
function hideScheduledContentArea() {
  const area = document.getElementById('scheduledContentArea');
  if (area) {
    area.classList.add('hidden');
  }
  
  // 캘린더 인스턴스 정리
  if (calendarInstance) {
    calendarInstance.destroy();
    calendarInstance = null;
  }
}

// 전역 노출
window.initFullCalendar = initFullCalendar;
window.loadCalendarEvents = loadCalendarEvents;
window.showEventDetails = showEventDetails;
window.closeEventDetailsModal = closeEventDetailsModal;
window.changeEventStatus = changeEventStatus;
window.deleteScheduledEvent = deleteScheduledEvent;
window.viewFullContent = viewFullContent;
window.openDateTimeModal = openDateTimeModal;
window.closeDateTimeModal = closeDateTimeModal;
window.confirmDateTimeSelection = confirmDateTimeSelection;
window.saveSchedule = saveSchedule;
// window.openQuickAddModal = openQuickAddModal; // ❌ 함수 미구현으로 주석 처리
// window.closeQuickAddModal = closeQuickAddModal; // ❌ 함수 미구현으로 주석 처리
// window.confirmQuickAdd = confirmQuickAdd; // ❌ 함수 미구현으로 주석 처리
window.toggleCalendarView = toggleCalendarView;
window.loadScheduledContent = loadScheduledContent;
window.renderScheduledContentList = renderScheduledContentList;
window.changePublishStatus = changePublishStatus;
window.showScheduledContentArea = showScheduledContentArea;
window.hideScheduledContentArea = hideScheduledContentArea;


/**
 * 생성 완료 화면에서 캘린더 등록 (개별 콘텐츠 generation_id 사용)
 */
function openDateTimeModalForGeneration(platform, contentIndex) {
  // ✅ 개별 콘텐츠의 generation_id 사용
  let realId;
  
  // contentIndex가 전달된 경우 해당 콘텐츠의 ID 사용
  if (contentIndex !== undefined && contentBlocks[contentIndex]) {
    realId = contentBlocks[contentIndex].generationId;
    console.log(`📅 [콘텐츠 #${contentIndex + 1}] 캘린더 등록:`, { realId, platform });
  } else {
    // contentIndex 없으면 마지막 생성 ID 사용 (하위 호환성)
    realId = window.lastGenerationId;
    console.log('📅 캘린더 등록 (legacy):', { realId, platform });
  }
  
  if (!realId) {
    showToast('콘텐츠를 먼저 생성해주세요.', 'error');
    console.error('❌ generation_id 없음');
    return;
  }
  
  openDateTimeModal(realId, platform);
}

// 전역 노출
window.openDateTimeModalForGeneration = openDateTimeModalForGeneration;


// ===================================
// Option B: 개별 콘텐츠 생성 함수
// ===================================

// 플랫폼 선택 업데이트
function updateContentPlatforms(contentIndex) {
  const checkboxes = document.querySelectorAll(`input[data-content="${contentIndex}"].content-platform-checkbox:checked`);
  const platforms = Array.from(checkboxes).map(cb => cb.value);
  
  // 플랫폼 저장
  if (!contentBlocks[contentIndex]) {
    contentBlocks[contentIndex] = { images: [], keywords: '', topic: '', description: '' };
  }
  contentBlocks[contentIndex].platforms = platforms;
  contentPlatforms[contentIndex] = platforms;
  
  // 크레딧 계산 (플랫폼당 1크레딧)
  const platformCount = platforms.length;
  const credit = platformCount;
  
  // 예상 소요 시간 계산 (플랫폼당 약 10초)
  const estimatedSeconds = platformCount > 0 ? Math.max(10, platformCount * 10) : 0;
  const estimatedTime = estimatedSeconds >= 60 
    ? `약 ${Math.ceil(estimatedSeconds / 60)}분`
    : `${estimatedSeconds}초`;
  
  // 크레딧 표시 업데이트
  const creditDisplay = document.getElementById(`contentCredit_${contentIndex}`);
  if (creditDisplay) {
    creditDisplay.innerHTML = `
      <span class="text-2xl font-bold text-purple-600">${credit} 크레딧</span>
      <span class="text-sm text-gray-500 ml-2">• ${estimatedTime}</span>
    `;
  }
  
  console.log(`💰 [콘텐츠 #${contentIndex + 1}] 플랫폼: ${platformCount}개, 크레딧: ${credit}, 예상 시간: ${estimatedTime}`);
}

// 개별 콘텐츠 생성
async function generateSingleContent(contentIndex) {
  console.log(`🚀 [콘텐츠 #${contentIndex + 1}] 생성 시작`);
  
  const content = contentBlocks[contentIndex];
  if (!content) {
    showToast(`❌ 콘텐츠 #${contentIndex + 1} 정보가 없습니다`, 'error');
    return;
  }
  
  // ✅ 중복 생성 방지
  if (content.generated && content.generationId) {
    const confirmRegenerate = confirm(
      `⚠️ 콘텐츠 #${contentIndex + 1}은(는) 이미 생성되었습니다.\n\n` +
      `재생성하시면 추가 크레딧이 차감됩니다.\n\n` +
      `계속하시겠습니까?`
    );
    
    if (!confirmRegenerate) {
      return;
    }
  }
  
  // 이미지 검증
  if (!content.images || content.images.length === 0) {
    showToast(`❌ 콘텐츠 #${contentIndex + 1}에 최소 1장의 이미지를 업로드해주세요`, 'error');
    return;
  }
  
  // 키워드 검증 (배열/null/undefined 안전 처리)
  const _kw = Array.isArray(content.keywords) ? content.keywords.join(', ') : (content.keywords || '');
  if (typeof _kw !== 'string' || _kw.trim() === '') {
    showToast(`❌ 콘텐츠 #${contentIndex + 1}의 키워드를 입력해주세요`, 'error');
    return;
  }
  content.keywords = _kw.trim();
  
  // 플랫폼 검증
  const platforms = contentPlatforms[contentIndex] || [];
  if (platforms.length === 0) {
    showToast(`❌ 콘텐츠 #${contentIndex + 1}의 플랫폼을 최소 1개 선택해주세요`, 'error');
    return;
  }
  
  // 크레딧 계산 (플랫폼당 1크레딧)
  const platformCount = platforms.length;
  const creditsNeeded = platformCount;
  
  console.log(`💰 [콘텐츠 #${contentIndex + 1}] 크레딧 계산: ${platformCount}개 플랫폼 = ${creditsNeeded} 크레딧`);
  
  // 크레딧 확인 (로그인 사용자만)
  if (!currentUser.isGuest && currentUser.id) {
    const freeCredits = window.userCreditsInfo?.free_credits ?? currentUser.free_credits ?? 0;
    const paidCredits = window.userCreditsInfo?.paid_credits ?? currentUser.paid_credits ?? 0;
    const totalCredits = freeCredits + paidCredits;
    
    if (totalCredits < creditsNeeded) {
      console.error(`❌ [콘텐츠 #${contentIndex + 1}] 크레딧 부족: 필요 ${creditsNeeded}, 보유 ${totalCredits}`);
      
      const goToPayment = confirm(
        `⛔ 크레딧이 부족합니다!\n\n` +
        `• 필요: ${creditsNeeded}크레딧\n` +
        `• 보유: ${totalCredits}크레딧 (무료 ${freeCredits} + 유료 ${paidCredits})\n\n` +
        `💳 충전 페이지로 이동하시겠습니까?`
      );
      
      if (goToPayment) {
        window.location.href = '/static/payment.html';
      }
      return;
    }
    
    console.log(`✅ [콘텐츠 #${contentIndex + 1}] 크레딧 검증 통과: 필요 ${creditsNeeded}, 보유 ${totalCredits}`);
  }
  
  // 브랜드 정보 가져오기 (좌측 패널 필드 ID 사용)
  const brand = document.getElementById('brandName')?.value.trim() || '';
  const serviceName = document.getElementById('serviceName')?.value.trim() || '';
  const companyName = document.getElementById('companyName')?.value.trim() || '';
  const businessType = document.getElementById('businessType')?.value.trim() || '';
  const region = document.getElementById('region')?.value.trim() || '';
  const targetGender = document.getElementById('targetGender')?.value || '';
  const contact = document.getElementById('contact')?.value.trim() || '';
  let website = document.getElementById('website')?.value.trim() || '';
  if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
    website = 'https://' + website;
  }
  const snsAccount = document.getElementById('snsAccount')?.value.trim() || '';
  const tone = document.getElementById('toneAndManner')?.value || '친근한';
  const targetAge = document.getElementById('targetAge')?.value || '20대';
  const industry = document.getElementById('industry')?.value || '라이프스타일';
  
  // 🔥 필수 입력 검증 추가
  if (!brand || brand.length === 0) {
    alert('⚠️ 브랜드명을 입력해주세요!\n\n좌측 패널의 "프로필 정보"에서 브랜드명을 입력해야 콘텐츠를 생성할 수 있습니다.');
    return;
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
    user_id: currentUser?.id || null,
    is_guest: currentUser?.isGuest || false,
    brand,
    companyName,
    businessType,
    region,
    targetGender,
    contact,
    website,
    snsAccount,
    keywords: enhancedKeywords,
    tone,
    targetAge,
    industry,
    images: content.images.map((img) => ({
      base64: img.base64,
      filename: img.name || `이미지${content.images.indexOf(img) + 1}`,
      size: img.size || 0
    })),
    platforms,
    aiModel: 'gpt-4o',
    customPrompt: getSelectedTemplateContent(),
  };
  
  // 로딩 표시
  showContentLoading(contentIndex);
  
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      hideContentLoading(contentIndex);
      const errorText = await response.text();
      console.error('서버 에러:', response.status, errorText.substring(0, 200));
      showToast(`서버 오류가 발생했습니다. (${response.status})`, 'error');
      return;
    }
    
    const result = await response.json();
    
    console.log(`🔍 [콘텐츠 #${contentIndex + 1}] 백엔드 응답:`, result);
    
    // 🔥 중요: 크레딧 동기화 (UI 실시간 반영)
    if (result.usage && (result.usage.free_credits !== undefined || result.usage.paid_credits !== undefined)) {
      const free_credits = result.usage.free_credits ?? result.usage.free_remaining ?? 0;
      const paid_credits = result.usage.paid_credits ?? result.usage.paid_remaining ?? 0;
      
      // window.userCreditsInfo 업데이트
      window.userCreditsInfo = {
        free_credits,
        paid_credits,
        total_credits: free_credits + paid_credits
      };
      
      // currentUser 동기화
      if (window.currentUser) {
        window.currentUser.free_credits = free_credits;
        window.currentUser.paid_credits = paid_credits;
      }
      

      // 키워드 분석 화면 크레딧 표시 업데이트 (정확한 ID 사용)
      const freeKeywordCreditsElement = document.getElementById('freeKeywordCredits');
      const paidKeywordCreditsElement = document.getElementById('paidKeywordCredits');
      
      if (freeKeywordCreditsElement) {
        freeKeywordCreditsElement.textContent = free_credits;
        console.log(`✅ 무료 크레딧 업데이트: ${free_credits}`);
      }
      
      if (paidKeywordCreditsElement) {
        paidKeywordCreditsElement.textContent = paid_credits;
        console.log(`✅ 유료 크레딧 업데이트: ${paid_credits}`);
      }
      
      // 통합: 모든 크레딧 표시 업데이트 (헤더 + 키워드 분석)
      const allCreditsElements = document.querySelectorAll('[id^="keywordCredits"], .keyword-credits-display, #userCreditsDisplay');
      allCreditsElements.forEach(element => {
        if (element.textContent.includes('무료') && element.textContent.includes('유료')) {
          const _fc = Number(free_credits).toLocaleString('ko-KR');
          const _pc = Number(paid_credits).toLocaleString('ko-KR');
          element.textContent = `무료 ${_fc} · 유료 ${_pc}`;
        }
      });
      
      // ❌ updateAuthUI() 호출 제거: 덮어쓰기 방지
      // updateAuthUI()가 구버전 currentUser로 헤더를 덮어씀
      // 대신 window.currentUser만 업데이트 (이미 Line 8456-8460에서 완료)
      
      console.log(`✅ [콘텐츠 #${contentIndex + 1}] 크레딧 동기화 완료:`, {
        free_credits,
        paid_credits,
        total_credits: free_credits + paid_credits,
        usage: result.usage
      });
      
      // 🔥 헤더 동기화를 위한 이벤트 발송
      window.dispatchEvent(new CustomEvent('userUpdated', {
        detail: {
          free_credits: free_credits,
          paid_credits: paid_credits,
          id: window.currentUser?.id,
          name: window.currentUser?.name,
          email: window.currentUser?.email,
          isLoggedIn: true,
          isGuest: false
        }
      }));
      console.log('📢 [콘텐츠생성] userUpdated 이벤트 발송 완료');
    } else {
      console.warn(`⚠️ [콘텐츠 #${contentIndex + 1}] 크레딧 정보 없음:`, result);
    }
    
    if (!result.success) {
      hideContentLoading(contentIndex);
      showToast(`❌ ${result.error || '콘텐츠 생성 실패'}`, 'error');
      return;
    }
    
    // 로딩 숨기기
    hideContentLoading(contentIndex);
    
    // ✅ generation_id 생성 (UUID 대신 타임스탬프 기반)
    const generationId = result.id || result.generation_id || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // ✅ 히스토리 저장 (캘린더 등록용)
    window.lastGenerationId = generationId;
    console.log(`📝 [콘텐츠 #${contentIndex + 1}] Generation ID 저장:`, generationId);
    
    // 콘텐츠 블록에 저장
    contentBlocks[contentIndex].generationId = generationId;
    contentBlocks[contentIndex].generated = true;
    contentBlocks[contentIndex].results = result.data;
    
    // ✅ 히스토리에 저장
    try {
      const historyEntry = {
        id: generationId,
        brand,
        keywords: enhancedKeywords,
        platforms,
        results: result.data,
        createdAt: new Date().toISOString()
      };
      
      contentHistory.unshift(historyEntry);
      if (contentHistory.length > 50) {
        contentHistory = contentHistory.slice(0, 50);
      }
      
      console.log(`✅ 히스토리 저장 완료:`, historyEntry.id);
    } catch (error) {
      console.error('❌ 히스토리 저장 실패:', error);
    }
    
    // ✅ DB에 히스토리 저장 (영구 보관)
    try {
      const historyResult = await saveToHistory(
        {
          brand: brand,
          keywords: enhancedKeywords,
          platforms: platforms
        },
        result.data
      );
      
      // ✅ DB에서 반환된 ID를 generationId로 사용 (캘린더 등록용)
      if (historyResult && historyResult.id) {
        contentBlocks[contentIndex].generationId = historyResult.id;
        window.lastGenerationId = historyResult.id;
        console.log(`✅ DB 히스토리 저장 완료 및 ID 업데이트:`, historyResult.id);
      } else {
        console.log(`✅ DB 히스토리 저장 완료 (기존 ID 유지):`, generationId);
      }
    } catch (error) {
      console.error('❌ DB 히스토리 저장 실패:', error);
    }
    
    // 결과 표시
    displaySingleContentResult(contentIndex, result, platforms);
    
    // ✅ 생성 완료 후 해당 콘텐츠 블록으로 스크롤
    const contentBlock = document.getElementById(`contentBlock_${contentIndex}`);
    if (contentBlock) {
      contentBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    showToast(`✅ 콘텐츠 #${contentIndex + 1} 생성 완료!`, 'success');
    // 이미지 도구 버튼 직접 활성화
    var _imgBtn1 = document.getElementById('freeImageSearchBtn');
    var _imgBtn2 = document.getElementById('aiImageGenBtn');
    var _imgHint = document.getElementById('imageToolsHint');
    if (_imgBtn1) _imgBtn1.disabled = false;
    if (_imgBtn2) _imgBtn2.disabled = false;
    if (_imgHint) _imgHint.style.display = 'none';
    
  } catch (error) {
    console.error(`❌ [콘텐츠 #${contentIndex + 1}] 생성 오류:`, error);
    hideContentLoading(contentIndex);
    showToast(`❌ ${error.message}`, 'error');
  }
}

// 개별 콘텐츠 로딩 표시
function showContentLoading(contentIndex) {
  const resultArea = document.getElementById(`contentResult_${contentIndex}`);
  if (!resultArea) return;
  
  resultArea.classList.remove('hidden');
  resultArea.innerHTML = `
    <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 text-center border-2 border-purple-200">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
      <p class="text-lg font-bold text-gray-800 mb-2">
        <i class="fas fa-magic mr-2 text-purple-600"></i>
        콘텐츠 #${contentIndex + 1} 생성 중...
      </p>
      <p class="text-sm text-gray-600">AI가 콘텐츠를 생성하고 있습니다. 잠시만 기다려주세요.</p>
      <p class="text-xs text-gray-500 mt-2">예상 소요 시간: 30-60초</p>
    </div>
  `;
  
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 개별 콘텐츠 로딩 숨기기
function hideContentLoading(contentIndex) {
  // 로딩만 숨기고 결과 영역은 유지
}

// 개별 콘텐츠 결과 표시
function displaySingleContentResult(contentIndex, result, platforms) {
  const resultArea = document.getElementById(`contentResult_${contentIndex}`);
  if (!resultArea) return;
  
  const platformNames = {
    blog: '네이버 블로그',
    instagram: '인스타그램',
    instagram_feed: '인스타그램 피드',
    instagram_reels: '인스타 릴스',
    threads: '스레드',
    youtube: '유튜브 숏폼',
    youtube_shorts: '유튜브 쇼츠',
    youtube_longform: '유튜브 롱폼',
    twitter: '트위터(X)',
    linkedin: 'LinkedIn',
    kakaotalk: '카카오톡',
    tiktok: '틱톡',
    brunch: '브런치',
    metadata_generation: '메타데이터 생성'
  };
  
  const platformIcons = {
    blog: '<i class="fas fa-blog text-blue-600 mr-2"></i>',
    instagram: '<i class="fab fa-instagram text-pink-600 mr-2"></i>',
    instagram_feed: '<i class="fab fa-instagram text-pink-600 mr-2"></i>',
    instagram_reels: '<i class="fab fa-instagram text-purple-600 mr-2"></i>',
    threads: '<i class="fas fa-at text-gray-800 mr-2"></i>',
    youtube: '<i class="fab fa-youtube text-red-600 mr-2"></i>',
    youtube_shorts: '<i class="fab fa-youtube text-red-500 mr-2"></i>',
    youtube_longform: '<i class="fab fa-youtube text-red-600 mr-2"></i>',
    twitter: '<span style="font-size: 1rem; font-weight: 600; color: #000; margin-right: 0.5rem;">𝕏</span>',
    linkedin: '<i class="fab fa-linkedin text-blue-700 mr-2"></i>',
    kakaotalk: '<i class="fas fa-comment-dots text-yellow-500 mr-2"></i>',
    tiktok: '<i class="fab fa-tiktok text-black mr-2"></i>',
    brunch: '<i class="fas fa-book-open text-orange-600 mr-2"></i>',
    metadata_generation: '<i class="fas fa-tags text-blue-600 mr-2"></i>'
  };
  
  let html = `
    <div class="bg-white rounded-xl p-6 shadow-lg border-2 border-green-200">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-gray-800">
          <i class="fas fa-check-circle text-green-600 mr-2"></i>
          콘텐츠 #${contentIndex + 1} 생성 완료
          <span style="color: #667eea; font-size: 14px; font-weight: normal; margin-left: 8px;">
            💡 이어서 다음 작업을 진행해보세요 (예: 이미지 도구, SNS 바로가기, AI 워크플로우로 다른 AI 작업 이어서 하기 등)
          </span>
        </h3>
        <button
          type="button"
          onclick="document.getElementById('contentResult_${contentIndex}').classList.add('hidden')"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
        >
          <i class="fas fa-times mr-1"></i>닫기
        </button>
      </div>
      
      <!-- 탭 버튼 -->
      <div class="flex flex-wrap gap-2 mb-4 border-b-2 border-gray-200 pb-3" id="tabButtons_${contentIndex}">
  `;
  
  platforms.forEach((platform, index) => {
    const isActive = index === 0;
    html += `
      <button
        type="button"
        onclick="switchContentTab(${contentIndex}, '${platform}')"
        id="tabBtn_${contentIndex}_${platform}"
        class="px-4 py-2 rounded-t-lg font-semibold transition ${
          isActive
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }"
      >
        ${platformIcons[platform] || ''}${platformNames[platform] || platform}
      </button>
    `;
  });
  
  html += `
      </div>
      
      <!-- 탭 콘텐츠 -->
      <div id="tabContents_${contentIndex}">
  `;
  
  platforms.forEach((platform, index) => {
    const content = result.data[platform];
    if (!content) return;
    
    const isActive = index === 0;
    html += `
      <div id="tab_${contentIndex}_${platform}" class="${isActive ? '' : 'hidden'}">
        <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm" id="content_${contentIndex}_${platform}">
          ${formatContent(content)}
        </div>
        
        <!-- 액션 버튼 -->
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            onclick="editContentText(${contentIndex}, '${platform}')"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <i class="fas fa-edit mr-1"></i>수정
          </button>
          <button
            type="button"
            onclick="downloadAsTextFromSingle(${contentIndex}, '${platform}', '콘텐츠${contentIndex + 1}_${platformNames[platform]}.txt')"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            <i class="fas fa-file-download mr-1"></i>TXT
          </button>
          <button
            type="button"
            onclick="copyToClipboardFromSingle(${contentIndex}, '${platform}', '${platformNames[platform]}')"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
          >
            <i class="fas fa-copy mr-1"></i>복사
          </button>
          <button
            type="button"
            onclick="openDateTimeModalForGeneration('${platform}', ${contentIndex})"
            class="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm"
          >
            <i class="fas fa-calendar-alt mr-1"></i>캘린더 등록
          </button>
        </div>

        <!-- 수정 영역 (숨김) -->
        <div id="editor_${contentIndex}_${platform}" class="hidden mt-4">
          <textarea
            id="content_editor_${contentIndex}_${platform}"
            class="w-full p-4 border-2 border-purple-300 rounded-lg resize-none"
            rows="10"
          >${content}</textarea>
          <div class="flex gap-2 mt-2">
            <button
              type="button"
              onclick="cancelContentEdit(${contentIndex}, '${platform}')"
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
            >
              <i class="fas fa-times mr-1"></i>취소
            </button>
            <button
              type="button"
              onclick="saveContentEdit(${contentIndex}, '${platform}')"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              <i class="fas fa-save mr-1"></i>저장
            </button>
          </div>
        </div>

        <!-- 프리뷰 프레임 (좌측 패널로 이동됨) -->
        <div id="single-preview-frame-${contentIndex}-${platform}" class="hidden" style="margin-top:16px;"></div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  resultArea.innerHTML = html;
  resultArea.classList.remove('hidden');

  // 좌측 패널 미리보기 표시 (displaySingleContentResult)
  const leftPreview = document.getElementById('leftPanelPreview');
  if (leftPreview && _previewFrameEnabled && platforms.length > 0) {
    leftPreview.classList.remove('hidden');
    const firstPlatform = platforms[0];
    const prevData = resultData[firstPlatform];
    resultData[firstPlatform] = result.data[firstPlatform] || '';
    renderPreviewToLeftPanel(firstPlatform);
    if (prevData !== undefined) resultData[firstPlatform] = prevData;
  }

  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 탭 전환
function switchContentTab(contentIndex, platform) {
  // 모든 탭 비활성화
  const allTabs = document.querySelectorAll(`[id^="tab_${contentIndex}_"]`);
  allTabs.forEach(tab => tab.classList.add('hidden'));
  
  const allButtons = document.querySelectorAll(`[id^="tabBtn_${contentIndex}_"]`);
  allButtons.forEach(btn => {
    btn.className = 'px-4 py-2 rounded-t-lg font-semibold transition bg-gray-100 text-gray-600 hover:bg-gray-200';
  });
  
  // 선택된 탭 활성화
  const selectedTab = document.getElementById(`tab_${contentIndex}_${platform}`);
  if (selectedTab) {
    selectedTab.classList.remove('hidden');
  }
  
  const selectedButton = document.getElementById(`tabBtn_${contentIndex}_${platform}`);
  if (selectedButton) {
    selectedButton.className = 'px-4 py-2 rounded-t-lg font-semibold transition bg-gradient-to-r from-purple-600 to-blue-600 text-white';
  }
}

// 콘텐츠 수정
function editContentText(contentIndex, platform) {
  const contentDiv = document.getElementById(`content_${contentIndex}_${platform}`);
  const editorDiv = document.getElementById(`editor_${contentIndex}_${platform}`);
  
  if (contentDiv && editorDiv) {
    contentDiv.classList.add('hidden');
    editorDiv.classList.remove('hidden');
  }
}

// 콘텐츠 수정 취소
function cancelContentEdit(contentIndex, platform) {
  const contentDiv = document.getElementById(`content_${contentIndex}_${platform}`);
  const editorDiv = document.getElementById(`editor_${contentIndex}_${platform}`);
  
  if (contentDiv && editorDiv) {
    contentDiv.classList.remove('hidden');
    editorDiv.classList.add('hidden');
  }
}

// 콘텐츠 수정 저장
function saveContentEdit(contentIndex, platform) {
  const editor = document.getElementById(`content_editor_${contentIndex}_${platform}`);
  const contentDiv = document.getElementById(`content_${contentIndex}_${platform}`);

  if (editor && contentDiv) {
    const newContent = editor.value;
    contentDiv.innerHTML = formatContent(newContent);
    contentDiv.classList.remove('hidden');

    const editorDiv = document.getElementById(`editor_${contentIndex}_${platform}`);
    if (editorDiv) {
      editorDiv.classList.add('hidden');
    }

    // ✅ 프리뷰 프레임 갱신 (모든 플랫폼)
    if (_previewFrameEnabled) {
      const renderer = getFrameRenderer(platform);
      if (renderer) {
        const frameEl = document.getElementById(`single-preview-frame-${contentIndex}-${platform}`);
        if (frameEl) {
          // resultData 임시 업데이트 후 렌더
          const prevData = resultData[platform];
          resultData[platform] = newContent;
          frameEl.id = `preview-frame-${platform}`;
          renderer(platform);
          frameEl.id = `single-preview-frame-${contentIndex}-${platform}`;
          if (prevData !== undefined) resultData[platform] = prevData;
        }
      }
    }

    showToast('✅ 수정 내용이 저장되었습니다', 'success');
  }
}

// 전역 노출
window.updateContentPlatforms = updateContentPlatforms;
window.generateSingleContent = generateSingleContent;
window.switchContentTab = switchContentTab;
window.editContentText = editContentText;
window.cancelContentEdit = cancelContentEdit;
window.saveContentEdit = saveContentEdit;
window.toggleSinglePreviewFrame = toggleSinglePreviewFrame;


// ========================================
// 프로필 관리 시스템 (다중 프로필 지원)
// ========================================

/**
 * 프로필 목록 모달 열기
 */
async function openProfileListModal() {
  const modal = document.getElementById('profileListModal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  
  // 프로필 목록 로드
  await loadProfilesList();
}

/**
 * 프로필 목록 모달 닫기
 */
function closeProfileListModal() {
  const modal = document.getElementById('profileListModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * 프로필 저장 모달 열기
 */
function openProfileSaveModal(profileId = null) {
  const modal = document.getElementById('profileSaveModal');
  const titleEl = document.getElementById('profileModalTitle');
  const nameInput = document.getElementById('profileNameInput');
  
  if (!modal) return;
  
  currentEditingProfileId = profileId;
  
  if (profileId) {
    // 수정 모드
    titleEl.textContent = '프로필 수정';
    // 기존 프로필 이름 불러오기 (TODO)
  } else {
    // 새로 저장 모드
    titleEl.textContent = '새 프로필 저장';
    nameInput.value = '';
  }
  
  modal.classList.remove('hidden');
  nameInput.focus();
}

/**
 * 프로필 저장 모달 닫기
 */
function closeProfileSaveModal() {
  const modal = document.getElementById('profileSaveModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  currentEditingProfileId = null;
}

/**
 * 프로필 저장 확인
 */
async function confirmSaveProfile() {
  const profileName = document.getElementById('profileNameInput').value.trim();
  
  if (!profileName) {
    showToast('프로필 이름을 입력해주세요', 'error');
    return;
  }
  
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다', 'error');
    return;
  }
  
  // 폼 데이터 수집 (모든 필드 포함, HTML ID와 DB 컬럼 매핑)
  const profileData = {
    user_id: user.id,
    profile_name: profileName,
    brand: document.getElementById('brandName')?.value.trim() || '',  // ✅ brandName
    company_name: document.getElementById('companyName')?.value.trim() || '',
    business_type: document.getElementById('businessType')?.value.trim() || '',
    location: document.getElementById('region')?.value.trim() || '',  // ✅ region
    target_gender: document.getElementById('targetGender')?.value || '',
    contact: document.getElementById('contact')?.value.trim() || '',
    website: document.getElementById('website')?.value.trim() || '',
    sns: document.getElementById('snsAccount')?.value.trim() || '',  // ✅ snsAccount
    keywords: document.getElementById('keywordAnalysisInput')?.value.trim() || '',  // ✅ keywordAnalysisInput
    tone: document.getElementById('toneAndManner')?.value || '',  // ✅ toneAndManner (기본값 제거)
    target_age: document.getElementById('targetAge')?.value || '',  // ✅ 기본값 제거
    industry: document.getElementById('industry')?.value || ''  // ✅ 기본값 제거
  };
  
  try {
    let response;
    
    if (currentEditingProfileId) {
      // 수정
      response = await fetch(`/api/profiles/${currentEditingProfileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
    } else {
      // 새로 생성
      response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '프로필 저장 실패');
    }
    
    // 빠른 설정 연결 저장
    if (typeof window.saveProfileWorkflows === 'function') {
      await window.saveProfileWorkflows(profileName);
    }
    
    showToast('✅ 프로필이 저장되었습니다', 'success');
    closeProfileSaveModal();
    
    // 프로필 목록 새로고침
    if (document.getElementById('profileListModal').classList.contains('hidden') === false) {
      await loadProfilesList();
    }
  } catch (error) {
    console.error('프로필 저장 오류:', error);
    showToast(`프로필 저장 실패: ${error.message}`, 'error');
  }
}

/**
 * 프로필 목록 로드
 */
async function loadProfilesList() {
  const container = document.getElementById('profileListContainer');
  if (!container) return;
  
  const user = window.currentUser;
  if (!user || !user.id) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-user-slash text-4xl mb-3"></i>
        <p>로그인이 필요합니다</p>
      </div>
    `;
    return;
  }
  
  try {
    const response = await fetch(`/api/profiles?user_id=${user.id}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '프로필 목록 조회 실패');
    }
    
    const profiles = data.profiles || [];
    
    if (profiles.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-inbox text-4xl mb-3"></i>
          <p>저장된 프로필이 없습니다</p>
          <p class="text-sm mt-2">위의 "새 프로필 추가" 버튼을 눌러 프로필을 저장하세요</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = profiles.map(profile => `
      <div class="border rounded-lg p-4 hover:shadow-md transition">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1">
            <h4 class="font-bold text-lg text-gray-800">${profile.profile_name || '이름 없음'}</h4>
            <p class="text-sm text-gray-600">${profile.brand || '브랜드 정보 없음'}</p>
          </div>
          <div class="flex gap-2">
            <button 
              onclick="applyProfile('${profile.id}')" 
              class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
              title="이 프로필 사용"
            >
              <i class="fas fa-check"></i>
            </button>
            <button 
              onclick="deleteProfile('${profile.id}')" 
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
              title="삭제"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="text-xs text-gray-500 space-y-1">
          <p><i class="fas fa-building mr-1"></i>${profile.company_name || '회사명 없음'}</p>
          <p><i class="fas fa-industry mr-1"></i>${profile.industry || '산업분야 미설정'}</p>
          <p><i class="fas fa-users mr-1"></i>${profile.target_age || '연령대 미설정'} • ${profile.tone || '톤 미설정'}</p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('프로필 목록 로드 오류:', error);
    container.innerHTML = `
      <div class="text-center py-8 text-red-500">
        <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
        <p>프로필 목록을 불러오는 중 오류가 발생했습니다</p>
      </div>
    `;
  }
}

/**
 * 프로필 적용 (폼에 자동 채우기)
 */
async function applyProfile(profileId) {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/profiles?user_id=${user.id}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '프로필 조회 실패');
    }
    
    const profile = data.profiles.find(p => p.id === profileId);
    if (!profile) {
      throw new Error('프로필을 찾을 수 없습니다');
    }
    
    // 폼에 값 채우기 (모든 필드 포함, HTML ID와 DB 컬럼 매핑)
    const setFieldValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = value || '';
        // ✅ 값 변경 이벤트 트리거 (자동완성, validation 등 작동하도록)
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ ${id} = ${value}`);
      } else {
        console.warn(`⚠️ Element not found: ${id}`);
      }
    };
    
    setFieldValue('brandName', profile.brand);  // ✅ brand → brandName
    setFieldValue('companyName', profile.company_name);
    setFieldValue('businessType', profile.business_type);
    setFieldValue('region', profile.location);  // ✅ location → region
    setFieldValue('targetGender', profile.target_gender);
    setFieldValue('contact', profile.contact);
    setFieldValue('website', profile.website);
    setFieldValue('snsAccount', profile.sns);  // ✅ sns → snsAccount
    setFieldValue('keywordAnalysisInput', profile.keywords);  // ✅ keywords → keywordAnalysisInput
    setFieldValue('toneAndManner', profile.tone || '');  // ✅ tone → toneAndManner
    setFieldValue('targetAge', profile.target_age || '');
    setFieldValue('industry', profile.industry || '');
    
    showToast('✅ 프로필이 적용되었습니다', 'success');
    closeProfileListModal();
    
    // 빠른 설정도 함께 불러오기
    if (typeof window.loadProfileWorkflows === 'function') {
      await window.loadProfileWorkflows(profile.profile_name);
    }
    
    // 스크롤을 프로필 입력 필드 영역으로 이동 (leftPanel의 상단)
    setTimeout(() => {
      const leftPanel = document.querySelector('.left-panel');
      if (leftPanel) {
        leftPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('📍 스크롤: 프로필 입력 필드로 이동');
      }
    }, 100);
  } catch (error) {
    console.error('프로필 적용 오류:', error);
    showToast(`프로필 적용 실패: ${error.message}`, 'error');
  }
}

/**
 * 프로필 삭제
 */
async function deleteProfile(profileId) {
  if (!confirm('이 프로필을 삭제하시겠습니까?')) {
    return;
  }
  
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/profiles/${profileId}?user_id=${user.id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '프로필 삭제 실패');
    }
    
    showToast('✅ 프로필이 삭제되었습니다', 'success');
    await loadProfilesList();
  } catch (error) {
    console.error('프로필 삭제 오류:', error);
    showToast(`프로필 삭제 실패: ${error.message}`, 'error');
  }
}

// 기존 버튼 이벤트 리스너 수정

// 전역 노출
window.openProfileListModal = openProfileListModal;
window.closeProfileListModal = closeProfileListModal;
window.openProfileSaveModal = openProfileSaveModal;
window.closeProfileSaveModal = closeProfileSaveModal;
window.confirmSaveProfile = confirmSaveProfile;
window.loadProfilesList = loadProfilesList;
window.applyProfile = applyProfile;
window.deleteProfile = deleteProfile;

// ============================================================
// 📝 캘린더 메모 기능
// ============================================================

/**
 * 메모 모달 열기 (여러 메모 지원)
 */
async function openMemoModal(dateStr, memoId = null) {
  console.log('📝 openMemoModal 호출:', dateStr, memoId);
  
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다', 'error');
    return;
  }

  // 기존 메모 목록 조회
  let existingMemos = [];
  
  // 표시할 날짜 (YYYY-MM-DD 형식)
  let displayDate = dateStr;
  if (dateStr.includes('T')) {
    displayDate = dateStr.split('T')[0]; // YYYY-MM-DD만 추출
  }
  
  try {
    const response = await fetch(`/api/calendar-memos?user_id=${user.id}&date=${displayDate}`);
    const data = await response.json();
    
    if (data.success && data.memos) {
      existingMemos = data.memos;
    }
  } catch (error) {
    console.error('메모 조회 오류:', error);
  }

  // 기존 메모 목록 HTML
  const memosListHtml = existingMemos.length > 0 ? `
    <div class="mb-4">
      <h4 class="text-sm font-semibold text-gray-700 mb-2">
        <i class="fas fa-list mr-2"></i>이 날짜의 메모 (${existingMemos.length}개)
      </h4>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        ${existingMemos.map(memo => {
          const memoTime = new Date(memo.date).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          return `
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200" id="memo-${memo.id}">
              <div class="flex justify-between items-start mb-1">
                <span class="text-xs text-gray-500">
                  <i class="fas fa-clock mr-1"></i>${memoTime}
                </span>
                <div class="flex gap-2">
                  <button 
                    onclick="editMemo('${memo.id}', \`${memo.memo.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)" 
                    class="text-blue-600 hover:text-blue-800 text-sm"
                    title="수정"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button 
                    onclick="deleteMemo('${memo.id}')" 
                    class="text-red-600 hover:text-red-800 text-sm"
                    title="삭제"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <p class="text-sm text-gray-800 memo-text-${memo.id}">${memo.memo}</p>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const html = `
    <div id="memoModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" style="z-index: 60;">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">
            📝 메모 관리
          </h3>
          <button onclick="closeMemoModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        ${memosListHtml}
        
        <div class="mb-4 ${existingMemos.length > 0 ? 'border-t pt-4' : ''}">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">
            <i class="fas fa-plus-circle mr-2"></i>새 메모 추가
          </h4>
          <p class="text-sm text-gray-600 mb-2">
            <i class="fas fa-calendar mr-2"></i>${displayDate}
          </p>
          <textarea 
            id="memoTextarea" 
            class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            rows="5" 
            placeholder="메모를 입력하세요..."
          ></textarea>
        </div>
        
        <div class="flex gap-2">
          <button 
            onclick="saveMemo('${displayDate}')" 
            class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            저장
          </button>
          <button 
            onclick="closeMemoModal()" 
            class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  
  // 포커스 설정
  setTimeout(() => {
    const textarea = document.getElementById('memoTextarea');
    if (textarea) {
      textarea.focus();
    }
  }, 100);
}

/**
 * 메모 모달 닫기
 */
function closeMemoModal() {
  const modal = document.getElementById('memoModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 메모 저장 (시간 정보 포함)
 */
async function saveMemo(dateStr) {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다', 'error');
    return;
  }

  const textarea = document.getElementById('memoTextarea');
  const memo = textarea?.value.trim();

  if (!memo) {
    showToast('메모 내용을 입력하세요', 'error');
    return;
  }

  try {
    // 날짜 부분 추출 (YYYY-MM-DD)
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
    
    // 현재 시간 정보 가져오기
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    // ISO 8601 형식으로 직접 조합 (시간대 +09:00 명시)
    const dateToSave = `${datePart}T${hours}:${minutes}:${seconds}+09:00`;
    
    console.log('📝 메모 저장 날짜:', dateToSave);
    
    const response = await fetch('/api/calendar-memo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        date: dateToSave,
        memo
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '메모 저장 실패');
    }

    showToast('✅ 메모가 저장되었습니다', 'success');
    closeMemoModal();
    
    // 캘린더 새로고침
    if (calendarInstance) {
      calendarInstance.refetchEvents();
    }
  } catch (error) {
    console.error('메모 저장 오류:', error);
    showToast('메모 저장에 실패했습니다', 'error');
  }
}

/**
 * 메모 삭제
 */
async function deleteMemo(memoId) {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다', 'error');
    return;
  }

  if (!confirm('메모를 삭제하시겠습니까?')) {
    return;
  }

  try {
    const response = await fetch(`/api/calendar-memo/${memoId}?user_id=${user.id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '메모 삭제 실패');
    }

    showToast('✅ 메모가 삭제되었습니다', 'success');
    closeMemoModal();
    
    // 캘린더 새로고침
    if (calendarInstance) {
      calendarInstance.refetchEvents();
    }
  } catch (error) {
    console.error('메모 삭제 오류:', error);
    showToast('메모 삭제에 실패했습니다', 'error');
  }
}

/**
 * 메모 수정 모드로 전환
 */
function editMemo(memoId, currentText) {
  const memoElement = document.getElementById(`memo-${memoId}`);
  if (!memoElement) return;

  // 기존 텍스트 영역을 textarea로 변경
  const textElement = memoElement.querySelector(`.memo-text-${memoId}`);
  if (!textElement) return;

  // 편집 모드 HTML
  textElement.innerHTML = `
    <textarea 
      id="edit-textarea-${memoId}" 
      class="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      rows="3"
    >${currentText}</textarea>
    <div class="flex gap-2 mt-2">
      <button 
        onclick="updateMemo('${memoId}')"
        class="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
      >
        <i class="fas fa-check mr-1"></i>저장
      </button>
      <button 
        onclick="cancelEditMemo('${memoId}', \`${currentText.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)"
        class="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400"
      >
        <i class="fas fa-times mr-1"></i>취소
      </button>
    </div>
  `;

  // textarea에 포커스
  const textarea = document.getElementById(`edit-textarea-${memoId}`);
  if (textarea) {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
}

/**
 * 메모 수정 취소
 */
function cancelEditMemo(memoId, originalText) {
  const memoElement = document.getElementById(`memo-${memoId}`);
  if (!memoElement) return;

  const textElement = memoElement.querySelector(`.memo-text-${memoId}`);
  if (!textElement) return;

  // 원래 텍스트로 복원
  textElement.innerHTML = originalText;
}

/**
 * 메모 업데이트
 */
async function updateMemo(memoId) {
  const user = window.currentUser;
  if (!user || !user.id) {
    showToast('로그인이 필요합니다', 'error');
    return;
  }

  const textarea = document.getElementById(`edit-textarea-${memoId}`);
  if (!textarea) return;

  const newText = textarea.value.trim();
  if (!newText) {
    showToast('메모 내용을 입력해주세요', 'error');
    return;
  }

  try {
    const response = await fetch(`/api/calendar-memo/${memoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: user.id,
        memo: newText
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '메모 수정 실패');
    }

    showToast('✅ 메모가 수정되었습니다', 'success');
    closeMemoModal();
    
    // 캘린더 새로고침
    if (calendarInstance) {
      calendarInstance.refetchEvents();
    }
  } catch (error) {
    console.error('메모 수정 오류:', error);
    showToast('메모 수정에 실패했습니다', 'error');
  }
}

// 전역 노출
window.openMemoModal = openMemoModal;
window.closeMemoModal = closeMemoModal;
window.saveMemo = saveMemo;
window.deleteMemo = deleteMemo;
window.editMemo = editMemo;
window.cancelEditMemo = cancelEditMemo;
window.updateMemo = updateMemo;

// ========================================
// 인증 모달 함수 (NEW v7.3 - Updated with Login Mode)
// ========================================

// 회원가입 모달 열기 (회원가입 모드)
function openAuthModal(mode = 'signup') {
  authMode = mode;
  updateAuthModalUI();
  
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

// 회원가입 모달 닫기
function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  
  // 입력 필드 초기화
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  if (emailInput) emailInput.value = '';
  if (passwordInput) passwordInput.value = '';
}

// 인증 모달 UI 업데이트 (회원가입 vs 로그인)
function updateAuthModalUI() {
  const titleIcon = document.querySelector('#authModalTitle i');
  const titleText = document.getElementById('authModalTitleText');
  const subtitle = document.getElementById('authModalSubtitle');
  const passwordHint = document.getElementById('passwordHint');
  const authBtn = document.getElementById('emailAuthBtn');
  const authBtnText = document.getElementById('emailAuthBtnText');
  const signupNotice = document.getElementById('signupNotice');
  const modeToggle = document.getElementById('authModeToggle');
  const modeToggleText = document.getElementById('authModeToggleText');
  
  if (authMode === 'signup') {
    // 회원가입 모드
    if (titleIcon) titleIcon.className = 'fas fa-user-plus mr-2 text-purple-600';
    if (titleText) titleText.textContent = '회원가입';
    if (subtitle) subtitle.textContent = '30개 무료 크레딧으로 시작하세요!';
    if (passwordHint) passwordHint.textContent = '(8자 이상)';
    if (authBtnText) authBtnText.textContent = '이메일로 가입하기';
    if (signupNotice) signupNotice.classList.remove('hidden');
    if (modeToggleText) modeToggleText.textContent = '로그인';
    if (modeToggle) modeToggle.innerHTML = '계정이 있으신가요? <span id="authModeToggleText">로그인</span>';
  } else {
    // 로그인 모드
    if (titleIcon) titleIcon.className = 'fas fa-sign-in-alt mr-2 text-purple-600';
    if (titleText) titleText.textContent = '로그인';
    if (subtitle) subtitle.textContent = '다시 만나서 반갑습니다!';
    if (passwordHint) passwordHint.textContent = '';
    if (authBtnText) authBtnText.textContent = '이메일로 로그인';
    if (signupNotice) signupNotice.classList.add('hidden');
    if (modeToggle) modeToggle.innerHTML = '계정이 없으신가요? <span id="authModeToggleText">회원가입</span>';
  }
}

// 인증 모드 전환
function toggleAuthMode() {
  authMode = authMode === 'signup' ? 'login' : 'signup';
  updateAuthModalUI();
  console.log('🔄 인증 모드 전환:', authMode);
}

// 이메일 인증 모달 열기
function openEmailVerificationModal(email) {
  const modal = document.getElementById('emailVerificationModal');
  const emailSpan = document.getElementById('verificationEmail');
  
  if (modal && emailSpan) {
    emailSpan.textContent = email;
    modal.classList.remove('hidden');
  }
}

// 이메일 인증 모달 닫기
function closeEmailVerificationModal() {
  const modal = document.getElementById('emailVerificationModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 이메일 인증 완료 후 로그인 (NEW v7.3)
function handleLoginAfterVerification() {
  console.log('📧 이메일 인증 완료 → 로그인 모드로 전환');
  
  // 1. 이메일 인증 모달 닫기
  closeEmailVerificationModal();
  
  // 2. 로그인 모드로 인증 모달 열기
  openAuthModal('login');
  
  // 3. 안내 토스트 표시
  showToast('이메일 인증이 완료되었습니다! 로그인해주세요', 'success');
  
  // 4. 이메일 필드에 인증된 이메일 자동 입력
  const verificationEmail = document.getElementById('verificationEmail');
  const authEmail = document.getElementById('authEmail');
  
  if (verificationEmail && authEmail) {
    authEmail.value = verificationEmail.textContent;
  }
}

// 이메일 도메인 안내
function updateEmailDomainHint() {
  const emailInput = document.getElementById('authEmail');
  const hintElement = document.getElementById('emailDomainHint');
  
  if (!emailInput || !hintElement) return;
  
  const email = emailInput.value.toLowerCase();
  
  if (email.includes('@naver.com')) {
    hintElement.textContent = '✅ 네이버 메일 사용 가능';
    hintElement.className = 'text-xs text-green-600 mt-1';
  } else if (email.includes('@hanmail.net') || email.includes('@daum.net')) {
    hintElement.textContent = '✅ 한메일/다음 메일 사용 가능';
    hintElement.className = 'text-xs text-green-600 mt-1';
  } else if (email.includes('@gmail.com')) {
    hintElement.textContent = '✅ Gmail 사용 가능';
    hintElement.className = 'text-xs text-green-600 mt-1';
  } else if (email.includes('@')) {
    hintElement.textContent = '✅ 모든 도메인 사용 가능';
    hintElement.className = 'text-xs text-blue-600 mt-1';
  } else {
    hintElement.textContent = '';
  }
}

// 통합 이메일 인증 핸들러 (회원가입 + 로그인)
async function handleEmailAuth() {
  if (authMode === 'signup') {
    await handleEmailSignup();
  } else {
    await handleEmailLogin();
  }
}

// 이메일 회원가입
async function handleEmailSignup() {
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  
  if (!emailInput || !passwordInput) {
    showToast('입력 양식을 찾을 수 없습니다', 'error');
    return;
  }
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  // 유효성 검사
  if (!email || !password) {
    showToast('이메일과 비밀번호를 입력해주세요', 'warning');
    return;
  }
  
  if (password.length < 8) {
    showToast('비밀번호는 8자 이상이어야 합니다', 'warning');
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('올바른 이메일 형식이 아닙니다', 'warning');
    return;
  }
  
  try {
    console.log('📧 이메일 회원가입 시작:', email);
    
    // 버튼 비활성화
    const authBtn = document.getElementById('emailAuthBtn');
    if (authBtn) {
      authBtn.disabled = true;
      authBtn.textContent = '처리 중...';
    }
    
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || '회원가입에 실패했습니다');
    }
    
    console.log('✅ 회원가입 성공:', data);
    
    // 회원가입 모달 닫기
    closeAuthModal();
    
    // 이메일 인증 안내 모달 표시
    openEmailVerificationModal(email);
    
    showToast(`회원가입 완료! ${email}로 인증 메일을 발송했습니다`, 'success');
    
    // 남은 가입 가능 횟수 표시
    if (data.remaining_signups !== undefined) {
      console.log(`ℹ️ 24시간 내 남은 가입 가능 횟수: ${data.remaining_signups}회`);
    }
    
  } catch (error) {
    console.error('❌ 회원가입 오류:', error);
    
    // DB 에러 코드별 처리 (NEW v7.5 - 간단한 메시지)
    const errorMsg = error.message || '회원가입에 실패했습니다';
    
    if (errorMsg.includes('탈퇴한 계정은') || errorMsg.includes('30일 후 재가입')) {
      // 재가입 제한 - DB 메시지 그대로 표시 (탈퇴일 포함)
      showToast(`⏰ ${errorMsg}`, 'warning');
    } else if (errorMsg.includes('ERR_PERMANENT_BAN') || errorMsg.includes('영구적으로 가입이 제한')) {
      // 영구 차단
      showToast('🚫 이 이메일은 가입이 제한되어 있습니다. 고객센터에 문의해주세요.', 'error');
    } else if (errorMsg.includes('이미 등록된')) {
      // 이메일 중복
      showToast('이미 가입된 이메일입니다. 로그인해주세요.', 'warning');
    } else if (errorMsg.includes('IP')) {
      // IP 제한
      showToast('⚠️ 동일 IP에서 가입 제한을 초과했습니다. 24시간 후 시도해주세요.', 'warning');
    } else {
      // 기타 에러
      showToast(errorMsg, 'error');
    }
  } finally {
    // 버튼 재활성화
    const authBtn = document.getElementById('emailAuthBtn');
    if (authBtn) {
      authBtn.disabled = false;
      authBtn.innerHTML = '<i class="fas fa-envelope mr-2"></i><span id="emailAuthBtnText">이메일로 가입하기</span>';
      updateAuthModalUI(); // UI 복원
    }
  }
}

// 이메일 로그인
async function handleEmailLogin() {
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  
  if (!emailInput || !passwordInput) {
    showToast('입력 양식을 찾을 수 없습니다', 'error');
    return;
  }
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  // 유효성 검사
  if (!email || !password) {
    showToast('이메일과 비밀번호를 입력해주세요', 'warning');
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('올바른 이메일 형식이 아닙니다', 'warning');
    return;
  }
  
  try {
    console.log('🔐 이메일 로그인 시작:', email);
    
    // 버튼 비활성화
    const authBtn = document.getElementById('emailAuthBtn');
    if (authBtn) {
      authBtn.disabled = true;
      authBtn.textContent = '로그인 중...';
    }
    
    if (!supabaseClient) {
      throw new Error('인증 시스템을 초기화하는 중입니다');
    }
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ 로그인 성공:', data);
    
    // 회원가입 모달 닫기
    closeAuthModal();
    
    showToast('로그인 성공!', 'success');
    
    // 페이지별 리다이렉트 처리
    if (window.location.pathname === '/') {
      // 랜딩 페이지 → 대시보드로 이동
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } else {
      // 다른 페이지(PostFlow, YouTube Finder 등) → 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
    
  } catch (error) {
    console.error('❌ 로그인 오류:', error);
    
    // 오류 메시지 분석 및 사용자 친화적 메시지 표시
    if (error.message.includes('Invalid login credentials')) {
      showToast('⚠️ 로그인 실패: 이메일 또는 비밀번호가 올바르지 않습니다.\n탈퇴한 계정이거나 등록되지 않은 이메일일 수 있습니다.', 'error');
    } else if (error.message.includes('Email not confirmed')) {
      showToast('📧 이메일 인증이 필요합니다. 가입 시 받은 인증 메일을 확인해주세요.', 'warning');
    } else if (error.message.includes('User not found')) {
      showToast('❌ 등록되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.', 'error');
    } else if (error.message.includes('account has been deleted')) {
      showToast('🚫 탈퇴한 계정입니다. 다시 가입하려면 회원가입을 진행해주세요.', 'error');
    } else if (error.message.includes('Too many requests')) {
      showToast('⏰ 로그인 시도 횟수 초과. 잠시 후 다시 시도해주세요.', 'warning');
    } else {
      showToast(`❌ 로그인 실패: ${error.message || '알 수 없는 오류가 발생했습니다'}`, 'error');
    }
  } finally {
    // 버튼 재활성화
    const authBtn = document.getElementById('emailAuthBtn');
    if (authBtn) {
      authBtn.disabled = false;
      authBtn.innerHTML = '<i class="fas fa-envelope mr-2"></i><span id="emailAuthBtnText">이메일로 로그인</span>';
      updateAuthModalUI(); // UI 복원
    }
  }
}

// Google 로그인 (모달에서)
async function handleGoogleLogin() {
  // 인앱 브라우저 차단
  if (isInAppBrowser()) {
    showToast('인앱 브라우저에서는 Google 로그인이 불가합니다. Chrome 또는 Safari에서 열어주세요.', 'warning');
    return;
  }
  
  if (!supabaseClient) {
    showToast('인증 시스템을 초기화하는 중입니다', 'warning');
    return;
  }
  
  try {
    console.log('🔐 Google 로그인 시작');
    
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
      throw error;
    }
    
    // OAuth는 자동으로 리디렉션됩니다
    console.log('✅ Google OAuth 리디렉션 시작');
    
  } catch (error) {
    console.error('❌ Google 로그인 오류:', error);
    showToast('Google 로그인에 실패했습니다', 'error');
  }
}

// Kakao 로그인 (모달에서)
async function handleKakaoLogin() {
  if (!supabaseClient) {
    showToast('인증 시스템을 초기화하는 중입니다', 'warning');
    return;
  }
  
  try {
    console.log('🟡 Kakao 로그인 시작');
    
    // NEW v7.9: 카카오 이메일 동의항목 추가 (카카오 개발자 콘솔에서 필수 동의 설정 완료 후)
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        scopes: 'profile_nickname profile_image account_email',
        queryParams: {
          scope: 'profile_nickname profile_image account_email'
        }
      }
    });
    
    if (error) {
      throw error;
    }
    
    // OAuth는 자동으로 리디렉션됩니다
    console.log('✅ Kakao OAuth 리디렉션 시작');
    
  } catch (error) {
    console.error('❌ Kakao 로그인 오류:', error);
    showToast('Kakao 로그인에 실패했습니다', 'error');
  }
}

// ========================================
// 회원 탈퇴 (NEW v7.4)
// ========================================
async function handleDeleteAccount() {
  // 1차 확인 (NEW v7.5: 30일 제한 안내 추가)
  const confirmed = confirm(
    '⚠️ 정말로 회원 탈퇴하시겠습니까?\n\n' +
    '• 모든 크레딧이 삭제됩니다\n' +
    '• 생성한 콘텐츠 기록이 삭제됩니다\n' +
    '• 복구할 수 없습니다\n' +
    '• 탈퇴 후 30일 동안 재가입이 불가능합니다\n' +
    '• 30일 후 재가입 시 무료 크레딧이 지급되지 않습니다\n\n' +
    '탈퇴하시려면 "확인"을 클릭하세요.'
  );
  
  if (!confirmed) {
    return;
  }

  // 2차 확인
  const doubleConfirm = confirm('마지막 확인입니다. 정말로 탈퇴하시겠습니까?');
  if (!doubleConfirm) {
    return;
  }

  try {
    console.log('🗑️ 회원 탈퇴 시작...');

    // Supabase 클라이언트 확인
    if (!supabaseClient) {
      showToast('Supabase 초기화가 필요합니다. 페이지를 새로고침해주세요.', 'error');
      return;
    }

    // 현재 세션 토큰 가져오기
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      showToast('로그인이 필요합니다', 'error');
      return;
    }

    // API 호출
    const response = await fetch('/api/auth/delete-account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || '회원 탈퇴에 실패했습니다');
    }

    console.log('✅ 회원 탈퇴 완료:', data);

    // 로그아웃 (세션 정리)
    await supabaseClient.auth.signOut();
    
    // 로컬 스토리지 정리
    localStorage.removeItem('postflow_user');
    localStorage.removeItem('postflow_token');

    // 성공 메시지 (NEW v7.5: 30일 제한 안내)
    const restrictionDate = data.restriction_until ? new Date(data.restriction_until).toLocaleDateString('ko-KR') : '30일 후';
    alert(
      '회원 탈퇴가 완료되었습니다.\n\n' +
      `• 재가입 가능 날짜: ${restrictionDate}\n` +
      '• 재가입 시 무료 크레딧은 제공되지 않습니다\n\n' +
      '그동안 이용해주셔서 감사합니다.'
    );

    // 메인 페이지로 리디렉트
    window.location.href = '/';

  } catch (error) {
    console.error('❌ 회원 탈퇴 오류:', error);
    showToast(`회원 탈퇴 중 오류가 발생했습니다: ${error.message}`, 'error');
  }
}

// 전역 노출
window.openPolicyModal = openPolicyModal;
window.closePolicyModal = closePolicyModal;
window.handleLogoClick = handleLogoClick;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.updateAuthModalUI = updateAuthModalUI;
window.openEmailVerificationModal = openEmailVerificationModal;
window.closeEmailVerificationModal = closeEmailVerificationModal;
window.handleLoginAfterVerification = handleLoginAfterVerification;
window.handleEmailAuth = handleEmailAuth;
window.handleEmailSignup = handleEmailSignup;
window.handleEmailLogin = handleEmailLogin;
window.handleGoogleLogin = handleGoogleLogin;
window.handleKakaoLogin = handleKakaoLogin;
window.updateEmailDomainHint = updateEmailDomainHint;
window.handleDeleteAccount = handleDeleteAccount;

// ===================================
// 🔄 멀티탭 크레딧 동기화 시스템
// ===================================

/**
 * 크레딧 UI 업데이트 함수
 */
function updateCreditsUI(credits) {
  if (!credits) return;
  
  const userCreditsElement = document.getElementById('userCredits');
  if (userCreditsElement) {
    const totalCredits = (credits.free_credits || 0) + (credits.paid_credits || 0);
    userCreditsElement.textContent = `${totalCredits} 크레딧`;
  }
  
  // currentUser 객체 업데이트 (LocalStorage는 업데이트하지 않음 - 무한 루프 방지)
  if (window.currentUser) {
    window.currentUser.free_credits = credits.free_credits || 0;
    window.currentUser.paid_credits = credits.paid_credits || 0;
  }
}

/**
 * 다른 탭에 크레딧 변경 알림
 */
function broadcastCreditUpdate(newCredits) {
  try {
    creditSyncChannel.postMessage({
      type: 'CREDIT_UPDATE',
      data: {
        free_credits: newCredits.free_credits,
        paid_credits: newCredits.paid_credits,
        timestamp: Date.now(),
        source_tab: document.title
      }
    });
    console.log('📡 크레딧 변경 알림 전송:', newCredits);
  } catch (error) {
    console.error('❌ BroadcastChannel 오류:', error);
  }
}

/**
 * 다른 탭에서 크레딧 변경 알림 수신
 */
creditSyncChannel.addEventListener('message', (event) => {
  if (event.data.type === 'CREDIT_UPDATE') {
    console.log('📡 다른 탭에서 크레딧 변경 감지:', event.data);
    
    // UI 즉시 업데이트
    updateCreditsUI(event.data.data);
    
    // 사용자에게 알림 (선택사항)
    // showToast(`💳 크레딧이 업데이트되었습니다 (${event.data.source_tab})`, 'info');
  }
});

/**
 * 탭 활성화 시 크레딧 동기화
 */
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && window.currentUser && !window.currentUser.isGuest) {
    console.log('🔄 탭 활성화: 크레딧 정보 동기화 중...');
    
    try {
      const response = await fetch(`/api/users/${window.currentUser.id}/credits`);
      const data = await response.json();
      
      if (data.success) {
        updateCreditsUI({
          free_credits: data.free_credits,
          paid_credits: data.paid_credits
        });
        
        console.log('✅ 크레딧 동기화 완료:', data);
      }
    } catch (error) {
      console.error('❌ 크레딧 동기화 실패:', error);
    }
  }
});

/**
 * LocalStorage 변경 감지 (다른 탭에서 사용자 정보 변경 시)
 */
window.addEventListener('storage', (event) => {
  if (event.key === 'postflow_user' && event.newValue) {
    try {
      const userData = JSON.parse(event.newValue);
      
      // 크레딧 정보가 변경되었으면 UI만 업데이트 (LocalStorage는 건드리지 않음)
      if (userData.free_credits !== undefined || userData.paid_credits !== undefined) {
        const userCreditsElement = document.getElementById('userCredits');
        if (userCreditsElement) {
          const totalCredits = (userData.free_credits || 0) + (userData.paid_credits || 0);
          userCreditsElement.textContent = `${totalCredits} 크레딧`;
        }
        
        if (window.currentUser) {
          window.currentUser.free_credits = userData.free_credits || 0;
          window.currentUser.paid_credits = userData.paid_credits || 0;
        }
      }
    } catch (error) {
      console.error('❌ LocalStorage 파싱 오류:', error);
    }
  }
});

// 전역 노출
window.updateCreditsUI = updateCreditsUI;
window.broadcastCreditUpdate = broadcastCreditUpdate;

// ========================================
// SNS 바로가기 & AI 빠른 설정 기능 (NEW v9.0 - API 기반)
// ========================================

// 현재 로드된 빠른 설정 캐시
let cachedSnsLinks = null;
let cachedAiTools = null;

// 기본 8개 SNS 플랫폼
const DEFAULT_SNS_PLATFORMS = [
  { name: '네이버 블로그', url: 'https://blog.naver.com', icon: 'fas fa-blog', color: '#03C75A' },
  { name: '인스타그램', url: 'https://www.instagram.com', icon: 'fab fa-instagram', color: '#E4405F' },
  { name: '스레드', url: 'https://www.threads.net', icon: 'fas fa-at', color: '#000000' },
  { name: '트위터(X)', url: 'https://x.com', text: '𝕏', color: '#000000' },
  { name: '링크드인', url: 'https://www.linkedin.com', icon: 'fab fa-linkedin', color: '#0A66C2' },
  { name: '브런치', url: 'https://brunch.co.kr', icon: 'fas fa-book', color: '#00C896' },
  { name: '틱톡', url: 'https://www.tiktok.com', icon: 'fab fa-tiktok', color: '#000000' },
  { name: '유튜브', url: 'https://studio.youtube.com', icon: 'fab fa-youtube', color: '#FF0000' }
];

// 현재 프로필 ID 가져오기 (개선된 버전)
function getCurrentProfileId() {
  // 1순위: localStorage에서 선택된 프로필 ID 가져오기
  const selectedProfileId = localStorage.getItem('postflow_selected_profile_id');
  if (selectedProfileId) {
    return selectedProfileId;
  }
  
  // 2순위: 캐시된 프로필 목록에서 첫 번째 프로필 사용
  if (window.cachedProfiles && window.cachedProfiles.length > 0) {
    return window.cachedProfiles[0].id;
  }
  
  // 3순위: 로그인되지 않음
  if (!window.currentUser || !window.currentUser.id) {
    console.warn('⚠️ 로그인된 사용자가 없습니다');
    return null;
  }
  
  // 프로필을 아직 로드하지 않았으면 null 반환
  console.warn('⚠️ 프로필을 로드해야 합니다');
  return null;
}

// 사용자 프로필 목록 로드
async function loadUserProfiles() {
  try {
    if (!window.currentUser || !window.currentUser.id) {
      console.warn('⚠️ 로그인된 사용자가 없습니다');
      return [];
    }
    
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      console.warn('⚠️ 세션이 없습니다');
      return [];
    }
    
    const token = session.data.session.access_token;
    const userId = window.currentUser.id;
    
    console.log('📡 프로필 목록 로드 중...', { userId });
    
    const response = await fetch(`/api/profiles?user_id=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error('❌ 프로필 로드 실패:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (data.success && data.profiles && data.profiles.length > 0) {
      window.cachedProfiles = data.profiles;
      
      // 선택된 프로필이 없으면 첫 번째 프로필을 기본값으로 설정
      const selectedProfileId = localStorage.getItem('postflow_selected_profile_id');
      if (!selectedProfileId) {
        localStorage.setItem('postflow_selected_profile_id', data.profiles[0].id);
        console.log('✅ 기본 프로필 설정:', data.profiles[0].profile_name);
      }
      
      console.log(`✅ 프로필 ${data.profiles.length}개 로드 완료`);
      return data.profiles;
    }
    
    console.log('📦 프로필이 없습니다');
    return [];
    
  } catch (error) {
    console.error('❌ 프로필 로드 예외:', error);
    return [];
  }
}

// 프로필 전환
async function switchProfile(profileId) {
  try {
    console.log('🔄 프로필 전환:', profileId);
    
    // 선택된 프로필 저장
    localStorage.setItem('postflow_selected_profile_id', profileId);
    
    // 빠른 설정 캐시 무효화
    cachedSnsLinks = null;
    cachedAiTools = null;
    
    // 프로필 전환 이벤트 발생
    window.dispatchEvent(new CustomEvent('profileChanged', { detail: { profileId } }));
    
    console.log('✅ 프로필 전환 완료:', profileId);
    
    // 빠른 설정 자동 로드
    await reloadWorkflows();
    
  } catch (error) {
    console.error('❌ 프로필 전환 실패:', error);
    showToast('프로필 전환에 실패했습니다', 'error');
  }
}

// 빠른 설정 재로드
async function reloadWorkflows() {
  try {
    console.log('🔄 빠른 설정 재로드 중...');
    
    // SNS & AI 빠른 설정 동시 로드
    const [snsLinks, aiTools] = await Promise.all([
      loadSnsLinks(),
      loadAiTools()
    ]);
    
    // 모달이 열려있으면 UI 업데이트
    const snsModal = document.getElementById('snsLinksModal');
    const aiModal = document.getElementById('aiWorkflowModal');
    
    if (snsModal && snsModal.style.display === 'flex') {
      await renderSnsList();
    }
    
    if (aiModal && aiModal.style.display === 'flex') {
      await renderAiToolsList();
    }
    
    console.log('✅ 빠른 설정 재로드 완료');
    
  } catch (error) {
    console.error('❌ 빠른 설정 재로드 실패:', error);
  }
}

// SNS 초기화 플래그
let isInitializingSns = false;

// SNS 기본값 초기화 함수 (첫 로그인 시 DB에 저장)
async function initializeDefaultSnsLinks() {
  // 중복 초기화 방지
  if (isInitializingSns) {
    console.log('⏳ SNS 초기화 이미 진행 중...');
    return false;
  }
  
  try {
    isInitializingSns = true;
    
    const userId = window.currentUser.id;
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      console.error('❌ 세션 없음 - 초기화 실패');
      isInitializingSns = false;
      return false;
    }
    
    const token = session.data.session.access_token;
    
    console.log('🔄 첫 로그인: 기본 SNS 8개 DB에 저장 중...');
    
    // ✅ Promise.all()로 병렬 처리
    const promises = DEFAULT_SNS_PLATFORMS.map(async (platform) => {
      try {
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            category: 'sns',
            name: platform.name,
            url: platform.url,
            icon: platform.icon,
            is_favorite: false
          })
        });
        
        if (response.ok) {
          return { success: true, name: platform.name };
        } else {
          console.error(`❌ ${platform.name} 저장 실패:`, response.status);
          return { success: false, name: platform.name };
        }
      } catch (error) {
        console.error(`❌ ${platform.name} 저장 실패:`, error);
        return { success: false, name: platform.name };
      }
    });
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`✅ 기본 SNS ${successCount}개 저장 완료`);
    isInitializingSns = false;
    return true;
    
  } catch (error) {
    console.error('❌ SNS 초기화 예외:', error);
    isInitializingSns = false;
    return false;
  }
}

// SNS 링크 불러오기 (방법 B: DB 전용)
async function loadSnsLinks() {
  try {
    // ✅ 초기화 중이면 대기
    while (isInitializingSns) {
      console.log('⏳ SNS 초기화 완료 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 로그인 확인
    if (!window.currentUser || !window.currentUser.id) {
      console.log('📦 로그인 전이므로 기본 SNS 플랫폼 사용');
      cachedSnsLinks = DEFAULT_SNS_PLATFORMS;
      return DEFAULT_SNS_PLATFORMS;
    }
    
    const userId = window.currentUser.id;
    
    // Supabase 세션 토큰 가져오기
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      console.log('📦 세션 없음 - 기본 SNS 플랫폼 사용');
      cachedSnsLinks = DEFAULT_SNS_PLATFORMS;
      return DEFAULT_SNS_PLATFORMS;
    }
    
    const token = session.data.session.access_token;
    
    console.log('📡 SNS 링크 로드 중... (병합 방식)', { userId });
    
    const response = await fetch(`/api/workflows?user_id=${userId}&category=sns`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ SNS 링크 로드 실패:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        userId,
        url: `/api/workflows?user_id=${userId}&category=sns`
      });
      cachedSnsLinks = DEFAULT_SNS_PLATFORMS;
      return DEFAULT_SNS_PLATFORMS;
    }
    
    const data = await response.json();
    console.log('📦 SNS 링크 API 응답:', data);
    
    const dbWorkflows = data.workflows || [];
    
    // ✅ 방법 B: DB에 데이터 없으면 기본값 8개 자동 저장
    if (dbWorkflows.length === 0) {
      console.log('🔄 첫 로그인 감지: 기본 SNS 8개 초기화 시작');
      const initialized = await initializeDefaultSnsLinks();
      
      if (initialized) {
        // 다시 로드
        const retryResponse = await fetch(`/api/workflows?user_id=${userId}&category=sns`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryWorkflows = retryData.workflows || [];
          
          cachedSnsLinks = retryWorkflows.map(w => ({
            id: w.id,
            name: w.name,
            url: w.url,
            icon: w.icon || 'fas fa-link',
            color: '#6366f1'
          }));
          
          console.log(`✅ SNS 초기화 완료: ${cachedSnsLinks.length}개 로드`);
          return cachedSnsLinks;
        }
      }
      
      // 초기화 실패 시 기본값 사용
      cachedSnsLinks = DEFAULT_SNS_PLATFORMS;
      return DEFAULT_SNS_PLATFORMS;
    }
    
    // ✅ DB 데이터만 사용 (병합 안 함)
    cachedSnsLinks = dbWorkflows.map(w => ({
      id: w.id,
      name: w.name,
      url: w.url,
      icon: w.icon || 'fas fa-link',
      color: '#6366f1'
    }));
    
    console.log(`✅ SNS 링크 로드 완료: 총 ${cachedSnsLinks.length}개 (DB 전용)`);
    return cachedSnsLinks;
    
  } catch (error) {
    console.error('❌ SNS 링크 로드 예외:', error);
    cachedSnsLinks = DEFAULT_SNS_PLATFORMS;
    return DEFAULT_SNS_PLATFORMS;
  }
}

// SNS 링크 저장 (API 기반) - 더 이상 사용 안 함
function saveSnsLinks(links) {
  // API 기반으로 전환되어 개별 CRUD 함수 사용
  console.warn('⚠️ saveSnsLinks()는 더 이상 사용되지 않습니다. createSnsLink(), updateSnsLink(), deleteSnsLink()를 사용하세요');
}

// SNS 바로가기 모달 열기
async function openSnsLinksModal() {
  const modal = document.getElementById('snsLinksModal');
  if (!modal) {
    console.error('❌ SNS 바로가기 모달을 찾을 수 없습니다');
    return;
  }
  
  modal.style.display = 'flex';
  await renderSnsList();
}

// SNS 바로가기 모달 닫기
function closeSnsLinksModal() {
  const modal = document.getElementById('snsLinksModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// SNS 목록 렌더링
async function renderSnsList() {
  const container = document.getElementById('snsLinksList');
  if (!container) return;
  
  // 로딩 표시
  container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> 로드 중...</p>';
  
  const links = await loadSnsLinks();
  
  if (links.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">저장된 SNS 링크가 없습니다.</p>';
    return;
  }
  
  container.innerHTML = links.map((link, index) => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
        <i class="${link.icon}" style="font-size: 24px; color: ${link.color}; width: 32px; text-align: center;"></i>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">${link.name}</div>
          <a href="${link.url}" target="_blank" style="color: #6b7280; font-size: 0.875rem; text-decoration: none;" 
             onmouseover="this.style.textDecoration='underline'" 
             onmouseout="this.style.textDecoration='none'">
            ${link.url}
          </a>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button onclick="editSnsLink(${index})" style="padding: 8px 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
          <i class="fas fa-edit"></i> 수정
        </button>
        <button onclick="deleteSnsLink(${index})" style="padding: 8px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
          <i class="fas fa-trash"></i> 삭제
        </button>
      </div>
    </div>
  `).join('');
}

// 새 SNS 링크 추가
function addNewSnsLink() {
  editingSnsIndex = null; // 새로 추가
  document.getElementById('editSnsName').value = '';
  document.getElementById('editSnsUrl').value = '';
  document.getElementById('editSnsModal').style.display = 'flex';
}

// SNS 링크 수정
let editingSnsIndex = null;

function editSnsLink(index) {
  editingSnsIndex = index;
  const link = cachedSnsLinks[index];
  
  document.getElementById('editSnsName').value = link.name;
  document.getElementById('editSnsUrl').value = link.url;
  document.getElementById('editSnsModal').style.display = 'flex';
}

// SNS 수정 저장 (방법 B: DB 전용, name 자유 수정)
async function saveEditSns() {
  const name = document.getElementById('editSnsName').value.trim();
  const url = document.getElementById('editSnsUrl').value.trim();
  
  if (!name || !url) {
    showToast('⚠️ 모든 항목을 입력해주세요', 'warning');
    return;
  }
  
  if (!window.currentUser || !window.currentUser.id) {
    showToast('❌ 로그인이 필요합니다', 'error');
    return;
  }
  
  const userId = window.currentUser.id;
  
  try {
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      showToast('❌ 세션이 만료되었습니다. 다시 로그인해주세요', 'error');
      return;
    }
    
    const token = session.data.session.access_token;
    
    // 새로 추가 또는 기본값 수정
    if (editingSnsIndex === null || !cachedSnsLinks[editingSnsIndex].id) {
      // 새로 추가
      console.log('📡 SNS 링크 생성 중...', { name, url, userId });
      
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          category: 'sns',
          name: name,
          url: url,
          icon: 'fas fa-link',
          is_favorite: false
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'SNS 링크 생성 실패');
      }
      
      showToast('✅ SNS 링크가 추가되었습니다', 'success');
      
    } else {
      // 기존 수정
      const workflowId = cachedSnsLinks[editingSnsIndex].id;
      console.log('📡 SNS 링크 수정 중...', { workflowId, name, url });
      
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          url: url
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'SNS 링크 수정 실패');
      }
      
      showToast('✅ SNS 링크가 수정되었습니다', 'success');
    }
    
    // 목록 새로고침
    cachedSnsLinks = null; // 캐시 무효화
    await renderSnsList();
    cancelEditSns();
    
  } catch (error) {
    console.error('❌ SNS 링크 저장 실패:', error);
    showToast(`❌ ${error.message}`, 'error');
  }
}

// SNS 수정 취소
function cancelEditSns() {
  document.getElementById('editSnsModal').style.display = 'none';
  editingSnsIndex = null;
}

// SNS 링크 삭제 (계정별 저장)
async function deleteSnsLink(index) {
  if (!confirm('이 SNS 링크를 삭제하시겠습니까?')) return;
  
  if (!window.currentUser || !window.currentUser.id) {
    showToast('❌ 로그인이 필요합니다', 'error');
    return;
  }
  
  try {
    const workflowId = cachedSnsLinks[index].id;
    
    if (!workflowId) {
      showToast('❌ 기본 SNS 링크는 삭제할 수 없습니다', 'error');
      return;
    }
    
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      showToast('❌ 세션이 만료되었습니다. 다시 로그인해주세요', 'error');
      return;
    }
    
    const token = session.data.session.access_token;
    
    console.log('📡 SNS 링크 삭제 중...', { workflowId });
    
    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'SNS 링크 삭제 실패');
    }
    
    showToast('✅ SNS 링크가 삭제되었습니다', 'success');
    
    // 목록 새로고침
    cachedSnsLinks = null; // 캐시 무효화
    await renderSnsList();
    
  } catch (error) {
    console.error('❌ SNS 링크 삭제 실패:', error);
    showToast(`❌ ${error.message}`, 'error');
  }
}

// ========================================
// AI 빠른 설정 기능 (NEW v9.0 - API 기반)
// ========================================

// 기본 AI 도구 목록 (카테고리별)
const DEFAULT_AI_TOOLS = [
  // 이미지 생성
  { name: 'Midjourney', url: 'https://www.midjourney.com', category: '이미지 생성', icon: 'fas fa-palette', color: '#7B68EE' },
  { name: 'DALL·E', url: 'https://labs.openai.com', category: '이미지 생성', icon: 'fas fa-image', color: '#10A37F' },
  
  // 영상 편집
  { name: 'CapCut', url: 'https://www.capcut.com', category: '영상 편집', icon: 'fas fa-video', color: '#000000' },
  { name: 'Runway', url: 'https://runwayml.com', category: '영상 편집', icon: 'fas fa-film', color: '#4A90E2' },
  
  // 디자인
  { name: 'Canva', url: 'https://www.canva.com', category: '디자인', icon: 'fas fa-paint-brush', color: '#00C4CC' },
  { name: 'Figma', url: 'https://www.figma.com', category: '디자인', icon: 'fas fa-pencil-ruler', color: '#F24E1E' },
  
  // 음성 생성
  { name: 'ElevenLabs', url: 'https://elevenlabs.io', category: '음성 생성', icon: 'fas fa-microphone', color: '#6366F1' },
  
  // 음악 생성
  { name: 'Suno', url: 'https://suno.ai', category: '음악 생성', icon: 'fas fa-music', color: '#FF6B6B' },
  
  // 프레젠테이션
  { name: 'Gamma', url: 'https://gamma.app', category: '프레젠테이션', icon: 'fas fa-presentation', color: '#8B5CF6' },
  { name: 'Tome', url: 'https://tome.app', category: '프레젠테이션', icon: 'fas fa-book-open', color: '#10B981' }
];

// AI 빠른 설정 초기화 플래그
let isInitializingAi = false;

// AI 빠른 설정 기본값 초기화 함수 (첫 로그인 시 DB에 저장)
async function initializeDefaultAiTools() {
  // 중복 초기화 방지
  if (isInitializingAi) {
    console.log('⏳ AI 빠른 설정 초기화 이미 진행 중...');
    return false;
  }
  
  try {
    isInitializingAi = true;
    
    const userId = window.currentUser.id;
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      console.error('❌ 세션 없음 - 초기화 실패');
      isInitializingAi = false;
      return false;
    }
    
    const token = session.data.session.access_token;
    
    console.log('🔄 첫 로그인: 기본 AI 도구 12개 DB에 저장 중...');
    
    // ✅ Promise.all()로 병렬 처리
    const promises = DEFAULT_AI_TOOLS.map(async (tool) => {
      try {
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            category: 'ai_tool',
            name: tool.name,
            url: tool.url,
            icon: tool.icon,
            description: tool.category,
            is_favorite: false
          })
        });
        
        if (response.ok) {
          return { success: true, name: tool.name };
        } else {
          console.error(`❌ ${tool.name} 저장 실패:`, response.status);
          return { success: false, name: tool.name };
        }
      } catch (error) {
        console.error(`❌ ${tool.name} 저장 실패:`, error);
        return { success: false, name: tool.name };
      }
    });
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`✅ 기본 AI 도구 ${successCount}개 저장 완료`);
    isInitializingAi = false;
    return true;
    
  } catch (error) {
    console.error('❌ AI 빠른 설정 초기화 예외:', error);
    isInitializingAi = false;
    return false;
  }
}

// AI 도구 불러오기 (방법 B: DB 전용)
async function loadAiTools() {
  try {
    // ✅ 초기화 중이면 대기
    while (isInitializingAi) {
      console.log('⏳ AI 빠른 설정 초기화 완료 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 로그인 확인
    if (!window.currentUser || !window.currentUser.id) {
      console.log('📦 로그인 전이므로 기본 AI 도구 사용');
      cachedAiTools = DEFAULT_AI_TOOLS;
      return DEFAULT_AI_TOOLS;
    }
    
    const userId = window.currentUser.id;
    
    // Supabase 세션 토큰 가져오기
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      console.log('📦 세션 없음 - 기본 AI 도구 사용');
      cachedAiTools = DEFAULT_AI_TOOLS;
      return DEFAULT_AI_TOOLS;
    }
    
    const token = session.data.session.access_token;
    
    console.log('📡 AI 빠른 설정 로드 중... (병합 방식)', { userId });
    
    const response = await fetch(`/api/workflows?user_id=${userId}&category=ai_tool`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ AI 빠른 설정 로드 실패:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        userId,
        url: `/api/workflows?user_id=${userId}&category=ai_tool`
      });
      cachedAiTools = DEFAULT_AI_TOOLS;
      return DEFAULT_AI_TOOLS;
    }
    
    const data = await response.json();
    console.log('📦 AI 빠른 설정 API 응답:', data);
    
    const dbWorkflows = data.workflows || [];
    
    // ✅ 방법 B: DB에 데이터 없으면 기본값 12개 자동 저장
    if (dbWorkflows.length === 0) {
      console.log('🔄 첫 로그인 감지: 기본 AI 도구 12개 초기화 시작');
      const initialized = await initializeDefaultAiTools();
      
      if (initialized) {
        // 다시 로드
        const retryResponse = await fetch(`/api/workflows?user_id=${userId}&category=ai_tool`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const retryWorkflows = retryData.workflows || [];
          
          cachedAiTools = retryWorkflows.map(w => ({
            id: w.id,
            name: w.name,
            url: w.url,
            category: w.description || '기타',
            icon: w.icon || 'fas fa-robot',
            color: '#6366f1'
          }));
          
          console.log(`✅ AI 빠른 설정 초기화 완료: ${cachedAiTools.length}개 로드`);
          return cachedAiTools;
        }
      }
      
      // 초기화 실패 시 기본값 사용
      cachedAiTools = DEFAULT_AI_TOOLS;
      return DEFAULT_AI_TOOLS;
    }
    
    // ✅ DB 데이터만 사용 (병합 안 함)
    cachedAiTools = dbWorkflows.map(w => ({
      id: w.id,
      name: w.name,
      url: w.url,
      category: w.description || '기타',
      icon: w.icon || 'fas fa-robot',
      color: '#6366f1'
    }));
    
    console.log(`✅ AI 빠른 설정 로드 완료: 총 ${cachedAiTools.length}개 (DB 전용)`);
    return cachedAiTools;
    console.log(`✅ AI 빠른 설정 병합 완료: 총 ${cachedAiTools.length}개 (DB: ${dbWorkflows.length}개, 기본값: ${DEFAULT_AI_TOOLS.length}개)`);
    return cachedAiTools;
    
  } catch (error) {
    console.error('❌ AI 빠른 설정 로드 예외:', error);
    cachedAiTools = DEFAULT_AI_TOOLS;
    return DEFAULT_AI_TOOLS;
  }
}

// AI 도구 저장 (API 기반) - 더 이상 사용 안 함
function saveAiTools(tools) {
  // API 기반으로 전환되어 개별 CRUD 함수 사용
  console.warn('⚠️ saveAiTools()는 더 이상 사용되지 않습니다. createAiTool(), updateAiTool(), deleteAiTool()을 사용하세요');
}

// AI 빠른 설정 모달 열기
async function openAiWorkflowModal() {
  const modal = document.getElementById('aiWorkflowModal');
  if (!modal) {
    console.error('❌ AI 빠른 설정 모달을 찾을 수 없습니다');
    return;
  }
  
  modal.style.display = 'flex';
  await renderAiToolsList();
}

// AI 빠른 설정 모달 닫기
function closeAiWorkflowModal() {
  const modal = document.getElementById('aiWorkflowModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// AI 도구 목록 렌더링 (카테고리별)
async function renderAiToolsList() {
  const container = document.getElementById('aiWorkflowList');
  if (!container) return;
  
  // 로딩 표시
  container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> 로드 중...</p>';
  
  const tools = await loadAiTools();
  
  if (tools.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">저장된 AI 도구가 없습니다.</p>';
    return;
  }
  
  // 카테고리별 그룹화
  const categories = {};
  tools.forEach((tool, index) => {
    if (!categories[tool.category]) {
      categories[tool.category] = [];
    }
    categories[tool.category].push({ ...tool, index });
  });
  
  container.innerHTML = Object.keys(categories).map(category => `
    <div style="margin-bottom: 20px;">
      <h3 style="font-weight: 600; color: #1f2937; margin-bottom: 12px; font-size: 1rem;">
        ${category}
      </h3>
      ${categories[category].map(tool => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
            <i class="${tool.icon}" style="font-size: 20px; color: ${tool.color}; width: 28px; text-align: center;"></i>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #1f2937; margin-bottom: 2px;">${tool.name}</div>
              <a href="${tool.url}" target="_blank" style="color: #6b7280; font-size: 0.75rem; text-decoration: none;" 
                 onmouseover="this.style.textDecoration='underline'" 
                 onmouseout="this.style.textDecoration='none'">
                ${tool.url}
              </a>
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button onclick="editAiTool(${tool.index})" style="padding: 6px 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.75rem;">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteAiTool(${tool.index})" style="padding: 6px 10px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.75rem;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

// 새 AI 도구 추가
function addNewAiTool() {
  editingAiToolIndex = null; // 새로 추가
  document.getElementById('editAiToolName').value = '';
  document.getElementById('editAiToolUrl').value = '';
  document.getElementById('editAiToolCategory').value = '이미지 생성';
  document.getElementById('editAiToolModal').style.display = 'flex';
}

// AI 도구 수정
let editingAiToolIndex = null;

function editAiTool(index) {
  editingAiToolIndex = index;
  const tool = cachedAiTools[index];
  
  document.getElementById('editAiToolName').value = tool.name;
  document.getElementById('editAiToolUrl').value = tool.url;
  document.getElementById('editAiToolCategory').value = tool.category;
  document.getElementById('editAiToolModal').style.display = 'flex';
}

// AI 도구 수정 저장 (API 기반)
async function saveEditAiTool() {
  const name = document.getElementById('editAiToolName').value.trim();
  const url = document.getElementById('editAiToolUrl').value.trim();
  const category = document.getElementById('editAiToolCategory').value;
  
  if (!name || !url) {
    showToast('⚠️ 이름과 URL을 입력해주세요', 'warning');
    return;
  }
  
  if (!window.currentUser || !window.currentUser.id) {
    showToast('❌ 로그인이 필요합니다', 'error');
    return;
  }
  
  const userId = window.currentUser.id;
  
  try {
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      showToast('❌ 세션이 만료되었습니다. 다시 로그인해주세요', 'error');
      return;
    }
    
    const token = session.data.session.access_token;
    
    // 새로 추가 또는 기본값 수정
    if (editingAiToolIndex === null || !cachedAiTools[editingAiToolIndex].id) {
      // 새로 추가
      console.log('📡 AI 빠른 설정 생성 중...', { name, url, category, userId });
      
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          category: 'ai_tool',
          name: name,
          url: url,
          icon: 'fas fa-robot',
          description: category,  // category를 description에 저장
          is_favorite: false
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'AI 빠른 설정 생성 실패');
      }
      
      showToast('✅ AI 도구가 추가되었습니다', 'success');
      
    } else {
      // 기존 수정
      const workflowId = cachedAiTools[editingAiToolIndex].id;
      console.log('📡 AI 빠른 설정 수정 중...', { workflowId, name, url, category });
      
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          url: url,
          description: category  // category를 description에 저장
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'AI 빠른 설정 수정 실패');
      }
      
      showToast('✅ AI 도구가 수정되었습니다', 'success');
    }
    
    // 목록 새로고침
    cachedAiTools = null; // 캐시 무효화
    await renderAiToolsList();
    cancelEditAiTool();
    
  } catch (error) {
    console.error('❌ AI 빠른 설정 저장 실패:', error);
    showToast(`❌ ${error.message}`, 'error');
  }
}

// AI 도구 수정 취소
function cancelEditAiTool() {
  document.getElementById('editAiToolModal').style.display = 'none';
  editingAiToolIndex = null;
}

// AI 도구 삭제 (계정별 저장)
async function deleteAiTool(index) {
  if (!confirm('이 AI 도구를 삭제하시겠습니까?')) return;
  
  if (!window.currentUser || !window.currentUser.id) {
    showToast('❌ 로그인이 필요합니다', 'error');
    return;
  }
  
  try {
    const workflowId = cachedAiTools[index].id;
    
    if (!workflowId) {
      showToast('❌ 기본 AI 도구는 삭제할 수 없습니다', 'error');
      return;
    }
    
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      showToast('❌ 세션이 만료되었습니다. 다시 로그인해주세요', 'error');
      return;
    }
    
    const token = session.data.session.access_token;
    
    console.log('📡 AI 빠른 설정 삭제 중...', { workflowId });
    
    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'AI 빠른 설정 삭제 실패');
    }
    
    showToast('✅ AI 도구가 삭제되었습니다', 'success');
    
    // 목록 새로고침
    cachedAiTools = null; // 캐시 무효화
    await renderAiToolsList();
    
  } catch (error) {
    console.error('❌ AI 빠른 설정 삭제 실패:', error);
    showToast(`❌ ${error.message}`, 'error');
  }
}

// 전역 노출
window.openSnsLinksModal = openSnsLinksModal;
window.closeSnsLinksModal = closeSnsLinksModal;
window.addNewSnsLink = addNewSnsLink;
window.editSnsLink = editSnsLink;
window.saveEditSns = saveEditSns;
window.cancelEditSns = cancelEditSns;
window.deleteSnsLink = deleteSnsLink;

window.openAiWorkflowModal = openAiWorkflowModal;
window.closeAiWorkflowModal = closeAiWorkflowModal;
window.addNewAiTool = addNewAiTool;
window.editAiTool = editAiTool;
window.saveEditAiTool = saveEditAiTool;
window.cancelEditAiTool = cancelEditAiTool;
window.deleteAiTool = deleteAiTool;

// 프로필 관련 함수 전역 노출
window.loadUserProfiles = loadUserProfiles;
window.switchProfile = switchProfile;
window.reloadWorkflows = reloadWorkflows;

// 프로필 전환 이벤트 리스너
window.addEventListener('profileChanged', async (event) => {
  console.log('🔄 프로필 전환 이벤트 감지:', event.detail);
  
  // 빠른 설정 자동 재로드는 switchProfile 함수 내에서 이미 처리됨
  // 추가 UI 업데이트가 필요하면 여기에 추가
});

// ========================================
// 🔧 설정 페이지 기능 (NEW v9.0)
// ========================================

// 설정 모달 표시
async function showSettingsModal() {
  const user = window.currentUser;
  
  if (!user || !user.isLoggedIn || user.isGuest) {
    showToast('로그인이 필요합니다', 'warning');
    return;
  }
  
  // 기존 모달 제거
  const existingModal = document.getElementById('settingsModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Supabase에서 사용자 정보 가져오기 (가입일 및 로그인 제공자)
  let joinDate = '정보 없음';
  let authProvider = 'email'; // 기본값
  
  try {
    const session = await supabaseClient.auth.getSession();
    if (session?.data?.session?.user) {
      const supabaseUser = session.data.session.user;
      
      // 가입일
      if (supabaseUser.created_at) {
        joinDate = new Date(supabaseUser.created_at).toLocaleDateString('ko-KR');
      }
      
      // 로그인 제공자 (google, kakao, email)
      authProvider = supabaseUser.app_metadata?.provider || 'email';
      
      console.log('📋 사용자 정보:', { created_at: supabaseUser.created_at, provider: authProvider });
    }
  } catch (error) {
    console.error('❌ 사용자 정보 조회 실패:', error);
  }
  
  // 회원 등급 한글 변환
  const tierLabels = {
    'guest': '비회원',
    'free': '무료',
    'paid': '유료'
  };
  const tierLabel = tierLabels[user.tier] || '무료';
  
  // 크레딧 정보
  const freeCredits = user.free_credits || 0;
  const paidCredits = user.paid_credits || 0;
  const totalCredits = freeCredits + paidCredits;
  
  const modalHTML = `
    <div id="settingsModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;">
      <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        
        <!-- 헤더 -->
        <div style="padding: 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 16px 16px 0 0;">
          <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">
            <i class="fas fa-cog"></i> 설정
          </h2>
          <button onclick="closeSettingsModal()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- 본문 -->
        <div style="padding: 24px;">
          
          <!-- 📋 기본 정보 섹션 -->
          <div style="margin-bottom: 32px;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: #1f2937; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-user-circle" style="color: #667eea;"></i>
              기본 정보
            </h3>
            
            <!-- 이메일 (읽기 전용) -->
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #6b7280; margin-bottom: 4px;">이메일</label>
              <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; color: #6b7280;">
                <i class="fas fa-envelope" style="margin-right: 8px;"></i>
                ${user.email || '정보 없음'}
              </div>
            </div>
            
            <!-- 이름 (읽기 전용) -->
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #6b7280; margin-bottom: 4px;">이름</label>
              <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; color: #6b7280;">
                <i class="fas fa-user" style="margin-right: 8px;"></i>
                ${user.name || user.email?.split('@')[0] || '익명'}
              </div>
            </div>
            
            <!-- 가입일 (읽기 전용) -->
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #6b7280; margin-bottom: 4px;">가입일</label>
              <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; color: #6b7280;">
                <i class="fas fa-calendar-alt" style="margin-right: 8px;"></i>
                ${joinDate}
              </div>
            </div>
            
            <!-- 크레딧 잔액 (읽기 전용) -->
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #6b7280; margin-bottom: 4px;">현재 크레딧 잔액</label>
              <div style="padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white; font-weight: 600;">
                <i class="fas fa-coins" style="margin-right: 8px;"></i>
                무료 ${freeCredits} · 유료 ${paidCredits} (총 ${totalCredits})
              </div>
            </div>
          </div>
          
          
          <!-- 🔒 비밀번호 변경 섹션 (이메일 가입자만) -->
          ${authProvider === 'email' ? `
          <div style="margin-bottom: 32px;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: #1f2937; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-lock" style="color: #667eea;"></i>
              비밀번호 변경
            </h3>
            
            <div id="passwordChangeSection">
              <!-- 현재 비밀번호 -->
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #6b7280; margin-bottom: 4px;">현재 비밀번호</label>
                <input type="password" id="currentPassword" 
                  style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.875rem;" 
                  placeholder="현재 비밀번호를 입력하세요">
              </div>
              
              <!-- 새 비밀번호 -->
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #6b7280; margin-bottom: 4px;">새 비밀번호</label>
                <input type="password" id="newPassword" 
                  style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.875rem;" 
                  placeholder="새 비밀번호 (최소 6자)">
              </div>
              
              <!-- 새 비밀번호 확인 -->
              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #6b7280; margin-bottom: 4px;">새 비밀번호 확인</label>
                <input type="password" id="confirmPassword" 
                  style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.875rem;" 
                  placeholder="새 비밀번호 다시 입력">
              </div>
              
              <button onclick="changePassword()" style="width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                <i class="fas fa-key"></i> 비밀번호 변경
              </button>
            </div>
          </div>
          ` : ''}
          
          <!-- ⚠️ 위험 영역 -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
            <h3 style="font-size: 1.125rem; font-weight: 600; color: #dc2626; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-exclamation-triangle"></i>
              위험 영역
            </h3>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <div style="font-weight: 500; color: #991b1b; margin-bottom: 8px;">회원 탈퇴 시 주의사항</div>
              <ul style="font-size: 0.875rem; color: #7f1d1d; margin-left: 20px;">
                <li>모든 데이터가 영구 삭제됩니다</li>
                <li>남은 크레딧은 환불되지 않습니다</li>
                <li>생성한 콘텐츠는 복구할 수 없습니다</li>
              </ul>
            </div>
            
            <button onclick="confirmAccountDeletion()" style="width: 100%; padding: 12px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
              <i class="fas fa-user-slash"></i> 회원 탈퇴
            </button>
          </div>
          
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // 📊 사용자 통계 로드 (누적 사용량 기능 제거로 비활성화)
  // loadUserStats();
  
  // 토글 스위치 CSS 동적 추가
  const style = document.createElement('style');
  style.textContent = `
    input:checked + span {
      background-color: #667eea !important;
    }
    input:checked + span + span {
      transform: translateX(24px) !important;
    }
  `;
  document.head.appendChild(style);
}

// 사용자 통계 로드
async function loadUserStats() {
  try {
    if (!window.currentUser || !window.currentUser.id) {
      console.log('로그인 전이므로 통계 로드 생략');
      return;
    }
    
    const session = await supabaseClient.auth.getSession();
    const token = session.data.session?.access_token;
    
    if (!token) {
      console.log('세션 토큰 없음 - 통계 로드 생략');
      return;
    }
    
    console.log('📊 사용자 통계 로드 중...');
    
    const response = await fetch('/api/user/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error('통계 로드 실패:', response.status);
      return;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('통계 로드 실패:', data.error);
      return;
    }
    
    const stats = data.stats;
    console.log('✅ 사용자 통계 로드 완료:', stats);
    
    // UI 업데이트
    const totalUsedElement = document.getElementById('total-credits-used');
    if (totalUsedElement) {
      totalUsedElement.innerHTML = `지금까지 총 <strong>${stats.total_credits_used || 0}</strong> 크레딧 사용`;
    }
    
    // 🆕 현재 크레딧 잔액 실시간 업데이트
    const currentCreditsElement = document.querySelector('#settingsModal .fa-coins')?.parentElement;
    if (currentCreditsElement && stats.current_credits) {
      const { free, paid, total } = stats.current_credits;
      currentCreditsElement.innerHTML = `
        <i class="fas fa-coins" style="margin-right: 8px;"></i>
        무료 ${free} · 유료 ${paid} (총 ${total})
      `;
    }
    
    // 랭킹 표시
    if (stats.rank_percentage) {
      const rankBadgeContainer = document.getElementById('rank-badge-container');
      const rankBadge = document.getElementById('rank-badge');
      
      if (rankBadgeContainer && rankBadge) {
        // 랭킹에 따른 아이콘 및 색상
        let icon = '🏆';
        let badgeColor = '#fbbf24';
        
        if (stats.rank_percentage <= 1) {
          icon = '👑';
          badgeColor = '#d4af37';
        } else if (stats.rank_percentage <= 5) {
          icon = '🏆';
          badgeColor = '#c0c0c0';
        } else if (stats.rank_percentage <= 15) {
          icon = '🥇';
          badgeColor = '#cd7f32';
        } else if (stats.rank_percentage <= 30) {
          icon = '🥈';
          badgeColor = '#7c7c7c';
        } else {
          icon = '🥉';
          badgeColor = '#a0a0a0';
        }
        
        rankBadge.innerHTML = `상위 <strong>${stats.rank_percentage}%</strong> 사용자 ${icon}`;
        rankBadgeContainer.style.display = 'block';
      }
    }
    
  } catch (error) {
    console.error('❌ 통계 로드 예외:', error);
  }
}

// 설정 모달 닫기
function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.remove();
  }
}

// 이름 변경 기능 제거됨 (2026-01-25)
// 사용자 요청으로 UI에서 이름 수정 불가 처리

// 알림 설정 변경 (더 이상 사용 안 함 - 가입 시에만 동의 받음)
// async function updateNotificationSettings() { ... }

// 비밀번호 변경
async function changePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // 유효성 검사
  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast('모든 필드를 입력해주세요', 'warning');
    return;
  }
  
  if (newPassword.length < 6) {
    showToast('새 비밀번호는 최소 6자 이상이어야 합니다', 'warning');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showToast('새 비밀번호가 일치하지 않습니다', 'warning');
    return;
  }
  
  try {
    console.log('📡 비밀번호 변경 요청');
    
    // Supabase 비밀번호 변경
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      throw error;
    }
    
    // 입력 필드 초기화
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    showToast('✅ 비밀번호가 변경되었습니다', 'success');
    console.log('✅ 비밀번호 변경 완료');
    
  } catch (error) {
    console.error('❌ 비밀번호 변경 실패:', error);
    showToast(`❌ ${error.message}`, 'error');
  }
}

// 회원 탈퇴 확인
function confirmAccountDeletion() {
  const confirmMessage = `
정말로 회원 탈퇴하시겠습니까?

⚠️ 주의사항:
• 모든 데이터가 영구 삭제됩니다
• 남은 크레딧은 환불되지 않습니다
• 생성한 콘텐츠는 복구할 수 없습니다

탈퇴를 진행하려면 "탈퇴"를 입력해주세요.
  `;
  
  const userInput = prompt(confirmMessage);
  
  if (userInput === '탈퇴') {
    deleteAccount();
  } else if (userInput !== null) {
    showToast('탈퇴가 취소되었습니다', 'info');
  }
}

// 회원 탈퇴 실행
async function deleteAccount() {
  if (!window.currentUser || !window.currentUser.id) {
    showToast('로그인 정보를 찾을 수 없습니다', 'error');
    return;
  }
  
  try {
    const session = await supabaseClient.auth.getSession();
    if (!session?.data?.session) {
      showToast('세션이 만료되었습니다. 다시 로그인해주세요', 'error');
      return;
    }
    
    const token = session.data.session.access_token;
    
    console.log('📡 회원 탈퇴 요청:', { userId: window.currentUser.id });
    
    const response = await fetch('/api/users/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: window.currentUser.id
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('✅ 회원 탈퇴가 완료되었습니다', 'success');
      
      // Supabase 로그아웃
      await supabaseClient.auth.signOut();
      
      // 로컬 데이터 삭제
      localStorage.removeItem('postflow_user');
      localStorage.removeItem('postflow_selected_profile_id');
      
      // 전역 변수 초기화
      window.currentUser = { isLoggedIn: false, isGuest: true };
      window.cachedProfiles = null;
      
      // 설정 모달 닫기
      closeSettingsModal();
      
      // UI 업데이트
      updateAuthUI();
      
      // 3초 후 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
      console.log('✅ 회원 탈퇴 완료');
    } else {
      throw new Error(data.error || '회원 탈퇴 실패');
    }
    
  } catch (error) {
    console.error('❌ 회원 탈퇴 실패:', error);
    showToast(`❌ ${error.message}`, 'error');
  }
}

// 전역 노출
window.showSettingsModal = showSettingsModal;
window.closeSettingsModal = closeSettingsModal;
// window.updateUserName = updateUserName; // 제거됨
// window.updateNotificationSettings = updateNotificationSettings; // 더 이상 사용 안 함
window.changePassword = changePassword;
window.confirmAccountDeletion = confirmAccountDeletion;
window.deleteAccount = deleteAccount;

// ============================================================
// 📘 도움말 가이드 기능
// ============================================================

const HELP_GUIDES = [
  {
    id: 'common',
    title: '<i class="fas fa-sync-alt"></i> 공통 활용 프로세스',
    icon: '<i class="fas fa-sync-alt"></i>',
    description: '모든 플랫폼 공통 콘텐츠 생성 및 활용 3단계',
    content: `
      <h3>✅ 공통 활용 프로세스 (모든 플랫폼)</h3>
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 15px 0;">
        <p style="margin: 0; color: #856404;"><strong>💡 하루한포스트 핵심 가치</strong><br>
        → <strong>콘텐츠(텍스트) 자동 생성</strong>: 브랜드 정보 입력만으로 플랫폼별 최적화된 텍스트 완성<br>
        → <strong>시간 절약</strong>: 30분 작업이 3분으로 단축 (이미지는 AI 도구로 빠르게 제작)<br>
        → <strong>즉시 활용</strong>: 복사 버튼 한 번으로 바로 포스팅 가능</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 준비 단계</h4>
        <p>✅ 브랜드 프로필 저장 (타겟층, 톤앤매너, 연락처)</p>
        <p>✅ 키워드 준비 (제품명, 특징, 혜택 등)</p>
        <p style="margin-bottom: 0;">✅ 참고 이미지 업로드 (선택사항)</p>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 콘텐츠 생성</h4>
        <p>✅ 플랫폼 선택 (블로그/인스타 피드/인스타 릴스/유튜브...)</p>
        <p>✅ 생성 버튼 클릭 → 3~5초 대기</p>
        <p style="margin-bottom: 0;">✅ 결과 확인 (제목, 본문, 해시태그)</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 활용 단계</h4>
        <p><strong>Step 1: 📋 복사 버튼</strong> 클릭 → 텍스트 전체 복사 완료</p>
        <p><strong>Step 2: 🖼️ 이미지 준비</strong> (3가지 옵션)<br>
        • 옵션 A: AI 이미지 생성 (Midjourney, DALL-E, Adobe Firefly)<br>
        • 옵션 B: 무료 이미지 사이트에서 다운로드 → <strong>🔗 무료 리소스 탭</strong> 참고<br>
        • 옵션 C: Canva/Figma로 직접 제작</p>
        <p style="margin-bottom: 0;"><strong>Step 3: 🚀 플랫폼별 업로드</strong><br>
        → 각 플랫폼 가이드 참고 (블로그, 인스타, 유튜브 등)</p>
      </div>

      <h4 style="margin-top: 30px;">💡 핵심 포인트</h4>
      <ul style="line-height: 1.8;">
        <li>모든 플랫폼은 <strong>복사 → 이미지 준비 → 업로드</strong> 3단계 공통</li>
        <li>이미지는 <strong>AI 이미지 생성 도구 + 무료 다운로드 + 직접 제작</strong> 조합 활용</li>
        <li>플랫폼별 상세 가이드는 아래 각 탭에서 확인</li>
      </ul>
    `
  },
  {
    id: 'blog',
    title: '<i class="fas fa-blog"></i> 블로그 활용법',
    icon: '<i class="fas fa-blog"></i>',
    description: '네이버/티스토리 블로그 포스팅 방법',
    content: `
      <h3>✅ 블로그 콘텐츠 활용법 (3단계)</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> 블로그 콘텐츠 텍스트 자동 생성 (제목, 본문, 해시태그)<br>
        <strong>✍️ 내가 할 일:</strong> 이미지 준비 (AI 도구 활용) + 복사 붙여넣기 + 발행</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 콘텐츠 복사</h4>
        <p style="margin-bottom: 0;">📋 <strong>복사</strong> 버튼 클릭 → 전체 텍스트 복사 완료</p>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 이미지 준비</h4>
        <p><strong>옵션 1:</strong> AI 이미지 생성 (추천!)</p>
        <p>• <strong>Midjourney</strong>: 고품질 AI 이미지 생성<br>• <strong>DALL-E</strong>: OpenAI 이미지 생성<br>• <strong>Adobe Firefly</strong>: 상업적 사용 가능<br>→ 하루한포스트 콘텐츠 기반으로 프롬프트 작성</p>
        <p><strong>옵션 2:</strong> 무료 이미지 다운로드</p>
        <p>• Unsplash, Pexels, Pixabay</p>
        <p style="margin-bottom: 0;"><strong>옵션 3:</strong> Canva/Figma로 직접 제작</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 네이버 블로그 포스팅</h4>
        <p>• <a href="https://blog.naver.com" target="_blank" style="color: white; text-decoration: underline; font-weight: bold;">blog.naver.com</a> 접속 → 글쓰기</p>
        <p>• 복사한 텍스트 붙여넣기</p>
        <p>• 이미지 삽입 (본문 중간중간 배치)</p>
        <p style="margin-bottom: 0;">• 발행 ✅</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li>이미지 배치: <strong>서론 앞</strong> 대표 이미지 1개, <strong>본론 중간</strong> 관련 이미지 2~3개</li>
        <li>해시태그는 본문 <strong>맨 아래</strong> 추가</li>
        <li>제목 60자 이내, 이미지 3~5개, 본문 1,500자 이상 → SEO 유리</li>
      </ul>
    `
  },
  {
    id: 'brunch',
    title: '<i class="fas fa-book-open"></i> 브런치 활용법',
    icon: '<i class="fas fa-book-open"></i>',
    description: '브런치 스토리텔링 포스팅 방법',
    content: `
      <h3>✅ 브런치 포스팅 (3단계)</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> 브런치 스토리텔링 텍스트 자동 생성<br>
        <strong>✍️ 내가 할 일:</strong> AI로 고품질 이미지 준비 + 복사 붙여넣기 + 발행</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 콘텐츠 복사</h4>
        <p style="margin-bottom: 0;">📋 <strong>복사</strong> 버튼 클릭 → 전체 텍스트 복사 완료</p>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 이미지 준비</h4>
        <p>• <strong>AI 이미지 생성</strong> (Midjourney, DALL-E, Adobe Firefly)<br>→ 하루한포스트 콘텐츠 기반으로 프롬프트 작성</p>
        <p style="margin-bottom: 0;">• <strong>고해상도 필수</strong> (브런치는 이미지 품질 중요)<br>• 또는 고품질 무료 이미지 사용 (Unsplash, Pexels)</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 브런치 업로드</h4>
        <p>• <a href="https://brunch.co.kr" target="_blank" style="color: white; text-decoration: underline; font-weight: bold;">brunch.co.kr</a> 접속 → 글쓰기</p>
        <p>• 복사한 텍스트 붙여넣기</p>
        <p>• 대표 이미지 1개 + 본문 이미지 3~5개 삽입</p>
        <p>• 태그 5~10개 추가</p>
        <p style="margin-bottom: 0;">• 발행 ✅</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li>브런치는 <strong>"스토리텔링"</strong> 중심 → 감성적 문체 효과적</li>
        <li>첫 문단이 미리보기로 노출 → <strong>흥미로운 도입부 필수</strong></li>
        <li>시리즈로 묶으면 연속 조회수 ↑</li>
      </ul>
    `
  },
  {
    id: 'instagram-feed',
    title: '<i class="fab fa-instagram"></i> 인스타그램 피드 활용법',
    icon: '<i class="fab fa-instagram"></i>',
    description: '인스타그램 피드 포스팅 방법',
    content: `
      <h3>✅ 인스타그램 피드 게시 (3단계)</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> 캐션 + 해시태그 자동 생성<br>
        <strong>✍️ 내가 할 일:</strong> AI로 이미지 준비 + 복사 붙여놓기 + 게시</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 이미지 준비</h4>
        <p><strong>옵션 1:</strong> AI 이미지 생성 (추천!)</p>
        <p>• <strong>Midjourney</strong>, <strong>DALL-E</strong>, <strong>Adobe Firefly</strong><br>→ 하루한포스트 캡션 기반으로 프롬프트 작성</p>
        <p><strong>옵션 2:</strong> 무료 이미지 사이트</p>
        <p>• Unsplash, Pexels, Pixabay</p>
        <p style="margin-bottom: 0;"><strong>옵션 3:</strong> Canva 템플릿 활용</p>
      </div>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 본문 & 해시태그 복사</h4>
        <p style="margin-bottom: 0;">📋 <strong>복사</strong> 버튼 클릭 → 캡션 + 해시태그 복사 완료</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 인스타그램 앱에서 게시</h4>
        <p>• 인스타그램 앱 열기 → 하단 <strong>+</strong> 버튼</p>
        <p>• 이미지 선택 (정사각형 또는 세로형)</p>
        <p>• 필터/편집 (선택사항)</p>
        <p>• 다음 → 복사한 캡션 붙여넣기</p>
        <p style="margin-bottom: 0;">• 공유 ✅</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li>해시태그 <strong>20~30개</strong> (권장 10~15개)</li>
        <li>캡션 첫 줄이 중요 → <strong>강력한 hook</strong> 필수</li>
        <li>단일 이미지가 도달률 높음</li>
        <li>게시 후 <strong>10분 이내</strong> 댓글/답글 → 알고리즘 우대</li>
      </ul>
    `
  },
  {
    id: 'instagram-reels',
    title: '<i class="fas fa-film"></i> 인스타그램 릴스 활용법',
    icon: '<i class="fas fa-film"></i>',
    description: '생성된 릴스 스크립트로 영상을 제작하는 방법',
    content: `
      <h3>✅ 릴스 영상 제작 3단계</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> 릴스 스크립트 자동 생성 (장면별 구성)<br>
        <strong>✍️ 내가 할 일:</strong> AI 영상 도구로 빠르게 제작 + 업로드</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 스크립트 확인</h4>
        <p style="margin-bottom: 0;">• 생성된 스크립트를 읽어보고 수정이 필요하면 수정하세요<br>• 각 장면별로 나눠져 있습니다</p>
      </div>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 영상 제작</h4>
        <p><strong>방법 1: AI 영상 생성 (가장 빠름, 추천!)</strong></p>
        <p>• <strong>Runway Gen-2</strong>: AI 비디오 생성<br>• <strong>Pika Labs</strong>: 텍스트 → 비디오<br>• <strong>HeyGen</strong>: AI 아바타 영상<br>• <strong>Leonardo.ai</strong>: 이미지 애니메이션<br>→ 하루한포스트 스크립트를 AI 도구에 입력</p>
        <p><strong>방법 2: 직접 촬영</strong></p>
        <p>• 스마트폰으로 9:16 세로 영상 촬영<br>• 스크립트대로 장면별로 촬영</p>
        <p><strong>방법 3: 편집 툴 활용</strong></p>
        <p style="margin-bottom: 0;">• <strong>CapCut</strong> (무료): 초보자 추천<br>• <strong>InShot</strong> (무료): 간단한 편집<br>• <strong>Canva</strong> (일부 무료): 템플릿 활용</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 릴스 업로드</h4>
        <p style="margin-bottom: 0;">• 인스타그램 앱 → 릴스 탭 → + 버튼<br>• 영상 업로드 → 음악/자막 추가<br>• 본문/해시태그 붙여넣기 → 공유</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li>릴스 길이는 <strong>15~30초</strong>가 가장 좋습니다</li>
        <li>첫 <strong>3초 안에 시선을 사로잡으세요</strong></li>
        <li><strong>트렌디한 음악</strong>을 사용하면 노출이 증가합니다</li>
        <li>자막은 <strong>필수</strong>입니다 (소리 없이 보는 사람이 많음)</li>
      </ul>
    `
  },
  {
    id: 'youtube-shorts',
    title: '<i class="fab fa-youtube"></i> 유튜브 쇼츠 활용법',
    icon: '<i class="fab fa-youtube"></i>',
    description: '생성된 쇼츠 스크립트로 영상을 제작하는 방법',
    content: `
      <h3>✅ 유튜브 쇼츠 제작 3단계</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> 쇼츠 스크립트 자동 생성 (Hook-본문-CTA)<br>
        <strong>✍️ 내가 할 일:</strong> AI 영상 생성 또는 촬영/편집 + 업로드</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #ff0000 0%, #ff4444 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 스크립트 확인</h4>
        <p style="margin-bottom: 0;">• 생성된 스크립트를 확인하고 필요시 수정<br>• Hook → 본문 → CTA 구조를 유지하세요</p>
      </div>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 영상 제작</h4>
        <p><strong>방법 1: AI 영상 생성 (가장 빠름, 추천!)</strong></p>
        <p>• <strong>Runway Gen-2</strong>: AI 비디오 생성<br>• <strong>Pika Labs</strong>: 텍스트 → 비디오<br>• <strong>D-ID</strong>: AI 아바타 영상<br>→ 하루한포스트 스크립트를 AI 도구에 입력</p>
        <p><strong>방법 2: 직접 촬영</strong></p>
        <p style="margin-bottom: 0;">• 스마트폰 세로 모드 (9:16)<br>• 스크립트를 읽으면서 촬영<br>• CapCut (무료)으로 자막/효과 추가</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 쇼츠 업로드</h4>
        <p style="margin-bottom: 0;">• 유튜브 앱/웹 → + 버튼 → 쇼츠 동영상 만들기<br>• 영상 업로드 → 제목/설명 입력<br>• #Shorts 해시태그 필수 추가 → 게시</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li>쇼츠는 <strong>60초 이내</strong>여야 합니다</li>
        <li>제목은 <strong>40자 이내</strong>로 간결하게</li>
        <li>썸네일은 <strong>자동 생성</strong>되지만 직접 설정도 가능합니다</li>
        <li><strong>#Shorts</strong> 해시태그는 필수입니다</li>
      </ul>
    `
  },
  {
    id: 'youtube-long',
    title: '<i class="fas fa-video"></i> 유튜브 롱폼 활용법',
    icon: '<i class="fas fa-video"></i>',
    description: '생성된 스토리보드로 롱폼 영상을 제작하는 방법',
    content: `
      <h3>✅ 유튜브 롱폼 제작 3단계</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> 롱폼 영상 스토리보드 자동 생성 (장면별 구성)<br>
        <strong>✍️ 내가 할 일:</strong> AI 영상 생성 또는 촬영/편집 + 업로드</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #ff0000 0%, #ff4444 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 스토리보드 확인</h4>
        <p style="margin-bottom: 0;">• 생성된 스토리보드를 확인하세요<br>• 각 장면별 설명과 타임라인이 포함되어 있습니다</p>
      </div>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 영상 제작 방법 선택</h4>
        <p><strong>방법 1: AI 영상 생성 (추천 ⭐)</strong></p>
        <p>• <strong>Runway Gen-2</strong>: AI 비디오 생성<br>• <strong>Pika Labs</strong>: 텍스트 → 비디오<br>• <strong>HeyGen</strong>: AI 아바타 영상<br>• <strong>Leonardo.ai</strong>: 이미지 → 비디오</p>
        <p><strong>방법 2: 직접 제작</strong></p>
        <p style="margin-bottom: 0;">• 스마트폰/카메라로 촬영<br>• CapCut, DaVinci Resolve 등으로 편집</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 유튜브 업로드</h4>
        <p style="margin-bottom: 0;">• 유튜브 스튜디오: <a href="https://studio.youtube.com" target="_blank" style="color: white; text-decoration: underline;">studio.youtube.com</a><br>• 만들기 → 동영상 업로드<br>• 제목/설명/태그/썸네일 설정 → 게시</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li>제목은 <strong>60자 이내</strong>, 클릭을 유도하는 문구 사용</li>
        <li>썸네일은 <strong>1280x720 (16:9)</strong> 비율로 제작</li>
        <li>설명란에 <strong>타임스탬프</strong>를 추가하면 시청 시간이 증가합니다</li>
        <li>태그는 <strong>10~15개</strong>가 적당합니다</li>
      </ul>
    `
  },
  {
    id: 'linkedin',
    title: '<i class="fab fa-linkedin"></i> 링크드인 활용법',
    icon: '<i class="fab fa-linkedin"></i>',
    description: 'B2B/전문가 네트워킹 포스팅 방법',
    content: `
      <h3>✅ 링크드인 포스팅 (3단계)</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> 전문가 네트워킹 콘텐츠 자동 생성<br>
        <strong>✍️ 내가 할 일:</strong> 비즈니스 이미지 준비 + 복사 붙여놓기 + 게시</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 콘텐츠 복사</h4>
        <p style="margin-bottom: 0;">📋 <strong>복사</strong> 버튼 클릭 → 전체 텍스트 복사 완료</p>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 이미지 준비</h4>
        <p>• 비즈니스 관련 고품질 이미지 또는 인포그래픽</p>
        <p style="margin-bottom: 0;">• 데이터/통계 자료가 있으면 신뢰도↑</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 링크드인 업로드</h4>
        <p>• <a href="https://linkedin.com" target="_blank" style="color: white; text-decoration: underline; font-weight: bold;">linkedin.com</a> 접속 → 게시물 작성</p>
        <p>• 본문 붙여넣기 (3,000자 제한)</p>
        <p>• 이미지 1~9장 업로드</p>
        <p style="margin-bottom: 0;">• 해시태그 3~5개 추가 → 게시 ✅</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li>첫 3줄이 미리보기 → <strong>핵심 메시지를 맨 앞에</strong></li>
        <li><strong>질문형 마무리</strong>로 댓글 유도 (예: "여러분은 어떻게 생각하시나요?")</li>
        <li>데이터/통계 인용 시 신뢰도가 크게 상승합니다</li>
        <li>최적 업로드 시간: <strong>평일 오전 8~10시</strong></li>
      </ul>
    `
  },
  {
    id: 'kakaotalk',
    title: '<i class="fas fa-comment-dots"></i> 카카오톡 채널 활용법',
    icon: '<i class="fas fa-comment-dots"></i>',
    description: '카카오톡 채널 메시지 발송 방법',
    content: `
      <h3>✅ 카카오톡 채널 메시지 발송 (3단계)</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> 카카오톡 채널 메시지 자동 생성<br>
        <strong>✍️ 내가 할 일:</strong> 복사 붙여놓기 + 발송</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 콘텐츠 복사</h4>
        <p style="margin-bottom: 0;">📋 <strong>복사</strong> 버튼 클릭 → 전체 텍스트 복사 완료</p>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 이미지 준비</h4>
        <p>• 이미지 1~5장 준비 (정사각형 권장)</p>
        <p style="margin-bottom: 0;">• 모바일 최적화 (작은 화면에서도 보기 좋게)</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 카카오톡 채널 발송</h4>
        <p>• <a href="https://center-pf.kakao.com" target="_blank" style="color: white; text-decoration: underline; font-weight: bold;">center-pf.kakao.com</a> 접속 → 관리자센터</p>
        <p>• "메시지 보내기" 클릭</p>
        <p>• 텍스트 붙여넣기 (1,000자 제한)</p>
        <p>• 이미지 첨부, 버튼 링크 설정 (선택)</p>
        <p style="margin-bottom: 0;">• 전송 완료 ✅</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li>제목은 <strong>25자 이내</strong> (알림 표시 영역)</li>
        <li><strong>버튼 링크</strong> 활용 (홈페이지/쇼핑몰 이동)</li>
        <li>최적 발송 시간: <strong>평일 12~1시, 저녁 8~9시</strong></li>
        <li>⚠️ 과도한 발송 시 차단율↑ → <strong>주 2~3회 권장</strong></li>
      </ul>
    `
  },
  {
    id: 'threads',
    title: '<i class="fas fa-at"></i> 스레드 활용법',
    icon: '<i class="fas fa-at"></i>',
    description: '스레드(Threads) 포스팅 방법',
    content: `
      <h3>✅ 스레드 포스팅 (3단계)</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> 스레드 콘텐츠 자동 생성<br>
        <strong>✍️ 내가 할 일:</strong> 복사 붙여놓기 + 게시</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 콘텐츠 복사</h4>
        <p style="margin-bottom: 0;">📋 <strong>복사</strong> 버튼 클릭 → 전체 텍스트 복사 완료</p>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 이미지 준비</h4>
        <p>• 이미지 최대 10장</p>
        <p style="margin-bottom: 0;">• 정사각형 또는 세로형 권장</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 스레드 업로드</h4>
        <p>• <a href="https://threads.net" target="_blank" style="color: white; text-decoration: underline; font-weight: bold;">threads.net</a> 접속 또는 앱 실행</p>
        <p>• 새 스레드 작성 버튼 클릭</p>
        <p>• 텍스트 붙여넣기 (500자/개 제한)</p>
        <p>• 긴 글은 여러 개로 분할 (연속 게시)</p>
        <p style="margin-bottom: 0;">• 이미지 첨부 → 게시 ✅</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li><strong>첫 스레드가 가장 중요</strong> → 핵심 메시지를 맨 앞에</li>
        <li>해시태그는 <strong>2~3개</strong>가 적당</li>
        <li>댓글/리포스트로 확산 가능</li>
        <li>인스타그램 팔로워에게 <strong>자동 노출</strong> (연동 시)</li>
      </ul>
    `
  },
  {
    id: 'twitter',
    title: '<span style="font-size: 1.2rem; font-weight: 600;">𝕏</span> 트위터(X) 활용법',
    icon: '<span style="font-size: 1.2rem; font-weight: 600;">𝕏</span>',
    description: '트위터(X) 포스팅 및 스레드 작성 방법',
    content: `
      <h3>✅ 트위터(X) 포스팅 (3단계)</h3>
      <div style="background: #e7f3ff; padding: 12px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 10px 0;">
        <p style="margin: 0; color: #0d47a1; font-size: 14px;"><strong>🚀 하루한포스트가 해주는 것:</strong> X(트위터) 콘텐츠 자동 생성 (280자 제한 준수)<br>
        <strong>✍️ 내가 할 일:</strong> 복사 붙여넣기 + 게시</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">1️⃣ 콘텐츠 복사</h4>
        <p style="margin-bottom: 0;">📋 <strong>복사</strong> 버튼 클릭 → 전체 텍스트 복사 완료</p>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">2️⃣ 이미지 준비</h4>
        <p>• 이미지 최대 4장</p>
        <p style="margin-bottom: 0;">• 가로형 또는 정사각형 권장</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">3️⃣ 트위터 업로드</h4>
        <p>• <a href="https://x.com" target="_blank" style="color: white; text-decoration: underline; font-weight: bold;">x.com</a> 또는 <a href="https://twitter.com" target="_blank" style="color: white; text-decoration: underline;">twitter.com</a> 접속</p>
        <p>• "무슨 일이 일어나고 있나요?" 클릭</p>
        <p>• 텍스트 붙여넣기 (280자 제한, 한글 약 140자)</p>
        <p>• <strong>긴 글은 스레드로 분할</strong> (+ 버튼 클릭)</p>
        <p style="margin-bottom: 0;">• 이미지 첨부 → 트윗 완료 ✅</p>
      </div>

      <h4 style="margin-top: 30px;">💡 꿀팁</h4>
      <ul style="line-height: 1.8;">
        <li>280자를 꽉 채우면 리드율↓ → <strong>간결하게</strong> 작성</li>
        <li>스레드는 <strong>1~5개</strong>가 적당</li>
        <li>해시태그는 <strong>최대 3개</strong></li>
        <li>이미지/GIF 포함 시 참여율 <strong>2배↑</strong></li>
        <li>최적 시간: <strong>평일 9~11시, 19~21시</strong></li>
      </ul>
      
      <h4 style="margin-top: 30px;">📝 스레드 작성법</h4>
      <ol style="line-height: 1.8;">
        <li>첫 트윗 작성 후 <strong>+ 버튼</strong> 클릭</li>
        <li>두 번째 트윗 작성 (연속)</li>
        <li>필요시 세 번째, 네 번째 추가</li>
        <li>전체 작성 완료 후 <strong>"모두 트윗하기"</strong> 클릭</li>
      </ol>
    `
  },
  {
    id: 'free-images',
    title: '<i class="fas fa-images"></i> 무료 리소스 활용하기 (20개)',
    icon: '<i class="fas fa-images"></i>',
    description: '이미지, 디자인, 비디오, 음악, 유틸리티 무료 리소스 20개',
    content: `
      <h3>✅ 무료 리소스 활용하기 (20개 사이트)</h3>
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">📷 사진 전문 사이트 (5개)</h4>
        <p><strong>1. Unsplash</strong> (가장 인기)<br>
        <a href="https://unsplash.com" target="_blank" style="color: white; text-decoration: underline;">unsplash.com</a><br>
        • 고품질 사진, 상업적 사용 가능, 출처 표기 권장</p>
        
        <p><strong>2. Pexels</strong> (다양한 카테고리)<br>
        <a href="https://www.pexels.com" target="_blank" style="color: white; text-decoration: underline;">pexels.com</a><br>
        • 사진 + 비디오, 상업적 사용 가능, 출처 표기 불필요</p>
        
        <p><strong>3. Pixabay</strong> (1백만+ 이미지)<br>
        <a href="https://pixabay.com" target="_blank" style="color: white; text-decoration: underline;">pixabay.com</a><br>
        • 사진 + 일러스트, 상업적 사용 가능, 출처 표기 불필요</p>
        
        <p><strong>4. Burst</strong> (Shopify 제공)<br>
        <a href="https://burst.shopify.com" target="_blank" style="color: white; text-decoration: underline;">burst.shopify.com</a><br>
        • 상업적 사용 가능, 무료, 고품질 이미지</p>
        
        <p style="margin-bottom: 0;"><strong>5. StockSnap</strong> (CC0 라이선스)<br>
        <a href="https://stocksnap.io" target="_blank" style="color: white; text-decoration: underline;">stocksnap.io</a><br>
        • 고품질 사진, 출처 표기 불필요</p>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">🎨 디자인 리소스 (5개)</h4>
        <p><strong>6. Freepik</strong> (벡터 + 사진)<br>
        <a href="https://www.freepik.com" target="_blank" style="color: white; text-decoration: underline;">freepik.com</a><br>
        • 벡터 + 사진, 무료 계정 제한 있음, 출처 표기 필요</p>
        
        <p><strong>7. Canva</strong> (디자인 툴)<br>
        <a href="https://www.canva.com" target="_blank" style="color: white; text-decoration: underline;">canva.com</a><br>
        • 디자인 툴 + 무료 템플릿, 일부 유료, 바로 편집 가능</p>
        
        <p><strong>8. Flaticon</strong> (아이콘 전문)<br>
        <a href="https://www.flaticon.com" target="_blank" style="color: white; text-decoration: underline;">flaticon.com</a><br>
        • 아이콘 전문, 무료 계정 10개/일, 출처 표기 필요</p>
        
        <p><strong>9. Vecteezy</strong> (벡터 그래픽)<br>
        <a href="https://www.vecteezy.com" target="_blank" style="color: white; text-decoration: underline;">vecteezy.com</a><br>
        • 벡터 그래픽, 일부 무료, 출처 표기 필요</p>
        
        <p style="margin-bottom: 0;"><strong>10. unDraw</strong> (오픈소스 일러스트)<br>
        <a href="https://undraw.co" target="_blank" style="color: white; text-decoration: underline;">undraw.co</a><br>
        • 오픈소스 일러스트, 상업적 사용 가능, 색상 커스터마이징 가능</p>
      </div>

      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">🎬 비디오 리소스 (3개)</h4>
        <p><strong>11. Coverr</strong> (무료 배경 비디오)<br>
        <a href="https://coverr.co" target="_blank" style="color: white; text-decoration: underline;">coverr.co</a><br>
        • 무료 배경 비디오, 상업적 사용 가능</p>
        
        <p><strong>12. Videvo</strong> (무료 영상 클립)<br>
        <a href="https://www.videvo.net" target="_blank" style="color: white; text-decoration: underline;">videvo.net</a><br>
        • 무료 영상 클립, 일부 출처 표기 필요</p>
        
        <p style="margin-bottom: 0;"><strong>13. Mixkit</strong> (비디오 + 음악)<br>
        <a href="https://mixkit.co" target="_blank" style="color: white; text-decoration: underline;">mixkit.co</a><br>
        • 비디오 + 음악, 상업적 사용 가능, 출처 표기 불필요</p>
      </div>

      <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
        <h4 style="margin-top: 0;">🎵 음악 & 효과음 (3개)</h4>
        <p><strong>14. YouTube Audio Library</strong><br>
        <a href="https://studio.youtube.com" target="_blank" style="color: white; text-decoration: underline;">studio.youtube.com</a><br>
        • 유튜브 제공 무료 음악 + 효과음</p>
        
        <p><strong>15. Epidemic Sound</strong> (30일 무료 체험)<br>
        <a href="https://www.epidemicsound.com" target="_blank" style="color: white; text-decoration: underline;">epidemicsound.com</a><br>
        • 일부 무료, 대부분 구독 필요</p>
        
        <p style="margin-bottom: 0;"><strong>16. Bensound</strong> (무료 음악)<br>
        <a href="https://www.bensound.com" target="_blank" style="color: white; text-decoration: underline;">bensound.com</a><br>
        • 무료 음악, 출처 표기 필요</p>
      </div>

      <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); padding: 20px; border-radius: 12px; color: #333; margin: 20px 0;">
        <h4 style="margin-top: 0;">🔧 유틸리티 (4개)</h4>
        <p><strong>17. Remove.bg</strong> (AI 배경 제거)<br>
        <a href="https://www.remove.bg" target="_blank" style="color: #333; text-decoration: underline;">remove.bg</a><br>
        • AI 배경 제거, 무료 계정 제한 있음</p>
        
        <p><strong>18. TinyPNG</strong> (이미지 압축)<br>
        <a href="https://tinypng.com" target="_blank" style="color: #333; text-decoration: underline;">tinypng.com</a><br>
        • 이미지 압축, 무료</p>
        
        <p><strong>19. Photopea</strong> (온라인 포토샵)<br>
        <a href="https://www.photopea.com" target="_blank" style="color: #333; text-decoration: underline;">photopea.com</a><br>
        • 온라인 포토샵 대체, 무료 (광고 있음)</p>
        
        <p style="margin-bottom: 0;"><strong>20. Coolors</strong> (컬러 팔레트)<br>
        <a href="https://coolors.co" target="_blank" style="color: #333; text-decoration: underline;">coolors.co</a><br>
        • 컬러 팔레트 생성, 무료</p>
      </div>

      <h4 style="margin-top: 30px;">💡 라이선스 주의사항</h4>
      <ul style="line-height: 1.8;">
        <li><strong>상업적 사용 가능</strong> 여부를 확인하세요</li>
        <li><strong>출처 표기 필요</strong> 여부를 확인하세요</li>
        <li><strong>무료 계정 제한</strong> (일일 다운로드 수, 해상도 등)</li>
        <li>안전하게 사용하려면: <strong>Unsplash, Pexels, Pixabay, Mixkit</strong> 추천</li>
      </ul>
    `
  }
];

// 도움말 가이드 모달 HTML 생성
function createHelpGuideModal() {
  const modalHTML = `
    <div id="helpGuideModal" class="modal" style="display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.6);">
      <div class="modal-content" style="position: relative; background-color: #fff; margin: 2% auto; padding: 0; border-radius: 16px; width: 90%; max-width: 900px; max-height: 90vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- 헤더 -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 16px 16px 0 0; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 24px; font-weight: bold;">📘 도움말 가이드</h2>
            <button onclick="closeHelpGuideModal()" style="background: none; border: none; color: white; font-size: 28px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">&times;</button>
          </div>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">콘텐츠 생성 후 활용 방법을 확인하세요</p>
        </div>

        <!-- 가이드 목록 -->
        <div style="padding: 24px;">
          <div id="helpGuideList" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            <!-- 버튼들이 여기에 동적으로 추가됩니다 -->
          </div>
        </div>

        <!-- 상세 내용 -->
        <div id="helpGuideDetail" style="display: none; padding: 24px; border-top: 1px solid #e5e7eb;">
          <button onclick="showHelpGuideList()" style="background: #f3f4f6; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; margin-bottom: 16px; font-size: 14px;">
            ← 목록으로 돌아가기
          </button>
          <div id="helpGuideContent" style="line-height: 1.8; color: #374151;">
            <!-- 가이드 내용이 여기에 표시됩니다 -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // 가이드 버튼 렌더링
  renderHelpGuideButtons();
}

// 도움말 가이드 버튼 렌더링
function renderHelpGuideButtons() {
  const listContainer = document.getElementById('helpGuideList');
  if (!listContainer) return;
  
  listContainer.innerHTML = HELP_GUIDES.map(guide => `
    <button onclick="showHelpGuideDetail('${guide.id}')" style="
      background: white;
      border: 2px solid #e5e7eb;
      padding: 20px;
      border-radius: 12px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    " onmouseover="this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)';" onmouseout="this.style.borderColor='#e5e7eb'; this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)';">
      <div style="font-size: 32px; margin-bottom: 8px;">${guide.icon}</div>
      <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">${guide.title}</h4>
      <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">${guide.description}</p>
    </button>
  `).join('');
}

// 도움말 가이드 모달 열기
function openHelpGuideModal() {
  const modal = document.getElementById('helpGuideModal');
  if (!modal) {
    createHelpGuideModal();
  }
  
  showHelpGuideList();
  document.getElementById('helpGuideModal').style.display = 'flex';
  console.log('✅ 도움말 가이드 모달 열림');
}

// 도움말 가이드 모달 닫기
function closeHelpGuideModal() {
  const modal = document.getElementById('helpGuideModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// 가이드 목록 표시
function showHelpGuideList() {
  document.getElementById('helpGuideList').style.display = 'grid';
  document.getElementById('helpGuideDetail').style.display = 'none';
}

// 가이드 상세 표시
function showHelpGuideDetail(guideId) {
  const guide = HELP_GUIDES.find(g => g.id === guideId);
  if (!guide) return;
  
  document.getElementById('helpGuideList').style.display = 'none';
  document.getElementById('helpGuideDetail').style.display = 'block';
  document.getElementById('helpGuideContent').innerHTML = guide.content;
  
  console.log(`✅ 도움말 가이드 표시: ${guide.title}`);
}

// 모달 외부 클릭 시 닫기
window.addEventListener('click', (event) => {
  const modal = document.getElementById('helpGuideModal');
  if (event.target === modal) {
    closeHelpGuideModal();
  }
});

// 전역 노출
window.openHelpGuideModal = openHelpGuideModal;
window.closeHelpGuideModal = closeHelpGuideModal;
window.showHelpGuideList = showHelpGuideList;
window.showHelpGuideDetail = showHelpGuideDetail;

console.log('✅ 도움말 가이드 기능 로드 완료');


// ============================================================
// 📘 도움말 버튼 동적 추가 (AI 빠른 설정 버튼 옆에 추가)
// ============================================================

// ❌ aiWorkflowBtn 도움말 버튼 추가 기능 제거
// YouTube Analyzer에 aiWorkflowBtn이 없어 무한 재시도 경고 발생
// 이 기능은 다른 페이지용이므로 완전 제거
/*
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    addHelpGuideButton();
  }, 1000);
});

function addHelpGuideButton() {
  const aiWorkflowBtn = document.getElementById('aiWorkflowBtn');
  
  if (!aiWorkflowBtn) {
    console.log('⚠️ aiWorkflowBtn을 찾을 수 없습니다. 나중에 재시도합니다.');
    setTimeout(addHelpGuideButton, 5000);
    return;
  }
  
  if (document.getElementById('helpGuideBtn')) {
    console.log('✅ 도움말 버튼이 이미 존재합니다');
    return;
  }
  
  const parentContainer = aiWorkflowBtn.parentElement;
  
  if (!parentContainer) {
    console.error('❌ AI 빠른 설정 버튼의 부모 요소를 찾을 수 없습니다');
    return;
  }
  
  const helpBtn = document.createElement('button');
  helpBtn.id = 'helpGuideBtn';
  helpBtn.onclick = openHelpGuideModal;
  
  const aiWorkflowBtnClasses = aiWorkflowBtn.className;
  helpBtn.className = aiWorkflowBtnClasses;
  
  helpBtn.innerHTML = `
    <i class="fas fa-question-circle" style="margin-right: 8px;"></i>
    도움말
  `;
  
  aiWorkflowBtn.parentNode.insertBefore(helpBtn, aiWorkflowBtn.nextSibling);
  
  console.log('✅ 도움말 버튼이 성공적으로 추가되었습니다');
}
*/

// ========================================
// 🖼 이미지 도구 → 콘텐츠 폼 연결 유틸 함수
// 이미지 검색/AI 생성 결과를 현재 활성 콘텐츠 블록의 이미지 영역에 삽입
// ========================================
window.addImageToContentForm = async function(imageUrl) {
  try {
    // 현재 활성 콘텐츠 블록 인덱스 찾기 (첫 번째 블록 기본)
    const contentBlocks = document.querySelectorAll('[id^="imagePreview_"]');
    const targetIndex = 0; // 첫 번째 콘텐츠 블록에 삽입

    // URL에서 이미지를 fetch하여 File 객체로 변환
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const fileName = 'tool-image-' + Date.now() + '.png';
    const file = new File([blob], fileName, { type: blob.type || 'image/png' });

    // 기존 handleContentImageUpload와 동일한 방식으로 이미지 추가
    if (!window.contentBlocks) window.contentBlocks = [{ images: [], platforms: [] }];
    if (!window.contentBlocks[targetIndex]) window.contentBlocks[targetIndex] = { images: [], platforms: [] };

    const images = window.contentBlocks[targetIndex].images || [];
    if (images.length >= 10) {
      alert('이미지는 최대 10장까지 업로드할 수 있습니다.');
      return false;
    }

    // FileReader로 base64 변환
    const reader = new FileReader();
    reader.onload = function(e) {
      images.push(e.target.result);
      window.contentBlocks[targetIndex].images = images;

      // 미리보기 업데이트
      const previewArea = document.getElementById('imagePreview_' + targetIndex);
      if (previewArea) {
        const img = document.createElement('div');
        img.className = 'relative';
        img.innerHTML = '<img src="' + e.target.result + '" class="w-full h-16 object-cover rounded-lg border" alt="이미지 ' + images.length + '"><button onclick="removeContentImage(' + targetIndex + ',' + (images.length - 1) + ')" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">×</button>';
        previewArea.appendChild(img);
      }

      console.log('✅ [이미지 도구→폼] 이미지 추가 완료 (콘텐츠 블록 ' + targetIndex + ', 총 ' + images.length + '장)');

      // 토스트 알림
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-semibold';
      toast.textContent = '✅ 콘텐츠 폼에 이미지가 추가되었습니다 (' + images.length + '/10)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    };
    reader.readAsDataURL(file);
    return true;
  } catch (error) {
    console.error('❌ [이미지 도구→폼] 이미지 추가 실패:', error);
    alert('이미지를 콘텐츠 폼에 추가하는 데 실패했습니다.');
    return false;
  }
};
