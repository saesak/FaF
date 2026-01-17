import { getStorageAdapter } from './adapters';
import type { StorageAdapter } from './adapters';
import { STORAGE_KEYS, CURRENT_VERSION } from './types';

type MigrationFn = (adapter: StorageAdapter) => Promise<void>;

const migrations: Record<number, MigrationFn> = {
  1: async () => {},
};

export async function runMigrations(): Promise<void> {
  const adapter = getStorageAdapter();

  const storedVersion = await adapter.get<number>(STORAGE_KEYS.VERSION) ?? 0;

  if (storedVersion >= CURRENT_VERSION) {
    return;
  }

  console.log(`Migrating from v${storedVersion} to v${CURRENT_VERSION}`);

  for (let v = storedVersion + 1; v <= CURRENT_VERSION; v++) {
    const migrate = migrations[v];
    if (migrate) {
      console.log(`Running migration v${v}`);
      await migrate(adapter);
    }
  }

  await adapter.set(STORAGE_KEYS.VERSION, CURRENT_VERSION);
}
