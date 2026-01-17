import type { InputAction } from './types';

export interface TouchHandler {
  enable(element: HTMLElement): void;
  disable(): void;
  isEnabled(): boolean;
  onAction(callback: (action: InputAction) => void): () => void;
  destroy(): void;
}

interface TouchConfig {
  tap: {
    maxDuration: number;
    maxMovement: number;
  };
  swipe: {
    minDistance: number;
    maxDuration: number;
    maxPerpendicular: number;
  };
  longPress: {
    minDuration: number;
    maxMovement: number;
  };
}

const DEFAULT_CONFIG: TouchConfig = {
  tap: {
    maxDuration: 300,
    maxMovement: 10,
  },
  swipe: {
    minDistance: 50,
    maxDuration: 300,
    maxPerpendicular: 50,
  },
  longPress: {
    minDuration: 500,
    maxMovement: 10,
  },
};

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  moved: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  longPressFired: boolean;
}

class TouchHandlerImpl implements TouchHandler {
  private enabled: boolean = false;
  private element: HTMLElement | null = null;
  private config: TouchConfig;
  private actionCallbacks: Set<(action: InputAction) => void> = new Set();
  private hasDocument: () => boolean;
  private isPaused: () => boolean;
  private isInSpeedView: () => boolean;
  private touchState: TouchState | null = null;

  private boundStart: (e: TouchEvent) => void;
  private boundMove: (e: TouchEvent) => void;
  private boundEnd: (e: TouchEvent) => void;
  private boundCancel: (e: TouchEvent) => void;

  constructor(
    hasDocument: () => boolean,
    isPaused: () => boolean,
    isInSpeedView: () => boolean,
    config: Partial<TouchConfig> = {}
  ) {
    this.hasDocument = hasDocument;
    this.isPaused = isPaused;
    this.isInSpeedView = isInSpeedView;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.boundStart = this.handleTouchStart.bind(this);
    this.boundMove = this.handleTouchMove.bind(this);
    this.boundEnd = this.handleTouchEnd.bind(this);
    this.boundCancel = this.handleTouchCancel.bind(this);
  }

  enable(element: HTMLElement): void {
    if (this.enabled) {
      this.disable();
    }

    this.element = element;
    this.enabled = true;

    element.addEventListener('touchstart', this.boundStart, { passive: false });
    element.addEventListener('touchmove', this.boundMove, { passive: true });
    element.addEventListener('touchend', this.boundEnd, { passive: true });
    element.addEventListener('touchcancel', this.boundCancel, { passive: true });
  }

  disable(): void {
    if (!this.enabled || !this.element) return;

    this.element.removeEventListener('touchstart', this.boundStart);
    this.element.removeEventListener('touchmove', this.boundMove);
    this.element.removeEventListener('touchend', this.boundEnd);
    this.element.removeEventListener('touchcancel', this.boundCancel);

    this.clearLongPressTimer();
    this.element = null;
    this.enabled = false;
    this.touchState = null;
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

  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) {
      this.clearLongPressTimer();
      return;
    }

    const touch = event.touches[0];

    this.touchState = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      moved: false,
      longPressTimer: null,
      longPressFired: false,
    };

    if (this.isInSpeedView() && this.isPaused() && this.hasDocument()) {
      this.touchState.longPressTimer = setTimeout(() => {
        if (this.touchState && !this.touchState.moved) {
          this.touchState.longPressFired = true;
          this.dispatch({ type: 'SHOW_SPEED_CONTROLS' });
        }
      }, this.config.longPress.minDuration);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.touchState) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchState.startX;
    const deltaY = touch.clientY - this.touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > this.config.longPress.maxMovement) {
      this.touchState.moved = true;
      this.clearLongPressTimer();
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.touchState) return;

    this.clearLongPressTimer();

    if (this.touchState.longPressFired) {
      this.touchState = null;
      return;
    }

    const touch = event.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const duration = Date.now() - this.touchState.startTime;
    const deltaX = endX - this.touchState.startX;
    const deltaY = endY - this.touchState.startY;

    const swipeDir = this.detectSwipe(
      this.touchState.startX,
      this.touchState.startY,
      endX,
      endY,
      duration
    );

    if (swipeDir) {
      this.handleSwipe(swipeDir);
    } else if (this.isTap(deltaX, deltaY, duration)) {
      this.handleTap();
    }

    this.touchState = null;
  }

  private handleTouchCancel(_event: TouchEvent): void {
    this.clearLongPressTimer();
    this.touchState = null;
  }

  private clearLongPressTimer(): void {
    if (this.touchState?.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
      this.touchState.longPressTimer = null;
    }
  }

  private isTap(deltaX: number, deltaY: number, duration: number): boolean {
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    return duration < this.config.tap.maxDuration && distance < this.config.tap.maxMovement;
  }

  private detectSwipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number
  ): 'left' | 'right' | null {
    if (duration > this.config.swipe.maxDuration) {
      return null;
    }

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (
      absX > absY &&
      absX >= this.config.swipe.minDistance &&
      absY < this.config.swipe.maxPerpendicular
    ) {
      return deltaX > 0 ? 'right' : 'left';
    }

    return null;
  }

  private handleTap(): void {
    if (!this.hasDocument()) return;

    if (this.isInSpeedView()) {
      this.dispatch({ type: 'TOGGLE_PLAYBACK' });
    }
  }

  private handleSwipe(_direction: 'left' | 'right'): void {
    if (!this.hasDocument()) return;
    this.dispatch({ type: 'TOGGLE_VIEW' });
  }

  private dispatch(action: InputAction): void {
    for (const callback of this.actionCallbacks) {
      callback(action);
    }
  }
}

export function createTouchHandler(
  hasDocument: () => boolean,
  isPaused: () => boolean,
  isInSpeedView: () => boolean,
  config?: Partial<TouchConfig>
): TouchHandler {
  return new TouchHandlerImpl(hasDocument, isPaused, isInSpeedView, config);
}
