/**
 * 파일 처리 유틸리티
 * Cloudflare Workers 환경에서 이미지/문서 파일 처리
 * 
 * ⚠️ 중요: Cloudflare Workers는 Node.js 환경이 아니므로
 * pdfjs-dist, mammoth 등은 직접 사용 불가
 * → Web API 및 외부 라이브러리를 활용한 대체 방식 사용
 */

/**
 * 파일 분류 인터페이스
 */
export interface FileClassification {
  images: File[];
  documents: File[];
}

/**
 * 컨텍스트 입력 인터페이스
 */
export interface ContextInput {
  imageAnalysis: string | null;
  extractedTexts: string[];
  userVariables: Record<string, any>;
  keywords: string;
}

/**
 * 파일 처리 결과
 */
export interface ProcessedFile {
  fileName: string;
  fileType: 'image' | 'pdf' | 'docx' | 'txt';
  fileSize: number;
  mimeType: string;
  content?: string; // 텍스트 파일 또는 추출된 텍스트
  error?: string;
}

/**
 * 파일 타입 감지
 */
export function getFileType(fileName: string, mimeType: string): 'image' | 'pdf' | 'docx' | 'txt' | 'unknown' {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  // 이미지 파일
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }
  
  // PDF
  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  
  // DOCX
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  
  // TXT
  if (ext === 'txt' || mimeType === 'text/plain') {
    return 'txt';
  }
  
  return 'unknown';
}

/**
 * 파일 분류: 이미지 vs 문서
 */
export function classifyFiles(files: File[]): FileClassification {
  const images: File[] = [];
  const documents: File[] = [];
  
  files.forEach(file => {
    const fileType = getFileType(file.name, file.type);
    
    if (fileType === 'image') {
      images.push(file);
    } else if (['pdf', 'docx', 'txt'].includes(fileType)) {
      documents.push(file);
    } else {
      console.warn(`지원하지 않는 파일 형식: ${file.name} (${file.type})`);
    }
  });
  
  return { images, documents };
}

/**
 * TXT 파일 텍스트 추출 (가장 간단)
 */
export async function extractTextFromTXT(file: File): Promise<string> {
  try {
    const text = await file.text();
    return text.trim();
  } catch (error: any) {
    console.error('TXT 파일 읽기 실패:', error);
    throw new Error(`TXT 파일 처리 실패: ${error.message}`);
  }
}

/**
 * PDF 텍스트 추출
 * 
 * ⚠️ Cloudflare Workers 제약:
 * - pdfjs-dist는 Node.js 환경 의존으로 직접 사용 불가
 * - 대안 1: PDF.js 빌드된 버전 사용 (복잡)
 * - 대안 2: 외부 API 사용 (예: pdf.co, pdfparser.io)
 * - 대안 3: Cloudflare Workers용 경량 PDF 파서 (제한적)
 * 
 * 여기서는 간단한 텍스트 추출만 시도 (완전하지 않음)
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    // PDF는 바이너리 형식이므로 직접 디코딩은 제한적
    // 순수 텍스트만 추출 시도 (불완전)
    const textContent = text
      .replace(/[^\x20-\x7E\n\r]/g, '') // ASCII 외 문자 제거
      .replace(/\s+/g, ' ')
      .trim();
    
    if (textContent.length < 10) {
      throw new Error('PDF에서 텍스트를 추출할 수 없습니다. 외부 API 또는 OCR이 필요합니다.');
    }
    
    return textContent;
  } catch (error: any) {
    console.error('PDF 텍스트 추출 실패:', error);
    
    // ⚠️ 프로덕션에서는 외부 API 사용 권장
    return `[PDF 파일: ${file.name}]\n텍스트 추출 실패. OCR 또는 외부 API가 필요합니다.`;
  }
}

/**
 * DOCX 텍스트 추출
 * 
 * ⚠️ Cloudflare Workers 제약:
 * - mammoth는 Node.js 환경 의존
 * - 대안: DOCX를 ZIP으로 해제 → document.xml 파싱
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // DOCX는 ZIP 압축된 XML 파일 모음
    // Cloudflare Workers에서는 직접 파싱이 복잡함
    // 간단한 메타데이터만 반환
    return `[DOCX 파일: ${file.name}]\n완전한 텍스트 추출을 위해서는 외부 API가 필요합니다.\n\n파일 크기: ${Math.round(file.size / 1024)}KB`;
  } catch (error: any) {
    console.error('DOCX 텍스트 추출 실패:', error);
    return `[DOCX 파일: ${file.name}]\n텍스트 추출 실패.`;
  }
}

/**
 * 문서 파일 처리 (여러 파일)
 */
export async function processDocuments(documents: File[]): Promise<string[]> {
  const extractedTexts: string[] = [];
  
  for (const doc of documents) {
    try {
      const fileType = getFileType(doc.name, doc.type);
      let text = '';
      
      if (fileType === 'txt') {
        text = await extractTextFromTXT(doc);
      } else if (fileType === 'pdf') {
        text = await extractTextFromPDF(doc);
      } else if (fileType === 'docx') {
        text = await extractTextFromDOCX(doc);
      } else {
        text = `[지원하지 않는 파일 형식: ${doc.name}]`;
      }
      
      extractedTexts.push(text);
    } catch (error: any) {
      console.error(`문서 처리 실패: ${doc.name}`, error);
      extractedTexts.push(`[${doc.name}] 처리 실패: ${error.message}`);
    }
  }
  
  return extractedTexts;
}

/**
 * 동적 통합 컨텍스트 생성 (핵심 함수)
 * 
 * 있는 정보만 선택적으로 프롬프트에 포함
 */
export function buildIntegratedContext(input: ContextInput): string {
  let context = '';
  
  // 1. 이미지 분석 (있을 때만 포함)
  if (input.imageAnalysis && input.imageAnalysis.trim().length > 0) {
    context += `[이미지 분석]\n${input.imageAnalysis.trim()}\n\n`;
  }
  
  // 2. 문서 정보 (있을 때만 포함)
  if (input.extractedTexts.length > 0) {
    context += `[문서 정보]\n`;
    input.extractedTexts.forEach((text, index) => {
      if (text && text.trim().length > 0) {
        context += `문서 ${index + 1}:\n${text.trim()}\n\n`;
      }
    });
  }
  
  // 3. 키워드 (항상 포함)
  if (input.keywords && input.keywords.trim().length > 0) {
    context += `[키워드]\n${input.keywords.trim()}\n\n`;
  }
  
  // 4. 사용자 변수 (있을 때만 포함)
  if (input.userVariables && Object.keys(input.userVariables).length > 0) {
    context += `[필수 포함 정보]\n`;
    for (const [key, value] of Object.entries(input.userVariables)) {
      if (value !== undefined && value !== null && value !== '') {
        context += `- ${key}: ${value}\n`;
      }
    }
    context += '\n';
  }
  
  return context.trim();
}

/**
 * 파일 크기 검증
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * 파일 타입 검증
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  const fileType = getFileType(file.name, file.type);
  return allowedTypes.includes(fileType);
}

/**
 * 파일 배치 검증
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  imageCount: number;
  documentCount: number;
}

export function validateFiles(
  files: File[],
  options: {
    maxFiles?: number;
    maxFileSize?: number; // MB
    maxTotalSize?: number; // MB
    allowedTypes?: string[];
  } = {}
): FileValidationResult {
  const {
    maxFiles = 10,
    maxFileSize = 10,
    maxTotalSize = 50,
    allowedTypes = ['image', 'pdf', 'docx', 'txt']
  } = options;
  
  const errors: string[] = [];
  let totalSize = 0;
  let imageCount = 0;
  let documentCount = 0;
  
  // 파일 개수 검증
  if (files.length === 0) {
    errors.push('최소 1개의 파일을 업로드해주세요.');
  }
  
  if (files.length > maxFiles) {
    errors.push(`최대 ${maxFiles}개의 파일만 업로드 가능합니다.`);
  }
  
  // 각 파일 검증
  files.forEach((file, index) => {
    const fileType = getFileType(file.name, file.type);
    
    // 파일 타입 검증
    if (!allowedTypes.includes(fileType)) {
      errors.push(`${file.name}: 지원하지 않는 파일 형식입니다.`);
    }
    
    // 파일 크기 검증
    if (!validateFileSize(file, maxFileSize)) {
      errors.push(`${file.name}: 파일 크기가 ${maxFileSize}MB를 초과합니다.`);
    }
    
    totalSize += file.size;
    
    // 파일 개수 집계
    if (fileType === 'image') {
      imageCount++;
    } else if (['pdf', 'docx', 'txt'].includes(fileType)) {
      documentCount++;
    }
  });
  
  // 총 파일 크기 검증
  const totalSizeMB = totalSize / (1024 * 1024);
  if (totalSizeMB > maxTotalSize) {
    errors.push(`전체 파일 크기가 ${maxTotalSize}MB를 초과합니다. (현재: ${totalSizeMB.toFixed(2)}MB)`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    imageCount,
    documentCount
  };
}

/**
 * 시나리오 판단 및 비용 계산
 */
export interface ScenarioResult {
  scenario: 'image_only' | 'document_only' | 'integrated';
  cost: number;
  description: string;
}

export function determineScenario(imageCount: number, documentCount: number): ScenarioResult {
  if (imageCount > 0 && documentCount === 0) {
    return {
      scenario: 'image_only',
      cost: 92,
      description: 'Vision API 분석 + GPT-4o 생성 (표준 품질)'
    };
  } else if (imageCount === 0 && documentCount > 0) {
    return {
      scenario: 'document_only',
      cost: 40,
      description: '텍스트 추출 + GPT-4o-mini 생성 (비용 절감, 팩트 중심)'
    };
  } else if (imageCount > 0 && documentCount > 0) {
    return {
      scenario: 'integrated',
      cost: 105,
      description: 'Vision + 텍스트 통합 + GPT-4o 생성 (프리미엄 품질)'
    };
  } else {
    throw new Error('최소 1개의 파일(이미지 또는 문서)을 업로드해주세요.');
  }
}
