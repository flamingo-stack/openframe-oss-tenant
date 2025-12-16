'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button, Modal, ModalHeader, ModalTitle, ModalFooter } from '@flamingo-stack/openframe-frontend-core'
import { Input, Label, Textarea } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'

interface CreateApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (params: { apiKeyId: string; fullKey: string }) => Promise<void> | void
  create?: (data: { name: string; description?: string; expiresAt?: string | null }) => Promise<{ apiKey: any; fullKey: string }>
  // Edit mode
  mode?: 'create' | 'edit'
  initial?: { id: string; name: string; description?: string | null; expiresAt?: string | null }
  onUpdated?: (updated: { id: string }) => Promise<void> | void
  update?: (id: string, data: { name: string; description?: string; expiresAt?: string | null }) => Promise<any>
}

export function CreateApiKeyModal({ isOpen, onClose, onCreated, create, mode = 'create', initial, onUpdated, update }: CreateApiKeyModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!isOpen) {
      setName('')
      setDescription('')
      setExpiresAt('')
      setIsSubmitting(false)
    } else if (initial && mode === 'edit') {
      setName(initial.name || '')
      setDescription(initial.description || '')
      setExpiresAt(initial.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0,16) : '')
    }
  }, [isOpen])

  const canSubmit = useMemo(() => name.trim().length > 0, [name])

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }
      if (mode === 'edit' && initial && update) {
        const updated = await update(initial.id, payload)
        toast({ title: 'API Key updated', description: updated.name, variant: 'success' })
        await onUpdated?.({ id: updated.id })
        onClose()
      } else if (create && onCreated) {
        const result = await create(payload)
        toast({ title: 'API Key created', description: result.apiKey.name, variant: 'success' })
        await onCreated({ apiKeyId: result.apiKey.id, fullKey: result.fullKey })
        onClose()
      }
    } catch (e) {
      toast({ title: 'Create failed', description: e instanceof Error ? e.message : 'Unable to create API key', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>{mode === 'edit' ? 'Edit API Key' : 'Create API Key'}</ModalTitle>
        <p className="text-ods-text-secondary text-sm mt-1">
          {mode === 'edit' ? 'Update API key details' : 'Create a new API key for authentication'}
        </p>
      </ModalHeader>

      <div className="px-6 py-4 space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label>API Key Name *</Label>
          <Input
            placeholder="Enter Name Here"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="bg-ods-card"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Enter Description Here"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            rows={4}
            className="bg-ods-card"
          />
        </div>

        {/* Expiration */}
        <div className="space-y-2">
          <Label>Expiration Date (Optional)</Label>
          <Input
            type="datetime-local"
            placeholder="Select Expiration Date"
            value={expiresAt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiresAt(e.target.value)}
            className="bg-ods-card"
          />
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? 'Saving...' : (mode === 'edit' ? 'Save Changes' : 'Create API Key')}
        </Button>
      </ModalFooter>
    </Modal>
  )
}


