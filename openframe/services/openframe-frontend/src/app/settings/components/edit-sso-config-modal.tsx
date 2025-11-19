'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { Button, Label, Checkbox, Modal, ModalHeader, ModalTitle, ModalFooter } from '@flamingo/ui-kit'
import { Input } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'
import { runtimeEnv } from '@lib/runtime-config'
import { getProviderIcon } from '../utils/get-provider-icon'

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
  const [showSecret, setShowSecret] = useState(false)
  const { toast } = useToast()

  const isMicrosoft = providerKey.toLowerCase() === 'microsoft'

  const redirectUrl = useMemo(() => {
    const sharedHost = runtimeEnv.sharedHostUrl() || (typeof window !== 'undefined' ? window.location.origin : '')
    return `${sharedHost}/sas/login/oauth2/code/${providerKey.toLowerCase()}`
  }, [providerKey])
  
  const handleCopyRedirectUrl = async () => {
    try {
      await navigator.clipboard.writeText(redirectUrl)
      toast({
        title: 'Copied',
        description: 'Redirect URL copied to clipboard',
        variant: 'success',
        duration: 2000
      })
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy redirect URL',
        variant: 'destructive',
        duration: 3000
      })
    }
  }

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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <div className="flex items-center gap-3">
          {getProviderIcon(providerKey)}
          <ModalTitle>Edit SSO Configuration</ModalTitle>
        </div>
        <p className="text-ods-text-secondary text-sm mt-1">
          Configure OAuth credentials for {providerDisplayName}
        </p>
      </ModalHeader>

      <div className="p-6 space-y-4">
        {/* Redirect URL Section */}
        <div className="bg-ods-card border border-ods-border rounded-[6px] p-3 flex flex-col gap-2">
          <Label className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-primary">
            Authorized redirect URL for your SSO provider settings:
          </Label>
          <div className="bg-ods-bg border border-ods-border rounded-[6px] p-3 flex items-center gap-3">
            <span className="font-['DM_Sans'] font-medium text-[12px] leading-[16px] text-ods-text-primary flex-1 truncate">
              {redirectUrl}
            </span>
            <Button
              variant="ghost"
              size="sm"
              centerIcon={<Copy className="h-5 w-5" />}
              onClick={handleCopyRedirectUrl}
              className="text-ods-text-secondary hover:text-ods-text-primary h-0 !p-0"
            />
          </div>
          <p className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-primary">
            The callback URL must match exactly. Authentication will fail if not properly configured in your SSO provider.
          </p>
        </div>

        {/* Provider (read-only) */}
        <div className="flex flex-col gap-1">
          <Label className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-primary">OAuth Provider</Label>
          <div className="bg-ods-card border border-ods-border rounded-[6px] h-10 px-3 flex items-center text-[14px] text-ods-text-secondary">
            {providerDisplayName}
          </div>
        </div>

        {/* Client ID */}
        <div className="flex flex-col gap-1">
          <Label className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-primary">OAuth Client ID</Label>
          <Input
            placeholder="Enter OAuth Client ID"
            value={clientId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientId(e.target.value)}
            className="h-10 bg-ods-card border-ods-border text-[14px] font-['DM_Sans'] font-medium placeholder:text-ods-text-secondary"
          />
        </div>

        {/* Client Secret */}
        <div className="flex flex-col gap-1">
          <Label className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-primary">Client Secret</Label>
          <div className="relative flex items-center">
            <Input
              type={showSecret ? "text" : "password"}
              placeholder="Enter OAuth Client Secret"
              value={clientSecret}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSecret(e.target.value)}
              className="h-10 bg-ods-card border-ods-border text-[14px] font-['DM_Sans'] font-medium placeholder:text-ods-text-secondary pr-12"
            />
            <Button
              variant="ghost"
              size="sm"
              centerIcon={showSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 text-ods-text-secondary hover:text-ods-text-primary z-10 h-0 !p-0"
            />
          </div>
        </div>

        {/* Microsoft-specific: Single Tenant Configuration */}
        {isMicrosoft && (
          <>
            <div className="flex items-center gap-2">
              <Label htmlFor="single-tenant" className="font-['DM_Sans'] font-medium text-[14px] text-ods-text-primary">
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
              <div className="flex flex-col gap-1">
                <Label className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-primary">Tenant ID</Label>
                <Input
                  placeholder="Enter Tenant ID"
                  value={msTenantId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMsTenantId(e.target.value)}
                  className="h-10 bg-ods-card border-ods-border text-[14px] font-['DM_Sans'] font-medium placeholder:text-ods-text-secondary"
                />
              </div>
            )}
          </>
        )}
      </div>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Configuration'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}


