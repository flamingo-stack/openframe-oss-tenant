/**
 * MeshCentral File Manager Types
 */

import type { MeshControlClient } from './meshcentral-control';

export type FileConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected_to_server'
  | 'connected_end_to_end'
  | 'failed';

export interface FileEntry {
  n: string; // Name
  t: number; // Type: 1=Link, 2=Directory, 3=File
  s?: number; // Size in bytes
  d?: number; // Modified date (Unix timestamp)
  nx?: string; // Normalized key (server supplied)
  dt?: string; // Drive type (FIXED, REMOVABLE, etc.)
  path?: string; // Absolute path when supplied
  icon?: string; // Optional icon hint
}

export interface DirectoryListing {
  action: 'ls';
  reqid: string;
  path: string;
  dir: FileEntry[];
}

export interface FileOperationRequest {
  action: string;
  reqid: string;
  path?: string;
  [key: string]: any;
}

export interface FileOperationResponse {
  action: string;
  reqid?: string;
  result?: string;
  error?: string;
  [key: string]: any;
}

export interface UploadRequest {
  action: 'upload' | 'uploadhash';
  reqid: string;
  path: string;
  name: string;
  size?: number;
  append?: boolean;
  tag?: {
    h?: string; // Hash
    s?: number; // Size
    skip?: boolean; // Skip if exists
  };
}

export interface DownloadRequest {
  action: 'download';
  sub: 'start' | 'startack' | 'ack' | 'cancel';
  id: string;
  path: string;
}

export interface FileTransferProgress {
  file: string;
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  type?: 'upload' | 'download';
}

export interface BinaryHeader {
  command: number;
  size: number;
  headerSize: number;
}

export interface BinaryAccumulator {
  buffer: Uint8Array;
  expectedSize: number;
  command: number;
}

export interface FileManagerOptions {
  nodeId?: string;
  isRemote?: boolean;
  authCookie?: string;
  consent?: number;
  controlClient?: MeshControlClient;
  domainPrefix?: string;
  onStateChange?: (state: FileConnectionState) => void;
  onDirectoryChange?: (files: FileEntry[]) => void;
  onTransferProgress?: (progress: FileTransferProgress) => void;
  onServerCancelDownload?: (fileName: string, reason?: string) => void;
  onError?: (error: Error) => void;
  onSearchStart?: () => void;
  onSearchResult?: (result: FileEntry, allResults: FileEntry[]) => void;
  onSearchComplete?: (results: FileEntry[], cancelled?: boolean) => void;
}

export const MeshRights = {
  SERVERFILES: 0x00000020, // 32 - Server file access
  NOFILES: 0x00000400, // 1024 - Block file access (negative permission)
} as const;

export const SiteRights = {
  FILEACCESS: 0x00000008, // 8 - Site-level file access
} as const;
