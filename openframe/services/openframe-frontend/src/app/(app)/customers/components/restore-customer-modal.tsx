'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface RestoreCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function RestoreCustomerModal({ open, onOpenChange, onConfirm, isPending }: RestoreCustomerModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Restore Customer"
      description="This customer will be moved back to your active workspace."
      confirmLabel="Restore Customer"
      pendingLabel="Restoring..."
      variant="default"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
