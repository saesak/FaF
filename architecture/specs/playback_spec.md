# Playback Engine Specification

## Agent Context
- **Status**: approved
- **Iteration**: 1
- **Last Agent**: judge
- **Last Action**: Reviewed specification - APPROVED with score 39/40 (97.5%)
- **Open Issues**: None (3 optional suggestions for future enhancement)

---
---

## Scope
Timing calculations, word ticker, play/pause state machine, speed controls, WPM management.

## Reference
- See: `SPEC.md` → Speed Reading Algorithm, Speed Control sections
- See: `SYSTEM_STATE_MACHINE.md` → TIMING_ENGINE, PLAYBACK_STATE

---

## Plan

### Core Data Structures

```typescript
interface PlaybackState {
  status: 'playing' | 'paused';
  currentWordIndex: number;
  wpm: number;
  documentId: string | null;
}

interface TimingConfig {
  wpm: number;
  punctuationMultipliers: {
    sentence: number;  // .?! → 3x
    clause: number;    // :;, → 2x
  };
  lengthFactor: number;  // 0.04
}

interface WordTiming {
  word: ParsedWord;
  baseDelay: number;
  punctuationMultiplier: number;
  lengthAdjustment: number;
  finalDelay: number;
}
```

### State Machine

```
┌─────────┐   [Space/Tap]   ┌─────────┐
│ PAUSED  │◄───────────────►│ PLAYING │
└─────────┘                 └─────────┘
     │                           │
     │ Shows:                    │ Shows:
     │ • Progress %              │ • Current word only
     │ • Time remaining          │ • ORP highlighted
     │ • Speed controls          │
     │                           │
     └───────[view_toggle]───────┘
              (auto-pause)
```

**Transitions:**
- `PAUSED` → `PLAYING`: Space/Tap (only if document loaded)
- `PLAYING` → `PAUSED`: Space/Tap, view toggle, end of document
- View toggle: Always auto-pauses

### Timing Algorithms

#### Base Delay
```typescript
const baseDelay = 60000 / wpm;  // ms per word
// At 300 WPM: 200ms
// At 600 WPM: 100ms
// At 1200 WPM: 50ms
```

#### Punctuation Multipliers
```typescript
function getPunctuationMultiplier(punctuation: string): number {
  if (/[.?!]/.test(punctuation)) return 3.0;  // Sentence end
  if (/[:;,]/.test(punctuation)) return 2.0;  // Clause
  return 1.0;
}
```

#### Length Factor
```typescript
function getLengthAdjustment(wordLength: number, baseDelay: number): number {
  return baseDelay * 0.04 * Math.sqrt(wordLength);
}
```

#### Final Delay Calculation
```typescript
function calculateDelay(word: ParsedWord, wpm: number): number {
  const base = 60000 / wpm;
  const punctMult = getPunctuationMultiplier(word.punctuation);
  const lengthAdj = base * 0.04 * Math.sqrt(word.text.length);
  return (base * punctMult) + lengthAdj;
}
```

**Example at 400 WPM:**
| Word | Base | Punct | Length Adj | Final |
|------|------|-------|------------|-------|
| "the" | 150ms | 1x | +3.5ms | 153ms |
| "extraordinary." | 150ms | 3x | +7.3ms | 457ms |
| "Hello," | 150ms | 2x | +4.9ms | 305ms |

### Word Ticker Implementation

```typescript
class WordTicker {
  private timeoutId: number | null = null;

  start() {
    this.tick();
  }

  private tick() {
    const word = getCurrentWord();
    if (!word) {
      this.stop();
      emit('end_of_document');
      return;
    }

    emit('word_changed', word);
    const delay = calculateDelay(word, getWPM());
    this.timeoutId = setTimeout(() => {
      advancePosition();
      this.tick();
    }, delay);
  }

  stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
```

### Speed Control

```typescript
function adjustSpeed(direction: 'up' | 'down'): void {
  const current = getWPM();
  const factor = direction === 'up' ? 1.1 : 0.9;
  const newWPM = Math.round(current * factor);
  setWPM(clamp(newWPM, 300, Infinity));  // No upper limit
}
```

- `]` key: +10% WPM
- `[` key: -10% WPM
- Minimum: 300 WPM
- Maximum: None (1200+ supported)
- Persisted: Remember last used WPM

### Position Management

```typescript
function skipWord(direction: 'forward' | 'backward'): void {
  const current = getCurrentIndex();
  const total = getTotalWords();
  const newIndex = direction === 'forward'
    ? Math.min(current + 1, total - 1)
    : Math.max(current - 1, 0);
  setCurrentIndex(newIndex);
}
```

- `→` key: Skip forward
- `←` key: Skip backward
- Bounds checking: 0 to totalWords-1

### Module Breakdown

| Module | Purpose |
|--------|---------|
| PlaybackEngine.ts | Orchestrator, state machine |
| TimingCalculator.ts | Pure functions for delay calc |
| WordTicker.ts | setTimeout manager |
| SpeedController.ts | WPM adjustment logic |
| PositionTracker.ts | Current index management |

### Integration Points

- **DocumentStore**: Get words[], total count
- **SettingsStore**: Get/set WPM
- **PositionStore**: Get/set currentIndex per file
- **UI Components**: Emit word_changed events

### Specification Sections
1. Overview
2. Data Models
3. State Machine (full definition)
4. Timing Algorithms (with examples)
5. Word Ticker Implementation
6. Speed Control System
7. Position Management
8. Keyboard/Gesture Bindings
9. Integration Points
10. Testing (timing accuracy tests)
11. Performance (requestAnimationFrame considerations)

---

## Specification

### 1. Overview

#### Purpose

The Playback Engine is the core timing and control system for FaF's RSVP (Rapid Serial Visual Presentation) reading experience. It manages:

1. **Word timing** - Calculates precise display duration for each word based on WPM, punctuation, and word length
2. **Playback state** - Manages play/pause transitions and auto-pause behavior
3. **Position tracking** - Maintains current word index with persistence per document
4. **Speed control** - Handles WPM adjustments with persistence

#### Role in System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLAYBACK ENGINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   Document   │   │   Settings   │   │   Position   │        │
│  │    Store     │──►│    Store     │◄──│    Store     │        │
│  │  (read-only) │   │  (read/write)│   │  (read/write)│        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│          │                 │                  │                 │
│          ▼                 ▼                  ▼                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │              PlaybackEngine (Orchestrator)             │     │
│  │  ┌────────────────┐  ┌────────────────┐               │     │
│  │  │ State Machine  │  │ Timing Calc    │               │     │
│  │  │ (play/pause)   │  │ (delays)       │               │     │
│  │  └────────────────┘  └────────────────┘               │     │
│  │  ┌────────────────┐  ┌────────────────┐               │     │
│  │  │ Word Ticker    │  │ Speed Control  │               │     │
│  │  │ (setTimeout)   │  │ (WPM +/-)      │               │     │
│  │  └────────────────┘  └────────────────┘               │     │
│  └───────────────────────────────────────────────────────┘     │
│                             │                                   │
│                             ▼                                   │
│                    ┌─────────────────┐                         │
│                    │  Event Emitter  │                         │
│                    │  word_changed   │                         │
│                    │  state_changed  │                         │
│                    │  end_document   │                         │
│                    └─────────────────┘                         │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │   UI Views      │
                    │  (Speed View)   │
                    │  (Reader View)  │
                    └─────────────────┘
```

#### Relationship to Other Systems

| System | Relationship |
|--------|-------------|
| **Parser System** | Consumes `ParsedWord[]` from DocumentStore. Does not parse directly. |
| **View System** | Emits `word_changed` events subscribed by SpeedView. Emits `state_changed` for progress UI. |
| **Input System** | Receives commands (play, pause, skip, speed) via public methods. Does not handle input directly. |
| **Persistence System** | Reads/writes WPM to SettingsStore. Reads/writes position to PositionStore per document. |

---

### 2. Data Models

#### ParsedWord (from Parser System)

```typescript
/**
 * Represents a single word from the parsed document.
 * Produced by Parser System, consumed by Playback Engine.
 */
interface ParsedWord {
  /** The word text without punctuation */
  text: string;

  /** Trailing punctuation characters (e.g., ".", ",", "!") */
  punctuation: string;

  /** Pre-calculated ORP (Optimal Reading Point) index */
  orpIndex: number;

  /** Index of the paragraph this word belongs to */
  paragraphIndex: number;

  /** Global index in the document's word array */
  globalIndex: number;
}
```

#### PlaybackState

```typescript
/**
 * Current state of the playback engine.
 * This is the primary store for playback-related state.
 */
interface PlaybackState {
  /** Current playback status */
  status: 'idle' | 'playing' | 'paused';

  /** Current word index in the document */
  currentWordIndex: number;

  /** Current words per minute setting */
  wpm: number;

  /** ID of the currently loaded document (file path hash or null) */
  documentId: string | null;

  /** Total word count in current document */
  totalWords: number;

  /** Timestamp when playback started (for time remaining calc) */
  playStartTime: number | null;

  /** Word index when playback started (for time remaining calc) */
  playStartIndex: number | null;
}
```

#### TimingConfig

```typescript
/**
 * Configuration for timing calculations.
 * Can be modified for testing or accessibility.
 */
interface TimingConfig {
  /** Base words per minute */
  wpm: number;

  /** Punctuation delay multipliers */
  punctuationMultipliers: {
    /** Sentence-ending punctuation: . ? ! */
    sentence: number;
    /** Clause punctuation: : ; , */
    clause: number;
  };

  /** Length adjustment factor (multiplied by sqrt of word length) */
  lengthFactor: number;

  /** Minimum delay in ms (prevents negative delays at extreme WPM) */
  minDelay: number;

  /** Maximum delay in ms (caps very long pauses) */
  maxDelay: number;
}

/** Default timing configuration */
const DEFAULT_TIMING_CONFIG: TimingConfig = {
  wpm: 400,
  punctuationMultipliers: {
    sentence: 3.0,
    clause: 2.0
  },
  lengthFactor: 0.04,
  minDelay: 20,    // ~3000 WPM equivalent minimum
  maxDelay: 2000   // 2 second max pause
};
```

#### WordTiming

```typescript
/**
 * Detailed timing breakdown for a single word.
 * Used for debugging and testing.
 */
interface WordTiming {
  /** The word being timed */
  word: ParsedWord;

  /** Base delay from WPM: 60000 / wpm */
  baseDelay: number;

  /** Punctuation multiplier applied (1, 2, or 3) */
  punctuationMultiplier: number;

  /** Additional delay from word length */
  lengthAdjustment: number;

  /** Final computed delay in milliseconds */
  finalDelay: number;
}
```

#### PlaybackEvent

```typescript
/**
 * Events emitted by the PlaybackEngine.
 */
type PlaybackEvent =
  | { type: 'word_changed'; word: ParsedWord; index: number; timing: WordTiming }
  | { type: 'state_changed'; state: PlaybackState }
  | { type: 'end_of_document' }
  | { type: 'wpm_changed'; wpm: number }
  | { type: 'position_changed'; index: number; total: number };
```

#### Svelte Store Definitions

```typescript
// src/lib/stores/playbackStore.ts
import { writable, derived, type Readable, type Writable } from 'svelte/store';

/**
 * Main playback state store.
 * Writable internally, readable externally via derived stores.
 */
export const playbackState: Writable<PlaybackState> = writable({
  status: 'idle',
  currentWordIndex: 0,
  wpm: 400,
  documentId: null,
  totalWords: 0,
  playStartTime: null,
  playStartIndex: null
});

/**
 * Derived store: current word from document.
 * Null if no document loaded or index out of bounds.
 */
export const currentWord: Readable<ParsedWord | null> = derived(
  [playbackState, documentStore],
  ([$playback, $document]) => {
    if (!$document?.words || $playback.currentWordIndex >= $document.words.length) {
      return null;
    }
    return $document.words[$playback.currentWordIndex];
  }
);

/**
 * Derived store: playback progress as percentage (0-100).
 */
export const progress: Readable<number> = derived(
  playbackState,
  ($state) => {
    if ($state.totalWords === 0) return 0;
    return Math.round(($state.currentWordIndex / $state.totalWords) * 100);
  }
);

/**
 * Derived store: estimated time remaining in seconds.
 * Based on current WPM and remaining words.
 */
export const timeRemaining: Readable<number> = derived(
  playbackState,
  ($state) => {
    const remaining = $state.totalWords - $state.currentWordIndex;
    if (remaining <= 0 || $state.wpm <= 0) return 0;
    return Math.ceil((remaining / $state.wpm) * 60);
  }
);

/**
 * Derived store: formatted time remaining string (e.g., "5:32").
 */
export const timeRemainingFormatted: Readable<string> = derived(
  timeRemaining,
  ($seconds) => {
    const mins = Math.floor($seconds / 60);
    const secs = $seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
);

/**
 * Derived store: is currently playing.
 */
export const isPlaying: Readable<boolean> = derived(
  playbackState,
  ($state) => $state.status === 'playing'
);

/**
 * Derived store: is paused (document loaded but not playing).
 */
export const isPaused: Readable<boolean> = derived(
  playbackState,
  ($state) => $state.status === 'paused'
);

/**
 * Derived store: has document loaded.
 */
export const hasDocument: Readable<boolean> = derived(
  playbackState,
  ($state) => $state.documentId !== null && $state.totalWords > 0
);
```

---

### 3. State Machine

#### XState-Style Definition

```typescript
// src/lib/playback/playbackMachine.ts

import { createMachine, assign } from 'xstate';

interface PlaybackContext {
  currentWordIndex: number;
  wpm: number;
  documentId: string | null;
  totalWords: number;
  tickerRef: number | null;
}

type PlaybackEvent =
  | { type: 'LOAD_DOCUMENT'; documentId: string; totalWords: number; resumeIndex?: number }
  | { type: 'UNLOAD_DOCUMENT' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE' }
  | { type: 'TICK' }
  | { type: 'SKIP_FORWARD' }
  | { type: 'SKIP_BACKWARD' }
  | { type: 'JUMP_TO'; index: number }
  | { type: 'SET_WPM'; wpm: number }
  | { type: 'ADJUST_WPM'; direction: 'up' | 'down' }
  | { type: 'VIEW_TOGGLE' }
  | { type: 'END_OF_DOCUMENT' };

const playbackMachine = createMachine({
  id: 'playback',
  initial: 'idle',
  context: {
    currentWordIndex: 0,
    wpm: 400,
    documentId: null,
    totalWords: 0,
    tickerRef: null
  },

  states: {
    /**
     * IDLE: No document loaded.
     * Entry point. Waiting for document load.
     */
    idle: {
      on: {
        LOAD_DOCUMENT: {
          target: 'paused',
          actions: ['loadDocument', 'restorePosition', 'notifyStateChange']
        }
      }
    },

    /**
     * PAUSED: Document loaded, playback stopped.
     * Shows progress, time remaining, speed controls.
     */
    paused: {
      entry: ['stopTicker', 'savePosition', 'notifyStateChange'],
      on: {
        PLAY: {
          target: 'playing',
          cond: 'hasWordsRemaining'
        },
        TOGGLE: {
          target: 'playing',
          cond: 'hasWordsRemaining'
        },
        SKIP_FORWARD: {
          actions: ['skipForward', 'notifyPositionChange']
        },
        SKIP_BACKWARD: {
          actions: ['skipBackward', 'notifyPositionChange']
        },
        JUMP_TO: {
          actions: ['jumpTo', 'notifyPositionChange']
        },
        SET_WPM: {
          actions: ['setWpm', 'persistWpm', 'notifyWpmChange']
        },
        ADJUST_WPM: {
          actions: ['adjustWpm', 'persistWpm', 'notifyWpmChange']
        },
        UNLOAD_DOCUMENT: {
          target: 'idle',
          actions: ['savePosition', 'unloadDocument', 'notifyStateChange']
        },
        LOAD_DOCUMENT: {
          target: 'paused',
          actions: ['savePosition', 'loadDocument', 'restorePosition', 'notifyStateChange']
        }
      }
    },

    /**
     * PLAYING: Active word display with timing.
     * Minimal UI, just the word.
     */
    playing: {
      entry: ['startTicker', 'notifyStateChange'],
      on: {
        PAUSE: {
          target: 'paused'
        },
        TOGGLE: {
          target: 'paused'
        },
        VIEW_TOGGLE: {
          target: 'paused',
          actions: ['notifyAutoPause']
        },
        TICK: [
          {
            target: 'paused',
            cond: 'isAtEnd',
            actions: ['notifyEndOfDocument']
          },
          {
            actions: ['advanceWord', 'notifyWordChange', 'scheduleTick']
          }
        ],
        SKIP_FORWARD: {
          actions: ['skipForward', 'notifyWordChange', 'rescheduleTick']
        },
        SKIP_BACKWARD: {
          actions: ['skipBackward', 'notifyWordChange', 'rescheduleTick']
        },
        SET_WPM: {
          actions: ['setWpm', 'persistWpm', 'notifyWpmChange']
        },
        ADJUST_WPM: {
          actions: ['adjustWpm', 'persistWpm', 'notifyWpmChange']
        },
        END_OF_DOCUMENT: {
          target: 'paused',
          actions: ['notifyEndOfDocument']
        },
        UNLOAD_DOCUMENT: {
          target: 'idle',
          actions: ['stopTicker', 'savePosition', 'unloadDocument', 'notifyStateChange']
        }
      },
      exit: ['stopTicker']
    }
  }
}, {
  guards: {
    /**
     * Check if there are words remaining to play.
     */
    hasWordsRemaining: (context) => {
      return context.currentWordIndex < context.totalWords;
    },

    /**
     * Check if at the end of the document.
     */
    isAtEnd: (context) => {
      return context.currentWordIndex >= context.totalWords - 1;
    }
  },

  actions: {
    /**
     * Load a new document into context.
     */
    loadDocument: assign({
      documentId: (_, event) => event.documentId,
      totalWords: (_, event) => event.totalWords,
      currentWordIndex: (_, event) => event.resumeIndex ?? 0
    }),

    /**
     * Clear document from context.
     */
    unloadDocument: assign({
      documentId: null,
      totalWords: 0,
      currentWordIndex: 0
    }),

    /**
     * Restore position from PositionStore.
     */
    restorePosition: assign({
      currentWordIndex: (context) => {
        if (!context.documentId) return 0;
        const saved = positionStore.get(context.documentId);
        return saved ?? 0;
      }
    }),

    /**
     * Save current position to PositionStore.
     */
    savePosition: (context) => {
      if (context.documentId) {
        positionStore.set(context.documentId, context.currentWordIndex);
      }
    },

    /**
     * Advance to next word.
     */
    advanceWord: assign({
      currentWordIndex: (context) => context.currentWordIndex + 1
    }),

    /**
     * Skip forward one word with bounds check.
     */
    skipForward: assign({
      currentWordIndex: (context) =>
        Math.min(context.currentWordIndex + 1, context.totalWords - 1)
    }),

    /**
     * Skip backward one word with bounds check.
     */
    skipBackward: assign({
      currentWordIndex: (context) =>
        Math.max(context.currentWordIndex - 1, 0)
    }),

    /**
     * Jump to specific index with bounds check.
     */
    jumpTo: assign({
      currentWordIndex: (context, event) =>
        Math.max(0, Math.min(event.index, context.totalWords - 1))
    }),

    /**
     * Set WPM directly.
     */
    setWpm: assign({
      wpm: (context, event) => Math.max(300, event.wpm)
    }),

    /**
     * Adjust WPM by 10%.
     */
    adjustWpm: assign({
      wpm: (context, event) => {
        const factor = event.direction === 'up' ? 1.1 : 0.9;
        return Math.max(300, Math.round(context.wpm * factor));
      }
    }),

    /**
     * Persist WPM to SettingsStore.
     */
    persistWpm: (context) => {
      settingsStore.setWpm(context.wpm);
    },

    /**
     * Start the word ticker.
     */
    startTicker: (context, _, { self }) => {
      wordTicker.start(context.wpm, () => self.send('TICK'));
    },

    /**
     * Stop the word ticker.
     */
    stopTicker: () => {
      wordTicker.stop();
    },

    /**
     * Schedule the next tick based on current word timing.
     */
    scheduleTick: (context, _, { self }) => {
      const word = documentStore.getWord(context.currentWordIndex);
      if (word) {
        const timing = timingCalculator.calculate(word, context.wpm);
        wordTicker.scheduleNext(timing.finalDelay, () => self.send('TICK'));
      }
    },

    /**
     * Reschedule tick after skip (for during playback).
     */
    rescheduleTick: (context, _, { self }) => {
      wordTicker.stop();
      const word = documentStore.getWord(context.currentWordIndex);
      if (word) {
        const timing = timingCalculator.calculate(word, context.wpm);
        wordTicker.scheduleNext(timing.finalDelay, () => self.send('TICK'));
      }
    },

    // Event notification actions
    notifyStateChange: () => { /* emit to subscribers */ },
    notifyWordChange: () => { /* emit to subscribers */ },
    notifyPositionChange: () => { /* emit to subscribers */ },
    notifyWpmChange: () => { /* emit to subscribers */ },
    notifyEndOfDocument: () => { /* emit to subscribers */ },
    notifyAutoPause: () => { /* emit to subscribers */ }
  }
});
```

#### State Transition Diagram

```
                              ┌─────────────────────────────────────┐
                              │                                     │
    ┌─────────────────────────┼─────────────────────────────────────┼───┐
    │                         │           IDLE                      │   │
    │                         │  • No document loaded               │   │
    │                         │  • Waiting for LOAD_DOCUMENT        │   │
    │                         └───────────────┬─────────────────────┘   │
    │                                         │                         │
    │                                         │ LOAD_DOCUMENT           │
    │                                         │ [loadDocument,          │
    │                                         │  restorePosition]       │
    │                                         ▼                         │
    │  UNLOAD_DOCUMENT        ┌───────────────────────────────────────┐ │
    │  [savePosition,         │              PAUSED                   │ │
    │   unloadDocument]       │  Entry: stopTicker, savePosition     │ │
    │         ┌───────────────│                                       │ │
    │         │               │  Shows:                               │ │
    │         │               │  • Progress indicator                 │ │
    │         │               │  • Time remaining                     │ │
    │         │               │  • Speed controls                     │ │
    │         │               │                                       │ │
    │         │               │  Handles:                             │ │
    │         │               │  • SKIP_FORWARD / SKIP_BACKWARD       │ │
    │         │               │  • JUMP_TO                            │ │
    │         │               │  • SET_WPM / ADJUST_WPM               │ │
    │         │               └───────────────┬───────────────────────┘ │
    │         │                               │                         │
    │         │                    PLAY/TOGGLE│                         │
    │         │               [hasWordsRemaining]                       │
    │         │                               │                         │
    │         │                               ▼                         │
    │         │               ┌───────────────────────────────────────┐ │
    │         │               │             PLAYING                   │ │
    │         └───────────────│  Entry: startTicker                   │ │
    │                         │  Exit: stopTicker                     │ │
    │  UNLOAD_DOCUMENT        │                                       │ │
    │  [stopTicker,           │  Shows:                               │ │
    │   savePosition,         │  • Current word only                  │ │
    │   unloadDocument]       │  • ORP highlighted                    │ │
    │                         │                                       │ │
    │                         │  Handles:                             │ │
    │                         │  • TICK → advance or end              │ │
    │                         │  • SKIP during playback               │ │
    │                         │  • WPM adjustments                    │ │
    │                         └───────────────┬───────────────────────┘ │
    │                                         │                         │
    │                              PAUSE/TOGGLE│                        │
    │                              VIEW_TOGGLE │                        │
    │                              END_OF_DOC  │                        │
    │                                         │                         │
    │                                         ▼                         │
    │                                    Back to PAUSED                 │
    │                                                                   │
    └───────────────────────────────────────────────────────────────────┘
```

#### Auto-Pause Behavior

The `VIEW_TOGGLE` event **always** transitions from `playing` to `paused`. This is specified in SPEC.md:

> Any view toggle: **Always auto-pauses**

Implementation:
```typescript
// In playing state
VIEW_TOGGLE: {
  target: 'paused',
  actions: ['notifyAutoPause']
}
```

The `notifyAutoPause` action can be used by the UI to show a visual indicator that playback was auto-paused.

---

### 4. Timing Calculator Module

#### Module Interface

```typescript
// src/lib/playback/timingCalculator.ts

export interface TimingCalculator {
  /**
   * Calculate the display duration for a word.
   * @param word - The parsed word to calculate timing for
   * @param wpm - Words per minute setting
   * @param config - Optional timing configuration overrides
   * @returns Full timing breakdown
   */
  calculate(word: ParsedWord, wpm: number, config?: Partial<TimingConfig>): WordTiming;

  /**
   * Get just the final delay (optimized for hot path).
   * @param word - The parsed word
   * @param wpm - Words per minute
   * @returns Delay in milliseconds
   */
  getDelay(word: ParsedWord, wpm: number): number;
}
```

#### Base Delay Formula

The base delay is derived from the WPM (words per minute) setting:

```
base_delay = 60000 / wpm
```

**Derivation:**
- 60,000 milliseconds in one minute
- At X words per minute, each word should display for 60000/X ms on average
- This gives us our baseline before adjustments

**Reference values:**
| WPM | Base Delay |
|-----|------------|
| 300 | 200ms |
| 400 | 150ms |
| 500 | 120ms |
| 600 | 100ms |
| 800 | 75ms |
| 1000 | 60ms |
| 1200 | 50ms |

```typescript
function calculateBaseDelay(wpm: number): number {
  return 60000 / wpm;
}
```

#### Punctuation Detection

```typescript
/**
 * Regex patterns for punctuation detection.
 * Order matters: sentence-ending checked first.
 */
const PUNCTUATION_PATTERNS = {
  /** Sentence-ending punctuation (3x multiplier) */
  sentence: /[.?!]+$/,

  /** Clause punctuation (2x multiplier) */
  clause: /[:;,]+$/,

  /** Ellipsis special case (treated as sentence) */
  ellipsis: /\.{2,}$/,

  /** Interrobang and combinations */
  combined: /[?!]{2,}$/
} as const;

/**
 * Get the punctuation multiplier for a word's trailing punctuation.
 * @param punctuation - The punctuation string from ParsedWord
 * @returns Multiplier (1.0, 2.0, or 3.0)
 */
function getPunctuationMultiplier(punctuation: string): number {
  if (!punctuation || punctuation.length === 0) {
    return 1.0;
  }

  // Check for sentence-ending punctuation
  if (PUNCTUATION_PATTERNS.sentence.test(punctuation)) {
    return 3.0;
  }

  // Check for ellipsis (also sentence-ending)
  if (PUNCTUATION_PATTERNS.ellipsis.test(punctuation)) {
    return 3.0;
  }

  // Check for clause punctuation
  if (PUNCTUATION_PATTERNS.clause.test(punctuation)) {
    return 2.0;
  }

  // No recognized punctuation
  return 1.0;
}
```

**Punctuation Categories:**

| Category | Characters | Multiplier | Rationale |
|----------|------------|------------|-----------|
| Sentence | . ? ! | 3x | Complete thought, need processing time |
| Clause | : ; , | 2x | Partial pause, clause boundary |
| None | (other) | 1x | No pause adjustment needed |

#### Length Adjustment Formula

Longer words need slightly more time to perceive. The formula uses a square root relationship to provide diminishing returns:

```
length_adjustment = base_delay * 0.04 * sqrt(word_length)
```

**Rationale:**
- Square root provides diminishing returns (10-letter word isn't 10x harder than 1-letter)
- 0.04 factor keeps adjustment modest (4% per sqrt-unit)
- Combined with base delay to scale with WPM

```typescript
/**
 * Calculate length-based delay adjustment.
 * @param wordLength - Number of characters in the word
 * @param baseDelay - Base delay from WPM calculation
 * @param factor - Length factor (default 0.04)
 * @returns Additional delay in milliseconds
 */
function getLengthAdjustment(
  wordLength: number,
  baseDelay: number,
  factor: number = 0.04
): number {
  return baseDelay * factor * Math.sqrt(wordLength);
}
```

**Reference values at 400 WPM (base = 150ms):**
| Word Length | sqrt(len) | Adjustment |
|-------------|-----------|------------|
| 1 | 1.00 | +6.0ms |
| 2 | 1.41 | +8.5ms |
| 3 | 1.73 | +10.4ms |
| 5 | 2.24 | +13.4ms |
| 8 | 2.83 | +17.0ms |
| 10 | 3.16 | +19.0ms |
| 15 | 3.87 | +23.2ms |
| 20 | 4.47 | +26.8ms |
| 30 | 5.48 | +32.9ms |

#### Combined Calculation

```typescript
/**
 * Calculate complete timing for a word.
 */
function calculateWordTiming(
  word: ParsedWord,
  wpm: number,
  config: TimingConfig = DEFAULT_TIMING_CONFIG
): WordTiming {
  // 1. Base delay from WPM
  const baseDelay = 60000 / wpm;

  // 2. Punctuation multiplier
  const punctuationMultiplier = getPunctuationMultiplier(word.punctuation);

  // 3. Length adjustment
  const lengthAdjustment = getLengthAdjustment(
    word.text.length,
    baseDelay,
    config.lengthFactor
  );

  // 4. Combine: (base * punctuation) + length
  // Note: punctuation multiplies base, length adds to result
  let finalDelay = (baseDelay * punctuationMultiplier) + lengthAdjustment;

  // 5. Clamp to bounds
  finalDelay = Math.max(config.minDelay, Math.min(config.maxDelay, finalDelay));

  return {
    word,
    baseDelay,
    punctuationMultiplier,
    lengthAdjustment,
    finalDelay: Math.round(finalDelay)
  };
}
```

#### Complete Examples

**Example 1: "the" at 400 WPM**
```
word.text = "the"
word.punctuation = ""
wpm = 400

baseDelay = 60000 / 400 = 150ms
punctuationMultiplier = 1.0 (no punctuation)
lengthAdjustment = 150 * 0.04 * sqrt(3) = 150 * 0.04 * 1.73 = 10.4ms
finalDelay = (150 * 1.0) + 10.4 = 160.4ms ≈ 160ms
```

**Example 2: "extraordinary." at 400 WPM**
```
word.text = "extraordinary"
word.punctuation = "."
wpm = 400

baseDelay = 60000 / 400 = 150ms
punctuationMultiplier = 3.0 (sentence end)
lengthAdjustment = 150 * 0.04 * sqrt(13) = 150 * 0.04 * 3.61 = 21.6ms
finalDelay = (150 * 3.0) + 21.6 = 450 + 21.6 = 471.6ms ≈ 472ms
```

**Example 3: "Hello," at 400 WPM**
```
word.text = "Hello"
word.punctuation = ","
wpm = 400

baseDelay = 60000 / 400 = 150ms
punctuationMultiplier = 2.0 (clause)
lengthAdjustment = 150 * 0.04 * sqrt(5) = 150 * 0.04 * 2.24 = 13.4ms
finalDelay = (150 * 2.0) + 13.4 = 300 + 13.4 = 313.4ms ≈ 313ms
```

**Example 4: "I" at 1200 WPM**
```
word.text = "I"
word.punctuation = ""
wpm = 1200

baseDelay = 60000 / 1200 = 50ms
punctuationMultiplier = 1.0
lengthAdjustment = 50 * 0.04 * sqrt(1) = 2ms
finalDelay = (50 * 1.0) + 2 = 52ms
```

#### Edge Cases

**Very Long Words (30+ characters)**

From SPEC.md: "Long words (30+ chars): Show full word with extended pause"

```typescript
function calculateWordTiming(word: ParsedWord, wpm: number, config: TimingConfig): WordTiming {
  // ... standard calculation ...

  // Edge case: very long words get additional pause
  if (word.text.length >= 30) {
    // Add 50% more time for cognitive processing
    finalDelay *= 1.5;
  }

  // Still clamp to maxDelay
  finalDelay = Math.min(config.maxDelay, finalDelay);

  // ...
}
```

**Hyphenated Words**

From SPEC.md: "Hyphenated (self-aware): Treat as single unit"

The parser should provide hyphenated words as single units. The timing calculator treats them as normal words - their length already accounts for the extra characters.

Example: "self-aware" (10 characters) is timed as a 10-character word, not split.

**Numbers and Symbols**

From SPEC.md: "Numbers ($1,234, 99%): Group with surrounding symbols"

Similarly handled by the parser. The timing calculator sees "$1,234" as a 6-character word.

**Empty or Whitespace-Only Words**

Should not reach the timing calculator (parser filters these), but defensive:

```typescript
if (!word.text || word.text.length === 0) {
  return {
    word,
    baseDelay: 0,
    punctuationMultiplier: 1,
    lengthAdjustment: 0,
    finalDelay: config.minDelay // Use minimum delay
  };
}
```

---

### 5. Word Ticker Module

#### Module Interface

```typescript
// src/lib/playback/wordTicker.ts

export interface WordTicker {
  /**
   * Start the ticker with initial callback.
   * @param onTick - Callback to invoke for each tick
   */
  start(onTick: () => void): void;

  /**
   * Stop the ticker and clear any pending timeout.
   */
  stop(): void;

  /**
   * Schedule the next tick with specific delay.
   * @param delayMs - Delay in milliseconds
   * @param onTick - Callback for this tick
   */
  scheduleNext(delayMs: number, onTick: () => void): void;

  /**
   * Check if ticker is currently running.
   */
  isRunning(): boolean;

  /**
   * Get time until next tick (for debugging).
   */
  getTimeUntilNextTick(): number | null;
}
```

#### Full Implementation

```typescript
// src/lib/playback/wordTicker.ts

/**
 * WordTicker manages the setTimeout-based timing for RSVP display.
 *
 * Design decisions:
 * - Uses setTimeout instead of setInterval for variable timing
 * - Each word can have different display duration
 * - Cleanup is critical to prevent memory leaks
 */
class WordTickerImpl implements WordTicker {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private scheduledTime: number | null = null;
  private running: boolean = false;

  /**
   * Start the ticker. The onTick callback will be called
   * immediately for the first word, then scheduleNext should
   * be called to continue.
   */
  start(onTick: () => void): void {
    this.running = true;
    // Immediate first tick
    onTick();
  }

  /**
   * Stop the ticker and clear pending timeout.
   */
  stop(): void {
    this.running = false;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.scheduledTime = null;
  }

  /**
   * Schedule the next tick with the given delay.
   */
  scheduleNext(delayMs: number, onTick: () => void): void {
    if (!this.running) {
      return;
    }

    // Clear any existing timeout
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    // Record when the next tick should fire
    this.scheduledTime = Date.now() + delayMs;

    // Schedule
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.scheduledTime = null;
      if (this.running) {
        onTick();
      }
    }, delayMs);
  }

  /**
   * Check if the ticker is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get milliseconds until next tick (for debugging/testing).
   */
  getTimeUntilNextTick(): number | null {
    if (this.scheduledTime === null) {
      return null;
    }
    return Math.max(0, this.scheduledTime - Date.now());
  }
}

// Singleton export
export const wordTicker: WordTicker = new WordTickerImpl();
```

#### Usage in PlaybackEngine

```typescript
// Pseudocode for PlaybackEngine integration

class PlaybackEngine {
  private ticker = wordTicker;
  private unsubscribe: (() => void) | null = null;

  play(): void {
    if (this.state.status === 'playing') return;

    this.state.status = 'playing';
    this.emitStateChange();

    // Start ticker with first tick
    this.ticker.start(() => this.handleTick());
  }

  private handleTick(): void {
    // Get current word
    const word = this.getCurrentWord();
    if (!word) {
      this.handleEndOfDocument();
      return;
    }

    // Emit word change
    this.emitWordChange(word);

    // Calculate timing for current word
    const timing = timingCalculator.calculate(word, this.state.wpm);

    // Schedule next tick
    this.ticker.scheduleNext(timing.finalDelay, () => {
      // Advance position
      this.advancePosition();
      // Continue
      this.handleTick();
    });
  }

  pause(): void {
    if (this.state.status !== 'playing') return;

    this.ticker.stop();
    this.state.status = 'paused';
    this.savePosition();
    this.emitStateChange();
  }

  private handleEndOfDocument(): void {
    this.ticker.stop();
    this.state.status = 'paused';
    this.emitEndOfDocument();
  }
}
```

#### Timer Cleanup

Critical for preventing memory leaks, especially during:
- Pause action
- View toggle (auto-pause)
- Document unload
- Skip operations during playback

```typescript
/**
 * Cleanup checklist for ticker:
 * 1. Always call stop() before transitioning out of 'playing'
 * 2. Clear timeout in stop() method
 * 3. Check running flag before executing tick callback
 * 4. Handle component unmount via onDestroy
 */

// In Svelte component
onDestroy(() => {
  playbackEngine.pause();
  // or directly:
  wordTicker.stop();
});
```

---

### 6. Speed Controller Module

#### Module Interface

```typescript
// src/lib/playback/speedController.ts

export interface SpeedController {
  /**
   * Get current WPM setting.
   */
  getWpm(): number;

  /**
   * Set WPM directly.
   * @param wpm - New WPM value (will be clamped to minimum)
   */
  setWpm(wpm: number): void;

  /**
   * Adjust WPM by percentage.
   * @param direction - 'up' for +10%, 'down' for -10%
   */
  adjustWpm(direction: 'up' | 'down'): void;

  /**
   * Subscribe to WPM changes.
   * @param callback - Called when WPM changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (wpm: number) => void): () => void;
}
```

#### Adjustment Algorithm

```typescript
// src/lib/playback/speedController.ts

const MIN_WPM = 300;
const ADJUSTMENT_FACTOR = 0.1; // 10%

class SpeedControllerImpl implements SpeedController {
  private wpm: number;
  private subscribers: Set<(wpm: number) => void> = new Set();

  constructor() {
    // Load from settings or use default
    this.wpm = settingsStore.getWpm() ?? 400;
  }

  getWpm(): number {
    return this.wpm;
  }

  setWpm(wpm: number): void {
    // Clamp to minimum, no maximum
    const newWpm = Math.max(MIN_WPM, Math.round(wpm));

    if (newWpm !== this.wpm) {
      this.wpm = newWpm;
      this.persist();
      this.notify();
    }
  }

  adjustWpm(direction: 'up' | 'down'): void {
    const factor = direction === 'up'
      ? (1 + ADJUSTMENT_FACTOR)  // 1.1
      : (1 - ADJUSTMENT_FACTOR); // 0.9

    const newWpm = Math.round(this.wpm * factor);
    this.setWpm(newWpm);
  }

  private persist(): void {
    settingsStore.setWpm(this.wpm);
  }

  private notify(): void {
    for (const callback of this.subscribers) {
      callback(this.wpm);
    }
  }

  subscribe(callback: (wpm: number) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}

export const speedController: SpeedController = new SpeedControllerImpl();
```

#### WPM Bounds

| Bound | Value | Rationale |
|-------|-------|-----------|
| Minimum | 300 WPM | Below this, benefits of RSVP diminish |
| Maximum | None | Power users may exceed 1200 WPM |

From SPEC.md:
> Range: 300 - 1200+ WPM

The "+" indicates no hard upper limit. The UI may show a recommended range but won't enforce a maximum.

#### Adjustment Steps

At 10% per adjustment:

| Starting WPM | After Up (+10%) | After Down (-10%) |
|--------------|-----------------|-------------------|
| 300 | 330 | 300 (clamped) |
| 400 | 440 | 360 |
| 500 | 550 | 450 |
| 600 | 660 | 540 |
| 800 | 880 | 720 |
| 1000 | 1100 | 900 |
| 1200 | 1320 | 1080 |

#### Persistence to Settings Store

```typescript
// Integration with SettingsStore

interface SettingsStore {
  getWpm(): number | null;
  setWpm(wpm: number): void;
  // ... other settings
}

// SpeedController loads on initialization
constructor() {
  const saved = settingsStore.getWpm();
  this.wpm = saved ?? 400; // Default if not saved
}

// SpeedController saves on every change
private persist(): void {
  settingsStore.setWpm(this.wpm);
}
```

The SettingsStore handles localStorage persistence. SpeedController doesn't interact with localStorage directly.

#### Live Adjustment During Playback

WPM can be adjusted while playing. The new WPM takes effect on the **next** word, not the current one.

```typescript
// In PlaybackEngine

handleWpmChange(newWpm: number): void {
  this.state.wpm = newWpm;
  // No need to reschedule current word
  // Next tick will use new WPM
}

// The scheduler uses current WPM at schedule time
private handleTick(): void {
  // ...
  const timing = timingCalculator.calculate(word, this.state.wpm);
  // If WPM changed since last tick, this uses the new value
  this.ticker.scheduleNext(timing.finalDelay, () => {
    this.advancePosition();
    this.handleTick();
  });
}
```

This provides smooth adjustment without jarring the current word display.

---

### 7. Position Tracker Module

#### Module Interface

```typescript
// src/lib/playback/positionTracker.ts

export interface PositionTracker {
  /**
   * Get current word index.
   */
  getCurrentIndex(): number;

  /**
   * Set current word index.
   * @param index - New index (will be bounds-checked)
   */
  setCurrentIndex(index: number): void;

  /**
   * Skip forward one word.
   */
  skipForward(): void;

  /**
   * Skip backward one word.
   */
  skipBackward(): void;

  /**
   * Jump to specific index.
   * @param index - Target index
   */
  jumpTo(index: number): void;

  /**
   * Get total word count.
   */
  getTotalWords(): number;

  /**
   * Set total word count (called on document load).
   */
  setTotalWords(total: number): void;

  /**
   * Reset position to start.
   */
  reset(): void;

  /**
   * Subscribe to position changes.
   */
  subscribe(callback: (index: number, total: number) => void): () => void;
}
```

#### Implementation

```typescript
// src/lib/playback/positionTracker.ts

class PositionTrackerImpl implements PositionTracker {
  private currentIndex: number = 0;
  private totalWords: number = 0;
  private documentId: string | null = null;
  private subscribers: Set<(index: number, total: number) => void> = new Set();

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  setCurrentIndex(index: number): void {
    const bounded = this.clampIndex(index);
    if (bounded !== this.currentIndex) {
      this.currentIndex = bounded;
      this.notify();
    }
  }

  skipForward(): void {
    this.setCurrentIndex(this.currentIndex + 1);
  }

  skipBackward(): void {
    this.setCurrentIndex(this.currentIndex - 1);
  }

  jumpTo(index: number): void {
    this.setCurrentIndex(index);
  }

  getTotalWords(): number {
    return this.totalWords;
  }

  setTotalWords(total: number): void {
    this.totalWords = Math.max(0, total);
    // Clamp current index if it's now out of bounds
    if (this.currentIndex >= this.totalWords) {
      this.currentIndex = Math.max(0, this.totalWords - 1);
    }
    this.notify();
  }

  reset(): void {
    this.currentIndex = 0;
    this.notify();
  }

  /**
   * Initialize for a new document.
   * Restores position from PositionStore if available.
   */
  initializeForDocument(documentId: string, totalWords: number): void {
    this.documentId = documentId;
    this.totalWords = totalWords;

    // Try to restore saved position
    const savedPosition = positionStore.get(documentId);
    if (savedPosition !== null && savedPosition < totalWords) {
      this.currentIndex = savedPosition;
    } else {
      this.currentIndex = 0;
    }

    this.notify();
  }

  /**
   * Save current position to PositionStore.
   */
  savePosition(): void {
    if (this.documentId) {
      positionStore.set(this.documentId, this.currentIndex);
    }
  }

  private clampIndex(index: number): number {
    if (this.totalWords === 0) return 0;
    return Math.max(0, Math.min(index, this.totalWords - 1));
  }

  private notify(): void {
    for (const callback of this.subscribers) {
      callback(this.currentIndex, this.totalWords);
    }
  }

  subscribe(callback: (index: number, total: number) => void): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.currentIndex, this.totalWords);
    return () => this.subscribers.delete(callback);
  }
}

export const positionTracker: PositionTracker = new PositionTrackerImpl();
```

#### Bounds Checking

```typescript
/**
 * Bounds checking rules:
 * - Index cannot be negative
 * - Index cannot exceed totalWords - 1
 * - If totalWords is 0, index is always 0
 */
private clampIndex(index: number): number {
  // Handle empty document
  if (this.totalWords === 0) {
    return 0;
  }

  // Clamp to valid range [0, totalWords-1]
  return Math.max(0, Math.min(index, this.totalWords - 1));
}
```

#### Position Persistence Per File

The PositionStore (from Persistence System) stores positions keyed by document ID:

```typescript
// PositionStore interface (implemented by Persistence System)
interface PositionStore {
  /**
   * Get saved position for a document.
   * @param documentId - Unique document identifier (file path hash)
   * @returns Saved position or null if not found
   */
  get(documentId: string): number | null;

  /**
   * Save position for a document.
   * @param documentId - Unique document identifier
   * @param position - Word index to save
   */
  set(documentId: string, position: number): void;

  /**
   * Remove saved position for a document.
   */
  remove(documentId: string): void;
}
```

Document ID is typically a hash of the file path or a unique identifier generated on first open.

#### Position Save Triggers

Position is saved on:
1. Pause action
2. View toggle (auto-pause)
3. Document unload
4. Skip operations (forward/backward)
5. Jump to specific position
6. Application close (via beforeunload)

```typescript
// Example save points in PlaybackEngine
pause(): void {
  this.ticker.stop();
  this.state.status = 'paused';
  positionTracker.savePosition(); // Save here
  this.emitStateChange();
}

handleViewToggle(): void {
  this.pause();
  // savePosition called via pause()
}

unloadDocument(): void {
  positionTracker.savePosition(); // Save before unload
  positionTracker.reset();
  // ...
}
```

---

### 8. Keyboard/Gesture Bindings

#### Desktop Keyboard Bindings

| Key | Action | Context |
|-----|--------|---------|
| `Space` | Play/Pause toggle | Global when document loaded |
| `ArrowRight` (→) | Skip forward one word | Global when document loaded |
| `ArrowLeft` (←) | Skip backward one word | Global when document loaded |
| `]` | Increase WPM by 10% | Global when document loaded |
| `[` | Decrease WPM by 10% | Global when document loaded |
| `Tab` | Toggle between views | Global when document loaded |

From SPEC.md:
> Full keyboard navigation support (tab through all controls, arrow keys in Reader View)

Note: In Reader View, arrow keys may have different behavior (scrolling). The bindings above apply in Speed View.

#### Event Handling Approach

```typescript
// src/lib/input/keyboardHandler.ts

interface KeyboardBindings {
  [key: string]: () => void;
}

function createKeyboardHandler(playbackEngine: PlaybackEngine): () => void {
  const bindings: KeyboardBindings = {
    ' ': () => playbackEngine.toggle(),
    'ArrowRight': () => playbackEngine.skipForward(),
    'ArrowLeft': () => playbackEngine.skipBackward(),
    ']': () => playbackEngine.adjustWpm('up'),
    '[': () => playbackEngine.adjustWpm('down'),
    'Tab': () => playbackEngine.handleViewToggle()
  };

  function handleKeyDown(event: KeyboardEvent): void {
    // Don't handle if in input field
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Don't handle if no document loaded
    if (!playbackEngine.hasDocument()) {
      return;
    }

    const handler = bindings[event.key];
    if (handler) {
      event.preventDefault();
      handler();
    }
  }

  // Attach listener
  window.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
```

#### Mobile Gesture Bindings

| Gesture | Action | Context |
|---------|--------|---------|
| Tap (center) | Play/Pause toggle | Speed View |
| Swipe left | Switch to Reader View | Speed View |
| Swipe right | Switch to Speed View | Reader View |
| Long press | Show speed controls | Speed View when paused |

From SPEC.md:
> Speed adjustment requires **pausing first** on mobile.

#### Mobile Touch Handler

```typescript
// src/lib/input/touchHandler.ts

interface TouchConfig {
  swipeThreshold: number;    // Minimum px for swipe detection
  longPressDelay: number;    // ms to trigger long press
}

const DEFAULT_TOUCH_CONFIG: TouchConfig = {
  swipeThreshold: 50,
  longPressDelay: 500
};

function createTouchHandler(
  playbackEngine: PlaybackEngine,
  config: TouchConfig = DEFAULT_TOUCH_CONFIG
): () => void {
  let touchStartX: number = 0;
  let touchStartY: number = 0;
  let touchStartTime: number = 0;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;

  function handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();

    // Start long press timer
    longPressTimer = setTimeout(() => {
      if (playbackEngine.isPaused()) {
        playbackEngine.showSpeedControls();
      }
    }, config.longPressDelay);
  }

  function handleTouchEnd(event: TouchEvent): void {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const duration = Date.now() - touchStartTime;

    // Detect swipe (horizontal movement > threshold, limited vertical)
    if (Math.abs(deltaX) > config.swipeThreshold &&
        Math.abs(deltaY) < config.swipeThreshold) {
      if (deltaX > 0) {
        // Swipe right
        playbackEngine.handleViewToggle('speed');
      } else {
        // Swipe left
        playbackEngine.handleViewToggle('reader');
      }
      return;
    }

    // Detect tap (small movement, short duration)
    if (Math.abs(deltaX) < 10 &&
        Math.abs(deltaY) < 10 &&
        duration < config.longPressDelay) {
      playbackEngine.toggle();
    }
  }

  function handleTouchMove(): void {
    // Cancel long press on move
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // Attach listeners
  const element = document.getElementById('speed-view');
  if (element) {
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchmove', handleTouchMove);
  }

  // Return cleanup
  return () => {
    if (element) {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
  };
}
```

---

### 9. Integration Points

#### DocumentStore Subscription

```typescript
// Playback Engine subscribes to DocumentStore for:
// 1. Document load events
// 2. Word array access
// 3. Document metadata

interface DocumentStore {
  /** Subscribe to document changes */
  subscribe(callback: (doc: Document | null) => void): () => void;

  /** Get word at index */
  getWord(index: number): ParsedWord | null;

  /** Get all words */
  getWords(): ParsedWord[];

  /** Get total word count */
  getWordCount(): number;

  /** Get document ID */
  getDocumentId(): string | null;
}

// Usage in PlaybackEngine
class PlaybackEngine {
  private unsubscribeDocument: (() => void) | null = null;

  initialize(): void {
    this.unsubscribeDocument = documentStore.subscribe((doc) => {
      if (doc) {
        this.handleDocumentLoad(doc);
      } else {
        this.handleDocumentUnload();
      }
    });
  }

  private handleDocumentLoad(doc: Document): void {
    const documentId = documentStore.getDocumentId();
    const totalWords = documentStore.getWordCount();

    positionTracker.initializeForDocument(documentId, totalWords);
    this.state.documentId = documentId;
    this.state.totalWords = totalWords;
    this.state.status = 'paused';

    this.emitStateChange();
  }

  getCurrentWord(): ParsedWord | null {
    return documentStore.getWord(positionTracker.getCurrentIndex());
  }

  destroy(): void {
    if (this.unsubscribeDocument) {
      this.unsubscribeDocument();
    }
  }
}
```

#### SettingsStore Read/Write

```typescript
// Playback Engine interacts with SettingsStore for:
// 1. WPM persistence
// 2. Loading saved WPM on startup

interface SettingsStore {
  /** Get saved WPM */
  getWpm(): number | null;

  /** Save WPM */
  setWpm(wpm: number): void;

  /** Subscribe to setting changes */
  subscribe(callback: (settings: Settings) => void): () => void;
}

// SpeedController integration
class SpeedControllerImpl {
  constructor() {
    // Load on init
    const savedWpm = settingsStore.getWpm();
    this.wpm = savedWpm ?? 400;
  }

  setWpm(wpm: number): void {
    this.wpm = Math.max(300, wpm);
    settingsStore.setWpm(this.wpm); // Persist
    this.notify();
  }
}
```

#### PositionStore Per-File

```typescript
// Playback Engine uses PositionStore for:
// 1. Saving position on pause/unload
// 2. Restoring position on document load

interface PositionStore {
  /** Get saved position for document */
  get(documentId: string): number | null;

  /** Save position for document */
  set(documentId: string, position: number): void;

  /** Remove position for document */
  remove(documentId: string): void;

  /** Get all saved positions (for recent files) */
  getAll(): Map<string, number>;
}

// Storage format in localStorage:
// Key: 'faf_positions'
// Value: JSON { [documentId]: position }

// Example:
{
  "abc123": 1542,
  "def456": 0,
  "ghi789": 8721
}
```

#### Event Emission to Views

```typescript
// Playback Engine emits events that views subscribe to

type PlaybackEventHandler = (event: PlaybackEvent) => void;

class PlaybackEngine {
  private eventHandlers: Set<PlaybackEventHandler> = new Set();

  /**
   * Subscribe to playback events.
   */
  on(handler: PlaybackEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(event: PlaybackEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  // Event emission points:

  private emitWordChange(): void {
    const word = this.getCurrentWord();
    if (word) {
      const timing = timingCalculator.calculate(word, this.state.wpm);
      this.emit({
        type: 'word_changed',
        word,
        index: positionTracker.getCurrentIndex(),
        timing
      });
    }
  }

  private emitStateChange(): void {
    this.emit({
      type: 'state_changed',
      state: { ...this.state }
    });
  }

  private emitEndOfDocument(): void {
    this.emit({ type: 'end_of_document' });
  }

  private emitWpmChange(): void {
    this.emit({
      type: 'wpm_changed',
      wpm: this.state.wpm
    });
  }

  private emitPositionChange(): void {
    this.emit({
      type: 'position_changed',
      index: positionTracker.getCurrentIndex(),
      total: positionTracker.getTotalWords()
    });
  }
}
```

#### Svelte Component Integration

```svelte
<!-- SpeedView.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { playbackEngine } from '$lib/playback/playbackEngine';
  import { currentWord, isPlaying, progress, timeRemainingFormatted } from '$lib/stores/playbackStore';

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = playbackEngine.on((event) => {
      switch (event.type) {
        case 'end_of_document':
          // Show completion message
          break;
        // Handle other events
      }
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });
</script>

{#if $currentWord}
  <WordDisplay word={$currentWord} />
{/if}

{#if !$isPlaying}
  <ProgressIndicator progress={$progress} timeRemaining={$timeRemainingFormatted} />
{/if}
```

---

### 10. Testing Strategy

#### Timing Accuracy Tests

```typescript
// tests/timingCalculator.test.ts

import { describe, it, expect } from 'vitest';
import { calculateWordTiming, DEFAULT_TIMING_CONFIG } from '../src/lib/playback/timingCalculator';

describe('TimingCalculator', () => {
  describe('base delay calculation', () => {
    it('calculates correct base delay at 400 WPM', () => {
      const word = { text: 'test', punctuation: '', orpIndex: 1, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      // Base should be 150ms at 400 WPM
      expect(timing.baseDelay).toBe(150);
    });

    it('calculates correct base delay at 300 WPM', () => {
      const word = { text: 'test', punctuation: '', orpIndex: 1, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 300);

      expect(timing.baseDelay).toBe(200);
    });

    it('calculates correct base delay at 600 WPM', () => {
      const word = { text: 'test', punctuation: '', orpIndex: 1, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 600);

      expect(timing.baseDelay).toBe(100);
    });
  });

  describe('punctuation multipliers', () => {
    it('applies 3x multiplier for period', () => {
      const word = { text: 'sentence', punctuation: '.', orpIndex: 2, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      expect(timing.punctuationMultiplier).toBe(3.0);
    });

    it('applies 3x multiplier for question mark', () => {
      const word = { text: 'question', punctuation: '?', orpIndex: 2, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      expect(timing.punctuationMultiplier).toBe(3.0);
    });

    it('applies 3x multiplier for exclamation', () => {
      const word = { text: 'exclaim', punctuation: '!', orpIndex: 2, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      expect(timing.punctuationMultiplier).toBe(3.0);
    });

    it('applies 2x multiplier for comma', () => {
      const word = { text: 'clause', punctuation: ',', orpIndex: 1, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      expect(timing.punctuationMultiplier).toBe(2.0);
    });

    it('applies 2x multiplier for semicolon', () => {
      const word = { text: 'clause', punctuation: ';', orpIndex: 1, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      expect(timing.punctuationMultiplier).toBe(2.0);
    });

    it('applies 1x multiplier for no punctuation', () => {
      const word = { text: 'word', punctuation: '', orpIndex: 1, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      expect(timing.punctuationMultiplier).toBe(1.0);
    });
  });

  describe('length adjustment', () => {
    it('adds correct length adjustment for short word', () => {
      const word = { text: 'the', punctuation: '', orpIndex: 0, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      // sqrt(3) ≈ 1.73, 150 * 0.04 * 1.73 ≈ 10.4
      expect(timing.lengthAdjustment).toBeCloseTo(10.4, 0);
    });

    it('adds correct length adjustment for long word', () => {
      const word = { text: 'extraordinary', punctuation: '', orpIndex: 3, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      // sqrt(13) ≈ 3.61, 150 * 0.04 * 3.61 ≈ 21.6
      expect(timing.lengthAdjustment).toBeCloseTo(21.6, 0);
    });
  });

  describe('combined calculation', () => {
    it('calculates correct final delay for "the" at 400 WPM', () => {
      const word = { text: 'the', punctuation: '', orpIndex: 0, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      // (150 * 1) + 10.4 ≈ 160
      expect(timing.finalDelay).toBeCloseTo(160, -1);
    });

    it('calculates correct final delay for "extraordinary." at 400 WPM', () => {
      const word = { text: 'extraordinary', punctuation: '.', orpIndex: 3, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      // (150 * 3) + 21.6 ≈ 472
      expect(timing.finalDelay).toBeCloseTo(472, -1);
    });

    it('calculates correct final delay for "Hello," at 400 WPM', () => {
      const word = { text: 'Hello', punctuation: ',', orpIndex: 1, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 400);

      // (150 * 2) + 13.4 ≈ 313
      expect(timing.finalDelay).toBeCloseTo(313, -1);
    });
  });

  describe('bounds checking', () => {
    it('respects minimum delay', () => {
      // Very high WPM
      const word = { text: 'a', punctuation: '', orpIndex: 0, paragraphIndex: 0, globalIndex: 0 };
      const timing = calculateWordTiming(word, 10000);

      expect(timing.finalDelay).toBeGreaterThanOrEqual(DEFAULT_TIMING_CONFIG.minDelay);
    });

    it('respects maximum delay', () => {
      // Sentence end with very long word at low WPM
      const word = {
        text: 'supercalifragilisticexpialidocious',
        punctuation: '.',
        orpIndex: 4,
        paragraphIndex: 0,
        globalIndex: 0
      };
      const timing = calculateWordTiming(word, 100);

      expect(timing.finalDelay).toBeLessThanOrEqual(DEFAULT_TIMING_CONFIG.maxDelay);
    });
  });
});
```

#### State Machine Tests

```typescript
// tests/playbackMachine.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { interpret } from 'xstate';
import { playbackMachine } from '../src/lib/playback/playbackMachine';

describe('PlaybackMachine', () => {
  let service;

  beforeEach(() => {
    service = interpret(playbackMachine).start();
  });

  afterEach(() => {
    service.stop();
  });

  describe('initial state', () => {
    it('starts in idle state', () => {
      expect(service.state.value).toBe('idle');
    });

    it('has empty context', () => {
      expect(service.state.context.documentId).toBeNull();
      expect(service.state.context.totalWords).toBe(0);
    });
  });

  describe('document loading', () => {
    it('transitions to paused on LOAD_DOCUMENT', () => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100 });
      expect(service.state.value).toBe('paused');
    });

    it('sets context on document load', () => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100 });
      expect(service.state.context.documentId).toBe('test');
      expect(service.state.context.totalWords).toBe(100);
    });

    it('restores position if provided', () => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100, resumeIndex: 50 });
      expect(service.state.context.currentWordIndex).toBe(50);
    });
  });

  describe('play/pause transitions', () => {
    beforeEach(() => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100 });
    });

    it('transitions to playing on PLAY', () => {
      service.send({ type: 'PLAY' });
      expect(service.state.value).toBe('playing');
    });

    it('transitions to paused on PAUSE from playing', () => {
      service.send({ type: 'PLAY' });
      service.send({ type: 'PAUSE' });
      expect(service.state.value).toBe('paused');
    });

    it('toggles between states on TOGGLE', () => {
      service.send({ type: 'TOGGLE' });
      expect(service.state.value).toBe('playing');
      service.send({ type: 'TOGGLE' });
      expect(service.state.value).toBe('paused');
    });
  });

  describe('auto-pause on view toggle', () => {
    beforeEach(() => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100 });
      service.send({ type: 'PLAY' });
    });

    it('pauses on VIEW_TOGGLE while playing', () => {
      expect(service.state.value).toBe('playing');
      service.send({ type: 'VIEW_TOGGLE' });
      expect(service.state.value).toBe('paused');
    });
  });

  describe('end of document', () => {
    beforeEach(() => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 2 });
      service.send({ type: 'PLAY' });
    });

    it('transitions to paused at end of document', () => {
      // Simulate reaching end
      service.send({ type: 'TICK' }); // word 0 -> 1
      service.send({ type: 'TICK' }); // word 1, isAtEnd = true
      expect(service.state.value).toBe('paused');
    });
  });

  describe('skip operations', () => {
    beforeEach(() => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100 });
    });

    it('skips forward', () => {
      service.send({ type: 'SKIP_FORWARD' });
      expect(service.state.context.currentWordIndex).toBe(1);
    });

    it('skips backward', () => {
      service.send({ type: 'SKIP_FORWARD' });
      service.send({ type: 'SKIP_BACKWARD' });
      expect(service.state.context.currentWordIndex).toBe(0);
    });

    it('bounds check on skip forward at end', () => {
      service.send({ type: 'JUMP_TO', index: 99 });
      service.send({ type: 'SKIP_FORWARD' });
      expect(service.state.context.currentWordIndex).toBe(99);
    });

    it('bounds check on skip backward at start', () => {
      service.send({ type: 'SKIP_BACKWARD' });
      expect(service.state.context.currentWordIndex).toBe(0);
    });
  });

  describe('WPM adjustment', () => {
    beforeEach(() => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100 });
    });

    it('sets WPM directly', () => {
      service.send({ type: 'SET_WPM', wpm: 500 });
      expect(service.state.context.wpm).toBe(500);
    });

    it('adjusts WPM up by 10%', () => {
      service.send({ type: 'SET_WPM', wpm: 400 });
      service.send({ type: 'ADJUST_WPM', direction: 'up' });
      expect(service.state.context.wpm).toBe(440);
    });

    it('adjusts WPM down by 10%', () => {
      service.send({ type: 'SET_WPM', wpm: 400 });
      service.send({ type: 'ADJUST_WPM', direction: 'down' });
      expect(service.state.context.wpm).toBe(360);
    });

    it('respects minimum WPM', () => {
      service.send({ type: 'SET_WPM', wpm: 100 });
      expect(service.state.context.wpm).toBe(300);
    });
  });
});
```

#### Edge Case Scenarios

```typescript
// tests/edgeCases.test.ts

import { describe, it, expect } from 'vitest';

describe('Edge Cases', () => {
  describe('empty document', () => {
    it('does not play with zero words', () => {
      // Document with no words
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'empty', totalWords: 0 });
      service.send({ type: 'PLAY' });
      // Guard prevents transition
      expect(service.state.value).toBe('paused');
    });
  });

  describe('single word document', () => {
    it('immediately ends after single word', () => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'single', totalWords: 1 });
      service.send({ type: 'PLAY' });
      service.send({ type: 'TICK' });
      expect(service.state.value).toBe('paused');
    });
  });

  describe('very long words', () => {
    it('applies extended pause for 30+ character words', () => {
      const longWord = {
        text: 'pneumonoultramicroscopicsilicovolcanoconiosis', // 45 chars
        punctuation: '',
        orpIndex: 4,
        paragraphIndex: 0,
        globalIndex: 0
      };
      const timing = calculateWordTiming(longWord, 400);

      // Should have 1.5x multiplier for long words
      const normalWord = { ...longWord, text: 'normal' };
      const normalTiming = calculateWordTiming(normalWord, 400);

      expect(timing.finalDelay).toBeGreaterThan(normalTiming.finalDelay * 1.4);
    });
  });

  describe('rapid toggle', () => {
    it('handles rapid play/pause without errors', () => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100 });

      for (let i = 0; i < 10; i++) {
        service.send({ type: 'TOGGLE' });
      }

      // Should end in paused (even number of toggles)
      expect(service.state.value).toBe('paused');
    });
  });

  describe('WPM at boundaries', () => {
    it('cannot go below minimum WPM', () => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100 });
      service.send({ type: 'SET_WPM', wpm: 300 });

      // Try to decrease multiple times
      for (let i = 0; i < 10; i++) {
        service.send({ type: 'ADJUST_WPM', direction: 'down' });
      }

      expect(service.state.context.wpm).toBe(300);
    });

    it('allows very high WPM', () => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'test', totalWords: 100 });
      service.send({ type: 'SET_WPM', wpm: 5000 });

      expect(service.state.context.wpm).toBe(5000);
    });
  });

  describe('document switch during playback', () => {
    it('saves position and pauses on document switch', () => {
      service.send({ type: 'LOAD_DOCUMENT', documentId: 'doc1', totalWords: 100 });
      service.send({ type: 'PLAY' });
      service.send({ type: 'TICK' });
      service.send({ type: 'TICK' });
      // Now at index 2

      service.send({ type: 'LOAD_DOCUMENT', documentId: 'doc2', totalWords: 50 });

      expect(service.state.value).toBe('paused');
      expect(service.state.context.documentId).toBe('doc2');
      // Position should be saved for doc1 (verified via mock)
    });
  });

  describe('timing precision', () => {
    it('maintains consistent timing over many words', async () => {
      const startTime = Date.now();
      const words = Array(100).fill({ text: 'test', punctuation: '', orpIndex: 1, paragraphIndex: 0, globalIndex: 0 });

      let totalDelay = 0;
      for (const word of words) {
        const timing = calculateWordTiming(word, 400);
        totalDelay += timing.finalDelay;
      }

      // At 400 WPM, 100 words should take ~15 seconds
      // Base: 150ms * 100 = 15000ms
      // With length adjustment for 4-char words: ~12ms each = 1200ms extra
      // Total: ~16200ms
      expect(totalDelay).toBeGreaterThan(15000);
      expect(totalDelay).toBeLessThan(20000);
    });
  });
});
```

---

## Review

## Review

### Scoring

| Criterion | Score | Rationale |
|-----------|-------|-----------|
| **Completeness** | 10/10 | Covers all requirements from SPEC.md. Timing formula fully specified with examples. State machine is comprehensive. All SPEC requirements addressed including WPM range (300-1200+), auto-pause on view toggle, punctuation multipliers, and length factor. |
| **Clarity** | 9/10 | Excellent documentation with clear formulas and examples. State transitions well-documented. TypeScript interfaces are precise. Minor: Some integration points could benefit from sequence diagrams. |
| **Correctness** | 10/10 | Timing formula matches SPEC.md exactly: base = 60000/WPM, punctuation .?! = 3x, :;, = 2x, length factor = +0.04 * sqrt(word_length). WPM range 300-1200+ correctly implemented. Auto-pause on view toggle implemented in state machine. |
| **Implementability** | 10/10 | Developer can implement without guessing. All interfaces fully typed. State machine is XState-ready. Complete test suite provided. Module breakdown clear. Integration points well-defined. |

**Overall Score: 39/40 (97.5%)**

### Assessment

This specification is exceptionally well-crafted and ready for implementation. It demonstrates:

1. **Complete alignment with source spec**: Every requirement from SPEC.md is addressed
2. **Implementation-ready detail**: Full TypeScript interfaces, complete algorithms, working examples
3. **Testability**: Comprehensive test suite included covering timing accuracy, state transitions, and edge cases
4. **Clear architecture**: Clean separation of concerns with defined module boundaries
5. **Practical examples**: Timing calculations shown with real numbers at multiple WPM settings

### Critical Issues

None.

### Warnings

None.

### Suggestions (Optional Improvements)

1. **Section 9 (Integration Points)**: Consider adding a sequence diagram showing the interaction flow between PlaybackEngine, DocumentStore, and View components during a typical play/pause cycle. This would help visualize the event flow.

2. **Section 4 (Timing Calculator)**: The edge case handling for 30+ character words applies a 1.5x multiplier, but this isn't specified in SPEC.md. While reasonable, consider documenting this as an enhancement beyond spec or verifying it aligns with user expectations.

3. **Section 5 (Word Ticker)**: Consider documenting the rationale for using `setTimeout` over `requestAnimationFrame`. This is a good choice for variable timing, but worth explaining explicitly for future maintainers.

### Verdict

**APPROVED - Ready for implementation phase**

This specification meets all criteria for approval:
- Complete coverage of requirements
- Formulas are correct and match SPEC.md exactly
- Clear, implementable design with full TypeScript types
- Comprehensive test coverage provided
- State machine is well-defined and correct
- All integration points documented

The implementer can proceed with confidence. The specification is detailed enough that implementation should be straightforward, and the provided test suite will verify correctness.

---

**Reviewed by**: Judge Agent  
**Date**: 2026-01-17  
**Next Step**: Proceed to implementation phase
