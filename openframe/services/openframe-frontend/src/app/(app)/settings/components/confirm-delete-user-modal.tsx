'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface ConfirmDeleteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDeleteUserModal({ open, onOpenChange, userName, onConfirm }: ConfirmDeleteUserModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Deletion"
      description={
        <>
          Confirm the deletion of the <span className="text-ods-error">{userName}</span> user. This user will no longer
          have access to the system.
        </>
      }
      confirmLabel="Delete User"
      onConfirm={onConfirm}
    />
  );
}
