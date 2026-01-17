import { writable, derived, type Readable } from 'svelte/store';

export interface UIState {
  showProgress: boolean;
  showControls: boolean;
  dragOver: boolean;
  errorMessage: string | null;
  isLoading: boolean;
}

const DEFAULT_UI_STATE: UIState = {
  showProgress: false,
  showControls: false,
  dragOver: false,
  errorMessage: null,
  isLoading: false,
};

function createUIStore() {
  const { subscribe, set, update } = writable<UIState>(DEFAULT_UI_STATE);

  return {
    subscribe,

    setShowProgress(show: boolean): void {
      update(state => ({ ...state, showProgress: show }));
    },

    setShowControls(show: boolean): void {
      update(state => ({ ...state, showControls: show }));
    },

    setDragOver(over: boolean): void {
      update(state => ({ ...state, dragOver: over }));
    },

    setError(message: string | null): void {
      update(state => ({ ...state, errorMessage: message }));
    },

    setLoading(loading: boolean): void {
      update(state => ({ ...state, isLoading: loading }));
    },

    reset(): void {
      set(DEFAULT_UI_STATE);
    },
  };
}

export const uiStore = createUIStore();

export const showProgress: Readable<boolean> = derived(
  uiStore,
  $state => $state.showProgress
);

export const uiIsLoading: Readable<boolean> = derived(
  uiStore,
  $state => $state.isLoading
);

export const dragOver: Readable<boolean> = derived(
  uiStore,
  $state => $state.dragOver
);
