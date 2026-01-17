import { isTauriAvailable } from './adapters/store-instance';

export async function setupAppCloseHandler(
  onClose: () => Promise<void>
): Promise<void> {
  if (!isTauriAvailable()) {
    return;
  }

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();

  await win.onCloseRequested(async (event) => {
    await onClose();
  });
}
