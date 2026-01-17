<script lang="ts">
  import { fade } from 'svelte/transition';
  import { progress, timeRemainingFormatted, playbackState } from '$lib/playback/engine';
  import SpeedControls from './SpeedControls.svelte';

  $: progressText = `${$progress}%`;
</script>

<div class="progress-overlay" transition:fade={{ duration: 150 }}>
  <div class="progress-info">
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: {$progress}%"></div>
    </div>

    <div class="stats">
      <span class="percentage">{progressText}</span>
      <span class="separator">-</span>
      <span class="time-remaining">{$timeRemainingFormatted} remaining</span>
    </div>
  </div>

  <SpeedControls />
</div>

<style>
  .progress-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1.5rem;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.3));
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .progress-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .progress-bar-container {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: #e53935;
    transition: width 0.3s ease;
  }

  .stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-family: 'Lexend', sans-serif;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .percentage {
    font-weight: 500;
  }

  .separator {
    opacity: 0.5;
  }
</style>
