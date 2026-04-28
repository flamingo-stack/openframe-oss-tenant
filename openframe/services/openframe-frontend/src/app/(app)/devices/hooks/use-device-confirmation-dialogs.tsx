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
import { CheckIcon, Copy02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/app/hooks/use-copy-to-clipboard';
import type { Device } from '../types/device.types';
import { buildUninstallCommand, normalizeDevicePlatform } from '../utils/device-command-utils';
import { useDeviceActions } from './use-device-actions';
import { useReleaseVersion } from './use-release-version';

interface UseDeviceConfirmationDialogsOptions {
  onArchived?: () => void;
  onDeleted?: () => void;
}

interface UseDeviceConfirmationDialogsResult {
  openArchive: () => void;
  openDelete: () => void;
  dialogs: ReactNode;
  isArchiving: boolean;
  isDeleting: boolean;
}

export function useDeviceConfirmationDialogs(
  device: Device | null | undefined,
  { onArchived, onDeleted }: UseDeviceConfirmationDialogsOptions = {},
): UseDeviceConfirmationDialogsResult {
  const { copy: copyCommand, copied: commandCopied } = useCopyToClipboard({
    successDescription: 'Uninstall command copied to clipboard',
    errorDescription: 'Could not copy command to clipboard',
  });
  const { archiveDevice, deleteDevice, isArchiving, isDeleting } = useDeviceActions();
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { releaseVersion } = useReleaseVersion({ enabled: showDeleteConfirm });

  const deviceName = device?.displayName || device?.hostname || 'this device';
  const deviceId = device?.machineId || device?.id || '';

  const devicePlatform = useMemo(
    () => (device ? normalizeDevicePlatform(device.platform, device.osType, device.operating_system) : 'linux'),
    [device],
  );

  const uninstallCommand = useMemo(() => {
    if (!showDeleteConfirm || !device) return '';
    return buildUninstallCommand({ platform: devicePlatform, releaseVersion });
  }, [devicePlatform, releaseVersion, showDeleteConfirm, device]);

  const copyUninstallCommand = useCallback(() => copyCommand(uninstallCommand), [copyCommand, uninstallCommand]);

  const openArchive = useCallback(() => setShowArchiveConfirm(true), []);
  const openDelete = useCallback(() => setShowDeleteConfirm(true), []);

  const handleArchive = useCallback(async () => {
    if (!device) return;
    const success = await archiveDevice(deviceId, deviceName);
    setShowArchiveConfirm(false);
    if (success) onArchived?.();
  }, [archiveDevice, deviceId, deviceName, device, onArchived]);

  const handleDelete = useCallback(async () => {
    if (!device) return;
    const success = await deleteDevice(deviceId, deviceName);
    setShowDeleteConfirm(false);
    if (success) onDeleted?.();
  }, [deleteDevice, deviceId, deviceName, device, onDeleted]);

  const dialogs = (
    <>
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent className="bg-ods-card border border-ods-border p-8 max-w-lg gap-6">
          <AlertDialogHeader className="gap-0">
            <AlertDialogTitle className="text-h2 text-ods-text-primary">Archive Device</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-h4 text-ods-text-secondary">
            Are you sure you want to archive <span className="text-ods-accent font-medium">{deviceName}</span>? This
            device will be hidden from the default view but can be restored later.
          </AlertDialogDescription>
          <AlertDialogFooter className="gap-4 flex-col md:flex-row">
            <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="flex-1 bg-ods-accent text-ods-text-on-accent text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-accent/90"
            >
              {isArchiving ? 'Archiving...' : 'Archive Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-ods-card border border-ods-border p-10 max-w-2xl gap-6">
          <AlertDialogHeader className="gap-0">
            <AlertDialogTitle className="text-h2 text-ods-text-primary">Confirm Deletion</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-h4 text-ods-text-primary">
            To uninstall OpenFrame from a <span className="font-medium">{deviceName}</span> device, run the command
            below.
          </AlertDialogDescription>
          <CommandBox
            command={uninstallCommand}
            secondaryAction={{
              label: 'Copy Command',
              onClick: copyUninstallCommand,
              icon: commandCopied ? (
                <CheckIcon className="w-5 h-5 text-[var(--ods-attention-green-success)]" />
              ) : (
                <Copy02Icon className="w-5 h-5" />
              ),
              variant: 'outline',
            }}
          />
          <AlertDialogFooter className="gap-4">
            <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-ods-error text-ods-bg text-h3 px-4 py-3 rounded-[6px] hover:bg-ods-error/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { openArchive, openDelete, dialogs, isArchiving, isDeleting };
}
