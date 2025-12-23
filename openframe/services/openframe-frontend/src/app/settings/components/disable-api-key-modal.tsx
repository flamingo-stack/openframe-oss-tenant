'use client'

import React from 'react'
import { Button, Modal, ModalHeader, ModalTitle, ModalFooter } from '@flamingo-stack/openframe-frontend-core'

interface DisableApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  apiKeyName?: string
  onConfirm: () => Promise<void>
}

export function DisableApiKeyModal({ isOpen, onClose, apiKeyName, onConfirm }: DisableApiKeyModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>Confirm Disabling</ModalTitle>
        <p className="text-ods-text-secondary text-sm mt-1">
          This action will deactivate the API key
        </p>
      </ModalHeader>

      <div className="px-6 py-4">
        <p className="text-ods-text-primary">
          Are you sure you want to deactivate <span className="text-error font-semibold">{apiKeyName || 'this API Key'}</span>? This key will stop working until you reactivate it.
        </p>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="outline" className="border-error text-error hover:bg-error/10">
          Disable API Key
        </Button>
      </ModalFooter>
    </Modal>
  )
}


