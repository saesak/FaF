<script lang="ts">
  import { playbackEngine, playbackState } from '$lib/playback/engine';

  function decreaseSpeed() {
    playbackEngine.adjustWpm('down');
  }

  function increaseSpeed() {
    playbackEngine.adjustWpm('up');
  }

  $: wpm = $playbackState.wpm;
</script>

<div class="speed-controls">
  <button
    class="speed-btn decrease"
    on:click={decreaseSpeed}
    aria-label="Decrease reading speed"
  >
    -
  </button>

  <div class="wpm-display">
    <span class="wpm-value">{wpm}</span>
    <span class="wpm-label">WPM</span>
  </div>

  <button
    class="speed-btn increase"
    on:click={increaseSpeed}
    aria-label="Increase reading speed"
  >
    +
  </button>
</div>

<style>
  .speed-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .speed-btn {
    width: 44px;
    height: 44px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    background: transparent;
    color: white;
    font-size: 1.5rem;
    font-family: 'Lexend', sans-serif;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .speed-btn:hover {
    border-color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.1);
  }

  .speed-btn:active {
    transform: scale(0.95);
  }

  .wpm-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
  }

  .wpm-value {
    font-family: 'Lexend', sans-serif;
    font-size: 1.5rem;
    font-weight: 500;
    color: white;
  }

  .wpm-label {
    font-family: 'Lexend', sans-serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
