/**
 * Generate a unique identifier for a file.
 * - For desktop (Tauri): Use full file path
 * - For web: Use hash of name + size
 */
export function generateFileId(
  path: string | null,
  name: string,
  size: number
): string {
  if (path) {
    return path;
  }
  return `web:${name}:${size}`;
}

/**
 * For pasted text (no file)
 */
export function generatePasteId(content: string): string {
  const preview = content.slice(0, 50).replace(/\s+/g, '_');
  return `paste:${preview}:${content.length}`;
}
