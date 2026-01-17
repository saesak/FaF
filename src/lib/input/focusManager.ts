export interface FocusManager {
  initialize(): void;
  setFocus(element: HTMLElement): void;
  getCurrentFocus(): HTMLElement | null;
  trapFocus(container: HTMLElement): void;
  releaseFocusTrap(): void;
  announce(message: string, priority?: 'polite' | 'assertive'): void;
  destroy(): void;
}

class FocusManagerImpl implements FocusManager {
  private trapContainer: HTMLElement | null = null;
  private previousFocus: HTMLElement | null = null;
  private announcer: HTMLElement | null = null;
  private boundTrapKeydown: (e: KeyboardEvent) => void;

  constructor() {
    this.boundTrapKeydown = this.handleTrapKeydown.bind(this);
  }

  initialize(): void {
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(this.announcer);
  }

  setFocus(element: HTMLElement): void {
    element.focus();
  }

  getCurrentFocus(): HTMLElement | null {
    const active = document.activeElement;
    return active instanceof HTMLElement ? active : null;
  }

  trapFocus(container: HTMLElement): void {
    this.previousFocus = this.getCurrentFocus();
    this.trapContainer = container;

    const firstFocusable = this.getFirstFocusable(container);
    if (firstFocusable) {
      firstFocusable.focus();
    }

    document.addEventListener('keydown', this.boundTrapKeydown);
  }

  releaseFocusTrap(): void {
    if (!this.trapContainer) return;

    document.removeEventListener('keydown', this.boundTrapKeydown);
    this.trapContainer = null;

    if (this.previousFocus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer) return;

    this.announcer.setAttribute('aria-live', priority);

    this.announcer.textContent = '';
    requestAnimationFrame(() => {
      if (this.announcer) {
        this.announcer.textContent = message;
      }
    });
  }

  destroy(): void {
    this.releaseFocusTrap();

    if (this.announcer) {
      this.announcer.remove();
      this.announcer = null;
    }
  }

  private handleTrapKeydown(event: KeyboardEvent): void {
    if (!this.trapContainer || event.key !== 'Tab') return;

    const focusables = this.getFocusableElements(this.trapContainer);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;

    if (event.shiftKey) {
      if (current === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (current === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll<HTMLElement>(selector));
  }

  private getFirstFocusable(container: HTMLElement): HTMLElement | null {
    const focusables = this.getFocusableElements(container);
    return focusables[0] || null;
  }
}

let focusManager: FocusManager | null = null;

export function getFocusManager(): FocusManager {
  if (!focusManager) {
    focusManager = new FocusManagerImpl();
  }
  return focusManager;
}

export function createFocusManager(): FocusManager {
  return new FocusManagerImpl();
}
