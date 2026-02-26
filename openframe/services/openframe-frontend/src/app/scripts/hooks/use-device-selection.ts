import { useCallback, useState } from 'react';
import type { Device } from '../../devices/types/device.types';
import { getDevicePrimaryId } from '../utils/device-helpers';

export function useDeviceSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllDisplayed = useCallback((devices: Device[]) => {
    const ids = devices.map(d => getDevicePrimaryId(d));
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelect,
    selectAllDisplayed,
    clearSelection,
  };
}
