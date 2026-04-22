/**
 * Device Action Button Configuration
 * Unified configuration for device action buttons used across table dropdown and detail page
 */

import {
  CmdIcon,
  PowerShellIcon,
  RemoteControlIcon,
  ShellIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ComputerMouseIcon,
  FolderIcon,
  TerminalIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Folder } from 'lucide-react';
import React from 'react';
import type { Device } from '../types/device.types';
import { type DeviceActionAvailability, getDeviceActionAvailability } from './device-action-utils';

/**
 * Shell submenu item configuration
 */
export interface ShellSubmenuItem {
  id: 'cmd' | 'powershell' | 'bash';
  label: string;
  icon: React.ReactNode;
}

/**
 * Device action button configuration
 */
export interface DeviceActionButtonConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  href: string;
  // For Windows Remote Shell - has submenu
  type: 'button' | 'submenu';
  submenu?: ShellSubmenuItem[];
}

/**
 * All device action button configurations
 */
export interface DeviceActionButtons {
  remoteControl: DeviceActionButtonConfig;
  remoteShell: DeviceActionButtonConfig;
  manageFiles: DeviceActionButtonConfig;
  availability: DeviceActionAvailability;
}

/**
 * Get shell submenu items for Windows
 */
export function getWindowsShellSubmenu(): ShellSubmenuItem[] {
  return [
    {
      id: 'cmd',
      label: 'CMD',
      icon: <CmdIcon className="w-6 h-6" />,
    },
    {
      id: 'powershell',
      label: 'PowerShell',
      icon: <PowerShellIcon className="w-6 h-6" />,
    },
  ];
}

/**
 * Get shell submenu href for a given shell type
 */
export function getShellHref(deviceId: string, shellType: 'cmd' | 'powershell' | 'bash'): string {
  return `/devices/details/${deviceId}/remote-shell?shellType=${shellType}`;
}

/**
 * Get unified device action button configurations
 * Single source of truth for all device action buttons
 */
export function getDeviceActionButtons(device: Device, deviceId: string, isWindows: boolean): DeviceActionButtons {
  const availability = getDeviceActionAvailability(device);

  return {
    remoteControl: {
      id: 'remote-control',
      label: 'Remote Control',
      icon: <ComputerMouseIcon className="w-6 h-6 text-ods-text-secondary" />,
      disabled: !availability.remoteControlEnabled,
      href: `/devices/details/${deviceId}/remote-desktop`,
      type: 'button',
    },

    remoteShell: isWindows
      ? {
          id: 'remote-shell',
          label: 'Remote Shell',
          icon: <TerminalIcon className="w-6 h-6 text-ods-text-secondary" />,
          disabled: !availability.remoteShellEnabled,
          href: `/devices/details/${deviceId}/remote-shell?shellType=cmd`,
          type: 'submenu',
          submenu: getWindowsShellSubmenu(),
        }
      : {
          id: 'remote-shell',
          label: 'Remote Shell',
          icon: <TerminalIcon className="w-6 h-6 text-ods-text-secondary" />,
          disabled: !availability.remoteShellEnabled,
          href: `/devices/details/${deviceId}/remote-shell?shellType=bash`,
          type: 'button',
        },

    manageFiles: {
      id: 'manage-files',
      label: 'Manage Files',
      icon: <FolderIcon className="w-6 h-6 text-ods-text-secondary" />,
      disabled: !availability.manageFilesEnabled,
      href: `/devices/details/${deviceId}/file-manager`,
      type: 'button',
    },

    availability,
  };
}

/**
 * Convert a DeviceActionButtonConfig to an ActionsMenu item format
 * Used by device-actions-dropdown.tsx for table context
 */
export function toActionsMenuItem(
  config: DeviceActionButtonConfig,
  deviceId: string,
  handlers?: {
    onClick?: () => void;
    onShellSelect?: (type: 'cmd' | 'powershell' | 'bash') => void;
  },
) {
  if (config.type === 'submenu' && config.submenu) {
    return {
      id: config.id,
      label: config.label,
      icon: config.icon,
      type: 'submenu' as const,
      disabled: config.disabled,
      submenu: config.submenu.map(item => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        href: `/devices/details/${deviceId}/remote-shell?shellType=${item.id}`,
        onClick: () => handlers?.onShellSelect?.(item.id),
      })),
    };
  }

  return {
    id: config.id,
    label: config.label,
    icon: config.icon,
    disabled: config.disabled,
    href: config.href,
    onClick: handlers?.onClick,
  };
}
