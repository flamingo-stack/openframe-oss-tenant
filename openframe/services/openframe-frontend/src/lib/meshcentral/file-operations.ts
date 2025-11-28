/**
 * MeshCentral File Operations
 */

import type { FileOperationRequest } from './file-manager-types'

export class FileOperations {
  private requestIdCounter = 0

  generateRequestId(): string {
    return `req-${Date.now()}-${++this.requestIdCounter}`
  }

  private detectSeparator(path: string): '\\' | '/' {
    if (path.includes('\\') && !path.includes('/')) return '\\'
    if (path.includes('/')) return '/'
    if (/^[A-Za-z]:/.test(path)) return '\\'
    return '/'
  }

  joinPath(base: string, segment: string): string {
    const sanitizedSegment = segment.replace(/^[\\/]+/, '')
    if (!base) {
      return sanitizedSegment
    }
    if (base === '/') {
      return '/' + sanitizedSegment
    }
    if (base === '\\') {
      return `\\${sanitizedSegment}`
    }
    const separator = this.detectSeparator(base)
    const needsSep = base.endsWith(separator) ? '' : separator
    return `${base}${needsSep}${sanitizedSegment}`
  }

  /**
   * Create directory listing request
   */
  createListDirectoryRequest(path: string): FileOperationRequest {
    return {
      action: 'ls',
      reqid: this.generateRequestId(),
      path: path
    }
  }

  /**
   * Create folder request
   */
  createMakeDirRequest(path: string, folderName: string): FileOperationRequest {
    const fullPath = this.joinPath(path, folderName)
    return {
      action: 'mkdir',
      reqid: this.generateRequestId(),
      path: fullPath
    }
  }

  /**
   * Create rename request
   */
  createRenameRequest(path: string, oldName: string, newName: string): FileOperationRequest {
    return {
      action: 'rename',
      reqid: this.generateRequestId(),
      path: path,
      oldname: oldName,
      newname: newName
    }
  }

  /**
   * Create delete request
   */
  createDeleteRequest(path: string, items: string[], recursive = false): FileOperationRequest {
    return {
      action: 'rm',
      reqid: this.generateRequestId(),
      path: path,
      delfiles: items,
      rec: recursive
    }
  }

  /**
   * Create copy request
   */
  createCopyRequest(sourcePath: string, destinationPath: string, fileNames: string[]): FileOperationRequest {
    return {
      action: 'copy',
      reqid: this.generateRequestId(),
      scpath: sourcePath,
      dspath: destinationPath,
      names: fileNames
    }
  }

  /**
   * Create move request
   */
  createMoveRequest(sourcePath: string, destinationPath: string, fileNames: string[]): FileOperationRequest {
    return {
      action: 'move',
      reqid: this.generateRequestId(),
      scpath: sourcePath,
      dspath: destinationPath,
      names: fileNames
    }
  }

  /**
   * Create zip archive request
   */
  createZipRequest(path: string, files: string[], zipName: string): FileOperationRequest {
    return {
      action: 'zip',
      reqid: this.generateRequestId(),
      path: path,
      files: files,
      zipname: zipName
    }
  }

  /**
   * Create unzip request
   */
  createUnzipRequest(path: string, zipFile: string): FileOperationRequest {
    return {
      action: 'unzip',
      reqid: this.generateRequestId(),
      path: path,
      file: zipFile
    }
  }

  /**
   * Create file search request
   */
  createSearchRequest(path: string, filter: string): FileOperationRequest {
    return {
      action: 'findfile',
      reqid: this.generateRequestId(),
      path: path,
      filter: filter
    }
  }

  /**
   * Create get file content request (for small text files)
   */
  createGetFileRequest(path: string, fileName: string): FileOperationRequest {
    return {
      action: 'get',
      reqid: this.generateRequestId(),
      path: path,
      file: fileName
    }
  }

  /**
   * Create set file content request (for small text files)
   */
  createSetFileRequest(path: string, fileName: string, content: string): FileOperationRequest {
    const base64Content = btoa(content)
    return {
      action: 'set',
      reqid: this.generateRequestId(),
      path: path,
      file: fileName,
      data: base64Content
    }
  }

  /**
   * Parse path into segments for navigation
   */
  parsePath(path: string): string[] {
    if (!path) return []
    const separator = this.detectSeparator(path)
    if (separator === '\\') {
      return path.replace(/^\\+/, '').split('\\').filter(segment => segment.length > 0)
    }
    return path.split('/').filter(segment => segment.length > 0)
  }

  /**
   * Build path from segments
   */
  buildPath(segments: string[]): string {
    if (segments.length === 0) return '/'
    return '/' + segments.join('/')
  }

  /**
   * Get parent directory path
   */
  getParentPath(path: string): string {
    if (!path || path === '/' || path === '\\') return path || '/'
    const separator = this.detectSeparator(path)

    if (separator === '\\') {
      let trimmed = path.replace(/\\+$/, '')
      if (/^[A-Za-z]:$/.test(trimmed)) {
        return '\\'
      }
      const parts = trimmed.split('\\').filter(part => part.length > 0)
      if (parts.length === 0) return '\\'
      parts.pop()
      if (parts.length === 0) return '\\'
      const first = parts[0]
      if (/^[A-Za-z]:$/.test(first)) {
        const remaining = parts.slice(1).join('\\')
        return remaining ? `${first}\\${remaining}` : `${first}\\`
      }
      return `\\${parts.join('\\')}`
    }

    let trimmed = path.replace(/\/+$/, '')
    if (trimmed === '') return '/'
    const segments = trimmed.split('/').filter(Boolean)
    segments.pop()
    return segments.length === 0 ? '/' : `/${segments.join('/')}`
  }

  /**
   * Sanitize file/folder name
   */
  sanitizeName(name: string): string {
    // Remove dangerous characters
    return name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '')
  }

  /**
   * Validate path (prevent traversal)
   */
  validatePath(path: string): boolean {
    // Check for path traversal attempts
    const segments = path.split('/')
    for (const segment of segments) {
      if (segment === '..' || segment === '.') {
        return false
      }
    }
    return true
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Format date for display
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  }

  /**
   * Get file extension
   */
  getFileExtension(fileName: string): string {
    const parts = fileName.split('.')
    if (parts.length > 1) {
      return parts.pop()?.toLowerCase() || ''
    }
    return ''
  }

  /**
   * Get file icon based on type and extension
   */
  getFileIcon(fileType: number, fileName: string): string {
    if (fileType === 2) return '📁' // Directory
    if (fileType === 1) return '🔗' // Link
    
    const ext = this.getFileExtension(fileName)
    const iconMap: Record<string, string> = {
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
    }
    
    return iconMap[ext] || '📄'
  }
}