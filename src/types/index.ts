/**
 * 하루한포 백엔드 TypeScript 타입 정의
 * 
 * 이 파일은 전체 애플리케이션에서 사용되는 타입을 정의합니다.
 */

// ========================================
// 환경 변수 타입
// ========================================

export interface Env {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  
  // Toss Payments
  TOSS_CLIENT_KEY: string;
  TOSS_SECRET_KEY: string;
  
  // OpenAI & Gemini
  OPENAI_API_KEY: string;
  GEMINI_API_KEY?: string; // Optional
  
  // 추가 설정
  ENVIRONMENT?: 'development' | 'production';
  DEBUG?: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  MAX_FILE_SIZE?: string;
  MAX_IMAGES?: string;
  MAX_DOCUMENTS?: string;
}

// ========================================
// 데이터베이스 스키마 타입
// ========================================

/**
 * 사용자 테이블 (users)
 */
export interface User {
  id: string; // UUID
  email: string;
  name: string;
  credits: number;
  subscription_status: 'free' | 'active' | 'cancelled' | 'expired';
  subscription_end_date: string | null; // ISO 8601 날짜
  google_id: string | null;
  created_at: string; // ISO 8601 날짜
  updated_at: string; // ISO 8601 날짜
}

/**
 * 생성 기록 테이블 (generations)
 */
export interface Generation {
  id: string; // UUID
  user_id: string; // UUID
  platforms: string[]; // PostgreSQL 배열
  images_count: number;
  documents_count: number;
  total_cost: number; // 원 단위
  ai_model: 'gpt-4o' | 'gpt-4o-mini' | 'gemini-1.5-flash';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  result_data: Record<string, any> | null; // JSONB
  created_at: string; // ISO 8601 날짜
}

/**
 * 크레딧 거래 내역 테이블 (credit_transactions)
 */
export interface CreditTransaction {
  id: string; // UUID
  user_id: string; // UUID
  amount: number; // 양수(충전), 음수(차감)
  transaction_type: 'deduct' | 'purchase' | 'subscription' | 'refund' | 'bonus';
  reference_type: 'generation' | 'payment' | 'admin' | 'trial';
  reference_id: string | null; // UUID
  balance_after: number;
  description: string | null;
  created_at: string; // ISO 8601 날짜
}

/**
 * 결제 내역 테이블 (payments)
 */
export interface Payment {
  id: string; // UUID
  user_id: string; // UUID
  order_id: string; // 토스 주문 ID
  payment_key: string | null; // 토스 결제 키
  amount: number; // 원 단위
  credits_purchased: number;
  payment_method: string | null; // 카드, 계좌이체 등
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_data: Record<string, any> | null; // JSONB
  created_at: string; // ISO 8601 날짜
  updated_at: string; // ISO 8601 날짜
}

/**
 * 업로드된 파일 테이블 (uploaded_files)
 */
export interface UploadedFile {
  id: string; // UUID
  user_id: string; // UUID
  generation_id: string | null; // UUID
  file_name: string;
  file_type: 'image' | 'pdf' | 'docx' | 'txt';
  file_size: number; // 바이트 단위
  storage_path: string; // Supabase Storage 경로
  extracted_text: string | null; // 문서에서 추출한 텍스트
  created_at: string; // ISO 8601 날짜
}

/**
 * 체험 사용 기록 테이블 (trial_usage)
 */
export interface TrialUsage {
  id: string; // UUID
  ip_address: string;
  device_fingerprint: string | null;
  user_agent: string | null;
  used_at: string; // ISO 8601 날짜
}

// ========================================
// API 요청/응답 타입
// ========================================

/**
 * /api/generate 요청 본문
 */
export interface GenerateRequest {
  // 이미지 파일 (base64 또는 URL)
  images?: string[];
  
  // 문서 파일 (base64 또는 URL)
  documents?: Array<{
    content: string; // base64 또는 URL
    filename: string;
    type: 'pdf' | 'docx' | 'txt';
  }>;
  
  // 브랜드 정보
  brand: string;
  companyName?: string;
  businessType?: string;
  location?: string;
  targetGender?: string;
  contact?: string;
  website?: string;
  sns?: string;
  keywords?: string;
  tone?: string;
  targetAge?: string;
  industry?: string;
  
  // 플랫폼 선택
  platforms: Array<'instagram' | 'blog' | 'threads' | 'youtube'>;
  
  // AI 모델 선택 (선택사항)
  aiModel?: 'gpt-4o' | 'gpt-4o-mini' | 'gemini-1.5-flash';
  
  // 강제 생성 (매칭 무시)
  forceGenerate?: boolean;
}

/**
 * /api/generate 응답
 */
export interface GenerateResponse {
  success: boolean;
  generation_id: string;
  platforms: string[];
  images_count: number;
  documents_count: number;
  total_cost: number;
  remaining_credits: number;
  result: {
    [platform: string]: {
      content: string;
      hashtags?: string[];
      title?: string;
    };
  };
  strategy?: {
    selected: 'integrated' | 'image-first' | 'keyword-first';
    confidence: number;
    reason: string;
    image_summary: string;
    user_input_summary: string;
  };
  warnings?: string[];
}

/**
 * /api/auth/me 응답
 */
export interface AuthMeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    credits: number;
    subscription_status: 'free' | 'active' | 'cancelled' | 'expired';
    subscription_end_date: string | null;
  };
  is_guest: boolean;
}

/**
 * 크레딧 부족 에러 응답
 */
export interface CreditErrorResponse {
  error: string;
  current_credits: number;
  required_credits: number;
  payment_options: {
    subscription: {
      price: number;
      credits: number;
      description: string;
    };
    one_time: Array<{
      price: number;
      credits: number;
      description: string;
    }>;
  };
}

// ========================================
// 토스페이먼츠 타입
// ========================================

/**
 * 토스 결제 요청
 */
export interface TossPaymentRequest {
  amount: number;
  orderName: string;
  customerName: string;
  customerEmail: string;
  successUrl?: string;
  failUrl?: string;
}

/**
 * 토스 결제 응답
 */
export interface TossPaymentResponse {
  paymentUrl: string;
  orderId: string;
  amount: number;
}

/**
 * 토스 결제 확인 요청
 */
export interface TossPaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

/**
 * 토스 Webhook 데이터
 */
export interface TossWebhookData {
  orderId: string;
  paymentKey: string;
  status: 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED';
  amount: number;
  method: string;
  approvedAt: string;
  signature?: string; // 서명 검증용
}

// ========================================
// 파일 처리 타입
// ========================================

/**
 * 파일 분류 결과
 */
export interface ClassifiedFiles {
  images: Array<{
    content: string; // base64 또는 URL
    filename: string;
    size: number;
  }>;
  documents: Array<{
    content: string; // base64 또는 URL
    filename: string;
    type: 'pdf' | 'docx' | 'txt';
    size: number;
  }>;
}

/**
 * 파일 처리 시나리오
 */
export type FileScenario = 'image-only' | 'document-only' | 'hybrid';

/**
 * 동적 컨텍스트
 */
export interface DynamicContext {
  scenario: FileScenario;
  cost_estimate: number; // 원 단위
  image_context: string | null;
  document_context: string | null;
  combined_context: string;
  warnings: string[];
}

// ========================================
// 미들웨어 타입
// ========================================

/**
 * Hono Context에 추가되는 변수
 */
export interface ContextVariables {
  user: User | null;
  isGuest: boolean;
  ipAddress: string;
  deviceFingerprint: string | null;
}

// ========================================
// 유틸리티 타입
// ========================================

/**
 * API 에러 응답
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: any;
}

/**
 * 페이지네이션 메타데이터
 */
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ========================================
// 상수
// ========================================

/**
 * 구독 가격 및 크레딧
 */
export const SUBSCRIPTION_CONFIG = {
  MONTHLY_PRICE: 9900, // 원
  MONTHLY_CREDITS: 30,
  FREE_TIER_CREDITS: 3,
  GUEST_TRIAL_CREDITS: 1,
} as const;

/**
 * 파일 제한
 */
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGES: 5,
  MAX_DOCUMENTS: 3,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
} as const;

/**
 * 비용 추정 (원 단위)
 */
export const COST_ESTIMATES = {
  IMAGE_ONLY: 92, // 시나리오1
  DOCUMENT_ONLY: 40, // 시나리오2
  HYBRID: 105, // 시나리오3
} as const;

/**
 * 플랫폼 목록
 */
export const PLATFORMS = [
  'instagram',
  'blog',
  'threads',
  'youtube',
] as const;

export type Platform = (typeof PLATFORMS)[number];

/**
 * AI 모델 목록
 */
export const AI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gemini-1.5-flash',
] as const;

export type AIModel = (typeof AI_MODELS)[number];
