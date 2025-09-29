'use client'

import React from 'react'
import { Button, StatusTag, InfoRow } from '@flamingo/ui-kit/components/ui'
import { X } from 'lucide-react'
import type { ApiKeyRecord } from '../hooks/use-api-keys'

interface ApiKeyDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  apiKey: ApiKeyRecord | null
}

export function ApiKeyDetailsModal({ isOpen, onClose, apiKey }: ApiKeyDetailsModalProps) {
  if (!isOpen || !apiKey) return null

  const createdDate = new Date(apiKey.createdAt)
  const expiresDate = apiKey.expiresAt ? new Date(apiKey.expiresAt) : null
  const lastUsed = apiKey.lastUsed ? new Date(apiKey.lastUsed) : null
  const formatDateTime = (d: Date | null) => (d ? `${d.toLocaleDateString()} ${d.toLocaleTimeString()}` : '—')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full max-w-[840px] flex flex-col p-10 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[32px] tracking-[-0.8px] text-ods-text-primary">API Key Details</h2>
          <Button onClick={onClose} variant="ghost" className="text-ods-text-secondary hover:text-white p-1">
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Name and status */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-['DM_Sans'] font-semibold text-[22px] text-ods-text-primary">{apiKey.name}</div>
            <div className="font-['DM_Sans'] text-[16px] text-ods-text-secondary mt-1">{apiKey.description || '—'}</div>
          </div>
          <StatusTag label={apiKey.enabled ? 'ACTIVE' : 'INACTIVE'} variant={apiKey.enabled ? 'success' : 'info'} />
        </div>

        {/* Details */}
        <div className="bg-ods-card border border-ods-border rounded-[6px]">
          <div className="p-2 sm:p-4">
            <InfoRow label="Key ID" value={apiKey.id} />
          </div>
          <div className="p-2 sm:p-4">
            <InfoRow label="Created" value={formatDateTime(createdDate)} />
          </div>
          <div className="p-2 sm:p-4">
            <InfoRow label="Expires" value={formatDateTime(expiresDate)} />
          </div>
        </div>

        {/* Usage */}
        <div>
          <div className="font-['Azeret_Mono'] text-ods-text-secondary mb-3">USAGE STATISTICS</div>
          <div className="bg-ods-card border border-ods-border rounded-[6px]">
            <div className="p-2 sm:p-4">
              <InfoRow label="Total Requests" value={apiKey.totalRequests.toLocaleString()} />
            </div>
            <div className="p-2 sm:p-4">
              <InfoRow label="Successful Requests" value={apiKey.successfulRequests.toLocaleString()} />
            </div>
            <div className="p-2 sm:p-4">
              <InfoRow label="Failed Requests" value={apiKey.failedRequests.toLocaleString()} />
            </div>
            <div className="p-2 sm:p-4">
              <InfoRow label="Last Used" value={formatDateTime(lastUsed)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


