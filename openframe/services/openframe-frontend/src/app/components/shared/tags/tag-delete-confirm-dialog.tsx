'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface TagDeleteConfirmDialogProps {
  open: boolean;
  tagName?: string;
  /** Singular entity the tag attaches to, e.g. "ticket" or "article". */
  entityLabel: string;
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Shared confirmation for deleting a tag entity globally. The copy only varies by
 * the entity the tag attaches to, so callers just pass `entityLabel`.
 */
export function TagDeleteConfirmDialog({
  open,
  tagName,
  entityLabel,
  isPending = false,
  onConfirm,
  onClose,
}: TagDeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose();
      }}
      title="Delete Tag"
      description={
        <>
          Delete the tag <span className="text-ods-text-primary font-medium">{tagName}</span>? This removes it from
          every {entityLabel} and can't be undone.
        </>
      }
      confirmLabel="Delete Tag"
      pendingLabel="Deleting..."
      variant="destructive"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
