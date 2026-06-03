'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface ConfirmRemoveInvitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmRemoveInvitationModal({
  open,
  onOpenChange,
  userEmail,
  onConfirm,
}: ConfirmRemoveInvitationModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove Invitation"
      description={
        <>
          This will permanently delete the expired invitation for <span className="text-ods-error">{userEmail}</span>{' '}
          from your list.
        </>
      }
      confirmLabel="Remove Invitation"
      onConfirm={onConfirm}
    />
  );
}
