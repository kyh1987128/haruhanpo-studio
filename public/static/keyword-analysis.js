/*
=================================================================
하이브리드 크레딧 시스템 프론트엔드 - 키워드 분석
파일: public/static/keyword-analysis.js
=================================================================
*/

// 전역 상태 관리
let userCreditsInfo = {
  free_credits: 0,
  paid_credits: 0,
  daily_remaining: 3
};

// ===================================
// 키워드 분석 카드 렌더링
// ===================================
function renderKeywordAnalysisCard() {
  const isDailyFreeAvailable = userCreditsInfo.daily_remaining > 0;
  const totalCredits = userCreditsInfo.free_credits + userCreditsInfo.paid_credits;
  
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
            <span id="dailyStatus" style="
              background: ${isDailyFreeAvailable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(249, 115, 22, 0.3)'};
              padding: 0.4rem 1rem; border-radius: 20px;
              font-size: 0.85rem; font-weight: 600;
            ">
              ${isDailyFreeAvailable 
                ? `🆓 오늘 무료 ${userCreditsInfo.daily_remaining}회`
                : '💎 무료 소진 · 크레딧 사용'}
            </span>
            <span style="
              background: rgba(255,255,255,0.2); padding: 0.4rem 1rem;
              border-radius: 20px; font-size: 0.85rem; font-weight: 600;
            ">
              무료 ${userCreditsInfo.free_credits} · 유료 ${userCreditsInfo.paid_credits}
            </span>
          </div>
        </div>

        <p style="opacity: 0.95; margin-bottom: 1.5rem; line-height: 1.6; font-size: 1rem;">
          <strong>하루 3회까지 무료</strong>로 키워드 심층 분석을 제공합니다.<br>
          4회부터는 <strong>크레딧 1개</strong>가 차감되며, <strong>무료 크레딧부터 우선 사용</strong>됩니다.
          <br><small style="opacity: 0.85;">매월 1일 무료 크레딧 10개 자동 지급 · 이미 분석된 키워드는 캐시로 무료 제공</small>
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
            <button onclick="showKeywordHistory()" style="
              padding: 0.8rem; background: rgba(255,255,255,0.15); border: none; 
              border-radius: 10px; color: white; cursor: pointer; font-size: 0.9rem;
              font-weight: 600; transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.25)'"
               onmouseout="this.style.background='rgba(255,255,255,0.15)'">
              📜 분석 기록
            </button>
            <button onclick="showMonthlyReport()" style="
              padding: 0.8rem; background: rgba(255,255,255,0.15); border: none; 
              border-radius: 10px; color: white; cursor: pointer; font-size: 0.9rem;
              font-weight: 600; transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.25)'"
               onmouseout="this.style.background='rgba(255,255,255,0.15)'">
              📊 월간 리포트
            </button>
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
  // currentUser가 로드될 때까지 대기 (최대 5초)
  let attempts = 0;
  while ((!window.currentUser || window.currentUser.isGuest) && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  if (!window.currentUser || window.currentUser.isGuest) {
    console.log('⚠️ 비회원 또는 로그인 필요 - 크레딧 조회 스킵');
    return;
  }
  
  try {
    const response = await fetch(`/api/user-credits-status?user_id=${window.currentUser.id}`);
    const data = await response.json();
    
    if (data.success) {
      userCreditsInfo = {
        free_credits: data.free_credits,
        paid_credits: data.paid_credits,
        daily_remaining: data.daily_remaining
      };
      
      // 카드 UI 업데이트
      const cardEl = document.querySelector('[data-keyword-analysis-card]');
      if (cardEl) {
        cardEl.outerHTML = renderKeywordAnalysisCard();
      }
      
      console.log('✅ 크레딧 정보 로드 완료:', userCreditsInfo);
    }
  } catch (error) {
    console.error('❌ 크레딧 정보 로드 실패:', error);
  }
}

// ===================================
// 키워드 분석 실행
// ===================================
async function analyzeKeywordsQuality() {
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
  
  // currentUser 재확인 (5초 대기)
  let attempts = 0;
  while ((!window.currentUser || window.currentUser.isGuest) && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }
  
  if (!window.currentUser || window.currentUser.isGuest) {
    console.error('❌ currentUser 없음:', window.currentUser);
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
    isGuest: window.currentUser.isGuest
  });

  // 일일 무료 소진 상태에서 크레딧도 0이면 바로 모달
  const totalCredits = userCreditsInfo.free_credits + userCreditsInfo.paid_credits;
  if (userCreditsInfo.daily_remaining === 0 && totalCredits === 0) {
    showCreditShortageModal({
      daily_used: 3,
      daily_limit: 3,
      free_credits: userCreditsInfo.free_credits,
      paid_credits: userCreditsInfo.paid_credits
    });
    return;
  }

  // 일일 무료 소진 + 크레딧 있을 때 확인
  if (userCreditsInfo.daily_remaining === 0 && totalCredits > 0) {
    const confirmMessage = `오늘 무료 3회를 모두 사용했습니다.\n크레딧 1개를 사용하여 분석하시겠습니까?\n\n무료 크레딧: ${userCreditsInfo.free_credits}개\n유료 크레딧: ${userCreditsInfo.paid_credits}개`;
    if (!confirm(confirmMessage)) return;
  }
  
  if (typeof window.showToast === 'function') {
    window.showToast('🔍 AI가 키워드를 심층 분석 중입니다...', 'info');
  }
  
  try {
    const response = await fetch('/api/analyze-keywords-quality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, user_id: window.currentUser.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 상태 업데이트
      if (data.cost_info) {
        const ci = data.cost_info;
        userCreditsInfo = {
          free_credits: ci.remaining_free_credits ?? userCreditsInfo.free_credits,
          paid_credits: ci.remaining_paid_credits ?? userCreditsInfo.paid_credits,
          daily_remaining: ci.daily_remaining ?? userCreditsInfo.daily_remaining
        };
        
        // UI 업데이트
        const cardEl = document.querySelector('[data-keyword-analysis-card]');
        if (cardEl) {
          cardEl.outerHTML = renderKeywordAnalysisCard();
        }
        
        // 성공 메시지
        let message = '✅ 분석 완료!';
        if (ci.type === 'cached') {
          message = '⚡ 캐시된 결과입니다 (크레딧 미차감)';
        } else if (ci.type === 'daily_free') {
          message = `✅ 일일 무료 분석! (남은 무료: ${ci.daily_remaining}회)`;
        } else if (ci.type === 'free_credit' || ci.type === 'paid_credit') {
          const parts = [];
          if (ci.used_free_credits) parts.push(`무료 ${ci.used_free_credits}개`);
          if (ci.used_paid_credits) parts.push(`유료 ${ci.used_paid_credits}개`);
          message = `✅ 분석 완료! (${parts.join(' + ')} 사용)`;
        }
        
        if (typeof window.showToast === 'function') {
          window.showToast(message, 'success');
        } else {
          alert(message);
        }
        
        // 기존 크레딧 UI 업데이트 (있다면)
        if (window.updateAuthUI) {
          window.currentUser.free_credits = userCreditsInfo.free_credits;
          window.currentUser.paid_credits = userCreditsInfo.paid_credits;
          window.currentUser.credits = userCreditsInfo.free_credits + userCreditsInfo.paid_credits;
          localStorage.setItem('postflow_user', JSON.stringify(window.currentUser));
          window.updateAuthUI();
        }
        
        if (window.updateCostEstimate) {
          window.updateCostEstimate();
        }
      }
      
      // 분석 결과 모달 표시
      showKeywordQualityModal(data.analysis, data.cached);
      
    } else {
      // 에러 처리
      if (response.status === 402) {
        showCreditShortageModal(data.cost_info);
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
  }
}

// ===================================
// 크레딧 부족 모달
// ===================================
function showCreditShortageModal(info) {
  const free = info?.free_credits ?? userCreditsInfo.free_credits;
  const paid = info?.paid_credits ?? userCreditsInfo.paid_credits;
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
          <button onclick="applyAnalyzedKeywords()" style="
            background: linear-gradient(135deg, #667eea, #764ba2); color: white;
            border: none; padding: 1rem 2rem; border-radius: 15px; cursor: pointer;
            font-weight: bold; font-size: 1.05rem; transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            ✅ 상위 키워드 콘텐츠에 적용하기
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===================================
// 분석된 키워드를 콘텐츠 생성 폼에 적용
// ===================================
function applyAnalyzedKeywords() {
  const modal = document.getElementById('keywordQualityModal');
  if (!modal) return;

  // 모달에서 키워드 추출
  const keywordElements = modal.querySelectorAll('h4');
  const keywords = [];
  
  keywordElements.forEach(el => {
    const text = el.textContent;
    const match = text.match(/\d+\.\s*(.+)/);
    if (match) {
      keywords.push(match[1].trim());
    }
  });

  if (keywords.length > 0) {
    // 상위 3개 키워드를 콘텐츠 폼에 적용
    const topKeywords = keywords.slice(0, 3).join(', ');
    
    // 키워드 입력 필드 찾기
    const keywordInput = document.querySelector('input[name="keywords"]') ||
                         document.getElementById('keywords') ||
                         document.querySelector('#keywords-0');
    
    if (keywordInput) {
      keywordInput.value = topKeywords;
      keywordInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      if (typeof window.showToast === 'function') {
        window.showToast(`✅ 상위 ${Math.min(3, keywords.length)}개 키워드가 적용되었습니다!`, 'success');
      } else {
        alert(`상위 ${Math.min(3, keywords.length)}개 키워드가 적용되었습니다!`);
      }
    }
    
    modal.remove();
  }
}

// ===================================
// 페이지 초기화
// ===================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 하이브리드 크레딧 시스템 초기화 중...');
  
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
  
  // 사용자 크레딧 정보 로드 (3초 후 - 인증 완료 충분히 대기)
  setTimeout(async () => {
    console.log('🔄 크레딧 정보 로드 시작...');
    await loadKeywordCreditStatus();
  }, 3000);
});

// 전역 함수 노출
window.analyzeKeywordsQuality = analyzeKeywordsQuality;
window.setKeywordSample = setKeywordSample;
window.showKeywordQualityModal = showKeywordQualityModal;
window.applyAnalyzedKeywords = applyAnalyzedKeywords;
window.loadKeywordCreditStatus = loadKeywordCreditStatus;
