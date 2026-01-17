import type { ParsedWord, DocumentPosition, PositionMap, DocumentModel } from './types';

export function getParagraphForWord(
  wordIndex: number,
  positionMap: PositionMap
): number {
  if (wordIndex < 0 || wordIndex >= positionMap.wordToParagraph.length) {
    throw new Error(`Word index ${wordIndex} out of bounds`);
  }
  return positionMap.wordToParagraph[wordIndex];
}

export function getWordsForParagraph(
  paragraphIndex: number,
  positionMap: PositionMap
): { start: number; end: number } {
  if (paragraphIndex < 0 || paragraphIndex >= positionMap.paragraphToWords.length) {
    throw new Error(`Paragraph index ${paragraphIndex} out of bounds`);
  }
  return positionMap.paragraphToWords[paragraphIndex];
}

export function getWordPosition(
  wordIndex: number,
  words: ParsedWord[]
): DocumentPosition {
  if (wordIndex < 0 || wordIndex >= words.length) {
    throw new Error(`Word index ${wordIndex} out of bounds`);
  }
  return words[wordIndex].documentPosition;
}

export function findWordAtPosition(
  position: DocumentPosition,
  words: ParsedWord[]
): number {
  for (let i = 0; i < words.length; i++) {
    const wp = words[i].documentPosition;
    if (
      wp.pageIndex === position.pageIndex &&
      wp.paragraphIndex === position.paragraphIndex &&
      wp.wordIndexInParagraph === position.wordIndexInParagraph
    ) {
      return i;
    }
  }
  return -1;
}

export function findWordNearOffset(
  paragraphIndex: number,
  textOffset: number,
  document: DocumentModel
): number {
  const { start, end } = document.positionMap.paragraphToWords[paragraphIndex];

  let currentOffset = 0;

  for (let i = start; i <= end; i++) {
    const word = document.words[i];
    const wordEnd = currentOffset + word.text.length + 1;

    if (textOffset <= wordEnd) {
      return i;
    }

    currentOffset = wordEnd;
  }

  return end;
}
