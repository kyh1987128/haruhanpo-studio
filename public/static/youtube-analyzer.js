// YouTube 분석기 프론트엔드 JavaScript

// Supabase 클라이언트 초기화
const SUPABASE_URL = 'https://gmjbsndricdogtqsovnb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtamJzbmRyaWNkb2d0cXNvdm5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzE1ODksImV4cCI6MjA4Mjg0NzU4OX0.naZnsBPYd84pdLoLAh-mEz_qerl5UakYs2FfVumnEJw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let selectedAnalysisType = 'video-stats'; // 기본값
let currentUser = null;
let authToken = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadUserCredits();
  await loadHistory();
});

// 인증 확인
async function checkAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    alert('로그인이 필요합니다.');
    window.location.href = '/';
    return;
  }
  
  currentUser = session.user;
  authToken = session.access_token;
  
  console.log('✅ 인증 성공:', currentUser.email);
}

// 사용자 크레딧 로드
async function loadUserCredits() {
  if (!currentUser) return;
  
  const { data, error } = await supabase
    .from('users')
    .select('credits')
    .eq('id', currentUser.id)
    .single();
  
  if (data) {
    document.getElementById('user-credits').textContent = data.credits || 0;
  }
}

// 분석 타입 선택
function selectAnalysisType(type) {
  selectedAnalysisType = type;
  
  // 모든 버튼 스타일 초기화
  document.querySelectorAll('.analysis-type-btn').forEach(btn => {
    btn.classList.remove('border-blue-600', 'bg-blue-50');
    btn.classList.add('border-gray-200');
  });
  
  // 선택된 버튼 스타일 적용
  const selectedBtn = document.querySelector(`[data-type="${type}"]`);
  if (selectedBtn) {
    selectedBtn.classList.remove('border-gray-200');
    selectedBtn.classList.add('border-blue-600', 'bg-blue-50');
  }
}

// 분석 시작
async function startAnalysis() {
  const url = document.getElementById('youtube-url').value.trim();
  
  if (!url) {
    alert('YouTube URL을 입력해주세요.');
    return;
  }
  
  // UI 상태 변경
  document.getElementById('analyze-btn').disabled = true;
  document.getElementById('loading-section').classList.remove('hidden');
  document.getElementById('result-section').classList.add('hidden');
  
  try {
    const response = await fetch('/api/youtube/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        videoUrl: url,
        analysisType: selectedAnalysisType
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || '분석에 실패했습니다.');
    }
    
    // 결과 표시
    displayResult(result.data);
    
    // 크레딧 갱신
    await loadUserCredits();
    
    // 히스토리 갱신
    await loadHistory();
    
  } catch (error) {
    console.error('분석 오류:', error);
    alert(error.message || '분석 중 오류가 발생했습니다.');
  } finally {
    document.getElementById('analyze-btn').disabled = false;
    document.getElementById('loading-section').classList.add('hidden');
  }
}

// 결과 표시
function displayResult(data) {
  const section = document.getElementById('result-section');
  
  const wasCachedBadge = data.wasCached 
    ? '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"><i class="fas fa-bolt mr-1"></i>캐시됨 (0 크레딧)</span>'
    : `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"><i class="fas fa-coins mr-1"></i>${data.creditsUsed} 크레딧 사용</span>`;
  
  section.innerHTML = `
    <div class="p-6">
      <!-- 영상 정보 -->
      <div class="flex items-start space-x-4 mb-6 pb-6 border-b">
        <img src="${data.videoInfo.thumbnailUrl || 'https://via.placeholder.com/320x180?text=YouTube'}" 
             alt="Thumbnail" 
             class="w-64 rounded-lg shadow-sm" />
        <div class="flex-1">
          <div class="flex items-start justify-between mb-2">
            <h3 class="text-2xl font-bold text-gray-900">${data.videoInfo.title}</h3>
            ${wasCachedBadge}
          </div>
          <p class="text-gray-600 mb-4">
            <i class="fas fa-user-circle mr-2"></i>${data.videoInfo.channel}
          </p>
          <div class="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div class="text-gray-500">조회수</div>
              <div class="font-semibold text-gray-900">${formatNumber(data.videoInfo.views)}</div>
            </div>
            <div>
              <div class="text-gray-500">좋아요</div>
              <div class="font-semibold text-gray-900">${formatNumber(data.videoInfo.likes)}</div>
            </div>
            <div>
              <div class="text-gray-500">댓글</div>
              <div class="font-semibold text-gray-900">${formatNumber(data.videoInfo.comments)}</div>
            </div>
            <div>
              <div class="text-gray-500">구독자</div>
              <div class="font-semibold text-gray-900">${formatNumber(data.videoInfo.subscriberCount)}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- AI 요약 -->
      <div class="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded-r-lg">
        <h4 class="font-semibold text-blue-900 mb-2">
          <i class="fas fa-robot mr-2"></i>AI 분석 요약
        </h4>
        <p class="text-blue-800">${data.aiSummary}</p>
      </div>
      
      <!-- 상세 분석 결과 -->
      <div class="mb-6">
        <h4 class="font-semibold text-gray-900 mb-4">
          <i class="fas fa-chart-line mr-2"></i>상세 분석 결과
        </h4>
        <div class="bg-gray-50 p-4 rounded-lg">
          <pre class="text-sm text-gray-800 whitespace-pre-wrap">${JSON.stringify(data.analysisResult, null, 2)}</pre>
        </div>
      </div>
      
      <!-- 액션 버튼 -->
      <div class="flex space-x-4">
        <button onclick="copyResult()" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition">
          <i class="fas fa-copy mr-2"></i>결과 복사
        </button>
        <button onclick="downloadResult()" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition">
          <i class="fas fa-download mr-2"></i>다운로드
        </button>
      </div>
    </div>
  `;
  
  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth' });
  
  // 전역 변수에 결과 저장 (복사/다운로드용)
  window.currentResult = data;
}

// 히스토리 로드
async function loadHistory() {
  if (!authToken) return;
  
  try {
    const response = await fetch('/api/youtube/history?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const result = await response.json();
    
    if (result.success && result.data.items.length > 0) {
      displayHistory(result.data.items);
    } else {
      document.getElementById('history-list').innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-inbox text-4xl mb-2"></i>
          <p>아직 분석한 영상이 없습니다.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('히스토리 로드 오류:', error);
  }
}

// 히스토리 표시
function displayHistory(items) {
  const html = items.map(item => `
    <div class="border-b last:border-0 py-4 hover:bg-gray-50 transition">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <h4 class="font-semibold text-gray-900 mb-1">${item.video_title}</h4>
          <div class="flex items-center space-x-4 text-sm text-gray-600">
            <span><i class="fas fa-play-circle mr-1"></i>${item.channel_name}</span>
            <span><i class="fas fa-chart-bar mr-1"></i>${getAnalysisTypeName(item.analysis_type)}</span>
            <span><i class="fas fa-clock mr-1"></i>${formatDate(item.created_at)}</span>
            ${item.was_cached ? '<span class="text-green-600"><i class="fas fa-bolt mr-1"></i>캐시됨</span>' : `<span class="text-blue-600">${item.credits_used} 크레딧</span>`}
          </div>
        </div>
        <button onclick="viewHistory('${item.id}')" class="ml-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">
          <i class="fas fa-eye mr-1"></i>보기
        </button>
      </div>
    </div>
  `).join('');
  
  document.getElementById('history-list').innerHTML = html;
}

// 히스토리 상세 보기
async function viewHistory(id) {
  try {
    const response = await fetch(`/api/youtube/history/${id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      displayResult({
        videoId: result.data.video_id,
        videoInfo: {
          title: result.data.video_title,
          channel: result.data.channel_name,
          channelId: result.data.channel_id,
          views: result.data.views,
          likes: result.data.likes,
          comments: result.data.comments,
          subscriberCount: result.data.subscriber_count,
          duration: result.data.duration,
          publishedAt: result.data.published_at,
          thumbnailUrl: null
        },
        analysisResult: result.data.analysis_result,
        aiSummary: result.data.ai_summary,
        creditsUsed: result.data.credits_used,
        wasCached: result.data.was_cached,
        cacheExpiresAt: null
      });
    }
  } catch (error) {
    console.error('히스토리 조회 오류:', error);
    alert('히스토리를 불러올 수 없습니다.');
  }
}

// 결과 복사
function copyResult() {
  if (!window.currentResult) return;
  
  const text = `
영상 제목: ${window.currentResult.videoInfo.title}
채널: ${window.currentResult.videoInfo.channel}

AI 분석 요약:
${window.currentResult.aiSummary}

상세 결과:
${JSON.stringify(window.currentResult.analysisResult, null, 2)}
  `.trim();
  
  navigator.clipboard.writeText(text).then(() => {
    alert('결과가 클립보드에 복사되었습니다!');
  });
}

// 결과 다운로드
function downloadResult() {
  if (!window.currentResult) return;
  
  const data = {
    videoInfo: window.currentResult.videoInfo,
    aiSummary: window.currentResult.aiSummary,
    analysisResult: window.currentResult.analysisResult,
    analyzedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `youtube-analysis-${window.currentResult.videoId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 유틸리티 함수
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return '방금 전';
  if (diff < 3600) return Math.floor(diff / 60) + '분 전';
  if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
  if (diff < 604800) return Math.floor(diff / 86400) + '일 전';
  return date.toLocaleDateString('ko-KR');
}

function getAnalysisTypeName(type) {
  const names = {
    'video-stats': '영상 통계',
    'success-factors': '성공 요인',
    'title-optimization': '제목 최적화',
    'sentiment-analysis': '감성 분석',
    'channel-strategy': '채널 전략',
    'video-ideas': '영상 아이디어',
    'competitor': '경쟁자 분석'
  };
  return names[type] || type;
}

// 페이지 떠나기 전 확인
window.addEventListener('beforeunload', (e) => {
  if (document.getElementById('loading-section').classList.contains('hidden') === false) {
    e.preventDefault();
    e.returnValue = '';
  }
});
