'use client';

import type { ActionsMenuGroup } from '@flamingo-stack/openframe-frontend-core';
import { ActionsMenuDropdown, normalizeOSType } from '@flamingo-stack/openframe-frontend-core';
import {
  BoxArchiveIcon,
  BracketCurlyIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useDeviceConfirmationDialogs } from '../hooks/use-device-confirmation-dialogs';
import type { Device } from '../types/device.types';
import { getDeviceActionButtons, toActionsMenuItem } from '../utils/device-action-config';
import { getDeviceActionAvailability } from '../utils/device-action-utils';

interface DeviceActionsDropdownProps {
  device: Device;
  context: 'table' | 'detail';
  onActionComplete?: () => void;
  // Handlers for actions (used to integrate with parent component modals)
  onRunScript?: () => void;
}

export function DeviceActionsDropdown({ device, context, onActionComplete, onRunScript }: DeviceActionsDropdownProps) {
  const router = useRouter();

  const deviceId = device.machineId || device.id;

  // Archive/Delete confirmation dialogs (state + JSX) are encapsulated in the hook.
  const {
    openArchive,
    openDelete,
    dialogs: confirmationDialogs,
  } = useDeviceConfirmationDialogs(device, {
    onArchived: context === 'detail' ? () => router.push('/devices') : onActionComplete,
    onDeleted: context === 'detail' ? () => router.push('/devices') : onActionComplete,
  });

  // Get unified action availability
  const actionAvailability = useMemo(() => getDeviceActionAvailability(device), [device]);

  // Check if Windows for shell type selection
  const isWindows = useMemo(() => {
    const osType = device.platform || device.osType || device.operating_system;
    return normalizeOSType(osType) === 'WINDOWS';
  }, [device.platform, device.osType, device.operating_system]);

  const handleRunScript = useCallback(() => {
    if (onRunScript) {
      onRunScript();
    } else {
      // Navigate to device details with action param to auto-open scripts modal
      router.push(`/devices/details/${deviceId}?action=runScript`);
    }
  }, [deviceId, onRunScript, router]);

  // Get unified action button configs
  const actionButtons = useMemo(
    () => getDeviceActionButtons(device, deviceId, isWindows),
    [device, deviceId, isWindows],
  );

  // Build menu groups - different items for table vs detail context
  const menuGroups = useMemo((): ActionsMenuGroup[] => {
    const groups: ActionsMenuGroup[] = [];
    const actionItems = [];

    // In table context, include all remote actions
    // In detail context, Remote Shell and Remote Control are separate buttons, so exclude them
    if (context === 'table') {
      actionItems.push(toActionsMenuItem(actionButtons.remoteShell, deviceId));
      actionItems.push(toActionsMenuItem(actionButtons.remoteControl, deviceId));
      actionItems.push(toActionsMenuItem(actionButtons.manageFiles, deviceId));
    }

    // Run Script is always in the dropdown
    actionItems.push({
      id: 'run-script',
      label: 'Run Script',
      icon: <BracketCurlyIcon className="w-6 h-6 text-ods-text-secondary" />,
      disabled: !actionAvailability.runScriptEnabled,
      onClick: handleRunScript,
    });

    if (actionItems.length > 0) {
      groups.push({
        items: actionItems,
        separator: true,
      });
    }

    // Destructive actions
    const destructiveItems = [];

    if (actionAvailability.archiveEnabled) {
      destructiveItems.push({
        id: 'archive',
        label: 'Archive Device',
        icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
        onClick: openArchive,
      });
    }

    if (actionAvailability.deleteEnabled) {
      destructiveItems.push({
        id: 'delete',
        label: 'Delete Device',
        icon: <TrashIcon className="w-6 h-6 text-ods-error" />,
        onClick: openDelete,
      });
    }

    if (destructiveItems.length > 0) {
      groups.push({
        items: destructiveItems,
      });
    }

    return groups;
  }, [
    context,
    actionAvailability,
    actionButtons.manageFiles,
    actionButtons.remoteControl,
    actionButtons.remoteShell,
    deviceId,
    handleRunScript,
    openArchive,
    openDelete,
  ]);

  // Don't render if no actions available
  if (menuGroups.length === 0 || menuGroups.every(g => g.items.length === 0)) {
    return null;
  }

  return (
    <div data-no-row-click onClick={e => e.stopPropagation()}>
      <ActionsMenuDropdown groups={menuGroups} />
      {confirmationDialogs}
    </div>
  );
}
