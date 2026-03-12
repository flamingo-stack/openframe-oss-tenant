'use client';

import { type DeviceType, getDeviceTypeIcon } from '@flamingo-stack/openframe-frontend-core';
import { OSTypeBadge } from '@flamingo-stack/openframe-frontend-core/components/features';
import {
  CheckCircleIcon,
  MonitorIcon,
  PlusCircleIcon,
  SearchIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  getTabComponent,
  Input,
  TabContent,
  type TabItem,
  Table,
  type TableColumn,
  TabNavigation,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { getFleetHostId } from '../../../devices/utils/device-action-utils';
import { createDeviceListItem } from '../../../devices/utils/device-transform';

const DEVICES_PAGE_SIZE = 20;

interface DevicesPage {
  devices: Device[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
}

interface PolicyDeviceSelectorProps {
  selectedFleetHostIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
  disabled?: boolean;
}

type SubTab = 'available' | 'selected';

interface DeviceTabContentProps {
  mode: SubTab;
  devices: Device[];
  columns: TableColumn<Device>[];
  loading: boolean;
  renderRowActions: (device: Device) => React.ReactNode;
  onAddAll: () => void;
  onRemoveAll: () => void;
  selectedCount: number;
  infiniteScroll?: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onLoadMore: () => void;
    skeletonRows: number;
  };
}

function DeviceTabContent({
  mode,
  devices,
  columns,
  loading,
  renderRowActions,
  onAddAll,
  onRemoveAll,
  selectedCount,
  infiniteScroll,
}: DeviceTabContentProps) {
  return (
    <>
      <div className="flex justify-end -mb-2">
        {mode === 'available' ? (
          <Button
            variant="link"
            onClick={onAddAll}
            className="font-medium text-[14px] text-[var(--open-colors-yellow,#ffc008)] hover:text-[var(--open-colors-yellow-hover,#e6ac00)]"
          >
            Add All Devices
          </Button>
        ) : selectedCount > 0 ? (
          <Button
            variant="link"
            onClick={onRemoveAll}
            className="font-medium text-[14px] text-[var(--ods-attention-red-error,#d32f2f)] hover:text-[var(--ods-attention-red-error-hover,#b71c1c)]"
          >
            Remove {selectedCount} Devices
          </Button>
        ) : null}
      </div>
      <Table
        data={devices}
        columns={columns}
        rowKey="id"
        loading={loading}
        skeletonRows={8}
        emptyMessage={mode === 'selected' ? 'No devices selected' : 'No devices found'}
        showFilters={false}
        renderRowActions={renderRowActions}
        infiniteScroll={infiniteScroll}
      />
    </>
  );
}

/**
 * Deduplicate devices by Fleet host ID, keeping the device with the most recent lastSeen.
 */
function deduplicateByFleetId(devices: Device[]): Device[] {
  const byFleetId = new Map<number, Device>();
  for (const device of devices) {
    const fleetId = getFleetHostId(device);
    if (fleetId === undefined) continue;

    const existing = byFleetId.get(fleetId);
    if (!existing) {
      byFleetId.set(fleetId, device);
    } else {
      const existingTime = new Date(existing.lastSeen || existing.last_seen || 0).getTime();
      const newTime = new Date(device.lastSeen || device.last_seen || 0).getTime();
      if (newTime > existingTime) {
        byFleetId.set(fleetId, device);
      }
    }
  }
  return Array.from(byFleetId.values());
}

export function PolicyDeviceSelector({ selectedFleetHostIds, onSelectionChange, disabled }: PolicyDeviceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('available');

  const devicesQuery = useInfiniteQuery<DevicesPage, Error>({
    queryKey: ['policy-device-selector-devices'],
    queryFn: async ({ pageParam }) => {
      const filter = {
        statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE],
      };

      const response = await apiClient.post<
        GraphQlResponse<{
          devices: {
            edges: Array<{ node: DevicesGraphQlNode; cursor: string }>;
            pageInfo: {
              hasNextPage: boolean;
              hasPreviousPage: boolean;
              startCursor?: string;
              endCursor?: string;
            };
            filteredCount: number;
          };
        }>
      >('/api/graphql', {
        query: GET_DEVICES_QUERY,
        variables: {
          filter,
          pagination: { limit: DEVICES_PAGE_SIZE, cursor: (pageParam as string) || null },
          search: '',
        },
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch devices');
      }

      const graphqlResponse = response.data;
      if (!graphqlResponse?.data) {
        throw new Error('No data received from server');
      }

      const nodes = graphqlResponse.data.devices.edges.map(e => e.node);
      const devices = nodes.map(createDeviceListItem);

      return {
        devices,
        pageInfo: graphqlResponse.data.devices.pageInfo,
      };
    },
    getNextPageParam: lastPage => (lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined),
    initialPageParam: undefined as string | undefined,
  });

  const flatDevices = useMemo(
    () => devicesQuery.data?.pages.flatMap(page => page.devices) ?? [],
    [devicesQuery.data?.pages],
  );

  // Filter to Fleet MDM devices and deduplicate by Fleet host ID
  const allDevices = useMemo(() => {
    const fleetDevices = flatDevices.filter(d => getFleetHostId(d) !== undefined);
    return deduplicateByFleetId(fleetDevices);
  }, [flatDevices]);

  const filteredDevices = useMemo(() => {
    let devices = allDevices;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      devices = devices.filter(
        d =>
          (d.displayName || d.hostname || '').toLowerCase().includes(lowerSearch) ||
          (d.osType || d.operating_system || '').toLowerCase().includes(lowerSearch),
      );
    }
    return devices;
  }, [allDevices, searchTerm]);

  const displayDevices = useMemo(() => {
    if (activeSubTab === 'selected') {
      return filteredDevices.filter(d => {
        const fleetId = getFleetHostId(d);
        return fleetId !== undefined && selectedFleetHostIds.has(fleetId);
      });
    }
    return filteredDevices;
  }, [filteredDevices, activeSubTab, selectedFleetHostIds]);

  const toggleDevice = useCallback(
    (device: Device) => {
      if (disabled) return;
      const fleetId = getFleetHostId(device);
      if (fleetId === undefined) return;

      const next = new Set(selectedFleetHostIds);
      if (next.has(fleetId)) {
        next.delete(fleetId);
      } else {
        next.add(fleetId);
      }
      onSelectionChange(next);
    },
    [selectedFleetHostIds, onSelectionChange, disabled],
  );

  const addAllDevices = useCallback(() => {
    if (disabled) return;
    const ids = new Set(selectedFleetHostIds);
    for (const d of filteredDevices) {
      const fleetId = getFleetHostId(d);
      if (fleetId !== undefined) {
        ids.add(fleetId);
      }
    }
    onSelectionChange(ids);
  }, [filteredDevices, selectedFleetHostIds, onSelectionChange, disabled]);

  const removeAllSelected = useCallback(() => {
    if (disabled) return;
    onSelectionChange(new Set());
  }, [onSelectionChange, disabled]);

  const columns: TableColumn<Device>[] = useMemo(
    () => [
      {
        key: 'device',
        label: 'DEVICE',
        renderCell: device => {
          const lastSeen = device.last_seen || device.lastSeen;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center shrink-0 rounded-[6px] border border-ods-border">
                {device.type &&
                  getDeviceTypeIcon(device.type.toLowerCase() as DeviceType, {
                    className: 'w-5 h-5 text-ods-text-secondary',
                  })}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-h4 text-ods-text-primary truncate">{device.displayName || device.hostname}</span>
                <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
                  Last Online: {lastSeen ? formatRelativeTime(lastSeen) : 'unknown'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'details',
        label: 'DETAILS',
        width: 'w-[100px] md:flex-1',
        renderCell: device => {
          return <OSTypeBadge osType={device.osType} />;
        },
      },
    ],
    [],
  );

  const renderRowActions = useMemo(
    () => (device: Device) => {
      const fleetId = getFleetHostId(device);
      if (fleetId === undefined) return null;

      const isSelected = selectedFleetHostIds.has(fleetId);

      if (activeSubTab === 'selected') {
        return (
          <Button
            variant="device-action"
            size="icon"
            onClick={() => toggleDevice(device)}
            centerIcon={<TrashIcon size={24} />}
            className="text-[var(--ods-attention-red-error,#d32f2f)] hover:opacity-80"
            disabled={disabled}
          />
        );
      }

      return (
        <Button
          variant="device-action"
          size="icon"
          onClick={() => toggleDevice(device)}
          centerIcon={isSelected ? <CheckCircleIcon size={24} /> : <PlusCircleIcon size={24} />}
          className={
            isSelected
              ? 'text-[var(--open-colors-yellow,#ffc008)] border-[var(--open-colors-yellow,#ffc008)] bg-[#7F6004] hover:bg-[#7F6004]'
              : 'text-ods-text-secondary hover:text-ods-text-primary'
          }
          disabled={disabled}
        />
      );
    },
    [selectedFleetHostIds, toggleDevice, activeSubTab, disabled],
  );

  const assignTabs: TabItem[] = useMemo(
    () => [
      {
        id: 'available',
        label: 'Available Devices',
        icon: MonitorIcon,
        component: DeviceTabContent,
      },
      {
        id: 'selected',
        label: `Selected Devices (${selectedFleetHostIds.size})`,
        icon: CheckCircleIcon,
        component: DeviceTabContent,
      },
    ],
    [selectedFleetHostIds.size],
  );

  const ActiveTabComponent = getTabComponent(assignTabs, activeSubTab);

  const availableInfiniteScroll =
    activeSubTab === 'available'
      ? {
          hasNextPage: devicesQuery.hasNextPage ?? false,
          isFetchingNextPage: devicesQuery.isFetchingNextPage,
          onLoadMore: () => devicesQuery.fetchNextPage(),
          skeletonRows: 2,
        }
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <TabNavigation
        tabs={assignTabs}
        activeTab={activeSubTab}
        onTabChange={tabId => {
          setSearchTerm('');
          setActiveSubTab(tabId as SubTab);
        }}
      />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            startAdornment={<SearchIcon />}
            placeholder="Search for Devices"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <TabContent
        activeTab={activeSubTab}
        TabComponent={ActiveTabComponent}
        componentProps={{
          mode: activeSubTab,
          devices: displayDevices,
          columns,
          loading: devicesQuery.isLoading,
          renderRowActions,
          onAddAll: addAllDevices,
          onRemoveAll: removeAllSelected,
          selectedCount: selectedFleetHostIds.size,
          infiniteScroll: availableInfiniteScroll,
        }}
      />
    </div>
  );
}
