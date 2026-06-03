'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface DisableApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeyName?: string;
  onConfirm: () => Promise<void>;
}

export function DisableApiKeyModal({ isOpen, onClose, apiKeyName, onConfirm }: DisableApiKeyModalProps) {
  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}
      title="Confirm Disabling"
      description={
        <>
          Are you sure you want to deactivate{' '}
          <span className="text-ods-error font-semibold">{apiKeyName || 'this API Key'}</span>? This key will stop
          working until you reactivate it.
        </>
      }
      confirmLabel="Disable API Key"
      variant="destructive"
      onConfirm={onConfirm}
    />
  );
}
