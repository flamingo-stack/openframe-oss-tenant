/**
 * MeshCentral File Manager
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
  private loadingPath: string | null = null
  private pendingSearchRequestId: string | null = null
  private searchDebounceTimer: any = null
  private searchResults: Map<string, FileEntry[]> = new Map()
  private cancelledSearchRequestIds: Set<string> = new Set()
  private isPreparingNewSearch: boolean = false
  
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

    this.fileOps = new FileOperations()
    this.binaryProtocol = new FileBinaryProtocol()
    
    this.errorHandler = new FileErrorHandler((error) => {
      this.options.onError?.(new Error(error.message))
    })

    const sendMessage = (data: string | ArrayBuffer): boolean => {
      return this.sendData(data)
    }

    this.uploader = new FileUploader(sendMessage, (progress) => {
      this.options.onTransferProgress?.(progress)
    })

    this.downloader = new FileDownloader(
      sendMessage, 
      (progress) => {
        this.options.onTransferProgress?.(progress)
      },
      (fileName, reason) => {
        this.options.onServerCancelDownload?.(fileName, reason)
      }
    )
  }

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

    const unixLikeMatch = path.match(/^\/([A-Za-z]:)(\/.*)?$/)
    if (unixLikeMatch) {
      const drive = unixLikeMatch[1]
      const remainder = unixLikeMatch[2] || ''
      return drive + '\\' + remainder.replace(/\//g, '\\').replace(/^\\/, '')
    }
    
    if (path.match(/^\/[A-Za-z]:$/)) {
      return path.substring(1) + '\\'
    }
    
    const mixedMatch = path.match(/^([A-Za-z]:)(\/.*)?$/)
    if (mixedMatch) {
      const drive = mixedMatch[1]
      const remainder = mixedMatch[2] || ''
      return drive + '\\' + remainder.replace(/\//g, '\\').replace(/^\\/, '')
    }
    
    if (path.match(/^[A-Za-z]:\\/)) {
      return path.replace(/\//g, '\\')
    }
    
    if (path.match(/^[A-Za-z]:$/)) {
      return path + '\\'
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
          this.handleBinaryMessage(data)
        }
      },
      onBinaryData: (bytes) => {
        this.handleBinaryMessage(bytes)
      },
      onCtrlMessage: (msg) => this.handleCtrlChannelMessage(msg),
      onConsoleMessage: (msg) => console.log('[FileManager][Console]', msg),
      onRequestPairing: async (relayId) => {
        try {
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
        this.loadingPath = null
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

  private setState(newState: FileConnectionState): void {
    if (this.state !== newState) {
      this.state = newState
      this.options.onStateChange?.(newState)
    }
  }

  private handleJsonMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      
      if (message.ctrlChannel === 102938) {
        this.handleCtrlChannelMessage(message)
        return
      }

      if (message.action === undefined && message.error === undefined && message.result === undefined) {
        return
      }

      switch (message.action) {
        case 'ls':
          this.handleDirectoryListing(message as DirectoryListing)
          break

        case 'findfile':
          this.handleFindFileMessage(message)
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
      if (data.length > 0 && (data.charCodeAt(0) > 127 || data.includes('\x00'))) {
        const encoder = new TextEncoder()
        const bytes = encoder.encode(data)
        this.handleBinaryMessage(bytes)
        return
      }
      
      if (data.startsWith('{') && !data.endsWith('}')) {
        return
      }
    }
  }

  private handleBinaryMessage(data: ArrayBuffer | Uint8Array): void {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data
    
    try {
      const textDecoder = new TextDecoder('utf-8')
      const text = textDecoder.decode(bytes.slice(0, 100))
      
      if (text.startsWith('{') || text.startsWith('[')) {
        const fullText = textDecoder.decode(bytes)
        try {
          const json = JSON.parse(fullText)
          if (json.dir !== undefined || json.action === 'ls') {
            if (json.dir !== undefined) {
              this.handleDirectoryListing(json as DirectoryListing)
            }
            return
          }
          this.handleJsonMessage(fullText)
          return
        } catch (e) {
          // Not valid JSON, continue as binary
        }
      }
    } catch (e) {
      // Failed to decode as text
    }
    
    if (this.downloader.hasActiveDownload()) {
      this.downloader.handleBinaryChunk(bytes, false)
    }
  }

  private handleFindFileMessage(message: any): void {
    const { reqid, r } = message
    
    if (!reqid) return
    
    if (!this.searchResults.has(reqid)) {
      this.searchResults.set(reqid, [])
    }
    
    const results = this.searchResults.get(reqid) || []
    
    const isStaleSearch = this.isPreparingNewSearch || 
                          this.cancelledSearchRequestIds.has(reqid) ||
                          (this.pendingSearchRequestId !== null && this.pendingSearchRequestId !== reqid)
    
    if (r === null) {
      const request = this.pendingRequests.get(reqid)
      if (request) {
        clearTimeout(request.timeout)
        this.pendingRequests.delete(reqid)
        request.resolve(results)
      }
      this.searchResults.delete(reqid)
      this.cancelledSearchRequestIds.delete(reqid)
      
      if (this.pendingSearchRequestId === reqid) {
        this.pendingSearchRequestId = null
      }
      
      if (isStaleSearch && (this.isPreparingNewSearch || this.pendingSearchRequestId !== null || this.searchDebounceTimer !== null)) {
        return
      }
      
      this.options.onSearchComplete?.(results)
    } else if (r) {
      const fileName = r.split(/[/\\]/).pop() || r
      const fileEntry: FileEntry = {
        n: fileName,
        t: 3,
        path: r
      }
      results.push(fileEntry)
      this.searchResults.set(reqid, results)
      
      if (isStaleSearch) {
        return
      }
      
      if (this.options.onSearchResult) {
        this.options.onSearchResult(fileEntry, results)
      }
    }
  }

  private handleDownloadMessage(message: any): void {
    this.downloader.handleControlMessage(message)
  }

  private handleDialogMessage(message: any): void {
    if (message?.msg) {
      console.log('[FileManager] Dialog message:', message.msg)
    }
  }

  private handleDirectoryListing(listing: DirectoryListing): void {
    this.currentFiles = listing.dir || []
    const responsePath = listing.path !== undefined ? listing.path : this.currentPath
    this.currentPath = this.normalizeRequestedPath(responsePath)
    
    if (this.options.onDirectoryChange) {
      this.options.onDirectoryChange(this.currentFiles)
    }
    
    if (listing.reqid) {
      const request = this.pendingRequests.get(listing.reqid)
      if (request) {
        clearTimeout(request.timeout)
        this.pendingRequests.delete(listing.reqid)
        request.resolve(this.currentFiles)
      }
    } else {
      // If no reqid in response, try to resolve any pending directory listing request
      // This handles cases where the server doesn't echo back the reqid
      for (const [reqid, request] of this.pendingRequests.entries()) {
        // Assuming we only have one pending directory listing at a time
        clearTimeout(request.timeout)
        this.pendingRequests.delete(reqid)
        request.resolve(this.currentFiles)
        break // Only resolve the first one
      }
    }
  }

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

  private handleErrorMessage(message: any): void {
    const error = this.errorHandler.parseError(message)
    if (error) {
      this.errorHandler.handleError(error)
    }
    
    if (message.reqid) {
      const request = this.pendingRequests.get(message.reqid)
      if (request) {
        clearTimeout(request.timeout)
        this.pendingRequests.delete(message.reqid)
        request.reject(new Error(error?.message || 'Operation failed'))
      }
    }
  }

  private async sendOperation<T = any>(
    request: any, 
    timeoutMs = 8000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeout: any = null
      
      if (timeoutMs > 0) {
        timeout = setTimeout(() => {
          this.pendingRequests.delete(request.reqid)
          reject(new Error('Operation timed out'))
        }, timeoutMs)
      }
      
      this.pendingRequests.set(request.reqid, { resolve, reject, timeout })
      
      const sent = this.sendJsonMessage(request)
      if (!sent) {
        if (timeout) clearTimeout(timeout)
        this.pendingRequests.delete(request.reqid)
        reject(new Error('Failed to send request'))
      }
    })
  }

  async loadDirectory(path: string): Promise<FileEntry[]> {
    const normalizedPath = this.normalizeRequestedPath(path)
    if (!this.fileOps.validatePath(normalizedPath)) {
      throw new Error('Invalid path')
    }
    
    if (this.loadingPath === normalizedPath) {
      return this.currentFiles
    }
    
    this.loadingPath = normalizedPath
    
    try {
      const request = this.fileOps.createListDirectoryRequest(normalizedPath)
      const files = await this.sendOperation<FileEntry[]>(request)
      return files || []
    } finally {
      this.loadingPath = null
    }
  }

  async createFolder(folderName: string): Promise<void> {
    const sanitized = this.fileOps.sanitizeName(folderName)
    if (!sanitized) throw new Error('Invalid folder name')
    
    const request = this.fileOps.createMakeDirRequest(this.currentPath, sanitized)
    
    await this.sendOperationWithoutResponse(request)
    await this.loadDirectory(this.currentPath)
  }

  async rename(oldName: string, newName: string): Promise<void> {
    const sanitized = this.fileOps.sanitizeName(newName)
    if (!sanitized) throw new Error('Invalid name')
    
    const request = this.fileOps.createRenameRequest(this.currentPath, oldName, sanitized)
    
    await this.sendOperationWithoutResponse(request)
    await this.loadDirectory(this.currentPath)
  }

  async deleteItems(items: string[], recursive = false): Promise<void> {
    const request = this.fileOps.createDeleteRequest(this.currentPath, items, recursive)
    
    await this.sendOperationWithoutResponse(request)
    await this.loadDirectory(this.currentPath)
  }

  async copyFiles(items: string[], destinationPath: string): Promise<void> {
    if (!this.fileOps.validatePath(destinationPath)) {
      throw new Error('Invalid destination path')
    }
    
    const request = this.fileOps.createCopyRequest(this.currentPath, destinationPath, items)
    
    await this.sendOperationWithoutResponse(request)
    await this.loadDirectory(this.currentPath)
  }

  async copyFromSource(sourcePath: string, items: string[]): Promise<void> {
    if (!this.fileOps.validatePath(sourcePath)) {
      throw new Error('Invalid source path')
    }
    
    const request = this.fileOps.createCopyRequest(sourcePath, this.currentPath, items)
    
    await this.sendOperationWithoutResponse(request)
    await this.loadDirectory(this.currentPath)
  }

  async moveFromSource(sourcePath: string, items: string[]): Promise<void> {
    if (!this.fileOps.validatePath(sourcePath)) {
      throw new Error('Invalid source path')
    }
    
    const request = this.fileOps.createMoveRequest(sourcePath, this.currentPath, items)
    
    await this.sendOperationWithoutResponse(request)
    await this.loadDirectory(this.currentPath)
  }

  async moveFiles(items: string[], destinationPath: string): Promise<void> {
    if (!this.fileOps.validatePath(destinationPath)) {
      throw new Error('Invalid destination path')
    }
    
    const request = this.fileOps.createMoveRequest(this.currentPath, destinationPath, items)
    
    await this.sendOperationWithoutResponse(request)
    await this.loadDirectory(this.currentPath)
  }

  async uploadFile(file: File, checkHash = true): Promise<string> {
    return await this.uploader.uploadFile(file, this.currentPath, checkHash)
  }

  downloadFile(fileName: string): string {
    const basePath = this.currentPath || ''
    const filePath = this.fileOps.joinPath(basePath, fileName)
    const entry = this.currentFiles.find(file => file.n === fileName)
    return this.downloader.downloadFile(filePath, fileName, entry?.s)
  }

  async getFileContent(fileName: string): Promise<string> {
    const request = this.fileOps.createGetFileRequest(this.currentPath, fileName)
    const response = await this.sendOperation<any>(request)
    return response.data ? atob(response.data) : ''
  }

  async setFileContent(fileName: string, content: string): Promise<void> {
    const request = this.fileOps.createSetFileRequest(this.currentPath, fileName, content)
    await this.sendOperation(request)
  }

  async searchFiles(filter: string, debounceDelay = 500): Promise<FileEntry[]> {
    return new Promise((resolve, reject) => {
      this.isPreparingNewSearch = true
      this.options.onSearchStart?.()

      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer)
        this.searchDebounceTimer = null
      }

      this.searchDebounceTimer = setTimeout(async () => {
        try {
          if (this.pendingSearchRequestId) {
            const cancelRequestId = this.pendingSearchRequestId
            this.cancelledSearchRequestIds.add(cancelRequestId)
            
            const cancelRequest = this.fileOps.createCancelSearchRequest(cancelRequestId)
            this.sendJsonMessage(cancelRequest)
            
            const cancellationPromise = new Promise<void>((resolveCancellation) => {
              const timeout = setTimeout(() => {
                resolveCancellation()
              }, 2000)
              
              const checkInterval = setInterval(() => {
                if (!this.pendingRequests.has(cancelRequestId) && 
                    !this.searchResults.has(cancelRequestId)) {
                  clearTimeout(timeout)
                  clearInterval(checkInterval)
                  resolveCancellation()
                }
              }, 100)
              
              setTimeout(() => {
                clearInterval(checkInterval)
              }, 2000)
            })
            
            const pendingRequest = this.pendingRequests.get(cancelRequestId)
            if (pendingRequest) {
              clearTimeout(pendingRequest.timeout)
              this.pendingRequests.delete(cancelRequestId)
              pendingRequest.reject(new Error('Cancelled for new search'))
            }
            
            this.pendingSearchRequestId = null
            
            await cancellationPromise
          }

          const request = this.fileOps.createSearchRequest(this.currentPath, filter)
          this.pendingSearchRequestId = request.reqid
          this.isPreparingNewSearch = false
          
          this.searchResults.set(request.reqid, [])

          const results = await this.sendOperation<FileEntry[]>(request, 0)
          
          this.pendingSearchRequestId = null
          resolve(results)
        } catch (error) {
          this.pendingSearchRequestId = null
          this.isPreparingNewSearch = false
          reject(error)
        } finally {
          this.searchDebounceTimer = null
        }
      }, debounceDelay)
    })
  }

  async navigateToPath(path: string): Promise<FileEntry[]> {
    return await this.loadDirectory(path)
  }

  async navigateUp(): Promise<FileEntry[]> {
    const parentPath = this.fileOps.getParentPath(this.currentPath || '/')
    return await this.loadDirectory(parentPath)
  }

  async navigateInto(directoryName: string): Promise<FileEntry[]> {
    const basePath = this.currentPath || ''
    const newPath = this.fileOps.joinPath(basePath, directoryName)
    return await this.loadDirectory(newPath)
  }

  getCurrentPath(): string {
    return this.currentPath || '/'
  }

  getCurrentFiles(): FileEntry[] {
    return this.currentFiles
  }

  getState(): FileConnectionState {
    return this.state
  }

  getFileOps(): FileOperations {
    return this.fileOps
  }

  getUploader(): FileUploader {
    return this.uploader
  }

  getDownloader(): FileDownloader {
    return this.downloader
  }

  getErrorHandler(): FileErrorHandler {
    return this.errorHandler
  }

  isConnected(): boolean {
    return this.state === 'connected_end_to_end'
  }

  isSearchActive(): boolean {
    return this.isPreparingNewSearch || 
           this.pendingSearchRequestId !== null || 
           this.searchDebounceTimer !== null
  }

  disconnect(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer)
      this.searchDebounceTimer = null
    }
    
    for (const [, request] of this.pendingRequests) {
      if (request.timeout) {
        clearTimeout(request.timeout)
      }
      request.reject(new Error('Disconnected'))
    }
    this.pendingRequests.clear()
    
    this.pendingSearchRequestId = null
    this.searchResults.clear()
    this.cancelledSearchRequestIds.clear()
    this.isPreparingNewSearch = false
    
    if (this.tunnel) {
      try {
        this.tunnel.stop()
      } catch (error) {
        console.error('Error stopping file tunnel:', error)
      }
      this.tunnel = null
    }
    
    this.setState('disconnected')
    this.currentFiles = []
    this.currentPath = ''
    this.optionsSent = false
    this.initialDirectoryRequested = false
    
    this.uploader.clearAll()
    this.downloader.resetActiveDownload()
    this.downloader.clearAll()
    this.binaryProtocol.reset()
  }

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

  private async sendOperationWithoutResponse(request: any): Promise<void> {
    const sent = this.sendJsonMessage(request)
    if (!sent) {
      throw new Error('Failed to send request')
    }
  }

  private sendData(data: string | ArrayBuffer | Uint8Array): boolean {
    if (!this.tunnel) {
      return false
    }
    
    const tunnelState = this.tunnel.getState()
    if (tunnelState !== 3) {
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
      return false
    }
  }
}

export * from './file-manager-types'
export { FileOperations } from './file-operations'
export { FileUploader, type UploadTask } from './file-uploader'
export { FileDownloader, type DownloadTask } from './file-downloader'
export { FileBinaryProtocol } from './file-binary-protocol'
export { FileErrorHandler, type FileError, type FileErrorType } from './file-error-handler'