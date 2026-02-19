/**
 * 카드뉴스 레이아웃 템플릿 v1.0
 * 8가지 HTML/CSS 패턴 — workers-og(satori) 호환
 * 
 * 각 템플릿은 satori 호환 HTML+CSS를 반환
 * (flexbox만 사용, grid/position:absolute 제한적 지원)
 */
(function () {
  'use strict';

  var TEMPLATES = {
    // 1. 풀이미지 + 하단 텍스트 오버레이
    fullImageOverlay: {
      name: '풀이미지 오버레이',
      description: '배경 이미지 위에 하단 텍스트',
      generate: function (opts) {
        return {
          bg: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.8) 100%)',
          textPosition: 'bottom',
          textAlign: 'left'
        };
      }
    },
    // 2. 상단 제목 + 중앙 이미지
    topTitleCenterImage: {
      name: '상단 제목 + 중앙 이미지',
      description: '상단에 제목, 중앙에 이미지',
      generate: function (opts) {
        return {
          bg: opts.bgColor || '#ffffff',
          textPosition: 'top',
          textAlign: 'center'
        };
      }
    },
    // 3. 좌우 분할 (텍스트 좌 + 이미지 우)
    splitLeftRight: {
      name: '좌우 분할',
      description: '좌측 텍스트, 우측 이미지',
      generate: function (opts) {
        return {
          bg: opts.bgColor || '#f8f9fa',
          textPosition: 'left',
          textAlign: 'left',
          split: true
        };
      }
    },
    // 4. 중앙 텍스트 + 그라데이션 배경
    centerTextGradient: {
      name: '중앙 텍스트 그라데이션',
      description: '그라데이션 배경 위 중앙 텍스트',
      generate: function (opts) {
        return {
          bg: opts.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textPosition: 'center',
          textAlign: 'center'
        };
      }
    },
    // 5. 카드 스타일 (흰 박스 + 그림자)
    cardStyle: {
      name: '카드 스타일',
      description: '흰색 카드 박스 안에 콘텐츠',
      generate: function (opts) {
        return {
          bg: opts.bgColor || '#e8e0f0',
          textPosition: 'center',
          textAlign: 'center',
          cardBox: true
        };
      }
    },
    // 6. 번호형 스텝 (숫자 + 내용)
    numberedStep: {
      name: '번호형 스텝',
      description: '큰 숫자와 설명 텍스트',
      generate: function (opts) {
        return {
          bg: opts.bgColor || '#1a1a2e',
          textPosition: 'center',
          textAlign: 'left',
          numbered: true
        };
      }
    },
    // 7. 인용구 스타일 (큰 따옴표)
    quoteStyle: {
      name: '인용구 스타일',
      description: '큰 따옴표와 인용 텍스트',
      generate: function (opts) {
        return {
          bg: opts.bgColor || '#fef3c7',
          textPosition: 'center',
          textAlign: 'center',
          quote: true
        };
      }
    },
    // 8. CTA (행동 유도) 스타일
    ctaStyle: {
      name: 'CTA 행동유도',
      description: '행동 유도 버튼 포함 레이아웃',
      generate: function (opts) {
        return {
          bg: opts.gradient || 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          textPosition: 'center',
          textAlign: 'center',
          cta: true
        };
      }
    }
  };

  window.CardNewsTemplates = {
    getAll: function () { return TEMPLATES; },
    get: function (name) { return TEMPLATES[name] || TEMPLATES.fullImageOverlay; },
    getNames: function () { return Object.keys(TEMPLATES); },

    /**
     * 역할(role)에 따른 기본 템플릿 매핑
     */
    getDefaultForRole: function (role, index) {
      switch (role) {
        case 'cover': return 'fullImageOverlay';
        case 'cta': return 'ctaStyle';
        default:
          // 본문: 번갈아 사용
          var bodyTemplates = ['topTitleCenterImage', 'splitLeftRight', 'centerTextGradient', 'cardStyle', 'numberedStep', 'quoteStyle'];
          return bodyTemplates[(index - 1) % bodyTemplates.length];
      }
    }
  };

  console.log('[CardNewsTemplates] ' + Object.keys(TEMPLATES).length + '개 템플릿 로드 완료');
})();
