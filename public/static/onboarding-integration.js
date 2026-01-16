// 온보딩 시스템 통합 스크립트
// app-v3-final.js에 추가될 코드

// 1. 사용자 온보딩 상태 확인
async function getUserOnboardingState(userId) {
  try {
    // Supabase에서 사용자 정보 가져오기
    if (!window.supabaseClient) {
      console.error('supabaseClient가 초기화되지 않음');
      return 'EXPERIENCED';
    }
    
    const { data: user, error } = await window.supabaseClient
      .from('users')
      .select('onboarding_completed, content_generated_count, first_visit_date')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // 상태 분류
    if (!user.onboarding_completed && (user.content_generated_count === 0 || !user.content_generated_count)) {
      return 'NEW_USER'; // 신규 사용자
    } else if (user.content_generated_count > 0 && user.content_generated_count < 5) {
      return 'LEARNING'; // 학습 중
    } else {
      return 'EXPERIENCED'; // 숙련자
    }
  } catch (error) {
    console.error('온보딩 상태 확인 실패:', error);
    return 'EXPERIENCED'; // 오류 시 기본값
  }
}

// 2. 온보딩 초기화
async function initOnboarding(userId) {
  const state = await getUserOnboardingState(userId);

  if (state === 'NEW_USER') {
    // 신규 사용자: 풀 온보딩 표시
    showFullOnboarding();
  } else if (state === 'LEARNING') {
    // 학습 중: 간단 팁 토스트
    showLearningTip();
  } else {
    // 숙련자: 마지막 작업 이어서 하기 제안
    showContinueLastWork();
  }
}

// 3. 풀 온보딩 표시
function showFullOnboarding() {
  // 온보딩 HTML 로드
  fetch('/static/onboarding.html')
    .then(res => res.text())
    .then(html => {
      // body에 추가
      const div = document.createElement('div');
      div.innerHTML = html;
      document.body.appendChild(div);
      
      // 온보딩 시작
      setTimeout(() => {
        if (typeof startOnboarding === 'function') {
          startOnboarding();
        }
      }, 500);
    })
    .catch(err => console.error('온보딩 로드 실패:', err));
}

// 4. 학습 팁 토스트
function showLearningTip() {
  const tips = [
    '💡 Tip: AI 키워드 분석 기능을 사용해보세요! (일일 3회 무료)',
    '💡 Tip: 템플릿을 저장하면 다음에 빠르게 생성할 수 있어요',
    '💡 Tip: 여러 플랫폼을 선택하면 한 번에 생성됩니다',
    '💡 Tip: 캘린더에서 생성한 콘텐츠를 확인하세요'
  ];
  
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  
  // 토스트 메시지 표시
  showToast(randomTip, 'info', 5000);
}

// 5. 마지막 작업 이어서 하기 (비활성화)
async function showContinueLastWork() {
  // 환영 팝업 비활성화: 사용자가 대시보드 이동 시 팝업이 부담스럽다는 피드백 반영
  // 필요 시 히스토리에서 직접 확인 가능
  return;
}

// 6. 온보딩 완료 상태 업데이트
async function updateUserOnboardingStatus(completed) {
  try {
    if (!window.supabaseClient) return;
    
    const userId = (await window.supabaseClient.auth.getUser()).data.user?.id;
    if (!userId) return;

    await window.supabaseClient
      .from('users')
      .update({ 
        onboarding_completed: completed,
        last_active_date: new Date().toISOString()
      })
      .eq('id', userId);

    console.log('온보딩 상태 업데이트 완료:', completed);
  } catch (error) {
    console.error('온보딩 상태 업데이트 실패:', error);
  }
}

// 7. 온보딩 데이터로 폼 채우기
function fillFormWithOnboardingData(data) {
  console.log('온보딩 데이터로 폼 채우기:', data);
  
  // 브랜드 이름
  if (data.brand && document.getElementById('brandName')) {
    document.getElementById('brandName').value = data.brand;
  }
  
  // 산업/분야
  if (data.industry && document.getElementById('industry')) {
    document.getElementById('industry').value = data.industry;
  }
  
  // 키워드
  if (data.keywords && document.getElementById('keywords')) {
    document.getElementById('keywords').value = data.keywords;
  }
  
  // 플랫폼 선택
  if (data.platforms && data.platforms.length > 0) {
    data.platforms.forEach(platform => {
      const checkbox = document.querySelector(`input[name="platforms"][value="${platform}"]`);
      if (checkbox) {
        checkbox.checked = true;
        // 체크박스 변경 이벤트 트리거
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
  
  showToast('✅ 설정이 완료되었습니다! 생성 버튼을 눌러주세요.', 'success', 5000);
}

// 8. 콘텐츠 생성 시 카운트 증가
async function incrementContentCount(userId) {
  try {
    if (!window.supabaseClient) {
      console.error('supabaseClient가 초기화되지 않음');
      return;
    }
    await window.supabaseClient.rpc('increment_content_count', { user_id: userId });
    console.log('콘텐츠 생성 카운트 증가');
  } catch (error) {
    console.error('콘텐츠 카운트 증가 실패:', error);
  }
}

// 9. 온보딩 재실행 (설정 페이지에서 호출)
function restartOnboarding() {
  showFullOnboarding();
}

// 전역으로 노출
window.getUserOnboardingState = getUserOnboardingState;
window.initOnboarding = initOnboarding;
window.updateUserOnboardingStatus = updateUserOnboardingStatus;
window.fillFormWithOnboardingData = fillFormWithOnboardingData;
window.incrementContentCount = incrementContentCount;
window.restartOnboarding = restartOnboarding;
