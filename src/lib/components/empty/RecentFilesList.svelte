<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { recentFilesStore } from '$lib/stores/recentFiles';
  import type { RecentFile } from '$lib/persistence/types';

  const dispatch = createEventDispatcher<{ fileSelected: RecentFile }>();

  function openFile(file: RecentFile) {
    dispatch('fileSelected', file);
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  function formatProgress(position: number, total: number): string {
    if (total === 0) return '0%';
    const percent = Math.round((position / total) * 100);
    return `${percent}%`;
  }

  function getFileIcon(type: string): string {
    switch (type) {
      case 'pdf':
        return 'PDF';
      case 'epub':
        return 'EPUB';
      default:
        return 'TXT';
    }
  }

  $: files = $recentFilesStore.slice(0, 5);
</script>

{#if files.length > 0}
  <div class="recent-files">
    <h2 class="section-title">Recent Files</h2>

    <ul class="file-list">
      {#each files as file}
        <li>
          <button class="file-item" on:click={() => openFile(file)}>
            <span class="file-icon">{getFileIcon(file.type)}</span>
            <div class="file-info">
              <span class="file-title">{file.name}</span>
              <span class="file-meta">
                {formatProgress(file.position.wordIndex, file.totalWords)} - {formatDate(file.lastOpenedAt)}
              </span>
            </div>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .recent-files {
    width: 100%;
  }

  .section-title {
    font-family: 'Lexend', sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 0.75rem 0;
  }

  .file-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .file-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .file-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .file-icon {
    font-family: 'Lexend', sans-serif;
    font-size: 0.625rem;
    font-weight: 600;
    color: #e53935;
    background: rgba(229, 57, 53, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .file-title {
    font-family: 'Lexend', sans-serif;
    font-size: 0.875rem;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-meta {
    font-family: 'Lexend', sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
  }
</style>
