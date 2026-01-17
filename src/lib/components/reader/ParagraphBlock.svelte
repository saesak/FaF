<script lang="ts">
  import type { Paragraph, ParsedWord } from '$lib/stores/document';

  export let paragraph: Paragraph;
  export let words: ParsedWord[];
  export let highlightedIndex: number | null;
  export let paragraphIndex: number;

  $: paragraphWords = words.slice(paragraph.startWordIndex, paragraph.endWordIndex + 1);
</script>

<p class="paragraph-block" data-paragraph-index={paragraphIndex}>
  {#each paragraphWords as word, i}
    {@const wordIndex = paragraph.startWordIndex + i}
    <span
      class="word"
      class:highlighted={highlightedIndex === wordIndex}
      data-word-index={wordIndex}
      role="button"
      tabindex="-1"
    >{word.text}</span>{' '}
  {/each}
</p>

<style>
  .paragraph-block {
    margin: 0;
    text-align: left;
    content-visibility: auto;
    contain-intrinsic-size: auto 3em;
  }

  .word {
    cursor: pointer;
    border-radius: 2px;
    padding: 0 1px;
    margin: 0 -1px;
  }

  .word:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .word.highlighted {
    background-color: rgba(229, 57, 53, 0.3);
  }
</style>
