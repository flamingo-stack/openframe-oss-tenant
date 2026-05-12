import {
  ArrowRightUpIcon,
  ClipboardListIcon,
  ComputerMouseIcon,
  FolderIcon,
  MonitorIcon,
  PowershellLogoGreyIcon,
  TerminalIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ActionsMenuItem } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { DeviceActionAvailability } from './device-action-utils';

/**
 * Context for building device menu items. Views pass what they need:
 *   - Devices (table dropdown): { deviceId, availability, iconSize: 'w-6 h-6',
 *                                 isWindows, withNewTabAction: true }
 *   - Tickets:                  { deviceId: machineId, availability }
 */
export interface DeviceMenuItemContext {
  /** machineId or canonical deviceId — used in hrefs */
  deviceId: string;
  /** Availability from `getDeviceActionAvailability`. `null` (device not yet
   *  loaded) keeps remote actions disabled so a click race can't trigger
   *  a connect attempt. */
  availability: DeviceActionAvailability | null;
  /** Icon size class (e.g., 'w-6 h-6'). Omit for the smaller Tickets-style. */
  iconSize?: string;
  /** Controls Remote Shell rendering:
   *   - `true`  → Windows submenu (CMD / PowerShell)
   *   - `false` → plain link with `?shellType=bash`
   *   - `undefined` → plain link without `shellType` param (Tickets style) */
  isWindows?: boolean;
  /** Adds an "open in new tab" arrow icon-action to each item. */
  withNewTabAction?: boolean;
}

/**
 * Builders for every device-action menu item known to the app. Each builder
 * is the single source of truth for that action's label, icon and href
 * template; `disabled` is derived from the shared `DeviceActionAvailability`.
 *
 * `Run Script` is intentionally absent — its onClick is React-stateful
 * (opens a modal owned by the parent component) and doesn't fit pure config.
 */
export interface DeviceMenuItems {
  deviceDetails: ActionsMenuItem;
  remoteShell: ActionsMenuItem;
  remoteControl: ActionsMenuItem;
  manageFiles: ActionsMenuItem;
  deviceLogs: ActionsMenuItem;
}

const newTabIconAction = (href: string, label: string, disabled?: boolean) => ({
  icon: <ArrowRightUpIcon className="w-5 h-5 text-ods-text-secondary" />,
  'aria-label': `Open ${label} in new tab`,
  href,
  openInNewTab: true,
  disabled,
});

function maybeNewTabAction(ctx: DeviceMenuItemContext, href: string, label: string, disabled?: boolean) {
  return ctx.withNewTabAction ? { iconAction: newTabIconAction(href, label, disabled) } : {};
}

function iconClass(ctx: DeviceMenuItemContext): string {
  return cn(ctx.iconSize, 'text-ods-text-secondary');
}

const WINDOWS_SHELLS = [
  { id: 'cmd', label: 'CMD', icon: <TerminalIcon className="w-6 h-6 text-ods-text-secondary" /> },
  { id: 'powershell', label: 'PowerShell', icon: <PowershellLogoGreyIcon className="w-6 h-6" /> },
] as const;

function buildRemoteShellItem(ctx: DeviceMenuItemContext): ActionsMenuItem {
  const baseHref = `/devices/details/${ctx.deviceId}/remote-shell`;
  const disabled = !ctx.availability?.remoteShellEnabled;
  const icon = <TerminalIcon className={iconClass(ctx)} />;

  if (ctx.isWindows === true) {
    return {
      id: 'remote-shell',
      label: 'Remote Shell',
      icon,
      type: 'submenu',
      disabled,
      submenu: WINDOWS_SHELLS.map(s => {
        const href = `${baseHref}?shellType=${s.id}`;
        return {
          id: s.id,
          label: s.label,
          icon: s.icon,
          href,
          disabled,
          ...maybeNewTabAction(ctx, href, s.label, disabled),
        };
      }),
    };
  }

  const href = ctx.isWindows === false ? `${baseHref}?shellType=bash` : baseHref;
  return {
    id: 'remote-shell',
    label: 'Remote Shell',
    icon,
    href,
    disabled,
    ...maybeNewTabAction(ctx, href, 'Remote Shell', disabled),
  };
}

/**
 * Build the full set of device menu items for a given context.
 * Views pick only the items they need.
 */
export function buildDeviceMenuItems(ctx: DeviceMenuItemContext): DeviceMenuItems {
  const remoteShell = buildRemoteShellItem(ctx);

  const remoteControlHref = `/devices/details/${ctx.deviceId}/remote-desktop`;
  const remoteControlDisabled = !ctx.availability?.remoteControlEnabled;

  const manageFilesHref = `/devices/details/${ctx.deviceId}/file-manager`;
  const manageFilesDisabled = !ctx.availability?.manageFilesEnabled;

  const deviceDetailsHref = `/devices/details/${ctx.deviceId}`;
  const deviceLogsHref = `/devices/details/${ctx.deviceId}?tab=logs`;

  return {
    deviceDetails: {
      id: 'device-details',
      label: 'Device Details',
      icon: <MonitorIcon className={iconClass(ctx)} />,
      href: deviceDetailsHref,
      ...maybeNewTabAction(ctx, deviceDetailsHref, 'Device Details'),
    },
    remoteShell,
    remoteControl: {
      id: 'remote-control',
      label: 'Remote Control',
      icon: <ComputerMouseIcon className={iconClass(ctx)} />,
      href: remoteControlHref,
      disabled: remoteControlDisabled,
      ...maybeNewTabAction(ctx, remoteControlHref, 'Remote Control', remoteControlDisabled),
    },
    manageFiles: {
      id: 'manage-files',
      label: 'Manage Files',
      icon: <FolderIcon className={iconClass(ctx)} />,
      href: manageFilesHref,
      disabled: manageFilesDisabled,
      ...maybeNewTabAction(ctx, manageFilesHref, 'Manage Files', manageFilesDisabled),
    },
    deviceLogs: {
      id: 'device-logs',
      label: 'Device Logs',
      icon: <ClipboardListIcon className={iconClass(ctx)} />,
      href: deviceLogsHref,
      ...maybeNewTabAction(ctx, deviceLogsHref, 'Device Logs'),
    },
  };
}
