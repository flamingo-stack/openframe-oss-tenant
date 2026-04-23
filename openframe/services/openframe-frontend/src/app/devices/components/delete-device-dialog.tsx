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
import { CommandBox } from '@flamingo-stack/openframe-frontend-core/components/features';
import { Copy02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { useCallback, useMemo } from 'react';
import { useReleaseVersion } from '../hooks/use-release-version';
import { buildUninstallCommand } from '../utils/device-command-utils';

interface DeleteDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  devicePlatform: OSPlatformId;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteDeviceDialog({
  open,
  onOpenChange,
  deviceName,
  devicePlatform,
  onConfirm,
  isDeleting,
}: DeleteDeviceDialogProps) {
  const { toast } = useToast();
  const { releaseVersion } = useReleaseVersion({ enabled: open });

  const uninstallCommand = useMemo(() => {
    if (!open) return '';
    return buildUninstallCommand({ platform: devicePlatform, releaseVersion });
  }, [devicePlatform, releaseVersion, open]);

  const copyUninstallCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(uninstallCommand);
      toast({
        title: 'Command copied',
        description: 'Uninstall command copied to clipboard',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy command to clipboard',
        variant: 'destructive',
      });
    }
  }, [uninstallCommand, toast]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-2xl gap-6">
        <AlertDialogHeader className="gap-0">
          <AlertDialogTitle className="text-h2 text-ods-text-primary">Confirm Deletion</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-h4 text-ods-text-primary">
          To uninstall OpenFrame from a <span className="font-medium">{deviceName}</span> device, run the command below.
        </AlertDialogDescription>
        <CommandBox
          command={uninstallCommand}
          secondaryAction={{
            label: 'Copy Command',
            onClick: copyUninstallCommand,
            icon: <Copy02Icon className="w-5 h-5" />,
            variant: 'outline',
          }}
        />
        <AlertDialogFooter className="gap-4">
          <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-ods-error text-ods-bg text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-error/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Device'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
