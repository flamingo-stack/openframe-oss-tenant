'use client';

import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMemo, useState } from 'react';
import { CustomersSearchInput, CustomersTableBody } from '@/app/(app)/customers/components/customers-table-columns';
import type { Customer } from '@/app/(app)/customers/hooks/use-customers';

interface CustomersAssignedTableProps {
  customers: Customer[];
  isLoading?: boolean;
}

export function CustomersAssignedTable({ customers, isLoading }: CustomersAssignedTableProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(
      c => c.name.toLowerCase().includes(needle) || c.contact.email.toLowerCase().includes(needle),
    );
  }, [customers, debouncedSearch]);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-mf)]">
      <CustomersSearchInput value={search} onChange={setSearch} />
      <CustomersTableBody
        customers={filtered}
        isLoading={isLoading}
        emptyMessage="No customers assigned."
        skeletonRows={3}
      />
    </div>
  );
}
