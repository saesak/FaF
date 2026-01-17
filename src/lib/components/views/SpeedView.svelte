<script lang="ts">
  import { currentWord } from '$lib/stores/position';
  import { isPaused, hasDocument } from '$lib/playback/engine';
  import { settingsStore } from '$lib/stores/settings';
  import WordDisplay from '../speed/WordDisplay.svelte';
  import ProgressOverlay from '../speed/ProgressOverlay.svelte';

  $: showProgress = $isPaused && $hasDocument;
  $: backgroundColor = $settingsStore.colors.background;
</script>

<div class="speed-view" style="background-color: {backgroundColor};">
  {#if $currentWord}
    <WordDisplay word={$currentWord} />
  {:else}
    <div class="no-word"></div>
  {/if}

  {#if showProgress}
    <ProgressOverlay />
  {/if}
</div>

<style>
  .speed-view {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .no-word {
    /* Placeholder for edge cases */
  }
</style>
