/*
=================================================================
키워드 분석 확장 기능 - 프론트엔드 UI
3가지 핵심 기능: 기록 조회, 키워드 비교, 월간 리포트
=================================================================
*/

// ===================================
// 1. 분석 기록 조회 UI
// ===================================
async function showKeywordHistory() {
  if (!window.currentUser || window.currentUser.isGuest) {
    if (typeof window.showToast === 'function') {
      window.showToast('⚠️ 로그인 후 이용 가능합니다', 'warning');
    } else {
      alert('로그인 후 이용 가능합니다');
    }
    return;
  }
  
  if (typeof window.showToast === 'function') {
    window.showToast('📜 분석 기록을 불러오는 중...', 'info');
  }
  
  try {
    const response = await fetch(`/api/keyword-history?user_id=${window.currentUser.id}&limit=30`);
    const data = await response.json();
    
    if (!data.success) {
      if (typeof window.showToast === 'function') {
        window.showToast('❌ 기록 조회 실패: ' + data.error, 'error');
      } else {
        alert('기록 조회 실패: ' + data.error);
      }
      return;
    }
    
    const modalHTML = `
      <div id="historyModal" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        overflow-y: auto; padding: 1rem 0;
      " onclick="if(event.target.id === 'historyModal') document.getElementById('historyModal').remove()">
        <div style="
          background: white; border-radius: 20px; padding: 2rem;
          max-width: 800px; width: 95%; max-height: 85vh; overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0,0,0,0.4);
        " onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2 style="margin: 0; font-size: 1.8rem; font-weight: bold; color: #111827;">
              📜 키워드 분석 기록
            </h2>
            <button onclick="document.getElementById('historyModal').remove()" style="
              background: none; border: none; font-size: 2rem; color: #9ca3af;
              cursor: pointer; line-height: 1;
            ">×</button>
          </div>
          
          ${data.history.length === 0 ? `
            <div style="text-align: center; padding: 4rem 2rem; color: #6b7280;">
              <div style="font-size: 4rem; margin-bottom: 1rem;">📭</div>
              <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; color: #374151;">분석 기록이 없습니다</h3>
              <p style="line-height: 1.6;">키워드를 분석하면 여기에 기록이 저장됩니다.</p>
            </div>
          ` : `
            <div style="display: grid; gap: 1rem;">
              ${data.history.map(item => {
                const date = new Date(item.created_at);
                const dateStr = date.toLocaleDateString('ko-KR');
                const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                
                const costBadge = {
                  'daily_free': { text: '🆓 일일무료', color: '#10b981', bg: '#dcfce7' },
                  'free_credit': { text: '💎 무료크레딧', color: '#3b82f6', bg: '#dbeafe' },
                  'paid_credit': { text: '💰 유료크레딧', color: '#f59e0b', bg: '#fef3c7' },
                  'cached': { text: '⚡ 캐시', color: '#8b5cf6', bg: '#ede9fe' }
                }[item.cost_source] || { text: '분석', color: '#6b7280', bg: '#f1f5f9' };
                
                const scoreColor = item.overall_score >= 80 ? '#10b981' : 
                                 item.overall_score >= 60 ? '#f59e0b' : '#ef4444';
                
                return `
                  <div style="
                    border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem;
                    background: #f9fafb; cursor: pointer; transition: all 0.2s;
                  " onclick='showHistoryDetail(${JSON.stringify(item).replace(/'/g, "\\'")})'
                     onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                     onmouseout="this.style.boxShadow='none'">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                      <div style="flex: 1;">
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: #111827; line-height: 1.3;">
                          ${item.keywords}
                        </h3>
                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                          <span style="
                            background: ${costBadge.bg}; color: ${costBadge.color};
                            padding: 0.3rem 0.7rem; border-radius: 12px; font-size: 0.75rem;
                            font-weight: 600; border: 1px solid ${costBadge.color}20;
                          ">${costBadge.text}</span>
                          <span style="color: #6b7280; font-size: 0.85rem;">
                            ${dateStr} ${timeStr}
                          </span>
                        </div>
                      </div>
                      <div style="text-align: right; margin-left: 1rem;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: ${scoreColor};">
                          ${item.overall_score}점
                        </div>
                        <div style="font-size: 0.8rem; color: #6b7280;">
                          TOP: ${item.top_keyword || '-'}
                        </div>
                      </div>
                    </div>
                    <div style="
                      background: #e0f2fe; color: #0284c7; padding: 0.5rem 1rem;
                      border-radius: 8px; text-align: center; font-size: 0.85rem; font-weight: 600;
                    ">
                      🔍 클릭하여 상세 결과 다시 보기
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
  } catch (error) {
    console.error('기록 조회 실패:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('❌ 기록 조회 중 오류가 발생했습니다', 'error');
    } else {
      alert('기록 조회 중 오류가 발생했습니다');
    }
  }
}

// 히스토리 상세 보기 (기존 모달 재사용)
function showHistoryDetail(item) {
  if (!item.full_result || !item.full_result.keywords) {
    if (typeof window.showToast === 'function') {
      window.showToast('❌ 상세 정보를 불러올 수 없습니다', 'error');
    } else {
      alert('상세 정보를 불러올 수 없습니다');
    }
    return;
  }
  
  // 기존 히스토리 모달 닫기
  const historyModal = document.getElementById('historyModal');
  if (historyModal) historyModal.remove();
  
  // 기존 키워드 분석 결과 모달 재사용
  if (typeof window.showKeywordQualityModal === 'function') {
    window.showKeywordQualityModal(item.full_result, true);
  }
}

// ===================================
// 2. 월간 리포트 UI
// ===================================
async function showMonthlyReport() {
  if (!window.currentUser || window.currentUser.isGuest) {
    if (typeof window.showToast === 'function') {
      window.showToast('⚠️ 로그인 후 이용 가능합니다', 'warning');
    } else {
      alert('로그인 후 이용 가능합니다');
    }
    return;
  }
  
  if (typeof window.showToast === 'function') {
    window.showToast('📊 월간 리포트를 생성 중...', 'info');
  }
  
  try {
    const response = await fetch(`/api/keyword-monthly-report?user_id=${window.currentUser.id}`);
    const data = await response.json();
    
    if (!data.success) {
      if (typeof window.showToast === 'function') {
        window.showToast('❌ 리포트 생성 실패: ' + data.error, 'error');
      } else {
        alert('리포트 생성 실패: ' + data.error);
      }
      return;
    }
    
    const report = data.report;
    const currentMonth = new Date().getMonth() + 1;
    
    const modalHTML = `
      <div id="monthlyReportModal" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        overflow-y: auto; padding: 1rem 0;
      " onclick="if(event.target.id === 'monthlyReportModal') document.getElementById('monthlyReportModal').remove()">
        <div style="
          background: white; border-radius: 20px; padding: 2rem;
          max-width: 800px; width: 95%; max-height: 85vh; overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0,0,0,0.4);
        " onclick="event.stopPropagation()">
          <div style="text-align: center; margin-bottom: 2rem; position: relative;">
            <button onclick="document.getElementById('monthlyReportModal').remove()" style="
              position: absolute; right: 0; top: 0; background: none; border: none;
              font-size: 2rem; color: #9ca3af; cursor: pointer;
            ">×</button>
            <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
            <h2 style="font-size: 1.8rem; font-weight: bold; color: #111827; margin-bottom: 0.5rem;">
              ${currentMonth}월 키워드 분석 리포트
            </h2>
            <p style="color: #6b7280;">이번 달 활동 요약 및 인사이트</p>
          </div>
          
          <!-- 종합 통계 카드 -->
          <div style="
            background: linear-gradient(135deg, #667eea, #764ba2); color: white;
            padding: 2rem; border-radius: 15px; text-align: center; margin-bottom: 2rem;
          ">
            <div style="font-size: 1rem; opacity: 0.9; margin-bottom: 0.5rem;">총 분석 횟수</div>
            <div style="font-size: 3rem; font-weight: bold; margin-bottom: 1rem;">
              ${report.total_analyses}회
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 1.5rem;">
              <div>
                <div style="font-size: 1.3rem; font-weight: bold;">${report.cost_breakdown.daily_free}</div>
                <div style="font-size: 0.75rem; opacity: 0.9;">일일무료</div>
              </div>
              <div>
                <div style="font-size: 1.3rem; font-weight: bold;">${report.cost_breakdown.free_credit}</div>
                <div style="font-size: 0.75rem; opacity: 0.9;">무료크레딧</div>
              </div>
              <div>
                <div style="font-size: 1.3rem; font-weight: bold;">${report.cost_breakdown.paid_credit}</div>
                <div style="font-size: 0.75rem; opacity: 0.9;">유료크레딧</div>
              </div>
              <div>
                <div style="font-size: 1.3rem; font-weight: bold;">${report.cost_breakdown.cached}</div>
                <div style="font-size: 0.75rem; opacity: 0.9;">캐시</div>
              </div>
            </div>
          </div>
          
          <!-- 평균 점수 및 베스트 키워드 -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
            <div style="
              background: #f0f9ff; padding: 1.5rem; border-radius: 12px; text-align: center;
              border: 1px solid #bae6fd;
            ">
              <div style="font-size: 0.9rem; color: #1e40af; margin-bottom: 0.5rem;">평균 점수</div>
              <div style="font-size: 2.5rem; font-weight: bold; color: #1d4ed8;">
                ${report.avg_score}점
              </div>
            </div>
            <div style="
              background: #fef3c7; padding: 1.5rem; border-radius: 12px; text-align: center;
              border: 1px solid #fcd34d;
            ">
              <div style="font-size: 0.9rem; color: #92400e; margin-bottom: 0.5rem;">최고 점수</div>
              <div style="font-size: 2.5rem; font-weight: bold; color: #d97706;">
                ${report.highest_score}점
              </div>
              <div style="font-size: 0.8rem; color: #92400e; margin-top: 0.3rem;">
                #${report.best_keyword}
              </div>
            </div>
          </div>
          
          <!-- TOP 10 키워드 -->
          ${report.top_keywords.length > 0 ? `
            <div style="margin-bottom: 2rem;">
              <h3 style="font-size: 1.3rem; font-weight: bold; color: #111827; margin-bottom: 1rem;">
                🏆 이달의 TOP ${Math.min(report.top_keywords.length, 10)} 키워드
              </h3>
              <div style="display: grid; gap: 0.75rem;">
                ${report.top_keywords.slice(0, 10).map((kw, idx) => {
                  const getScoreColor = (score) => {
                    if (score >= 80) return '#10b981';
                    if (score >= 60) return '#f59e0b';
                    return '#ef4444';
                  };
                  
                  const scoreColor = getScoreColor(kw.avg_score);
                  
                  return `
                    <div style="
                      display: flex; justify-content: space-between; align-items: center;
                      padding: 1rem 1.5rem; background: #f9fafb; border-radius: 12px;
                      border-left: 4px solid ${scoreColor};
                    ">
                      <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="
                          width: 32px; height: 32px; border-radius: 50%;
                          background: ${scoreColor}; color: white;
                          display: flex; align-items: center; justify-content: center;
                          font-weight: bold; font-size: 0.9rem;
                        ">
                          ${idx + 1}
                        </div>
                        <div>
                          <div style="font-weight: 600; color: #111827; font-size: 1rem;">
                            #${kw.keyword}
                          </div>
                          <div style="font-size: 0.8rem; color: #6b7280;">
                            ${kw.analysis_count}회 분석
                          </div>
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: ${scoreColor};">
                          ${kw.avg_score}점
                        </div>
                        <div style="font-size: 0.75rem; color: #6b7280;">평균</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- AI 인사이트 -->
          <div style="
            background: #f0f9ff; border-left: 4px solid #3b82f6;
            padding: 1.5rem; border-radius: 10px;
          ">
            <h3 style="font-size: 1.1rem; font-weight: bold; color: #1e40af; margin-bottom: 1rem;">
              💡 AI 인사이트
            </h3>
            ${report.insights.map(insight => `
              <p style="margin: 0.5rem 0; color: #1e40af; line-height: 1.6;">• ${insight}</p>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
  } catch (error) {
    console.error('월간 리포트 생성 실패:', error);
    if (typeof window.showToast === 'function') {
      window.showToast('❌ 월간 리포트 생성 중 오류가 발생했습니다', 'error');
    } else {
      alert('월간 리포트 생성 중 오류가 발생했습니다');
    }
  }
}

// ===================================
// 전역 함수 등록
// ===================================
window.showKeywordHistory = showKeywordHistory;
window.showMonthlyReport = showMonthlyReport;
window.showHistoryDetail = showHistoryDetail;

console.log('✅ 키워드 분석 확장 기능 로드 완료');
