'use client'

import React, { useEffect, useState } from 'react'
import { Button, Modal, ModalHeader, ModalTitle, ModalFooter, Label } from '@flamingo-stack/openframe-frontend-core'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { Alert, AlertDescription } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { AlertTriangleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons'

interface ApiKeyCreatedModalProps {
  isOpen: boolean
  fullKey: string | null
  onClose: () => void
}

export function ApiKeyCreatedModal({ isOpen, fullKey, onClose }: ApiKeyCreatedModalProps) {
  const { toast } = useToast()
  const [localKey, setLocalKey] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setLocalKey('')
    } else if (fullKey) {
      setLocalKey(fullKey)
    }
  }, [isOpen, fullKey])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localKey)
      toast({ title: 'Copied', description: 'API key copied to clipboard', variant: 'success' })
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy API key', variant: 'destructive' })
    }
  }

  if (!localKey) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>API Key Created</ModalTitle>
        <p className="text-ods-text-secondary text-sm mt-1">
          Save your API key securely
        </p>
      </ModalHeader>

      <div className="px-6 py-4 space-y-4">
        {/* Warning banner */}
        <Alert className="bg-ods-warning border-ods-warning text-ods-text-on-accent">
          <AlertTriangleIcon className="h-5 w-5" />
          <AlertDescription>
            This is the only time you'll see the complete API key. Please copy it and store it securely.
          </AlertDescription>
        </Alert>

        {/* Key display */}
        <div className="space-y-2">
          <Label>Your API Key</Label>
          <div className="bg-ods-bg border border-ods-border rounded-lg p-4">
            <code className="block text-sm font-mono text-ods-text-primary break-all">{localKey}</code>
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={handleCopy}>
          Copy API Key
        </Button>
        <Button onClick={onClose}>
          Continue
        </Button>
      </ModalFooter>
    </Modal>
  )
}


