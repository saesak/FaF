import { writable, get } from 'svelte/store';
import { STORAGE_KEYS, DEFAULT_WINDOW_STATE, type WindowState } from '../persistence/types';
import { getTauriStore, isTauriAvailable } from '../persistence/adapters/store-instance';

type TauriWindowModule = typeof import('@tauri-apps/api/window');
let tauriWindow: TauriWindowModule | null = null;

function createWindowStateStore() {
  const { subscribe, set } = writable<WindowState>(DEFAULT_WINDOW_STATE);
  let initialized = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let unlistenMove: (() => void) | null = null;
  let unlistenResize: (() => void) | null = null;

  async function loadTauriWindowModule(): Promise<boolean> {
    if (!isTauriAvailable()) return false;

    try {
      tauriWindow = await import('@tauri-apps/api/window');
      return true;
    } catch {
      return false;
    }
  }

  async function persist(state: WindowState) {
    if (!isTauriAvailable()) return;

    const store = await getTauriStore();
    await store.set(STORAGE_KEYS.WINDOW_STATE, state);
    await store.save();
  }

  return {
    subscribe,

    async init() {
      if (initialized || !isTauriAvailable()) return;

      const loaded = await loadTauriWindowModule();
      if (!loaded) return;

      const store = await getTauriStore();
      const saved = await store.get<WindowState>(STORAGE_KEYS.WINDOW_STATE);

      if (saved && tauriWindow) {
        set(saved);

        const win = tauriWindow.getCurrentWindow();
        await win.setPosition(new tauriWindow.LogicalPosition(saved.x, saved.y));
        await win.setSize(new tauriWindow.LogicalSize(saved.width, saved.height));
        if (saved.maximized) {
          await win.maximize();
        }
      }

      if (tauriWindow) {
        const win = tauriWindow.getCurrentWindow();

        unlistenMove = await win.onMoved(async ({ payload }) => {
          const current = get({ subscribe });
          const newState = { ...current, x: payload.x, y: payload.y };
          set(newState);

          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => persist(newState), 500);
        });

        unlistenResize = await win.onResized(async ({ payload }) => {
          const current = get({ subscribe });
          const newState = { ...current, width: payload.width, height: payload.height };
          set(newState);

          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => persist(newState), 500);
        });
      }

      initialized = true;
    },

    async saveState() {
      if (!isTauriAvailable() || !tauriWindow) return;

      const win = tauriWindow.getCurrentWindow();
      const position = await win.outerPosition();
      const size = await win.outerSize();
      const maximized = await win.isMaximized();

      const state: WindowState = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        maximized,
      };

      set(state);
      await persist(state);
    },

    cleanup() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (unlistenMove) {
        unlistenMove();
        unlistenMove = null;
      }
      if (unlistenResize) {
        unlistenResize();
        unlistenResize = null;
      }
    },
  };
}

export const windowStateStore = createWindowStateStore();
