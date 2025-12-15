'use client'

import React, { useEffect } from 'react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Button,
  Input
} from '@flamingo-stack/openframe-frontend-core/components/ui'

interface NewFolderModalProps {
  isOpen: boolean
  folderName: string
  submitting: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onClose: () => void
}

export function NewFolderModal({
  isOpen,
  folderName,
  submitting,
  onChange,
  onSubmit,
  onClose
}: NewFolderModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !submitting && folderName.trim()) {
        event.preventDefault()
        onSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, submitting, folderName, onSubmit])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <ModalTitle>Create New Folder</ModalTitle>
      </ModalHeader>
      <ModalContent className="px-6 py-4 space-y-3">
        <p className="text-sm text-ods-text-secondary">
          Enter a name for the new folder.
        </p>
        <Input
          value={folderName}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Folder name"
          autoFocus
          disabled={submitting}
        />
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSubmit} disabled={!folderName.trim() || submitting}>
          {submitting ? 'Creating...' : 'Create'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

