import { runMigrations } from './migrations';
import { settingsStore } from '../stores/settings';
import { positionStore } from '../stores/position';
import { recentFilesStore } from '../stores/recentFiles';
import { windowStateStore } from '../stores/windowState';

let initialized = false;

export interface InitResult {
  success: boolean;
  errors: Array<{ store: string; error: Error }>;
}

/**
 * Initialize all persistence systems.
 * Call this once at app startup.
 */
export async function initPersistence(): Promise<InitResult> {
  if (initialized) {
    return { success: true, errors: [] };
  }

  const errors: InitResult['errors'] = [];

  // Run migrations first
  try {
    await runMigrations();
  } catch (error) {
    console.error('Migration failed, continuing with existing data:', error);
    errors.push({ store: 'migrations', error: error as Error });
  }

  // Initialize all stores with individual error handling
  const storeInits = [
    { name: 'settings', init: () => settingsStore.init() },
    { name: 'position', init: () => positionStore.init() },
    { name: 'recentFiles', init: () => recentFilesStore.init() },
    { name: 'windowState', init: () => windowStateStore.init() },
  ];

  const results = await Promise.allSettled(
    storeInits.map(async ({ name, init }) => {
      try {
        await init();
        return { name, success: true };
      } catch (error) {
        console.error(`Failed to initialize ${name} store:`, error);
        errors.push({ store: name, error: error as Error });
        return { name, success: false };
      }
    })
  );

  const successCount = results.filter(
    r => r.status === 'fulfilled' && r.value.success
  ).length;

  initialized = true;

  return {
    success: successCount > 0,
    errors,
  };
}

export function resetPersistence(): void {
  initialized = false;
}
