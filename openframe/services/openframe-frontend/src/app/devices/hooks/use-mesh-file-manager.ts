import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { MeshCentralFileManager } from '@lib/meshcentral/file-manager'
import { MeshControlClient } from '@lib/meshcentral/meshcentral-control'
import type { FileEntry, FileConnectionState, FileTransferProgress } from '@lib/meshcentral/file-manager-types'
import type { FileItem, FileAction } from '@flamingo-stack/openframe-frontend-core/components/ui/file-manager'
import { convertFileEntriesToItems, sanitizePath } from '../utils/file-manager-utils'

// Global map to track active file manager instances by device ID (React Strict Mode protection)
const activeFileManagers = new Map<string, boolean>()

// Extract directory path from file IDs
function getDirectoryFromFileIds(fileIds: string[]): string {
  if (fileIds.length === 0) return '/'
  
  const firstFilePath = fileIds[0]
  const pathParts = firstFilePath.split('/')
  pathParts.pop()
  return pathParts.length > 0 ? pathParts.join('/') : '/'
}

interface UseMeshFileManagerOptions {
  meshcentralAgentId: string
  isRemote?: boolean
  onError?: (error: Error) => void
}

interface UseMeshFileManagerReturn {
  files: FileItem[]
  currentPath: string
  selectedFiles: string[]
  connectionState: FileConnectionState
  loading: boolean
  isSearching: boolean
  isSearchActive: () => boolean
  uploadProgress: FileTransferProgress | null
  downloadProgress: FileTransferProgress | null
  clipboard: ClipboardItem | null

  // Actions
  navigateToPath: (path: string) => Promise<void>
  navigateUp: () => Promise<void>
  navigateInto: (folderName: string) => Promise<void>
  createFolder: (name: string) => Promise<void>
  deleteItems: (fileIds: string[]) => Promise<void>
  renameItem: (oldName: string, newName: string) => Promise<void>
  uploadFile: (file: File) => Promise<void>
  downloadFile: (fileName: string) => void
  cancelDownload: () => void
  cancelUpload: () => void
  copyFiles: (fileIds: string[], destinationPath: string) => Promise<void>
  moveFiles: (fileIds: string[], destinationPath: string) => Promise<void>
  searchFiles: (query: string) => Promise<void>
  cancelSearch: () => Promise<void>

  // Clipboard operations
  copyToClipboard: (fileIds?: string[]) => void
  cutFiles: (fileIds?: string[]) => void
  pasteFiles: () => Promise<void>
  clearClipboard: () => void

  selectFile: (fileId: string, selected: boolean) => void
  selectAll: (selected: boolean) => void
  handleFileAction: (action: FileAction, fileId?: string) => Promise<void>
}

interface ClipboardItem {
  fileIds: string[]
  sourcePath: string
  operation: 'copy' | 'cut'
}

export function useMeshFileManager({
  meshcentralAgentId,
  isRemote = true,
  onError
}: UseMeshFileManagerOptions): UseMeshFileManagerReturn {
  const { toast } = useToast()
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState<string>('')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [connectionState, setConnectionState] = useState<FileConnectionState>('disconnected')
  const [loading, setLoading] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<FileTransferProgress | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<FileTransferProgress | null>(null)
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null)
  const [isSearching, setIsSearching] = useState<boolean>(false)

  const fileManagerRef = useRef<MeshCentralFileManager | null>(null)
  const controlClientRef = useRef<MeshControlClient | null>(null)
  const initializingRef = useRef<boolean>(false)
  const initTokenRef = useRef<{ cancelled: boolean } | null>(null)
  const toastRef = useRef(toast)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    if (!meshcentralAgentId) {
      return
    }

    let mounted = true
    let isInitializing = false

    const initFileManager = async () => {
      const token = { cancelled: false }
      initTokenRef.current = token

      const deviceKey = `${meshcentralAgentId}-${isRemote ? 'remote' : 'server'}`

      if (fileManagerRef.current || activeFileManagers.get(deviceKey)) {
        return
      }

      activeFileManagers.set(deviceKey, true)

      isInitializing = true
      initializingRef.current = true

      let initSucceeded = false

      try {
        setLoading(true)
        setConnectionState('connecting')

        const controlClient = new MeshControlClient()
        controlClientRef.current = controlClient

        if (token.cancelled) {
          controlClient.close()
          controlClientRef.current = null
          activeFileManagers.delete(deviceKey)
          return
        }

        const fileManager = new MeshCentralFileManager({
          nodeId: meshcentralAgentId,
          isRemote,
          consent: 0, // No consent required for file operations
          controlClient,
          onStateChange: (state) => {
            if (mounted) {
              setConnectionState(state)

              if (state === 'connected_end_to_end') {
                toastRef.current?.({
                  title: 'Connected',
                  description: 'File manager connected successfully',
                  variant: 'success',
                  duration: 2000
                })
              } else if (state === 'failed') {
                toastRef.current?.({
                  title: 'Connection Failed',
                  description: 'Failed to establish connection to file system',
                  variant: 'destructive',
                  duration: 5000
                })
              }
            }
          },
          onDirectoryChange: (entries: FileEntry[]) => {
            if (mounted) {
              const items = convertFileEntriesToItems(entries, fileManager.getCurrentPath())
              setFiles(items)
              setCurrentPath(fileManager.getCurrentPath())

              if (!fileManager.isSearchActive()) {
                setIsSearching(false)
              }
            }
          },
          onSearchStart: () => {
            if (mounted) {
              setFiles([])
              setIsSearching(true)
            }
          },
          onSearchResult: (result: FileEntry, allResults: FileEntry[]) => {
            if (mounted) {
              const items = convertFileEntriesToItems(allResults, fileManager.getCurrentPath())
              setFiles(items)
            }
          },
          onSearchComplete: (results: FileEntry[], cancelled?: boolean) => {
            if (mounted) {
              const items = convertFileEntriesToItems(results, fileManager.getCurrentPath())
              setFiles(items)

              if (!cancelled) {
                setIsSearching(false)
              }
            }
          },
          onTransferProgress: (progress: FileTransferProgress) => {
            if (mounted) {
              if (progress.type === 'upload') {
                setUploadProgress(progress)
                if (progress.progress === 100) {
                  setTimeout(() => setUploadProgress(null), 2000)
                }
              } else {
                setDownloadProgress(progress)
                if (progress.progress === 100) {
                  setTimeout(() => setDownloadProgress(null), 2000)
                }
              }
            }
          },
          onServerCancelDownload: (fileName: string, reason?: string) => {
            if (mounted) {
              setDownloadProgress(null)
              toastRef.current?.({
                title: 'Download Cancelled by Server',
                description: reason 
                  ? `${fileName} download was cancelled: ${reason}`
                  : `${fileName} download was cancelled by the server`,
                variant: 'destructive',
                duration: 5000
              })
            }
          },
          onError: (error: Error) => {
            if (mounted) {
              toastRef.current?.({
                title: 'File Manager Error',
                description: error.message,
                variant: 'destructive',
                duration: 5000
              })
              onErrorRef.current?.(error)
            }
          }
        })

        fileManagerRef.current = fileManager

        if (token.cancelled) {
          fileManager.disconnect()
          controlClient.close()
          controlClientRef.current = null
          fileManagerRef.current = null
          activeFileManagers.delete(deviceKey)
          return
        }

        await fileManager.connect()
        if (token.cancelled) {
          fileManager.disconnect()
          controlClient.close()
          controlClientRef.current = null
          fileManagerRef.current = null
          activeFileManagers.delete(deviceKey)
          return
        }
        initSucceeded = true

      } catch (error) {
        const err = error as Error
        toastRef.current?.({
          title: 'Connection Failed',
          description: err.message || 'Failed to connect to file manager',
          variant: 'destructive',
          duration: 5000
        })
        onErrorRef.current?.(err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
        if (initTokenRef.current === token) {
          initTokenRef.current = null
        }
        const deviceKey = `${meshcentralAgentId}-${isRemote ? 'remote' : 'server'}`
        if (!initSucceeded) {
          activeFileManagers.delete(deviceKey)
        }
        isInitializing = false
        initializingRef.current = false
      }
    }

    initFileManager()

    return () => {
      if (initTokenRef.current) {
        initTokenRef.current.cancelled = true
      }
      const deviceKey = `${meshcentralAgentId}-${isRemote ? 'remote' : 'server'}`

      mounted = false
      isInitializing = false
      initializingRef.current = false
      activeFileManagers.delete(deviceKey)

      if (fileManagerRef.current) {
        fileManagerRef.current.disconnect()
        fileManagerRef.current = null
      }

      if (controlClientRef.current) {
        controlClientRef.current.close()
        controlClientRef.current = null
      }
    }
  }, [meshcentralAgentId, isRemote])

  const refreshCurrentDirectory = useCallback(async () => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      await fileManager.loadDirectory(fileManager.getCurrentPath())
    } catch {
      /* noop */
    }
  }, [])

  const navigateToPath = useCallback(async (path: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      setLoading(true)
      const sanitized = sanitizePath(path)
      await fileManager.navigateToPath(sanitized)
      setSelectedFiles([])
    } catch (error) {
      toast({
        title: 'Navigation Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const navigateUp = useCallback(async () => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      setLoading(true)
      await fileManager.navigateUp()
      setSelectedFiles([])
    } catch (error) {
      toast({
        title: 'Navigation Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const navigateInto = useCallback(async (folderName: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      setLoading(true)
      await fileManager.navigateInto(folderName)
      setSelectedFiles([])
    } catch (error) {
      toast({
        title: 'Navigation Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const createFolder = useCallback(async (name: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      await fileManager.createFolder(name)
    } catch (error) {
      toast({
        title: 'Create Folder Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      refreshCurrentDirectory()
    }
  }, [toast, refreshCurrentDirectory])

  const deleteItems = useCallback(async (fileIds: string[]) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      const names = fileIds.map(id => id.split('/').pop() || '')
      await fileManager.deleteItems(names, true)
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
      return
    }

    setSelectedFiles([])
    refreshCurrentDirectory()
  }, [toast, refreshCurrentDirectory])

  const renameItem = useCallback(async (oldName: string, newName: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      await fileManager.rename(oldName, newName)
    } catch (error) {
      toast({
        title: 'Rename Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      refreshCurrentDirectory()
    }
  }, [toast, refreshCurrentDirectory])

  const uploadFile = useCallback(async (file: File) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      await fileManager.uploadFile(file)
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    }
  }, [toast])

  const downloadFile = useCallback((fileName: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      fileManager.downloadFile(fileName)
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    }
  }, [toast])

  const copyFiles = useCallback(async (fileIds: string[], destinationPath: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      const names = fileIds.map(id => id.split('/').pop() || '')
      await fileManager.copyFiles(names, destinationPath)
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
      return
    }

    refreshCurrentDirectory()
  }, [toast, refreshCurrentDirectory])

  const moveFiles = useCallback(async (fileIds: string[], destinationPath: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      const names = fileIds.map(id => id.split('/').pop() || '')
      await fileManager.moveFiles(names, destinationPath)
    } catch (error) {
      toast({
        title: 'Move Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
      return
    }

    setSelectedFiles([])
    refreshCurrentDirectory()
  }, [toast, refreshCurrentDirectory])

  const searchFiles = useCallback(async (query: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      await fileManager.searchFiles(query)
    } catch (error) {
      const errorMessage = (error as Error).message
      if (!errorMessage.includes('Cancelled for new search')) {
        toast({
          title: 'Search Failed',
          description: errorMessage,
          variant: 'destructive'
        })
        setIsSearching(false)
      }
    }
  }, [toast])

  const cancelSearch = useCallback(async () => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      await fileManager.cancelSearch()
    } catch {
      /* noop */
    } finally {
      setIsSearching(false)
    }
  }, [])

  const selectFile = useCallback((fileId: string, selected: boolean) => {
    setSelectedFiles(prev => {
      if (selected) {
        return [...prev, fileId]
      } else {
        return prev.filter(id => id !== fileId)
      }
    })
  }, [])

  const selectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedFiles(files.map(f => f.id))
    } else {
      setSelectedFiles([])
    }
  }, [files])

  const copyToClipboard = useCallback((fileIds?: string[]) => {
    const targetFiles = fileIds || selectedFiles
    if (targetFiles.length === 0) {
      toast({
        title: 'No Files Selected',
        description: 'Please select files to copy',
        variant: 'default'
      })
      return
    }

    const sourcePath = getDirectoryFromFileIds(targetFiles)
    
    setClipboard({
      fileIds: targetFiles,
      sourcePath,
      operation: 'copy'
    })
  }, [selectedFiles, toast])

  const cutFiles = useCallback((fileIds?: string[]) => {
    const targetFiles = fileIds || selectedFiles
    if (targetFiles.length === 0) {
      toast({
        title: 'No Files Selected',
        description: 'Please select files to cut',
        variant: 'default'
      })
      return
    }

    const sourcePath = getDirectoryFromFileIds(targetFiles)
    
    setClipboard({
      fileIds: targetFiles,
      sourcePath,
      operation: 'cut'
    })
  }, [selectedFiles, toast])

  const pasteFiles = useCallback(async () => {
    if (!clipboard) {
      toast({
        title: 'Clipboard Empty',
        description: 'No files in clipboard to paste',
        variant: 'default'
      })
      return
    }

    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) {
      toast({
        title: 'Not Connected',
        description: 'File manager not connected',
        variant: 'destructive'
      })
      return
    }

    if (clipboard.sourcePath === currentPath) {
      toast({
        title: 'Same Location',
        description: 'Cannot paste to the same location',
        variant: 'default'
      })
      return
    }

    const fileNames = clipboard.fileIds.map(id => id.split('/').pop() || '')

    try {
      if (clipboard.operation === 'copy') {
        await fileManager.copyFromSource(clipboard.sourcePath, fileNames)
      } else {
        await fileManager.moveFromSource(clipboard.sourcePath, fileNames)
        setClipboard(null)
        setSelectedFiles([])
      }
    } catch (error) {
      const operation = clipboard.operation === 'copy' ? 'Copy' : 'Move'
      toast({
        title: `${operation} Failed`,
        description: (error as Error).message,
        variant: 'destructive'
      })
      return
    }

    refreshCurrentDirectory()
  }, [clipboard, currentPath, toast, refreshCurrentDirectory])

  const clearClipboard = useCallback(() => {
    setClipboard(null)
    toast({
      title: 'Clipboard Cleared',
      description: 'Clipboard has been cleared',
      variant: 'default',
      duration: 2000
    })
  }, [toast])

  const cancelDownload = useCallback(() => {
    const fileManager = fileManagerRef.current
    if (!fileManager) return

    const downloader = fileManager.getDownloader()
    if (downloader.hasActiveDownload()) {
      const activeDownloadId = (downloader as any).activeDownloadId
      if (activeDownloadId) {
        downloader.cancelDownload(activeDownloadId)
        setDownloadProgress(null)
        toast({
          title: 'Download Cancelled',
          description: 'File download has been cancelled',
          variant: 'default'
        })
      }
    }
  }, [toast])

  const cancelUpload = useCallback(() => {
    const fileManager = fileManagerRef.current
    if (!fileManager) return

    const uploader = fileManager.getUploader()
    if (uploader.hasActiveUpload()) {
      const activeUploadId = uploader.getActiveUploadId()
      if (activeUploadId) {
        uploader.cancelUpload(activeUploadId)
        setUploadProgress(null)
        toast({
          title: 'Upload Cancelled',
          description: 'File upload has been cancelled',
          variant: 'default'
        })
      }
    }
  }, [toast])

  const handleFileAction = useCallback(async (action: FileAction, fileId?: string) => {
    const targetFiles = fileId ? [fileId] : selectedFiles

    switch (action) {
      case 'download':
        if (targetFiles.length === 1) {
          const fileName = targetFiles[0].split('/').pop() || ''
          downloadFile(fileName)
        }
        break

      case 'delete':
        if (targetFiles.length > 0) {
          await deleteItems(targetFiles)
        }
        break

      case 'new-folder':
        const folderName = prompt('Enter folder name:')
        if (folderName) {
          await createFolder(folderName)
        }
        break

      case 'rename':
        if (targetFiles.length === 1) {
          const oldName = targetFiles[0].split('/').pop() || ''
          const newName = prompt('Enter new name:', oldName)
          if (newName && newName !== oldName) {
            await renameItem(oldName, newName)
          }
        }
        break

      case 'upload':
        // This will be handled by the container component with file input
        break

      case 'copy':
        copyToClipboard(targetFiles)
        break

      case 'cut':
        cutFiles(targetFiles)
        break

      case 'paste':
        await pasteFiles()
        break

      default:
        break
    }
  }, [selectedFiles, downloadFile, deleteItems, createFolder, renameItem, copyToClipboard, cutFiles, pasteFiles])

  const isSearchActive = useCallback(() => {
    return fileManagerRef.current?.isSearchActive() ?? false
  }, [])

  return {
    files,
    currentPath,
    selectedFiles,
    connectionState,
    loading,
    isSearching,
    isSearchActive,
    uploadProgress,
    downloadProgress,
    clipboard,
    navigateToPath,
    navigateUp,
    navigateInto,
    createFolder,
    deleteItems,
    renameItem,
    uploadFile,
    downloadFile,
    cancelDownload,
    cancelUpload,
    copyFiles,
    moveFiles,
    searchFiles,
    cancelSearch,
    copyToClipboard,
    cutFiles,
    pasteFiles,
    clearClipboard,
    selectFile,
    selectAll,
    handleFileAction
  }
}