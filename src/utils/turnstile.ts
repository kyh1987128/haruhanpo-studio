/**
 * Cloudflare Turnstile 검증 유틸리티
 * 봇 방어를 위한 Captcha 검증
 */

export interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

/**
 * Turnstile 토큰 검증
 * @param token 클라이언트에서 받은 Turnstile 토큰
 * @param secretKey Turnstile Secret Key
 * @param remoteip 요청자 IP (선택)
 * @returns 검증 결과
 */
export async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteip?: string
): Promise<TurnstileVerifyResponse> {
  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteip) {
      formData.append('remoteip', remoteip);
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      console.error('[Turnstile] 검증 API 호출 실패:', response.status);
      return {
        success: false,
        'error-codes': ['api-error']
      };
    }

    const result: TurnstileVerifyResponse = await response.json();
    return result;
  } catch (error) {
    console.error('[Turnstile] 검증 중 예외:', error);
    return {
      success: false,
      'error-codes': ['internal-error']
    };
  }
}

/**
 * Turnstile 에러 코드를 사용자 친화적 메시지로 변환
 */
export function getTurnstileErrorMessage(errorCodes?: string[]): string {
  if (!errorCodes || errorCodes.length === 0) {
    return '봇 검증에 실패했습니다.';
  }

  const errorMessages: Record<string, string> = {
    'missing-input-secret': '서버 설정 오류입니다.',
    'invalid-input-secret': '서버 설정 오류입니다.',
    'missing-input-response': '봇 검증 토큰이 누락되었습니다.',
    'invalid-input-response': '봇 검증 토큰이 유효하지 않습니다.',
    'bad-request': '잘못된 요청입니다.',
    'timeout-or-duplicate': '봇 검증 시간이 만료되었거나 중복 요청입니다. 새로고침 후 다시 시도해주세요.',
    'internal-error': '봇 검증 중 오류가 발생했습니다.',
    'api-error': '봇 검증 서비스에 연결할 수 없습니다.'
  };

  const firstError = errorCodes[0];
  return errorMessages[firstError] || '봇 검증에 실패했습니다. 다시 시도해주세요.';
}

/**
 * Feature Flag: Turnstile 활성화 여부
 * 환경 변수로 제어 가능
 */
export function isTurnstileEnabled(env: any): boolean {
  // TURNSTILE_ENABLED 환경 변수로 제어
  // 설정되지 않았으면 프로덕션에서만 활성화
  if (env.TURNSTILE_ENABLED !== undefined) {
    return env.TURNSTILE_ENABLED === 'true' || env.TURNSTILE_ENABLED === true;
  }

  // 기본값: 프로덕션 환경에서만 활성화
  return env.ENVIRONMENT === 'production';
}
