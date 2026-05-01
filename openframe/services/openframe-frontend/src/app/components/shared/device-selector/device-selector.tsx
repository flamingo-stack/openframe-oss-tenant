'use client';

import { type DeviceType, getDeviceTypeIcon } from '@flamingo-stack/openframe-frontend-core';
import { OrganizationIcon, OSTypeBadge } from '@flamingo-stack/openframe-frontend-core/components/features';
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
  type TableColumn,
  TabNavigation,
  Tag,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { useCallback, useMemo, useRef } from 'react';
import type { Device } from '@/app/(app)/devices/types/device.types';
import { getDeviceStatusConfig } from '@/app/(app)/devices/utils/device-status';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import type { DeviceSelectorProps } from './device-selector.types';
import { DeviceTabContent } from './device-tab-content';
import { useDeviceSelector } from './use-device-selector';

export function DeviceSelector({
  devices,
  loading,
  selectedIds,
  onSelectionChange,
  getDeviceKey,
  infiniteScroll,
  disabled = false,
  showSelectionModeRadio = true,
  headerContent,
  addAllBehavior = 'merge',
  singleSelect = false,
  isDeviceDisabled,
}: DeviceSelectorProps) {
  const { searchTerm, setSearchTerm, activeSubTab, handleTabChange, filteredDevices, displayDevices } =
    useDeviceSelector({ devices, selectedIds, getDeviceKey });

  // Read latest selectedIds via ref so toggleDevice can stay reference-stable.
  // The DataTable rows are React.memo'd; rows that don't re-render keep an old
  // toggleDevice closure, and a stale closure that captured an outdated
  // selectedIds would corrupt the set on the next click.
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const toggleDevice = useCallback(
    (device: Device) => {
      if (disabled) return;
      if (isDeviceDisabled?.(device)) return;
      const key = getDeviceKey(device);
      if (key === undefined) return;

      const current = selectedIdsRef.current;
      if (singleSelect) {
        onSelectionChange(current.has(key) ? new Set() : new Set([key]));
        return;
      }

      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onSelectionChange(next);
    },
    [disabled, isDeviceDisabled, getDeviceKey, onSelectionChange, singleSelect],
  );

  const addAllDevices = useCallback(() => {
    if (disabled) return;
    const base = addAllBehavior === 'replace' ? new Set<string>() : new Set(selectedIds);
    for (const d of filteredDevices) {
      if (isDeviceDisabled?.(d)) continue;
      const key = getDeviceKey(d);
      if (key !== undefined) {
        base.add(key);
      }
    }
    onSelectionChange(base);
  }, [disabled, isDeviceDisabled, addAllBehavior, selectedIds, filteredDevices, getDeviceKey, onSelectionChange]);

  const removeAllSelected = useCallback(() => {
    if (disabled) return;
    onSelectionChange(new Set());
  }, [disabled, onSelectionChange]);

  const columns: TableColumn<Device>[] = useMemo(
    () => [
      {
        key: 'device',
        label: 'DEVICE',
        renderCell: (device: Device) => {
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
                <span className="text-h6 text-ods-text-secondary truncate">
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
        hideAt: 'md',
        renderCell: (device: Device) => {
          return <OSTypeBadge osType={device.osType} />;
        },
      },
      {
        key: 'organization',
        label: 'ORGANIZATION',
        width: 'w-1/4',
        hideAt: 'lg',
        renderCell: (device: Device) => {
          const fullImageUrl = getFullImageUrl(device.organizationImageUrl);
          return (
            <div className="flex items-center gap-3">
              {featureFlags.organizationImages.displayEnabled() && (
                <OrganizationIcon
                  imageUrl={fullImageUrl}
                  organizationName={device.organization || 'Organization'}
                  size="sm"
                />
              )}
              <span className="text-h4 text-ods-text-primary truncate">{device.organization || ''}</span>
            </div>
          );
        },
      },
      {
        key: 'status',
        label: 'STATUS',
        width: 'w-[90px]',
        renderCell: (device: Device) => {
          const config = getDeviceStatusConfig(device.status);
          return <Tag label={config.label} variant={config.variant} className="w-min" />;
        },
      },
    ],
    [],
  );

  const renderRowActions = useMemo(
    () => (device: Device) => {
      const disabledReason = isDeviceDisabled?.(device);

      if (disabledReason) {
        return (
          <div className="flex items-center justify-end gap-2 w-[130px]">
            <span className="text-xs text-ods-text-secondary text-right leading-tight whitespace-pre-line">
              {disabledReason}
            </span>
            <Button
              variant="device-action"
              size="icon"
              centerIcon={<PlusCircleIcon size={24} />}
              className="text-ods-text-secondary shrink-0"
              disabled
            />
          </div>
        );
      }

      const key = getDeviceKey(device);
      if (key === undefined) return null;

      const isSelected = selectedIds.has(key);

      if (activeSubTab === 'selected') {
        return (
          <div className="flex items-center justify-end w-[130px]">
            <Button
              variant="device-action"
              size="icon"
              onClick={() => toggleDevice(device)}
              centerIcon={<TrashIcon size={24} />}
              className="text-ods-error hover:opacity-80"
              disabled={disabled}
            />
          </div>
        );
      }

      return (
        <div className="flex items-center justify-end w-[130px]">
          <Button
            variant="device-action"
            size="icon"
            onClick={() => toggleDevice(device)}
            centerIcon={isSelected ? <CheckCircleIcon size={24} /> : <PlusCircleIcon size={24} />}
            className={
              isSelected
                ? 'text-ods-accent border-ods-accent bg-[var(--ods-open-yellow-secondary)] hover:bg-[var(--ods-open-yellow-secondary-hover)]'
                : 'text-ods-text-secondary hover:text-ods-text-primary'
            }
            disabled={disabled}
          />
        </div>
      );
    },
    [selectedIds, getDeviceKey, isDeviceDisabled, toggleDevice, activeSubTab, disabled],
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
        label: singleSelect ? `Selected Device (${selectedIds.size})` : `Selected Devices (${selectedIds.size})`,
        icon: CheckCircleIcon,
        component: DeviceTabContent,
      },
    ],
    [selectedIds.size, singleSelect],
  );

  const ActiveTabComponent = getTabComponent(assignTabs, activeSubTab);

  const availableInfiniteScroll = activeSubTab === 'available' ? infiniteScroll : undefined;

  // Per-row className whose value differs by selection state. DataTableRow is
  // React.memo'd on `className`, so only rows whose selection actually flipped
  // re-render — the rest keep their cached cells (with stable toggleDevice).
  const rowClassName = useCallback(
    (device: Device): string => {
      const key = getDeviceKey(device);
      if (key === undefined) return '';
      return selectedIds.has(key) ? 'is-selected' : '';
    },
    [selectedIds, getDeviceKey],
  );

  return (
    <div className="flex flex-col gap-4">
      {headerContent}

      {showSelectionModeRadio && (
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 p-4 bg-ods-card border border-ods-accent rounded-[6px] cursor-pointer">
            <input
              type="radio"
              name="selectionMode"
              value="specific"
              defaultChecked
              disabled={disabled}
              className="mt-1 accent-ods-accent"
            />
            <div className="flex flex-col">
              <span className="text-h4 text-ods-text-primary">Select Specific Devices</span>
              <span className="text-h6 text-ods-text-secondary">
                Choose individual devices to include in this selection
              </span>
            </div>
          </label>
          <label className="flex items-start gap-3 p-4 bg-ods-card border border-ods-border rounded-[6px] opacity-50 cursor-not-allowed">
            <input type="radio" name="selectionMode" value="criteria" disabled className="mt-1" />
            <div className="flex flex-col flex-1">
              <span className="text-h4 text-ods-text-primary">Select Devices by Criteria</span>
              <span className="text-h6 text-ods-text-secondary">
                Automatically include all devices (current and future) that match your defined criteria
              </span>
            </div>
            <span className="text-h5 px-3 py-1 bg-ods-card border border-ods-border rounded-[4px] text-ods-text-secondary">
              Coming Soon
            </span>
          </label>
        </div>
      )}

      {!singleSelect && (
        <TabNavigation tabs={assignTabs} activeTab={activeSubTab} onTabChange={handleTabChange} showRightGradient />
      )}

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
        activeTab={singleSelect ? 'available' : activeSubTab}
        TabComponent={ActiveTabComponent}
        componentProps={{
          mode: singleSelect ? 'available' : activeSubTab,
          devices: singleSelect ? filteredDevices : displayDevices,
          columns,
          loading,
          renderRowActions,
          onAddAll: addAllDevices,
          onRemoveAll: removeAllSelected,
          selectedCount: selectedIds.size,
          disabled,
          infiniteScroll: availableInfiniteScroll,
          singleSelect,
          isDeviceDisabled,
          rowClassName,
        }}
      />
    </div>
  );
}
