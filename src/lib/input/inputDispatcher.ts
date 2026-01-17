import { createKeyboardHandler, type KeyboardHandler } from './keyboardHandler';
import { createTouchHandler, type TouchHandler } from './touchHandler';
import { createFileHandler, type FileHandler } from './fileHandler';
import { getFocusManager, type FocusManager } from './focusManager';
import { getPlatformInfo } from './platformDetector';
import type { InputAction, FileInputError } from './types';

export interface InputDispatcher {
  initialize(options: InitOptions): void;
  onAction(callback: (action: InputAction) => void): () => void;
  onError(callback: (error: FileInputError) => void): () => void;
  openFilePicker(): Promise<void>;
  announce(message: string, priority?: 'polite' | 'assertive'): void;
  destroy(): void;
}

export interface InitOptions {
  mainElement: HTMLElement;
  hasDocument: () => boolean;
  isPaused: () => boolean;
  isInSpeedView: () => boolean;
}

class InputDispatcherImpl implements InputDispatcher {
  private keyboard: KeyboardHandler | null = null;
  private touch: TouchHandler | null = null;
  private file: FileHandler | null = null;
  private focus: FocusManager | null = null;
  private actionCallbacks: Set<(action: InputAction) => void> = new Set();
  private errorCallbacks: Set<(error: FileInputError) => void> = new Set();

  initialize(options: InitOptions): void {
    const { mainElement, hasDocument, isPaused, isInSpeedView } = options;
    const platform = getPlatformInfo();

    this.focus = getFocusManager();
    this.focus.initialize();

    if (platform.hasKeyboard) {
      this.keyboard = createKeyboardHandler(hasDocument, isInSpeedView);
      this.keyboard.onAction(this.handleAction.bind(this));
      this.keyboard.enable();
    }

    if (platform.isTouchDevice) {
      this.touch = createTouchHandler(hasDocument, isPaused, isInSpeedView);
      this.touch.onAction(this.handleAction.bind(this));
      this.touch.enable(mainElement);
    }

    this.file = createFileHandler();
    this.file.onAction(this.handleAction.bind(this));
    this.file.onError(this.handleFileError.bind(this));
    this.file.enableDragDrop(mainElement);
    this.file.enablePaste();
  }

  onAction(callback: (action: InputAction) => void): () => void {
    this.actionCallbacks.add(callback);
    return () => this.actionCallbacks.delete(callback);
  }

  onError(callback: (error: FileInputError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  async openFilePicker(): Promise<void> {
    if (!this.file) {
      throw new Error('File handler not initialized');
    }
    return this.file.openFilePicker();
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.focus?.announce(message, priority);
  }

  destroy(): void {
    this.keyboard?.destroy();
    this.touch?.destroy();
    this.file?.destroy();
    this.focus?.destroy();

    this.keyboard = null;
    this.touch = null;
    this.file = null;
    this.focus = null;

    this.actionCallbacks.clear();
    this.errorCallbacks.clear();
  }

  private handleAction(action: InputAction): void {
    for (const callback of this.actionCallbacks) {
      callback(action);
    }
  }

  private handleFileError(error: FileInputError): void {
    this.focus?.announce(`Error: ${error.message}`, 'assertive');

    for (const callback of this.errorCallbacks) {
      callback(error);
    }
  }
}

export function createInputDispatcher(): InputDispatcher {
  return new InputDispatcherImpl();
}
