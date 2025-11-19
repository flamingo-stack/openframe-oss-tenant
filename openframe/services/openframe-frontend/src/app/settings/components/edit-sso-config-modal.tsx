'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button, Label, Checkbox } from '@flamingo/ui-kit'
import { Input } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'

interface EditSsoConfigModalProps {
  isOpen: boolean
  onClose: () => void
  providerKey: string
  providerDisplayName: string
  initialClientId?: string | null
  initialClientSecret?: string | null
  initialMsTenantId?: string | null
  onSubmit: (data: { clientId: string; clientSecret: string; msTenantId?: string | null }) => Promise<void>
}

export function EditSsoConfigModal({ isOpen, onClose, providerKey, providerDisplayName, initialClientId, initialClientSecret, initialMsTenantId, onSubmit }: EditSsoConfigModalProps) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [isSingleTenant, setIsSingleTenant] = useState(false)
  const [msTenantId, setMsTenantId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  const isMicrosoft = providerKey.toLowerCase() === 'microsoft'

  useEffect(() => {
    if (isOpen) {
      setClientId(initialClientId || '')
      setClientSecret(initialClientSecret || '')
      setMsTenantId(initialMsTenantId || '')
      setIsSingleTenant(!!initialMsTenantId)
    }
  }, [isOpen, initialClientId, initialClientSecret, initialMsTenantId])

  const canSubmit = useMemo(() => {
    const hasBasicFields = clientId.trim().length > 0 && clientSecret.trim().length > 0
    if (isMicrosoft && isSingleTenant) {
      return hasBasicFields && msTenantId.trim().length > 0
    }
    return hasBasicFields
  }, [clientId, clientSecret, isMicrosoft, isSingleTenant, msTenantId])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      const data: { clientId: string; clientSecret: string; msTenantId?: string | null } = {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      }
      if (isMicrosoft) {
        data.msTenantId = isSingleTenant && msTenantId.trim() ? msTenantId.trim() : null
      }
      await onSubmit(data)
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

        {/* Microsoft-specific: Single Tenant Configuration */}
        {isMicrosoft && (
          <>
            <div className="flex items-center gap-3">
              <Label htmlFor="single-tenant" className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">
                Single Tenant
              </Label>
              <Checkbox
                id="single-tenant"
                checked={isSingleTenant}
                onCheckedChange={(checked) => {
                  setIsSingleTenant(!!checked)
                  if (!checked) {
                    setMsTenantId('')
                  }
                }}
                className="border-ods-text-primary data-[state=checked]:bg-ods-accent data-[state=checked]:border-ods-accent"
              />
            </div>

            {isSingleTenant && (
              <div className="flex flex-col gap-2">
                <Label className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">Tenant ID</Label>
                <Input
                  placeholder="Enter Tenant ID"
                  value={msTenantId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMsTenantId(e.target.value)}
                  className="h-14"
                />
              </div>
            )}
          </>
        )}

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


