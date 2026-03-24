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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-[600px] gap-6">
        <AlertDialogHeader className="gap-0">
          <AlertDialogTitle className="text-h2 text-ods-text-primary">Remove Invitation</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-h4 text-ods-text-primary">
          This will permanently delete the expired invitation for <span className="text-ods-error">{userEmail}</span>{' '}
          from your list.
        </AlertDialogDescription>
        <AlertDialogFooter className="gap-4">
          <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 bg-ods-error text-ods-bg text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-error/90"
          >
            Remove Invitation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
