'use client';

import {
  DetailPageContainer,
  getTabComponent,
  LoadError,
  NotFoundError,
  normalizeOSType,
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
import type { MoreActionsItem, PageActionButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useDeviceActions } from '../hooks/use-device-actions';
import { useDeviceDetails } from '../hooks/use-device-details';
import type { Device } from '../types/device.types';
import { getDeviceActionAvailability } from '../utils/device-action-utils';
import { normalizeDevicePlatform } from '../utils/device-command-utils';
import { getDeviceStatusConfig } from '../utils/device-status';
import { ArchiveDeviceDialog } from './archive-device-dialog';
import { DeleteDeviceDialog } from './delete-device-dialog';
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

  const { deviceDetails, isLoading, error, lastUpdated } = useDeviceDetails(deviceId);
  const { archiveDevice, deleteDevice, isArchiving, isDeleting } = useDeviceActions();

  const [isScriptsModalOpen, setIsScriptsModalOpen] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  const devicePlatform = useMemo(
    () =>
      normalizeDevicePlatform(normalizedDevice?.platform, normalizedDevice?.osType, normalizedDevice?.operating_system),
    [normalizedDevice?.platform, normalizedDevice?.osType, normalizedDevice?.operating_system],
  );

  const deviceName = normalizedDevice?.displayName || normalizedDevice?.hostname || 'this device';

  const handleBack = () => {
    router.push('/devices');
  };

  const handleRunScript = () => {
    setIsScriptsModalOpen(true);
  };

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

  const handleArchive = async () => {
    const success = await archiveDevice(deviceId, deviceName);
    setShowArchiveConfirm(false);
    if (success) router.push('/devices');
  };

  const handleDelete = async () => {
    const success = await deleteDevice(deviceId, deviceName);
    setShowDeleteConfirm(false);
    if (success) router.push('/devices');
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

  // Primary action — Remote Shell. Windows gets a split button with CMD + PowerShell;
  // other platforms navigate directly to the bash shell.
  const pageActions: PageActionButton[] = [
    {
      label: 'Remote Shell',
      variant: 'card',
      icon: <TerminalIcon />,
      disabled: !actionAvailability?.remoteShellEnabled,
      ...(isWindows
        ? {
            dropdownItems: [
              {
                label: 'CMD',
                icon: <TerminalIcon />,
                href: `/devices/details/${deviceId}/remote-shell?shellType=cmd`,
              },
              {
                label: 'PowerShell',
                icon: <PowershellLogoGreyIcon />,
                href: `/devices/details/${deviceId}/remote-shell?shellType=powershell`,
              },
            ],
          }
        : {
            href: `/devices/details/${deviceId}/remote-shell?shellType=bash`,
          }),
    },
  ];

  // Secondary actions — rendered inside the "..." menu.
  const pageMenuActions: MoreActionsItem[] = [
    {
      label: 'Remote Control',
      icon: <ComputerMouseIcon />,
      href: `/devices/details/${deviceId}/remote-desktop`,
      disabled: !actionAvailability?.remoteControlEnabled,
    },
    {
      label: 'Manage Files',
      icon: <FolderIcon />,
      href: `/devices/details/${deviceId}/file-manager`,
      disabled: !actionAvailability?.manageFilesEnabled,
    },
    {
      label: 'Run Script',
      icon: <BracketCurlyIcon />,
      onClick: handleRunScript,
      disabled: !actionAvailability?.runScriptEnabled,
    },
    ...(actionAvailability?.archiveEnabled
      ? [
          {
            label: 'Archive Device',
            icon: <BoxArchiveIcon />,
            onClick: () => setShowArchiveConfirm(true),
          },
        ]
      : []),
    ...(actionAvailability?.deleteEnabled
      ? [
          {
            label: 'Delete Device',
            icon: <TrashIcon />,
            onClick: () => setShowDeleteConfirm(true),
            danger: true,
          },
        ]
      : []),
  ];

  return (
    <DetailPageContainer
      title={
        normalizedDevice?.displayName || normalizedDevice?.hostname || normalizedDevice?.description || 'Unknown Device'
      }
      backButton={{
        label: 'Back to Devices',
        onClick: handleBack,
      }}
      subtitle={
        lastUpdated ? (
          <span className="text-ods-text-secondary text-xs">Updated {formatRelativeTime(lastUpdated)}</span>
        ) : undefined
      }
      actions={pageActions}
      actionsVariant="menu-primary"
      menuActions={pageMenuActions}
      padding="none"
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

      <ArchiveDeviceDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        deviceName={deviceName}
        onConfirm={handleArchive}
        isArchiving={isArchiving}
      />

      <DeleteDeviceDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        deviceName={deviceName}
        devicePlatform={devicePlatform}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </DetailPageContainer>
  );
}
