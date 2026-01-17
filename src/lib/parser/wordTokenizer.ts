import type { ParsedWord, Paragraph, PositionMap, Chapter, PdfPage } from './types';

const WORD_REGEX = /(?:\$?[\d,]+(?:\.\d+)?%?)|(?:[\w''-]+)/g;

export function calculateORP(word: string): number {
  const length = word.length;
  if (length <= 2) return 0;
  if (length <= 6) return 1;
  if (length <= 10) return 2;
  if (length <= 13) return 3;
  return 4;
}

export function calculateDelayMultiplier(punctuation: string): 1 | 2 | 3 {
  if (!punctuation) return 1;

  const lastChar = punctuation[punctuation.length - 1];

  if ('.?!'.includes(lastChar)) {
    return 3;
  }

  if (':;,'.includes(lastChar)) {
    return 2;
  }

  return 1;
}

function extractPunctuation(word: string): { text: string; punctuation: string } {
  const match = word.match(/([.?!:;,]+)$/);
  if (match) {
    return {
      text: word.slice(0, -match[1].length),
      punctuation: match[1],
    };
  }
  return { text: word, punctuation: '' };
}

function tokenizeParagraph(text: string): Omit<ParsedWord, 'originalIndex' | 'documentPosition'>[] {
  const words: Omit<ParsedWord, 'originalIndex' | 'documentPosition'>[] = [];
  const matches = text.matchAll(WORD_REGEX);

  for (const match of matches) {
    const rawWord = match[0];
    const { text: cleanText, punctuation } = extractPunctuation(rawWord);

    if (cleanText.length === 0) continue;

    words.push({
      text: rawWord,
      orp: calculateORP(cleanText),
      punctuation,
      delayMultiplier: calculateDelayMultiplier(punctuation),
    });
  }

  return words;
}

export interface TokenizeResult {
  words: ParsedWord[];
  paragraphs: Paragraph[];
  positionMap: PositionMap;
}

export function tokenizeDocument(
  paragraphTexts: string[],
  pageIndex?: number
): TokenizeResult {
  const words: ParsedWord[] = [];
  const paragraphs: Paragraph[] = [];
  const wordToParagraph: number[] = [];
  const paragraphToWords: Array<{ start: number; end: number }> = [];

  let globalWordIndex = 0;

  for (let pIdx = 0; pIdx < paragraphTexts.length; pIdx++) {
    const paragraphText = paragraphTexts[pIdx];
    const paragraphWords = tokenizeParagraph(paragraphText);

    const startIndex = globalWordIndex;

    for (let wIdx = 0; wIdx < paragraphWords.length; wIdx++) {
      const word = paragraphWords[wIdx];

      words.push({
        ...word,
        originalIndex: globalWordIndex,
        documentPosition: {
          pageIndex,
          paragraphIndex: pIdx,
          wordIndexInParagraph: wIdx,
        },
      });

      wordToParagraph.push(pIdx);
      globalWordIndex++;
    }

    const endIndex = globalWordIndex - 1;

    paragraphs.push({
      text: paragraphText,
      startWordIndex: startIndex,
      endWordIndex: endIndex >= startIndex ? endIndex : startIndex,
    });

    paragraphToWords.push({
      start: startIndex,
      end: endIndex >= startIndex ? endIndex : startIndex,
    });
  }

  return {
    words,
    paragraphs,
    positionMap: {
      wordToParagraph,
      paragraphToWords,
    },
  };
}

export function tokenizeChapters(chapters: Chapter[]): TokenizeResult {
  const allWords: ParsedWord[] = [];
  const wordToParagraph: number[] = [];
  const paragraphToWords: Array<{ start: number; end: number }> = [];
  const allParagraphs: Paragraph[] = [];

  let globalWordIndex = 0;
  let globalParagraphIndex = 0;

  for (const chapter of chapters) {
    for (let pIdx = 0; pIdx < chapter.paragraphs.length; pIdx++) {
      const paragraph = chapter.paragraphs[pIdx];
      const paragraphWords = tokenizeParagraph(paragraph.text);

      const startIndex = globalWordIndex;

      for (let wIdx = 0; wIdx < paragraphWords.length; wIdx++) {
        allWords.push({
          ...paragraphWords[wIdx],
          originalIndex: globalWordIndex,
          documentPosition: {
            pageIndex: chapter.index,
            paragraphIndex: pIdx,
            wordIndexInParagraph: wIdx,
          },
        });

        wordToParagraph.push(globalParagraphIndex);
        globalWordIndex++;
      }

      const endIndex = globalWordIndex - 1;
      paragraph.startWordIndex = startIndex;
      paragraph.endWordIndex = endIndex >= startIndex ? endIndex : startIndex;

      allParagraphs.push(paragraph);

      paragraphToWords.push({
        start: startIndex,
        end: endIndex >= startIndex ? endIndex : startIndex,
      });

      globalParagraphIndex++;
    }
  }

  return {
    words: allWords,
    paragraphs: allParagraphs,
    positionMap: { wordToParagraph, paragraphToWords },
  };
}

export function tokenizePages(pages: PdfPage[]): TokenizeResult {
  const allWords: ParsedWord[] = [];
  const wordToParagraph: number[] = [];
  const paragraphToWords: Array<{ start: number; end: number }> = [];
  const allParagraphs: Paragraph[] = [];

  let globalWordIndex = 0;
  let globalParagraphIndex = 0;

  for (const page of pages) {
    for (let pIdx = 0; pIdx < page.paragraphs.length; pIdx++) {
      const paragraph = page.paragraphs[pIdx];
      const paragraphWords = tokenizeParagraph(paragraph.text);

      const startIndex = globalWordIndex;

      for (let wIdx = 0; wIdx < paragraphWords.length; wIdx++) {
        allWords.push({
          ...paragraphWords[wIdx],
          originalIndex: globalWordIndex,
          documentPosition: {
            pageIndex: page.pageNumber - 1,
            paragraphIndex: pIdx,
            wordIndexInParagraph: wIdx,
          },
        });

        wordToParagraph.push(globalParagraphIndex);
        globalWordIndex++;
      }

      const endIndex = globalWordIndex - 1;
      paragraph.startWordIndex = startIndex;
      paragraph.endWordIndex = endIndex >= startIndex ? endIndex : startIndex;

      allParagraphs.push(paragraph);

      paragraphToWords.push({
        start: startIndex,
        end: endIndex >= startIndex ? endIndex : startIndex,
      });

      globalParagraphIndex++;
    }
  }

  return {
    words: allWords,
    paragraphs: allParagraphs,
    positionMap: { wordToParagraph, paragraphToWords },
  };
}
