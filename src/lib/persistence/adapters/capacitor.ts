import type { StorageAdapter } from './types';
import { STORAGE_KEYS } from '../types';

export class CapacitorStorageAdapter implements StorageAdapter {
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'Capacitor' in window;
  }

  async get<T>(key: string): Promise<T | null> {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({
      key,
      value: JSON.stringify(value),
    });
  }

  async remove(key: string): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  }

  async clear(): Promise<void> {
    const { Preferences } = await import('@capacitor/preferences');
    for (const key of Object.values(STORAGE_KEYS)) {
      await Preferences.remove({ key });
    }
  }
}
