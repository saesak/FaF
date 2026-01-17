import type { InputAction, FileInputError } from './types';

export interface FileHandler {
  enableDragDrop(element: HTMLElement): void;
  disableDragDrop(): void;
  enablePaste(): void;
  disablePaste(): void;
  openFilePicker(): Promise<void>;
  onAction(callback: (action: InputAction) => void): () => void;
  onError(callback: (error: FileInputError) => void): () => void;
  destroy(): void;
}

interface FileConfig {
  maxSize: number;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
}

const DEFAULT_CONFIG: FileConfig = {
  maxSize: 52428800,
  allowedExtensions: ['.txt', '.epub', '.pdf'],
  allowedMimeTypes: ['text/plain', 'application/epub+zip', 'application/pdf'],
};

class FileHandlerImpl implements FileHandler {
  private config: FileConfig;
  private dropElement: HTMLElement | null = null;
  private actionCallbacks: Set<(action: InputAction) => void> = new Set();
  private errorCallbacks: Set<(error: FileInputError) => void> = new Set();
  private fileInput: HTMLInputElement | null = null;

  private boundDragOver: (e: DragEvent) => void;
  private boundDragEnter: (e: DragEvent) => void;
  private boundDragLeave: (e: DragEvent) => void;
  private boundDrop: (e: DragEvent) => void;
  private boundPaste: (e: ClipboardEvent) => void;

  constructor(config: Partial<FileConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.boundDragOver = this.handleDragOver.bind(this);
    this.boundDragEnter = this.handleDragEnter.bind(this);
    this.boundDragLeave = this.handleDragLeave.bind(this);
    this.boundDrop = this.handleDrop.bind(this);
    this.boundPaste = this.handlePaste.bind(this);
  }

  enableDragDrop(element: HTMLElement): void {
    if (this.dropElement) {
      this.disableDragDrop();
    }

    this.dropElement = element;

    element.addEventListener('dragover', this.boundDragOver);
    element.addEventListener('dragenter', this.boundDragEnter);
    element.addEventListener('dragleave', this.boundDragLeave);
    element.addEventListener('drop', this.boundDrop);
  }

  disableDragDrop(): void {
    if (!this.dropElement) return;

    this.dropElement.removeEventListener('dragover', this.boundDragOver);
    this.dropElement.removeEventListener('dragenter', this.boundDragEnter);
    this.dropElement.removeEventListener('dragleave', this.boundDragLeave);
    this.dropElement.removeEventListener('drop', this.boundDrop);

    this.dropElement = null;
  }

  enablePaste(): void {
    document.addEventListener('paste', this.boundPaste);
  }

  disablePaste(): void {
    document.removeEventListener('paste', this.boundPaste);
  }

  async openFilePicker(): Promise<void> {
    if (!this.fileInput) {
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.accept = this.config.allowedExtensions.join(',');
      this.fileInput.style.display = 'none';
      document.body.appendChild(this.fileInput);
    }

    return new Promise((resolve, reject) => {
      if (!this.fileInput) {
        reject(new Error('File input not available'));
        return;
      }

      const handleChange = (e: Event) => {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];

        if (file) {
          this.processFile(file);
          resolve();
        } else {
          reject(new Error('No file selected'));
        }

        input.value = '';
      };

      const handleCancel = () => {
        reject(new Error('File picker cancelled'));
      };

      this.fileInput.addEventListener('change', handleChange, { once: true });
      this.fileInput.addEventListener('cancel', handleCancel, { once: true });

      this.fileInput.click();
    });
  }

  onAction(callback: (action: InputAction) => void): () => void {
    this.actionCallbacks.add(callback);
    return () => this.actionCallbacks.delete(callback);
  }

  onError(callback: (error: FileInputError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  destroy(): void {
    this.disableDragDrop();
    this.disablePaste();

    if (this.fileInput) {
      this.fileInput.remove();
      this.fileInput = null;
    }

    this.actionCallbacks.clear();
    this.errorCallbacks.clear();
  }

  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  private handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dropElement?.classList.add('drag-over');
  }

  private handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dropElement?.classList.remove('drag-over');
  }

  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.dropElement?.classList.remove('drag-over');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  private handlePaste(event: ClipboardEvent): void {
    const target = event.target as HTMLElement;
    if (this.isInputElement(target)) {
      return;
    }

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const files = clipboardData.files;
    if (files.length > 0) {
      event.preventDefault();
      this.processFile(files[0]);
      return;
    }

    const text = clipboardData.getData('text/plain');
    if (text && text.trim().length > 0) {
      event.preventDefault();
      this.processText(text);
    }
  }

  private isInputElement(target: HTMLElement | null): boolean {
    if (!target) return false;

    const tagName = target.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target.isContentEditable
    );
  }

  private processFile(file: File): void {
    if (file.size > this.config.maxSize) {
      this.emitError({
        type: 'SIZE_EXCEEDED',
        message: `File exceeds maximum size of ${this.formatSize(this.config.maxSize)}`,
        file,
      });
      return;
    }

    const extension = this.getExtension(file.name);
    const isValidExtension = this.config.allowedExtensions.includes(extension);
    const isValidMime = this.config.allowedMimeTypes.includes(file.type);

    if (!isValidExtension && !isValidMime) {
      this.emitError({
        type: 'UNSUPPORTED_FORMAT',
        message: `Unsupported file format. Allowed: ${this.config.allowedExtensions.join(', ')}`,
        file,
      });
      return;
    }

    this.dispatch({ type: 'LOAD_FILE', file });
  }

  private processText(text: string): void {
    if (text.trim().length === 0) {
      return;
    }

    const estimatedSize = text.length * 2;
    if (estimatedSize > this.config.maxSize) {
      this.emitError({
        type: 'SIZE_EXCEEDED',
        message: `Pasted text exceeds maximum size of ${this.formatSize(this.config.maxSize)}`,
      });
      return;
    }

    this.dispatch({ type: 'LOAD_TEXT', text });
  }

  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot).toLowerCase();
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1048576) {
      return `${Math.round(bytes / 1048576)} MB`;
    }
    if (bytes >= 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${bytes} bytes`;
  }

  private dispatch(action: InputAction): void {
    for (const callback of this.actionCallbacks) {
      callback(action);
    }
  }

  private emitError(error: FileInputError): void {
    for (const callback of this.errorCallbacks) {
      callback(error);
    }
  }
}

export function createFileHandler(config?: Partial<FileConfig>): FileHandler {
  return new FileHandlerImpl(config);
}
