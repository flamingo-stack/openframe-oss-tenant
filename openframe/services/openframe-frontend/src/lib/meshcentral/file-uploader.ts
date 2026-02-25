/**
 * MeshCentral File Uploader
 */

import type { FileTransferProgress, UploadRequest } from './file-manager-types';

export interface UploadTask {
  id: string;
  file: File;
  remotePath: string;
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  nextOffset: number;
  pendingBytes: number;
  status: 'pending' | 'hashing' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  hash?: string;
  error?: Error;
  append?: boolean;
}

export class FileUploader {
  private uploads = new Map<string, UploadTask>();
  private requestIdCounter = 0;
  private chunkSize = 64 * 1024;
  private onProgress?: (progress: FileTransferProgress) => void;
  private sendMessage?: (data: string | ArrayBuffer) => boolean;

  constructor(
    sendMessage?: (data: string | ArrayBuffer) => boolean,
    onProgress?: (progress: FileTransferProgress) => void,
  ) {
    this.sendMessage = sendMessage;
    this.onProgress = onProgress;
  }

  setSendMessage(sendMessage: (data: string | ArrayBuffer) => boolean): void {
    this.sendMessage = sendMessage;
  }

  setOnProgress(onProgress: (progress: FileTransferProgress) => void): void {
    this.onProgress = onProgress;
  }

  private generateRequestId(): string {
    return `upload-${Date.now()}-${++this.requestIdCounter}`;
  }

  private reportProgress(task: UploadTask): void {
    const progress: FileTransferProgress = {
      file: task.fileName,
      progress: Math.round((task.bytesUploaded / task.totalBytes) * 100),
      bytesTransferred: task.bytesUploaded,
      totalBytes: task.totalBytes,
      type: 'upload',
    };
    this.onProgress?.(progress);
  }

  async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-384', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async uploadFile(file: File, remotePath: string, checkHash = true): Promise<string> {
    const uploadId = this.generateRequestId();

    const task: UploadTask = {
      id: uploadId,
      file,
      remotePath,
      fileName: file.name,
      bytesUploaded: 0,
      totalBytes: file.size,
      nextOffset: 0,
      pendingBytes: 0,
      status: 'pending',
    };

    this.uploads.set(uploadId, task);

    try {
      if (checkHash && file.size <= 100 * 1024 * 1024) {
        task.status = 'hashing';
        task.hash = await this.calculateFileHash(file);

        const hashRequest: UploadRequest = {
          action: 'uploadhash',
          reqid: uploadId,
          path: remotePath,
          name: file.name,
          tag: {
            h: task.hash,
            s: file.size,
            skip: true,
          },
        };

        this.sendMessage?.(JSON.stringify(hashRequest));
      } else {
        this.beginUpload(uploadId);
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error : new Error('Upload failed');
      throw task.error;
    }

    return uploadId;
  }

  private beginUpload(uploadId: string, append = false, resumeOffset = 0): void {
    const task = this.uploads.get(uploadId);
    if (!task) return;

    task.status = 'uploading';
    task.append = append;
    task.nextOffset = resumeOffset;
    task.bytesUploaded = resumeOffset;

    const request: UploadRequest = {
      action: 'upload',
      reqid: uploadId,
      path: task.remotePath,
      name: task.fileName,
      size: task.totalBytes,
      append,
    };

    this.sendMessage?.(JSON.stringify(request));
  }

  handleUploadStart(uploadId: string, offset = 0): void {
    const task = this.uploads.get(uploadId);
    if (!task) return;

    task.status = 'uploading';
    task.nextOffset = offset;
    task.bytesUploaded = offset;
    this.sendNextChunk(uploadId);
  }

  handleUploadAck(uploadId: string, confirmedOffset?: number): void {
    const task = this.uploads.get(uploadId);
    if (!task || task.status !== 'uploading') return;

    if (typeof confirmedOffset === 'number') {
      task.bytesUploaded = confirmedOffset;
    } else if (task.pendingBytes > 0) {
      task.bytesUploaded += task.pendingBytes;
    }

    task.pendingBytes = 0;
    this.reportProgress(task);

    if (task.bytesUploaded >= task.totalBytes) {
      this.finishUpload(uploadId);
    } else {
      this.sendNextChunk(uploadId);
    }
  }

  handleHashResponse(uploadId: string, exists: boolean, resumeOffset?: number): void {
    const task = this.uploads.get(uploadId);
    if (!task) return;

    if (exists) {
      task.bytesUploaded = task.totalBytes;
      task.status = 'completed';
      this.reportProgress(task);
    } else {
      this.beginUpload(uploadId, !!resumeOffset, resumeOffset || 0);
    }
  }

  handleUploadDone(uploadId: string): void {
    const task = this.uploads.get(uploadId);
    if (!task) return;

    task.status = 'completed';
    this.reportProgress(task);
  }

  handleUploadError(uploadId: string, error: string): void {
    const task = this.uploads.get(uploadId);
    if (!task) return;

    task.status = 'failed';
    task.error = new Error(error);
  }

  hasActiveUpload(): boolean {
    for (const task of this.uploads.values()) {
      if (task.status === 'uploading' || task.status === 'hashing') {
        return true;
      }
    }
    return false;
  }

  getActiveUploadId(): string | null {
    for (const [id, task] of this.uploads.entries()) {
      if (task.status === 'uploading' || task.status === 'hashing') {
        return id;
      }
    }
    return null;
  }

  cancelUpload(uploadId: string): void {
    const task = this.uploads.get(uploadId);
    if (!task) return;

    task.status = 'cancelled';
    this.uploads.delete(uploadId);
  }

  private async sendNextChunk(uploadId: string): Promise<void> {
    const task = this.uploads.get(uploadId);
    if (!task || task.status !== 'uploading') return;
    if (task.nextOffset >= task.totalBytes) {
      this.finishUpload(uploadId);
      return;
    }

    const start = task.nextOffset;
    const end = Math.min(start + this.chunkSize, task.totalBytes);
    const slice = task.file.slice(start, end);
    const buffer = new Uint8Array(await slice.arrayBuffer());
    const payload = this.prepareChunkPayload(buffer);

    const sent = this.sendMessage?.(payload);
    if (!sent) {
      await new Promise(resolve => setTimeout(resolve, 25));
      return this.sendNextChunk(uploadId);
    }

    task.pendingBytes = end - start;
    task.nextOffset = end;
  }

  private prepareChunkPayload(chunk: Uint8Array): ArrayBuffer {
    if (chunk.length === 0) return chunk.buffer as ArrayBuffer;

    if (chunk[0] === 0x00 || chunk[0] === 0x7b) {
      const prefixed = new Uint8Array(chunk.length + 1);
      prefixed.set([0]);
      prefixed.set(chunk, 1);
      return prefixed.buffer;
    }

    return chunk.buffer as ArrayBuffer;
  }

  private finishUpload(uploadId: string): void {
    const task = this.uploads.get(uploadId);
    if (!task || task.status !== 'uploading') return;

    if (this.sendMessage) {
      this.sendMessage(JSON.stringify({ action: 'uploaddone', reqid: uploadId }));
    }
  }

  getUpload(uploadId: string): UploadTask | undefined {
    return this.uploads.get(uploadId);
  }

  getAllUploads(): UploadTask[] {
    return Array.from(this.uploads.values());
  }

  clearCompleted(): void {
    for (const [id, task] of this.uploads) {
      if (task.status === 'completed' || task.status === 'cancelled') {
        this.uploads.delete(id);
      }
    }
  }

  clearAll(): void {
    this.uploads.clear();
  }
}
