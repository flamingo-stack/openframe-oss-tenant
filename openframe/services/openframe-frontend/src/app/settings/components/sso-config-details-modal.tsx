'use client'

import React from 'react'
import { Button, StatusTag, Modal, ModalHeader, ModalTitle, ModalFooter } from '@flamingo/ui-kit/components/ui'
import { MicrosoftIcon, GoogleLogo, SlackIcon } from '@flamingo/ui-kit/components/icons'
import { InfoRow } from '@flamingo/ui-kit'

interface SsoConfigDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  providerKey: string
  providerDisplayName: string
  status: { label: string; variant: 'success' | 'info' }
  clientId?: string | null
  clientSecret?: string | null
  msTenantId?: string | null
  onToggle: (enabled: boolean) => Promise<void>
}

export function SsoConfigDetailsModal({ isOpen, onClose, providerKey, providerDisplayName, status, clientId, clientSecret, msTenantId, onToggle }: SsoConfigDetailsModalProps) {
  const isMicrosoft = providerKey.toLowerCase() === 'microsoft'

  // Helper function to get provider icon
  const getProviderIcon = () => {
    const provider = providerKey.toLowerCase()
    const iconClass = "h-6 w-6 shrink-0"

    switch (provider) {
      case 'microsoft':
        return <MicrosoftIcon className={iconClass} />
      case 'google':
        return <GoogleLogo className={iconClass} />
      case 'slack':
        return <SlackIcon className={iconClass} />
      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <div className="flex items-center gap-3">
          {getProviderIcon()}
          <ModalTitle>Configuration Details</ModalTitle>
        </div>
        <p className="text-ods-text-secondary text-sm mt-1">
          View {providerDisplayName} OAuth configuration
        </p>
      </ModalHeader>

      <div className="p-6 space-y-4">
        {/* Provider and Status Row */}
        <div className="flex items-center justify-between">
          <div className="font-['DM_Sans'] font-bold text-[18px] text-ods-text-primary">
            {providerDisplayName}
          </div>
          <StatusTag label={status.label} variant={status.variant} />
        </div>

        {/* Details Card */}
        <div className="p-6 bg-ods-card border border-ods-border rounded-[6px] space-y-6">
          <InfoRow label="OAuth Provider" value={providerDisplayName} />
          <InfoRow label="OAuth Client ID" value={clientId || '—'} />
          <InfoRow label="Client Secret" value={'********'} />
          {isMicrosoft && (
            <InfoRow label="Tenant ID" value={msTenantId || 'Multi-tenant'} />
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {status.label?.toUpperCase() === 'ACTIVE' ? (
          <Button
            onClick={() => onToggle(false)}
            variant="outline"
            className="border-error text-error"
          >
            Disable
          </Button>
        ) : (
          <Button
            onClick={() => onToggle(true)}
          >
            Enable
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}


