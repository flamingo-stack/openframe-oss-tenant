'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface ArchiveScriptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

/** Confirmation for archiving a script (status → ARCHIVED). Reversible via Restore. */
export function ArchiveScriptModal({ open, onOpenChange, onConfirm, isPending }: ArchiveScriptModalProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Archive Script"
      description="This script will be moved to Archived Scripts. It won't appear in your active scripts, but you can restore it at any time."
      confirmLabel="Archive Script"
      cancelLabel="Cancel"
      pendingLabel="Archiving..."
      variant="destructive"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
