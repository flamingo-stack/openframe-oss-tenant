'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@flamingo-stack/openframe-frontend-core/components/ui';

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-[600px] gap-6">
        <AlertDialogHeader className="gap-0">
          <AlertDialogTitle className="text-h2 text-ods-text-primary">Resend Invitation</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-h4 text-ods-text-primary">
          This will send a new invitation to <span className="text-ods-warning">{userEmail}</span> and invalidate the
          previous one. The user must use the new invitation to register.
        </AlertDialogDescription>
        <AlertDialogFooter className="gap-4">
          <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 bg-ods-warning text-ods-bg text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-warning/90"
          >
            Resend Invitation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
