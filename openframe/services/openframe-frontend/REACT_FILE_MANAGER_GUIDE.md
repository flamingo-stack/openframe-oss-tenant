# MeshCentral React File Manager Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [WebSocket Connection Setup](#websocket-connection-setup)
4. [Authentication](#authentication)
5. [File Operations Protocol](#file-operations-protocol)
6. [Binary Data Transfer](#binary-data-transfer)
7. [React Component Structure](#react-component-structure)
8. [Implementation Examples](#implementation-examples)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)

## Overview

This guide provides complete technical specifications for implementing a File Manager feature in React that integrates with MeshCentral's backend infrastructure. MeshCentral uses WebSocket connections for real-time file operations on both server files and remote agent files.

### Key Features to Implement
- File/folder browsing and navigation
- Upload and download files
- Create, rename, and delete files/folders
- Copy, cut, and paste operations
- File compression (zip) and extraction
- File search functionality
- Text file editing
- Progress tracking for transfers
- Multi-file selection and bulk operations

## Architecture

### System Components
```
┌─────────────┐     WebSocket      ┌──────────────┐      Tunnel       ┌─────────────┐
│React Client │ ←────────────────→ │MeshCentral   │ ←───────────────→ │Remote Agent │
│File Manager │                    │Server/Relay  │                   │(Node Device)│
└─────────────┘                    └──────────────┘                   └─────────────┘
```

### Connection Types
1. **Server Files**: Direct WebSocket to MeshCentral server
2. **Remote Files**: WebSocket relay tunnel to remote agents (Protocol 5)

## WebSocket Connection Setup

### 1. Server File Connection (control.ashx)
The `control.ashx` endpoint is used for direct server file management and server-side operations.

```javascript
// Connect to server files for managing server-side files
const connectToServerFiles = (authCookie, authKey) => {
  // Build connection URL with proper authentication
  let wsUrl = `wss://${window.location.host}/control.ashx`;
  
  // Add authentication parameters
  const params = [];
  if (authKey) params.push(`key=${authKey}`); // Optional 3FA key
  if (authCookie) params.push(`auth=${authCookie}`);
  if (params.length > 0) wsUrl += '?' + params.join('&');
  
  const serverFilesWS = new WebSocket(wsUrl);
  serverFilesWS.binaryType = 'arraybuffer';
  
  return serverFilesWS;
};
```

#### Authentication Flow for control.ashx:
1. **WebSocket Connection**: Client connects to control.ashx
2. **Session Authentication**: Server validates session cookie and user permissions
3. **Inner Authentication**: If user is null but 'x-meshauth' header is '*', perform inner auth
4. **User Creation**: CreateMeshUser is called to establish the user session

### 2. Remote Agent File Connection (meshrelay.ashx)
The `meshrelay.ashx` endpoint is used for relaying file operations to remote agents.

```javascript
// Connect to remote agent files through relay
const connectToRemoteFiles = (nodeId, consent = 0, authCookie, rauthCookie) => {
  // Generate unique tunnel ID for this session
  const tunnelId = Math.random().toString(36).substring(2);
  
  // Build connection URL with all required parameters
  const params = [
    'browser=1',           // Indicates browser connection
    'p=5',                 // Protocol 5 = Files
    `nodeid=${nodeId}`,    // Target node/device ID
    `id=${tunnelId}`,      // Unique tunnel identifier
    `auth=${authCookie}`   // Authentication cookie
  ];
  
  // Add optional parameters
  if (consent) params.push(`consent=${consent}`);
  if (rauthCookie) params.push(`rauth=${rauthCookie}`);
  
  const wsUrl = `wss://${window.location.host}/meshrelay.ashx?${params.join('&')}`;
  const remoteFilesWS = new WebSocket(wsUrl);
  remoteFilesWS.binaryType = 'arraybuffer';
  
  return remoteFilesWS;
};
```

#### Connection States for meshrelay.ashx:
- **State 0**: Disconnected
- **State 1**: WebSocket connected to server
- **State 2**: Connected to relay server, waiting for agent
- **State 3**: End-to-end tunnel established with agent

### 3. SSH File Connection (sshfilesrelay.ashx)
For SSH-based file operations:

```javascript
const connectToSSHFiles = (nodeId, authCookie) => {
  const tunnelId = Math.random().toString(36).substring(2);
  const wsUrl = `wss://${window.location.host}/sshfilesrelay.ashx?` +
    `browser=1&p=13&nodeid=${nodeId}&id=${tunnelId}&auth=${authCookie}`;
  
  const sshFilesWS = new WebSocket(wsUrl);
  sshFilesWS.binaryType = 'arraybuffer';
  return sshFilesWS;
};
```

### 3. WebSocket Handshake Protocol

#### For meshrelay.ashx (Remote Files):
```javascript
class RemoteFileConnection {
  constructor() {
    this.state = 0;
    this.ws = null;
    this.protocol = 5; // File protocol
    this.serverIsRecording = false;
  }
  
  handleInitialHandshake(event) {
    // Server sends 'c' or 'cr' to indicate connection ready
    if (event.data === 'c') {
      // Connection established without recording
      this.sendProtocolNumber();
    } else if (event.data === 'cr') {
      // Connection established with recording enabled
      this.serverIsRecording = true;
      this.sendProtocolNumber();
    }
  }
  
  sendProtocolNumber() {
    // Send protocol number to establish file transfer mode
    this.ws.send(String.fromCharCode(this.protocol));
    this.state = 3; // Connected end-to-end
    
    // Send any options if needed
    if (this.options) {
      this.ws.send(JSON.stringify({
        type: 'options',
        ...this.options
      }));
    }
  }
}
```

#### For control.ashx (Server Files):
```javascript
class ServerFileConnection {
  constructor() {
    this.authenticated = false;
    this.ws = null;
  }
  
  connect(authCookie) {
    // Connection URL includes auth in query string
    const wsUrl = `wss://${window.location.host}/control.ashx?auth=${authCookie}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      // For control.ashx, authentication happens during connection
      // No additional handshake needed if auth cookie is valid
      this.authenticated = true;
      this.requestServerInfo();
    };
  }
  
  requestServerInfo() {
    // Request server information and user rights
    this.ws.send(JSON.stringify({
      action: 'serverinfo',
      type: 'files'
    }));
  }
}
```

## Authentication

### Required Permissions
```javascript
const MeshRights = {
  EDITMESH: 0x00000001,         // 1 - Edit mesh/device group
  MANAGEUSERS: 0x00000002,      // 2 - Manage users  
  MANAGECOMPUTERS: 0x00000004,  // 4 - Manage computers
  REMOTECONTROL: 0x00000008,    // 8 - Remote control
  AGENTCONSOLE: 0x00000010,     // 16 - Agent console
  SERVERFILES: 0x00000020,      // 32 - Server file access (critical for file operations)
  WAKEDEVICE: 0x00000040,       // 64 - Wake device
  SETNOTES: 0x00000080,         // 128 - Set notes
  REMOTEVIEWONLY: 0x00000100,   // 256 - Remote view only
  NOTERMINAL: 0x00000200,       // 512 - No terminal
  NOFILES: 0x00000400,          // 1024 - Block file access (negative permission)
  NOAMT: 0x00000800,            // 2048 - No AMT
  ADMIN: 0xFFFFFFFF             // Full admin rights
};

const SiteRights = {
  SERVERBACKUP: 0x00000001,     // 1 - Server backup
  MANAGEUSERS: 0x00000002,      // 2 - Manage users
  SERVERRESTORE: 0x00000004,    // 4 - Server restore
  FILEACCESS: 0x00000008,       // 8 - Site-level file access (required)
  SERVERUPDATE: 0x00000010,     // 16 - Server update
  LOCKED: 0x00000020,           // 32 - Locked
  ADMIN: 0xFFFFFFFF             // Full admin
};

// Check permissions before enabling file manager
const canAccessFiles = (userRights) => {
  // Must have SERVERFILES permission on mesh
  const hasServerFiles = (userRights.mesh & MeshRights.SERVERFILES) !== 0;
  
  // Must NOT have NOFILES restriction
  const notBlocked = (userRights.mesh & MeshRights.NOFILES) === 0;
  
  // Should have site-level file access
  const hasSiteAccess = (userRights.site & SiteRights.FILEACCESS) !== 0;
  
  return hasServerFiles && notBlocked && hasSiteAccess;
};
```

### Authentication Methods

#### 1. Session Cookie Authentication
```javascript
// Authentication via session cookie (most common)
const authenticateWithSession = () => {
  // Session cookie is automatically sent with WebSocket upgrade request
  // Server validates: req.session.userid and req.session.domainid
  return document.cookie.includes('connect.sid');
};
```

#### 2. Auth Cookie in Query String
```javascript
// Generate and use auth cookie for WebSocket
const generateAuthCookie = (parent, user, request) => {
  // Server generates this cookie
  const cookieData = {
    userid: user._id,
    domainid: user.domain,
    ip: request.clientIp,
    expire: Date.now() + (4 * 60 * 60 * 1000) // 4 hours
  };
  
  // Encode with server's auth key
  return parent.encodeCookie(cookieData, parent.loginCookieEncryptionKey);
};

// Use auth cookie in connection
const connectWithAuthCookie = (authCookie) => {
  const wsUrl = `wss://${host}/meshrelay.ashx?auth=${authCookie}&p=5&browser=1`;
  return new WebSocket(wsUrl);
};
```

#### 3. Relay Authentication Cookie
```javascript
// For relay connections, additional rauth cookie may be needed
const generateRelayAuthCookie = (parent, user) => {
  const rcookie = {
    ruserid: user._id,
    x: Date.now()
  };
  return parent.encodeCookie(rcookie, parent.loginCookieEncryptionKey, 240); // 4 hour timeout
};
```

## Message Flow and Data Exchange

### Initial Connection Sequence

#### For Remote Files (meshrelay.ashx):
```javascript
// 1. Client connects to WebSocket
const ws = new WebSocket('wss://server/meshrelay.ashx?browser=1&p=5&nodeid=...');

// 2. Server validates authentication and establishes relay
// Server may send connection state updates

// 3. Server sends handshake character
ws.onmessage = (e) => {
  if (e.data === 'c' || e.data === 'cr') {
    // 4. Client responds with protocol number
    ws.send('\x05'); // Protocol 5 for files
    
    // 5. Client sends options if any
    ws.send(JSON.stringify({
      type: 'options',
      consent: 0,  // User consent flags
      cols: 80,    // For terminal protocols
      rows: 24
    }));
    
    // 6. Connection is now established, can send commands
    ws.send(JSON.stringify({
      action: 'ls',
      reqid: 'req-001',
      path: '/'
    }));
  }
};
```

#### For Server Files (control.ashx):
```javascript
// 1. Client connects with auth
const ws = new WebSocket('wss://server/control.ashx?auth=...');

// 2. Connection is authenticated during upgrade
ws.onopen = () => {
  // 3. Can immediately send commands
  ws.send(JSON.stringify({
    action: 'serverinfo'
  }));
  
  // 4. Or file operations on server
  ws.send(JSON.stringify({
    action: 'fileoperation',
    operation: 'list',
    path: 'user/' + userid
  }));
};
```

### Control Messages

Control messages use a special format with ctrlChannel identifier:

```javascript
// Ping/Pong for keepalive
ws.send(JSON.stringify({
  ctrlChannel: '102938',
  type: 'ping'
}));

// Console messages from server
{
  "ctrlChannel": "102938",
  "type": "console",
  "msg": "File transfer in progress...",
  "msgid": 1,
  "timeout": 5000
}

// Metadata updates
{
  "ctrlChannel": "102938",
  "type": "metadata",
  "startTime": 1634567890000,
  "userCount": 1
}

// RTT (Round Trip Time) measurement
ws.send(JSON.stringify({
  ctrlChannel: '102938',
  type: 'rtt',
  time: Date.now()
}));
```

## File Operations Protocol

### 1. Directory Listing
```javascript
// Request directory listing
const requestDirectoryListing = (path) => {
  ws.send(JSON.stringify({
    action: 'ls',
    reqid: generateRequestId(),
    path: path
  }));
};

// Response format
{
  "action": "ls",
  "reqid": "req-123",
  "path": "/home/user",
  "dir": [
    {
      "n": "filename.txt",      // Name
      "t": 3,                    // Type: 1=Link, 2=Directory, 3=File
      "s": 1234,                 // Size in bytes
      "d": 1634567890            // Modified date (Unix timestamp in seconds)
    },
    {
      "n": "folder",
      "t": 2,
      "s": 0,
      "d": 1634567890
    },
    {
      "n": "C:",                // Windows drive
      "t": 2,                    // Directory type
      "dt": "FIXED",            // Drive type: FIXED, REMOVABLE, CDROM
      "s": 0,
      "d": 0
    }
  ]
}

// Note: Windows paths use backslash, Unix paths use forward slash
// The 'nx' field in response contains the index for reference

### 2. File Upload
```javascript
class FileUploader {
  constructor(ws) {
    this.ws = ws;
    this.currentUpload = null;
  }
  
  async uploadFile(file, remotePath) {
    // Step 1: Optional - Check if file exists with hash
    const hash = await this.calculateHash(file);
    
    this.ws.send(JSON.stringify({
      action: 'uploadhash',
      reqid: generateRequestId(),
      path: remotePath,
      name: file.name,
      tag: {
        h: hash,        // SHA384 hash in hex
        s: file.size,   // File size
        skip: false     // Skip if exists
      }
    }));
    
    // Server responds with:
    // { action: 'uploadhash', reqid: '...', exists: true/false }
    
    // Step 2: Start upload
    this.startUpload(file, remotePath);
  }
  
  startUpload(file, remotePath) {
    const uploadRequest = {
      action: 'upload',
      reqid: generateRequestId(),
      path: remotePath,
      name: file.name,
      size: file.size,
      append: false  // Set true to resume partial upload
    };
    
    this.ws.send(JSON.stringify(uploadRequest));
    
    // Server responds with upload acknowledgment:
    // { action: 'uploadstart', reqid: '...' }
    
    this.currentUpload = {
      file: file,
      reqid: uploadRequest.reqid,
      bytesUploaded: 0
    };
  }
  
  async sendFileData() {
    const CHUNK_SIZE = 65536; // 64KB chunks
    const file = this.currentUpload.file;
    
    // Wait for uploadack before sending data
    // Server sends: { action: 'uploadack', reqid: '...' }
    
    while (this.currentUpload.bytesUploaded < file.size) {
      const start = this.currentUpload.bytesUploaded;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const arrayBuffer = await chunk.arrayBuffer();
      
      // Send binary data directly (not JSON)
      this.ws.send(arrayBuffer);
      
      this.currentUpload.bytesUploaded = end;
      
      // Server may send progress updates:
      // { action: 'uploadprogress', reqid: '...', progress: 50 }
      
      // Update local progress
      this.onProgress?.(this.currentUpload.bytesUploaded, file.size);
    }
    
    // Send completion message
    this.ws.send(JSON.stringify({
      action: 'uploaddone',
      reqid: this.currentUpload.reqid
    }));
    
    // Server confirms with:
    // { action: 'uploaddone', reqid: '...' }
  }
  
  async calculateHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-384', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
```

### 3. File Download
```javascript
class FileDownloader {
  constructor(ws) {
    this.ws = ws;
    this.downloads = new Map();
  }
  
  downloadFile(remotePath, fileName, fileSize) {
    const downloadId = generateRequestId();
    
    // Initialize download tracking
    this.downloads.set(downloadId, {
      path: remotePath,
      fileName: fileName,
      chunks: [],
      totalSize: fileSize,
      receivedSize: 0
    });
    
    // Send download request
    this.ws.send(JSON.stringify({
      action: 'download',
      sub: 'start',
      id: downloadId,
      path: remotePath
    }));
    
    // Server responds with file info:
    // { action: 'download', sub: 'start', id: '...', size: 1234 }
    
    return downloadId;
  }
  
  handleDownloadData(downloadId, data) {
    const download = this.downloads.get(downloadId);
    
    if (data instanceof ArrayBuffer) {
      // Binary data chunk
      download.chunks.push(data);
      download.receivedSize += data.byteLength;
      
      // Send acknowledgment
      this.ws.send(JSON.stringify({
        action: 'download',
        sub: 'ack',
        id: downloadId
      }));
      
      // Update progress
      this.onProgress?.(download.receivedSize, download.totalSize);
      
      // Check if complete
      if (download.receivedSize >= download.totalSize) {
        this.completeDownload(downloadId);
      }
    }
  }
  
  completeDownload(downloadId) {
    const download = this.downloads.get(downloadId);
    
    // Combine all chunks
    const blob = new Blob(download.chunks);
    
    // Trigger browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = download.fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    this.downloads.delete(downloadId);
  }
  
  cancelDownload(downloadId) {
    this.ws.send(JSON.stringify({
      action: 'download',
      sub: 'cancel',
      id: downloadId
    }));
    this.downloads.delete(downloadId);
  }
}
```

### 4. File Operations
```javascript
class FileOperations {
  constructor(ws) {
    this.ws = ws;
  }
  
  // Create folder
  createFolder(path, folderName) {
    this.ws.send(JSON.stringify({
      action: 'mkdir',
      reqid: generateRequestId(),
      path: `${path}/${folderName}`
    }));
  }
  
  // Rename file/folder
  rename(path, oldName, newName) {
    this.ws.send(JSON.stringify({
      action: 'rename',
      reqid: generateRequestId(),
      path: path,
      oldname: oldName,
      newname: newName
    }));
  }
  
  // Delete files/folders
  deleteItems(path, items, recursive = false) {
    this.ws.send(JSON.stringify({
      action: 'rm',
      reqid: generateRequestId(),
      path: path,
      delfiles: items,
      rec: recursive
    }));
  }
  
  // Copy files
  copyFiles(sourcePath, destinationPath, fileNames) {
    this.ws.send(JSON.stringify({
      action: 'copy',
      reqid: generateRequestId(),
      scpath: sourcePath,
      dspath: destinationPath,
      names: fileNames
    }));
  }
  
  // Move files
  moveFiles(sourcePath, destinationPath, fileNames) {
    this.ws.send(JSON.stringify({
      action: 'move',
      reqid: generateRequestId(),
      scpath: sourcePath,
      dspath: destinationPath,
      names: fileNames
    }));
  }
  
  // Create zip archive
  createZip(path, files, zipName) {
    this.ws.send(JSON.stringify({
      action: 'zip',
      reqid: generateRequestId(),
      path: path,
      files: files,
      zipname: zipName
    }));
  }
  
  // Extract zip archive
  extractZip(path, zipFile) {
    this.ws.send(JSON.stringify({
      action: 'unzip',
      reqid: generateRequestId(),
      path: path,
      file: zipFile
    }));
  }
  
  // Search for files
  searchFiles(path, filter) {
    this.ws.send(JSON.stringify({
      action: 'findfile',
      reqid: generateRequestId(),
      path: path,
      filter: filter
    }));
  }
  
  // Get file content (small files only)
  getFileContent(path, fileName) {
    this.ws.send(JSON.stringify({
      action: 'get',
      reqid: generateRequestId(),
      path: path,
      file: fileName
    }));
  }
  
  // Set file content (small files only)
  setFileContent(path, fileName, content) {
    this.ws.send(JSON.stringify({
      action: 'set',
      reqid: generateRequestId(),
      path: path,
      file: fileName,
      data: btoa(content) // Base64 encode
    }));
  }
}
```

## Binary Data Transfer

### Binary Message Format
```javascript
class BinaryProtocol {
  // Parse binary header
  parseBinaryHeader(data) {
    const view = new DataView(data);
    
    // Standard 4-byte header
    const cmdHigh = view.getUint8(0);
    const cmdLow = view.getUint8(1);
    const sizeHigh = view.getUint8(2);
    const sizeLow = view.getUint8(3);
    
    const command = (cmdHigh << 8) | cmdLow;
    const size = (sizeHigh << 8) | sizeLow;
    
    // Extended command (CMD=27) has 8-byte header
    if (command === 27) {
      const extSize = (view.getUint8(5) << 16) | 
                     (view.getUint8(6) << 8) | 
                     view.getUint8(7);
      return {
        command: command,
        size: extSize,
        headerSize: 8
      };
    }
    
    return {
      command: command,
      size: size,
      headerSize: 4
    };
  }
  
  // Accumulate fragmented messages
  accumulateData(accumulator, newData) {
    if (!accumulator) {
      accumulator = {
        buffer: new Uint8Array(0),
        expectedSize: 0,
        command: 0
      };
    }
    
    // Combine buffers
    const combined = new Uint8Array(accumulator.buffer.length + newData.byteLength);
    combined.set(accumulator.buffer);
    combined.set(new Uint8Array(newData), accumulator.buffer.length);
    accumulator.buffer = combined;
    
    // Check if complete
    if (accumulator.buffer.length >= accumulator.expectedSize) {
      return {
        complete: true,
        data: accumulator.buffer.slice(0, accumulator.expectedSize),
        remaining: accumulator.buffer.slice(accumulator.expectedSize)
      };
    }
    
    return { complete: false, accumulator };
  }
}
```

## React Component Structure

### 1. Main File Manager Component
```jsx
import React, { useState, useEffect, useRef } from 'react';
import { FileConnection } from './FileConnection';
import { FileOperations } from './FileOperations';
import { FileUploader } from './FileUploader';
import { FileDownloader } from './FileDownloader';

const FileManager = ({ nodeId, authCookie, isRemote = false }) => {
  const [connection, setConnection] = useState(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [uploadProgress, setUploadProgress] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [clipboard, setClipboard] = useState({ action: null, files: [] });
  
  const fileOps = useRef(null);
  const uploader = useRef(null);
  const downloader = useRef(null);
  
  useEffect(() => {
    // Initialize connection
    const conn = new FileConnection();
    
    if (isRemote) {
      // Connect to remote agent
      const url = `wss://${window.location.host}/meshrelay.ashx?` +
        `browser=1&p=5&nodeid=${nodeId}&id=${generateTunnelId()}&` +
        `auth=${authCookie}`;
      conn.connect(url);
    } else {
      // Connect to server files
      const url = `wss://${window.location.host}/control.ashx?` +
        `authCookie=${authCookie}`;
      conn.connect(url);
    }
    
    // Setup operations handlers
    fileOps.current = new FileOperations(conn);
    uploader.current = new FileUploader(conn);
    downloader.current = new FileDownloader(conn);
    
    // Setup message handlers
    conn.onMessage = handleMessage;
    conn.onBinaryData = handleBinaryData;
    
    setConnection(conn);
    
    // Load initial directory
    loadDirectory(currentPath);
    
    return () => {
      conn.close();
    };
  }, [nodeId, authCookie, isRemote]);
  
  const handleMessage = (message) => {
    switch (message.action) {
      case 'ls':
        setFiles(message.dir || []);
        break;
        
      case 'uploadprogress':
        setUploadProgress({
          file: message.file,
          progress: message.progress
        });
        break;
        
      case 'downloadprogress':
        setDownloadProgress({
          file: message.file,
          progress: message.progress
        });
        break;
        
      case 'dialogmessage':
        handleDialogMessage(message);
        break;
        
      case 'error':
        handleError(message);
        break;
    }
  };
  
  const handleBinaryData = (data) => {
    // Handle binary file data for downloads
    if (downloadProgress) {
      downloader.current.handleDownloadData(downloadProgress.id, data);
    }
  };
  
  const loadDirectory = (path) => {
    fileOps.current?.requestDirectoryListing(path);
    setCurrentPath(path);
  };
  
  const handleFileUpload = async (files) => {
    for (const file of files) {
      await uploader.current.uploadFile(file, currentPath);
    }
    loadDirectory(currentPath); // Refresh
  };
  
  const handleFileDownload = (fileName) => {
    const filePath = `${currentPath}/${fileName}`;
    downloader.current.downloadFile(filePath, fileName);
  };
  
  const handleCreateFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      fileOps.current.createFolder(currentPath, folderName);
      setTimeout(() => loadDirectory(currentPath), 500);
    }
  };
  
  const handleDelete = () => {
    const filesToDelete = Array.from(selectedFiles);
    if (confirm(`Delete ${filesToDelete.length} items?`)) {
      fileOps.current.deleteItems(currentPath, filesToDelete, true);
      setSelectedFiles(new Set());
      setTimeout(() => loadDirectory(currentPath), 500);
    }
  };
  
  const handleRename = (oldName) => {
    const newName = prompt('Enter new name:', oldName);
    if (newName && newName !== oldName) {
      fileOps.current.rename(currentPath, oldName, newName);
      setTimeout(() => loadDirectory(currentPath), 500);
    }
  };
  
  const handleCopy = () => {
    setClipboard({
      action: 'copy',
      files: Array.from(selectedFiles),
      sourcePath: currentPath
    });
  };
  
  const handleCut = () => {
    setClipboard({
      action: 'move',
      files: Array.from(selectedFiles),
      sourcePath: currentPath
    });
  };
  
  const handlePaste = () => {
    if (!clipboard.files.length) return;
    
    if (clipboard.action === 'copy') {
      fileOps.current.copyFiles(
        clipboard.sourcePath,
        currentPath,
        clipboard.files
      );
    } else if (clipboard.action === 'move') {
      fileOps.current.moveFiles(
        clipboard.sourcePath,
        currentPath,
        clipboard.files
      );
      setClipboard({ action: null, files: [] });
    }
    
    setTimeout(() => loadDirectory(currentPath), 500);
  };
  
  return (
    <div className="file-manager">
      <FileToolbar
        onCreateFolder={handleCreateFolder}
        onUpload={() => fileInputRef.current.click()}
        onDownload={() => handleDownload(selectedFiles)}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        hasSelection={selectedFiles.size > 0}
        hasClipboard={clipboard.files.length > 0}
      />
      
      <FileBreadcrumb
        path={currentPath}
        onNavigate={loadDirectory}
      />
      
      <FileList
        files={files}
        selectedFiles={selectedFiles}
        onSelect={setSelectedFiles}
        onDoubleClick={(file) => {
          if (file.t === 2) { // Directory
            loadDirectory(`${currentPath}/${file.n}`);
          } else {
            handleFileDownload(file.n);
          }
        }}
        onRename={handleRename}
      />
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      
      {uploadProgress && (
        <ProgressBar
          label={`Uploading ${uploadProgress.file}`}
          progress={uploadProgress.progress}
        />
      )}
      
      {downloadProgress && (
        <ProgressBar
          label={`Downloading ${downloadProgress.file}`}
          progress={downloadProgress.progress}
        />
      )}
    </div>
  );
};
```

### 2. File List Component
```jsx
const FileList = ({ files, selectedFiles, onSelect, onDoubleClick, onRename }) => {
  const handleSelect = (fileName, event) => {
    const newSelection = new Set(selectedFiles);
    
    if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      if (newSelection.has(fileName)) {
        newSelection.delete(fileName);
      } else {
        newSelection.add(fileName);
      }
    } else if (event.shiftKey && selectedFiles.size > 0) {
      // Range selection
      const lastSelected = Array.from(selectedFiles).pop();
      const lastIndex = files.findIndex(f => f.n === lastSelected);
      const currentIndex = files.findIndex(f => f.n === fileName);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      
      for (let i = start; i <= end; i++) {
        newSelection.add(files[i].n);
      }
    } else {
      // Single selection
      newSelection.clear();
      newSelection.add(fileName);
    }
    
    onSelect(newSelection);
  };
  
  const getFileIcon = (file) => {
    if (file.t === 2) return '📁'; // Directory
    if (file.t === 1) return '🔗'; // Link
    
    // File type icons based on extension
    const ext = file.n.split('.').pop().toLowerCase();
    const iconMap = {
      'txt': '📄',
      'pdf': '📕',
      'doc': '📘',
      'docx': '📘',
      'xls': '📊',
      'xlsx': '📊',
      'zip': '🗜️',
      'rar': '🗜️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'mp3': '🎵',
      'mp4': '🎥',
      'exe': '⚙️',
      'js': '📜',
      'json': '📋',
      'html': '🌐',
      'css': '🎨'
    };
    
    return iconMap[ext] || '📄';
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <div className="file-list">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Size</th>
            <th>Modified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr
              key={file.n}
              className={selectedFiles.has(file.n) ? 'selected' : ''}
              onClick={(e) => handleSelect(file.n, e)}
              onDoubleClick={() => onDoubleClick(file)}
            >
              <td>
                <span className="file-icon">{getFileIcon(file)}</span>
                <span className="file-name">{file.n}</span>
              </td>
              <td>{file.t === 2 ? '-' : formatFileSize(file.s)}</td>
              <td>{formatDate(file.d)}</td>
              <td>
                <button onClick={() => onRename(file.n)}>Rename</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## Implementation Examples

### 1. Drag and Drop Upload
```jsx
const DragDropUpload = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    onUpload(files);
  };
  
  return (
    <div
      className={`drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p>Drag files here to upload</p>
    </div>
  );
};
```

### 2. File Editor
```jsx
const FileEditor = ({ filePath, fileName, fileOps }) => {
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  
  useEffect(() => {
    // Load file content
    fileOps.getFileContent(filePath, fileName).then((response) => {
      setContent(atob(response.data)); // Decode base64
    });
  }, [filePath, fileName]);
  
  const handleSave = () => {
    fileOps.setFileContent(filePath, fileName, content);
    setIsDirty(false);
  };
  
  return (
    <div className="file-editor">
      <div className="editor-toolbar">
        <span>{fileName}</span>
        <button onClick={handleSave} disabled={!isDirty}>
          Save
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setIsDirty(true);
        }}
      />
    </div>
  );
};
```

### 3. Context Menu
```jsx
const FileContextMenu = ({ x, y, file, onAction }) => {
  return (
    <div 
      className="context-menu"
      style={{ left: x, top: y }}
    >
      <div onClick={() => onAction('open', file)}>Open</div>
      <div onClick={() => onAction('download', file)}>Download</div>
      <hr />
      <div onClick={() => onAction('rename', file)}>Rename</div>
      <div onClick={() => onAction('delete', file)}>Delete</div>
      <hr />
      <div onClick={() => onAction('copy', file)}>Copy</div>
      <div onClick={() => onAction('cut', file)}>Cut</div>
      <div onClick={() => onAction('paste', file)}>Paste</div>
      <hr />
      <div onClick={() => onAction('properties', file)}>Properties</div>
    </div>
  );
};
```

## SSH File Operations

When using SSH for file operations (protocol 13), additional authentication is required:

```javascript
// SSH Authentication Flow
class SSHFileManager {
  handleSSHAuth(authRequest) {
    // Server sends authentication request
    if (authRequest.action === 'sshauth') {
      // Show auth dialog to user
      this.showSSHAuthDialog(authRequest);
    }
  }
  
  // Password authentication
  authenticateWithPassword(username, password, keepCredentials = false) {
    this.ws.send(JSON.stringify({
      action: 'sshauth',
      username: username,
      password: password,
      keep: keepCredentials ? 1 : 0
    }));
  }
  
  // Key-based authentication
  authenticateWithKey(username, privateKey, passphrase, keep = 0) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.ws.send(JSON.stringify({
        action: 'sshauth',
        username: username,
        key: e.target.result,
        keypass: passphrase,
        keep: keep // 0=none, 1=user&key, 2=user,key&password
      }));
    };
    reader.readAsText(privateKey);
  }
  
  // Handle authentication errors
  handleAuthError(error) {
    switch(error.action) {
      case 'autherror':
        console.error('Authentication failed');
        break;
      case 'connectionerror':
        console.error('SSH connection failed');
        break;
      case 'sessiontimeout':
        console.error('SSH session timed out');
        break;
    }
  }
}
```

## Error Handling

### WebSocket Error Management
```javascript
class ErrorHandler {
  constructor() {
    this.errorHandlers = new Map();
  }
  
  registerHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
  }
  
  handleError(error) {
    const handler = this.errorHandlers.get(error.type);
    
    if (handler) {
      handler(error);
    } else {
      this.defaultHandler(error);
    }
  }
  
  defaultHandler(error) {
    console.error('File operation error:', error);
    
    // Show user-friendly error message
    const messages = {
      'autherror': 'Authentication failed. Please reconnect.',
      'sessionerror': 'Session expired. Please login again.',
      'sessiontimeout': 'Session timed out.',
      'connectionerror': 'Connection lost. Attempting to reconnect...',
      'permissiondenied': 'Permission denied for this operation.',
      'filenotfound': 'File or folder not found.',
      'diskfull': 'Insufficient disk space.',
      'quotaexceeded': 'Storage quota exceeded.',
      'unziperror': 'Failed to extract archive.',
      'uploadfailed': 'Upload failed. Please try again.',
      'downloadfailed': 'Download failed. Please try again.'
    };
    
    const message = messages[error.type] || 'An unexpected error occurred.';
    this.showNotification(message, 'error');
  }
  
  showNotification(message, type) {
    // Implement notification UI
  }
}
```

### Retry Logic
```javascript
class ConnectionManager {
  constructor() {
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // Start with 1 second
  }
  
  async connectWithRetry(url) {
    try {
      await this.connect(url);
      this.retryCount = 0;
      this.retryDelay = 1000;
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
        
        console.log(`Retrying connection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.connectWithRetry(url);
      } else {
        throw new Error('Failed to establish connection after multiple attempts');
      }
    }
  }
}
```

## Security Considerations

### 1. Path Traversal Prevention
```javascript
const sanitizePath = (path) => {
  // Remove any path traversal attempts
  const cleaned = path
    .split('/')
    .filter(part => part !== '..' && part !== '.')
    .join('/');
  
  // Ensure path starts with allowed root
  if (!cleaned.startsWith('/')) {
    return '/' + cleaned;
  }
  
  return cleaned;
};
```

### 2. File Type Validation
```javascript
const validateFileType = (fileName, allowedTypes) => {
  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  };
  
  return allowedTypes.includes(mimeTypes[extension]);
};
```

### 3. Size Limitations
```javascript
const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1GB
const MAX_EDIT_SIZE = 1024 * 1024 * 10; // 10MB for text editing

const validateFileSize = (file) => {
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_UPLOAD_SIZE} bytes`);
  }
  return true;
};
```

### 4. Session Management
```javascript
class SessionManager {
  constructor() {
    this.sessionTimeout = 4 * 60 * 60 * 1000; // 4 hours
    this.lastActivity = Date.now();
  }
  
  updateActivity() {
    this.lastActivity = Date.now();
  }
  
  checkSession() {
    const elapsed = Date.now() - this.lastActivity;
    if (elapsed > this.sessionTimeout) {
      this.handleSessionExpired();
      return false;
    }
    return true;
  }
  
  handleSessionExpired() {
    // Clear auth tokens
    localStorage.removeItem('authCookie');
    
    // Redirect to login
    window.location.href = '/login';
  }
}
```

## Binary Data Handling

File transfers use a mix of JSON control messages and binary data:

```javascript
class BinaryDataHandler {
  constructor() {
    this.binaryBuffer = null;
    this.expectedSize = 0;
    this.currentDownload = null;
  }
  
  handleWebSocketMessage(event) {
    if (typeof event.data === 'string') {
      // JSON control message
      this.handleControlMessage(JSON.parse(event.data));
    } else if (event.data instanceof ArrayBuffer) {
      // Binary file data
      this.handleBinaryData(event.data);
    }
  }
  
  handleControlMessage(msg) {
    // Check for special control channel
    if (msg.ctrlChannel === '102938') {
      this.handleSystemControl(msg);
      return;
    }
    
    // Regular file operation responses
    switch(msg.action) {
      case 'download':
        if (msg.sub === 'start') {
          this.currentDownload = {
            id: msg.id,
            size: msg.size,
            received: 0,
            chunks: []
          };
        }
        break;
      
      case 'upload':
        if (msg.sub === 'ack') {
          // Ready to receive next chunk
          this.sendNextChunk();
        }
        break;
    }
  }
  
  handleBinaryData(data) {
    if (this.currentDownload) {
      // Add to download buffer
      this.currentDownload.chunks.push(data);
      this.currentDownload.received += data.byteLength;
      
      // Send acknowledgment
      this.ws.send(JSON.stringify({
        action: 'download',
        sub: 'ack',
        id: this.currentDownload.id
      }));
      
      // Check if complete
      if (this.currentDownload.received >= this.currentDownload.size) {
        this.completeDownload();
      }
    }
  }
  
  completeDownload() {
    // Combine all chunks into single blob
    const blob = new Blob(this.currentDownload.chunks);
    
    // Trigger browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.currentDownload.fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    this.currentDownload = null;
  }
}
```

## Testing Recommendations

### Unit Tests
```javascript
// Example test for file operations
describe('FileOperations', () => {
  let fileOps;
  let mockWs;
  
  beforeEach(() => {
    mockWs = {
      send: jest.fn(),
      readyState: WebSocket.OPEN
    };
    fileOps = new FileOperations(mockWs);
  });
  
  test('should send correct message for create folder', () => {
    fileOps.createFolder('/home/user', 'newfolder');
    
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        action: 'mkdir',
        reqid: expect.any(String),
        path: '/home/user/newfolder'
      })
    );
  });
  
  test('should send correct message for file deletion', () => {
    fileOps.deleteItems('/home/user', ['file1.txt', 'file2.txt'], true);
    
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        action: 'rm',
        reqid: expect.any(String),
        path: '/home/user',
        delfiles: ['file1.txt', 'file2.txt'],
        rec: true
      })
    );
  });
});
```

### Integration Tests
```javascript
// Example integration test
describe('FileManager Integration', () => {
  test('should upload file successfully', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const manager = renderFileManager();
    
    // Simulate file upload
    await manager.handleFileUpload([file]);
    
    // Verify upload message sent
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('"action":"upload"')
    );
    
    // Verify progress update
    await waitFor(() => {
      expect(manager.uploadProgress).toBeTruthy();
    });
    
    // Verify completion
    await waitFor(() => {
      expect(manager.files).toContainEqual(
        expect.objectContaining({ n: 'test.txt' })
      );
    });
  });
});
```

## Performance Optimizations

### 1. Virtual Scrolling for Large Directories
```jsx
import { FixedSizeList } from 'react-window';

const VirtualFileList = ({ files, height = 600 }) => {
  const Row = ({ index, style }) => {
    const file = files[index];
    return (
      <div style={style}>
        {file.n}
      </div>
    );
  };
  
  return (
    <FixedSizeList
      height={height}
      itemCount={files.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 2. Chunked File Loading
```javascript
const loadLargeDirectory = async (path, chunkSize = 100) => {
  let offset = 0;
  let allFiles = [];
  let hasMore = true;
  
  while (hasMore) {
    const response = await fileOps.listDirectory(path, offset, chunkSize);
    allFiles = allFiles.concat(response.files);
    offset += chunkSize;
    hasMore = response.hasMore;
    
    // Update UI with partial results
    setFiles(allFiles);
  }
  
  return allFiles;
};
```

### 3. Debounced Search
```javascript
import { debounce } from 'lodash';

const useFileSearch = (fileOps) => {
  const [searchResults, setSearchResults] = useState([]);
  
  const debouncedSearch = useCallback(
    debounce((path, query) => {
      fileOps.searchFiles(path, query).then(setSearchResults);
    }, 300),
    [fileOps]
  );
  
  return { searchResults, search: debouncedSearch };
};
```

## Conclusion

This guide provides a comprehensive foundation for implementing a full-featured File Manager in React that integrates with MeshCentral's backend. The implementation follows MeshCentral's established protocols and security practices while providing a modern, responsive user interface.

Key implementation points:
- Use WebSocket Protocol 5 for file operations
- Implement proper authentication and permission checking
- Handle both JSON messages and binary data transfers
- Support all standard file operations (CRUD, copy/move, compression)
- Include progress tracking for uploads/downloads
- Implement proper error handling and retry logic
- Follow security best practices

The modular architecture allows for easy extension and customization while maintaining compatibility with MeshCentral's backend infrastructure.