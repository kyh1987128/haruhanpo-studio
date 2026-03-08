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

// ============================================
// 10. PostFlow 온보딩 투어 (스텝별 하이라이트)
// ============================================

var postflowTourSteps = [
  {
    selector: '#keywords, #topicInput, textarea[name="topic"]',
    fallbackSelector: 'textarea, input[type="text"]',
    title: '1단계: 주제 입력',
    description: '콘텐츠를 만들고 싶은 주제나 키워드를 입력하세요. 이미지를 업로드할 수도 있습니다.',
    position: 'bottom'
  },
  {
    selector: '.platform-checkbox, input[name="platforms"], #platformSelector',
    fallbackSelector: '.platform-grid, [class*="platform"]',
    title: '2단계: 플랫폼 선택',
    description: '콘텐츠를 생성할 SNS 플랫폼을 선택하세요. 여러 개를 동시에 선택할 수 있습니다.',
    position: 'top'
  },
  {
    selector: '#generateBtn, button[type="submit"], .generate-button',
    fallbackSelector: 'button.bg-gradient-to-r, button[class*="purple"]',
    title: '3단계: AI 생성!',
    description: '생성 버튼을 누르면 30초 안에 선택한 플랫폼별 맞춤 콘텐츠가 자동으로 만들어집니다.',
    position: 'top'
  }
];

var currentTourStep = 0;
var tourOverlay = null;
var tourTooltip = null;

function initPostflowTour() {
  // PostFlow 페이지인지 확인
  if (!window.location.pathname.includes('/postflow')) return;

  // NEW_USER 상태인지 확인
  var userId = window.currentUser?.id;
  if (!userId) return;

  getUserOnboardingState(userId).then(function(state) {
    if (state === 'NEW_USER') {
      // 약간의 딜레이 후 투어 시작 (페이지 로드 완료 대기)
      setTimeout(function() { startPostflowTour(); }, 1500);
    }
  });
}

function startPostflowTour() {
  currentTourStep = 0;

  // 오버레이 생성
  tourOverlay = document.createElement('div');
  tourOverlay.id = 'postflow-tour-overlay';
  tourOverlay.innerHTML = '<div class="tour-backdrop"></div>';
  tourOverlay.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;';

  var style = document.createElement('style');
  style.textContent = '\
    .tour-backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998; }\
    .tour-spotlight { position:absolute;z-index:9999;box-shadow:0 0 0 9999px rgba(0,0,0,0.5);border-radius:8px;pointer-events:none; }\
    .tour-tooltip { position:absolute;z-index:10000;background:white;border-radius:16px;padding:20px;max-width:320px;box-shadow:0 20px 60px rgba(0,0,0,0.3);pointer-events:auto; }\
    .tour-tooltip-title { font-size:16px;font-weight:700;color:#7c3aed;margin-bottom:8px; }\
    .tour-tooltip-desc { font-size:14px;color:#4b5563;line-height:1.6;margin-bottom:16px; }\
    .tour-tooltip-actions { display:flex;gap:8px;justify-content:flex-end; }\
    .tour-btn-skip { padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#6b7280;cursor:pointer;background:white; }\
    .tour-btn-skip:hover { background:#f3f4f6; }\
    .tour-btn-next { padding:8px 20px;border:none;border-radius:8px;font-size:13px;color:white;cursor:pointer;background:linear-gradient(135deg,#7c3aed,#3b82f6);font-weight:600; }\
    .tour-btn-next:hover { opacity:0.9; }\
    .tour-steps { display:flex;gap:6px;justify-content:center;margin-bottom:12px; }\
    .tour-step-dot { width:8px;height:8px;border-radius:50%;background:#d1d5db; }\
    .tour-step-dot.active { background:#7c3aed;width:24px;border-radius:4px; }\
  ';
  document.head.appendChild(style);
  document.body.appendChild(tourOverlay);

  showTourStep(0);
}

function findTourElement(step) {
  var el = document.querySelector(step.selector);
  if (!el && step.fallbackSelector) {
    el = document.querySelector(step.fallbackSelector);
  }
  return el;
}

function showTourStep(stepIndex) {
  if (stepIndex >= postflowTourSteps.length) {
    endPostflowTour();
    return;
  }

  currentTourStep = stepIndex;
  var step = postflowTourSteps[stepIndex];
  var targetEl = findTourElement(step);

  // 이전 스포트라이트/툴팁 제거
  var oldSpotlight = document.querySelector('.tour-spotlight');
  var oldTooltip = document.querySelector('.tour-tooltip');
  if (oldSpotlight) oldSpotlight.remove();
  if (oldTooltip) oldTooltip.remove();

  if (!targetEl) {
    // 타겟 엘리먼트 없으면 다음 스텝으로
    showTourStep(stepIndex + 1);
    return;
  }

  // 스크롤하여 요소 보이게
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(function() {
    var rect = targetEl.getBoundingClientRect();
    var padding = 8;

    // 스포트라이트
    var spotlight = document.createElement('div');
    spotlight.className = 'tour-spotlight';
    spotlight.style.cssText = 'top:' + (rect.top - padding + window.scrollY) + 'px;left:' + (rect.left - padding) + 'px;width:' + (rect.width + padding * 2) + 'px;height:' + (rect.height + padding * 2) + 'px;';
    document.body.appendChild(spotlight);

    // 스텝 인디케이터
    var dotsHtml = '';
    for (var i = 0; i < postflowTourSteps.length; i++) {
      dotsHtml += '<div class="tour-step-dot ' + (i === stepIndex ? 'active' : '') + '"></div>';
    }

    // 툴팁
    var tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';

    var isLast = stepIndex === postflowTourSteps.length - 1;
    tooltip.innerHTML = '\
      <div class="tour-steps">' + dotsHtml + '</div>\
      <div class="tour-tooltip-title">' + step.title + '</div>\
      <div class="tour-tooltip-desc">' + step.description + '</div>\
      <div class="tour-tooltip-actions">\
        <button class="tour-btn-skip" onclick="endPostflowTour()">건너뛰기</button>\
        <button class="tour-btn-next" onclick="showTourStep(' + (stepIndex + 1) + ')">' + (isLast ? '완료' : '다음') + '</button>\
      </div>\
    ';

    // 툴팁 위치 계산
    var tooltipTop;
    if (step.position === 'bottom') {
      tooltipTop = rect.bottom + padding + 12 + window.scrollY;
    } else {
      tooltipTop = rect.top - padding - 200 + window.scrollY;
      if (tooltipTop < window.scrollY + 10) tooltipTop = rect.bottom + padding + 12 + window.scrollY;
    }
    var tooltipLeft = Math.max(16, Math.min(rect.left, window.innerWidth - 340));

    tooltip.style.cssText = 'top:' + tooltipTop + 'px;left:' + tooltipLeft + 'px;';
    document.body.appendChild(tooltip);
  }, 400);
}

function endPostflowTour() {
  // 오버레이 및 요소 제거
  var overlay = document.getElementById('postflow-tour-overlay');
  if (overlay) overlay.remove();
  var spotlight = document.querySelector('.tour-spotlight');
  if (spotlight) spotlight.remove();
  var tooltip = document.querySelector('.tour-tooltip');
  if (tooltip) tooltip.remove();

  // 온보딩 완료 → LEARNING 상태로 전환
  updateUserOnboardingStatus(true);

  // 완료 토스트
  if (typeof showToast === 'function') {
    showToast('🎉 온보딩 완료! 이제 자유롭게 콘텐츠를 생성해보세요.', 'success', 4000);
  }
}

// 전역으로 노출
window.getUserOnboardingState = getUserOnboardingState;
window.initOnboarding = initOnboarding;
window.updateUserOnboardingStatus = updateUserOnboardingStatus;
window.fillFormWithOnboardingData = fillFormWithOnboardingData;
window.incrementContentCount = incrementContentCount;
window.restartOnboarding = restartOnboarding;
window.initPostflowTour = initPostflowTour;
window.startPostflowTour = startPostflowTour;
window.showTourStep = showTourStep;
window.endPostflowTour = endPostflowTour;
