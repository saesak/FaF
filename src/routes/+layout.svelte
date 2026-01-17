<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import favicon from '$lib/assets/favicon.svg';
  import { applyColorsToDocument } from '$lib/theme/colors';
  import { settingsStore } from '$lib/stores/settings';
  import { recentFilesStore } from '$lib/stores/recentFiles';
  import { positionStore } from '$lib/stores/position';
  import { playbackEngine, hasDocument, isPaused } from '$lib/playback';
  import { viewSync } from '$lib/view/viewSync';
  import { viewStore, activeView } from '$lib/stores/viewStore';
  import { createInputDispatcher, type InputDispatcher } from '$lib/input';
  import '../app.css';

  let { children } = $props();
  let initialized = $state(false);
  let unsubSettings: (() => void) | null = null;
  let inputDispatcher: InputDispatcher | null = null;
  let appContainer: HTMLElement | undefined = $state();

  onMount(() => {
    const init = async () => {
      // Initialize stores
      await settingsStore.init();
      await recentFilesStore.init();
      await positionStore.init();

      // Initialize playback engine
      playbackEngine.init();

      // Initialize view sync
      viewSync.initialize();

      // Apply initial theme colors from settings
      unsubSettings = settingsStore.subscribe(settings => {
        applyColorsToDocument({
          background: settings.colors.background,
          word: settings.colors.word,
          orp: settings.colors.focusLetter,
        });
      });

      initialized = true;

      // Initialize input system after DOM is ready
      requestAnimationFrame(() => {
        if (appContainer) {
          inputDispatcher = createInputDispatcher();
          inputDispatcher.initialize({
            mainElement: appContainer,
            hasDocument: () => get(hasDocument),
            isPaused: () => get(isPaused),
            isInSpeedView: () => get(activeView) === 'speed',
          });

          inputDispatcher.onAction((action) => {
            switch (action.type) {
              case 'TOGGLE_PLAYBACK':
                playbackEngine.toggle();
                break;
              case 'PLAY':
                playbackEngine.play();
                break;
              case 'PAUSE':
                playbackEngine.pause();
                break;
              case 'SKIP_FORWARD':
                playbackEngine.skipForward();
                break;
              case 'SKIP_BACKWARD':
                playbackEngine.skipBackward();
                break;
              case 'ADJUST_WPM':
                playbackEngine.adjustWpm(action.direction);
                break;
              case 'TOGGLE_VIEW':
                viewSync.toggleView();
                break;
            }
          });
        }
      });
    };

    init();

    return () => {
      unsubSettings?.();
      inputDispatcher?.destroy();
      playbackEngine.destroy();
      viewSync.destroy();
    };
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>FaF - Fast as Fuck Speed Reader</title>
  <meta name="description" content="RSVP speed reading app that displays one word at a time" />
</svelte:head>

{#if initialized}
  <div class="app-container" bind:this={appContainer}>
    {@render children()}
  </div>
{:else}
  <div class="app-container" style="background-color: #38393d;"></div>
{/if}

<style>
  .app-container {
    width: 100%;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
</style>
