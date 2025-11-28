/**
 * MeshCentral File Downloader
 */

import type { DownloadRequest, FileTransferProgress } from './file-manager-types'

export interface DownloadTask {
  id: string
  remotePath: string
  fileName: string
  chunks: ArrayBuffer[]
  totalSize: number
  receivedSize: number
  status: 'pending' | 'requested' | 'negotiating' | 'downloading' | 'completed' | 'failed' | 'cancelled'
  error?: Error
}

export class FileDownloader {
  private downloads = new Map<string, DownloadTask>()
  private requestIdCounter = 0
  private onProgress?: (progress: FileTransferProgress) => void
  private sendMessage?: (data: string | ArrayBuffer) => boolean
  private activeDownloadId: string | null = null

  constructor(
    sendMessage?: (data: string | ArrayBuffer) => boolean,
    onProgress?: (progress: FileTransferProgress) => void
  ) {
    this.sendMessage = sendMessage
    this.onProgress = onProgress
  }

  setSendMessage(sendMessage: (data: string | ArrayBuffer) => boolean): void {
    this.sendMessage = sendMessage
  }

  setOnProgress(onProgress: (progress: FileTransferProgress) => void): void {
    this.onProgress = onProgress
  }

  private generateRequestId(): string {
    return `download-${Date.now()}-${++this.requestIdCounter}`
  }

  /**
   * Start file download (one transfer at a time per relay session)
   */
  downloadFile(remotePath: string, fileName?: string, fileSize?: number): string {
    if (this.activeDownloadId) {
      const activeTask = this.downloads.get(this.activeDownloadId)
      if (activeTask && ['requested', 'negotiating', 'downloading'].includes(activeTask.status)) {
        throw new Error('Another download is already in progress')
      }
    }

    const downloadId = this.generateRequestId()
    if (!fileName) {
      const pathParts = remotePath.split(/[\\/]/)
      fileName = pathParts[pathParts.length - 1] || 'download'
    }

    const task: DownloadTask = {
      id: downloadId,
      remotePath,
      fileName,
      chunks: [],
      totalSize: fileSize || 0,
      receivedSize: 0,
      status: 'requested'
    }

    this.downloads.set(downloadId, task)
    this.activeDownloadId = downloadId

    const downloadRequest: DownloadRequest = {
      action: 'download',
      sub: 'start',
      id: downloadId,
      path: remotePath
    }

    if (this.sendMessage) {
      this.sendMessage(JSON.stringify(downloadRequest))
      task.status = 'negotiating'
    }

    return downloadId
  }

  /**
   * Handle download control-channel messages (`action: 'download'`)
   */
  handleControlMessage(message: any): void {
    const downloadId = message.id
    if (!downloadId) return

    switch (message.sub) {
      case 'start':
        this.handleServerStart(downloadId, message)
        break
      case 'cancel':
        this.handleServerCancel(downloadId, message.reason)
        break
      case 'error':
        this.handleDownloadError(downloadId, message.error || 'Download failed')
        break
      default:
        break
    }
  }

  private handleServerStart(downloadId: string, payload: any): void {
    const task = this.downloads.get(downloadId)
    if (!task) return

    task.status = 'downloading'
    if (typeof payload.size === 'number') {
      task.totalSize = payload.size
    }
    if (typeof payload.name === 'string') {
      task.fileName = payload.name
    }

    if (this.sendMessage) {
      const ack: DownloadRequest = {
        action: 'download',
        sub: 'startack',
        id: downloadId,
        path: task.remotePath
      }
      this.sendMessage(JSON.stringify(ack))
    }
  }

  /**
   * Handle incoming binary data chunk
   */
  handleBinaryChunk(data: Uint8Array, isFinal: boolean): void {
    if (!this.activeDownloadId) return
    const task = this.downloads.get(this.activeDownloadId)
    if (!task || task.status !== 'downloading') return

    const chunkCopy = data.slice()
    task.chunks.push(chunkCopy.buffer)
    task.receivedSize += chunkCopy.byteLength

    if (!isFinal && this.sendMessage) {
      const ack: DownloadRequest = {
        action: 'download',
        sub: 'ack',
        id: task.id,
        path: task.remotePath
      }
      this.sendMessage(JSON.stringify(ack))
    }

    const progress: FileTransferProgress = {
      file: task.fileName,
      progress: task.totalSize > 0 ? Math.round((task.receivedSize / task.totalSize) * 100) : 0,
      bytesTransferred: task.receivedSize,
      totalBytes: task.totalSize
    }
    this.onProgress?.(progress)

    if (isFinal || (task.totalSize > 0 && task.receivedSize >= task.totalSize)) {
      this.completeDownload(task.id)
    }
  }

  private completeDownload(downloadId: string): void {
    const task = this.downloads.get(downloadId)
    if (!task) return

    task.status = 'completed'
    this.activeDownloadId = null

    const progress: FileTransferProgress = {
      file: task.fileName,
      progress: 100,
      bytesTransferred: task.receivedSize,
      totalBytes: task.totalSize
    }
    this.onProgress?.(progress)

    this.saveFile(downloadId)
    this.downloads.delete(downloadId)
  }

  getFileBlob(downloadId: string): Blob | null {
    const task = this.downloads.get(downloadId)
    if (!task || task.status !== 'completed') return null
    return new Blob(task.chunks)
  }

  saveFile(downloadId: string): void {
    const task = this.downloads.get(downloadId)
    if (!task || task.status !== 'completed') return

    const blob = this.getFileBlob(downloadId)
    if (!blob) return

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = task.fileName
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  cancelDownload(downloadId: string): void {
    const task = this.downloads.get(downloadId)
    if (!task) return

    task.status = 'cancelled'
    if (this.activeDownloadId === downloadId) {
      this.activeDownloadId = null
    }

    if (this.sendMessage) {
      const cancelMessage: DownloadRequest = {
        action: 'download',
        sub: 'cancel',
        id: downloadId,
        path: task.remotePath
      }
      this.sendMessage(JSON.stringify(cancelMessage))
    }

    this.downloads.delete(downloadId)
  }

  handleDownloadError(downloadId: string, error: string): void {
    const task = this.downloads.get(downloadId)
    if (!task) return

    task.status = 'failed'
    task.error = new Error(error)

    if (this.activeDownloadId === downloadId) {
      this.activeDownloadId = null
    }
  }

  private handleServerCancel(downloadId: string, reason?: string): void {
    const task = this.downloads.get(downloadId)
    if (!task) return
    task.status = 'cancelled'
    task.error = reason ? new Error(reason) : undefined

    if (this.activeDownloadId === downloadId) {
      this.activeDownloadId = null
    }

    this.downloads.delete(downloadId)
  }

  clearAll(): void {
    this.downloads.clear()
    this.activeDownloadId = null
  }
}