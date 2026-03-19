/**
 * 스토리메이커 비주얼 카드 이미지 매핑
 * Unsplash/Pexels 무료 이미지 사용
 * storymaker.js 보다 먼저 로드되어야 함
 */

const SM_CARDS = {
  // ========================================
  // Step 1: 장르톤
  // ========================================
  genreTone: [
    { id: 'romance',  label: '로맨스',  img: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=260&fit=crop' },
    { id: 'thriller', label: '스릴러',  img: 'https://images.unsplash.com/photo-1509248961620-e3e5c1178ec9?w=400&h=260&fit=crop' },
    { id: 'comedy',   label: '코미디',  img: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=400&h=260&fit=crop' },
    { id: 'horror',   label: '호러',    img: 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=260&fit=crop' },
    { id: 'fantasy',  label: '판타지',  img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=260&fit=crop' },
    { id: 'slice',    label: '일상',    img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=260&fit=crop' },
    { id: 'scifi',    label: 'SF',      img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=260&fit=crop' },
    { id: 'action',   label: '액션',    img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=260&fit=crop' },
  ],

  // ========================================
  // Step 2: 캐릭터 - 나이대
  // ========================================
  ageGroup: [
    { id: 'child',  label: '아동',   img: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=300&h=200&fit=crop' },
    { id: 'teen',   label: '10대',   img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=200&fit=crop' },
    { id: 'twenty', label: '20대',   img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop' },
    { id: 'thirty', label: '30대',   img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=200&fit=crop' },
    { id: 'forty',  label: '40대',   img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=200&fit=crop' },
    { id: 'fifty',  label: '50대+',  img: 'https://images.unsplash.com/photo-1559526323-cb2f2fe2591b?w=300&h=200&fit=crop' },
  ],

  // ========================================
  // Step 2: 캐릭터 - 성별
  // ========================================
  gender: [
    { id: 'male',   label: '남성', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=200&fit=crop' },
    { id: 'female', label: '여성', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=200&fit=crop' },
  ],

  // ========================================
  // Step 2: 캐릭터 - 의상
  // ========================================
  costume: [
    { id: 'casual',      label: '캐주얼',   img: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=300&h=200&fit=crop' },
    { id: 'formal',      label: '정장',     img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&h=200&fit=crop' },
    { id: 'uniform',     label: '교복/유니폼', img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=300&h=200&fit=crop' },
    { id: 'sports',      label: '운동복',   img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop' },
    { id: 'traditional', label: '전통의상', img: 'https://images.unsplash.com/photo-1580397581145-19d541fc8a4c?w=300&h=200&fit=crop' },
    { id: 'workwear',    label: '작업복',   img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&h=200&fit=crop' },
  ],

  // ========================================
  // Step 2: 캐릭터 - 성격 (태그, 이미지 없음)
  // ========================================
  personality: [
    '밝은', '차분한', '냉소적', '열정적', '소심한', '카리스마',
    '유머러스', '신비로운', '따뜻한', '냉정한', '순수한', '반항적',
  ],

  // ========================================
  // Step 2: 로케이션
  // ========================================
  location: [
    { id: 'cafe',       label: '카페',     img: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=260&fit=crop' },
    { id: 'office',     label: '사무실',   img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=260&fit=crop' },
    { id: 'street',     label: '거리/골목', img: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&h=260&fit=crop' },
    { id: 'park',       label: '공원',     img: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&h=260&fit=crop' },
    { id: 'school',     label: '학교',     img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=260&fit=crop' },
    { id: 'subway',     label: '지하철',   img: 'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=400&h=260&fit=crop' },
    { id: 'home',       label: '집/방',    img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=260&fit=crop' },
    { id: 'restaurant', label: '레스토랑', img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=260&fit=crop' },
    { id: 'hospital',   label: '병원',     img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=260&fit=crop' },
    { id: 'beach',      label: '해변',     img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=260&fit=crop' },
    { id: 'forest',     label: '숲/산',    img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=260&fit=crop' },
    { id: 'rooftop',    label: '옥상',     img: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=260&fit=crop' },
  ],

  // ========================================
  // Step 2: 시간대
  // ========================================
  timeOfDay: [
    { id: 'dawn',    label: '새벽',  img: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=300&h=200&fit=crop' },
    { id: 'day',     label: '낮',    img: 'https://images.unsplash.com/photo-1622396481328-9b1b78cdd9fd?w=300&h=200&fit=crop' },
    { id: 'sunset',  label: '석양',  img: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=300&h=200&fit=crop' },
    { id: 'night',   label: '밤',    img: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=300&h=200&fit=crop' },
  ],

  // ========================================
  // Step 2: 촬영 스타일 (드라마/영화용)
  // ========================================
  shootingStyle: [
    { id: 'cinematic', label: '시네마틱',   img: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=260&fit=crop' },
    { id: 'docu',      label: '다큐멘터리', img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=260&fit=crop' },
    { id: 'handheld',  label: '핸드헬드',   img: 'https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=400&h=260&fit=crop' },
    { id: 'drone',     label: '드론/항공',  img: 'https://images.unsplash.com/photo-1506947411487-a56738b4fcc9?w=400&h=260&fit=crop' },
  ],

  // ========================================
  // Step 2: 그림체 (웹툰용)
  // ========================================
  artStyle: [
    { id: 'cute_sd',       label: '귀여운 SD',   img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=260&fit=crop' },
    { id: 'webtoon_clean', label: '깔끔 웹툰풍', img: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=260&fit=crop' },
    { id: 'realistic',     label: '리얼 극화체', img: 'https://images.unsplash.com/photo-1579762715118-a6f1d789a8a5?w=400&h=260&fit=crop' },
    { id: 'simple',        label: '심플 미니멀', img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=260&fit=crop' },
  ],

  // ========================================
  // Step 2: 색감 팔레트
  // ========================================
  colorPalette: [
    { id: 'warm',       label: '웜톤',     colors: ['#FF6B35', '#F7C59F', '#EFEFD0', '#004E89'] },
    { id: 'cool',       label: '쿨톤',     colors: ['#1B4965', '#5FA8D3', '#BEE9E8', '#62B6CB'] },
    { id: 'pastel',     label: '파스텔',   colors: ['#FFB5E8', '#B5DEFF', '#E7FFAC', '#FFC8A2'] },
    { id: 'vivid',      label: '비비드',   colors: ['#FF0054', '#FFD300', '#00FF87', '#0047FF'] },
    { id: 'monochrome', label: '모노크롬', colors: ['#1A1A1A', '#4A4A4A', '#8A8A8A', '#D0D0D0'] },
    { id: 'natural',    label: '자연',     colors: ['#606C38', '#283618', '#FEFAE0', '#DDA15E'] },
  ],
};
