<script lang="ts">
  import ViewContainer from '$lib/components/views/ViewContainer.svelte';
  import { documentStore } from '$lib/stores/document';
  import { recentFilesStore } from '$lib/stores/recentFiles';
  import { parseInput } from '$lib/parser';
  import { generateFileId } from '$lib/persistence/fileId';
  import type { RecentFile } from '$lib/persistence/types';

  async function handleLoadFile(file: File) {
    documentStore.setLoading();

    try {
      const result = await parseInput(file);

      if (!result.success) {
        documentStore.setError(result.error);
        return;
      }

      const doc = result.document;
      documentStore.setDocument(doc);

      // Add to recent files
      const fileId = generateFileId(null, file.name, file.size);
      await recentFilesStore.addFile({
        id: fileId,
        name: doc.metadata.title || file.name,
        path: null,
        type: doc.metadata.fileType as 'txt' | 'epub' | 'pdf',
        size: file.size,
        position: { wordIndex: 0, paragraphIndex: 0, lastAccessed: Date.now() },
        totalWords: doc.words.length,
      });
    } catch (err) {
      documentStore.setError({
        type: 'unknown',
        message: err instanceof Error ? err.message : 'Failed to parse file',
      });
    }
  }

  async function handleLoadRecentFile(recentFile: RecentFile) {
    // For recent files without a path (paste or web-only), we can't reload
    // In a real app with Tauri/Capacitor, we'd read from the path
    if (!recentFile.path) {
      documentStore.setError({
        type: 'unknown',
        message: 'This file can only be opened by selecting it again.',
      });
      return;
    }
  }
</script>

<ViewContainer onLoadFile={handleLoadFile} onLoadRecentFile={handleLoadRecentFile} />
