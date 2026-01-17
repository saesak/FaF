<script lang="ts">
  import { onMount, afterUpdate, tick } from 'svelte';
  import type { ParsedWord } from '$lib/stores/document';

  export let word: ParsedWord;
  export let wordColor: string = '#FFFFFF';
  export let orpColor: string = '#E53935';

  let containerRef: HTMLDivElement;
  let wordRef: HTMLSpanElement;
  let offsetX: number = 0;

  async function calculateOffset() {
    await tick();

    // Wait for fonts to be ready before measuring
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    if (!containerRef || !wordRef) return;

    const containerWidth = containerRef.clientWidth;
    const orpIndex = word.orp;
    const text = word.text;

    const measureContainer = document.createElement('div');
    measureContainer.style.cssText = `
      position: absolute;
      visibility: hidden;
      font-family: 'Lexend', sans-serif;
      font-size: ${getComputedStyle(wordRef).fontSize};
      white-space: nowrap;
    `;
    document.body.appendChild(measureContainer);

    const beforeText = text.slice(0, orpIndex);
    measureContainer.textContent = beforeText;
    const beforeWidth = measureContainer.clientWidth;

    measureContainer.textContent = text[orpIndex] || '';
    const orpWidth = measureContainer.clientWidth;

    document.body.removeChild(measureContainer);

    const orpCenterFromStart = beforeWidth + orpWidth / 2;
    const containerCenter = containerWidth / 2;
    offsetX = containerCenter - orpCenterFromStart;
  }

  onMount(() => {
    calculateOffset();
    window.addEventListener('resize', calculateOffset);
    return () => window.removeEventListener('resize', calculateOffset);
  });

  afterUpdate(() => {
    calculateOffset();
  });

  $: beforeORP = word.text.slice(0, word.orp);
  $: orpChar = word.text[word.orp] || '';
  $: afterORP = word.text.slice(word.orp + 1);
</script>

<div class="orp-container" bind:this={containerRef}>
  <span
    class="word-text"
    bind:this={wordRef}
    style="transform: translateX({offsetX}px);"
  ><span class="before" style="color: {wordColor};">{beforeORP}</span><span class="orp" style="color: {orpColor};">{orpChar}</span><span class="after" style="color: {wordColor};">{afterORP}</span></span>
</div>

<style>
  .orp-container {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    overflow: visible;
  }

  .word-text {
    display: inline-block;
    transition: transform 0.05s ease-out;
  }

  .orp {
    font-weight: 500;
  }
</style>
