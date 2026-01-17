import type { ParseError, SupportedFileType, ValidationResult } from './types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MIN_PASTE_LENGTH = 1;
const MAX_PASTE_LENGTH = 10 * 1024 * 1024; // 10 MB

const EXTENSION_MAP: Record<string, SupportedFileType> = {
  '.txt': 'txt',
  '.text': 'txt',
  '.epub': 'epub',
  '.pdf': 'pdf',
};

const MIME_MAP: Record<string, SupportedFileType> = {
  'text/plain': 'txt',
  'application/epub+zip': 'epub',
  'application/pdf': 'pdf',
};

function getExtension(filename: string): string | null {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : null;
}

function detectFileType(file: File): SupportedFileType | null {
  const ext = getExtension(file.name);
  if (ext && EXTENSION_MAP[ext]) {
    return EXTENSION_MAP[ext];
  }

  if (file.type && MIME_MAP[file.type]) {
    return MIME_MAP[file.type];
  }

  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateFile(file: File): ValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: {
        type: 'file_too_large',
        message: 'File exceeds 50MB limit. Please choose a smaller file.',
        details: `File size: ${formatBytes(file.size)}`,
      },
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: {
        type: 'empty_file',
        message: 'This file is empty.',
      },
    };
  }

  const fileType = detectFileType(file);
  if (!fileType) {
    return {
      valid: false,
      error: {
        type: 'unsupported_format',
        message: 'Unsupported file format. Please use TXT, EPUB, or PDF files.',
        details: `File: ${file.name}, MIME: ${file.type}`,
      },
    };
  }

  return {
    valid: true,
    fileType,
    size: file.size,
  };
}

export function validatePaste(text: string): ValidationResult {
  const trimmed = text.trim();

  if (trimmed.length < MIN_PASTE_LENGTH) {
    return {
      valid: false,
      error: {
        type: 'empty_file',
        message: 'Please paste some text to read.',
      },
    };
  }

  if (trimmed.length > MAX_PASTE_LENGTH) {
    return {
      valid: false,
      error: {
        type: 'file_too_large',
        message: 'Pasted text is too large. Maximum is 10MB.',
      },
    };
  }

  return {
    valid: true,
    fileType: 'txt',
    size: new Blob([trimmed]).size,
  };
}
