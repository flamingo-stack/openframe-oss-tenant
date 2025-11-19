'use client'

import React from 'react'
import { X } from 'lucide-react'
import { Button, StatusTag } from '@flamingo/ui-kit/components/ui'
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
  if (!isOpen) return null
  
  const isMicrosoft = providerKey.toLowerCase() === 'microsoft'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full max-w-[720px] flex flex-col p-10 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[32px] tracking-[-0.8px] text-ods-text-primary">
            Configuration Details
          </h2>
          <Button onClick={onClose} variant="ghost" className="text-ods-text-secondary hover:text-white p-1">
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Provider title and status */}
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

        {/* Footer */}
        <div className="flex gap-6 pt-2">
          <Button onClick={onClose} className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface transition-colors">
            Cancel
          </Button>
          {status.label?.toUpperCase() === 'ACTIVE' ? (
            <Button
              onClick={() => onToggle(false)}
              variant="outline"
              className="flex-1 border-error text-error font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px]"
            >
              Disable
            </Button>
          ) : (
            <Button
              onClick={() => onToggle(true)}
              className="flex-1 bg-ods-accent text-text-on-accent font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-accent-hover transition-colors"
            >
              Enable
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}


