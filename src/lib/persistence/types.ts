// Storage key schema
export const STORAGE_KEYS = {
  SETTINGS: 'faf:settings',
  RECENT_FILES: 'faf:recent-files',
  POSITIONS: 'faf:positions',
  WINDOW_STATE: 'faf:window-state',
  VERSION: 'faf:version',
} as const;

export const CURRENT_VERSION = 1;

// Settings Store
export interface ColorSettings {
  background: string;
  word: string;
  focusLetter: string;
}

export interface SettingsData {
  wpm: number;
  colors: ColorSettings;
  fontSize: number;
}

export const DEFAULT_SETTINGS: SettingsData = {
  wpm: 350,
  colors: {
    background: '#38393d',
    word: '#FFFFFF',
    focusLetter: '#E53935',
  },
  fontSize: 18,
};

// Position Store
export interface PositionData {
  wordIndex: number;
  paragraphIndex: number;
  lastAccessed: number;
}

export type PositionsMap = Record<string, PositionData>;

// Recent Files Store
export interface RecentFile {
  id: string;
  name: string;
  path: string | null;
  type: 'txt' | 'epub' | 'pdf' | 'paste';
  size: number;
  addedAt: number;
  lastOpenedAt: number;
  position: PositionData;
  totalWords: number;
}

export const MAX_RECENT_FILES = 20;

// Window State Store (Tauri only)
export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
}

export const DEFAULT_WINDOW_STATE: WindowState = {
  x: 100,
  y: 100,
  width: 1200,
  height: 800,
  maximized: false,
};
