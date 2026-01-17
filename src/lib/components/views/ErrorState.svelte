<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ParseError } from '$lib/parser/types';

  export let error: ParseError;

  const dispatch = createEventDispatcher<{ dismiss: void }>();

  function dismiss() {
    dispatch('dismiss');
  }
</script>

<div class="error-state">
  <div class="error-content">
    <div class="error-icon">!</div>
    <h2 class="error-title">Unable to open file</h2>
    <p class="error-message">{error.message}</p>
    <button class="dismiss-btn" on:click={dismiss}>Try another file</button>
  </div>
</div>

<style>
  .error-state {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #38393d;
  }

  .error-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 400px;
    padding: 2rem;
    text-align: center;
  }

  .error-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(229, 57, 53, 0.2);
    color: #e53935;
    font-family: 'Lexend', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    border-radius: 50%;
  }

  .error-title {
    font-family: 'Lexend', sans-serif;
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
    margin: 0;
  }

  .error-message {
    font-family: 'Lexend', sans-serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.5;
  }

  .dismiss-btn {
    font-family: 'Lexend', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    color: white;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    margin-top: 0.5rem;
  }

  .dismiss-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }
</style>
