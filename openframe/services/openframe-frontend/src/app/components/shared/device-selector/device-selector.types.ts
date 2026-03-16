import type { TableColumn } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';
import type { Device } from '../../../devices/types/device.types';

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
  /** Set of currently selected device keys (string). */
  selectedIds: Set<string>;
  /** Called when selection changes. */
  onSelectionChange: (ids: Set<string>) => void;
  /** Extract the unique string key for selection from a device. Return undefined to exclude. */
  getDeviceKey: (device: Device) => string | undefined;
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
}

export interface DeviceTabContentProps {
  mode: SubTab;
  devices: Device[];
  columns: TableColumn<Device>[];
  loading: boolean;
  renderRowActions: (device: Device) => ReactNode;
  onAddAll: () => void;
  onRemoveAll: () => void;
  selectedCount: number;
  disabled?: boolean;
  infiniteScroll?: InfiniteScrollConfig;
}
