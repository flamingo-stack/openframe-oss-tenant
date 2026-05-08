'use client';

import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Input } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMemo, useState } from 'react';
import { TicketTableBody } from '@/app/(app)/tickets/components/ticket-table-columns';
import type { Dialog } from '@/app/(app)/tickets/types/dialog.types';

interface TicketsAssignedTableProps {
  tickets: Dialog[];
  isLoading?: boolean;
}

export function TicketsAssignedTable({ tickets, isLoading }: TicketsAssignedTableProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return tickets;
    return tickets.filter(t => {
      const title = (t.title ?? '').toLowerCase();
      const org = (t.organizationName ?? '').toLowerCase();
      return title.includes(needle) || org.includes(needle);
    });
  }, [tickets, debouncedSearch]);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-mf)]">
      <Input
        placeholder="Search for Ticket"
        value={search}
        onChange={e => setSearch(e.target.value)}
        startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
      />
      <TicketTableBody tickets={filtered} isLoading={isLoading} emptyMessage="No tickets assigned." skeletonRows={3} />
    </div>
  );
}
