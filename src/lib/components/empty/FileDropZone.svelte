<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { uiStore } from '$lib/stores/uiStore';

  const dispatch = createEventDispatcher<{ fileDropped: File }>();

  let dropZoneRef: HTMLDivElement;

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    uiStore.setDragOver(true);
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    if (!dropZoneRef.contains(event.relatedTarget as Node)) {
      uiStore.setDragOver(false);
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    uiStore.setDragOver(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      dispatch('fileDropped', files[0]);
    }
  }
</script>

<div
  class="drop-zone"
  bind:this={dropZoneRef}
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
  role="region"
  aria-label="File drop zone"
>
  <slot />
</div>

<style>
  .drop-zone {
    width: 100%;
    height: 100%;
  }
</style>
