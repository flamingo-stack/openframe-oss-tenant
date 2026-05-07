'use client';

import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Input } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMemo, useState } from 'react';
import { DevicesTableBody } from '@/app/(app)/devices/components/devices-table-columns';
import type { Device } from '@/app/(app)/devices/types/device.types';

interface DevicesAssignedTableProps {
  devices: Device[];
  isLoading?: boolean;
}

export function DevicesAssignedTable({ devices, isLoading }: DevicesAssignedTableProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return devices;
    return devices.filter(d => {
      const name = (d.displayName || d.hostname || '').toLowerCase();
      const org = (d.organization || '').toLowerCase();
      return name.includes(needle) || org.includes(needle);
    });
  }, [devices, debouncedSearch]);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-mf)]">
      <Input
        placeholder="Search for Device"
        value={search}
        onChange={e => setSearch(e.target.value)}
        startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
      />
      <DevicesTableBody devices={filtered} isLoading={isLoading} emptyMessage="No devices assigned." skeletonRows={3} />
    </div>
  );
}
