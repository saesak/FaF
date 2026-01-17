import { writable, derived, type Readable } from 'svelte/store';
import { settingsStore } from './settings';

export interface ViewState {
  activeView: 'speed' | 'reader';
  fontSize: number;
  highlightedWordIndex: number | null;
  scrollToIndex: number | null;
  lastSpeedPosition: number;
}

const DEFAULT_VIEW_STATE: ViewState = {
  activeView: 'speed',
  fontSize: 1.0,
  highlightedWordIndex: null,
  scrollToIndex: null,
  lastSpeedPosition: 0,
};

function createViewStore() {
  const { subscribe, set, update } = writable<ViewState>(DEFAULT_VIEW_STATE);

  return {
    subscribe,

    toggleView(): void {
      update(state => ({
        ...state,
        activeView: state.activeView === 'speed' ? 'reader' : 'speed',
        scrollToIndex: null,
      }));
    },

    setActiveView(view: 'speed' | 'reader'): void {
      update(state => ({
        ...state,
        activeView: view,
        scrollToIndex: null,
      }));
    },

    setFontSize(size: number): void {
      const clamped = Math.max(0.8, Math.min(2.0, size));
      update(state => ({ ...state, fontSize: clamped }));
      settingsStore.setFontSize(Math.round(clamped * 18));
    },

    increaseFontSize(): void {
      update(state => {
        const newSize = Math.min(2.0, Math.round((state.fontSize + 0.1) * 10) / 10);
        return { ...state, fontSize: newSize };
      });
    },

    decreaseFontSize(): void {
      update(state => {
        const newSize = Math.max(0.8, Math.round((state.fontSize - 0.1) * 10) / 10);
        return { ...state, fontSize: newSize };
      });
    },

    highlightWord(index: number | null): void {
      update(state => ({
        ...state,
        highlightedWordIndex: index,
      }));
    },

    scrollToWord(index: number): void {
      update(state => ({
        ...state,
        scrollToIndex: index,
        highlightedWordIndex: index,
      }));
    },

    clearScrollTrigger(): void {
      update(state => ({
        ...state,
        scrollToIndex: null,
      }));
    },

    saveSpeedPosition(index: number): void {
      update(state => ({
        ...state,
        lastSpeedPosition: index,
      }));
    },

    reset(): void {
      set(DEFAULT_VIEW_STATE);
    },
  };
}

export const viewStore = createViewStore();

export const activeView: Readable<'speed' | 'reader'> = derived(
  viewStore,
  $state => $state.activeView
);

export const fontSize: Readable<number> = derived(
  viewStore,
  $state => $state.fontSize
);

export const highlightedWordIndex: Readable<number | null> = derived(
  viewStore,
  $state => $state.highlightedWordIndex
);
