// 다국어 지원 시스템
const translations = {
  ko: {
    // 헤더
    title: '멀티 플랫폼 콘텐츠 자동 생성기',
    subtitle: '원하는 플랫폼만 선택하여 AI 콘텐츠 생성 ✨',
    
    // 버튼
    saveProfile: '프로필 저장',
    loadProfile: '프로필 불러오기',
    viewHistory: '히스토리',
    generate: '콘텐츠 생성하기',
    copy: '복사',
    download: '다운로드',
    close: '닫기',
    delete: '삭제',
    
    // 입력 필드
    imageUpload: '이미지 업로드',
    imageUploadDesc: '최대 10장, 총 50MB',
    clickToSelect: '클릭하여 이미지 선택',
    orDragDrop: '또는 드래그앤드롭',
    brandName: '브랜드명',
    brandNamePlaceholder: '예: 올리브영',
    companyName: '회사 상호명',
    companyNamePlaceholder: '예: (주)올리브영',
    businessType: '사업자 유형',
    businessTypeNone: '선택 안 함',
    businessTypePersonal: '개인',
    businessTypeCorporation: '법인',
    businessTypeFreelancer: '프리랜서',
    location: '지역',
    locationNone: '선택 안 함',
    targetGender: '타겟 성별',
    targetGenderAll: '전체',
    targetGenderMale: '남성',
    targetGenderFemale: '여성',
    contact: '연락처',
    contactPlaceholder: '예: 010-1234-5678',
    website: '웹사이트',
    websitePlaceholder: '예: https://www.example.com',
    sns: 'SNS 계정',
    snsPlaceholder: '예: @brandname',
    keywords: '핵심 키워드',
    keywordsPlaceholder: '예: 스킨케어, 보습, 민감성피부 (쉼표로 구분)',
    tone: '톤앤매너',
    toneCasual: '캐주얼',
    toneProfessional: '전문가',
    toneEmotional: '감성',
    targetAge: '타겟 연령대',
    industry: '산업 분야',
    industryBeauty: '뷰티',
    industryFashion: '패션',
    industryFnB: 'F&B',
    industryIT: 'IT/테크',
    industryHealthcare: '헬스케어',
    industryLifestyle: '라이프스타일',
    
    // 플랫폼
    selectPlatforms: '생성할 플랫폼 선택 (최소 1개)',
    platformBlog: '네이버 블로그',
    platformInstagram: '인스타그램',
    platformThreads: '스레드',
    platformYoutube: '유튜브 숏폼',
    
    // 비용
    estimatedCost: '예상 비용',
    images: '이미지',
    platforms: '플랫폼',
    
    // 상태
    generating: '콘텐츠 생성 중...',
    generatingDesc: '(약 30-60초 소요)',
    results: '생성 결과',
    characterCount: '글자 수',
    
    // 모달
    savedProfiles: '저장된 프로필',
    contentHistory: '생성 히스토리',
    noProfiles: '저장된 프로필이 없습니다.',
    noHistory: '생성 히스토리가 없습니다.',
    
    // 메시지
    profileSaved: '프로필이 저장되었습니다!',
    profileLoaded: '프로필이 적용되었습니다!',
    profileDeleted: '프로필이 삭제되었습니다.',
    historyLoaded: '히스토리가 로드되었습니다!',
    historyDeleted: '히스토리가 삭제되었습니다.',
    copied: '클립보드에 복사되었습니다!',
    generateSuccess: '콘텐츠 생성 완료!',
    
    // 에러
    errorMaxImages: '최대 10장까지 업로드 가능합니다.',
    errorMaxSize: '전체 이미지 크기는 50MB를 초과할 수 없습니다.',
    errorRequired: '브랜드명과 핵심 키워드를 입력해주세요.',
    errorMinPlatform: '최소 1개 플랫폼을 선택해주세요.',
    errorMinImages: '최소 1장의 이미지를 업로드해주세요.',
    errorGeneration: '오류 발생',
    
    // 프롬프트
    promptProfileName: '프로필 이름을 입력하세요:',
    confirmDelete: '이 프로필을 삭제하시겠습니까?',
    confirmDeleteHistory: '이 히스토리를 삭제하시겠습니까?',
  },
  
  en: {
    // Header
    title: 'Multi-Platform Content Generator',
    subtitle: 'Generate AI Content for Selected Platforms ✨',
    
    // Buttons
    saveProfile: 'Save Profile',
    loadProfile: 'Load Profile',
    viewHistory: 'History',
    generate: 'Generate Content',
    copy: 'Copy',
    download: 'Download',
    close: 'Close',
    delete: 'Delete',
    
    // Input Fields
    imageUpload: 'Upload Images',
    imageUploadDesc: 'Max 10 images, 50MB total',
    clickToSelect: 'Click to select images',
    orDragDrop: 'or drag and drop',
    brandName: 'Brand Name',
    brandNamePlaceholder: 'e.g., Olive Young',
    companyName: 'Company Name',
    companyNamePlaceholder: 'e.g., Olive Young Inc.',
    businessType: 'Business Type',
    businessTypeNone: 'None',
    businessTypePersonal: 'Personal',
    businessTypeCorporation: 'Corporation',
    businessTypeFreelancer: 'Freelancer',
    location: 'Location',
    locationNone: 'None',
    targetGender: 'Target Gender',
    targetGenderAll: 'All',
    targetGenderMale: 'Male',
    targetGenderFemale: 'Female',
    contact: 'Contact',
    contactPlaceholder: 'e.g., 010-1234-5678',
    website: 'Website',
    websitePlaceholder: 'e.g., https://www.example.com',
    sns: 'SNS Account',
    snsPlaceholder: 'e.g., @brandname',
    keywords: 'Keywords',
    keywordsPlaceholder: 'e.g., skincare, moisturizer, sensitive skin (comma-separated)',
    tone: 'Tone',
    toneCasual: 'Casual',
    toneProfessional: 'Professional',
    toneEmotional: 'Emotional',
    targetAge: 'Target Age',
    industry: 'Industry',
    industryBeauty: 'Beauty',
    industryFashion: 'Fashion',
    industryFnB: 'F&B',
    industryIT: 'IT/Tech',
    industryHealthcare: 'Healthcare',
    industryLifestyle: 'Lifestyle',
    
    // Platforms
    selectPlatforms: 'Select Platforms (min 1)',
    platformBlog: 'Naver Blog',
    platformInstagram: 'Instagram',
    platformThreads: 'Threads',
    platformYoutube: 'YouTube Shorts',
    
    // Cost
    estimatedCost: 'Estimated Cost',
    images: 'Images',
    platforms: 'Platforms',
    
    // Status
    generating: 'Generating content...',
    generatingDesc: '(Takes about 30-60 seconds)',
    results: 'Results',
    characterCount: 'Characters',
    
    // Modals
    savedProfiles: 'Saved Profiles',
    contentHistory: 'Content History',
    noProfiles: 'No saved profiles.',
    noHistory: 'No content history.',
    
    // Messages
    profileSaved: 'Profile saved!',
    profileLoaded: 'Profile loaded!',
    profileDeleted: 'Profile deleted.',
    historyLoaded: 'History loaded!',
    historyDeleted: 'History deleted.',
    copied: 'Copied to clipboard!',
    generateSuccess: 'Content generated!',
    
    // Errors
    errorMaxImages: 'Maximum 10 images allowed.',
    errorMaxSize: 'Total image size cannot exceed 50MB.',
    errorRequired: 'Please enter brand name and keywords.',
    errorMinPlatform: 'Please select at least 1 platform.',
    errorMinImages: 'Please upload at least 1 image.',
    errorGeneration: 'Error occurred',
    
    // Prompts
    promptProfileName: 'Enter profile name:',
    confirmDelete: 'Delete this profile?',
    confirmDeleteHistory: 'Delete this history?',
  },
  
  ja: {
    // ヘッダー
    title: 'マルチプラットフォームコンテンツジェネレーター',
    subtitle: 'AIで選択したプラットフォーム用コンテンツを生成 ✨',
    
    // ボタン
    saveProfile: 'プロフィール保存',
    loadProfile: 'プロフィール読込',
    viewHistory: '履歴',
    generate: 'コンテンツ生成',
    copy: 'コピー',
    download: 'ダウンロード',
    close: '閉じる',
    delete: '削除',
    
    // 入力フィールド
    imageUpload: '画像アップロード',
    imageUploadDesc: '最大10枚、合計50MB',
    clickToSelect: 'クリックして画像を選択',
    orDragDrop: 'またはドラッグ&ドロップ',
    brandName: 'ブランド名',
    brandNamePlaceholder: '例：オリーブヤング',
    companyName: '会社名',
    companyNamePlaceholder: '例：株式会社オリーブヤング',
    businessType: '事業者タイプ',
    businessTypeNone: '選択なし',
    businessTypePersonal: '個人',
    businessTypeCorporation: '法人',
    businessTypeFreelancer: 'フリーランス',
    location: '地域',
    locationNone: '選択なし',
    targetGender: 'ターゲット性別',
    targetGenderAll: '全体',
    targetGenderMale: '男性',
    targetGenderFemale: '女性',
    contact: '連絡先',
    contactPlaceholder: '例：090-1234-5678',
    website: 'ウェブサイト',
    websitePlaceholder: '例：https://www.example.com',
    sns: 'SNSアカウント',
    snsPlaceholder: '例：@brandname',
    keywords: 'キーワード',
    keywordsPlaceholder: '例：スキンケア、保湿、敏感肌（カンマ区切り）',
    tone: 'トーン',
    toneCasual: 'カジュアル',
    toneProfessional: 'プロフェッショナル',
    toneEmotional: '感情的',
    targetAge: 'ターゲット年齢',
    industry: '業界',
    industryBeauty: 'ビューティー',
    industryFashion: 'ファッション',
    industryFnB: '飲食',
    industryIT: 'IT/テック',
    industryHealthcare: 'ヘルスケア',
    industryLifestyle: 'ライフスタイル',
    
    // プラットフォーム
    selectPlatforms: 'プラットフォーム選択（最低1つ）',
    platformBlog: 'ネイバーブログ',
    platformInstagram: 'インスタグラム',
    platformThreads: 'スレッド',
    platformYoutube: 'YouTubeショート',
    
    // コスト
    estimatedCost: '推定コスト',
    images: '画像',
    platforms: 'プラットフォーム',
    
    // ステータス
    generating: 'コンテンツ生成中...',
    generatingDesc: '（約30〜60秒かかります）',
    results: '結果',
    characterCount: '文字数',
    
    // モーダル
    savedProfiles: '保存されたプロフィール',
    contentHistory: 'コンテンツ履歴',
    noProfiles: '保存されたプロフィールはありません。',
    noHistory: 'コンテンツ履歴はありません。',
    
    // メッセージ
    profileSaved: 'プロフィールが保存されました！',
    profileLoaded: 'プロフィールが適用されました！',
    profileDeleted: 'プロフィールが削除されました。',
    historyLoaded: '履歴が読み込まれました！',
    historyDeleted: '履歴が削除されました。',
    copied: 'クリップボードにコピーしました！',
    generateSuccess: 'コンテンツ生成完了！',
    
    // エラー
    errorMaxImages: '最大10枚までアップロード可能です。',
    errorMaxSize: '画像の合計サイズは50MBを超えることはできません。',
    errorRequired: 'ブランド名とキーワードを入力してください。',
    errorMinPlatform: '最低1つのプラットフォームを選択してください。',
    errorMinImages: '最低1枚の画像をアップロードしてください。',
    errorGeneration: 'エラーが発生しました',
    
    // プロンプト
    promptProfileName: 'プロフィール名を入力してください：',
    confirmDelete: 'このプロフィールを削除しますか？',
    confirmDeleteHistory: 'この履歴を削除しますか？',
  },
  
  zh: {
    // 标题
    title: '多平台内容自动生成器',
    subtitle: '为选定平台生成AI内容 ✨',
    
    // 按钮
    saveProfile: '保存资料',
    loadProfile: '加载资料',
    viewHistory: '历史记录',
    generate: '生成内容',
    copy: '复制',
    download: '下载',
    close: '关闭',
    delete: '删除',
    
    // 输入字段
    imageUpload: '上传图片',
    imageUploadDesc: '最多10张，总计50MB',
    clickToSelect: '点击选择图片',
    orDragDrop: '或拖放',
    brandName: '品牌名称',
    brandNamePlaceholder: '例如：橄榄杨',
    companyName: '公司名称',
    companyNamePlaceholder: '例如：橄榄杨公司',
    businessType: '企业类型',
    businessTypeNone: '无',
    businessTypePersonal: '个人',
    businessTypeCorporation: '公司',
    businessTypeFreelancer: '自由职业',
    location: '地区',
    locationNone: '无',
    targetGender: '目标性别',
    targetGenderAll: '全部',
    targetGenderMale: '男性',
    targetGenderFemale: '女性',
    contact: '联系方式',
    contactPlaceholder: '例如：010-1234-5678',
    website: '网站',
    websitePlaceholder: '例如：https://www.example.com',
    sns: 'SNS账号',
    snsPlaceholder: '例如：@brandname',
    keywords: '关键词',
    keywordsPlaceholder: '例如：护肤，保湿，敏感肌（用逗号分隔）',
    tone: '语气',
    toneCasual: '休闲',
    toneProfessional: '专业',
    toneEmotional: '情感',
    targetAge: '目标年龄',
    industry: '行业',
    industryBeauty: '美容',
    industryFashion: '时尚',
    industryFnB: '餐饮',
    industryIT: 'IT/科技',
    industryHealthcare: '医疗保健',
    industryLifestyle: '生活方式',
    
    // 平台
    selectPlatforms: '选择平台（至少1个）',
    platformBlog: 'Naver博客',
    platformInstagram: 'Instagram',
    platformThreads: 'Threads',
    platformYoutube: 'YouTube短视频',
    
    // 费用
    estimatedCost: '预估费用',
    images: '图片',
    platforms: '平台',
    
    // 状态
    generating: '内容生成中...',
    generatingDesc: '（大约需要30-60秒）',
    results: '结果',
    characterCount: '字符数',
    
    // 模态框
    savedProfiles: '已保存的资料',
    contentHistory: '内容历史',
    noProfiles: '没有保存的资料。',
    noHistory: '没有内容历史。',
    
    // 消息
    profileSaved: '资料已保存！',
    profileLoaded: '资料已加载！',
    profileDeleted: '资料已删除。',
    historyLoaded: '历史已加载！',
    historyDeleted: '历史已删除。',
    copied: '已复制到剪贴板！',
    generateSuccess: '内容生成完成！',
    
    // 错误
    errorMaxImages: '最多可上传10张图片。',
    errorMaxSize: '图片总大小不能超过50MB。',
    errorRequired: '请输入品牌名称和关键词。',
    errorMinPlatform: '请至少选择1个平台。',
    errorMinImages: '请至少上传1张图片。',
    errorGeneration: '发生错误',
    
    // 提示
    promptProfileName: '请输入资料名称：',
    confirmDelete: '删除此资料？',
    confirmDeleteHistory: '删除此历史记录？',
  }
};

// 현재 언어
let currentLang = localStorage.getItem('app_language') || 'ko';

// 번역 함수
function t(key) {
  return translations[currentLang][key] || translations['ko'][key] || key;
}

// 언어 변경 함수
function changeLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('app_language', lang);
  updatePageLanguage();
}

// 페이지 언어 업데이트
function updatePageLanguage() {
  // 모든 data-i18n 속성을 가진 요소 업데이트
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
      el.placeholder = t(key);
    } else if (el.tagName === 'OPTION') {
      el.textContent = t(key);
    } else {
      el.textContent = t(key);
    }
  });
  
  // 특수 케이스 처리
  document.title = t('title');
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  updatePageLanguage();
});

// 전역 노출
window.i18n = {
  t,
  changeLanguage,
  getCurrentLang: () => currentLang,
  updatePageLanguage
};
