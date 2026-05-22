'use client';

import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';

interface ConfirmDeleteMonitoringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: 'policy' | 'query';
  onConfirm: () => void;
}

export function ConfirmDeleteMonitoringModal({
  open,
  onOpenChange,
  itemName,
  itemType,
  onConfirm,
}: ConfirmDeleteMonitoringModalProps) {
  const itemTypeLabel = itemType.charAt(0).toUpperCase() + itemType.slice(1);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Deletion"
      description={
        <>
          Are you sure you want to delete the <span className="text-ods-error">{itemName}</span> {itemType}? This action
          cannot be undone.
        </>
      }
      confirmLabel={`Delete ${itemTypeLabel}`}
      onConfirm={onConfirm}
    />
  );
}
