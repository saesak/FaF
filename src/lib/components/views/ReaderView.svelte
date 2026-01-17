<script lang="ts">
  import { tick } from 'svelte';
  import { currentDocument } from '$lib/stores/document';
  import { viewStore, highlightedWordIndex, fontSize, activeView } from '$lib/stores/viewStore';
  import { settingsStore } from '$lib/stores/settings';
  import DocumentRenderer from '../reader/DocumentRenderer.svelte';
  import FontSizeControls from '../reader/FontSizeControls.svelte';

  let scrollContainer: HTMLDivElement;

  // Watch for scroll requests when view becomes active
  $: if ($activeView === 'reader' && $viewStore.scrollToIndex !== null && scrollContainer) {
    scrollToWord($viewStore.scrollToIndex);
  }

  async function scrollToWord(wordIndex: number) {
    // Wait for DOM update and visibility change
    await tick();
    requestAnimationFrame(() => {
      if (!scrollContainer) return;

      const wordElement = scrollContainer.querySelector(
        `[data-word-index="${wordIndex}"]`
      );

      if (wordElement) {
        wordElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        viewStore.clearScrollTrigger();
      }
    });
  }

  $: backgroundColor = $settingsStore.colors.background;
  $: textColor = $settingsStore.colors.word;
</script>

<div
  class="reader-view"
  bind:this={scrollContainer}
  style="background-color: {backgroundColor}; color: {textColor}; font-size: {$fontSize}em;"
>
  {#if $currentDocument}
    <div class="document-content">
      <DocumentRenderer
        document={$currentDocument}
        highlightedIndex={$highlightedWordIndex}
      />
    </div>
  {/if}

  <FontSizeControls />
</div>

<style>
  .reader-view {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    font-family: 'Lexend', sans-serif;
    line-height: 1.7;
  }

  .document-content {
    max-width: 65ch;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }
</style>
