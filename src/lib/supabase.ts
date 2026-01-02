/**
 * Supabase 클라이언트 초기화 및 유틸리티 함수
 * - Service Key: 관리자 권한 (RLS 바이패스)
 * - Anon Key: 사용자 권한 (RLS 적용)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 타입 정의
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          credits: number;
          subscription_status: string;
          subscription_plan: string;
          onboarding_completed: boolean;
          first_generation_completed: boolean;
          consecutive_login_days: number;
          last_login_date: string | null;
          monthly_free_usage_count: number;
          monthly_usage_reset_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['users']['Row']>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referee_id: string;
          referral_code: string | null;
          reward_given: boolean;
          created_at: string;
        };
      };
    };
    Functions: {
      grant_milestone_credit: {
        Args: { user_id_param: string; milestone_type: string };
        Returns: { success: boolean; new_credits: number };
      };
      update_consecutive_login: {
        Args: { user_id_param: string };
        Returns: { consecutive_days: number; streak_reward_eligible: boolean };
      };
      check_and_use_monthly_quota: {
        Args: { user_id_param: string };
        Returns: { available: boolean; remaining: number };
      };
      grant_referral_reward: {
        Args: { p_referral_id: string };
        Returns: boolean;
      };
    };
  };
}

/**
 * Supabase 관리자 클라이언트 생성 (Service Key 사용)
 * RLS 바이패스, 모든 데이터에 접근 가능
 */
export function createSupabaseAdmin(
  url: string,
  serviceKey: string
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Supabase 사용자 클라이언트 생성 (Anon Key 사용)
 * RLS 적용, 사용자 권한으로만 접근
 */
export function createSupabaseClient(
  url: string,
  anonKey: string
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey);
}

/**
 * 마일스톤 보상 지급
 * @param supabase Supabase Admin 클라이언트
 * @param userId 사용자 ID
 * @param milestoneType 보상 타입 (onboarding_completed, first_generation_completed, streak_3days_completed)
 * @returns 성공 여부 및 새 크레딧 잔액
 */
export async function grantMilestoneCredit(
  supabase: SupabaseClient<Database>,
  userId: string,
  milestoneType: string
): Promise<{ success: boolean; new_credits: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('grant_milestone_credit', {
      user_id_param: userId,
      milestone_type: milestoneType
    });

    if (error) {
      console.error('[Supabase] grant_milestone_credit 실패:', error);
      return { success: false, new_credits: 0, error: error.message };
    }

    return { success: data.success, new_credits: data.new_credits };
  } catch (error: any) {
    console.error('[Supabase] grant_milestone_credit 예외:', error);
    return { success: false, new_credits: 0, error: error.message };
  }
}

/**
 * 연속 로그인 업데이트
 * @param supabase Supabase Admin 클라이언트
 * @param userId 사용자 ID
 * @returns 연속 일수 및 3일 달성 여부
 */
export async function updateConsecutiveLogin(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ consecutive_days: number; streak_reward_eligible: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('update_consecutive_login', {
      user_id_param: userId
    });

    if (error) {
      console.error('[Supabase] update_consecutive_login 실패:', error);
      return { consecutive_days: 0, streak_reward_eligible: false, error: error.message };
    }

    return {
      consecutive_days: data.consecutive_days,
      streak_reward_eligible: data.streak_reward_eligible
    };
  } catch (error: any) {
    console.error('[Supabase] update_consecutive_login 예외:', error);
    return { consecutive_days: 0, streak_reward_eligible: false, error: error.message };
  }
}

/**
 * 월간 무료 사용량 체크 및 차감
 * @param supabase Supabase Admin 클라이언트
 * @param userId 사용자 ID
 * @returns 사용 가능 여부 및 남은 횟수
 */
export async function checkAndUseMonthlyQuota(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ available: boolean; remaining: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_and_use_monthly_quota', {
      user_id_param: userId
    });

    if (error) {
      console.error('[Supabase] check_and_use_monthly_quota 실패:', error);
      return { available: false, remaining: 0, error: error.message };
    }

    return { available: data.available, remaining: data.remaining };
  } catch (error: any) {
    console.error('[Supabase] check_and_use_monthly_quota 예외:', error);
    return { available: false, remaining: 0, error: error.message };
  }
}

/**
 * 리퍼럴 보상 지급
 * @param supabase Supabase Admin 클라이언트
 * @param referralId 리퍼럴 ID
 * @returns 성공 여부
 */
export async function grantReferralReward(
  supabase: SupabaseClient<Database>,
  referralId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('grant_referral_reward', {
      p_referral_id: referralId
    });

    if (error) {
      console.error('[Supabase] grant_referral_reward 실패:', error);
      return { success: false, error: error.message };
    }

    return { success: data };
  } catch (error: any) {
    console.error('[Supabase] grant_referral_reward 예외:', error);
    return { success: false, error: error.message };
  }
}
