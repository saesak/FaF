import { writable, get } from 'svelte/store';
import { getStorageAdapter } from '../persistence/adapters';
import { STORAGE_KEYS, DEFAULT_SETTINGS, type SettingsData } from '../persistence/types';

function createSettingsStore() {
  const { subscribe, set, update } = writable<SettingsData>(DEFAULT_SETTINGS);
  let adapter: ReturnType<typeof getStorageAdapter> | null = null;
  let initialized = false;

  async function getAdapter() {
    if (!adapter) {
      adapter = getStorageAdapter();
    }
    return adapter;
  }

  async function persist() {
    const a = await getAdapter();
    const current = get({ subscribe });
    await a.set(STORAGE_KEYS.SETTINGS, current);
  }

  return {
    subscribe,

    async init() {
      if (initialized) return;
      const a = await getAdapter();
      const stored = await a.get<SettingsData>(STORAGE_KEYS.SETTINGS);
      if (stored) {
        set({ ...DEFAULT_SETTINGS, ...stored });
      }
      initialized = true;
    },

    setWpm(wpm: number) {
      const clamped = Math.max(300, Math.min(1200, wpm));
      update(s => ({ ...s, wpm: clamped }));
      persist();
    },

    adjustWpm(percent: number) {
      update(s => {
        const newWpm = Math.round(s.wpm * (1 + percent));
        return { ...s, wpm: Math.max(300, Math.min(1200, newWpm)) };
      });
      persist();
    },

    setColors(colors: Partial<SettingsData['colors']>) {
      update(s => ({ ...s, colors: { ...s.colors, ...colors } }));
      persist();
    },

    setFontSize(size: number) {
      const clamped = Math.max(12, Math.min(32, size));
      update(s => ({ ...s, fontSize: clamped }));
      persist();
    },

    reset() {
      set(DEFAULT_SETTINGS);
      persist();
    },
  };
}

export const settingsStore = createSettingsStore();
