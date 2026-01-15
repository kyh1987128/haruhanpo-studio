// 통계 대시보드 로드 및 관리

let statsDashboardLoaded = false;

// HTML 로드 및 삽입
async function loadStatsDashboardHTML() {
  if (statsDashboardLoaded) return;
  
  try {
    const response = await fetch('/static/stats-dashboard.html');
    const html = await response.text();
    
    // leftPanelMemberFeatures 바로 위에 삽입
    const targetElement = document.getElementById('leftPanelMemberFeatures');
    if (targetElement) {
      targetElement.insertAdjacentHTML('beforebegin', html);
      statsDashboardLoaded = true;
    }
  } catch (error) {
    console.error('통계 대시보드 HTML 로드 실패:', error);
  }
}

// 콘텐츠 생성 통계 업데이트
async function updateContentStats(platform, creditsUsed) {
  if (!window.supabaseClient || !window.currentUser?.id) return;
  
  try {
    const { error } = await window.supabaseClient
      .rpc('update_content_generation_stats', {
        p_user_id: window.currentUser.id,
        p_platform: platform,
        p_credits_used: creditsUsed,
        p_generation_time: 0
      });
    
    if (error) {
      // DB 함수가 아직 생성되지 않은 경우 무시
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('⚠️ 통계 함수 미생성 (정상): DB 스키마 실행 필요');
        return;
      }
      throw error;
    }
    
    console.log('✅ 통계 업데이트 완료:', { platform, creditsUsed });
    
    // 통계 대시보드가 열려있으면 새로고침
    if (window.statsLoaded && typeof window.refreshStats === 'function') {
      window.refreshStats();
    }
  } catch (error) {
    console.warn('⚠️ 통계 업데이트 실패 (무시됨):', error.message);
  }
}

// 워크플로우 사용 통계 업데이트
async function updateWorkflowStats(workflowId) {
  if (!window.supabaseClient || !window.currentUser?.id) return;
  
  try {
    const { error } = await window.supabaseClient
      .rpc('update_workflow_usage_stats', {
        p_user_id: window.currentUser.id,
        p_workflow_id: workflowId
      });
    
    if (error) {
      // DB 함수가 아직 생성되지 않은 경우 무시
      if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.warn('⚠️ 워크플로우 통계 함수 미생성 (정상): DB 스키마 실행 필요');
        return;
      }
      throw error;
    }
    
    console.log('✅ 워크플로우 통계 업데이트 완료:', workflowId);
  } catch (error) {
    console.warn('⚠️ 워크플로우 통계 업데이트 실패 (무시됨):', error.message);
  }
}

// 초기화: 사용자 로그인 시 통계 대시보드 표시
window.addEventListener('userUpdated', async (e) => {
  const user = e.detail;
  if (user && !user.isGuest) {
    // HTML 먼저 로드
    await loadStatsDashboardHTML();
  }
});

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async () => {
  // 사용자가 이미 로그인되어 있으면 대시보드 로드
  if (window.currentUser && !window.currentUser.isGuest) {
    await loadStatsDashboardHTML();
  }
});

// 전역 함수 노출
window.loadStatsDashboardHTML = loadStatsDashboardHTML;
window.updateContentStats = updateContentStats;
window.updateWorkflowStats = updateWorkflowStats;
