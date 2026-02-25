/**
 * MeshCentral File Downloader
 */

import type { DownloadRequest, FileTransferProgress } from './file-manager-types';

export interface DownloadTask {
  id: string;
  remotePath: string;
  fileName: string;
  chunks: Uint8Array[];
  totalSize: number;
  receivedSize: number;
  status: 'pending' | 'requested' | 'negotiating' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  error?: Error;
}

export class FileDownloader {
  private downloads = new Map<string, DownloadTask>();
  private requestIdCounter = 0;
  private onProgress?: (progress: FileTransferProgress) => void;
  private sendMessage?: (data: string | ArrayBuffer) => boolean;
  private activeDownloadId: string | null = null;
  private onServerCancel?: (fileName: string, reason?: string) => void;

  constructor(
    sendMessage?: (data: string | ArrayBuffer) => boolean,
    onProgress?: (progress: FileTransferProgress) => void,
    onServerCancel?: (fileName: string, reason?: string) => void,
  ) {
    this.sendMessage = sendMessage;
    this.onProgress = onProgress;
    this.onServerCancel = onServerCancel;
  }

  setSendMessage(sendMessage: (data: string | ArrayBuffer) => boolean): void {
    this.sendMessage = sendMessage;
  }

  setOnProgress(onProgress: (progress: FileTransferProgress) => void): void {
    this.onProgress = onProgress;
  }

  setOnServerCancel(onServerCancel: (fileName: string, reason?: string) => void): void {
    this.onServerCancel = onServerCancel;
  }

  hasActiveDownload(): boolean {
    return this.activeDownloadId !== null;
  }

  private generateRequestId(): string {
    return `download-${Date.now()}-${++this.requestIdCounter}`;
  }

  resetActiveDownload(): void {
    if (this.activeDownloadId) {
      const activeTask = this.downloads.get(this.activeDownloadId);
      if (activeTask) {
        if (['requested', 'negotiating', 'downloading'].includes(activeTask.status)) {
          activeTask.status = 'failed';
          activeTask.error = new Error('Download timeout or stuck');
        }
      }
      this.activeDownloadId = null;
    }
  }

  downloadFile(remotePath: string, fileName?: string, fileSize?: number): string {
    if (this.activeDownloadId) {
      const activeTask = this.downloads.get(this.activeDownloadId);
      if (activeTask && ['requested', 'negotiating', 'downloading'].includes(activeTask.status)) {
        this.resetActiveDownload();
      }
    }

    const downloadId = this.generateRequestId();
    const resolvedFileName = fileName || remotePath.split(/[\\/]/).pop() || 'download';

    const task: DownloadTask = {
      id: downloadId,
      remotePath,
      fileName: resolvedFileName,
      chunks: [],
      totalSize: fileSize || 0,
      receivedSize: 0,
      status: 'requested',
    };

    this.downloads.set(downloadId, task);
    this.activeDownloadId = downloadId;

    const downloadRequest: DownloadRequest = {
      action: 'download',
      sub: 'start',
      id: downloadId,
      path: remotePath,
    };

    if (this.sendMessage) {
      this.sendMessage(JSON.stringify(downloadRequest));
      task.status = 'negotiating';
    } else {
      task.status = 'failed';
      task.error = new Error('No connection available');
      this.activeDownloadId = null;
      throw new Error('Cannot send download request - no connection');
    }

    return downloadId;
  }

  handleControlMessage(message: any): void {
    const downloadId = message.id;
    if (!downloadId) return;

    switch (message.sub) {
      case 'start':
        this.handleServerStart(downloadId, message);
        break;
      case 'cancel':
        this.handleServerCancel(downloadId, message.reason);
        break;
      case 'error':
        this.handleDownloadError(downloadId, message.error || 'Download failed');
        break;
      default:
        break;
    }
  }

  private handleServerStart(downloadId: string, payload: any): void {
    const task = this.downloads.get(downloadId);
    if (!task) return;

    task.status = 'downloading';
    if (typeof payload.size === 'number') {
      task.totalSize = payload.size;
    }
    if (typeof payload.name === 'string') {
      task.fileName = payload.name;
    }

    if (this.sendMessage) {
      const ack: DownloadRequest = {
        action: 'download',
        sub: 'startack',
        id: downloadId,
        path: task.remotePath,
      };
      this.sendMessage(JSON.stringify(ack));
    }
  }

  handleBinaryChunk(data: Uint8Array, isFinal: boolean): void {
    if (!this.activeDownloadId) return;

    const task = this.downloads.get(this.activeDownloadId);
    if (!task || task.status !== 'downloading') return;

    // MeshCentral Protocol: First 4 bytes are a big-endian integer with bit 0 indicating final chunk
    if (data.byteLength < 4) return;

    // Read the 4-byte header (big-endian)
    const headerView = new DataView(data.buffer, data.byteOffset, 4);
    const flags = headerView.getUint32(0, false);
    const isLastChunk = (flags & 1) !== 0;

    const fileData = data.slice(4);
    const chunkCopy = new Uint8Array(fileData.length);
    chunkCopy.set(fileData);
    task.chunks.push(chunkCopy);
    task.receivedSize += chunkCopy.byteLength;

    if (!isLastChunk && this.sendMessage) {
      const ack: DownloadRequest = {
        action: 'download',
        sub: 'ack',
        id: task.id,
        path: task.remotePath,
      };
      this.sendMessage(JSON.stringify(ack));
    }

    const progress: FileTransferProgress = {
      file: task.fileName,
      progress: task.totalSize > 0 ? Math.round((task.receivedSize / task.totalSize) * 100) : 0,
      bytesTransferred: task.receivedSize,
      totalBytes: task.totalSize,
      type: 'download',
    };
    this.onProgress?.(progress);

    if (isLastChunk) {
      this.completeDownload(task.id);
    }
  }

  private completeDownload(downloadId: string): void {
    const task = this.downloads.get(downloadId);
    if (!task) return;

    task.status = 'completed';
    this.activeDownloadId = null;

    const progress: FileTransferProgress = {
      file: task.fileName,
      progress: 100,
      bytesTransferred: task.receivedSize,
      totalBytes: task.totalSize,
      type: 'download',
    };
    this.onProgress?.(progress);

    this.saveFile(downloadId);
    this.downloads.delete(downloadId);
  }

  getFileBlob(downloadId: string): Blob | null {
    const task = this.downloads.get(downloadId);
    if (!task || task.status !== 'completed') return null;

    if (task.chunks.length === 0) return null;

    try {
      const blob = new Blob(task.chunks as any[]);

      const reader = new FileReader();
      reader.readAsArrayBuffer(blob.slice(0, 10));

      return blob;
    } catch (_error) {
      return null;
    }
  }

  saveFile(downloadId: string): void {
    const task = this.downloads.get(downloadId);
    if (!task || task.status !== 'completed') return;

    const blob = this.getFileBlob(downloadId);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = task.fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  cancelDownload(downloadId: string): void {
    const task = this.downloads.get(downloadId);
    if (!task) return;

    task.status = 'cancelled';
    if (this.activeDownloadId === downloadId) {
      this.activeDownloadId = null;
    }

    if (this.sendMessage) {
      const cancelMessage: DownloadRequest = {
        action: 'download',
        sub: 'cancel',
        id: downloadId,
        path: task.remotePath,
      };
      this.sendMessage(JSON.stringify(cancelMessage));
    }

    this.downloads.delete(downloadId);
  }

  handleDownloadError(downloadId: string, error: string): void {
    const task = this.downloads.get(downloadId);
    if (!task) return;

    task.status = 'failed';
    task.error = new Error(error);

    if (this.activeDownloadId === downloadId) {
      this.activeDownloadId = null;
    }
  }

  private handleServerCancel(downloadId: string, reason?: string): void {
    const task = this.downloads.get(downloadId);
    if (!task) return;
    task.status = 'cancelled';
    task.error = reason ? new Error(reason) : undefined;

    if (this.onServerCancel) {
      this.onServerCancel(task.fileName, reason);
    }

    if (this.activeDownloadId === downloadId) {
      this.activeDownloadId = null;
    }

    this.downloads.delete(downloadId);
  }

  clearAll(): void {
    this.downloads.clear();
    this.activeDownloadId = null;
  }
}
