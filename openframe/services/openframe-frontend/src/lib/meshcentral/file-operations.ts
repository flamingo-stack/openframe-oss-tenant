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
    
    if (!base || base === '') {
      if (/^[A-Za-z]:/.test(sanitizedSegment)) {
        return sanitizedSegment.endsWith('\\') ? sanitizedSegment : sanitizedSegment + '\\'
      }
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

  createListDirectoryRequest(path: string): FileOperationRequest {
    return {
      action: 'ls',
      reqid: this.generateRequestId(),
      path: path
    }
  }

  createMakeDirRequest(path: string, folderName: string): FileOperationRequest {
    const fullPath = this.joinPath(path, folderName)
    return {
      action: 'mkdir',
      reqid: this.generateRequestId(),
      path: fullPath
    }
  }

  createRenameRequest(path: string, oldName: string, newName: string): FileOperationRequest {
    return {
      action: 'rename',
      reqid: this.generateRequestId(),
      path: path,
      oldname: oldName,
      newname: newName
    }
  }

  createDeleteRequest(path: string, items: string[], recursive = false): FileOperationRequest {
    return {
      action: 'rm',
      reqid: this.generateRequestId(),
      path: path,
      delfiles: items,
      rec: recursive
    }
  }

  createCopyRequest(sourcePath: string, destinationPath: string, fileNames: string[]): FileOperationRequest {
    return {
      action: 'copy',
      reqid: this.generateRequestId(),
      scpath: sourcePath,
      dspath: destinationPath,
      names: fileNames
    }
  }

  createMoveRequest(sourcePath: string, destinationPath: string, fileNames: string[]): FileOperationRequest {
    return {
      action: 'move',
      reqid: this.generateRequestId(),
      scpath: sourcePath,
      dspath: destinationPath,
      names: fileNames
    }
  }

  createZipRequest(path: string, files: string[], zipName: string): FileOperationRequest {
    return {
      action: 'zip',
      reqid: this.generateRequestId(),
      path: path,
      files: files,
      zipname: zipName
    }
  }

  createUnzipRequest(path: string, zipFile: string): FileOperationRequest {
    return {
      action: 'unzip',
      reqid: this.generateRequestId(),
      path: path,
      file: zipFile
    }
  }

  createSearchRequest(path: string, filter: string): FileOperationRequest {
    const wildcardFilter = filter ? `*${filter}*` : '*'
    return {
      action: 'findfile',
      reqid: this.generateRequestId(),
      path: path,
      filter: wildcardFilter
    }
  }

  createCancelSearchRequest(reqid: string): FileOperationRequest {
    return {
      action: 'cancelfindfile',
      reqid: this.generateRequestId(),
      cancelreqid: reqid
    }
  }

  createGetFileRequest(path: string, fileName: string): FileOperationRequest {
    return {
      action: 'get',
      reqid: this.generateRequestId(),
      path: path,
      file: fileName
    }
  }

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

  parsePath(path: string): string[] {
    if (!path) return []
    const separator = this.detectSeparator(path)
    if (separator === '\\') {
      return path.replace(/^\\+/, '').split('\\').filter(segment => segment.length > 0)
    }
    return path.split('/').filter(segment => segment.length > 0)
  }

  buildPath(segments: string[]): string {
    if (segments.length === 0) return '/'
    return '/' + segments.join('/')
  }

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

  sanitizeName(name: string): string {
    return name.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '')
  }

  validatePath(path: string): boolean {
    const segments = path.split('/')
    for (const segment of segments) {
      if (segment === '..' || segment === '.') {
        return false
      }
    }
    return true
  }
}