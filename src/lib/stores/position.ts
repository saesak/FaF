import { writable, derived, get } from 'svelte/store';
import { getStorageAdapter } from '../persistence/adapters';
import { STORAGE_KEYS, type PositionData, type PositionsMap } from '../persistence/types';
import { documentStore } from './document';

function createPositionStore() {
  const currentIndex = writable<number>(0);
  const paragraphIndex = writable<number>(0);
  const positions = writable<PositionsMap>({});

  let adapter: ReturnType<typeof getStorageAdapter> | null = null;
  let initialized = false;

  async function getAdapter() {
    if (!adapter) {
      adapter = getStorageAdapter();
    }
    return adapter;
  }

  async function persistAll() {
    const a = await getAdapter();
    await a.set(STORAGE_KEYS.POSITIONS, get(positions));
  }

  return {
    currentIndex: { subscribe: currentIndex.subscribe },
    paragraphIndex: { subscribe: paragraphIndex.subscribe },

    async init() {
      if (initialized) return;
      const a = await getAdapter();
      const stored = await a.get<PositionsMap>(STORAGE_KEYS.POSITIONS);
      if (stored) {
        positions.set(stored);
      }
      initialized = true;
    },

    loadPosition(fileId: string): PositionData | null {
      const all = get(positions);
      return all[fileId] ?? null;
    },

    setPosition(wordIdx: number, paraIdx: number) {
      currentIndex.set(wordIdx);
      paragraphIndex.set(paraIdx);
    },

    async savePosition(fileId: string, _totalWords: number) {
      const wordIdx = get(currentIndex);
      const paraIdx = get(paragraphIndex);

      positions.update(p => ({
        ...p,
        [fileId]: {
          wordIndex: wordIdx,
          paragraphIndex: paraIdx,
          lastAccessed: Date.now(),
        },
      }));

      await persistAll();
    },

    restorePosition(fileId: string) {
      const pos = get(positions)[fileId];
      if (pos) {
        currentIndex.set(pos.wordIndex);
        paragraphIndex.set(pos.paragraphIndex);
      } else {
        currentIndex.set(0);
        paragraphIndex.set(0);
      }
    },

    async clearPosition(fileId: string) {
      positions.update(p => {
        const { [fileId]: _, ...rest } = p;
        return rest;
      });
      await persistAll();
    },

    skip(delta: number, maxIndex: number) {
      currentIndex.update(i => Math.max(0, Math.min(maxIndex - 1, i + delta)));
    },

    jumpTo(wordIdx: number, paraIdx: number) {
      currentIndex.set(wordIdx);
      paragraphIndex.set(paraIdx);
    },

    advance(): boolean {
      const docState = get(documentStore);
      const doc = docState.document;
      if (!doc) return false;

      const current = get(currentIndex);
      if (current >= doc.words.length - 1) {
        return false;
      }

      currentIndex.update(i => i + 1);

      const newWord = doc.words[current + 1];
      if (newWord && newWord.documentPosition.paragraphIndex !== get(paragraphIndex)) {
        paragraphIndex.set(newWord.documentPosition.paragraphIndex);
      }

      return true;
    },

    reset() {
      currentIndex.set(0);
      paragraphIndex.set(0);
    },
  };
}

export const positionStore = createPositionStore();

export const currentWord = derived(
  [positionStore.currentIndex, documentStore],
  ([$idx, $docState]) => $docState.document?.words[$idx] ?? null
);
