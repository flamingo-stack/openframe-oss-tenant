/**
 * MeshCentral Integration Library
 * Export all MeshCentral functionality
 */

export { FileBinaryProtocol } from './file-binary-protocol';
export { type DownloadTask, FileDownloader } from './file-downloader';
export { type FileError, FileErrorHandler, type FileErrorType } from './file-error-handler';

// File Manager
export { MeshCentralFileManager } from './file-manager';
export type {
  BinaryAccumulator,
  BinaryHeader,
  DirectoryListing,
  DownloadRequest,
  FileConnectionState,
  FileEntry,
  FileManagerOptions,
  FileOperationRequest,
  FileOperationResponse,
  FileTransferProgress,
  MeshRights,
  SiteRights,
  UploadRequest,
} from './file-manager-types';

export { FileOperations } from './file-operations';
export { FileUploader, type UploadTask } from './file-uploader';
// Configuration and utilities
export {
  buildWsUrl,
  MESH_PASS,
  MESH_USER,
} from './meshcentral-config';
export { MeshControlClient } from './meshcentral-control';
export type { WebSocketManagerOptions, WebSocketState } from './websocket-manager';
// Core components
export { WebSocketManager } from './websocket-manager';

// Helper function to check file access permissions
export function canAccessFiles(userRights: { mesh?: number; site?: number }): boolean {
  const MeshRights = {
    SERVERFILES: 0x00000020,
    NOFILES: 0x00000400,
  };

  const SiteRights = {
    FILEACCESS: 0x00000008,
  };

  const hasServerFiles = ((userRights.mesh || 0) & MeshRights.SERVERFILES) !== 0;
  const notBlocked = ((userRights.mesh || 0) & MeshRights.NOFILES) === 0;
  const hasSiteAccess = ((userRights.site || 0) & SiteRights.FILEACCESS) !== 0;

  return hasServerFiles && notBlocked && hasSiteAccess;
}
