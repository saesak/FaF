export interface WordTicker {
  start(onTick: () => void): void;
  stop(): void;
  scheduleNext(delayMs: number, onTick: () => void): void;
  isRunning(): boolean;
  getTimeUntilNextTick(): number | null;
}

class WordTickerImpl implements WordTicker {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private scheduledTime: number | null = null;
  private running: boolean = false;

  start(onTick: () => void): void {
    this.running = true;
    onTick();
  }

  stop(): void {
    this.running = false;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.scheduledTime = null;
  }

  scheduleNext(delayMs: number, onTick: () => void): void {
    if (!this.running) {
      return;
    }

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    this.scheduledTime = Date.now() + delayMs;

    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.scheduledTime = null;
      if (this.running) {
        onTick();
      }
    }, delayMs);
  }

  isRunning(): boolean {
    return this.running;
  }

  getTimeUntilNextTick(): number | null {
    if (this.scheduledTime === null) {
      return null;
    }
    return Math.max(0, this.scheduledTime - Date.now());
  }
}

export const wordTicker: WordTicker = new WordTickerImpl();

export function createWordTicker(): WordTicker {
  return new WordTickerImpl();
}
