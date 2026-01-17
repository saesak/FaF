<script lang="ts">
  import type { DocumentModel, Paragraph } from '$lib/stores/document';
  import { playbackEngine } from '$lib/playback/engine';
  import { viewStore } from '$lib/stores/viewStore';
  import ParagraphBlock from './ParagraphBlock.svelte';
  import ImageBlock from './ImageBlock.svelte';

  export let document: DocumentModel;
  export let highlightedIndex: number | null = null;

  interface ParagraphItem {
    paragraph: Paragraph;
    pageIndex?: number;
  }

  function getParagraphs(): ParagraphItem[] {
    const content = document.rawContent;

    if (content.type === 'txt') {
      return content.paragraphs.map(p => ({ paragraph: p }));
    }

    if (content.type === 'epub') {
      const result: ParagraphItem[] = [];
      content.chapters.forEach((chapter, chapterIndex) => {
        chapter.paragraphs.forEach(p => {
          result.push({ paragraph: p, pageIndex: chapterIndex });
        });
      });
      return result;
    }

    if (content.type === 'pdf') {
      const result: ParagraphItem[] = [];
      content.pages.forEach((page, pageIndex) => {
        page.paragraphs.forEach(p => {
          result.push({ paragraph: p, pageIndex });
        });
      });
      return result;
    }

    return [];
  }

  $: paragraphs = getParagraphs();

  function handleWordClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const wordIndexStr = target.dataset?.wordIndex;
    if (wordIndexStr !== undefined) {
      const wordIndex = parseInt(wordIndexStr, 10);
      playbackEngine.jumpTo(wordIndex);
      viewStore.highlightWord(wordIndex);
    }
  }
</script>

<div class="document-renderer" on:click={handleWordClick} role="presentation">
  <h1 class="document-title">{document.metadata.title}</h1>

  {#if document.metadata.author}
    <p class="document-author">by {document.metadata.author}</p>
  {/if}

  <div class="document-body">
    {#each paragraphs as { paragraph }, index (index)}
      <ParagraphBlock
        {paragraph}
        words={document.words}
        {highlightedIndex}
        paragraphIndex={index}
      />
    {/each}
  </div>
</div>

<style>
  .document-renderer {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .document-title {
    font-size: 1.75em;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    line-height: 1.3;
  }

  .document-author {
    font-size: 0.9em;
    opacity: 0.7;
    margin: 0 0 2rem 0;
  }

  .document-body {
    display: flex;
    flex-direction: column;
    gap: 1.25em;
  }
</style>
