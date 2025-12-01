import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { MeshCentralFileManager } from '@lib/meshcentral/file-manager'
import { MeshControlClient } from '@lib/meshcentral/meshcentral-control'
import type { FileEntry, FileConnectionState, FileTransferProgress } from '@lib/meshcentral/file-manager-types'
import type { FileItem, FileAction } from '@flamingo/ui-kit/components/ui/file-manager/types'
import { convertFileEntriesToItems, sanitizePath, joinPath } from '../utils/file-manager-utils'

// Global map to track active file manager instances by device ID (React Strict Mode protection)
const activeFileManagers = new Map<string, boolean>()

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
  uploadProgress: FileTransferProgress | null
  downloadProgress: FileTransferProgress | null
  
  // Actions
  navigateToPath: (path: string) => Promise<void>
  navigateUp: () => Promise<void>
  navigateInto: (folderName: string) => Promise<void>
  createFolder: (name: string) => Promise<void>
  deleteItems: (fileIds: string[]) => Promise<void>
  renameItem: (oldName: string, newName: string) => Promise<void>
  uploadFile: (file: File) => Promise<void>
  downloadFile: (fileName: string) => void
  copyFiles: (fileIds: string[], destinationPath: string) => Promise<void>
  moveFiles: (fileIds: string[], destinationPath: string) => Promise<void>
  searchFiles: (query: string) => Promise<void>
  selectFile: (fileId: string, selected: boolean) => void
  selectAll: (selected: boolean) => void
  handleFileAction: (action: FileAction, fileId?: string) => Promise<void>
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

  // Initialize file manager
  useEffect(() => {
    if (!meshcentralAgentId) {
      return
    }

    let mounted = true
    let isInitializing = false

    const initFileManager = async () => {
      const token = { cancelled: false }
      initTokenRef.current = token

      // Strong protection against duplicate initialization using global tracking
      const deviceKey = `${meshcentralAgentId}-${isRemote ? 'remote' : 'server'}`

      if (fileManagerRef.current || activeFileManagers.get(deviceKey)) {
        console.log(`[FileManager] Device ${deviceKey} already has active file manager, skipping`)
        return
      }
      
      console.log(`[FileManager] Initializing file manager for device ${deviceKey}`)
      activeFileManagers.set(deviceKey, true)
      
      isInitializing = true
      initializingRef.current = true
      
      let initSucceeded = false

      try {
        setLoading(true)
        setConnectionState('connecting')

        // Small delay to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 100))

        // For remote file operations, we need:
        // 1. MeshControlClient (control.ashx) for authentication and session management
        // 2. MeshCentralFileManager (meshrelay.ashx) for actual file operations
        console.log('[FileManager] Setting up control client for authentication...')
        
        const controlClient = new MeshControlClient()
        controlClientRef.current = controlClient
        
        if (token.cancelled) {
          console.log('[FileManager] Initialization cancelled before creating file manager')
          controlClient.close()
          controlClientRef.current = null
          activeFileManagers.delete(deviceKey)
          return
        }
        
        // Create file manager instance
        console.log('[FileManager] Creating file manager with:', {
          nodeId: meshcentralAgentId,
          isRemote
        })
        
        const fileManager = new MeshCentralFileManager({
          nodeId: meshcentralAgentId,
          isRemote,
          consent: 0, // No consent required for file operations
          controlClient,
          onStateChange: (state) => {
            console.log('[FileManager] State changed:', state)
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
              console.log('[FileManager Hook] Directory changed:', {
                entriesCount: entries.length,
                currentPath: fileManager.getCurrentPath(),
                firstEntry: entries[0]
              })
              const items = convertFileEntriesToItems(entries, fileManager.getCurrentPath())
              console.log('[FileManager Hook] Converted items:', {
                itemsCount: items.length,
                firstItem: items[0]
              })
              setFiles(items)
              setCurrentPath(fileManager.getCurrentPath())
            }
          },
          onTransferProgress: (progress: FileTransferProgress) => {
            if (mounted) {
              if (progress.file.includes('upload')) {
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
          console.log('[FileManager] Initialization cancelled before connect attempt')
          fileManager.disconnect()
          controlClient.close()
          controlClientRef.current = null
          fileManagerRef.current = null
          activeFileManagers.delete(deviceKey)
          return
        }

        // Connect to file system
        await fileManager.connect()
        if (token.cancelled) {
          console.log('[FileManager] Initialization cancelled after connect attempt')
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
      console.log(`[FileManager] Cleanup called for device ${deviceKey}`)
      
      mounted = false
      isInitializing = false
      initializingRef.current = false
      activeFileManagers.delete(deviceKey)
      
      if (fileManagerRef.current) {
        console.log('[FileManager] Disconnecting existing file manager')
        fileManagerRef.current.disconnect()
        fileManagerRef.current = null
      }
      
      if (controlClientRef.current) {
        console.log('[FileManager] Disconnecting control client')
        controlClientRef.current.close()
        controlClientRef.current = null
      }
    }
  }, [meshcentralAgentId, isRemote])

  // Navigation actions
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

  // File operations
  const createFolder = useCallback(async (name: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      setLoading(true)
      await fileManager.createFolder(name)
      toast({
        title: 'Folder Created',
        description: `Created folder "${name}"`,
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Create Folder Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const deleteItems = useCallback(async (fileIds: string[]) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      setLoading(true)
      // Extract file names from IDs (last part of path)
      const names = fileIds.map(id => id.split('/').pop() || '')
      await fileManager.deleteItems(names, true)
      
      toast({
        title: 'Items Deleted',
        description: `Deleted ${names.length} item(s)`,
        variant: 'success'
      })
      setSelectedFiles([])
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const renameItem = useCallback(async (oldName: string, newName: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      setLoading(true)
      await fileManager.rename(oldName, newName)
      toast({
        title: 'Item Renamed',
        description: `Renamed "${oldName}" to "${newName}"`,
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Rename Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const uploadFile = useCallback(async (file: File) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      toast({
        title: 'Upload Started',
        description: `Uploading ${file.name}`,
        variant: 'info'
      })
      
      await fileManager.uploadFile(file)
      
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${file.name}`,
        variant: 'success'
      })
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
      
      toast({
        title: 'Download Started',
        description: `Downloading ${fileName}`,
        variant: 'info'
      })
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
      setLoading(true)
      const names = fileIds.map(id => id.split('/').pop() || '')
      await fileManager.copyFiles(names, destinationPath)
      toast({
        title: 'Files Copied',
        description: `Copied ${names.length} item(s)`,
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const moveFiles = useCallback(async (fileIds: string[], destinationPath: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      setLoading(true)
      const names = fileIds.map(id => id.split('/').pop() || '')
      await fileManager.moveFiles(names, destinationPath)
      toast({
        title: 'Files Moved',
        description: `Moved ${names.length} item(s)`,
        variant: 'success'
      })
      setSelectedFiles([])
    } catch (error) {
      toast({
        title: 'Move Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const searchFiles = useCallback(async (query: string) => {
    const fileManager = fileManagerRef.current
    if (!fileManager || !fileManager.isConnected()) return

    try {
      setLoading(true)
      const results = await fileManager.searchFiles(query)
      const items = convertFileEntriesToItems(results, currentPath)
      setFiles(items)
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: (error as Error).message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [currentPath, toast])

  // Selection actions
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

  // Handle file actions from context menu
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
        
      default:
        console.warn('Unhandled file action:', action)
    }
  }, [selectedFiles, downloadFile, deleteItems, createFolder, renameItem])

  return {
    files,
    currentPath,
    selectedFiles,
    connectionState,
    loading,
    uploadProgress,
    downloadProgress,
    navigateToPath,
    navigateUp,
    navigateInto,
    createFolder,
    deleteItems,
    renameItem,
    uploadFile,
    downloadFile,
    copyFiles,
    moveFiles,
    searchFiles,
    selectFile,
    selectAll,
    handleFileAction
  }
}