/**
 * MeshCentral Integration Library
 * Export all MeshCentral functionality
 */

// Core components
export { WebSocketManager } from './websocket-manager'
export type { WebSocketState, WebSocketManagerOptions } from './websocket-manager'

export { MeshControlClient } from './meshcentral-control'

// File Manager
export { MeshCentralFileManager } from './file-manager'
export type {
  FileConnectionState,
  FileEntry,
  FileManagerOptions,
  DirectoryListing,
  FileOperationRequest,
  FileOperationResponse,
  UploadRequest,
  DownloadRequest,
  FileTransferProgress,
  BinaryHeader,
  BinaryAccumulator,
  MeshRights,
  SiteRights
} from './file-manager-types'

export { FileOperations } from './file-operations'
export { FileUploader, type UploadTask } from './file-uploader'
export { FileDownloader, type DownloadTask } from './file-downloader'
export { FileBinaryProtocol } from './file-binary-protocol'
export { FileErrorHandler, type FileError, type FileErrorType } from './file-error-handler'

// Configuration and utilities
export {
  buildWsUrl,
  MESH_USER,
  MESH_PASS
} from './meshcentral-config'

// Helper function to check file access permissions
export function canAccessFiles(userRights: { mesh?: number; site?: number }): boolean {
  const MeshRights = {
    SERVERFILES: 0x00000020,
    NOFILES: 0x00000400
  }
  
  const SiteRights = {
    FILEACCESS: 0x00000008
  }
  
  const hasServerFiles = ((userRights.mesh || 0) & MeshRights.SERVERFILES) !== 0
  const notBlocked = ((userRights.mesh || 0) & MeshRights.NOFILES) === 0
  const hasSiteAccess = ((userRights.site || 0) & SiteRights.FILEACCESS) !== 0
  
  return hasServerFiles && notBlocked && hasSiteAccess
}