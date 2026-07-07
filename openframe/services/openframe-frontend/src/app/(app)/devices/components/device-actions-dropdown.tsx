'use client';

import type { ActionsMenuGroup, ActionsMenuItem } from '@flamingo-stack/openframe-frontend-core';
import { ActionsMenuDropdown } from '@flamingo-stack/openframe-frontend-core';
import { useMemo } from 'react';
import { useDeviceActionsMenu } from '../hooks/use-device-actions-menu';
import type { Device } from '../types/device.types';

interface DeviceActionsDropdownProps {
  device: Device;
  context: 'table' | 'detail';
  onActionComplete?: () => void;
  onRunScript?: () => void;
}

export function DeviceActionsDropdown({ device, context, onActionComplete, onRunScript }: DeviceActionsDropdownProps) {
  const { items, dialogs } = useDeviceActionsMenu(device, {
    onRunScript,
    onActionComplete,
    navigateOnDestructive: context === 'detail',
  });

  const menuGroups = useMemo((): ActionsMenuGroup[] => {
    const groups: ActionsMenuGroup[] = [];
    const actionItems: ActionsMenuItem[] = [];

    // In detail context, Remote Shell/Control/Files are exposed as separate buttons elsewhere.
    if (context === 'table') {
      actionItems.push(items.remoteShell, items.remoteControl, items.manageFiles);
    }
    actionItems.push(items.runScript);

    if (actionItems.length > 0) {
      groups.push({ items: actionItems, separator: true });
    }

    const destructiveItems: ActionsMenuItem[] = [];
    if (items.archive) destructiveItems.push(items.archive);
    if (items.unarchive) destructiveItems.push(items.unarchive);
    if (items.delete) destructiveItems.push(items.delete);

    if (destructiveItems.length > 0) {
      groups.push({ items: destructiveItems });
    }

    return groups;
  }, [context, items]);

  if (menuGroups.length === 0) {
    return null;
  }

  return (
    <div data-no-row-click>
      <ActionsMenuDropdown groups={menuGroups} />
      {dialogs}
    </div>
  );
}
