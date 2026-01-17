import type { ParseResult, DocumentModel, DocumentMetadata } from './types';
import { tokenizeDocument } from './wordTokenizer';

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

function getFilenameWithoutExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function decodeWithFallback(buffer: ArrayBuffer): string {
  const encodings = ['utf-8', 'windows-1252', 'iso-8859-1'];

  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: true });
      return decoder.decode(buffer);
    } catch {
      continue;
    }
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
}

async function readContent(input: File | string): Promise<string> {
  if (typeof input === 'string') {
    return input;
  }

  try {
    return await input.text();
  } catch {
    const buffer = await input.arrayBuffer();
    return decodeWithFallback(buffer);
  }
}

export async function parseTxt(
  input: File | string,
  filePath?: string
): Promise<ParseResult> {
  try {
    const rawText = await readContent(input);
    const normalizedText = normalizeLineEndings(rawText);

    if (normalizedText.trim().length === 0) {
      return {
        success: false,
        error: {
          type: 'empty_file',
          message: 'This file contains no readable text.',
        },
      };
    }

    const paragraphTexts = splitParagraphs(normalizedText);
    const { words, paragraphs, positionMap } = tokenizeDocument(paragraphTexts);

    if (words.length === 0) {
      return {
        success: false,
        error: {
          type: 'empty_file',
          message: 'This file contains no readable text.',
        },
      };
    }

    const isPaste = typeof input === 'string';
    const metadata: DocumentMetadata = {
      title: isPaste ? 'Pasted Text' : getFilenameWithoutExtension((input as File).name),
      fileType: isPaste ? 'paste' : 'txt',
      filePath,
      fileSize: isPaste ? new Blob([input]).size : (input as File).size,
      totalWords: words.length,
      totalParagraphs: paragraphs.length,
      estimatedReadingTime: Math.ceil(words.length / 300),
    };

    const document: DocumentModel = {
      words,
      metadata,
      rawContent: {
        type: 'txt',
        plainText: normalizedText,
        paragraphs,
      },
      positionMap,
    };

    return { success: true, document };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'corrupted_file',
        message: 'Unable to read this text file.',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
