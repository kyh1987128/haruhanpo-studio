// 워크플로우 허브 JavaScript

// 전역 상태
let currentWorkflowCategory = 'sns';
let workflowData = {
  sns: [],
  image_tool: [],
  video_tool: [],
  other_tool: []
};

// HTML 로드 및 삽입
async function loadWorkflowHubHTML() {
  try {
    const response = await fetch('/static/workflow-hub.html');
    const html = await response.text();
    
    // WORKFLOW_HUB_PLACEHOLDER를 찾아서 교체
    const container = document.querySelector('[data-workflow-hub-container]');
    if (container) {
      container.innerHTML = html;
    } else {
      // leftPanelMemberFeatures 바로 아래에 삽입
      const targetElement = document.getElementById('leftPanelMemberFeatures');
      if (targetElement) {
        targetElement.insertAdjacentHTML('afterend', html);
      }
    }
  } catch (error) {
    console.error('워크플로우 허브 HTML 로드 실패:', error);
  }
}

// 아이콘 매핑
const iconMap = {
  sns: {
    instagram: 'fab fa-instagram',
    youtube: 'fab fa-youtube',
    naver_blog: 'fas fa-blog',
    brunch: 'fas fa-pen-fancy',
    tiktok: 'fab fa-tiktok',
    threads: 'fab fa-threads',
    linkedin: 'fab fa-linkedin',
    twitter: 'fab fa-x-twitter',
    facebook: 'fab fa-facebook'
  },
  image_tool: {
    canva: 'fas fa-palette',
    midjourney: 'fas fa-brain',
    dalle: 'fas fa-robot',
    photoshop: 'fas fa-paint-brush',
    figma: 'fas fa-pen-nib',
    default: 'fas fa-image'
  },
  video_tool: {
    capcut: 'fas fa-video',
    runway: 'fas fa-wand-magic-sparkles',
    pika: 'fas fa-sparkles',
    premiere: 'fas fa-film',
    default: 'fas fa-video'
  },
  other_tool: {
    chatgpt: 'fas fa-comments',
    claude: 'fas fa-robot',
    gemini: 'fas fa-gem',
    grok: 'fas fa-brain',
    perplexity: 'fas fa-search',
    default: 'fas fa-robot'
  }
};

// 워크플로우 허브 토글
function toggleWorkflowHub() {
  const content = document.getElementById('workflowContent');
  const toggle = document.getElementById('workflowToggle');
  
  if (content.classList.contains('expanded')) {
    content.classList.remove('expanded');
    toggle.classList.remove('expanded');
  } else {
    content.classList.add('expanded');
    toggle.classList.add('expanded');
    // 처음 열 때 데이터 로드
    if (!workflowData.loaded) {
      loadWorkflowData();
    }
  }
}

// 탭 전환
function switchWorkflowTab(category) {
  currentWorkflowCategory = category;
  
  // 탭 활성화
  document.querySelectorAll('.workflow-tab').forEach(tab => {
    if (tab.dataset.tab === category) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // 리스트 활성화
  document.querySelectorAll('.workflow-list').forEach(list => {
    list.classList.remove('active');
  });
  document.getElementById(`workflowList-${category}`).classList.add('active');
}

// 워크플로우 데이터 로드
async function loadWorkflowData() {
  if (!window.supabaseClient || !window.currentUser?.id) {
    console.log('Supabase 또는 사용자 정보 없음');
    return;
  }

  try {
    // 사용자 워크플로우 가져오기
    const { data: userWorkflows, error } = await window.supabaseClient
      .from('user_workflows')
      .select('*')
      .eq('user_id', window.currentUser.id)
      .order('is_favorite', { ascending: false })
      .order('order_index', { ascending: true });

    if (error) throw error;

    // 카테고리별로 분류
    workflowData = {
      sns: userWorkflows.filter(w => w.category === 'sns'),
      image_tool: userWorkflows.filter(w => w.category === 'image_tool'),
      video_tool: userWorkflows.filter(w => w.category === 'video_tool'),
      other_tool: userWorkflows.filter(w => w.category === 'other_tool'),
      loaded: true
    };

    // UI 업데이트
    renderWorkflowLists();
  } catch (error) {
    console.error('워크플로우 로드 실패:', error);
    showToast('워크플로우를 불러오는데 실패했습니다', 'error');
  }
}

// 워크플로우 리스트 렌더링
function renderWorkflowLists() {
  ['sns', 'image_tool', 'video_tool', 'other_tool'].forEach(category => {
    const items = workflowData[category] || [];
    const container = document.getElementById(`workflowItems-${category}`);
    const emptyState = document.getElementById(`emptyState-${category}`);
    
    if (items.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      container.innerHTML = items.map(item => createWorkflowItemHTML(item)).join('');
    }
  });
}

// 워크플로우 아이템 HTML 생성
function createWorkflowItemHTML(item) {
  const isFavorite = item.is_favorite ? 'active' : '';
  return `
    <div class="workflow-item" onclick="openWorkflowUrl('${item.url}', '${item.id}')">
      <div class="workflow-item-content">
        <div class="workflow-icon">
          <i class="${item.icon || 'fas fa-link'}"></i>
        </div>
        <div>
          <div class="workflow-name">${item.display_name}</div>
          ${item.username ? `<div class="workflow-username">${item.username}</div>` : ''}
        </div>
      </div>
      <div class="workflow-actions">
        <i class="fas fa-star workflow-favorite ${isFavorite}" 
           onclick="event.stopPropagation(); toggleFavorite('${item.id}')"></i>
        <i class="fas fa-trash workflow-delete" 
           onclick="event.stopPropagation(); deleteWorkflow('${item.id}')"></i>
      </div>
    </div>
  `;
}

// 워크플로우 URL 열기 (사용 횟수 증가)
async function openWorkflowUrl(url, workflowId) {
  // 새 탭으로 열기
  window.open(url, '_blank');
  
  // 사용 횟수 증가
  try {
    await window.supabaseClient
      .from('user_workflows')
      .update({
        usage_count: window.supabaseClient.raw('usage_count + 1'),
        last_used_at: new Date().toISOString()
      })
      .eq('id', workflowId);
  } catch (error) {
    console.error('사용 횟수 업데이트 실패:', error);
  }
}

// 즐겨찾기 토글
async function toggleFavorite(workflowId) {
  try {
    // 현재 상태 찾기
    const workflow = Object.values(workflowData)
      .flat()
      .find(w => w.id === workflowId);
    
    if (!workflow) return;

    const newFavoriteState = !workflow.is_favorite;

    const { error } = await window.supabaseClient
      .from('user_workflows')
      .update({ is_favorite: newFavoriteState })
      .eq('id', workflowId);

    if (error) throw error;

    // 로컬 상태 업데이트
    workflow.is_favorite = newFavoriteState;
    
    // UI 업데이트
    renderWorkflowLists();
    
    showToast(
      newFavoriteState ? '⭐ 즐겨찾기에 추가되었습니다' : '즐겨찾기가 해제되었습니다',
      'success'
    );
  } catch (error) {
    console.error('즐겨찾기 토글 실패:', error);
    showToast('즐겨찾기 설정에 실패했습니다', 'error');
  }
}

// 워크플로우 삭제
async function deleteWorkflow(workflowId) {
  if (!confirm('이 도구를 삭제하시겠습니까?')) return;

  try {
    const { error } = await window.supabaseClient
      .from('user_workflows')
      .delete()
      .eq('id', workflowId);

    if (error) throw error;

    // 로컬 상태에서 삭제
    Object.keys(workflowData).forEach(category => {
      if (Array.isArray(workflowData[category])) {
        workflowData[category] = workflowData[category].filter(w => w.id !== workflowId);
      }
    });

    // UI 업데이트
    renderWorkflowLists();
    
    showToast('✅ 도구가 삭제되었습니다', 'success');
  } catch (error) {
    console.error('워크플로우 삭제 실패:', error);
    showToast('도구 삭제에 실패했습니다', 'error');
  }
}

// 워크플로우 모달 열기
function openWorkflowModal(category, workflow = null) {
  currentWorkflowCategory = category;
  const modal = document.getElementById('workflowModal');
  const form = document.getElementById('workflowForm');
  const titleEl = document.getElementById('workflowModalTitle');
  const usernameGroup = document.getElementById('usernameGroup');
  
  // 모달 타이틀 설정
  const categoryNames = {
    sns: 'SNS 채널',
    image_tool: '이미지 AI 도구',
    video_tool: '영상 AI 도구',
    other_tool: '기타 AI 도구'
  };
  titleEl.textContent = workflow ? `${categoryNames[category]} 수정` : `${categoryNames[category]} 추가`;
  
  // SNS 카테고리일 때만 사용자명 필드 표시
  usernameGroup.style.display = category === 'sns' ? 'block' : 'none';
  
  // 아이콘 옵션 로드
  loadIconOptions(category);
  
  // 폼 초기화 또는 데이터 채우기
  if (workflow) {
    document.getElementById('workflowId').value = workflow.id;
    document.getElementById('workflowCategory').value = workflow.category;
    document.getElementById('workflowName').value = workflow.display_name;
    document.getElementById('workflowUrl').value = workflow.url;
    document.getElementById('workflowUsername').value = workflow.username || '';
    document.getElementById('workflowIcon').value = workflow.icon || '';
  } else {
    form.reset();
    document.getElementById('workflowId').value = '';
    document.getElementById('workflowCategory').value = category;
  }
  
  modal.classList.add('active');
}

// 워크플로우 모달 닫기
function closeWorkflowModal() {
  const modal = document.getElementById('workflowModal');
  modal.classList.remove('active');
}

// 아이콘 옵션 로드
function loadIconOptions(category) {
  const iconSelect = document.getElementById('workflowIcon');
  const icons = iconMap[category] || {};
  
  iconSelect.innerHTML = Object.entries(icons).map(([key, value]) => {
    const label = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `<option value="${value}">${label}</option>`;
  }).join('');
}

// 워크플로우 제출
async function handleWorkflowSubmit(event) {
  event.preventDefault();
  
  if (!window.supabaseClient || !window.currentUser?.id) {
    showToast('로그인이 필요합니다', 'warning');
    return;
  }

  const formData = new FormData(event.target);
  const workflowId = formData.get('id');
  const isEdit = !!workflowId;

  const workflowPayload = {
    user_id: window.currentUser.id,
    category: formData.get('category'),
    name: formData.get('display_name').toLowerCase().replace(/\s+/g, '_'),
    display_name: formData.get('display_name'),
    url: formData.get('url'),
    icon: formData.get('icon'),
    username: formData.get('username') || null,
    updated_at: new Date().toISOString()
  };

  try {
    let result;
    
    if (isEdit) {
      // 수정
      result = await window.supabaseClient
        .from('user_workflows')
        .update(workflowPayload)
        .eq('id', workflowId)
        .select()
        .single();
    } else {
      // 추가
      result = await window.supabaseClient
        .from('user_workflows')
        .insert(workflowPayload)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    // 로컬 상태 업데이트
    if (isEdit) {
      const category = workflowPayload.category;
      const index = workflowData[category].findIndex(w => w.id === workflowId);
      if (index !== -1) {
        workflowData[category][index] = result.data;
      }
    } else {
      workflowData[workflowPayload.category].push(result.data);
    }

    // UI 업데이트
    renderWorkflowLists();
    closeWorkflowModal();
    
    showToast(
      isEdit ? '✅ 도구가 수정되었습니다' : '✅ 도구가 추가되었습니다',
      'success'
    );
  } catch (error) {
    console.error('워크플로우 저장 실패:', error);
    showToast('도구 저장에 실패했습니다', 'error');
  }
}

// 초기화: 사용자 로그인 시 워크플로우 허브 표시
window.addEventListener('userUpdated', async (e) => {
  const user = e.detail;
  if (user && !user.isGuest) {
    // HTML 먼저 로드
    await loadWorkflowHubHTML();
    
    // 허브 표시
    const workflowHub = document.getElementById('workflowHub');
    if (workflowHub) {
      workflowHub.classList.remove('hidden');
    }
  }
});

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async () => {
  // 사용자가 이미 로그인되어 있으면 허브 로드
  if (window.currentUser && !window.currentUser.isGuest) {
    await loadWorkflowHubHTML();
    const workflowHub = document.getElementById('workflowHub');
    if (workflowHub) {
      workflowHub.classList.remove('hidden');
    }
  }
});

// 전역 함수 노출
window.toggleWorkflowHub = toggleWorkflowHub;
window.switchWorkflowTab = switchWorkflowTab;
window.openWorkflowModal = openWorkflowModal;
window.closeWorkflowModal = closeWorkflowModal;
window.handleWorkflowSubmit = handleWorkflowSubmit;

// 프로필별 워크플로우 연결 기능
/**
 * 현재 프로필과 워크플로우 연결 정보 저장
 */
window.saveProfileWorkflows = async function(profileName) {
  if (!window.supabaseClient || !window.currentUser?.id) {
    console.warn('❌ 로그인 정보 없음');
    return false;
  }

  try {
    // 현재 활성화된 모든 워크플로우 ID 수집
    const activeWorkflowIds = [];
    
    for (const category in workflowData) {
      const workflows = workflowData[category] || [];
      workflows.forEach(workflow => {
        if (workflow.id) {
          activeWorkflowIds.push(workflow.id);
        }
      });
    }

    console.log(`📝 프로필 "${profileName}"에 워크플로우 연결:`, activeWorkflowIds);

    // 기존 연결 삭제
    await window.supabaseClient
      .from('profile_workflows')
      .delete()
      .eq('user_id', window.currentUser.id)
      .eq('profile_name', profileName);

    // 새로운 연결 추가
    if (activeWorkflowIds.length > 0) {
      const insertData = activeWorkflowIds.map(workflowId => ({
        user_id: window.currentUser.id,
        profile_name: profileName,
        workflow_id: workflowId,
        is_active: true
      }));

      const { error } = await window.supabaseClient
        .from('profile_workflows')
        .insert(insertData);

      if (error) throw error;
    }

    console.log(`✅ 프로필 "${profileName}"에 ${activeWorkflowIds.length}개 워크플로우 연결 완료`);
    return true;
  } catch (error) {
    console.error('❌ 프로필 워크플로우 연결 실패:', error);
    return false;
  }
};

/**
 * 프로필에 연결된 워크플로우 불러오기
 */
window.loadProfileWorkflows = async function(profileName) {
  if (!window.supabaseClient || !window.currentUser?.id) {
    console.warn('❌ 로그인 정보 없음');
    return;
  }

  try {
    console.log(`📖 프로필 "${profileName}"의 워크플로우 불러오기...`);

    // 프로필에 연결된 워크플로우 ID 조회
    const { data: profileWorkflows, error: pwError } = await window.supabaseClient
      .from('profile_workflows')
      .select('workflow_id')
      .eq('user_id', window.currentUser.id)
      .eq('profile_name', profileName)
      .eq('is_active', true);

    if (pwError) throw pwError;

    if (!profileWorkflows || profileWorkflows.length === 0) {
      console.log('📭 연결된 워크플로우 없음');
      return;
    }

    const workflowIds = profileWorkflows.map(pw => pw.workflow_id);
    console.log(`📦 ${workflowIds.length}개 워크플로우 ID 발견:`, workflowIds);

    // 워크플로우 상세 정보 조회
    const { data: workflows, error: wError } = await window.supabaseClient
      .from('user_workflows')
      .select('*')
      .in('id', workflowIds);

    if (wError) throw wError;

    // 카테고리별로 분류
    workflowData = {
      sns: [],
      image_tool: [],
      video_tool: [],
      other_tool: []
    };

    workflows.forEach(workflow => {
      const category = workflow.category;
      if (workflowData[category]) {
        workflowData[category].push(workflow);
      }
    });

    // UI 업데이트
    renderWorkflowLists();
    
    console.log(`✅ 프로필 "${profileName}"의 워크플로우 ${workflows.length}개 로드 완료`);
    showToast(`✅ ${workflows.length}개 워크플로우 로드 완료`, 'success');
  } catch (error) {
    console.error('❌ 프로필 워크플로우 로드 실패:', error);
  }
};
window.openWorkflowUrl = openWorkflowUrl;
window.toggleFavorite = toggleFavorite;
window.deleteWorkflow = deleteWorkflow;
