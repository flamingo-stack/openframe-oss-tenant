/**
 * MeshCentral File Manager
 * Main integration class for file operations
 */

import { FileOperations } from './file-operations'
import { FileUploader, type UploadTask } from './file-uploader'
import { FileDownloader, type DownloadTask } from './file-downloader'
import { FileBinaryProtocol } from './file-binary-protocol'
import { FileErrorHandler, type FileError } from './file-error-handler'
import type { MeshControlClient } from './meshcentral-control'
import { MeshTunnel, type TunnelState } from './meshcentral-tunnel'
import type {
  FileConnectionState,
  FileEntry,
  FileManagerOptions,
  DirectoryListing,
  FileTransferProgress,
  FileOperationResponse
} from './file-manager-types'

export class MeshCentralFileManager {
  private tunnel: MeshTunnel | null = null
  private fileOps: FileOperations
  private uploader: FileUploader
  private downloader: FileDownloader
  private binaryProtocol: FileBinaryProtocol
  private errorHandler: FileErrorHandler
  private optionsSent = false
  private initialDirectoryRequested = false
  
  private state: FileConnectionState = 'disconnected'
  private currentPath = ''
  private currentFiles: FileEntry[] = []
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: any }>()
  private loadingPath: string | null = null // Track currently loading path to prevent duplicates
  
  private options: FileManagerOptions
  private isRemote: boolean
  private nodeId?: string
  private authCookie?: string
  private relayCookie?: string
  private controlClient?: MeshControlClient

  constructor(options: FileManagerOptions = {}) {
    this.options = options
    this.isRemote = options.isRemote || false
    this.nodeId = options.nodeId
    this.authCookie = options.authCookie
    this.controlClient = options.controlClient

    // Initialize components
    this.fileOps = new FileOperations()
    this.binaryProtocol = new FileBinaryProtocol()
    
    // Initialize error handler
    this.errorHandler = new FileErrorHandler((error) => {
      this.options.onError?.(new Error(error.message))
    })

    // Initialize uploader and downloader with send function
    const sendMessage = (data: string | ArrayBuffer): boolean => {
      return this.sendData(data)
    }

    this.uploader = new FileUploader(sendMessage, (progress) => {
      this.options.onTransferProgress?.(progress)
    })

    this.downloader = new FileDownloader(sendMessage, (progress) => {
      this.options.onTransferProgress?.(progress)
    })
  }

  /**
   * Connect to file system (server or remote)
   */
  async connect(): Promise<void> {
    if (this.isRemote) {
      await this.ensureRemoteSession()
      await this.startRemoteTunnel()
      return
    }

    throw new Error('Server file access not implemented. Please use remote file access.')
  }

  private async ensureRemoteSession(): Promise<void> {
    if (!this.isRemote) return
    if (!this.controlClient) {
      throw new Error('MeshControlClient is required for remote file access')
    }
    await this.controlClient.openSession()
    const cookies = await this.controlClient.getAuthCookies()
    this.authCookie = cookies.authCookie
    this.relayCookie = cookies.relayCookie
  }

  private normalizeRequestedPath(path: string): string {
    if (!path || path === '/') return ''
    
    // Normalize Windows paths: ensure consistent format
    // Convert /C: style to C:\ style for Windows drives
    if (path.match(/^\/[A-Za-z]:$/)) {
      return path.substring(1) + '\\'
    }
    
    // If it's already a Windows drive path (C:\), keep it as is
    if (path.match(/^[A-Za-z]:\\?/)) {
      return path.endsWith('\\') ? path : path + '\\'
    }
    
    return path
  }

  private async startRemoteTunnel(): Promise<void> {
    if (!this.nodeId) throw new Error('Node ID is required for remote file access')
    if (!this.authCookie) throw new Error('Missing MeshCentral auth cookie')
    if (!this.controlClient) throw new Error('MeshControlClient unavailable')

    this.initialDirectoryRequested = false
    this.optionsSent = false

    if (this.tunnel) {
      this.tunnel.stop()
      this.tunnel = null
    }

    // Ensure control session is ready BEFORE creating the tunnel
    try {
      await this.controlClient.openSession()
    } catch (error) {
      console.error('[FileManager] Failed to open control session:', error)
      throw error
    }

    this.tunnel = new MeshTunnel({
      authCookie: this.authCookie,
      nodeId: this.nodeId,
      protocol: 5,
      onData: (data) => {
        if (typeof data === 'string') {
          this.handleJsonMessage(data)
        } else {
          // data is Uint8Array from tunnel
          this.handleBinaryMessage(data)
        }
      },
      onBinaryData: (bytes) => {
        // bytes is Uint8Array from tunnel
        this.handleBinaryMessage(bytes)
      },
      onCtrlMessage: (msg) => this.handleCtrlChannelMessage(msg),
      onConsoleMessage: (msg) => console.log('[FileManager][Console]', msg),
      onRequestPairing: async (relayId) => {
        try {
          // Control session should already be open, but check again
          if (!this.controlClient?.isConnected()) {
            await this.controlClient?.openSession()
          }
          if (this.nodeId && this.controlClient) {
            this.controlClient.sendFileTunnel(this.nodeId, relayId)
          }
        } catch (error) {
          console.error('[FileManager] Error pairing file tunnel:', error)
        }
      },
      onStateChange: (state) => this.handleTunnelStateChange(state)
    })

    this.tunnel.start()
  }

  private handleTunnelStateChange(tunnelState: TunnelState): void {
    switch (tunnelState) {
      case 0:
        this.optionsSent = false
        this.initialDirectoryRequested = false
        this.loadingPath = null // Clear loading state on disconnect
        this.setState('disconnected')
        break
      case 1:
        this.setState('connecting')
        break
      case 2:
        this.optionsSent = false
        this.setState('connected_to_server')
        this.sendRelayOptions()
        break
      case 3: {
        const wasConnected = this.state === 'connected_end_to_end'
        this.setState('connected_end_to_end')
        if (!wasConnected && !this.initialDirectoryRequested) {
          this.initialDirectoryRequested = true
          // For Windows systems, start with empty path to show drive list
          this.loadDirectory(this.currentPath || '').catch(error => {
            console.error('[FileManager] Initial load failed:', error)
          })
        }
        break
      }
      default:
        break
    }
  }

  /**
   * Set connection state
   */
  private setState(newState: FileConnectionState): void {
    if (this.state !== newState) {
      this.state = newState
      this.options.onStateChange?.(newState)
    }
  }

  /**
   * Handle JSON messages
   */
  private handleJsonMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      
      console.log('[FileManager] Received message:', { 
        action: message.action, 
        error: message.error,
        result: message.result
      })
      
      if (message.ctrlChannel === 102938) {
        this.handleCtrlChannelMessage(message)
        return
      }

      switch (message.action) {
        case 'ls':
          this.handleDirectoryListing(message as DirectoryListing)
          break

        case 'download':
          this.handleDownloadMessage(message)
          break

        case 'uploadstart':
          this.uploader.handleUploadStart(message.reqid, message.nextofs || message.position || 0)
          break

        case 'uploadack':
          this.uploader.handleUploadAck(message.reqid, message.nextofs || message.position)
          break

        case 'uploadhash':
          this.uploader.handleHashResponse(message.reqid, !!message.exists, message.nextofs || message.offset)
          break

        case 'uploaddone':
          this.uploader.handleUploadDone(message.reqid)
          this.loadDirectory(this.currentPath || '')
          break

        case 'uploaderror':
          this.uploader.handleUploadError(message.reqid, message.error || 'Upload failed')
          break

        case 'dialogmessage':
          this.handleDialogMessage(message)
          break

        case 'error':
          this.handleErrorMessage(message)
          break

        case 'connected':
        case 'state':
          if (message.state === 3 || message.connected === true) {
            this.setState('connected_end_to_end')
            this.loadDirectory(this.currentPath || '')
          }
          break

        default:
          this.handleOperationResponse(message)
      }
    } catch (error) {
      console.error('Error parsing JSON message:', error)
    }
  }

  /**
   * Handle binary messages
   */
  private handleBinaryMessage(data: ArrayBuffer | Uint8Array): void {
    // First, try to decode the raw binary as JSON (for direct JSON responses)
    try {
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data
      const textDecoder = new TextDecoder('utf-8')
      const text = textDecoder.decode(bytes)
      
      // Check if it's JSON by trying to parse it
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const json = JSON.parse(text)
          console.log('[FileManager] Parsed JSON from raw binary:', {
            action: json.action,
            hasDir: json.dir !== undefined,
            reqid: json.reqid,
            path: json.path
          })
          
          // If it's a directory listing response, handle it
          if (json.dir !== undefined || json.action === 'ls') {
            // Make sure we have the directory data
            if (json.dir !== undefined) {
              this.handleDirectoryListing(json as DirectoryListing)
            }
            return
          }
          // Otherwise handle as regular JSON message
          this.handleJsonMessage(text)
          return
        } catch (e) {
          console.error('[FileManager] Failed to parse JSON from raw binary:', e)
          // Not valid JSON, continue to handle as binary protocol
        }
      }
    } catch (e) {
      console.error('[FileManager] Failed to decode raw binary as text:', e)
      // Failed to decode as text, try binary protocol
    }
    
    // If not raw JSON, try binary protocol (with headers)
    const buffer = data instanceof Uint8Array 
      ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
      : data
    
    this.binaryProtocol.push(buffer as ArrayBuffer, (chunk, isFinal) => {
      // Try to decode as text first (for JSON responses in protocol chunks)
      try {
        const textDecoder = new TextDecoder('utf-8')
        const text = textDecoder.decode(chunk)
        
        // Check if it's JSON by trying to parse it
        if (text.startsWith('{') || text.startsWith('[')) {
          try {
            const json = JSON.parse(text)
            console.log('[FileManager] Parsed JSON from protocol chunk:', {
              action: json.action,
              hasDir: json.dir !== undefined,
              reqid: json.reqid,
              path: json.path
            })
            
            // If it's a directory listing response, handle it
            if (json.dir !== undefined || json.action === 'ls') {
              // Make sure we have the directory data
              if (json.dir !== undefined) {
                this.handleDirectoryListing(json as DirectoryListing)
              }
              return
            }
            // Otherwise handle as regular JSON message
            this.handleJsonMessage(text)
            return
          } catch (e) {
            console.error('[FileManager] Failed to parse JSON from protocol chunk:', e)
            // Not valid JSON, continue to handle as binary
          }
        }
      } catch (e) {
        console.error('[FileManager] Failed to decode protocol chunk as text:', e)
        // Failed to decode as text, handle as binary download
      }
      
      // If not JSON, handle as binary download data
      this.downloader.handleBinaryChunk(chunk, isFinal)
    })
  }

  private handleDownloadMessage(message: any): void {
    this.downloader.handleControlMessage(message)
  }

  private handleDialogMessage(message: any): void {
    if (message?.msg) {
      console.log('[FileManager] Dialog message:', message.msg)
    }
  }

  /**
   * Handle directory listing response
   */
  private handleDirectoryListing(listing: DirectoryListing): void {
    console.log('[FileManager] Received directory listing:', {
      path: listing.path,
      itemCount: listing.dir?.length || 0,
      items: listing.dir?.slice(0, 3), // Show first 3 items for debugging
      reqid: listing.reqid,
      hasPendingRequest: listing.reqid ? this.pendingRequests.has(listing.reqid) : false
    })
    
    this.currentFiles = listing.dir || []
    // Normalize the path from the response to ensure consistency
    this.currentPath = this.normalizeRequestedPath(listing.path || this.currentPath)
    
    // Call the onDirectoryChange callback first to update UI
    if (this.options.onDirectoryChange) {
      console.log('[FileManager] Calling onDirectoryChange with', this.currentFiles.length, 'files')
      this.options.onDirectoryChange(this.currentFiles)
    }
    
    // Resolve pending request if exists
    if (listing.reqid) {
      const request = this.pendingRequests.get(listing.reqid)
      if (request) {
        console.log('[FileManager] Resolving pending request:', listing.reqid)
        clearTimeout(request.timeout)
        this.pendingRequests.delete(listing.reqid)
        request.resolve(this.currentFiles)
      } else {
        console.log('[FileManager] No pending request found for reqid:', listing.reqid)
      }
    } else {
      // If no reqid in response, try to resolve any pending directory listing request
      // This handles cases where the server doesn't echo back the reqid
      console.log('[FileManager] No reqid in response, checking for pending ls requests')
      for (const [reqid, request] of this.pendingRequests.entries()) {
        // Assuming we only have one pending directory listing at a time
        console.log('[FileManager] Resolving pending request without reqid match:', reqid)
        clearTimeout(request.timeout)
        this.pendingRequests.delete(reqid)
        request.resolve(this.currentFiles)
        break // Only resolve the first one
      }
    }
  }

  /**
   * Handle operation response
   */
  private handleOperationResponse(message: FileOperationResponse): void {
    const request = this.pendingRequests.get(message.reqid || '')
    if (request) {
      clearTimeout(request.timeout)
      this.pendingRequests.delete(message.reqid || '')
      
      if (message.result === 'ok' || message.action) {
        request.resolve(message)
      } else if (message.error) {
        request.reject(new Error(message.error))
      } else {
        request.resolve(message)
      }
    }
  }

  /**
   * Handle error message
   */
  private handleErrorMessage(message: any): void {
    console.log('[FileManager] Error message received:', message)
    
    const error = this.errorHandler.parseError(message)
    if (error) {
      this.errorHandler.handleError(error)
    }
    
    // Reject pending request if any
    if (message.reqid) {
      const request = this.pendingRequests.get(message.reqid)
      if (request) {
        clearTimeout(request.timeout)
        this.pendingRequests.delete(message.reqid)
        request.reject(new Error(error?.message || 'Operation failed'))
      }
    }
  }

  /**
   * Handle upload progress
   */
  private handleUploadProgress(message: any): void {
    const progress: FileTransferProgress = {
      file: message.file,
      progress: message.progress,
      bytesTransferred: message.bytesTransferred || 0,
      totalBytes: message.totalBytes || 0
    }
    
    this.options.onTransferProgress?.(progress)
  }

  /**
   * Handle download progress
   */
  private handleDownloadProgress(message: any): void {
    const progress: FileTransferProgress = {
      file: message.file,
      progress: message.progress,
      bytesTransferred: message.bytesTransferred || 0,
      totalBytes: message.totalBytes || 0
    }
    
    this.options.onTransferProgress?.(progress)
  }

  /**
   * Send operation with timeout
   */
  private async sendOperation<T = any>(
    request: any, 
    timeoutMs = 8000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[FileManager] Operation timed out for reqid:', request.reqid)
        this.pendingRequests.delete(request.reqid)
        reject(new Error('Operation timed out'))
      }, timeoutMs)
      
      this.pendingRequests.set(request.reqid, { resolve, reject, timeout })
      
      const sent = this.sendJsonMessage(request)
      if (!sent) {
        clearTimeout(timeout)
        this.pendingRequests.delete(request.reqid)
        reject(new Error('Failed to send request'))
      }
    })
  }

  // Public API Methods

  /**
   * Load directory
   */
  async loadDirectory(path: string): Promise<FileEntry[]> {
    const normalizedPath = this.normalizeRequestedPath(path)
    if (!this.fileOps.validatePath(normalizedPath)) {
      throw new Error('Invalid path')
    }
    
    // Prevent duplicate requests for the same path
    if (this.loadingPath === normalizedPath) {
      console.log('[FileManager] Already loading path:', normalizedPath, '- skipping duplicate request')
      return this.currentFiles // Return current files to avoid hanging
    }
    
    this.loadingPath = normalizedPath
    
    try {
      const request = this.fileOps.createListDirectoryRequest(normalizedPath)
      console.log('[FileManager] Sending ls request for path:', normalizedPath)
      
      // The sendOperation will wait for the response to come back via handleDirectoryListing
      // which will resolve the promise with the actual files
      const files = await this.sendOperation<FileEntry[]>(request)
      console.log('[FileManager] Directory loaded:', { path: normalizedPath, fileCount: files?.length || 0 })
      return files || []
    } finally {
      this.loadingPath = null // Clear loading state
    }
  }

  /**
   * Create folder
   */
  async createFolder(folderName: string): Promise<void> {
    const sanitized = this.fileOps.sanitizeName(folderName)
    if (!sanitized) throw new Error('Invalid folder name')
    
    const request = this.fileOps.createMakeDirRequest(this.currentPath, sanitized)
    await this.sendOperation(request)
    await this.loadDirectory(this.currentPath)
  }

  /**
   * Rename file or folder
   */
  async rename(oldName: string, newName: string): Promise<void> {
    const sanitized = this.fileOps.sanitizeName(newName)
    if (!sanitized) throw new Error('Invalid name')
    
    const request = this.fileOps.createRenameRequest(this.currentPath, oldName, sanitized)
    await this.sendOperation(request)
    await this.loadDirectory(this.currentPath)
  }

  /**
   * Delete files or folders
   */
  async deleteItems(items: string[], recursive = false): Promise<void> {
    const request = this.fileOps.createDeleteRequest(this.currentPath, items, recursive)
    await this.sendOperation(request)
    await this.loadDirectory(this.currentPath)
  }

  /**
   * Copy files
   */
  async copyFiles(items: string[], destinationPath: string): Promise<void> {
    if (!this.fileOps.validatePath(destinationPath)) {
      throw new Error('Invalid destination path')
    }
    
    const request = this.fileOps.createCopyRequest(this.currentPath, destinationPath, items)
    await this.sendOperation(request)
    await this.loadDirectory(this.currentPath)
  }

  /**
   * Move files
   */
  async moveFiles(items: string[], destinationPath: string): Promise<void> {
    if (!this.fileOps.validatePath(destinationPath)) {
      throw new Error('Invalid destination path')
    }
    
    const request = this.fileOps.createMoveRequest(this.currentPath, destinationPath, items)
    await this.sendOperation(request)
    await this.loadDirectory(this.currentPath)
  }

  /**
   * Upload file
   */
  async uploadFile(file: File, checkHash = true): Promise<string> {
    return await this.uploader.uploadFile(file, this.currentPath, checkHash)
  }

  /**
   * Download file
   */
  downloadFile(fileName: string): string {
    const basePath = this.currentPath || ''
    const filePath = this.fileOps.joinPath(basePath, fileName)
    const entry = this.currentFiles.find(file => file.n === fileName)
    return this.downloader.downloadFile(filePath, fileName, entry?.s)
  }

  /**
   * Get file content (small text files)
   */
  async getFileContent(fileName: string): Promise<string> {
    const request = this.fileOps.createGetFileRequest(this.currentPath, fileName)
    const response = await this.sendOperation<any>(request)
    return response.data ? atob(response.data) : ''
  }

  /**
   * Set file content (small text files)
   */
  async setFileContent(fileName: string, content: string): Promise<void> {
    const request = this.fileOps.createSetFileRequest(this.currentPath, fileName, content)
    await this.sendOperation(request)
  }

  /**
   * Create zip archive
   */
  async createZip(files: string[], zipName: string): Promise<void> {
    const sanitized = this.fileOps.sanitizeName(zipName)
    if (!sanitized) throw new Error('Invalid zip name')
    
    const request = this.fileOps.createZipRequest(this.currentPath, files, sanitized)
    await this.sendOperation(request)
    await this.loadDirectory(this.currentPath)
  }

  /**
   * Extract zip archive
   */
  async extractZip(zipFile: string): Promise<void> {
    const request = this.fileOps.createUnzipRequest(this.currentPath, zipFile)
    await this.sendOperation(request)
    await this.loadDirectory(this.currentPath)
  }

  /**
   * Search files
   */
  async searchFiles(filter: string): Promise<FileEntry[]> {
    const request = this.fileOps.createSearchRequest(this.currentPath, filter)
    const response = await this.sendOperation<any>(request)
    return response.files || []
  }

  // Navigation helpers

  /**
   * Navigate to path
   */
  async navigateToPath(path: string): Promise<FileEntry[]> {
    return await this.loadDirectory(path)
  }

  /**
   * Navigate to parent directory
   */
  async navigateUp(): Promise<FileEntry[]> {
    const parentPath = this.fileOps.getParentPath(this.currentPath || '/')
    return await this.loadDirectory(parentPath)
  }

  /**
   * Navigate into directory
   */
  async navigateInto(directoryName: string): Promise<FileEntry[]> {
    const basePath = this.currentPath || ''
    const newPath = this.fileOps.joinPath(basePath, directoryName)
    return await this.loadDirectory(newPath)
  }

  // Getters

  /**
   * Get current path
   */
  getCurrentPath(): string {
    return this.currentPath || '/'
  }

  /**
   * Get current files
   */
  getCurrentFiles(): FileEntry[] {
    return this.currentFiles
  }

  /**
   * Get connection state
   */
  getState(): FileConnectionState {
    return this.state
  }

  /**
   * Get file operations helper
   */
  getFileOps(): FileOperations {
    return this.fileOps
  }

  /**
   * Get uploader
   */
  getUploader(): FileUploader {
    return this.uploader
  }

  /**
   * Get downloader
   */
  getDownloader(): FileDownloader {
    return this.downloader
  }

  /**
   * Get error handler
   */
  getErrorHandler(): FileErrorHandler {
    return this.errorHandler
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected_end_to_end'
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    // Clear pending requests
    for (const [, request] of this.pendingRequests) {
      clearTimeout(request.timeout)
      request.reject(new Error('Disconnected'))
    }
    this.pendingRequests.clear()
    
    // Disconnect transports
    if (this.tunnel) {
      try {
        this.tunnel.stop()
      } catch (error) {
        console.error('Error stopping file tunnel:', error)
      }
      this.tunnel = null
    }
    
    // Reset state
    this.setState('disconnected')
    this.currentFiles = []
    this.currentPath = ''
    this.optionsSent = false
    this.initialDirectoryRequested = false
    
    // Clear transfers
    this.uploader.clearAll()
    this.downloader.clearAll()
    this.binaryProtocol.reset()
  }

  /**
   * Reconnect
   */
  async reconnect(): Promise<void> {
    this.disconnect()
    await this.connect()
  }

  private sendRelayControlMessage(message: Record<string, any>): void {
    const payload = {
      ctrlChannel: 102938,
      ...message
    }
    if (!this.tunnel) return
    try {
      this.tunnel.sendCtrl(payload)
    } catch (error) {
      console.error('Error sending relay control message via tunnel:', error)
    }
  }

  private handleCtrlChannelMessage(message: any): void {
    switch (message.type) {
      case 'ping':
        this.sendRelayControlMessage({ type: 'pong' })
        break
      case 'close':
        console.log('[FileManager] Relay sent close notice:', message.reason)
        break
      case 'console':
        console.log('[FileManager] Relay console message:', message.msg)
        break
      default:
        break
    }
  }

  private sendRelayOptions(force = false): void {
    if (!this.tunnel) return
    if (this.optionsSent && !force) return
    this.optionsSent = true
    this.sendRelayControlMessage({
      type: 'options',
      consent: typeof this.options.consent === 'number' ? this.options.consent : 0
    })
  }

  private sendJsonMessage(payload: any): boolean {
    try {
      const data = JSON.stringify(payload)
      return this.sendData(data)
    } catch (error) {
      console.error('Failed to serialize payload:', error)
      return false
    }
  }

  private sendData(data: string | ArrayBuffer | Uint8Array): boolean {
    if (!this.tunnel) {
      console.error('[FileManager] Cannot send data: No tunnel connection')
      return false
    }
    
    const tunnelState = this.tunnel.getState()
    if (tunnelState !== 3) {
      console.warn('[FileManager] Tunnel not fully connected, state:', tunnelState)
      return false
    }
    
    try {
      if (typeof data === 'string') {
        this.tunnel.sendText(data)
      } else {
        const buffer = data instanceof Uint8Array ? data : new Uint8Array(data)
        this.tunnel.sendBinary(buffer)
      }
      return true
    } catch (error) {
      console.error('Error sending data through tunnel:', error)
      return false
    }
  }
}

// Export all related types and classes
export * from './file-manager-types'
export { FileOperations } from './file-operations'
export { FileUploader, type UploadTask } from './file-uploader'
export { FileDownloader, type DownloadTask } from './file-downloader'
export { FileBinaryProtocol } from './file-binary-protocol'
export { FileErrorHandler, type FileError, type FileErrorType } from './file-error-handler'