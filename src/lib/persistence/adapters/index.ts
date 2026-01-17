import { WebStorageAdapter } from './web';
import { TauriStorageAdapter } from './tauri';
import { CapacitorStorageAdapter } from './capacitor';
import type { StorageAdapter } from './types';

let adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (adapter) return adapter;

  const tauri = new TauriStorageAdapter();
  if (tauri.isAvailable()) {
    adapter = tauri;
    return adapter;
  }

  const capacitor = new CapacitorStorageAdapter();
  if (capacitor.isAvailable()) {
    adapter = capacitor;
    return adapter;
  }

  adapter = new WebStorageAdapter();
  return adapter;
}

export type { StorageAdapter };
export { WebStorageAdapter, TauriStorageAdapter, CapacitorStorageAdapter };
