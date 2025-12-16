import type { FileEntry } from '@lib/meshcentral/file-manager-types'
import type { FileItem } from '@flamingo-stack/openframe-frontend-core/components/ui/file-manager'

/**
 * Convert MeshCentral FileEntry to UI-Kit FileItem format
 */
export function convertFileEntryToItem(entry: FileEntry, currentPath: string): FileItem {
  const isFolder = entry.t === 1 || entry.t === 2
  let itemPath: string

  const normalizedCurrentPath = currentPath.replace(/\\/g, '/')

  if (entry.path) {
    const cleanedPath = entry.path.replace(/^[\\\/]+/, '').replace(/\\/g, '/')
    
    if (normalizedCurrentPath === '' || normalizedCurrentPath === '/') {
      itemPath = '/' + cleanedPath
    } else {
      itemPath = normalizedCurrentPath + (normalizedCurrentPath.endsWith('/') ? '' : '/') + cleanedPath
    }
  } else {
    if (normalizedCurrentPath === '' || normalizedCurrentPath === '/') {
      itemPath = '/' + entry.n
    } else {
      itemPath = normalizedCurrentPath + (normalizedCurrentPath.endsWith('/') ? '' : '/') + entry.n
    }
  }
  
  return {
    id: itemPath,
    name: entry.n,
    type: isFolder ? 'folder' : 'file',
    size: isFolder || !entry.s ? undefined : formatFileSize(entry.s),
    modified: entry.d ? formatDate(entry.d) : '',
    path: itemPath
  }
}

/**
 * Convert array of FileEntries to FileItems
 */
export function convertFileEntriesToItems(entries: FileEntry[], currentPath: string): FileItem[] {
  return entries.map(entry => convertFileEntryToItem(entry, currentPath))
}

/**
 * Format file size from bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format Unix timestamp to readable date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  
  if (isNaN(date.getTime())) {
    return ''
  }
  
  // Format: MM/DD/YYYY HH:MM
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${month}/${day}/${year} ${hours}:${minutes}`
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.substring(lastDot + 1).toLowerCase()
}

/**
 * Determine if a file is downloadable based on its type
 */
export function isDownloadable(fileType: number): boolean {
  // Type 3 is a regular file
  return fileType === 3
}

/**
 * Sanitize file path to prevent path traversal
 */
export function sanitizePath(path: string): string {
  if (!path) return ''
  
  // Remove any path traversal attempts
  const parts = path
    .split(/[\\/]/)
    .filter(part => part.length > 0 && part !== '.' && part !== '..')

  if (parts.length === 0) {
    return ''
  }

  const hasDrive = /^[A-Za-z]:?$/.test(parts[0])
  if (hasDrive) {
    const drive = parts.shift()!
    const driveNormalized = drive.endsWith(':') ? drive : drive + ':'
    const remainder = parts.length ? parts.join('\\') : ''
    return remainder ? `${driveNormalized}\\${remainder}` : `${driveNormalized}\\`
  }

  return `/${parts.join('/')}`
}

/**
 * Get parent path from current path
 */
export function getParentPath(path: string): string {
  if (path === '/' || path === '') return '/'
  
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return '/'
  
  parts.pop()
  return parts.length === 0 ? '/' : '/' + parts.join('/')
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  const joined = segments
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
  
  return joined.startsWith('/') ? joined : '/' + joined
}