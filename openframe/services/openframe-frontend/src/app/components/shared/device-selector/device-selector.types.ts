import type { ReactNode } from 'react';
import type { Device } from '@/app/(app)/devices/types/device.types';

export type SubTab = 'available' | 'selected';

export interface InfiniteScrollConfig {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  skeletonRows: number;
}

export interface DeviceSelectorProps {
  /** Devices to display. Consumer controls fetching and pre-filtering. */
  devices: Device[];
  /** Whether the device list is loading. */
  loading: boolean;
  /** Set of currently selected device keys (string). Required unless `readOnly`. */
  selectedIds?: Set<string>;
  /** Called when selection changes. Required unless `readOnly`. */
  onSelectionChange?: (ids: Set<string>) => void;
  /** Extract the unique string key for selection from a device. Defaults to `d.machineId ?? d.id`. */
  getDeviceKey?: (device: Device) => string | undefined;
  /**
   * Read-only viewer mode. Skips Available/Selected tabs, selection radio and
   * +/- action buttons. The consumer no longer needs `selectedIds` /
   * `onSelectionChange`. Combine with `hideColumns: ['actions']` to remove the
   * trailing action column entirely.
   */
  readOnly?: boolean;
  /** Infinite scroll config for the available tab. */
  infiniteScroll?: InfiniteScrollConfig;
  /** Disable all interactions (e.g. during save). */
  disabled?: boolean;
  /** Show selection mode radio group. Default: true. */
  showSelectionModeRadio?: boolean;
  /** Extra content rendered above the selection radio / tabs (e.g. ScheduleInfoBar). */
  headerContent?: ReactNode;
  /** Table rowKey. Default: "id". */
  rowKey?: string;
  /** "replace" replaces entire selection on Add All; "merge" adds to existing. Default: "merge". */
  addAllBehavior?: 'replace' | 'merge';
  /** Allow only one device to be selected at a time. Default: false. */
  singleSelect?: boolean;
  /** Return a tooltip string if the device should be disabled, or undefined if enabled. */
  isDeviceDisabled?: (device: Device) => string | undefined;
  /** Column ids to drop from the table (e.g. `['organization', 'status']` to leave only device + os). */
  hideColumns?: string[];
}
