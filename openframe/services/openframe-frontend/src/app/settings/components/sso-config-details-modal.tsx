'use client'

import React from 'react'
import { Button, StatusTag, Modal, ModalHeader, ModalTitle, ModalFooter, Label, Input } from '@flamingo/ui-kit/components/ui'
import { getProviderIcon } from '../utils/get-provider-icon'

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <div className="flex items-center gap-3">
          {getProviderIcon(providerKey)}
          <ModalTitle>Configuration Details</ModalTitle>
        </div>
        <p className="text-ods-text-secondary text-sm mt-1">
          View {providerDisplayName} OAuth configuration
        </p>
      </ModalHeader>

      <div className="px-6 py-4 space-y-4">
        {/* Provider Name and Status */}
        <div className="flex items-center justify-between pb-2 border-b border-ods-border">
          <span className="text-lg font-semibold text-ods-text-primary">{providerDisplayName}</span>
          <StatusTag label={status.label} variant={status.variant} />
        </div>

        {/* Details Card */}
        <div className="space-y-2">
          <Label>OAuth Provider</Label>
          <Input value={providerDisplayName} disabled className="bg-ods-card" />
        </div>

        <div className="space-y-2">
          <Label>OAuth Client ID</Label>
          <Input value={clientId || '—'} disabled className="bg-ods-card" />
        </div>

        <div className="space-y-2">
          <Label>Client Secret</Label>
          <Input value="********" disabled className="bg-ods-card" />
        </div>

        {isMicrosoft && (
          <div className="space-y-2">
            <Label>Tenant ID</Label>
            <Input value={msTenantId || 'Multi-tenant'} disabled className="bg-ods-card" />
          </div>
        )}
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


