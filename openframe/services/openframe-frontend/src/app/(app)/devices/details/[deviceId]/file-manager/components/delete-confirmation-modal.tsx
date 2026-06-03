'use client';

import { useEffect } from 'react';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  itemCount: number;
  submitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmationModal({
  isOpen,
  itemCount,
  submitting = false,
  onConfirm,
  onClose,
}: DeleteConfirmationModalProps) {
  const title = itemCount === 1 ? 'Delete Item' : 'Delete Items';
  const description =
    itemCount === 1
      ? 'Are you sure you want to delete this item? This action cannot be undone.'
      : `Are you sure you want to delete ${itemCount} items? This action cannot be undone.`;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !submitting) {
        event.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onConfirm]);

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      confirmLabel="Delete"
      pendingLabel="Deleting..."
      variant="destructive"
      isPending={submitting}
      onConfirm={onConfirm}
    />
  );
}
