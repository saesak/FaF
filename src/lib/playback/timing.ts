import type { ParsedWord } from '../parser/types';

export interface TimingConfig {
  wpm: number;
  punctuationMultipliers: {
    sentence: number;
    clause: number;
  };
  lengthFactor: number;
  minDelay: number;
  maxDelay: number;
}

export interface WordTiming {
  word: ParsedWord;
  baseDelay: number;
  punctuationMultiplier: number;
  lengthAdjustment: number;
  finalDelay: number;
}

export const DEFAULT_TIMING_CONFIG: TimingConfig = {
  wpm: 400,
  punctuationMultipliers: {
    sentence: 3.0,
    clause: 2.0,
  },
  lengthFactor: 0.04,
  minDelay: 20,
  maxDelay: 2000,
};

const PUNCTUATION_PATTERNS = {
  sentence: /[.?!]+$/,
  clause: /[:;,]+$/,
  ellipsis: /\.{2,}$/,
} as const;

function calculateBaseDelay(wpm: number): number {
  return 60000 / wpm;
}

function getPunctuationMultiplier(punctuation: string): number {
  if (!punctuation || punctuation.length === 0) {
    return 1.0;
  }

  if (PUNCTUATION_PATTERNS.sentence.test(punctuation)) {
    return 3.0;
  }

  if (PUNCTUATION_PATTERNS.ellipsis.test(punctuation)) {
    return 3.0;
  }

  if (PUNCTUATION_PATTERNS.clause.test(punctuation)) {
    return 2.0;
  }

  return 1.0;
}

function getLengthAdjustment(
  wordLength: number,
  baseDelay: number,
  factor: number = 0.04
): number {
  return baseDelay * factor * Math.sqrt(wordLength);
}

export function calculateWordTiming(
  word: ParsedWord,
  wpm: number,
  config: TimingConfig = DEFAULT_TIMING_CONFIG
): WordTiming {
  if (!word.text || word.text.length === 0) {
    return {
      word,
      baseDelay: 0,
      punctuationMultiplier: 1,
      lengthAdjustment: 0,
      finalDelay: config.minDelay,
    };
  }

  const baseDelay = calculateBaseDelay(wpm);
  const punctuationMultiplier = getPunctuationMultiplier(word.punctuation);
  const lengthAdjustment = getLengthAdjustment(
    word.text.length,
    baseDelay,
    config.lengthFactor
  );

  let finalDelay = baseDelay * punctuationMultiplier + lengthAdjustment;

  if (word.text.length >= 30) {
    finalDelay *= 1.5;
  }

  finalDelay = Math.max(config.minDelay, Math.min(config.maxDelay, finalDelay));

  return {
    word,
    baseDelay,
    punctuationMultiplier,
    lengthAdjustment,
    finalDelay: Math.round(finalDelay),
  };
}

export function getDelay(word: ParsedWord, wpm: number): number {
  return calculateWordTiming(word, wpm).finalDelay;
}

export class TimingCalculator {
  private config: TimingConfig;

  constructor(config: Partial<TimingConfig> = {}) {
    this.config = { ...DEFAULT_TIMING_CONFIG, ...config };
  }

  calculate(word: ParsedWord, wpm: number): WordTiming {
    return calculateWordTiming(word, wpm, this.config);
  }

  getDelay(word: ParsedWord, wpm: number): number {
    return this.calculate(word, wpm).finalDelay;
  }

  updateConfig(config: Partial<TimingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): TimingConfig {
    return { ...this.config };
  }
}

export const timingCalculator = new TimingCalculator();
