<script lang="ts">
  import { settingsStore } from '$lib/stores/settings';
  import ORPRenderer from './ORPRenderer.svelte';
  import type { ParsedWord } from '$lib/stores/document';

  export let word: ParsedWord;

  $: wordColor = $settingsStore.colors.word;
  $: orpColor = $settingsStore.colors.focusLetter;
</script>

<div class="word-display">
  <ORPRenderer {word} {wordColor} {orpColor} />
</div>

<style>
  .word-display {
    font-family: 'Lexend', sans-serif;
    font-size: clamp(2rem, 8vw, 4rem);
    font-weight: 400;
    user-select: none;
    white-space: nowrap;
  }
</style>
