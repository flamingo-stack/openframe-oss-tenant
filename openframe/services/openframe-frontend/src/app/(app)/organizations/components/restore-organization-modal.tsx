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

interface RestoreOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function RestoreOrganizationModal({ open, onOpenChange, onConfirm, isPending }: RestoreOrganizationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-[600px] gap-6">
        <AlertDialogHeader className="gap-0">
          <AlertDialogTitle className="text-h2 text-ods-text-primary">Restore Organization</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-h4 text-ods-text-primary">
          This organization will be moved back to your active workspace.
        </AlertDialogDescription>
        <AlertDialogFooter className="gap-4">
          <AlertDialogCancel
            disabled={isPending}
            className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 bg-[#ffc008] text-ods-bg text-h3 px-4 py-3 rounded-[6px] hover:bg-[#ffc008]/90 inline-flex items-center justify-center gap-2"
          >
            {isPending && <Loading01Icon size={20} className="animate-spin" />}
            {isPending ? 'Restoring...' : 'Restore Organization'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
