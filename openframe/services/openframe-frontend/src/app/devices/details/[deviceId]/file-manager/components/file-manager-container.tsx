'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DetailPageContainer } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { FileManager, FileManagerSkeleton } from '@flamingo-stack/openframe-frontend-core/components/ui/file-manager'
import { Progress, Button } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useMeshFileManager } from '../../../../hooks/use-mesh-file-manager'
import type { FileItem, FileAction } from '@flamingo-stack/openframe-frontend-core/components/ui/file-manager'
import { NewFolderModal } from './new-folder-modal'
import { RenameItemModal } from './rename-item-modal'
import { DeleteConfirmationModal } from './delete-confirmation-modal'

interface FileManagerContainerProps {
  deviceId: string
  meshcentralAgentId: string
  hostname?: string
  organizationName?: string
}

export function FileManagerContainer({
  deviceId,
  meshcentralAgentId,
  hostname
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
    isSearching,
    isSearchActive,
    uploadProgress,
    downloadProgress,
    clipboard,
    navigateToPath,
    navigateInto,
    createFolder,
    deleteItems,
    renameItem,
    uploadFile,
    downloadFile,
    cancelDownload,
    cancelUpload,
    cancelSearch,
    searchFiles,
    copyToClipboard,
    cutFiles,
    pasteFiles,
    clearClipboard,
    selectFile,
    selectAll,
    handleFileAction: handleAction
  } = useMeshFileManager({
    meshcentralAgentId,
    isRemote: true
  })

  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isNewFolderSubmitting, setIsNewFolderSubmitting] = useState(false)

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false)
  const [renameContext, setRenameContext] = useState<{ oldName: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [isRenameSubmitting, setIsRenameSubmitting] = useState(false)

  const [deleteContext, setDeleteContext] = useState<{ fileIds: string[] } | null>(null)

  const showFileManagerSkeleton = connectionState === 'disconnected' || (connectionState === 'connecting' && files.length === 0)
  const handleBackToDevice = useCallback(() => {
    router.push(`/devices/details/${deviceId}`)
  }, [router, deviceId])

  const handleNavigate = useCallback((path: string) => {
    navigateToPath(path)
    setSearchQuery('')
  }, [navigateToPath])

  const handleBreadcrumbClick = useCallback((path: string) => {
    navigateToPath(path)
    setSearchQuery('')
  }, [navigateToPath])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query) {
      searchFiles(query)
    } else {
      if (isSearchActive()) {
        void cancelSearch()
      }
      navigateToPath(currentPath)
    }
  }, [searchFiles, navigateToPath, currentPath, cancelSearch, isSearchActive])

  const handleSelectFile = useCallback((fileId: string, selected: boolean) => {
    selectFile(fileId, selected)
  }, [selectFile])

  const handleSelectAll = useCallback((selected: boolean) => {
    selectAll(selected)
  }, [selectAll])

  const handleFolderOpen = useCallback((file: FileItem) => {
    if (file.type === 'folder') {
      navigateInto(file.name)
      setSearchQuery('')
    }
  }, [navigateInto])

  const handleFileClick = useCallback((file: FileItem) => {
    if (file.path) {
      const pathParts = file.path.split(/[/\\]/)
      pathParts.pop()
      const directoryPath = pathParts.join(file.path.includes('\\') ? '\\' : '/')

      navigateToPath(directoryPath || '/')
      setSearchQuery('')
    }
  }, [navigateToPath])

  const handleFileAction = useCallback(async (action: FileAction, fileId?: string) => {
    if (action === 'upload') {
      fileInputRef.current?.click()
    } else if (action === 'download' && fileId) {
      const fileName = fileId.split('/').pop() || fileId
      downloadFile(fileName)
    } else if (action === 'rename' && fileId) {
      const fileName = fileId.split('/').pop() || ''
      setRenameContext({ oldName: fileName })
      setRenameValue(fileName)
      setIsRenameModalOpen(true)
    } else if (action === 'delete') {
      const targetFiles = fileId ? [fileId] : selectedFiles
      if (targetFiles.length > 0) {
        setDeleteContext({ fileIds: targetFiles })
      }
    } else if (action === 'new-folder') {
      setNewFolderName('')
      setIsNewFolderModalOpen(true)
    } else {
      await handleAction(action, fileId)
    }
  }, [handleAction, selectedFiles, downloadFile])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await uploadFile(file)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [uploadFile])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && selectedFiles.length > 0) {
        event.preventDefault()
        copyToClipboard()
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'x' && selectedFiles.length > 0) {
        event.preventDefault()
        cutFiles()
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && clipboard) {
        event.preventDefault()
        pasteFiles()
      }

      if (event.key === 'Delete' && selectedFiles.length > 0) {
        event.preventDefault()
        handleFileAction('delete')
      }

      if (event.key === 'Escape') {
        if (selectedFiles.length > 0) {
          selectAll(false)
        } else if (clipboard) {
          clearClipboard()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedFiles, clipboard, copyToClipboard, cutFiles, pasteFiles, clearClipboard, handleFileAction, selectAll])

  const closeNewFolderModal = useCallback(() => {
    if (isNewFolderSubmitting) return
    setIsNewFolderModalOpen(false)
    setNewFolderName('')
  }, [isNewFolderSubmitting])

  const closeRenameModal = useCallback(() => {
    if (isRenameSubmitting) return
    setIsRenameModalOpen(false)
    setRenameContext(null)
    setRenameValue('')
  }, [isRenameSubmitting])

  const handleCreateFolder = useCallback(async () => {
    const folderName = newFolderName.trim()
    if (!folderName) return
    setIsNewFolderSubmitting(true)
    try {
      await createFolder(folderName)
      closeNewFolderModal()
    } finally {
      setIsNewFolderSubmitting(false)
    }
  }, [newFolderName, createFolder, closeNewFolderModal])

  const handleRename = useCallback(async () => {
    if (!renameContext) return
    const nextName = renameValue.trim()
    if (!nextName) return
    if (nextName === renameContext.oldName) {
      closeRenameModal()
      return
    }
    setIsRenameSubmitting(true)
    try {
      await renameItem(renameContext.oldName, nextName)
      closeRenameModal()
    } finally {
      setIsRenameSubmitting(false)
    }
  }, [renameContext, renameValue, renameItem, closeRenameModal])

  const closeDeleteModal = useCallback(() => {
    setDeleteContext(null)
  }, [])

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteContext) return
    await deleteItems(deleteContext.fileIds)
    closeDeleteModal()
  }, [deleteContext, deleteItems, closeDeleteModal])

  return (
    <DetailPageContainer
      title={'File Manager'}
      subtitle={hostname || `Device ${deviceId}`}
      className='h-full'
      contentClassName='flex flex-col min-h-0 overflow-hidden'
      backButton={{
        label: 'Back to Device',
        onClick: handleBackToDevice
      }}
      padding='none'
    >
      <div className="flex flex-col flex-1 min-h-0">
        {showFileManagerSkeleton ? (
          <FileManagerSkeleton />
        ) : (
          <FileManager
            files={files}
            currentPath={currentPath}
            selectedFiles={selectedFiles}
            deviceName={hostname || `Device ${deviceId}`}
            searchQuery={searchQuery}
            loading={
              loading ||
              connectionState === 'connecting' ||
              connectionState === 'connected_to_server' ||
              (isSearching && files.length === 0) ||
              (searchQuery && files.length === 0 && isSearchActive()) ||
              (connectionState === 'connected_end_to_end' && currentPath === '' && files.length === 0 && !searchQuery)
            }
            isSearching={isSearching}
            showCheckboxes={true}
            showSearch={true}
            showActions={true}
            canPaste={clipboard !== null}
            disableSearch={currentPath === '/' || currentPath === ''}
            resultsCount={files.length}
            onNavigate={handleNavigate}
            onBreadcrumbClick={handleBreadcrumbClick}
            onSearch={handleSearch}
            onSelectFile={handleSelectFile}
            onSelectAll={handleSelectAll}
            onFileAction={handleFileAction}
            onFileClick={handleFileClick}
            onFolderOpen={handleFolderOpen}
            className="flex-1 min-h-0"
          />
        )}

        {/* Hidden file input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          multiple={false}
        />
      </div>

      {/* Upload progress */}
      {uploadProgress && (
        <div className="fixed bottom-4 right-4 bg-ods-card border border-ods-border rounded-lg p-4 shadow-lg w-80">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-ods-text-primary">
              Uploading: {uploadProgress.file}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelUpload}
              className="h-6 w-6 p-0 text-ods-text-secondary hover:text-ods-text-primary hover:bg-ods-bg-secondary"
            >
              x
            </Button>
          </div>
          <Progress value={uploadProgress.progress} className="h-2" indicatorClassName="bg-ods-accent" />
          <div className="mt-1 text-xs text-ods-text-secondary">
            {uploadProgress.progress}% complete
          </div>
        </div>
      )}

      {/* Download progress */}
      {downloadProgress && (
        <div className="fixed bottom-4 right-4 bg-ods-card border border-ods-border rounded-lg p-4 shadow-lg w-80">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-ods-text-primary">
              Downloading: {downloadProgress.file}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelDownload}
              className="h-6 w-6 p-0 text-ods-text-secondary hover:text-ods-text-primary hover:bg-ods-bg-secondary"
            >
              x
            </Button>
          </div>
          <Progress value={downloadProgress.progress} className="h-2" indicatorClassName="bg-ods-accent" />
          <div className="mt-1 text-xs text-ods-text-secondary">
            {downloadProgress.progress}% complete
          </div>
        </div>
      )}

      {/* Clipboard status indicator */}
      {clipboard && (
        <div className="fixed bottom-4 right-4 bg-ods-card border border-ods-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="text-sm text-ods-text-primary">
              {clipboard.fileIds.length} item(s) {clipboard.operation === 'copy' ? 'copied' : 'cut'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearClipboard}
              className="h-5 w-5 p-0 text-ods-text-secondary hover:text-ods-text-primary hover:bg-ods-bg-secondary"
            >
              x
            </Button>
          </div>
        </div>
      )}

      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        folderName={newFolderName}
        submitting={isNewFolderSubmitting}
        onChange={setNewFolderName}
        onSubmit={handleCreateFolder}
        onClose={closeNewFolderModal}
      />

      <RenameItemModal
        isOpen={isRenameModalOpen}
        value={renameValue}
        submitting={isRenameSubmitting}
        onChange={setRenameValue}
        onSubmit={handleRename}
        onClose={closeRenameModal}
      />

      <DeleteConfirmationModal
        isOpen={!!deleteContext}
        itemCount={deleteContext?.fileIds.length || 0}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirmed}
      />
    </DetailPageContainer>
  )
}