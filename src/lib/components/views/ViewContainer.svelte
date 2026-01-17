<script lang="ts">
  import { currentDocument, isLoading, parseError, documentStore } from '$lib/stores/document';
  import { activeView } from '$lib/stores/viewStore';
  import SpeedView from './SpeedView.svelte';
  import ReaderView from './ReaderView.svelte';
  import EmptyState from './EmptyState.svelte';
  import LoadingState from './LoadingState.svelte';
  import ErrorState from './ErrorState.svelte';
  import type { RecentFile } from '$lib/persistence/types';

  export let onLoadFile: ((file: File) => void) | undefined = undefined;
  export let onLoadRecentFile: ((file: RecentFile) => void) | undefined = undefined;

  $: hasDocument = $currentDocument !== null;
  $: showEmpty = !hasDocument && !$isLoading && !$parseError;
  $: showLoading = $isLoading;
  $: showError = $parseError !== null;
  $: showDocument = hasDocument && !$isLoading && !$parseError;

  function handleLoadFile(event: CustomEvent<File>) {
    onLoadFile?.(event.detail);
  }

  function handleLoadRecentFile(event: CustomEvent<RecentFile>) {
    onLoadRecentFile?.(event.detail);
  }

  function handleDismissError() {
    documentStore.dismissError();
  }
</script>

<div class="view-container">
  {#if showLoading}
    <LoadingState />
  {:else if showError && $parseError}
    <ErrorState error={$parseError} on:dismiss={handleDismissError} />
  {:else if showEmpty}
    <EmptyState
      on:loadFile={handleLoadFile}
      on:loadRecentFile={handleLoadRecentFile}
    />
  {:else if showDocument}
    <div class="view-layer" class:active={$activeView === 'speed'}>
      <SpeedView />
    </div>
    <div class="view-layer" class:active={$activeView === 'reader'}>
      <ReaderView />
    </div>
  {/if}
</div>

<style>
  .view-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  .view-layer {
    position: absolute;
    inset: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .view-layer.active {
    visibility: visible;
    pointer-events: auto;
  }
</style>
