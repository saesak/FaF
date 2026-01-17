import type { ParseResult, DocumentMetadata, Chapter, Paragraph } from './types';
import { tokenizeChapters } from './wordTokenizer';
import ePub, { type Book, type NavItem } from 'epubjs';

function getFilenameWithoutExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

async function detectDRM(book: Book): Promise<boolean> {
  try {
    const packaging = book.packaging as { encryption?: unknown };
    const encryption = packaging?.encryption;
    if (encryption && typeof encryption === 'object' && Object.keys(encryption).length > 0) {
      return true;
    }

    try {
      const metadata = await book.loaded.metadata;
      if (metadata?.rights && typeof metadata.rights === 'string' &&
          metadata.rights.toLowerCase().includes('drm')) {
        return true;
      }
    } catch {
      // Continue
    }

    try {
      const metadata = await book.loaded.metadata;
      if (metadata?.rights && typeof metadata.rights === 'string' &&
          metadata.rights.toLowerCase().includes('adobe')) {
        return true;
      }
    } catch {
      // Continue
    }

    return false;
  } catch (error) {
    console.warn('DRM check failed, proceeding with parse:', error);
    return false;
  }
}

async function extractMetadata(
  book: Book,
  file: File,
  filePath?: string
): Promise<Partial<DocumentMetadata>> {
  const metadata = await book.loaded.metadata;

  return {
    title: metadata?.title || getFilenameWithoutExtension(file.name),
    author: metadata?.creator,
    fileType: 'epub',
    filePath,
    fileSize: file.size,
  };
}

function buildTocMap(toc: NavItem[]): Map<string, string> {
  const map = new Map<string, string>();

  function traverse(items: NavItem[]) {
    for (const item of items) {
      if (item.href && item.label) {
        const href = item.href.split('#')[0];
        map.set(href, item.label.trim());
      }
      if (item.subitems) {
        traverse(item.subitems);
      }
    }
  }

  traverse(toc);
  return map;
}

function extractParagraphsFromHtml(body: Element): string[] {
  const paragraphs: string[] = [];
  const elements = body.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');

  for (const el of elements) {
    if (el.parentElement?.closest('p, li')) {
      continue;
    }

    const text = el.textContent?.trim();
    if (text && text.length > 0) {
      paragraphs.push(text);
    }
  }

  if (paragraphs.length === 0) {
    const bodyText = body.textContent?.trim();
    if (bodyText) {
      paragraphs.push(bodyText);
    }
  }

  return paragraphs;
}

async function extractChapters(book: Book): Promise<Chapter[]> {
  const chapters: Chapter[] = [];
  const spine = book.spine as unknown as { length: number; get: (i: number) => unknown };

  const toc = await book.loaded.navigation;
  const tocMap = buildTocMap(toc.toc);

  let chapterIndex = 0;

  for (let i = 0; i < spine.length; i++) {
    const section = spine.get(i) as {
      href: string;
      load: (fn: (url: string, type?: string) => Promise<unknown>) => Promise<{ document: Document }>;
      unload: () => void;
    } | null;

    if (!section) continue;

    try {
      const contents = await section.load(book.load.bind(book));
      const doc = contents.document;

      if (!doc || !doc.body) {
        section.unload();
        continue;
      }

      const title = tocMap.get(section.href) ||
        doc.querySelector('h1, h2, h3')?.textContent?.trim();

      const htmlContent = doc.body.innerHTML;
      const paragraphTexts = extractParagraphsFromHtml(doc.body);

      if (paragraphTexts.length > 0) {
        const paragraphs: Paragraph[] = paragraphTexts.map(text => ({
          text,
          startWordIndex: 0,
          endWordIndex: 0,
        }));

        chapters.push({
          title,
          index: chapterIndex++,
          htmlContent,
          paragraphs,
        });
      }

      section.unload();
    } catch {
      // Skip problematic sections
    }
  }

  return chapters;
}

export async function parseEpub(
  file: File,
  filePath?: string
): Promise<ParseResult> {
  let book: Book | null = null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    book = ePub(arrayBuffer);

    await book.ready;

    if (await detectDRM(book)) {
      return {
        success: false,
        error: {
          type: 'drm_protected',
          message: 'This EPUB file is DRM protected and cannot be opened.',
          details: 'Adobe DRM or similar protection detected',
        },
      };
    }

    const metadata = await extractMetadata(book, file, filePath);
    const chapters = await extractChapters(book);

    if (chapters.length === 0) {
      return {
        success: false,
        error: {
          type: 'corrupted_file',
          message: 'This EPUB file contains no readable content.',
        },
      };
    }

    const { words, positionMap } = tokenizeChapters(chapters);

    if (words.length === 0) {
      return {
        success: false,
        error: {
          type: 'empty_file',
          message: 'This EPUB file contains no readable text.',
        },
      };
    }

    return {
      success: true,
      document: {
        words,
        metadata: {
          ...metadata,
          totalWords: words.length,
          totalParagraphs: chapters.reduce((sum, ch) => sum + ch.paragraphs.length, 0),
          estimatedReadingTime: Math.ceil(words.length / 300),
        } as DocumentMetadata,
        rawContent: {
          type: 'epub',
          chapters,
        },
        positionMap,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'corrupted_file',
        message: 'Unable to parse this EPUB file. It may be corrupted.',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    if (book) {
      book.destroy();
    }
  }
}
