<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { playbackEngine } from '$lib/playback/engine';
  import { viewStore } from '$lib/stores/viewStore';
  import type { ParsedWord } from '$lib/stores/document';

  export let word: ParsedWord;
  export let wordIndex: number;
  export let isHighlighted: boolean = false;

  const dispatch = createEventDispatcher();

  function handleClick() {
    playbackEngine.jumpTo(wordIndex);
    viewStore.highlightWord(wordIndex);
    dispatch('wordClick', { wordIndex, word });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleClick();
    }
  }
</script>

<span
  class="clickable-word"
  class:highlighted={isHighlighted}
  data-word-index={wordIndex}
  on:click={handleClick}
  on:keydown={handleKeyDown}
  tabindex="0"
  role="button"
  aria-label="Set reading position to: {word.text}"
>
  {word.text}
</span>

<style>
  .clickable-word {
    cursor: pointer;
    border-radius: 2px;
    padding: 0 1px;
    margin: 0 -1px;
    transition: background-color 0.15s ease;
  }

  .clickable-word:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .clickable-word:focus {
    outline: 2px solid rgba(229, 57, 53, 0.5);
    outline-offset: 1px;
  }

  .clickable-word.highlighted {
    background-color: rgba(229, 57, 53, 0.3);
  }
</style>
