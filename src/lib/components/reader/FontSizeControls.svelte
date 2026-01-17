<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { viewStore, fontSize } from '$lib/stores/viewStore';

  let visible = true;
  let hideTimeout: ReturnType<typeof setTimeout>;

  function showControls() {
    visible = true;
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      visible = false;
    }, 3000);
  }

  function increase() {
    viewStore.increaseFontSize();
    showControls();
  }

  function decrease() {
    viewStore.decreaseFontSize();
    showControls();
  }

  onMount(() => {
    showControls();
    return () => clearTimeout(hideTimeout);
  });
</script>

{#if visible}
  <div class="font-size-controls" transition:fade={{ duration: 150 }}>
    <button
      class="size-btn"
      on:click={decrease}
      disabled={$fontSize <= 0.8}
      aria-label="Decrease font size"
    >
      A-
    </button>

    <span class="size-indicator">{Math.round($fontSize * 100)}%</span>

    <button
      class="size-btn"
      on:click={increase}
      disabled={$fontSize >= 2.0}
      aria-label="Increase font size"
    >
      A+
    </button>
  </div>
{/if}

<style>
  .font-size-controls {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    padding: 0.5rem;
    border-radius: 8px;
    backdrop-filter: blur(8px);
  }

  .size-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-family: 'Lexend', sans-serif;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .size-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }

  .size-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .size-indicator {
    min-width: 48px;
    text-align: center;
    font-family: 'Lexend', sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.8);
  }
</style>
