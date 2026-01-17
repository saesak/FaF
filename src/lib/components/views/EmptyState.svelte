<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { recentFilesStore } from '$lib/stores/recentFiles';
  import { uiStore, dragOver } from '$lib/stores/uiStore';
  import RecentFilesList from '../empty/RecentFilesList.svelte';
  import FileDropZone from '../empty/FileDropZone.svelte';
  import FilePicker from '../empty/FilePicker.svelte';
  import type { RecentFile } from '$lib/persistence/types';

  const dispatch = createEventDispatcher<{
    loadFile: File;
    loadRecentFile: RecentFile;
  }>();

  $: hasRecentFiles = $recentFilesStore.length > 0;

  function handleFilePicked(event: CustomEvent<File>) {
    dispatch('loadFile', event.detail);
  }

  function handleFileDropped(event: CustomEvent<File>) {
    dispatch('loadFile', event.detail);
  }

  function handleRecentFileSelected(event: CustomEvent<RecentFile>) {
    dispatch('loadRecentFile', event.detail);
  }
</script>

<div class="empty-state" class:drag-over={$dragOver}>
  <FileDropZone on:fileDropped={handleFileDropped}>
    <div class="content">
      <div class="logo">
        <span class="logo-text">FaF</span>
        <span class="logo-subtitle">Fast as Fuck</span>
      </div>

      <div class="actions">
        <FilePicker on:fileSelected={handleFilePicked} />

        <p class="or-text">or drag and drop a file</p>

        <p class="supported-formats">Supports: TXT, EPUB, PDF (max 50MB)</p>
      </div>

      {#if hasRecentFiles}
        <RecentFilesList on:fileSelected={handleRecentFileSelected} />
      {/if}

      <blockquote class="quote">
        "The habit that keeps people from speedreading is their habit to pronounce
        words in their head when they read them. Keep the voice out of your head,
        and let the eyes do the work."
      </blockquote>
    </div>
  </FileDropZone>
</div>

<style>
  .empty-state {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #38393d;
    transition: background-color 0.2s ease;
  }

  .empty-state.drag-over {
    background-color: #454650;
  }

  .content {
    max-width: 480px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .logo-text {
    font-family: 'Lexend', sans-serif;
    font-size: 3rem;
    font-weight: 700;
    color: #e53935;
    letter-spacing: -0.02em;
  }

  .logo-subtitle {
    font-family: 'Lexend', sans-serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  .actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .or-text {
    font-family: 'Lexend', sans-serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }

  .supported-formats {
    font-family: 'Lexend', sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.3);
    margin: 0;
  }

  .quote {
    font-family: 'Lexend', sans-serif;
    font-size: 0.875rem;
    font-style: italic;
    color: rgba(255, 255, 255, 0.4);
    text-align: center;
    line-height: 1.6;
    max-width: 400px;
    margin: 1rem 0 0 0;
    padding: 0 1rem;
    border-left: 2px solid rgba(255, 255, 255, 0.2);
  }
</style>
