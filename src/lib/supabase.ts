/**
 * Supabase 클라이언트 유틸리티
 * Cloudflare Workers 환경에서 Supabase 연동
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 클라이언트 생성 (Anon Key)
 * 프론트엔드 및 인증된 요청에 사용
 */
export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Supabase 관리자 클라이언트 생성 (Service Role Key)
 * 백엔드 전용, RLS 우회 가능
 */
export function createSupabaseAdminClient(
  supabaseUrl: string,
  supabaseServiceKey: string
): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * 사용자 정보 조회
 */
export async function getUserById(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 크레딧 차감 (PostgreSQL 함수 호출)
 */
export async function deductCredit(
  supabase: SupabaseClient,
  userId: string,
  generationId?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('deduct_credit', {
    user_uuid: userId,
    generation_uuid: generationId || null
  });

  if (error) {
    console.error('크레딧 차감 실패:', error);
    return false;
  }

  return data as boolean;
}

/**
 * 크레딧 충전 (PostgreSQL 함수 호출)
 */
export async function addCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  paymentId?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('add_credits', {
    user_uuid: userId,
    credit_amount: amount,
    reason: reason,
    payment_uuid: paymentId || null
  });

  if (error) {
    console.error('크레딧 충전 실패:', error);
    return false;
  }

  return data as boolean;
}

/**
 * 생성 기록 저장
 */
export async function saveGeneration(
  supabase: SupabaseClient,
  data: {
    userId: string;
    fileType: 'image_only' | 'document_only' | 'integrated';
    imageCount: number;
    documentCount: number;
    platforms: string[];
    costKrw: number;
    success: boolean;
    errorMessage?: string;
    generationTimeMs?: number;
  }
) {
  const { data: generation, error } = await supabase
    .from('generations')
    .insert({
      user_id: data.userId,
      file_type: data.fileType,
      image_count: data.imageCount,
      document_count: data.documentCount,
      platforms: data.platforms,
      cost_krw: data.costKrw,
      success: data.success,
      error_message: data.errorMessage,
      generation_time_ms: data.generationTimeMs
    })
    .select()
    .single();

  if (error) throw error;
  return generation;
}

/**
 * 파일 정보 저장
 */
export async function saveUploadedFile(
  supabase: SupabaseClient,
  data: {
    userId: string;
    generationId?: string;
    fileName: string;
    fileType: 'image' | 'pdf' | 'docx' | 'txt';
    fileSize: number;
    mimeType: string;
    storagePath: string;
    storageUrl: string;
    extractedText?: string;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
  }
) {
  const { data: file, error } = await supabase
    .from('uploaded_files')
    .insert({
      user_id: data.userId,
      generation_id: data.generationId,
      file_name: data.fileName,
      file_type: data.fileType,
      file_size: data.fileSize,
      mime_type: data.mimeType,
      storage_path: data.storagePath,
      storage_url: data.storageUrl,
      extracted_text: data.extractedText,
      text_length: data.extractedText?.length || 0,
      processing_status: data.processingStatus,
      error_message: data.errorMessage
    })
    .select()
    .single();

  if (error) throw error;
  return file;
}
