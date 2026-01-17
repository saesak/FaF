import type { ParseResult, DocumentMetadata, PdfPage, Paragraph } from './types';
import { tokenizePages } from './wordTokenizer';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - will be set up in vite config
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface RawPageData {
  pageNumber: number;
  textItems: TextItem[];
  width: number;
  height: number;
}

interface ColumnLayout {
  type: 'single' | 'double' | 'triple';
  columnBoundaries: number[];
}

interface HeaderFooterPatterns {
  headerPatterns: string[];
  footerPatterns: string[];
  pageNumberRegex: RegExp | null;
}

function getFilenameWithoutExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function findLineStarts(textItems: TextItem[]): TextItem[] {
  const yTolerance = 5;
  const lines = new Map<number, TextItem[]>();

  for (const item of textItems) {
    const y = Math.round(item.transform[5] / yTolerance) * yTolerance;
    if (!lines.has(y)) {
      lines.set(y, []);
    }
    lines.get(y)!.push(item);
  }

  const lineStarts: TextItem[] = [];
  for (const [, items] of lines) {
    const leftmost = items.reduce((min, item) =>
      item.transform[4] < min.transform[4] ? item : min
    );
    lineStarts.push(leftmost);
  }

  return lineStarts;
}

interface Cluster {
  center: number;
  count: number;
}

function clusterValues(values: number[], tolerance: number): Cluster[] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const clusters: Cluster[] = [];
  let currentCluster = { sum: sorted[0], count: 1 };

  for (let i = 1; i < sorted.length; i++) {
    const currentCenter = currentCluster.sum / currentCluster.count;
    if (sorted[i] - currentCenter <= tolerance) {
      currentCluster.sum += sorted[i];
      currentCluster.count++;
    } else {
      clusters.push({
        center: currentCluster.sum / currentCluster.count,
        count: currentCluster.count,
      });
      currentCluster = { sum: sorted[i], count: 1 };
    }
  }

  clusters.push({
    center: currentCluster.sum / currentCluster.count,
    count: currentCluster.count,
  });

  return clusters;
}

function detectColumnLayout(textItems: TextItem[], pageWidth: number): ColumnLayout {
  const lineStarts = findLineStarts(textItems);
  const xPositions = lineStarts.map(item => item.transform[4]);

  const tolerance = pageWidth * 0.05;
  const clusters = clusterValues(xPositions, tolerance);

  const minLines = lineStarts.length * 0.1;
  const significantClusters = clusters
    .filter(c => c.count >= minLines)
    .sort((a, b) => a.center - b.center);

  if (significantClusters.length === 1) {
    return { type: 'single', columnBoundaries: [] };
  }

  if (significantClusters.length === 2) {
    const boundary = (significantClusters[0].center + significantClusters[1].center) / 2;
    return { type: 'double', columnBoundaries: [boundary] };
  }

  if (significantClusters.length >= 3) {
    const b1 = (significantClusters[0].center + significantClusters[1].center) / 2;
    const b2 = (significantClusters[1].center + significantClusters[2].center) / 2;
    return { type: 'triple', columnBoundaries: [b1, b2] };
  }

  return { type: 'single', columnBoundaries: [] };
}

function normalizeLine(line: string): string {
  return line.trim().toLowerCase().replace(/\d+/g, '#');
}

function extractLines(
  items: TextItem[],
  count: number,
  position: 'top' | 'bottom'
): string[] {
  const yTolerance = 10;
  const lineMap = new Map<number, string[]>();

  for (const item of items) {
    const y = Math.round(item.transform[5] / yTolerance) * yTolerance;
    if (!lineMap.has(y)) {
      lineMap.set(y, []);
    }
    lineMap.get(y)!.push(item.str);
  }

  const sortedLines = Array.from(lineMap.entries())
    .sort((a, b) => position === 'top' ? b[0] - a[0] : a[0] - b[0])
    .slice(0, count)
    .map(([, texts]) => texts.join(' '));

  return sortedLines;
}

function detectPageNumberPattern(pages: RawPageData[]): RegExp | null {
  const patterns = [
    /^-?\s*\d+\s*-?$/,
    /^page\s+\d+$/i,
    /^\d+\s+of\s+\d+$/i,
    /^\[\d+\]$/,
  ];

  for (const pattern of patterns) {
    let matches = 0;
    for (const page of pages) {
      const bottomText = page.textItems
        .filter(item => item.transform[5] < page.height * 0.1)
        .map(item => item.str.trim())
        .join(' ');

      if (pattern.test(bottomText)) {
        matches++;
      }
    }

    if (matches >= pages.length * 0.7) {
      return pattern;
    }
  }

  return null;
}

function detectHeaderFooterPatterns(pages: RawPageData[]): HeaderFooterPatterns {
  const LINES_TO_CHECK = 3;
  const THRESHOLD = 0.8;

  const headerCandidates = new Map<string, number>();
  const footerCandidates = new Map<string, number>();

  for (const page of pages) {
    const sortedByY = [...page.textItems].sort(
      (a, b) => b.transform[5] - a.transform[5]
    );

    const topLines = extractLines(sortedByY.slice(0, 20), LINES_TO_CHECK, 'top');
    for (const line of topLines) {
      const normalized = normalizeLine(line);
      headerCandidates.set(normalized, (headerCandidates.get(normalized) || 0) + 1);
    }

    const bottomLines = extractLines(sortedByY.slice(-20), LINES_TO_CHECK, 'bottom');
    for (const line of bottomLines) {
      const normalized = normalizeLine(line);
      footerCandidates.set(normalized, (footerCandidates.get(normalized) || 0) + 1);
    }
  }

  const minOccurrences = Math.floor(pages.length * THRESHOLD);

  const headerPatterns = Array.from(headerCandidates.entries())
    .filter(([, count]) => count >= minOccurrences)
    .map(([pattern]) => pattern);

  const footerPatterns = Array.from(footerCandidates.entries())
    .filter(([, count]) => count >= minOccurrences)
    .map(([pattern]) => pattern);

  const pageNumberRegex = detectPageNumberPattern(pages);

  return { headerPatterns, footerPatterns, pageNumberRegex };
}

function filterHeadersFooters(
  pages: RawPageData[],
  patterns: HeaderFooterPatterns
): RawPageData[] {
  return pages.map(page => ({
    ...page,
    textItems: page.textItems.filter(item => {
      const text = item.str.trim();
      const normalized = normalizeLine(text);

      if (patterns.headerPatterns.includes(normalized)) {
        return false;
      }

      if (patterns.footerPatterns.includes(normalized)) {
        return false;
      }

      if (patterns.pageNumberRegex?.test(text)) {
        return false;
      }

      return true;
    }),
  }));
}

function orderByColumns(
  items: TextItem[],
  layout: ColumnLayout,
  _pageHeight: number
): TextItem[] {
  const columns: TextItem[][] = [];
  const boundaries = [0, ...layout.columnBoundaries, Infinity];

  for (let i = 0; i < boundaries.length - 1; i++) {
    columns.push([]);
  }

  for (const item of items) {
    const x = item.transform[4];
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (x >= boundaries[i] && x < boundaries[i + 1]) {
        columns[i].push(item);
        break;
      }
    }
  }

  const ordered: TextItem[] = [];
  for (const column of columns) {
    column.sort((a, b) => b.transform[5] - a.transform[5]);
    ordered.push(...column);
  }

  return ordered;
}

function mergeIntoParagraphs(items: TextItem[]): string[] {
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let lastY = Infinity;
  let lastFontSize = 0;

  const PARAGRAPH_GAP = 20;

  for (const item of items) {
    const y = item.transform[5];
    const fontSize = Math.abs(item.transform[3]);

    const yGap = lastY - y;
    const isNewParagraph = yGap > PARAGRAPH_GAP ||
      (fontSize !== lastFontSize && currentParagraph.length > 0);

    if (isNewParagraph && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' ').trim());
      currentParagraph = [];
    }

    if (item.str.trim()) {
      currentParagraph.push(item.str);
    }

    lastY = y;
    lastFontSize = fontSize;
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' ').trim());
  }

  return paragraphs.filter(p => p.length > 0);
}

function processPage(rawPage: RawPageData): PdfPage {
  const layout = detectColumnLayout(rawPage.textItems, rawPage.width);

  let orderedItems: TextItem[];

  if (layout.type === 'single') {
    orderedItems = [...rawPage.textItems].sort(
      (a, b) => b.transform[5] - a.transform[5]
    );
  } else {
    orderedItems = orderByColumns(rawPage.textItems, layout, rawPage.height);
  }

  const paragraphTexts = mergeIntoParagraphs(orderedItems);

  const paragraphs: Paragraph[] = paragraphTexts.map(text => ({
    text,
    startWordIndex: 0,
    endWordIndex: 0,
  }));

  return {
    pageNumber: rawPage.pageNumber,
    textContent: paragraphTexts.join('\n\n'),
    paragraphs,
  };
}

export async function parsePdf(
  file: File,
  filePath?: string
): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const rawPages: RawPageData[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      const textItems: TextItem[] = [];
      for (const item of textContent.items) {
        if ('str' in item && 'transform' in item) {
          const ti = item as { str: string; transform: number[]; width: number; height: number };
          textItems.push({
            str: ti.str,
            transform: ti.transform,
            width: ti.width,
            height: ti.height,
          });
        }
      }

      rawPages.push({
        pageNumber: i,
        textItems,
        width: viewport.width,
        height: viewport.height,
      });
    }

    const headerFooterPatterns = detectHeaderFooterPatterns(rawPages);
    const filteredPages = filterHeadersFooters(rawPages, headerFooterPatterns);

    const pages: PdfPage[] = [];
    for (const rawPage of filteredPages) {
      const processedPage = processPage(rawPage);
      if (processedPage.paragraphs.length > 0) {
        pages.push(processedPage);
      }
    }

    if (pages.length === 0) {
      return {
        success: false,
        error: {
          type: 'corrupted_file',
          message: 'This PDF contains no readable text. It may be image-based.',
        },
      };
    }

    const { words, positionMap } = tokenizePages(pages);

    if (words.length === 0) {
      return {
        success: false,
        error: {
          type: 'empty_file',
          message: 'This PDF contains no readable text.',
        },
      };
    }

    let title = getFilenameWithoutExtension(file.name);
    let author: string | undefined;

    try {
      const metadata = await pdf.getMetadata();
      if (metadata.info) {
        const info = metadata.info as Record<string, unknown>;
        if (typeof info['Title'] === 'string' && info['Title']) {
          title = info['Title'];
        }
        if (typeof info['Author'] === 'string') {
          author = info['Author'];
        }
      }
    } catch {
      // Use defaults
    }

    const documentMetadata: DocumentMetadata = {
      title,
      author,
      fileType: 'pdf',
      filePath,
      fileSize: file.size,
      totalWords: words.length,
      totalParagraphs: pages.reduce((sum, p) => sum + p.paragraphs.length, 0),
      estimatedReadingTime: Math.ceil(words.length / 300),
    };

    return {
      success: true,
      document: {
        words,
        metadata: documentMetadata,
        rawContent: {
          type: 'pdf',
          pages,
        },
        positionMap,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('password')) {
      return {
        success: false,
        error: {
          type: 'drm_protected',
          message: 'This PDF is password protected.',
        },
      };
    }

    return {
      success: false,
      error: {
        type: 'corrupted_file',
        message: 'Unable to parse this PDF file. It may be corrupted.',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
