import { writable, derived, get, type Readable } from 'svelte/store';
import { documentStore, type ParsedWord, type DocumentModel } from '../stores/document';
import { positionStore } from '../stores/position';
import { settingsStore } from '../stores/settings';
import { wordTicker } from './ticker';
import { timingCalculator, type WordTiming } from './timing';

export type PlaybackStatus = 'idle' | 'playing' | 'paused';

export interface PlaybackState {
  status: PlaybackStatus;
  wpm: number;
  documentId: string | null;
  totalWords: number;
}

export type PlaybackEvent =
  | { type: 'word_changed'; word: ParsedWord; index: number; timing: WordTiming }
  | { type: 'state_changed'; state: PlaybackState }
  | { type: 'end_of_document' }
  | { type: 'wpm_changed'; wpm: number }
  | { type: 'position_changed'; index: number; total: number };

type PlaybackEventHandler = (event: PlaybackEvent) => void;

function createPlaybackEngine() {
  const state = writable<PlaybackState>({
    status: 'idle',
    wpm: 350,
    documentId: null,
    totalWords: 0,
  });

  const eventHandlers = new Set<PlaybackEventHandler>();
  let currentDocument: DocumentModel | null = null;
  let unsubscribeDocument: (() => void) | null = null;
  let unsubscribeSettings: (() => void) | null = null;

  function emit(event: PlaybackEvent): void {
    for (const handler of eventHandlers) {
      handler(event);
    }
  }

  function emitStateChange(): void {
    emit({ type: 'state_changed', state: get(state) });
  }

  function emitWordChange(word: ParsedWord, index: number): void {
    const timing = timingCalculator.calculate(word, get(state).wpm);
    emit({ type: 'word_changed', word, index, timing });
  }

  function emitPositionChange(): void {
    const s = get(state);
    const idx = get(positionStore.currentIndex);
    emit({ type: 'position_changed', index: idx, total: s.totalWords });
  }

  function emitEndOfDocument(): void {
    emit({ type: 'end_of_document' });
  }

  function emitWpmChange(): void {
    emit({ type: 'wpm_changed', wpm: get(state).wpm });
  }

  function getCurrentWord(): ParsedWord | null {
    if (!currentDocument) return null;
    const idx = get(positionStore.currentIndex);
    return currentDocument.words[idx] ?? null;
  }

  function handleTick(): void {
    const word = getCurrentWord();
    if (!word) {
      handleEndOfDocument();
      return;
    }

    emitWordChange(word, get(positionStore.currentIndex));

    const timing = timingCalculator.calculate(word, get(state).wpm);
    wordTicker.scheduleNext(timing.finalDelay, () => {
      const advanced = positionStore.advance();
      if (!advanced) {
        handleEndOfDocument();
      } else {
        handleTick();
      }
    });
  }

  function handleEndOfDocument(): void {
    wordTicker.stop();
    state.update(s => ({ ...s, status: 'paused' }));
    emitEndOfDocument();
    emitStateChange();
  }

  function handleDocumentLoad(doc: DocumentModel): void {
    currentDocument = doc;
    const fileId = doc.metadata.filePath ?? doc.metadata.title;

    positionStore.restorePosition(fileId);

    state.update(s => ({
      ...s,
      status: 'paused',
      documentId: fileId,
      totalWords: doc.words.length,
    }));

    emitStateChange();
    emitPositionChange();
  }

  function handleDocumentUnload(): void {
    const s = get(state);
    if (s.status === 'playing') {
      wordTicker.stop();
    }

    if (s.documentId) {
      positionStore.savePosition(s.documentId, s.totalWords);
    }

    currentDocument = null;
    state.update(s => ({
      ...s,
      status: 'idle',
      documentId: null,
      totalWords: 0,
    }));

    positionStore.reset();
    emitStateChange();
  }

  return {
    subscribe: state.subscribe,

    init() {
      unsubscribeDocument = documentStore.subscribe(docState => {
        if (docState.document) {
          handleDocumentLoad(docState.document);
        } else if (get(state).documentId !== null) {
          handleDocumentUnload();
        }
      });

      unsubscribeSettings = settingsStore.subscribe(settings => {
        state.update(s => ({ ...s, wpm: settings.wpm }));
      });
    },

    destroy() {
      wordTicker.stop();
      unsubscribeDocument?.();
      unsubscribeSettings?.();
    },

    play(): void {
      const s = get(state);
      if (s.status === 'playing') return;
      if (!currentDocument || s.totalWords === 0) return;

      const idx = get(positionStore.currentIndex);
      if (idx >= s.totalWords) return;

      state.update(s => ({ ...s, status: 'playing' }));
      emitStateChange();

      wordTicker.start(() => handleTick());
    },

    pause(): void {
      const s = get(state);
      if (s.status !== 'playing') return;

      wordTicker.stop();
      state.update(s => ({ ...s, status: 'paused' }));

      if (s.documentId) {
        positionStore.savePosition(s.documentId, s.totalWords);
      }

      emitStateChange();
    },

    toggle(): void {
      const s = get(state);
      if (s.status === 'playing') {
        this.pause();
      } else if (s.status === 'paused') {
        this.play();
      }
    },

    handleViewToggle(): void {
      const s = get(state);
      if (s.status === 'playing') {
        this.pause();
      }
    },

    skipForward(): void {
      const s = get(state);
      if (!currentDocument || s.totalWords === 0) return;

      const wasPlaying = s.status === 'playing';
      if (wasPlaying) {
        wordTicker.stop();
      }

      positionStore.skip(1, s.totalWords);
      emitPositionChange();

      const word = getCurrentWord();
      if (word) {
        emitWordChange(word, get(positionStore.currentIndex));
      }

      if (wasPlaying && get(positionStore.currentIndex) < s.totalWords - 1) {
        const timing = timingCalculator.calculate(word!, get(state).wpm);
        wordTicker.scheduleNext(timing.finalDelay, () => {
          const advanced = positionStore.advance();
          if (!advanced) {
            handleEndOfDocument();
          } else {
            handleTick();
          }
        });
      }
    },

    skipBackward(): void {
      const s = get(state);
      if (!currentDocument || s.totalWords === 0) return;

      const wasPlaying = s.status === 'playing';
      if (wasPlaying) {
        wordTicker.stop();
      }

      positionStore.skip(-1, s.totalWords);
      emitPositionChange();

      const word = getCurrentWord();
      if (word) {
        emitWordChange(word, get(positionStore.currentIndex));
      }

      if (wasPlaying) {
        const timing = timingCalculator.calculate(word!, get(state).wpm);
        wordTicker.scheduleNext(timing.finalDelay, () => {
          const advanced = positionStore.advance();
          if (!advanced) {
            handleEndOfDocument();
          } else {
            handleTick();
          }
        });
      }
    },

    jumpTo(index: number): void {
      const s = get(state);
      if (!currentDocument || s.totalWords === 0) return;

      const boundedIndex = Math.max(0, Math.min(index, s.totalWords - 1));
      const word = currentDocument.words[boundedIndex];

      positionStore.jumpTo(boundedIndex, word?.documentPosition.paragraphIndex ?? 0);
      emitPositionChange();

      if (word) {
        emitWordChange(word, boundedIndex);
      }
    },

    setWpm(wpm: number): void {
      const clamped = Math.max(300, wpm);
      settingsStore.setWpm(clamped);
      state.update(s => ({ ...s, wpm: clamped }));
      emitWpmChange();
    },

    adjustWpm(direction: 'up' | 'down'): void {
      const factor = direction === 'up' ? 1.1 : 0.9;
      const newWpm = Math.round(get(state).wpm * factor);
      this.setWpm(newWpm);
    },

    on(handler: PlaybackEventHandler): () => void {
      eventHandlers.add(handler);
      return () => eventHandlers.delete(handler);
    },

    hasDocument(): boolean {
      return currentDocument !== null && get(state).totalWords > 0;
    },

    isPlaying(): boolean {
      return get(state).status === 'playing';
    },

    isPaused(): boolean {
      return get(state).status === 'paused';
    },

    getCurrentWord(): ParsedWord | null {
      return getCurrentWord();
    },

    getProgress(): number {
      const s = get(state);
      if (s.totalWords === 0) return 0;
      return Math.round((get(positionStore.currentIndex) / s.totalWords) * 100);
    },

    getTimeRemaining(): number {
      const s = get(state);
      const remaining = s.totalWords - get(positionStore.currentIndex);
      if (remaining <= 0 || s.wpm <= 0) return 0;
      return Math.ceil((remaining / s.wpm) * 60);
    },

    getTimeRemainingFormatted(): string {
      const seconds = this.getTimeRemaining();
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
  };
}

export const playbackEngine = createPlaybackEngine();

export const playbackState: Readable<PlaybackState> = {
  subscribe: playbackEngine.subscribe,
};

export const isPlaying = derived(playbackState, $state => $state.status === 'playing');

export const isPaused = derived(playbackState, $state => $state.status === 'paused');

export const hasDocument = derived(
  playbackState,
  $state => $state.documentId !== null && $state.totalWords > 0
);

export const progress = derived(
  [playbackState, positionStore.currentIndex],
  ([$state, $index]) => {
    if ($state.totalWords === 0) return 0;
    return Math.round(($index / $state.totalWords) * 100);
  }
);

export const timeRemaining = derived(
  [playbackState, positionStore.currentIndex],
  ([$state, $index]) => {
    const remaining = $state.totalWords - $index;
    if (remaining <= 0 || $state.wpm <= 0) return 0;
    return Math.ceil((remaining / $state.wpm) * 60);
  }
);

export const timeRemainingFormatted = derived(timeRemaining, $seconds => {
  const mins = Math.floor($seconds / 60);
  const secs = $seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
});
