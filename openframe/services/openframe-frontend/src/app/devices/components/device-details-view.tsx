'use client';

import {
  ActionsMenu,
  Button,
  CardLoader,
  DetailPageContainer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  getTabComponent,
  LoadError,
  NotFoundError,
  normalizeOSType,
  StatusTag,
  TabContent,
  TabNavigation,
} from '@flamingo-stack/openframe-frontend-core';
import {
  CmdIcon,
  PowerShellIcon,
  RemoteControlIcon,
  ShellIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { ChevronDown, Folder } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { useDeviceDetails } from '../hooks/use-device-details';
import { getDeviceActionAvailability } from '../utils/device-action-utils';
import { getDeviceStatusConfig } from '../utils/device-status';
import { DeviceActionsDropdown } from './device-actions-dropdown';
import { DeviceInfoSection } from './device-info-section';
import { ScriptsModal } from './scripts-modal';
import { DEVICE_TABS } from './tabs/device-tabs';

interface DeviceDetailsViewProps {
  deviceId: string;
}

export function DeviceDetailsView({ deviceId }: DeviceDetailsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { deviceDetails, isLoading, error, fetchDeviceById, lastUpdated } = useDeviceDetails();

  const [isScriptsModalOpen, setIsScriptsModalOpen] = useState(false);
  const [shellDropdownOpen, setShellDropdownOpen] = useState(false);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId);
    }
  }, [deviceId, fetchDeviceById]);

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

  if (isLoading) {
    return <CardLoader items={4} />;
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

  // Header actions - separate buttons for Remote Control and Remote Shell, plus dropdown for more
  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Remote Control Button */}
      <Button
        variant="device-action"
        leftIcon={<RemoteControlIcon className="h-5 w-5" />}
        navigateUrl={`/devices/details/${deviceId}/remote-desktop`}
        showExternalLinkOnHover
        disabled={!actionAvailability?.remoteControlEnabled}
      >
        Remote Control
      </Button>

      {/* Remote Shell Button - with dropdown for Windows */}
      {isWindows ? (
        <DropdownMenu open={shellDropdownOpen} onOpenChange={setShellDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="device-action"
              leftIcon={<ShellIcon className="h-5 w-5" />}
              rightIcon={<ChevronDown className="h-4 w-4" />}
              disabled={!actionAvailability?.remoteShellEnabled}
            >
              Remote Shell
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-0 border-none">
            <ActionsMenu
              groups={[
                {
                  items: [
                    {
                      id: 'cmd',
                      label: 'CMD',
                      icon: <CmdIcon className="w-6 h-6" />,
                      href: `/devices/details/${deviceId}/remote-shell?shellType=cmd`,
                      showExternalLinkOnHover: true,
                      onClick: () => {
                        setShellDropdownOpen(false);
                        router.push(`/devices/details/${deviceId}/remote-shell?shellType=cmd`);
                      },
                    },
                    {
                      id: 'powershell',
                      label: 'PowerShell',
                      icon: <PowerShellIcon className="w-6 h-6" />,
                      href: `/devices/details/${deviceId}/remote-shell?shellType=powershell`,
                      showExternalLinkOnHover: true,
                      onClick: () => {
                        setShellDropdownOpen(false);
                        router.push(`/devices/details/${deviceId}/remote-shell?shellType=powershell`);
                      },
                    },
                  ],
                },
              ]}
              onItemClick={() => setShellDropdownOpen(false)}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="device-action"
          leftIcon={<ShellIcon className="h-5 w-5" />}
          navigateUrl={`/devices/details/${deviceId}/remote-shell?shellType=bash`}
          showExternalLinkOnHover
          disabled={!actionAvailability?.remoteShellEnabled}
        >
          Remote Shell
        </Button>
      )}

      {/* Manage Files Button */}
      <Button
        variant="device-action"
        leftIcon={<Folder className="h-5 w-5" />}
        navigateUrl={`/devices/details/${deviceId}/file-manager`}
        showExternalLinkOnHover
        disabled={!actionAvailability?.manageFilesEnabled}
      >
        Manage Files
      </Button>

      {/* More Actions Dropdown (3 dots) */}
      <DeviceActionsDropdown device={normalizedDevice} context="detail" onRunScript={handleRunScript} />
    </div>
  );

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
        <div className="flex gap-3 items-center">
          {normalizedDevice?.status &&
            (() => {
              const statusConfig = getDeviceStatusConfig(normalizedDevice.status);
              return <StatusTag label={statusConfig.label} variant={statusConfig.variant} />;
            })()}
          {lastUpdated && (
            <span className="text-ods-text-secondary text-xs">Updated {formatRelativeTime(lastUpdated)}</span>
          )}
        </div>
      }
      headerActions={headerActions}
      padding="none"
    >
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
    </DetailPageContainer>
  );
}
