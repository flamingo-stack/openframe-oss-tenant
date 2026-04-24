'use client';

import type { ActionsMenuGroup, PageActionButton } from '@flamingo-stack/openframe-frontend-core';
import {
  getTabComponent,
  LoadError,
  NotFoundError,
  normalizeOSType,
  PageLayout,
  TabContent,
  TabNavigation,
  Tag,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@flamingo-stack/openframe-frontend-core';
import {
  BoxArchiveIcon,
  BracketCurlyIcon,
  ComputerMouseIcon,
  FolderIcon,
  PowershellLogoGreyIcon,
  TerminalIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useDeviceConfirmationDialogs } from '../hooks/use-device-confirmation-dialogs';
import { useDeviceDetails } from '../hooks/use-device-details';
import type { Device } from '../types/device.types';
import { getDeviceActionAvailability } from '../utils/device-action-utils';
import { getDeviceStatusConfig } from '../utils/device-status';
import { DeviceDetailsSkeleton } from './device-details-skeleton';
import { DeviceInfoSection } from './device-info-section';
import { ScriptsModal } from './scripts-modal';
import { DEVICE_TABS } from './tabs/device-tabs';

function DeviceStatusAndTags({ device }: { device: Device }) {
  const statusConfig = getDeviceStatusConfig(device.status);
  const tagValues = device.tags?.flatMap(tag =>
    tag.values.map(value => ({ id: `${tag.tagId}-${value}`, key: tag.key, value })),
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex gap-2 items-center flex-wrap py-4">
        <Tag label={statusConfig.label} variant={statusConfig.variant} />
        {tagValues?.map(tag => (
          <Tooltip key={tag.id}>
            <TooltipTrigger asChild>
              <span className="bg-ods-card border border-ods-border rounded-[6px] px-2 h-8 flex items-center justify-center font-mono font-medium text-sm text-ods-text-primary uppercase tracking-tight cursor-default">
                {tag.value}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-h5">
                {tag.key}:{tag.value}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

interface DeviceDetailsViewProps {
  deviceId: string;
}

export function DeviceDetailsView({ deviceId }: DeviceDetailsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { deviceDetails, isLoading, error } = useDeviceDetails(deviceId);

  const [isScriptsModalOpen, setIsScriptsModalOpen] = useState(false);
  const [, forceUpdate] = useState({});

  // Force re-render every second to update relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle action params from URL (e.g., from table dropdown navigation)
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action || isLoading) return;

    if (action === 'runScript') {
      setIsScriptsModalOpen(true);
      // Clear the action param to avoid re-triggering
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('action');
      router.replace(`/devices/details/${deviceId}${newParams.toString() ? `?${newParams.toString()}` : ''}`);
    }
  }, [searchParams, isLoading, deviceId, router]);

  const normalizedDevice = deviceDetails;

  // Get action availability for passing agent IDs to modals
  const actionAvailability = useMemo(
    () => (normalizedDevice ? getDeviceActionAvailability(normalizedDevice) : null),
    [normalizedDevice],
  );

  const handleBack = () => {
    router.push('/devices');
  };

  const {
    openArchive,
    openDelete,
    dialogs: confirmationDialogs,
  } = useDeviceConfirmationDialogs(normalizedDevice, {
    onArchived: () => router.push('/devices'),
    onDeleted: () => router.push('/devices'),
  });

  const menuActions = useMemo<ActionsMenuGroup[]>(() => {
    const groups: ActionsMenuGroup[] = [];
    const primaryItems: ActionsMenuGroup['items'] = [];
    const destructiveItems: ActionsMenuGroup['items'] = [];

    if (actionAvailability?.runScriptEnabled) {
      primaryItems.push({
        id: 'run-script',
        label: 'Run Script',
        icon: <BracketCurlyIcon className="w-6 h-6 text-ods-text-secondary" />,
        onClick: () => setIsScriptsModalOpen(true),
      });
    }
    if (actionAvailability?.archiveEnabled) {
      destructiveItems.push({
        id: 'archive',
        label: 'Archive Device',
        icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
        onClick: openArchive,
      });
    }
    if (actionAvailability?.deleteEnabled) {
      destructiveItems.push({
        id: 'delete',
        label: 'Delete Device',
        icon: <TrashIcon className="w-6 h-6 text-ods-error" />,
        onClick: openDelete,
      });
    }

    if (primaryItems.length > 0) {
      groups.push({ items: primaryItems, separator: destructiveItems.length > 0 });
    }
    if (destructiveItems.length > 0) {
      groups.push({ items: destructiveItems });
    }
    return groups;
  }, [actionAvailability, openArchive, openDelete]);

  const handleRunScripts = (scriptIds: string[]) => {
    console.log('Running scripts:', scriptIds, 'on device:', deviceId);
  };

  const handleDeviceLogs = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'logs');
    // Add timestamp to force logs refresh
    params.set('refresh', Date.now().toString());
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  if (isLoading) {
    return <DeviceDetailsSkeleton activeTab={searchParams.get('tab') || 'hardware'} />;
  }

  if (error) {
    return <LoadError message={`Error loading device: ${error}`} />;
  }

  if (!normalizedDevice) {
    return <NotFoundError message="Device not found" />;
  }

  // Check if Windows for shell type selection
  const isWindows = (() => {
    const osType = normalizedDevice.platform || normalizedDevice.osType || normalizedDevice.operating_system;
    return normalizeOSType(osType) === 'WINDOWS';
  })();

  const remoteShellAction: PageActionButton = isWindows
    ? {
        label: 'Remote Shell',
        variant: 'device-action',
        disabled: !actionAvailability?.remoteShellEnabled,
        submenu: [
          {
            id: 'cmd',
            label: 'CMD',
            icon: <TerminalIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: `/devices/details/${deviceId}/remote-shell?shellType=cmd`,
          },
          {
            id: 'powershell',
            label: 'PowerShell',
            icon: <PowershellLogoGreyIcon className="w-6 h-6" />,
            href: `/devices/details/${deviceId}/remote-shell?shellType=powershell`,
          },
        ],
      }
    : {
        label: 'Remote Shell',
        variant: 'device-action',
        icon: <TerminalIcon className="h-6 w-6 text-ods-text-secondary" />,
        href: `/devices/details/${deviceId}/remote-shell?shellType=bash`,
        prefetch: false,
        disabled: !actionAvailability?.remoteShellEnabled,
      };

  const actions: PageActionButton[] = [
    {
      label: 'Manage Files',
      variant: 'device-action',
      icon: <FolderIcon className="h-6 w-6 text-ods-text-secondary" />,
      iconOnlyOnDesktop: true,
      href: `/devices/details/${deviceId}/file-manager`,
      prefetch: false,
      disabled: !actionAvailability?.manageFilesEnabled,
    },
    {
      label: 'Remote Control',
      variant: 'device-action',
      icon: <ComputerMouseIcon className="h-6 w-6 text-ods-text-secondary" />,
      iconOnlyOnDesktop: true,
      href: `/devices/details/${deviceId}/remote-desktop`,
      prefetch: false,
      disabled: !actionAvailability?.remoteControlEnabled,
    },
    remoteShellAction,
  ];

  return (
    <PageLayout
      title={
        normalizedDevice?.displayName || normalizedDevice?.hostname || normalizedDevice?.description || 'Unknown Device'
      }
      backButton={{
        label: 'Back to Devices',
        onClick: handleBack,
      }}
      actionsVariant="menu-primary"
      actions={actions}
      menuActions={menuActions}
    >
      <DeviceStatusAndTags device={normalizedDevice} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <DeviceInfoSection device={normalizedDevice} />

        {/* Tab Navigation */}
        <div className="mt-6">
          <TabNavigation tabs={DEVICE_TABS} defaultTab="hardware" urlSync={true}>
            {activeTab => (
              <TabContent
                activeTab={activeTab}
                TabComponent={getTabComponent(DEVICE_TABS, activeTab)}
                componentProps={{ device: normalizedDevice }}
              />
            )}
          </TabNavigation>
        </div>
      </div>

      {/* Scripts Modal */}
      <ScriptsModal
        isOpen={isScriptsModalOpen}
        onClose={() => setIsScriptsModalOpen(false)}
        deviceId={actionAvailability?.tacticalAgentId || deviceId}
        device={normalizedDevice}
        onRunScripts={handleRunScripts}
        onDeviceLogs={handleDeviceLogs}
      />

      {confirmationDialogs}
    </PageLayout>
  );
}
