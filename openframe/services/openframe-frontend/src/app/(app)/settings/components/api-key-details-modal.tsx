'use client';

import { Button, Input, Label, ModalV2Title, Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { formatDateTime } from '@/lib/format-date';
import type { ApiKeyRecord } from '../hooks/use-api-keys';

interface ApiKeyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: ApiKeyRecord | null;
}

export function ApiKeyDetailsModal({ isOpen, onClose, apiKey }: ApiKeyDetailsModalProps) {
  if (!apiKey) return null;

  const fmt = (d: string | null | undefined) => (d ? formatDateTime(d) : '—');

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
      header={
        <>
          <ModalV2Title>API Key Details</ModalV2Title>
          <p className="text-ods-text-secondary text-h6 mt-1">View API key information and usage statistics</p>
        </>
      }
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {/* Name and Status */}
      <div className="flex items-center justify-between pb-2 border-b border-ods-border">
        <div>
          <div className="text-h3 font-semibold text-ods-text-primary">{apiKey.name}</div>
          <div className="text-h6 text-ods-text-secondary mt-1">{apiKey.description || '—'}</div>
        </div>
        <Tag label={apiKey.enabled ? 'ACTIVE' : 'INACTIVE'} variant={apiKey.enabled ? 'success' : 'grey'} />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Key ID</Label>
          <Input value={apiKey.id} disabled className="bg-ods-card" />
        </div>

        <div className="space-y-2">
          <Label>Created</Label>
          <Input value={fmt(apiKey.createdAt)} disabled className="bg-ods-card" />
        </div>

        <div className="space-y-2">
          <Label>Expires</Label>
          <Input value={fmt(apiKey.expiresAt)} disabled className="bg-ods-card" />
        </div>

        <div className="space-y-2">
          <Label>Total Requests</Label>
          <Input value={apiKey.totalRequests.toLocaleString()} disabled className="bg-ods-card" />
        </div>

        <div className="space-y-2">
          <Label>Successful Requests</Label>
          <Input value={apiKey.successfulRequests.toLocaleString()} disabled className="bg-ods-card" />
        </div>

        <div className="space-y-2">
          <Label>Failed Requests</Label>
          <Input value={apiKey.failedRequests.toLocaleString()} disabled className="bg-ods-card" />
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Last Used</Label>
          <Input value={fmt(apiKey.lastUsed)} disabled className="bg-ods-card" />
        </div>
      </div>
    </SimpleModal>
  );
}
