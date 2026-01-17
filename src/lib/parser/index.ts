import { validateFile, validatePaste } from './fileValidator';
import { parseTxt } from './txtParser';
import { parseEpub } from './epubParser';
import { parsePdf } from './pdfParser';
import type { ParseResult } from './types';

export async function parseInput(
  input: File | string,
  filePath?: string
): Promise<ParseResult> {
  if (typeof input === 'string') {
    const validation = validatePaste(input);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    return parseTxt(input, filePath);
  }

  const validation = validateFile(input);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  switch (validation.fileType) {
    case 'txt':
      return parseTxt(input, filePath);
    case 'epub':
      return parseEpub(input, filePath);
    case 'pdf':
      return parsePdf(input, filePath);
    default:
      return {
        success: false,
        error: {
          type: 'unsupported_format',
          message: 'Unsupported file format.',
        },
      };
  }
}

export * from './types';
export { calculateORP, calculateDelayMultiplier } from './wordTokenizer';
export { validateFile, validatePaste } from './fileValidator';
export {
  getParagraphForWord,
  getWordsForParagraph,
  getWordPosition,
  findWordAtPosition,
  findWordNearOffset,
} from './positionMapper';
