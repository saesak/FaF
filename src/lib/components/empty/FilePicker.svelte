<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ fileSelected: File }>();

  let fileInput: HTMLInputElement;

  function openFilePicker() {
    fileInput.click();
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      dispatch('fileSelected', file);
    }

    input.value = '';
  }
</script>

<input
  type="file"
  accept=".txt,.text,.epub,.pdf,text/plain,application/epub+zip,application/pdf"
  bind:this={fileInput}
  on:change={handleFileSelect}
  class="hidden-input"
/>

<button class="pick-btn" on:click={openFilePicker}>
  Open a file
</button>

<style>
  .hidden-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .pick-btn {
    font-family: 'Lexend', sans-serif;
    font-size: 1rem;
    font-weight: 500;
    color: white;
    background: #e53935;
    border: none;
    padding: 0.875rem 2rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pick-btn:hover {
    background: #d32f2f;
    transform: translateY(-1px);
  }

  .pick-btn:active {
    transform: translateY(0);
  }
</style>
