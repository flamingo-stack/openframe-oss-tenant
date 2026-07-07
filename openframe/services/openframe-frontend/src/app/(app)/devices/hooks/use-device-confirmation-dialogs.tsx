'use client';

import { CommandBox } from '@flamingo-stack/openframe-frontend-core/components/features';
import { CheckIcon, Copy02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { useCopyToClipboard } from '@/app/hooks/use-copy-to-clipboard';
import type { Device } from '../types/device.types';
import { buildUninstallCommand, normalizeDevicePlatform } from '../utils/device-command-utils';
import { getDeviceName } from '../utils/device-name';
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
  /** Re-exported from the hook's internal useDeviceActions instance so callers
   *  (e.g. useDeviceActionsMenu) don't have to instantiate a second one. */
  unarchiveDevice: (deviceId: string, deviceName?: string) => Promise<boolean>;
  isUnarchiving: boolean;
}

export function useDeviceConfirmationDialogs(
  device: Device | null | undefined,
  { onArchived, onDeleted }: UseDeviceConfirmationDialogsOptions = {},
): UseDeviceConfirmationDialogsResult {
  const { copy: copyCommand, copied: commandCopied } = useCopyToClipboard({
    successDescription: 'Uninstall command copied to clipboard',
    errorDescription: 'Could not copy command to clipboard',
  });
  const { archiveDevice, unarchiveDevice, deleteDevice, isArchiving, isUnarchiving, isDeleting } = useDeviceActions();
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { releaseVersion } = useReleaseVersion({ enabled: showDeleteConfirm });

  const deviceName = getDeviceName(device) || 'this device';
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
      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive Device"
        description={
          <>
            Are you sure you want to archive <span className="text-ods-accent font-medium">{deviceName}</span>? This
            device will be hidden from the default view but can be restored later.
          </>
        }
        confirmLabel="Archive Device"
        pendingLabel="Archiving..."
        variant="default"
        isPending={isArchiving}
        onConfirm={handleArchive}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Confirm Deletion"
        description={
          <>
            To uninstall OpenFrame from a <span className="font-medium">{deviceName}</span> device, run the command
            below.
          </>
        }
        confirmLabel="Delete Device"
        pendingLabel="Deleting..."
        variant="destructive"
        isPending={isDeleting}
        onConfirm={handleDelete}
        extraContent={
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
        }
      />
    </>
  );

  return { openArchive, openDelete, dialogs, isArchiving, isDeleting, unarchiveDevice, isUnarchiving };
}
