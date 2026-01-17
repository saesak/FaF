import { writable, derived } from 'svelte/store';
import type { ParseError } from '../parser/types';

// Forward declaration - actual types come from parser
export interface ParsedWord {
  text: string;
  orp: number;
  punctuation: string;
  originalIndex: number;
  documentPosition: DocumentPosition;
  delayMultiplier: 1 | 2 | 3;
}

export interface DocumentPosition {
  pageIndex?: number;
  paragraphIndex: number;
  wordIndexInParagraph: number;
}

export interface Paragraph {
  text: string;
  startWordIndex: number;
  endWordIndex: number;
}

export interface PositionMap {
  wordToParagraph: number[];
  paragraphToWords: Array<{ start: number; end: number }>;
}

export interface DocumentMetadata {
  title: string;
  author?: string;
  fileType: 'txt' | 'epub' | 'pdf' | 'paste';
  filePath?: string;
  fileSize: number;
  totalWords: number;
  totalParagraphs: number;
  estimatedReadingTime: number;
}

export type RawContent =
  | { type: 'txt'; plainText: string; paragraphs: Paragraph[] }
  | { type: 'epub'; chapters: Chapter[] }
  | { type: 'pdf'; pages: PdfPage[] };

export interface Chapter {
  title?: string;
  index: number;
  htmlContent: string;
  paragraphs: Paragraph[];
}

export interface PdfPage {
  pageNumber: number;
  textContent: string;
  paragraphs: Paragraph[];
  images?: EmbeddedImage[];
}

export interface EmbeddedImage {
  src: string;
  afterParagraphIndex: number;
  alt?: string;
}

export interface DocumentModel {
  words: ParsedWord[];
  metadata: DocumentMetadata;
  rawContent: RawContent;
  positionMap: PositionMap;
}

interface DocumentState {
  document: DocumentModel | null;
  loading: boolean;
  error: ParseError | null;
}

function createDocumentStore() {
  const { subscribe, set, update } = writable<DocumentState>({
    document: null,
    loading: false,
    error: null,
  });

  return {
    subscribe,

    setLoading() {
      update(s => ({ ...s, loading: true, error: null }));
    },

    setDocument(document: DocumentModel) {
      set({ document, loading: false, error: null });
    },

    setError(error: ParseError) {
      set({ document: null, loading: false, error });
    },

    clear() {
      set({ document: null, loading: false, error: null });
    },

    dismissError() {
      update(s => ({ ...s, error: null }));
    },
  };
}

export const documentStore = createDocumentStore();

export const currentDocument = derived(
  documentStore,
  $store => $store.document
);

export const isLoading = derived(
  documentStore,
  $store => $store.loading
);

export const parseError = derived(
  documentStore,
  $store => $store.error
);
