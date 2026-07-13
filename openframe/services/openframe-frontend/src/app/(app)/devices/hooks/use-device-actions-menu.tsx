'use client';

import type { ActionsMenuItem } from '@flamingo-stack/openframe-frontend-core';
import { normalizeOSType } from '@flamingo-stack/openframe-frontend-core';
import {
  BoxArchiveIcon,
  BracketCurlyIcon,
  InboxArrowUpIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo } from 'react';
import { routes } from '@/lib/routes';
import type { Device } from '../types/device.types';
import { type DeviceActionAvailability, getDeviceActionAvailability } from '../utils/device-action-utils';
import { buildDeviceMenuItems } from '../utils/device-menu-items';
import { getDeviceName } from '../utils/device-name';
import { useDeviceActions } from './use-device-actions';
import { useDeviceConfirmationDialogs } from './use-device-confirmation-dialogs';

const DEFAULT_ICON_SIZE = 'w-6 h-6';

interface UseDeviceActionsMenuOptions {
  onRunScript?: () => void;
  onActionComplete?: () => void;
  /** Used to build hrefs when `device` is still loading; falls back to device.machineId/id when omitted. */
  deviceId?: string;
  /** Tailwind classes for primary menu icons. Defaults to 'w-6 h-6'. */
  iconSize?: string;
  /** When true, after archive/delete success also navigate to `/devices`. Composes with onActionComplete. */
  navigateOnDestructive?: boolean;
}

export interface DeviceActionsMenuItems {
  deviceDetails: ActionsMenuItem;
  remoteShell: ActionsMenuItem;
  remoteControl: ActionsMenuItem;
  manageFiles: ActionsMenuItem;
  runScript: ActionsMenuItem;
  deviceLogs: ActionsMenuItem;
  archive: ActionsMenuItem | null;
  unarchive: ActionsMenuItem | null;
  delete: ActionsMenuItem | null;
}

export interface UseDeviceActionsMenuResult {
  items: DeviceActionsMenuItems;
  dialogs: ReactNode;
  actionAvailability: DeviceActionAvailability | null;
}

export function useDeviceActionsMenu(
  device: Device | null | undefined,
  {
    onRunScript,
    onActionComplete,
    deviceId: deviceIdOverride,
    iconSize = DEFAULT_ICON_SIZE,
    navigateOnDestructive,
  }: UseDeviceActionsMenuOptions = {},
): UseDeviceActionsMenuResult {
  const router = useRouter();

  const deviceId = deviceIdOverride || device?.machineId || device?.id || '';

  const handleDestructiveSuccess = useCallback(() => {
    onActionComplete?.();
    if (navigateOnDestructive) router.push(routes.devices.list);
  }, [onActionComplete, navigateOnDestructive, router]);

  const { openArchive, openDelete, dialogs, unarchiveDevice, isUnarchiving } = useDeviceConfirmationDialogs(device, {
    onArchived: handleDestructiveSuccess,
    onDeleted: handleDestructiveSuccess,
  });

  // Unarchive is non-destructive and instantly reversible — no confirm dialog,
  // just the action + toast. The device stays valid, so no navigation either.
  const handleUnarchive = useCallback(async () => {
    if (!device) return;
    const success = await unarchiveDevice(deviceId, getDeviceName(device));
    if (success) onActionComplete?.();
  }, [device, deviceId, unarchiveDevice, onActionComplete]);

  const actionAvailability = useMemo(() => (device ? getDeviceActionAvailability(device) : null), [device]);

  const isWindows = useMemo(() => {
    if (!device) return undefined;
    const osType = device.platform || device.osType || device.operating_system;
    return normalizeOSType(osType) === 'WINDOWS';
  }, [device]);

  const runScriptHref = routes.devices.details(deviceId, { action: 'runScript' });

  const handleRunScript = useCallback(() => {
    if (onRunScript) {
      onRunScript();
    } else {
      router.push(runScriptHref);
    }
  }, [runScriptHref, onRunScript, router]);

  const items = useMemo<DeviceActionsMenuItems>(() => {
    const base = buildDeviceMenuItems({
      deviceId,
      availability: actionAvailability,
      iconSize: iconSize,
      isWindows,
      withNewTabAction: true,
    });

    const runScriptDisabled = !actionAvailability?.runScriptEnabled;
    // Run Script opens the run modal in place — no new-tab `iconAction` arrow.
    const runScript: ActionsMenuItem = {
      id: 'run-script',
      label: 'Run Script',
      icon: <BracketCurlyIcon className={`${iconSize} text-ods-text-secondary`} />,
      disabled: runScriptDisabled,
      onClick: handleRunScript,
    };

    const archive: ActionsMenuItem | null = actionAvailability?.archiveEnabled
      ? {
          id: 'archive',
          label: 'Archive Device',
          icon: <BoxArchiveIcon className={`${iconSize} text-ods-text-secondary`} />,
          onClick: openArchive,
        }
      : null;

    const unarchive: ActionsMenuItem | null = actionAvailability?.unarchiveEnabled
      ? {
          id: 'unarchive',
          label: 'Unarchive Device',
          icon: <InboxArrowUpIcon className={`${iconSize} text-ods-text-secondary`} />,
          disabled: isUnarchiving,
          onClick: handleUnarchive,
        }
      : null;

    const deleteItem: ActionsMenuItem | null = actionAvailability?.deleteEnabled
      ? {
          id: 'delete',
          label: 'Delete Device',
          icon: <TrashIcon className={`${iconSize} text-ods-error`} />,
          onClick: openDelete,
        }
      : null;

    return {
      deviceDetails: base.deviceDetails,
      remoteShell: base.remoteShell,
      remoteControl: base.remoteControl,
      manageFiles: base.manageFiles,
      runScript,
      deviceLogs: base.deviceLogs,
      archive,
      unarchive,
      delete: deleteItem,
    };
  }, [
    deviceId,
    actionAvailability,
    isWindows,
    iconSize,
    handleRunScript,
    openArchive,
    openDelete,
    handleUnarchive,
    isUnarchiving,
  ]);

  return { items, dialogs, actionAvailability };
}
