import { get } from 'svelte/store';
import { viewStore } from '../stores/viewStore';
import { playbackEngine, playbackState } from '../playback/engine';
import { positionStore } from '../stores/position';

let lastToggleTime = 0;
const TOGGLE_DEBOUNCE_MS = 100;

class ViewSyncManager {
  private unsubscribePlayback: (() => void) | null = null;

  initialize(): void {
    this.unsubscribePlayback = playbackState.subscribe(state => {
      this.handlePlaybackStateChange(state);
    });
  }

  private handlePlaybackStateChange(state: { status: string }): void {
    const view = get(viewStore);

    if (view.activeView === 'reader' && state.status === 'paused') {
      const idx = get(positionStore.currentIndex);
      viewStore.highlightWord(idx);
    }
  }

  handleSpeedToReader(): void {
    const idx = get(positionStore.currentIndex);

    viewStore.saveSpeedPosition(idx);
    viewStore.setActiveView('reader');
    // Set scroll position AFTER setActiveView (which clears scrollToIndex)
    viewStore.scrollToWord(idx);

    playbackEngine.handleViewToggle();
  }

  handleReaderToSpeed(): void {
    viewStore.highlightWord(null);
    viewStore.setActiveView('speed');

    playbackEngine.handleViewToggle();
  }

  handleWordClick(wordIndex: number): void {
    playbackEngine.jumpTo(wordIndex);
    viewStore.highlightWord(wordIndex);
    viewStore.saveSpeedPosition(wordIndex);
  }

  toggleView(): void {
    const now = Date.now();
    if (now - lastToggleTime < TOGGLE_DEBOUNCE_MS) {
      return;
    }
    lastToggleTime = now;

    const view = get(viewStore);

    if (view.activeView === 'speed') {
      this.handleSpeedToReader();
    } else {
      this.handleReaderToSpeed();
    }
  }

  destroy(): void {
    if (this.unsubscribePlayback) {
      this.unsubscribePlayback();
    }
  }
}

export const viewSync = new ViewSyncManager();
