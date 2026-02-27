import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Devices Store
 * Manages device state for the OpenFrame platform
 */

export interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'laptop' | 'server' | 'mobile' | 'iot' | 'unknown';
  status: 'online' | 'offline' | 'idle' | 'error';
  lastSeen: string;
  agentVersion?: string;
  osName?: string;
  osVersion?: string;
  ipAddress?: string;
  location?: string;
  tags?: string[];
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    networkLatency?: number;
  };
}

export interface DeviceFilter {
  status?: Device['status'][];
  type?: Device['type'][];
  tags?: string[];
  searchQuery?: string;
}

export interface DevicesState {
  // State
  devices: Device[];
  selectedDevice: Device | null;
  filter: DeviceFilter;
  sortBy: 'name' | 'lastSeen' | 'status' | 'type';
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  error: string | null;
  lastFetch: string | null;

  // Actions
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  removeDevice: (id: string) => void;
  selectDevice: (device: Device | null) => void;
  setFilter: (filter: DeviceFilter) => void;
  setSorting: (sortBy: DevicesState['sortBy'], sortOrder?: DevicesState['sortOrder']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshDevices: () => void;
  clearFilters: () => void;
  reset: () => void;
}

const initialState = {
  devices: [],
  selectedDevice: null,
  filter: {},
  sortBy: 'name' as const,
  sortOrder: 'asc' as const,
  isLoading: false,
  error: null,
  lastFetch: null,
};

export const useDevicesStore = create<DevicesState>()(
  devtools(
    immer((set, get) => ({
      // State
      ...initialState,

      // Actions
      setDevices: devices =>
        set(state => {
          state.devices = devices;
          state.lastFetch = new Date().toISOString();
          state.error = null;
        }),

      addDevice: device =>
        set(state => {
          state.devices.push(device);
        }),

      updateDevice: (id, updates) =>
        set(state => {
          const index = state.devices.findIndex(d => d.id === id);
          if (index !== -1) {
            Object.assign(state.devices[index], updates);
          }
          if (state.selectedDevice?.id === id) {
            Object.assign(state.selectedDevice, updates);
          }
        }),

      removeDevice: id =>
        set(state => {
          state.devices = state.devices.filter(d => d.id !== id);
          if (state.selectedDevice?.id === id) {
            state.selectedDevice = null;
          }
        }),

      selectDevice: device =>
        set(state => {
          state.selectedDevice = device;
        }),

      setFilter: filter =>
        set(state => {
          state.filter = filter;
        }),

      setSorting: (sortBy, sortOrder) =>
        set(state => {
          state.sortBy = sortBy;
          if (sortOrder) {
            state.sortOrder = sortOrder;
          } else {
            // Toggle order if same field
            if (state.sortBy === sortBy) {
              state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
              state.sortOrder = 'asc';
            }
          }
        }),

      setLoading: loading =>
        set(state => {
          state.isLoading = loading;
        }),

      setError: error =>
        set(state => {
          state.error = error;
          state.isLoading = false;
        }),

      refreshDevices: () => {
        // This would typically trigger a refetch
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
      },

      clearFilters: () =>
        set(state => {
          state.filter = {};
        }),

      reset: () => set(() => initialState),
    })),
    {
      name: 'devices-store',
    },
  ),
);

// Selectors
export const selectDevices = (state: DevicesState) => state.devices;
export const selectSelectedDevice = (state: DevicesState) => state.selectedDevice;
export const selectFilter = (state: DevicesState) => state.filter;
export const selectIsLoading = (state: DevicesState) => state.isLoading;
export const selectError = (state: DevicesState) => state.error;

// Computed selectors
export const selectFilteredDevices = (state: DevicesState) => {
  let filtered = [...state.devices];

  // Apply filters
  const { status, type, tags, searchQuery } = state.filter;

  if (status && status.length > 0) {
    filtered = filtered.filter(d => status.includes(d.status));
  }

  if (type && type.length > 0) {
    filtered = filtered.filter(d => type.includes(d.type));
  }

  if (tags && tags.length > 0) {
    filtered = filtered.filter(d => tags.some(tag => d.tags?.includes(tag)));
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      d =>
        d.name.toLowerCase().includes(query) ||
        d.ipAddress?.toLowerCase().includes(query) ||
        d.location?.toLowerCase().includes(query),
    );
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0;

    switch (state.sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'lastSeen':
        comparison = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
    }

    return state.sortOrder === 'asc' ? comparison : -comparison;
  });

  return filtered;
};

export const selectDeviceStats = (state: DevicesState) => ({
  total: state.devices.length,
  online: state.devices.filter(d => d.status === 'online').length,
  offline: state.devices.filter(d => d.status === 'offline').length,
  idle: state.devices.filter(d => d.status === 'idle').length,
  error: state.devices.filter(d => d.status === 'error').length,
});
