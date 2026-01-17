import { writable, get } from 'svelte/store';
import { getStorageAdapter } from '../persistence/adapters';
import { STORAGE_KEYS, MAX_RECENT_FILES, type RecentFile } from '../persistence/types';

function createRecentFilesStore() {
  const { subscribe, set, update } = writable<RecentFile[]>([]);

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
    await a.set(STORAGE_KEYS.RECENT_FILES, get({ subscribe }));
  }

  return {
    subscribe,

    async init() {
      if (initialized) return;
      const a = await getAdapter();
      const stored = await a.get<RecentFile[]>(STORAGE_KEYS.RECENT_FILES);
      if (stored) {
        set(stored);
      }
      initialized = true;
    },

    async addFile(file: Omit<RecentFile, 'addedAt' | 'lastOpenedAt'> & { addedAt?: number }) {
      const now = Date.now();

      update(files => {
        const existingIndex = files.findIndex(f => f.id === file.id);

        if (existingIndex >= 0) {
          const updated = [...files];
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...file,
            lastOpenedAt: now,
          };
          const [item] = updated.splice(existingIndex, 1);
          updated.unshift(item);
          return updated;
        }

        const newFile: RecentFile = {
          ...file,
          addedAt: file.addedAt ?? now,
          lastOpenedAt: now,
        } as RecentFile;

        const updated = [newFile, ...files];

        if (updated.length > MAX_RECENT_FILES) {
          updated.splice(MAX_RECENT_FILES);
        }

        return updated;
      });

      await persist();
    },

    async updatePosition(fileId: string, position: RecentFile['position']) {
      update(files => {
        const idx = files.findIndex(f => f.id === fileId);
        if (idx >= 0) {
          const updated = [...files];
          updated[idx] = {
            ...updated[idx],
            position,
            lastOpenedAt: Date.now(),
          };
          return updated;
        }
        return files;
      });

      await persist();
    },

    async removeFile(fileId: string) {
      update(files => files.filter(f => f.id !== fileId));
      await persist();
    },

    async clear() {
      set([]);
      await persist();
    },

    getFile(fileId: string): RecentFile | undefined {
      return get({ subscribe }).find(f => f.id === fileId);
    },
  };
}

export const recentFilesStore = createRecentFilesStore();
