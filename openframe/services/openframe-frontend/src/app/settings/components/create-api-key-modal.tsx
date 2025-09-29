'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@flamingo/ui-kit'
import { Input, Label, Textarea } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'
import { X } from 'lucide-react'

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

  if (!isOpen) return null
  
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full max-w-[720px] flex flex-col p-10 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[32px] tracking-[-0.8px] text-ods-text-primary">{mode === 'edit' ? 'Edit API Key' : 'Create API Key'}</h2>
          <Button onClick={onClose} variant="ghost" className="text-ods-text-secondary hover:text-white p-1">
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-2">
          <Label className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">API Key Name</Label>
          <Input
            placeholder="Enter Name Here"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="h-14 bg-ods-card border-ods-border"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">Description</Label>
          <Textarea
            placeholder="Enter Description Here"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            className="h-32 rounded-lg border border-ods-border bg-ods-card text-ods-text-primary p-3"
          />
        </div>

        {/* Expiration */}
        <div className="flex flex-col gap-2">
          <Label className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">Expiration Date</Label>
          <div className="relative">
            <Input
              type="datetime-local"
              placeholder="Select Expiration Date"
              value={expiresAt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiresAt(e.target.value)}
              className="h-14 bg-ods-card border-ods-border pl-10"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-6 pt-2">
          <Button onClick={onClose} className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface transition-colors">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="flex-1 bg-ods-accent text-text-on-accent font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ods-accent-hover transition-colors">
            {mode === 'edit' ? 'Save Changes' : 'Create API Key'}
          </Button>
        </div>
      </div>
    </div>
  )
}


