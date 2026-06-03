'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface ArchiveCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canArchive: boolean;
  onConfirm: () => void;
  isPending?: boolean;
}

export function ArchiveCustomerModal({
  open,
  onOpenChange,
  canArchive,
  onConfirm,
  isPending,
}: ArchiveCustomerModalProps) {
  if (!canArchive) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-[600px] gap-6">
          <AlertDialogHeader className="gap-0">
            <AlertDialogTitle className="text-h2 text-ods-text-primary">Archive Unavailable</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-h4 text-ods-text-primary">
            This customer still has active devices. To archive it, you'll need to delete or archive all devices first.
          </AlertDialogDescription>
          <AlertDialogFooter className="gap-4">
            <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface">
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Archive Customer"
      description="This customer and its configuration will be moved to Archives. It won't appear in your active workspace, but you can restore it at any time."
      confirmLabel="Archive Customer"
      cancelLabel="Close"
      pendingLabel="Archiving..."
      variant="destructive"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
