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
} from '@flamingo-stack/openframe-frontend-core';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';
import { CONTEXT_ENTITY_KIND } from '../../mingo/context/context-types';
import { useTrackOpenView } from '../../mingo/context/use-track-open-view';
import { useDeviceActionsMenu } from '../hooks/use-device-actions-menu';
import { useDeviceDetails } from '../hooks/use-device-details';
import { getDeviceName } from '../utils/device-name';
import { getDeviceStatusConfig } from '../utils/device-status';
import { DeviceDetailsSkeleton } from './device-details-skeleton';
import { RunScriptModal } from './run-script/run-script-modal';
import { DEVICE_TABS } from './tabs/device-tabs';

const DETAIL_ICON_SIZE = 'w-[var(--icon-size-icon-size)] h-[var(--icon-size-icon-size)]';

interface DeviceDetailsViewProps {
  deviceId: string;
}

// Derive the valid-tab set from DEVICE_TABS (the single source of truth) so disabled
// tabs (e.g. the commented-out `queries`) are excluded automatically. Otherwise a URL
// like `?tab=queries` would pass validation but render a blank panel (no component).
const DEVICE_TAB_IDS = DEVICE_TABS.map(tab => tab.id);
const DEFAULT_DEVICE_TAB = 'overview';

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
      router.replace(`/devices/details${newParams.toString() ? `?${newParams.toString()}` : ''}`);
    }
  }, [searchParams, isLoading, router]);

  const normalizedDevice = deviceDetails;

  // Register this device as the Mingo "open view" so the agent gets the user's
  // working context on the next message (cleared on unmount → recent views).
  useTrackOpenView(
    normalizedDevice
      ? {
          type: CONTEXT_ENTITY_KIND.DEVICE,
          id: deviceId,
          label: getDeviceName(normalizedDevice) || deviceId,
        }
      : null,
  );

  const handleBack = useSafeBack(routes.devices.list);

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
    if (deviceMenuItems.unarchive) destructiveItems.push(deviceMenuItems.unarchive);
    if (deviceMenuItems.delete) destructiveItems.push(deviceMenuItems.delete);

    if (primaryItems.length > 0) {
      groups.push({ items: primaryItems, separator: destructiveItems.length > 0 });
    }
    if (destructiveItems.length > 0) {
      groups.push({ items: destructiveItems });
    }
    return groups;
  }, [actionAvailability, deviceMenuItems]);

  const handleDeviceLogs = () => {
    const params = new URLSearchParams(window.location.search);
    // Logs now live on the Overview tab.
    params.set('tab', 'overview');
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

  const title = getDeviceName(normalizedDevice) || 'Unknown Device';
  const lastUpdated = normalizedDevice.updatedAt || normalizedDevice.lastSeen;
  const subtitle = lastUpdated ? `Updated ${formatRelativeTime(lastUpdated)}` : undefined;
  const statusConfig = getDeviceStatusConfig(normalizedDevice.status);

  return (
    // Core PageLayout's built-in TitleBlock; the device status rides inline with the
    // title via the additive `titleAdornment` slot (no host-side header replica).
    <PageLayout
      title={title}
      subtitle={subtitle}
      backButton={{ label: 'Back', onClick: handleBack }}
      actions={actions}
      menuActions={menuActions}
      actionsVariant="menu-primary"
      titleAdornment={<Tag label={statusConfig.label} variant={statusConfig.variant} />}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      {/* Tab Navigation */}
      <TabNavigation tabs={DEVICE_TABS} activeTab={activeTab} onTabChange={handleTabChange}>
        {tabId => (
          <TabContent
            activeTab={tabId}
            TabComponent={getTabComponent(DEVICE_TABS, tabId)}
            componentProps={{ device: normalizedDevice }}
          />
        )}
      </TabNavigation>

      {/* Run Script — native scripts-v2 modal (GraphQL run API). The legacy Tactical
          ScriptsModal was removed together with the Tactical RMM integration. */}
      <RunScriptModal
        isOpen={isScriptsModalOpen}
        onClose={() => setIsScriptsModalOpen(false)}
        machineId={normalizedDevice.machineId}
        onViewDeviceLogs={handleDeviceLogs}
      />

      {confirmationDialogs}
    </PageLayout>
  );
}
