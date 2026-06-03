'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface EmailVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onSubmit: () => Promise<void>;
  isSending: boolean;
}

export function EmailVerificationModal({
  open,
  onOpenChange,
  userEmail,
  onSubmit,
  isSending,
}: EmailVerificationModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Email Not Verified"
      description={
        <>
          Your email <span className="text-ods-warning">{userEmail}</span> has not been verified yet. Would you like to
          resend the verification email?
        </>
      }
      confirmLabel="Resend Verification"
      pendingLabel="Sending..."
      variant="default"
      isPending={isSending}
      onConfirm={onSubmit}
    />
  );
}
