import type { InputAction } from './types';

export interface KeyboardHandler {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  onAction(callback: (action: InputAction) => void): () => void;
  destroy(): void;
}

interface KeyBinding {
  key: string;
  action: InputAction;
  requiresDocument: boolean;
  preventDefault: boolean;
}

const KEY_BINDINGS: KeyBinding[] = [
  {
    key: ' ',
    action: { type: 'TOGGLE_PLAYBACK' },
    requiresDocument: true,
    preventDefault: true,
  },
  {
    key: 'ArrowRight',
    action: { type: 'SKIP_FORWARD' },
    requiresDocument: true,
    preventDefault: true,
  },
  {
    key: 'ArrowLeft',
    action: { type: 'SKIP_BACKWARD' },
    requiresDocument: true,
    preventDefault: true,
  },
  {
    key: ']',
    action: { type: 'ADJUST_WPM', direction: 'up' },
    requiresDocument: true,
    preventDefault: true,
  },
  {
    key: '[',
    action: { type: 'ADJUST_WPM', direction: 'down' },
    requiresDocument: true,
    preventDefault: true,
  },
];

class KeyboardHandlerImpl implements KeyboardHandler {
  private enabled: boolean = false;
  private actionCallbacks: Set<(action: InputAction) => void> = new Set();
  private hasDocument: () => boolean;
  private isInSpeedView: () => boolean;
  private boundHandler: (e: KeyboardEvent) => void;

  constructor(hasDocument: () => boolean, isInSpeedView: () => boolean) {
    this.hasDocument = hasDocument;
    this.isInSpeedView = isInSpeedView;
    this.boundHandler = this.handleKeyDown.bind(this);
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    // Use capture phase to catch Tab before it triggers focus navigation
    window.addEventListener('keydown', this.boundHandler, { capture: true });
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    window.removeEventListener('keydown', this.boundHandler, { capture: true });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  onAction(callback: (action: InputAction) => void): () => void {
    this.actionCallbacks.add(callback);
    return () => this.actionCallbacks.delete(callback);
  }

  destroy(): void {
    this.disable();
    this.actionCallbacks.clear();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isInputElement(event.target)) {
      return;
    }

    if (event.key === 'Tab') {
      if (this.hasDocument()) {
        event.preventDefault();
        this.dispatch({ type: 'TOGGLE_VIEW' });
        return;
      }
      return;
    }

    const binding = KEY_BINDINGS.find((b) => b.key === event.key);
    if (!binding) return;

    if (binding.requiresDocument && !this.hasDocument()) {
      return;
    }

    if (binding.preventDefault) {
      event.preventDefault();
    }

    this.dispatch(binding.action);
  }

  private isInputElement(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;

    const tagName = target.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target.isContentEditable
    );
  }

  private dispatch(action: InputAction): void {
    for (const callback of this.actionCallbacks) {
      callback(action);
    }
  }
}

export function createKeyboardHandler(
  hasDocument: () => boolean,
  isInSpeedView: () => boolean
): KeyboardHandler {
  return new KeyboardHandlerImpl(hasDocument, isInSpeedView);
}
