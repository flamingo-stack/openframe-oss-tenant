'use client';

import { Loading01Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
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

interface ArchiveOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canArchive: boolean;
  onConfirm: () => void;
  isPending?: boolean;
}

export function ArchiveOrganizationModal({
  open,
  onOpenChange,
  canArchive,
  onConfirm,
  isPending,
}: ArchiveOrganizationModalProps) {
  if (!canArchive) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-[600px] gap-6">
          <AlertDialogHeader className="gap-0">
            <AlertDialogTitle className="text-h2 text-ods-text-primary">Archive Unavailable</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-h4 text-ods-text-primary">
            This organization still has active devices. To archive it, you'll need to delete or archive all devices
            first.
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-[600px] gap-6">
        <AlertDialogHeader className="gap-0">
          <AlertDialogTitle className="text-h2 text-ods-text-primary">Archive Organization</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-h4 text-ods-text-primary">
          This organization and its configuration will be moved to Archives. It won't appear in your active workspace,
          but you can restore it at any time.
        </AlertDialogDescription>
        <AlertDialogFooter className="gap-4">
          <AlertDialogCancel
            disabled={isPending}
            className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface"
          >
            Close
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 bg-ods-error text-ods-bg text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-error/90 inline-flex items-center justify-center gap-2"
          >
            {isPending && <Loading01Icon size={20} className="animate-spin" />}
            {isPending ? 'Archiving...' : 'Archive Organization'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
