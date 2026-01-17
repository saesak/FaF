<script lang="ts">
  import { fade } from 'svelte/transition';
</script>

<div class="loading-state" transition:fade={{ duration: 150 }}>
  <div class="spinner"></div>
  <p class="loading-text">Loading document...</p>
</div>

<style>
  .loading-state {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    background-color: #38393d;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: #e53935;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    font-family: 'Lexend', sans-serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
</style>
