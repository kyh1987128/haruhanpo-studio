/**
 * Supabase Storage 유틸리티
 * 파일 업로드 및 URL 생성
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * 파일 업로드 결과
 */
export interface UploadResult {
  success: boolean;
  storagePath: string;
  publicUrl: string;
  error?: string;
}

/**
 * Supabase Storage에 파일 업로드
 * 
 * @param supabase Supabase 클라이언트
 * @param file 업로드할 파일
 * @param userId 사용자 ID
 * @param bucketName 버킷 이름 (기본값: 'haruhanpo-files')
 * @returns 업로드 결과
 */
export async function uploadToSupabase(
  supabase: SupabaseClient,
  file: File,
  userId: string,
  bucketName: string = 'haruhanpo-files'
): Promise<UploadResult> {
  try {
    // 파일명 생성 (충돌 방지)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'bin';
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100); // 파일명 길이 제한
    
    const fileName = `${userId}/${timestamp}_${randomStr}_${sanitizedFileName}`;
    
    // 파일 업로드
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Supabase Storage 업로드 실패:', error);
      return {
        success: false,
        storagePath: '',
        publicUrl: '',
        error: error.message
      };
    }
    
    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    return {
      success: true,
      storagePath: fileName,
      publicUrl: urlData.publicUrl,
    };
  } catch (error: any) {
    console.error('파일 업로드 예외:', error);
    return {
      success: false,
      storagePath: '',
      publicUrl: '',
      error: error.message
    };
  }
}

/**
 * 여러 파일 일괄 업로드
 */
export async function uploadMultipleFiles(
  supabase: SupabaseClient,
  files: File[],
  userId: string,
  bucketName: string = 'haruhanpo-files'
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => 
    uploadToSupabase(supabase, file, userId, bucketName)
  );
  
  return Promise.all(uploadPromises);
}

/**
 * 파일 삭제
 */
export async function deleteFromSupabase(
  supabase: SupabaseClient,
  storagePath: string,
  bucketName: string = 'haruhanpo-files'
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([storagePath]);
    
    if (error) {
      console.error('파일 삭제 실패:', error);
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error('파일 삭제 예외:', error);
    return false;
  }
}

/**
 * 만료된 파일 조회 및 삭제
 * (Cron 작업용)
 */
export async function deleteExpiredFiles(
  supabase: SupabaseClient,
  bucketName: string = 'haruhanpo-files'
): Promise<number> {
  try {
    // 만료된 파일 조회
    const { data: expiredFiles, error: queryError } = await supabase
      .from('uploaded_files')
      .select('storage_path')
      .lt('expires_at', new Date().toISOString());
    
    if (queryError) throw queryError;
    if (!expiredFiles || expiredFiles.length === 0) return 0;
    
    // 파일 삭제
    const storagePaths = expiredFiles.map(f => f.storage_path);
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(storagePaths);
    
    if (deleteError) throw deleteError;
    
    // DB 레코드 삭제 (PostgreSQL 함수 사용)
    const { data: deletedCount } = await supabase.rpc('delete_expired_files');
    
    return deletedCount as number || 0;
  } catch (error: any) {
    console.error('만료 파일 삭제 실패:', error);
    return 0;
  }
}
