'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface RestoreScriptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

/** Confirmation for restoring an archived script back to ACTIVE. */
export function RestoreScriptModal({ open, onOpenChange, onConfirm, isPending }: RestoreScriptModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Restore Script"
      description="This script will be moved back to your active scripts."
      confirmLabel="Restore Script"
      cancelLabel="Cancel"
      pendingLabel="Restoring..."
      variant="default"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
