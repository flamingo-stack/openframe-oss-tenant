'use client'

import React, { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileManager } from '@flamingo/ui-kit/components/ui/file-manager/file-manager'
import { Progress } from '@flamingo/ui-kit/components/ui'
import { useMeshFileManager } from '../hooks/use-mesh-file-manager'
import type { FileItem, FileAction } from '@flamingo/ui-kit/components/ui/file-manager/types'

interface FileManagerContainerProps {
  deviceId: string
  meshcentralAgentId: string
  hostname?: string
  organizationName?: string
}

export function FileManagerContainer({
  deviceId,
  meshcentralAgentId,
  hostname,
  organizationName
}: FileManagerContainerProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const {
    files,
    currentPath,
    selectedFiles,
    connectionState,
    loading,
    uploadProgress,
    downloadProgress,
    navigateToPath,
    navigateInto,
    createFolder,
    deleteItems,
    renameItem,
    uploadFile,
    downloadFile,
    searchFiles,
    selectFile,
    selectAll,
    handleFileAction: handleAction
  } = useMeshFileManager({
    meshcentralAgentId,
    isRemote: true
  })

  // Handle file navigation
  const handleNavigate = useCallback((path: string) => {
    navigateToPath(path)
  }, [navigateToPath])

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback((path: string) => {
    navigateToPath(path)
  }, [navigateToPath])

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query) {
      searchFiles(query)
    } else {
      // Refresh current directory when search is cleared
      navigateToPath(currentPath)
    }
  }, [searchFiles, navigateToPath, currentPath])

  // Handle file selection
  const handleSelectFile = useCallback((fileId: string, selected: boolean) => {
    selectFile(fileId, selected)
  }, [selectFile])

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    selectAll(selected)
  }, [selectAll])

  // Handle file click (download for files, navigate for folders)
  const handleFileClick = useCallback((file: FileItem) => {
    if (file.type === 'file') {
      downloadFile(file.name)
    }
  }, [downloadFile])

  // Handle folder open
  const handleFolderOpen = useCallback((file: FileItem) => {
    if (file.type === 'folder') {
      navigateInto(file.name)
    }
  }, [navigateInto])

  // Handle file actions
  const handleFileAction = useCallback(async (action: FileAction, fileId?: string) => {
    if (action === 'upload') {
      // Trigger file input for upload
      fileInputRef.current?.click()
    } else if (action === 'rename' && fileId) {
      // Extract file name from ID
      const fileName = fileId.split('/').pop() || ''
      const newName = prompt('Enter new name:', fileName)
      if (newName && newName !== fileName) {
        await renameItem(fileName, newName)
      }
    } else if (action === 'delete') {
      const targetFiles = fileId ? [fileId] : selectedFiles
      if (targetFiles.length > 0) {
        const confirmMsg = targetFiles.length === 1 
          ? 'Are you sure you want to delete this item?' 
          : `Are you sure you want to delete ${targetFiles.length} items?`
        
        if (confirm(confirmMsg)) {
          await deleteItems(targetFiles)
        }
      }
    } else if (action === 'new-folder') {
      const folderName = prompt('Enter folder name:')
      if (folderName) {
        await createFolder(folderName)
      }
    } else {
      // Handle other actions
      await handleAction(action, fileId)
    }
  }, [handleAction, selectedFiles, deleteItems, createFolder, renameItem])

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await uploadFile(file)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [uploadFile])

  // Device info for header
  const deviceInfo = organizationName 
    ? `${organizationName} • ${connectionState === 'connected_end_to_end' ? 'Connected' : 'Connecting...'}`
    : connectionState === 'connected_end_to_end' ? 'Connected' : 'Connecting...'

  return (
    <div className="h-full flex flex-col">
      <FileManager
        files={files}
        currentPath={currentPath}
        selectedFiles={selectedFiles}
        deviceName={hostname || `Device ${deviceId}`}
        deviceInfo={deviceInfo}
        searchQuery={searchQuery}
        loading={loading || connectionState === 'connecting'}
        showCheckboxes={true}
        showSearch={true}
        showActions={true}
        resultsCount={files.length}
        onNavigate={handleNavigate}
        onBreadcrumbClick={handleBreadcrumbClick}
        onSearch={handleSearch}
        onSelectFile={handleSelectFile}
        onSelectAll={handleSelectAll}
        onFileAction={handleFileAction}
        onFileClick={handleFileClick}
        onFolderOpen={handleFolderOpen}
        className="flex-1"
      />
      
      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileUpload}
        multiple={false}
      />
      
      {/* Upload progress */}
      {uploadProgress && (
        <div className="fixed bottom-4 right-4 bg-ods-card border border-ods-border rounded-lg p-4 shadow-lg w-80">
          <div className="mb-2 text-sm text-ods-text-primary">
            Uploading: {uploadProgress.file}
          </div>
          <Progress value={uploadProgress.progress} className="h-2" />
          <div className="mt-1 text-xs text-ods-text-secondary">
            {uploadProgress.progress}% complete
          </div>
        </div>
      )}
      
      {/* Download progress */}
      {downloadProgress && (
        <div className="fixed bottom-4 right-4 bg-ods-card border border-ods-border rounded-lg p-4 shadow-lg w-80">
          <div className="mb-2 text-sm text-ods-text-primary">
            Downloading: {downloadProgress.file}
          </div>
          <Progress value={downloadProgress.progress} className="h-2" />
          <div className="mt-1 text-xs text-ods-text-secondary">
            {downloadProgress.progress}% complete
          </div>
        </div>
      )}
    </div>
  )
}