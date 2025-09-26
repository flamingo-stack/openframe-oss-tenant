'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button, Label } from '@flamingo/ui-kit'
import { Input } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'

interface EditSsoConfigModalProps {
  isOpen: boolean
  onClose: () => void
  providerKey: string
  providerDisplayName: string
  initialClientId?: string | null
  initialClientSecret?: string | null
  onSubmit: (data: { clientId: string; clientSecret: string }) => Promise<void>
}

export function EditSsoConfigModal({ isOpen, onClose, providerKey, providerDisplayName, initialClientId, initialClientSecret, onSubmit }: EditSsoConfigModalProps) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      setClientId(initialClientId || '')
      setClientSecret(initialClientSecret || '')
    }
  }, [isOpen, initialClientId, initialClientSecret])

  const canSubmit = useMemo(() => clientId.trim().length > 0 && clientSecret.trim().length > 0, [clientId, clientSecret])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      await onSubmit({ clientId: clientId.trim(), clientSecret: clientSecret.trim() })
      toast({ title: 'SSO updated', description: `${providerDisplayName} configuration saved`, variant: 'success' })
      onClose()
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Failed to update SSO configuration', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full max-w-[720px] flex flex-col p-10 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[32px] tracking-[-0.8px] text-ods-text-primary">
            Edit SSO Configuration
          </h2>
          <Button onClick={onClose} variant="ghost" className="text-ods-text-secondary hover:text-white p-1">
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Provider (read-only) */}
        <div className="flex flex-col gap-2">
          <Label className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">OAuth Provider</Label>
          <div className="bg-ods-card border border-ods-border rounded-[6px] h-14 px-4 flex items-center text-ods-text-secondary">
            {providerDisplayName}
          </div>
        </div>

        {/* Client ID */}
        <div className="flex flex-col gap-2">
          <Label className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">OAuth Client ID</Label>
          <Input
            placeholder="Enter OAuth Client ID"
            value={clientId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientId(e.target.value)}
            className="h-14"
          />
        </div>

        {/* Client Secret */}
        <div className="flex flex-col gap-2">
          <Label className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">Client Secret</Label>
          <Input
            type="password"
            placeholder="Enter Client Secret"
            value={clientSecret}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSecret(e.target.value)}
            className="h-14"
          />
        </div>

        {/* Footer */}
        <div className="flex gap-6 pt-2">
          <Button onClick={onClose} className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface transition-colors">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="flex-1 bg-ods-accent text-text-on-accent font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ods-accent-hover transition-colors">
            Update Configuration
          </Button>
        </div>
      </div>
    </div>
  )
}


