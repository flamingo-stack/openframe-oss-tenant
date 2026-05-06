'use client';

import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMemo, useState } from 'react';
import {
  OrganizationsSearchInput,
  OrganizationsTableBody,
} from '@/app/(app)/organizations/components/organizations-table-columns';
import type { Organization } from '@/app/(app)/organizations/hooks/use-organizations';

interface OrganizationsAssignedTableProps {
  organizations: Organization[];
  isLoading?: boolean;
}

export function OrganizationsAssignedTable({ organizations, isLoading }: OrganizationsAssignedTableProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return organizations;
    return organizations.filter(
      o => o.name.toLowerCase().includes(needle) || o.contact.email.toLowerCase().includes(needle),
    );
  }, [organizations, debouncedSearch]);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-mf)]">
      <OrganizationsSearchInput value={search} onChange={setSearch} />
      <OrganizationsTableBody
        organizations={filtered}
        isLoading={isLoading}
        emptyMessage="No organizations assigned."
        skeletonRows={3}
      />
    </div>
  );
}
