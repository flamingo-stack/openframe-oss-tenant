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
} from '@flamingo-stack/openframe-frontend-core';

interface ArchiveDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  onConfirm: () => void;
  isArchiving: boolean;
}

export function ArchiveDeviceDialog({
  open,
  onOpenChange,
  deviceName,
  onConfirm,
  isArchiving,
}: ArchiveDeviceDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-8 max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.5px] text-ods-text-primary">
            Archive Device
          </AlertDialogTitle>
          <AlertDialogDescription className="font-['DM_Sans'] text-[16px] leading-[24px] text-ods-text-secondary mt-2">
            Are you sure you want to archive <span className="text-ods-accent font-medium">{deviceName}</span>? This
            device will be hidden from the default view but can be restored later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-4 flex-col md:flex-row">
          <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary hover:bg-ods-bg-hover font-['DM_Sans'] font-bold text-[16px] h-12 rounded-[6px]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isArchiving}
            className="flex-1 bg-ods-accent text-black hover:bg-ods-accent/90 font-['DM_Sans'] font-bold text-[16px] h-12 rounded-[6px]"
          >
            {isArchiving ? 'Archiving...' : 'Archive Device'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
