/*
=================================================================
하이브리드 크레딧 시스템 프론트엔드 - 키워드 분석
파일: public/static/keyword-analysis.js
=================================================================
*/

// 🔥 전역 상태는 window 객체에만 저장 (로컬 변수 제거)
// window.userCreditsInfo는 loadKeywordCreditStatus()에서 초기화됨

// ===================================
// 키워드 분석 카드 렌더링
// ===================================
function renderKeywordAnalysisCard() {
  const user = window.currentUser;
  const isLoggedIn = !!(user && user.id && !user.isGuest);
  
  // ✅ 로그인 시 크레딧 정보 즉시 로드 (한 번만)
  if (isLoggedIn && !window.userCreditsInfo) {
    console.log('🔄 [렌더링] 크레딧 정보 즉시 로드');
    loadKeywordCreditStatus();
  }
  
  // ✅ 비로그인 시 아무것도 표시하지 않음
  if (!isLoggedIn) {
    return '';
  }
  
  // ✅ 로그인 시에만 크레딧 정보 표시
  const info = window.userCreditsInfo || {};
  const freeCredits = info.free_credits ?? user.free_credits ?? 0;
  const paidCredits = info.paid_credits ?? user.paid_credits ?? 0;
  
  return `
    <div data-keyword-analysis-card style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem; border-radius: 20px; color: white;
      margin-bottom: 2rem; box-shadow: 0 15px 35px rgba(0,0,0,0.1);
      position: relative; overflow: hidden;
    ">
      <div style="
        position: absolute; top: 0; right: 0; width: 200px; height: 200px;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
        background-size: 20px 20px; opacity: 0.3;
      "></div>

      <div style="position: relative; z-index: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <h3 style="margin: 0; font-size: 1.6rem; font-weight: 800;">
            📊 키워드 AI 심층 분석
          </h3>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
            <span style="
              background: rgba(255,255,255,0.2); padding: 0.4rem 1rem;
              border-radius: 20px; font-size: 0.85rem; font-weight: 600;
            ">
              무료 <span id="freeKeywordCredits">${freeCredits}</span> · 유료 <span id="paidKeywordCredits">${paidCredits}</span>
            </span>
          </div>
        </div>

        <p style="opacity: 0.95; margin-bottom: 1.5rem; line-height: 1.6; font-size: 1rem;">
          키워드 분석 시 <strong>크레딧 1개</strong>가 차감됩니다.<br>
          무료 크레딧부터 우선 사용됩니다.
        </p>

        <div style="position: relative; margin-bottom: 1.5rem;">
          <input
            type="text"
            id="keywordAnalysisInput"
            placeholder="분석할 키워드를 입력하세요 (예: 수분크림, 여름 화장품, 비건 뷰티)"
            style="
              width: 100%; padding: 1.2rem 120px 1.2rem 1.2rem; border: none; border-radius: 15px;
              font-size: 1rem; outline: none; box-sizing: border-box;
              box-shadow: 0 8px 25px rgba(0,0,0,0.1);
              color: #111827; background: white;
            "
            onkeydown="if(event.key === 'Enter') analyzeKeywordsQuality()"
          />
          <button
            onclick="analyzeKeywordsQuality()"
            style="
              position: absolute; right: 8px; top: 8px; bottom: 8px;
              background: linear-gradient(135deg, #ff6b6b, #ff8e8e); color: white;
              border: none; border-radius: 10px; padding: 0 1.5rem;
              font-weight: bold; cursor: pointer; transition: all 0.2s;
              box-shadow: 0 4px 15px rgba(255,107,107,0.3);
            "
            onmouseover="this.style.transform='scale(1.05)'"
            onmouseout="this.style.transform='scale(1)'"
          >
            🎯 분석
          </button>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 0.85rem; opacity: 0.9;">빠른 테스트:</span>
          <button onclick="setKeywordSample('비건 화장품, 친환경 패키지, 제로웨이스트')" class="sample-btn">🌿 친환경</button>
          <button onclick="setKeywordSample('홈트레이닝, 요가 매트, 필라테스')" class="sample-btn">💪 운동</button>
          <button onclick="setKeywordSample('반려동물 용품, 강아지 간식, 고양이 장난감')" class="sample-btn">🐕 펫케어</button>
        </div>

        <!-- 확장 기능 버튼 -->
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.2);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <!-- 분석 기록, 월간 리포트 버튼 제거됨 -->
          </div>
        </div>

        <style>
          .sample-btn {
            background: rgba(255,255,255,0.2); border: none; padding: 0.4rem 0.8rem;
            border-radius: 15px; color: white; font-size: 0.8rem; cursor: pointer;
            transition: all 0.2s; font-weight: 500;
          }
          .sample-btn:hover {
            background: rgba(255,255,255,0.3); transform: translateY(-1px);
          }
        </style>
      </div>
    </div>
  `;
}

// ===================================
// 유틸리티 함수
// ===================================
function setKeywordSample(text) {
  const input = document.getElementById('keywordAnalysisInput');
  if (input) input.value = text;
}

// ===================================
// 크레딧 상태 로드
// ===================================
async function loadKeywordCreditStatus() {
  // ✅ 로그인 정보 로드 대기 (최대 3초, 0.3초 간격)
  let attempts = 0;
  while ((!window.currentUser || !window.currentUser.id || window.currentUser.isGuest) && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 300));
    attempts++;
  }
  
  // 비회원 상태 처리
  if (!window.currentUser || !window.currentUser.id || window.currentUser.isGuest) {
    console.log('⚠️ 비회원 상태로 크레딧 조회 스킵');
    return;
  }
  
  console.log('✅ 로그인 확인됨, 크레딧 조회 시작:', window.currentUser.email);
  
  try {
    const response = await fetch(`/api/user-credits-status?user_id=${window.currentUser.id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // 전역 상태 업데이트
      window.userCreditsInfo = {
        free_credits: data.free_credits,
        paid_credits: data.paid_credits,
        total_credits: data.total_credits || 0
      };
      
      // UI 업데이트
      const freeEl = document.getElementById('freeKeywordCredits');
      const paidEl = document.getElementById('paidKeywordCredits');
      
      if (freeEl) {
        freeEl.textContent = data.free_credits;
        console.log('✅ 무료 크레딧 UI 업데이트:', data.free_credits);
      }
      if (paidEl) {
        paidEl.textContent = data.paid_credits;
        console.log('✅ 유료 크레딧 UI 업데이트:', data.paid_credits);
      }
      
      console.log('✅ 크레딧 동기화 완료:', window.userCreditsInfo);
      
      // 🔥 카드 재렌더링 대신 DOM 직접 업데이트 (무한 루프 방지)
      // 재렌더링은 하지 않고 이미 업데이트된 #freeKeywordCredits, #paidKeywordCredits 사용
    }
  } catch (error) {
    console.error('❌ 크레딧 조회 실패:', error);
    // 실패 시 전역 상태의 값 사용 (daily_free는 설정 안 함)
    const user = window.currentUser;
    if (user && user.id) {
      window.userCreditsInfo = window.userCreditsInfo || {};
      window.userCreditsInfo.free_credits = user.free_credits || 0;
      window.userCreditsInfo.paid_credits = user.paid_credits || 0;
      window.userCreditsInfo.total_credits = (user.free_credits || 0) + (user.paid_credits || 0);
      // daily_free 정보는 서버 응답 실패 시 설정하지 않음
    }
  }
}

// ===================================
// 키워드 분석 실행
// ===================================
// 🔒 중복 실행 방지 플래그
let isAnalyzing = false;

async function analyzeKeywordsQuality() {
  // ✅ 중복 실행 방지
  if (isAnalyzing) {
    console.log('⏳ 이미 분석 중입니다');
    if (typeof window.showToast === 'function') {
      window.showToast('⏳ 이미 분석 중입니다. 잠시만 기다려주세요.', 'warning');
    }
    return;
  }
  
  const input = document.getElementById('keywordAnalysisInput');
  if (!input) return;
  
  const keywords = input.value.trim();
  
  if (!keywords) {
    if (typeof window.showToast === 'function') {
      window.showToast('❌ 분석할 키워드를 입력해주세요', 'error');
    } else {
      alert('분석할 키워드를 입력해주세요');
    }
    input.focus();
    return;
  }
  
  // ✅ window.currentUser 직접 사용 (전역 상태)
  if (!window.currentUser || !window.currentUser.id || window.currentUser.isGuest) {
    console.error('❌ 로그인 정보 없음:', { 
      window_currentUser: window.currentUser, 
      localStorage: localStorage.getItem('postflow_user') 
    });
    if (typeof window.showToast === 'function') {
      window.showToast('⚠️ 로그인 후 이용 가능합니다', 'warning');
    } else {
      alert('로그인 후 이용 가능합니다');
    }
    return;
  }
  
  console.log('✅ currentUser 확인:', {
    id: window.currentUser.id,
    email: window.currentUser.email,
    isGuest: window.currentUser.isGuest,
    free_credits: window.currentUser.free_credits,
    paid_credits: window.currentUser.paid_credits
  });

  // 🔥 수정: window.userCreditsInfo 사용 (로컬 변수 userCreditsInfo 제거됨)
  const creditsInfo = window.userCreditsInfo || { free_credits: 0, paid_credits: 0, daily_remaining: 3 };
  
  // 일일 무료 소진 상태에서 크레딧도 0이면 바로 모달
  const totalCredits = creditsInfo.free_credits + creditsInfo.paid_credits;
  if (creditsInfo.daily_remaining === 0 && totalCredits === 0) {
    showCreditShortageModal({
      daily_used: 3,
      daily_limit: 3,
      free_credits: creditsInfo.free_credits,
      paid_credits: creditsInfo.paid_credits
    });
    return;
  }

  // 일일 무료 소진 + 크레딧 있을 때 확인
  if (creditsInfo.daily_remaining === 0 && totalCredits > 0) {
    const confirmMessage = `오늘 무료 3회를 모두 사용했습니다.\n크레딧 1개를 사용하여 분석하시겠습니까?\n\n무료 크레딧: ${creditsInfo.free_credits}개\n유료 크레딧: ${creditsInfo.paid_credits}개`;
    if (!confirm(confirmMessage)) return;
  }
  
  if (typeof window.showToast === 'function') {
    window.showToast('🔍 AI가 키워드를 심층 분석 중입니다...', 'info');
  }
  
  // ✅ 분석 시작 - 버튼 비활성화
  isAnalyzing = true;
  const analyzeButton = document.querySelector('button[onclick*="analyzeKeywordsQuality"]');
  if (analyzeButton) {
    analyzeButton.disabled = true;
    analyzeButton.textContent = '⏳ AI 분석 중...';
    analyzeButton.classList.add('opacity-50', 'cursor-not-allowed');
  }
  
  try {
    const response = await fetch('/api/analyze-keywords-quality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, user_id: window.currentUser.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 🔥 크레딧 즉시 동기화 (전역 상태 + localStorage + UI)
      if (data.cost_info) {
        const ci = data.cost_info;
        const currentInfo = window.userCreditsInfo || { free_credits: 0, paid_credits: 0 };
        
        // window.userCreditsInfo 직접 업데이트
        window.userCreditsInfo = {
          free_credits: ci.remaining_free_credits ?? currentInfo.free_credits,
          paid_credits: ci.remaining_paid_credits ?? currentInfo.paid_credits,
          total_credits: (ci.remaining_free_credits ?? 0) + (ci.remaining_paid_credits ?? 0)
        };
        
        // window.currentUser 동기화
        if (window.currentUser) {
          window.currentUser.free_credits = ci.remaining_free_credits ?? window.currentUser.free_credits;
          window.currentUser.paid_credits = ci.remaining_paid_credits ?? window.currentUser.paid_credits;
          
          // localStorage 업데이트
          const storedUser = JSON.parse(localStorage.getItem('postflow_user') || '{}');
          storedUser.free_credits = ci.remaining_free_credits;
          storedUser.paid_credits = ci.remaining_paid_credits;
          localStorage.setItem('postflow_user', JSON.stringify(storedUser));
          
          console.log('💎 크레딧 차감 완료:', {
            free: ci.remaining_free_credits,
            paid: ci.remaining_paid_credits,
            cost_type: ci.type
          });
        }
        
        // 상단 크레딧 표시 즉시 업데이트
        if (typeof window.updateAuthUI === 'function') {
          window.updateAuthUI();
        }
        
        // 하단 크레딧 표시 즉시 업데이트
        if (typeof window.updateCostEstimate === 'function') {
          window.updateCostEstimate();
        }
        
        // 키워드 분석 카드 UI 즉시 업데이트
        const freeEl = document.getElementById('freeKeywordCredits');
        const paidEl = document.getElementById('paidKeywordCredits');
        if (freeEl) freeEl.textContent = ci.remaining_free_credits;
        if (paidEl) paidEl.textContent = ci.remaining_paid_credits;
        console.log('✅ 키워드 분석 카드 크레딧 표시 업데이트:', {
          free: ci.remaining_free_credits,
          paid: ci.remaining_paid_credits
        });
        
        // 성공 메시지
        let message = '✅ 분석 완료!';
        if (ci.type === 'cached') {
          message = '⚡ 캐시된 결과입니다 (크레딧 미차감)';
        } else if (ci.type === 'free_credit') {
          message = `✅ 분석 완료! (무료 크레딧 1개 사용, 남은 무료: ${ci.remaining_free_credits}개)`;
        } else if (ci.type === 'paid_credit') {
          message = `✅ 분석 완료! (유료 크레딧 1개 사용, 남은 유료: ${ci.remaining_paid_credits}개)`;
        }
        
        if (typeof window.showToast === 'function') {
          window.showToast(message, 'success');
        } else {
          alert(message);
        }
        
        // 기존 크레딧 UI 업데이트 (있다면)
        if (window.updateAuthUI) {
          const currentInfo = window.userCreditsInfo || { free_credits: 0, paid_credits: 0 };
          window.currentUser.free_credits = currentInfo.free_credits;
          window.currentUser.paid_credits = currentInfo.paid_credits;
          window.currentUser.credits = currentInfo.free_credits + currentInfo.paid_credits;
          localStorage.setItem('postflow_user', JSON.stringify(window.currentUser));
          window.updateAuthUI();
        }
        
        if (window.updateCostEstimate) {
          window.updateCostEstimate();
        }
      }
      
      // 분석 결과를 전역 변수에 저장 (보관 기능용)
      window.lastAnalysisResult = data.analysis;
      
      // 🔍 디버깅: API 응답 확인
      console.log('🔍 [프론트] API 응답 analysis:', data.analysis);
      console.log('🔍 [프론트] market_insights:', data.analysis.market_insights);
      console.log('🔍 [프론트] strategic_recommendations:', data.analysis.strategic_recommendations);
      
      // 분석 결과 모달 표시
      showKeywordQualityModal(data.analysis, data.cached);
      
    } else {
      // 에러 처리
      if (response.status === 402) {
        showCreditShortageModal(data.cost_info);
      } else if (response.status === 503 && data.error_code === 'AI_UNAVAILABLE') {
        // ✅ AI 서비스 장애 전용 모달
        showAIFailureModal({
          message: data.error,
          detail: data.error_detail,
          retry_after: data.retry_after,
          keywords: data.keywords
        });
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast('❌ 분석 실패: ' + data.error, 'error');
        } else {
          alert('분석 실패: ' + data.error);
        }
      }
    }
  } catch (error) {
    console.error('키워드 분석 실패:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('❌ 분석 중 오류가 발생했습니다', 'error');
    } else {
      alert('분석 중 오류가 발생했습니다');
    }
  } finally {
    // ✅ 분석 완료 - 버튼 상태 복구
    isAnalyzing = false;
    if (analyzeButton) {
      analyzeButton.disabled = false;
      analyzeButton.textContent = '🎯 분석';
      analyzeButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}

// ===================================
// 크레딧 부족 모달
// ===================================
function showCreditShortageModal(info) {
  const currentInfo = window.userCreditsInfo || { free_credits: 0, paid_credits: 0 };
  const free = info?.free_credits ?? currentInfo.free_credits;
  const paid = info?.paid_credits ?? currentInfo.paid_credits;
  const total = free + paid;
  const dailyUsed = info?.daily_used ?? 3;
  const dailyLimit = info?.daily_limit ?? 3;

  const modalHTML = `
    <div id="creditShortageModal" style="
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    ">
      <div style="
        background: white; border-radius: 20px; padding: 2rem;
        max-width: 500px; width: 90%; text-align: center;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3);
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">💎</div>
        <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: #111827;">
          오늘의 무료 분석을 모두 사용했습니다
        </h3>
        
        <div style="
          background: #f8fafc; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;
          text-align: left;
        ">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="color: #64748b;">오늘 사용:</span>
            <span style="font-weight: bold;">${dailyUsed}/${dailyLimit}회</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="color: #64748b;">무료 크레딧:</span>
            <span style="font-weight: bold; color: #10b981;">${free}개</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span style="color: #64748b;">유료 크레딧:</span>
            <span style="font-weight: bold; color: #3b82f6;">${paid}개</span>
          </div>
          <div style="
            display: flex; justify-content: space-between; padding-top: 0.5rem; 
            border-top: 2px solid #e2e8f0; margin-top: 0.5rem;
          ">
            <span style="color: #1e293b; font-weight: 600;">총 크레딧:</span>
            <span style="font-weight: bold; color: #1e293b; font-size: 1.1rem;">${total}개</span>
          </div>
        </div>
        
        <p style="color: #666; margin-bottom: 2rem; line-height: 1.6;">
          ${total > 0 
            ? "추가 분석을 위해서는 크레딧이 사용됩니다."
            : "추가 분석을 위해서는 크레딧 충전이 필요합니다."
          }
          <br><small style="color: #999;">매월 1일에 무료 크레딧 10개가 자동 지급됩니다.</small>
        </p>
        
        <div style="display: flex; gap: 1rem;">
          <button onclick="document.getElementById('creditShortageModal').remove()" style="
            flex: 1; padding: 1rem; background: #f1f5f9; color: #64748b;
            border: none; border-radius: 12px; font-weight: bold; cursor: pointer;
          ">
            ${total > 0 ? '취소' : '내일 다시 시도'}
          </button>
          <button onclick="location.href='/static/payment.html'" style="
            flex: 1; padding: 1rem; background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer;
          ">
            💎 크레딧 충전
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===================================
// 키워드 분석 결과 모달 (고도화 버전)
// ===================================
function showKeywordQualityModal(analysis, isCached = false) {
  if (!analysis || !analysis.keywords) {
    console.error('분석 결과가 없습니다:', analysis);
    return;
  }

  const keywords = analysis.keywords;
  const overallScore = analysis.overall_score || 0;
  
  // 점수별 색상
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // 녹색
    if (score >= 60) return '#f59e0b'; // 노랑
    return '#ef4444'; // 빨강
  };

  // 점수별 등급
  const getScoreGrade = (score) => {
    if (score >= 90) return '🏆 최상';
    if (score >= 80) return '🥇 우수';
    if (score >= 70) return '🥈 양호';
    if (score >= 60) return '🥉 보통';
    return '⚠️ 주의';
  };

  // 키워드 카드 생성
  const keywordCards = keywords.map((kw, idx) => `
    <div style="
      background: white; border-radius: 15px; padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 2px solid ${idx === 0 ? '#667eea' : '#e5e7eb'};
      margin-bottom: 1.5rem;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h4 style="margin: 0; font-size: 1.3rem; color: #1f2937;">
          ${idx + 1}. ${kw.keyword}
        </h4>
        <div style="
          background: ${getScoreColor(kw.total_score)}; color: white;
          padding: 0.5rem 1rem; border-radius: 20px; font-weight: bold;
          font-size: 1.1rem;
        ">
          ${kw.total_score}점 ${getScoreGrade(kw.total_score)}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.8rem; margin-bottom: 1rem;">
        <div>
          <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.3rem;">마케팅 효과</div>
          <div style="display: flex; align-items: center;">
            <div style="flex: 1; background: #e5e7eb; height: 8px; border-radius: 10px; overflow: hidden;">
              <div style="background: #667eea; height: 100%; width: ${kw.marketing_score}%;"></div>
            </div>
            <span style="margin-left: 0.5rem; font-weight: bold; color: #374151;">${kw.marketing_score}</span>
          </div>
        </div>

        <div>
          <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.3rem;">SEO 난이도</div>
          <div style="display: flex; align-items: center;">
            <div style="flex: 1; background: #e5e7eb; height: 8px; border-radius: 10px; overflow: hidden;">
              <div style="background: #10b981; height: 100%; width: ${kw.seo_score}%;"></div>
            </div>
            <span style="margin-left: 0.5rem; font-weight: bold; color: #374151;">${kw.seo_score}</span>
          </div>
        </div>

        <div>
          <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.3rem;">바이럴 가능성</div>
          <div style="display: flex; align-items: center;">
            <div style="flex: 1; background: #e5e7eb; height: 8px; border-radius: 10px; overflow: hidden;">
              <div style="background: #f59e0b; height: 100%; width: ${kw.viral_potential}%;"></div>
            </div>
            <span style="margin-left: 0.5rem; font-weight: bold; color: #374151;">${kw.viral_potential}</span>
          </div>
        </div>

        <div>
          <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.3rem;">전환율 예상</div>
          <div style="display: flex; align-items: center;">
            <div style="flex: 1; background: #e5e7eb; height: 8px; border-radius: 10px; overflow: hidden;">
              <div style="background: #ef4444; height: 100%; width: ${kw.conversion_potential}%;"></div>
            </div>
            <span style="margin-left: 0.5rem; font-weight: bold; color: #374151;">${kw.conversion_potential}</span>
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
        <p style="color: #374151; line-height: 1.6; margin: 0;">
          ${kw.analysis}
        </p>
      </div>

      ${kw.recommendations && kw.recommendations.length > 0 ? `
        <div>
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.5rem; font-size: 0.95rem;">
            💡 추천 전략:
          </div>
          <ul style="margin: 0; padding-left: 1.5rem; color: #4b5563; line-height: 1.8;">
            ${kw.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${kw.related_keywords && kw.related_keywords.length > 0 ? `
        <div style="margin-top: 1rem;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.5rem; font-size: 0.95rem;">
            🔗 관련 키워드 추천:
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${kw.related_keywords.map(rel => `
              <span style="background: #e0e7ff; color: #4338ca; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500;">${rel}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${kw.better_alternatives && kw.better_alternatives.length > 0 ? `
        <div style="margin-top: 1rem;">
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 0.5rem; font-size: 0.95rem;">
            ⭐ 더 나은 대체 키워드:
          </div>
          <ul style="margin: 0; padding-left: 1.5rem; color: #4b5563; line-height: 1.8;">
            ${kw.better_alternatives.map(alt => `
              <li><strong style="color: #059669;">${alt.keyword}</strong> - ${alt.reason}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `).join('');

  const modalHTML = `
    <div id="keywordQualityModal" style="
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 10000; overflow-y: auto;
      display: flex; align-items: center; justify-content: center; padding: 2rem;
    " onclick="if(event.target.id === 'keywordQualityModal') document.getElementById('keywordQualityModal').remove()">
      <div style="
        background: #f9fafb; border-radius: 25px; padding: 2.5rem;
        max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto;
        box-shadow: 0 25px 60px rgba(0,0,0,0.3);
      " onclick="event.stopPropagation()">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <div>
            <h2 style="margin: 0; font-size: 2rem; color: #111827;">
              📊 키워드 심층 분석 결과
            </h2>
            <p style="color: #6b7280; margin: 0.5rem 0 0 0;">
              ${isCached ? '⚡ 캐시된 결과 (무료)' : `총 ${keywords.length}개 키워드 분석 완료`}
            </p>
          </div>
          <button onclick="document.getElementById('keywordQualityModal').remove()" style="
            background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem;
            border-radius: 12px; cursor: pointer; font-weight: bold;
            transition: all 0.2s;
          " onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
            ✕ 닫기
          </button>
        </div>

        <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 2rem; border-radius: 20px; color: white; margin-bottom: 2rem;">
          <div style="text-align: center;">
            <div style="font-size: 3rem; font-weight: 800; margin-bottom: 0.5rem;">
              ${overallScore}점
            </div>
            <div style="font-size: 1.2rem; opacity: 0.9;">
              종합 점수 ${getScoreGrade(overallScore)}
            </div>
          </div>
        </div>

        ${keywordCards}

        ${analysis.market_insights && analysis.market_insights.length > 0 ? `
          <div style="background: #eff6ff; padding: 1.5rem; border-radius: 15px; margin-bottom: 1.5rem; border-left: 4px solid #3b82f6;">
            <h4 style="margin: 0 0 1rem 0; color: #1e40af; font-size: 1.1rem;">
              🔍 시장 인사이트
            </h4>
            <ul style="margin: 0; padding-left: 1.5rem; color: #1e3a8a; line-height: 1.8;">
              ${analysis.market_insights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${analysis.strategic_recommendations && analysis.strategic_recommendations.length > 0 ? `
          <div style="background: #f0fdf4; padding: 1.5rem; border-radius: 15px; margin-bottom: 1.5rem; border-left: 4px solid #10b981;">
            <h4 style="margin: 0 0 1rem 0; color: #065f46; font-size: 1.1rem;">
              🎯 전략적 제안
            </h4>
            <ul style="margin: 0; padding-left: 1.5rem; color: #064e3b; line-height: 1.8;">
              ${analysis.strategic_recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div style="text-align: center; padding-top: 1rem;">
          <button onclick="copyAnalysisToClipboard()" style="
            background: linear-gradient(135deg, #10b981, #059669); color: white;
            border: none; padding: 1rem 2rem; border-radius: 15px; cursor: pointer;
            font-weight: bold; font-size: 1.05rem; transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            📋 분석 결과 복사하기
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===================================
// 키워드 분석 결과 보관하기
// ===================================
// ===================================
// 분석 결과 클립보드 복사
// ===================================
async function copyAnalysisToClipboard() {
  const modal = document.getElementById('keywordQualityModal');
  if (!modal) return;

  if (!window.lastAnalysisResult) {
    if (typeof window.showToast === 'function') {
      window.showToast('복사할 분석 결과가 없습니다', 'error');
    } else {
      alert('복사할 분석 결과가 없습니다');
    }
    return;
  }

  try {
    // 분석 결과를 읽기 쉬운 텍스트로 변환
    const analysis = window.lastAnalysisResult;
    const text = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 키워드 분석 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 종합 점수: ${analysis.overall_score}점

${analysis.keywords.map((kw, idx) => `
${idx + 1}. ${kw.keyword} (${kw.total_score}점)
   • 마케팅 효과: ${kw.marketing_score}점
   • SEO 난이도: ${kw.seo_score}점
   • 바이럴 가능성: ${kw.viral_potential}점
   • 전환 가능성: ${kw.conversion_potential}점
   • 트렌드: ${kw.trend_score}점 (${kw.trend_direction})
   • 경쟁도: ${kw.competition_level}점
   • 포화도: ${kw.saturation_level}점
   • 시장 규모: ${kw.market_size}
   
   💡 분석: ${kw.analysis}
   
   ✨ 추천사항:
${kw.recommendations.map(r => `      - ${r}`).join('\n')}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 시장 인사이트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${analysis.market_insights.map(insight => `• ${insight}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 전략 추천
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${analysis.strategic_recommendations.map(rec => `• ${rec}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
생성 시간: ${new Date().toLocaleString('ko-KR')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    // 클립보드에 복사
    await navigator.clipboard.writeText(text);
    
    if (typeof window.showToast === 'function') {
      window.showToast('✅ 분석 결과가 클립보드에 복사되었습니다!', 'success');
    } else {
      alert('✅ 분석 결과가 클립보드에 복사되었습니다!\n메모장 등에 붙여넣기(Ctrl+V)하여 저장하세요.');
    }
    
    modal.remove();

  } catch (error) {
    console.error('❌ 복사 실패:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('복사에 실패했습니다. 브라우저 설정을 확인해주세요.', 'error');
    } else {
      alert('복사에 실패했습니다. 브라우저 설정을 확인해주세요.');
    }
  }
}

// ===================================
// 페이지 초기화
// ===================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 하이브리드 크레딧 시스템 초기화 중...');
  
  // 🔥 로그인 상태 확인 대기 (최대 2초)
  let retryCount = 0;
  while (!window.currentUser && retryCount < 10) {
    console.log(`⏳ [초기화] window.currentUser 대기 중... (${retryCount + 1}/10)`);
    await new Promise(resolve => setTimeout(resolve, 200));
    retryCount++;
  }
  
  if (window.currentUser) {
    console.log('✅ [초기화] 로그인 사용자 감지:', {
      id: window.currentUser.id,
      email: window.currentUser.email,
      isGuest: window.currentUser.isGuest
    });
  } else {
    console.log('ℹ️ [초기화] 비로그인 상태로 카드 렌더링');
  }
  
  // 카드 렌더링 - 콘텐츠 생성 폼 위에 삽입
  const contentForm = document.querySelector('#contentForm, .content-form, form');
  if (contentForm && contentForm.parentNode) {
    const cardContainer = document.createElement('div');
    cardContainer.setAttribute('data-keyword-analysis-section', '');
    cardContainer.innerHTML = renderKeywordAnalysisCard();
    
    // 폼 바로 위에 삽입
    contentForm.parentNode.insertBefore(cardContainer, contentForm);
    console.log('✅ 키워드 분석 카드 삽입 완료 (폼 위)');
  } else {
    // 대안: body 맨 위에 삽입
    const body = document.body;
    if (body) {
      const cardContainer = document.createElement('div');
      cardContainer.setAttribute('data-keyword-analysis-section', '');
      cardContainer.innerHTML = renderKeywordAnalysisCard();
      cardContainer.style.maxWidth = '1200px';
      cardContainer.style.margin = '2rem auto';
      cardContainer.style.padding = '0 1rem';
      body.insertAdjacentElement('afterbegin', cardContainer);
      console.log('✅ 키워드 분석 카드 삽입 완료 (body 상단)');
    }
  }
  
  // 🔔 사용자 정보 변경 감지 리스너 추가 (핵심!)
  window.addEventListener('userUpdated', (event) => {
    // ✅ 전역 상태를 직접 확인 (이벤트 데이터 무시)
    const user = window.currentUser;
    
    console.log('🔍 [키워드 분석] userUpdated 이벤트 수신:', {
      user: user,
      hasId: !!user?.id,
      isGuest: user?.isGuest,
      free_credits: user?.free_credits,
      paid_credits: user?.paid_credits
    });
    
    // 게스트 상태 체크 (더 엄격하게)
    if (!user || !user.id || user.isGuest === true) {
      console.warn('⚠️ [키워드 분석] 게스트 상태 - 크레딧 업데이트 스킵', {
        hasUser: !!user,
        hasId: !!user?.id,
        isGuest: user?.isGuest
      });
      return;
    }
    
    console.log('🔔 [키워드 분석] 로그인 사용자 감지!', {
      id: user.id,
      email: user.email,
      free_credits: user.free_credits,
      paid_credits: user.paid_credits
    });
    
    // 🔥 핵심: 비로그인 화면이면 전체 카드 교체
    const card = document.querySelector('[data-keyword-analysis-card]');
    if (card && card.innerHTML.includes('가입만 해도')) {
      console.log('🔄 비로그인 화면을 로그인 화면으로 교체');
      card.outerHTML = renderKeywordAnalysisCard();
      console.log('✅ 키워드 카드 교체 완료');
      return; // 교체 후 종료 (renderKeywordAnalysisCard에서 크레딧 값 설정됨)
    }
    
    // 이미 로그인 화면이면 크레딧 숫자만 업데이트
    const freeCredits = user.free_credits ?? 0;
    const paidCredits = user.paid_credits ?? 0;
    
    // 크레딧 표시 업데이트
    const freeCreditEl = document.getElementById('freeKeywordCredits');
    const paidCreditEl = document.getElementById('paidKeywordCredits');
    
    if (freeCreditEl) {
      freeCreditEl.textContent = freeCredits;
      console.log('✅ 무료 크레딧 UI 업데이트:', freeCredits);
    }
    if (paidCreditEl) {
      paidCreditEl.textContent = paidCredits;
      console.log('✅ 유료 크레딧 UI 업데이트:', paidCredits);
    }
    
    // 전역 변수도 업데이트 (daily_free는 서버에서만 받음, 초기화 안 함)
    window.userCreditsInfo = window.userCreditsInfo || {};
    window.userCreditsInfo.free_credits = freeCredits;
    window.userCreditsInfo.paid_credits = paidCredits;
    window.userCreditsInfo.total_credits = freeCredits + paidCredits;
    // daily_free 정보는 loadKeywordCreditStatus()에서만 설정
    
    console.log('📊 userCreditsInfo 업데이트:', window.userCreditsInfo);
  });
  
  console.log('✅ userUpdated 이벤트 리스너 등록 완료');
  
  // 사용자 크레딧 정보 로드 (즉시 + 1초 후 재시도)
  loadKeywordCreditStatus(); // 즉시 호출
  setTimeout(() => {
    console.log('🔄 크레딧 정보 재로드...');
    loadKeywordCreditStatus();
  }, 1000);
  
  // 🔥 추가: 5초마다 강제 동기화 (이벤트 실패 백업)
  setInterval(() => {
    const user = window.currentUser;
    if (user && user.id && user.isGuest === false && user.free_credits !== undefined) {
      const freeEl = document.getElementById('freeKeywordCredits');
      const paidEl = document.getElementById('paidKeywordCredits');
      
      // UI가 0인데 데이터는 있으면 강제 업데이트
      if (freeEl && (freeEl.textContent === '0' || freeEl.textContent === '') && user.free_credits > 0) {
        console.log('🔄 [백업 동기화] 크레딧 강제 업데이트:', {
          free: user.free_credits,
          paid: user.paid_credits
        });
        freeEl.textContent = user.free_credits;
        if (paidEl) paidEl.textContent = user.paid_credits;
        
        window.userCreditsInfo = window.userCreditsInfo || {};
        window.userCreditsInfo.free_credits = user.free_credits;
        window.userCreditsInfo.paid_credits = user.paid_credits;
        window.userCreditsInfo.total_credits = user.free_credits + user.paid_credits;
      }
    }
  }, 5000);
});

// 전역 함수 노출
window.analyzeKeywordsQuality = analyzeKeywordsQuality;
window.setKeywordSample = setKeywordSample;
window.showKeywordQualityModal = showKeywordQualityModal;

// ✅ AI 서비스 장애 모달 추가
function showAIFailureModal({ message, detail, retry_after, keywords }) {
  const modalHTML = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
         onclick="this.remove()">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6" 
           onclick="event.stopPropagation()">
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            ⚠️ AI 분석 서비스 일시 중단
          </h3>
          
          <p class="text-gray-600 mb-4">${message}</p>
          
          <div class="bg-gray-50 rounded-lg p-4 mb-4 text-left">
            <p class="text-sm text-gray-700 mb-2">
              <strong>오류 상세:</strong><br>
              ${detail}
            </p>
            <p class="text-sm text-gray-700">
              <strong>입력 키워드:</strong><br>
              ${keywords.join(', ')}
            </p>
          </div>
          
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p class="text-sm text-green-800">
              ✅ <strong>크레딧은 차감되지 않았습니다</strong>
            </p>
          </div>
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p class="text-sm text-blue-800">
              💡 <strong>${Math.floor(retry_after / 60)}분 후 다시 시도해주세요</strong>
            </p>
          </div>
          
          <button onclick="this.closest('.fixed').remove()"
                  class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            확인
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.showAIFailureModal = showAIFailureModal;
// 함수는 copyAnalysisResult로 변경되었고 inline onclick으로 직접 호출됨
window.loadKeywordCreditStatus = loadKeywordCreditStatus;
