'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { Button, Label, Modal, ModalHeader, ModalTitle, ModalFooter, CheckboxWithDescription, AllowedDomainsInput } from '@flamingo/ui-kit'
import { Input } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'
import { validateEmailDomain } from '@flamingo/ui-kit/utils'
import { runtimeEnv } from '@lib/runtime-config'
import { getProviderIcon } from '../utils/get-provider-icon'
import { featureFlags } from '@/src/lib/feature-flags'

// Feature flag: enabled by default, can disable with env var
const isDomainAllowlistEnabled = featureFlags.ssoAutoAllow.enabled();

interface SsoConfigModalProps {
  isOpen: boolean
  onClose: () => void
  providerKey: string
  providerDisplayName: string
  isEnabled?: boolean
  initialClientId?: string | null
  initialClientSecret?: string | null
  initialMsTenantId?: string | null
  initialAutoProvisionUsers?: boolean
  initialAllowedDomains?: string[]
  onSubmit?: (data: {
    clientId: string
    clientSecret: string
    msTenantId?: string | null
    autoProvisionUsers?: boolean
    allowedDomains?: string[]
  }) => Promise<void>
  onDisable?: () => Promise<void>
}

export function SsoConfigModal({
  isOpen,
  onClose,
  providerKey,
  providerDisplayName,
  isEnabled,
  initialClientId,
  initialClientSecret,
  initialMsTenantId,
  initialAutoProvisionUsers,
  initialAllowedDomains,
  onSubmit,
  onDisable
}: SsoConfigModalProps) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [isSingleTenant, setIsSingleTenant] = useState(false)
  const [msTenantId, setMsTenantId] = useState('')
  const [autoProvisionUsers, setAutoProvisionUsers] = useState(false)
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [domainError, setDomainError] = useState<string | null>(null)
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
      setAutoProvisionUsers(initialAutoProvisionUsers || false)
      setAllowedDomains(initialAllowedDomains || [])
      setDomainError(null)
      setShowSecret(false)
    }
  }, [isOpen, initialClientId, initialClientSecret, initialMsTenantId, initialAutoProvisionUsers, initialAllowedDomains])

  const canSubmit = useMemo(() => {
    const hasBasicFields = clientId.trim().length > 0 && clientSecret.trim().length > 0
    if (isMicrosoft && isSingleTenant) {
      if (!hasBasicFields || msTenantId.trim().length === 0) return false
    }
    if (!hasBasicFields) return false
    // If auto-provision is enabled, require at least one domain
    if (isDomainAllowlistEnabled && autoProvisionUsers && allowedDomains.length === 0) {
      return false
    }
    return true
  }, [clientId, clientSecret, isMicrosoft, isSingleTenant, msTenantId, autoProvisionUsers, allowedDomains])

  const handleSubmit = async () => {
    if (!canSubmit || !onSubmit) return
    setIsSubmitting(true)
    try {
      const data: {
        clientId: string
        clientSecret: string
        msTenantId?: string | null
        autoProvisionUsers?: boolean
        allowedDomains?: string[]
      } = {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      }
      if (isMicrosoft) {
        data.msTenantId = isSingleTenant && msTenantId.trim() ? msTenantId.trim() : null
      }
      if (isDomainAllowlistEnabled) {
        data.autoProvisionUsers = autoProvisionUsers
        data.allowedDomains = autoProvisionUsers ? allowedDomains : []
      }
      await onSubmit(data)
      toast({ title: 'SSO Enabled', description: `${providerDisplayName} configuration saved and enabled`, variant: 'success' })
      onClose()
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Failed to update SSO configuration', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDisable = async () => {
    if (!onDisable) return
    setIsSubmitting(true)
    try {
      await onDisable()
      toast({
        title: 'SSO Disabled',
        description: `${providerDisplayName} has been disabled`,
        variant: 'success'
      })
      onClose()
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Failed to disable SSO',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={isDomainAllowlistEnabled ? "max-w-5xl w-full" : "max-w-2xl w-full"}>
      <ModalHeader>
        <div className="flex items-center gap-3">
          {getProviderIcon(providerKey)}
          <ModalTitle>Edit SSO Configuration</ModalTitle>
        </div>
        <p className="text-ods-text-secondary text-sm mt-1">
          Configure OAuth credentials for {providerDisplayName}
        </p>
      </ModalHeader>

      {/* 2-Column Layout when domain allowlist is enabled, single column otherwise */}
      <div className="px-6 py-4">
        <div className={isDomainAllowlistEnabled ? "grid grid-cols-1 lg:grid-cols-2 gap-8" : ""}>
          {/* Left Column: SSO Configuration */}
          <div className="space-y-6">
            {/* Redirect URL Section */}
            <div className="bg-ods-card border border-ods-border rounded-lg p-4 space-y-3">
              <Label>Authorized redirect URL for your SSO provider settings:</Label>
              <div className="bg-ods-bg border border-ods-border rounded-lg p-3 flex items-center gap-3">
                <code className="flex-1 text-sm text-ods-text-primary font-mono truncate">
                  {redirectUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  centerIcon={<Copy className="h-4 w-4" />}
                  onClick={handleCopyRedirectUrl}
                />
              </div>
              <p className="text-sm text-ods-text-secondary">
                The callback URL must match exactly. Authentication will fail if not properly configured in your SSO provider.
              </p>
            </div>

            <div className="space-y-2">
              <Label>OAuth Client ID *</Label>
              <Input
                placeholder="Enter OAuth Client ID"
                value={clientId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientId(e.target.value)}
                className="bg-ods-card"
              />
            </div>

            <div className="space-y-2">
              <Label>Client Secret *</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder="Enter OAuth Client Secret"
                  value={clientSecret}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientSecret(e.target.value)}
                  className="bg-ods-card pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  centerIcon={showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20"
                />
              </div>
            </div>

            {/* Microsoft-specific: Single Tenant Configuration */}
            {isMicrosoft && (
              <div className="space-y-4">
                <CheckboxWithDescription
                  id="single-tenant"
                  checked={isSingleTenant}
                  onCheckedChange={(checked) => {
                    setIsSingleTenant(checked)
                    if (!checked) {
                      setMsTenantId('')
                    }
                  }}
                  title="Single Tenant"
                  description="Use single-tenant authentication for this provider"
                />

                {isSingleTenant && (
                  <div className="space-y-2">
                    <Label>Tenant ID *</Label>
                    <Input
                      placeholder="Enter Tenant ID"
                      value={msTenantId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMsTenantId(e.target.value)}
                      className="bg-ods-card"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Domain Allowlist */}
          {isDomainAllowlistEnabled && (
            <div className="space-y-4 lg:border-l lg:border-ods-border lg:pl-8">
              <h3 className="font-['DM_Sans'] font-semibold text-lg text-ods-text-primary">Domain Allowlist</h3>

              <CheckboxWithDescription
                id="auto-provision-users"
                checked={autoProvisionUsers}
                onCheckedChange={setAutoProvisionUsers}
                title="Auto-provision accounts from domain"
                description="Automatically create user accounts when signing in via this SSO provider."
              />

              {autoProvisionUsers && (
                <AllowedDomainsInput
                  value={allowedDomains}
                  onChange={setAllowedDomains}
                  onValidate={(domain) => {
                    const validation = validateEmailDomain(domain)
                    return {
                      valid: validation.valid,
                      error: validation.error,
                      cleanedDomain: validation.cleanedDomain
                    }
                  }}
                  label="Allowed Domains"
                  placeholder="openframe.com"
                  disabled={isSubmitting}
                  error={domainError}
                  helperText="Users with email addresses from these domains can log in via SSO without registration."
                />
              )}
            </div>
          )}
        </div>
      </div>

      <ModalFooter className="justify-between">
        {isEnabled && onDisable ? (
          <Button
            onClick={handleDisable}
            variant="outline"
            className="border-error text-error"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Disabling...' : 'Disable'}
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save & Enable'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}

// Re-export with old name for backwards compatibility
export { SsoConfigModal as EditSsoConfigModal }
