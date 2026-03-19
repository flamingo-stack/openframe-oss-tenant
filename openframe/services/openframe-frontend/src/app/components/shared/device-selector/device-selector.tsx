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
  type TableColumn,
  TabNavigation,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { useCallback, useMemo } from 'react';
import type { Device } from '../../../devices/types/device.types';
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
  extraColumns,
}: DeviceSelectorProps) {
  const { searchTerm, setSearchTerm, activeSubTab, handleTabChange, filteredDevices, displayDevices } =
    useDeviceSelector({ devices, selectedIds, getDeviceKey });

  const toggleDevice = useCallback(
    (device: Device) => {
      if (disabled) return;
      const key = getDeviceKey(device);
      if (key === undefined) return;

      const next = new Set(selectedIds);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onSelectionChange(next);
    },
    [disabled, getDeviceKey, selectedIds, onSelectionChange],
  );

  const addAllDevices = useCallback(() => {
    if (disabled) return;
    const base = addAllBehavior === 'replace' ? new Set<string>() : new Set(selectedIds);
    for (const d of filteredDevices) {
      const key = getDeviceKey(d);
      if (key !== undefined) {
        base.add(key);
      }
    }
    onSelectionChange(base);
  }, [disabled, addAllBehavior, selectedIds, filteredDevices, getDeviceKey, onSelectionChange]);

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
        renderCell: (device: Device) => {
          return <OSTypeBadge osType={device.osType} />;
        },
      },
      ...(extraColumns ?? []),
    ],
    [extraColumns],
  );

  const renderRowActions = useMemo(
    () => (device: Device) => {
      const key = getDeviceKey(device);
      if (key === undefined) return null;

      const isSelected = selectedIds.has(key);

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
    [selectedIds, getDeviceKey, toggleDevice, activeSubTab, disabled],
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
        label: `Selected Devices (${selectedIds.size})`,
        icon: CheckCircleIcon,
        component: DeviceTabContent,
      },
    ],
    [selectedIds.size],
  );

  const ActiveTabComponent = getTabComponent(assignTabs, activeSubTab);

  const availableInfiniteScroll = activeSubTab === 'available' ? infiniteScroll : undefined;

  return (
    <div className="flex flex-col gap-4">
      {headerContent}

      {showSelectionModeRadio && (
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 p-4 bg-ods-card border border-[var(--open-colors-yellow,#ffc008)] rounded-[6px] cursor-pointer">
            <input
              type="radio"
              name="selectionMode"
              value="specific"
              defaultChecked
              disabled={disabled}
              className="mt-1 accent-[var(--open-colors-yellow,#ffc008)]"
            />
            <div className="flex flex-col">
              <span className="text-h4 text-ods-text-primary">Select Specific Devices</span>
              <span className="text-[14px] text-ods-text-secondary">
                Choose individual devices to include in this selection
              </span>
            </div>
          </label>
          <label className="flex items-start gap-3 p-4 bg-ods-card border border-ods-border rounded-[6px] opacity-50 cursor-not-allowed">
            <input type="radio" name="selectionMode" value="criteria" disabled className="mt-1" />
            <div className="flex flex-col flex-1">
              <span className="text-h4 text-ods-text-primary">Select Devices by Criteria</span>
              <span className="text-[14px] text-ods-text-secondary">
                Automatically include all devices (current and future) that match your defined criteria
              </span>
            </div>
            <span className="font-['Azeret_Mono'] font-medium text-[12px] px-3 py-1 bg-ods-card border border-ods-border rounded-[4px] text-ods-text-secondary uppercase tracking-wider">
              Coming Soon
            </span>
          </label>
        </div>
      )}

      <TabNavigation tabs={assignTabs} activeTab={activeSubTab} onTabChange={handleTabChange} />

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
          loading,
          renderRowActions,
          onAddAll: addAllDevices,
          onRemoveAll: removeAllSelected,
          selectedCount: selectedIds.size,
          disabled,
          infiniteScroll: availableInfiniteScroll,
        }}
      />
    </div>
  );
}
