'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface ConfirmRevokeInvitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmRevokeInvitationModal({
  open,
  onOpenChange,
  userEmail,
  onConfirm,
}: ConfirmRevokeInvitationModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Revoke Invitation"
      description={
        <>
          This will permanently delete the invitation for <span className="text-ods-error">{userEmail}</span>. The user
          will no longer be able to register using this invite.
        </>
      }
      confirmLabel="Revoke Invitation"
      onConfirm={onConfirm}
    />
  );
}
