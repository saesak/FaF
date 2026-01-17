import { getTauriStore, isTauriAvailable } from './store-instance';
import type { StorageAdapter } from './types';

export class TauriStorageAdapter implements StorageAdapter {
  isAvailable(): boolean {
    return isTauriAvailable();
  }

  async get<T>(key: string): Promise<T | null> {
    const store = await getTauriStore();
    return await store.get<T>(key) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const store = await getTauriStore();
    await store.set(key, value);
    await store.save();
  }

  async remove(key: string): Promise<void> {
    const store = await getTauriStore();
    await store.delete(key);
    await store.save();
  }

  async clear(): Promise<void> {
    const store = await getTauriStore();
    await store.clear();
    await store.save();
  }
}
