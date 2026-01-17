// Re-export document types for parser use
export type {
  ParsedWord,
  DocumentPosition,
  Paragraph,
  PositionMap,
  DocumentMetadata,
  RawContent,
  Chapter,
  PdfPage,
  EmbeddedImage,
  DocumentModel,
} from '../stores/document';

export type ParseErrorType =
  | 'file_too_large'
  | 'corrupted_file'
  | 'drm_protected'
  | 'unsupported_format'
  | 'encoding_error'
  | 'empty_file'
  | 'unknown';

export interface ParseError {
  type: ParseErrorType;
  message: string;
  details?: string;
}

export interface ParseSuccess {
  success: true;
  document: import('../stores/document').DocumentModel;
}

export interface ParseFailure {
  success: false;
  error: ParseError;
}

export type ParseResult = ParseSuccess | ParseFailure;

export type SupportedFileType = 'txt' | 'epub' | 'pdf';

export type ValidationResult =
  | { valid: true; fileType: SupportedFileType; size: number }
  | { valid: false; error: ParseError };
