'use client';

import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface RegenerateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeyName?: string;
  onConfirm: () => Promise<void>;
}

export function RegenerateApiKeyModal({ isOpen, onClose, apiKeyName, onConfirm }: RegenerateApiKeyModalProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) setLoading(false);
  }, [isOpen]);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}
      title="Confirm Regeneration"
      description={
        <>
          Are you sure you want to regenerate{' '}
          <span className="text-ods-warning font-semibold">{apiKeyName || 'this API Key'}</span>? The current key will
          stop working immediately.
        </>
      }
      confirmLabel="Regenerate API Key"
      pendingLabel="Regenerating..."
      variant="warning"
      isPending={loading}
      onConfirm={handleConfirm}
    />
  );
}
