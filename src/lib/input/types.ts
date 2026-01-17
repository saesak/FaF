export type InputAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAYBACK' }
  | { type: 'SKIP_FORWARD' }
  | { type: 'SKIP_BACKWARD' }
  | { type: 'ADJUST_WPM'; direction: 'up' | 'down' }
  | { type: 'TOGGLE_VIEW' }
  | { type: 'LOAD_FILE'; file: File }
  | { type: 'LOAD_TEXT'; text: string }
  | { type: 'SHOW_SPEED_CONTROLS' }
  | { type: 'HIDE_SPEED_CONTROLS' };

export type Platform = 'desktop' | 'mobile' | 'tablet';

export interface InputConfig {
  keyboardEnabled: boolean;
  touchEnabled: boolean;
  swipeThreshold: number;
  swipeMaxTime: number;
  longPressDelay: number;
  tapMaxMovement: number;
  maxFileSize: number;
  allowedExtensions: string[];
}

export const DEFAULT_INPUT_CONFIG: InputConfig = {
  keyboardEnabled: true,
  touchEnabled: true,
  swipeThreshold: 50,
  swipeMaxTime: 300,
  longPressDelay: 500,
  tapMaxMovement: 10,
  maxFileSize: 52428800,
  allowedExtensions: ['.txt', '.epub', '.pdf'],
};

export interface FileInputError {
  type: 'SIZE_EXCEEDED' | 'UNSUPPORTED_FORMAT' | 'READ_ERROR';
  message: string;
  file?: File;
}
