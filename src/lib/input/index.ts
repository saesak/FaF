export {
  createInputDispatcher,
  type InputDispatcher,
  type InitOptions,
} from './inputDispatcher';

export {
  createKeyboardHandler,
  type KeyboardHandler,
} from './keyboardHandler';

export {
  createTouchHandler,
  type TouchHandler,
} from './touchHandler';

export {
  createFileHandler,
  type FileHandler,
} from './fileHandler';

export {
  getFocusManager,
  createFocusManager,
  type FocusManager,
} from './focusManager';

export {
  getPlatformInfo,
  isMobile,
  isDesktop,
  isTablet,
  isTouchDevice,
  resetPlatformInfo,
  type PlatformInfo,
} from './platformDetector';

export type {
  InputAction,
  InputConfig,
  FileInputError,
  Platform,
} from './types';

export { DEFAULT_INPUT_CONFIG } from './types';
