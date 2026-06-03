import { useCallback, useMemo, useState } from 'react';
import type { Device } from '@/app/(app)/devices/types/device.types';
import type { SubTab } from './device-selector.types';

interface UseDeviceSelectorParams {
  devices: Device[];
  selectedIds: Set<string>;
  getDeviceKey: (device: Device) => string | undefined;
}

export function useDeviceSelector({ devices, selectedIds, getDeviceKey }: UseDeviceSelectorParams) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('available');

  const filteredDevices = useMemo(() => {
    if (!searchTerm) return devices;
    const lowerSearch = searchTerm.toLowerCase();
    return devices.filter(
      d =>
        (d.displayName || d.hostname || '').toLowerCase().includes(lowerSearch) ||
        (d.osType || d.operating_system || '').toLowerCase().includes(lowerSearch),
    );
  }, [devices, searchTerm]);

  const displayDevices = useMemo(() => {
    if (activeSubTab === 'selected') {
      return filteredDevices.filter(d => {
        const key = getDeviceKey(d);
        return key !== undefined && selectedIds.has(key);
      });
    }
    return filteredDevices;
  }, [filteredDevices, activeSubTab, selectedIds, getDeviceKey]);

  const handleTabChange = useCallback((tabId: string) => {
    setSearchTerm('');
    setActiveSubTab(tabId as SubTab);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    activeSubTab,
    handleTabChange,
    filteredDevices,
    displayDevices,
  };
}
