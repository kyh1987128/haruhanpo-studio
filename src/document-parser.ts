/**
 * 첨부 문서 파싱 유틸리티
 * PDF, DOCX 파일을 텍스트로 변환
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Base64 문서를 텍스트로 변환
 * @param base64Data - Base64 인코딩된 문서 데이터 (data:application/pdf;base64,...)
 * @param fileType - MIME 타입 (application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 * @returns 추출된 텍스트
 */
export async function parseDocument(
  base64Data: string,
  fileType: string
): Promise<string> {
  try {
    // Base64에서 실제 데이터 추출 (data:...;base64, 제거)
    const base64Content = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;
    
    // Buffer로 변환
    const buffer = Buffer.from(base64Content, 'base64');

    // PDF 파싱
    if (fileType === 'application/pdf' || fileType.includes('pdf')) {
      console.log('📄 PDF 문서 파싱 중...');
      const data = await pdfParse(buffer);
      console.log(`✅ PDF 파싱 완료: ${data.numpages}페이지, ${data.text.length}자`);
      return data.text.trim();
    }

    // DOCX 파싱
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType.includes('word') ||
      fileType.includes('docx')
    ) {
      console.log('📝 Word 문서 파싱 중...');
      const result = await mammoth.extractRawText({ buffer });
      console.log(`✅ Word 파싱 완료: ${result.value.length}자`);
      return result.value.trim();
    }

    // DOC (구버전 Word) - mammoth 지원 제한적
    if (fileType.includes('msword') || fileType.includes('.doc')) {
      console.log('⚠️ 구버전 Word(.doc) 파일 - 파싱 제한적');
      try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value.trim();
      } catch (error) {
        console.error('❌ DOC 파싱 실패:', error);
        return '[문서 파싱 불가 - DOCX 형식으로 변환해주세요]';
      }
    }

    // TXT 파일 (직접 처리)
    if (fileType === 'text/plain' || fileType.includes('text')) {
      console.log('📋 텍스트 파일 읽기...');
      const text = buffer.toString('utf-8');
      console.log(`✅ 텍스트 읽기 완료: ${text.length}자`);
      return text.trim();
    }

    // 지원하지 않는 형식
    console.warn(`⚠️ 지원하지 않는 파일 형식: ${fileType}`);
    return '[지원하지 않는 파일 형식입니다. PDF, DOCX, TXT만 가능합니다.]';
  } catch (error: any) {
    console.error('❌ 문서 파싱 오류:', error.message);
    return `[문서 파싱 중 오류 발생: ${error.message}]`;
  }
}

/**
 * 여러 문서를 한번에 파싱
 * @param documents - 문서 배열 [{ dataUrl, type, name }]
 * @returns 파싱된 텍스트 배열
 */
export async function parseMultipleDocuments(
  documents: Array<{ dataUrl: string; type: string; name: string }>
): Promise<string[]> {
  console.log(`📚 ${documents.length}개 문서 파싱 시작...`);
  
  const parsedTexts = await Promise.all(
    documents.map(async (doc, index) => {
      console.log(`  ${index + 1}. ${doc.name} (${doc.type})`);
      const text = await parseDocument(doc.dataUrl, doc.type);
      return text;
    })
  );

  console.log(`✅ ${documents.length}개 문서 파싱 완료`);
  return parsedTexts;
}

/**
 * 파싱된 텍스트를 하나로 합치기
 * @param parsedTexts - 파싱된 텍스트 배열
 * @param fileNames - 파일명 배열 (선택)
 * @returns 합쳐진 텍스트
 */
export function combineDocumentTexts(
  parsedTexts: string[],
  fileNames?: string[]
): string {
  if (parsedTexts.length === 0) {
    return '';
  }

  if (parsedTexts.length === 1) {
    return parsedTexts[0];
  }

  // 여러 문서를 구분하여 합치기
  return parsedTexts
    .map((text, index) => {
      const fileName = fileNames ? fileNames[index] : `문서 ${index + 1}`;
      return `[${fileName}]\n${text}`;
    })
    .join('\n\n---\n\n');
}

/**
 * 텍스트 길이 제한 (프롬프트 토큰 제한 대응)
 * @param text - 원본 텍스트
 * @param maxChars - 최대 글자 수 (기본 5000자)
 * @returns 잘린 텍스트
 */
export function truncateText(text: string, maxChars: number = 5000): string {
  if (text.length <= maxChars) {
    return text;
  }

  console.log(`⚠️ 텍스트 길이 초과: ${text.length}자 → ${maxChars}자로 축약`);
  return text.substring(0, maxChars) + '\n\n[... 나머지 내용 생략 ...]';
}
