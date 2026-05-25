'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface ConfirmResendInvitationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmResendInvitationModal({
  open,
  onOpenChange,
  userEmail,
  onConfirm,
}: ConfirmResendInvitationModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resend Invitation"
      description={
        <>
          This will send a new invitation to <span className="text-ods-warning">{userEmail}</span> and invalidate the
          previous one. The user must use the new invitation to register.
        </>
      }
      confirmLabel="Resend Invitation"
      variant="warning"
      onConfirm={onConfirm}
    />
  );
}
