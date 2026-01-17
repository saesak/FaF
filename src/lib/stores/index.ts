export { documentStore, currentDocument, isLoading, parseError } from './document';
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
} from './document';

export { settingsStore } from './settings';
export { positionStore, currentWord } from './position';
export { recentFilesStore } from './recentFiles';
export { windowStateStore } from './windowState';
export { viewStore, activeView, fontSize, highlightedWordIndex } from './viewStore';
export type { ViewState } from './viewStore';
export { uiStore, showProgress, uiIsLoading, dragOver } from './uiStore';
export type { UIState } from './uiStore';
