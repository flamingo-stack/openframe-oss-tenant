'use client';

import {
  Button,
  Input,
  Label,
  Modal,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  StatusTag,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import React from 'react';
import type { ApiKeyRecord } from '../hooks/use-api-keys';

interface ApiKeyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: ApiKeyRecord | null;
}

export function ApiKeyDetailsModal({ isOpen, onClose, apiKey }: ApiKeyDetailsModalProps) {
  if (!apiKey) return null;

  const createdDate = new Date(apiKey.createdAt);
  const expiresDate = apiKey.expiresAt ? new Date(apiKey.expiresAt) : null;
  const lastUsed = apiKey.lastUsed ? new Date(apiKey.lastUsed) : null;
  const formatDateTime = (d: Date | null) => (d ? `${d.toLocaleDateString()} ${d.toLocaleTimeString()}` : '—');

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>API Key Details</ModalTitle>
        <p className="text-ods-text-secondary text-sm mt-1">View API key information and usage statistics</p>
      </ModalHeader>

      <div className="px-6 py-4 space-y-4">
        {/* Name and Status */}
        <div className="flex items-center justify-between pb-2 border-b border-ods-border">
          <div>
            <div className="text-lg font-semibold text-ods-text-primary">{apiKey.name}</div>
            <div className="text-sm text-ods-text-secondary mt-1">{apiKey.description || '—'}</div>
          </div>
          <StatusTag label={apiKey.enabled ? 'ACTIVE' : 'INACTIVE'} variant={apiKey.enabled ? 'success' : 'info'} />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Key ID</Label>
            <Input value={apiKey.id} disabled className="bg-ods-card" />
          </div>

          <div className="space-y-2">
            <Label>Created</Label>
            <Input value={formatDateTime(createdDate)} disabled className="bg-ods-card" />
          </div>

          <div className="space-y-2">
            <Label>Expires</Label>
            <Input value={formatDateTime(expiresDate)} disabled className="bg-ods-card" />
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
            <Input value={formatDateTime(lastUsed)} disabled className="bg-ods-card" />
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}
