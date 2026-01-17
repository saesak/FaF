export {
  playbackEngine,
  playbackState,
  isPlaying,
  isPaused,
  hasDocument,
  progress,
  timeRemaining,
  timeRemainingFormatted,
  type PlaybackStatus,
  type PlaybackState,
  type PlaybackEvent,
} from './engine';

export {
  timingCalculator,
  calculateWordTiming,
  getDelay,
  TimingCalculator,
  DEFAULT_TIMING_CONFIG,
  type TimingConfig,
  type WordTiming,
} from './timing';

export {
  wordTicker,
  createWordTicker,
  type WordTicker,
} from './ticker';
