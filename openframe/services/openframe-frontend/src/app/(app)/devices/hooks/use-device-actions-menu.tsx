'use client';

import type { ActionsMenuItem } from '@flamingo-stack/openframe-frontend-core';
import { normalizeOSType } from '@flamingo-stack/openframe-frontend-core';
import {
  ArrowRightUpIcon,
  BoxArchiveIcon,
  BracketCurlyIcon,
  PenEditIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { EditDisplayNameModal } from '../components/edit-display-name-modal';
import type { Device } from '../types/device.types';
import { type DeviceActionAvailability, getDeviceActionAvailability } from '../utils/device-action-utils';
import { buildDeviceMenuItems } from '../utils/device-menu-items';
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
  editDisplayName: ActionsMenuItem;
  deviceLogs: ActionsMenuItem;
  archive: ActionsMenuItem | null;
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
  const [showEditDisplayName, setShowEditDisplayName] = useState(false);

  const deviceId = deviceIdOverride || device?.machineId || device?.id || '';

  const handleDestructiveSuccess = useCallback(() => {
    onActionComplete?.();
    if (navigateOnDestructive) router.push('/devices');
  }, [onActionComplete, navigateOnDestructive, router]);

  const { openArchive, openDelete, dialogs } = useDeviceConfirmationDialogs(device, {
    onArchived: handleDestructiveSuccess,
    onDeleted: handleDestructiveSuccess,
  });

  const actionAvailability = useMemo(() => (device ? getDeviceActionAvailability(device) : null), [device]);

  const isWindows = useMemo(() => {
    if (!device) return undefined;
    const osType = device.platform || device.osType || device.operating_system;
    return normalizeOSType(osType) === 'WINDOWS';
  }, [device]);

  const runScriptHref = `/devices/details/${deviceId}?action=runScript`;

  const handleRunScript = useCallback(() => {
    if (onRunScript) {
      onRunScript();
    } else {
      router.push(runScriptHref);
    }
  }, [runScriptHref, onRunScript, router]);

  const openEditDisplayName = useCallback(() => setShowEditDisplayName(true), []);

  const items = useMemo<DeviceActionsMenuItems>(() => {
    const base = buildDeviceMenuItems({
      deviceId,
      availability: actionAvailability,
      iconSize: iconSize,
      isWindows,
      withNewTabAction: true,
    });

    const runScriptDisabled = !actionAvailability?.runScriptEnabled;
    const runScript: ActionsMenuItem = {
      id: 'run-script',
      label: 'Run Script',
      icon: <BracketCurlyIcon className={`${iconSize} text-ods-text-secondary`} />,
      disabled: runScriptDisabled,
      onClick: handleRunScript,
      iconAction: {
        icon: <ArrowRightUpIcon className="w-5 h-5 text-ods-text-secondary" />,
        'aria-label': 'Open Run Script in new tab',
        href: runScriptHref,
        openInNewTab: true,
        disabled: runScriptDisabled,
      },
    };

    const editDisplayName: ActionsMenuItem = {
      id: 'edit-display-name',
      label: 'Edit Display Name',
      icon: <PenEditIcon className={`${iconSize} text-ods-text-secondary`} />,
      onClick: openEditDisplayName,
    };

    const archive: ActionsMenuItem | null = actionAvailability?.archiveEnabled
      ? {
          id: 'archive',
          label: 'Archive Device',
          icon: <BoxArchiveIcon className={`${iconSize} text-ods-text-secondary`} />,
          onClick: openArchive,
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
      editDisplayName,
      deviceLogs: base.deviceLogs,
      archive,
      delete: deleteItem,
    };
  }, [
    deviceId,
    actionAvailability,
    isWindows,
    iconSize,
    handleRunScript,
    runScriptHref,
    openArchive,
    openDelete,
    openEditDisplayName,
  ]);

  const allDialogs = (
    <>
      {dialogs}
      <EditDisplayNameModal
        isOpen={showEditDisplayName}
        onClose={() => setShowEditDisplayName(false)}
        device={device ?? null}
        onSaved={onActionComplete}
      />
    </>
  );

  return { items, dialogs: allDialogs, actionAvailability };
}
