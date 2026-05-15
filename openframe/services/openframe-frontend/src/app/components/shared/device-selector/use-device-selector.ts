import { useCallback, useMemo, useState } from 'react';
import type { Device } from '@/app/(app)/devices/types/device.types';
import type { SubTab } from './device-selector.types';

interface UseDeviceSelectorParams {
  devices: Device[];
  selectedIds: Set<string>;
  getDeviceKey: (device: Device) => string | undefined;
  /** "key:value" pairs to filter by. Multiple keys are AND'd, multiple values on the same key are OR'd. */
  selectedTags?: string[];
}

export function useDeviceSelector({ devices, selectedIds, getDeviceKey, selectedTags = [] }: UseDeviceSelectorParams) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('available');

  const filteredDevices = useMemo(() => {
    // Tag filter applied client-side: a device matches when, for every selected
    // `key:value` pair, the device has a tag with that key whose values include
    // the value. Multiple keys are AND'd; multiple values on the same key are OR'd.
    const byKey = new Map<string, string[]>();
    for (const t of selectedTags) {
      const i = t.indexOf(':');
      if (i <= 0 || i >= t.length - 1) continue;
      const key = t.slice(0, i);
      const value = t.slice(i + 1);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(value);
    }

    let result = devices;
    if (byKey.size > 0) {
      result = result.filter(d => {
        const deviceTags = d.tags ?? [];
        return Array.from(byKey.entries()).every(([key, values]) => {
          const matching = deviceTags.find(t => t.key === key);
          if (!matching) return false;
          return values.some(v => matching.values.includes(v));
        });
      });
    }

    if (!searchTerm) return result;
    const q = searchTerm.toLowerCase();
    return result.filter(
      d =>
        (d.displayName || d.hostname || '').toLowerCase().includes(q) ||
        (d.osType || d.operating_system || '').toLowerCase().includes(q),
    );
  }, [devices, searchTerm, selectedTags]);

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
