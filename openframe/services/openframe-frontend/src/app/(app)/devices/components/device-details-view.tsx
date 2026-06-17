'use client';

import type { ActionsMenuGroup, ActionsMenuItem, PageActionButton } from '@flamingo-stack/openframe-frontend-core';
import {
  getTabComponent,
  LoadError,
  NotFoundError,
  PageLayout,
  TabContent,
  TabNavigation,
  Tag,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@flamingo-stack/openframe-frontend-core';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { CONTEXT_ENTITY_KIND } from '../../mingo/context/context-types';
import { useTrackOpenView } from '../../mingo/context/use-track-open-view';
import { useDeviceActionsMenu } from '../hooks/use-device-actions-menu';
import { useDeviceDetails } from '../hooks/use-device-details';
import type { Device } from '../types/device.types';
import { getDeviceStatusConfig } from '../utils/device-status';
import { DeviceDetailsSkeleton } from './device-details-skeleton';
import { DeviceInfoSection } from './device-info-section';
import { ScriptsModal } from './scripts-modal';
import { DEVICE_TABS } from './tabs/device-tabs';

const DETAIL_ICON_SIZE = 'w-[var(--icon-size-icon-size)] h-[var(--icon-size-icon-size)]';

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

const DEVICE_TAB_IDS = [
  'hardware',
  'network',
  'security',
  'compliance',
  'agents',
  'users',
  'software',
  'vulnerabilities',
  'logs',
] as const;
const DEFAULT_DEVICE_TAB = 'hardware';

export function DeviceDetailsView({ deviceId }: DeviceDetailsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requestedTab = searchParams.get('tab') ?? DEFAULT_DEVICE_TAB;
  const activeTab = (DEVICE_TAB_IDS as readonly string[]).includes(requestedTab) ? requestedTab : DEFAULT_DEVICE_TAB;

  // Controlled mode for TabNavigation: URL is the single source of truth.
  // Avoids a flicker bug in `urlSync` mode where the internal sync effect
  // briefly resets the active tab to the URL's previous value during navigation.
  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

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

  // Register this device as the Mingo "open view" so the agent gets the user's
  // working context on the next message (cleared on unmount → recent views).
  useTrackOpenView(
    normalizedDevice
      ? {
          type: CONTEXT_ENTITY_KIND.DEVICE,
          id: deviceId,
          label: normalizedDevice.displayName || normalizedDevice.hostname || deviceId,
        }
      : null,
  );

  const handleBack = useSafeBack('/devices');

  const {
    items: deviceMenuItems,
    dialogs: confirmationDialogs,
    actionAvailability,
  } = useDeviceActionsMenu(normalizedDevice, {
    deviceId,
    iconSize: DETAIL_ICON_SIZE,
    onRunScript: () => setIsScriptsModalOpen(true),
    navigateOnDestructive: true,
  });

  const menuActions = useMemo<ActionsMenuGroup[]>(() => {
    const groups: ActionsMenuGroup[] = [];
    const primaryItems: ActionsMenuItem[] = [];
    const destructiveItems: ActionsMenuItem[] = [];

    if (actionAvailability?.runScriptEnabled) primaryItems.push(deviceMenuItems.runScript);
    if (actionAvailability?.manageFilesEnabled) primaryItems.push(deviceMenuItems.manageFiles);
    if (deviceMenuItems.archive) destructiveItems.push(deviceMenuItems.archive);
    if (deviceMenuItems.delete) destructiveItems.push(deviceMenuItems.delete);

    if (primaryItems.length > 0) {
      groups.push({ items: primaryItems, separator: destructiveItems.length > 0 });
    }
    if (destructiveItems.length > 0) {
      groups.push({ items: destructiveItems });
    }
    return groups;
  }, [actionAvailability, deviceMenuItems]);

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
    return <DeviceDetailsSkeleton activeTab={activeTab} />;
  }

  if (error) {
    return <LoadError message={`Error loading device: ${error}`} />;
  }

  if (!normalizedDevice) {
    return <NotFoundError message="Device not found" />;
  }

  // Top-level header buttons reuse the shared menu items registry — only the
  // `variant` field is appended to turn them into `PageActionButton`s.
  const actions: PageActionButton[] = [
    { ...deviceMenuItems.remoteControl, variant: 'outline' },
    { ...deviceMenuItems.remoteShell, variant: 'outline' },
  ];

  return (
    <PageLayout
      title={
        normalizedDevice?.displayName || normalizedDevice?.hostname || normalizedDevice?.description || 'Unknown Device'
      }
      backButton={{
        label: 'Back',
        onClick: handleBack,
      }}
      actionsVariant="menu-primary"
      actions={actions}
      menuActions={menuActions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <DeviceStatusAndTags device={normalizedDevice} />

      <DeviceInfoSection device={normalizedDevice} />

      {/* Tab Navigation */}
      <div className="mt-6">
        <TabNavigation tabs={DEVICE_TABS} activeTab={activeTab} onTabChange={handleTabChange} showRightGradient>
          {tabId => (
            <TabContent
              activeTab={tabId}
              TabComponent={getTabComponent(DEVICE_TABS, tabId)}
              componentProps={{ device: normalizedDevice }}
            />
          )}
        </TabNavigation>
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
