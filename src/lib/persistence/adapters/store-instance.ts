import type { Store } from '@tauri-apps/plugin-store';

const STORE_FILE = 'faf-settings.json';

let storeInstance: Store | null = null;
let storePromise: Promise<Store> | null = null;

export async function getTauriStore(): Promise<Store> {
  if (storeInstance) {
    return storeInstance;
  }

  if (storePromise) {
    return storePromise;
  }

  const { Store } = await import('@tauri-apps/plugin-store');
  storePromise = Store.load(STORE_FILE);

  try {
    storeInstance = await storePromise;
    return storeInstance;
  } finally {
    storePromise = null;
  }
}

export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}
