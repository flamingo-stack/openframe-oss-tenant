import { useEffect, useMemo, useState } from 'react';
import type { Device } from '../../devices/types/device.types';
import { useOrganizationsMin } from '../../organizations/hooks/use-organizations-min';

interface UseDeviceFilterOptions {
  devices: Device[];
  /** Set to false to skip fetching organizations (e.g. when modal is closed) */
  enabled?: boolean;
}

export function useDeviceFilter({ devices, enabled = true }: UseDeviceFilterOptions) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);

  const { items: allOrganizations, fetch: fetchOrgs } = useOrganizationsMin();

  useEffect(() => {
    if (enabled) {
      fetchOrgs('');
    }
  }, [fetchOrgs, enabled]);

  const organizationOptions = useMemo(() => {
    return allOrganizations.map(org => ({
      label: org.name,
      value: org.organizationId,
    }));
  }, [allOrganizations]);

  const filteredDevices = useMemo(() => {
    let filtered = devices;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d => {
        const name = (d.displayName || d.hostname || '').toLowerCase();
        const os = (d.osType || d.operating_system || '').toLowerCase();
        return name.includes(term) || os.includes(term);
      });
    }
    if (selectedOrgIds.length > 0) {
      filtered = filtered.filter(d => d.organizationId && selectedOrgIds.includes(d.organizationId));
    }
    return filtered;
  }, [devices, searchTerm, selectedOrgIds]);

  return {
    searchTerm,
    setSearchTerm,
    selectedOrgIds,
    setSelectedOrgIds,
    organizationOptions,
    filteredDevices,
  };
}
