'use client';

import { type ReactNode, useMemo } from 'react';
import { TagFilterBar } from '@/app/components/shared';
import { useTicketLabels } from '../hooks/use-ticket-labels';

interface TicketTagFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  labelIds: string[];
  onLabelIdsChange: (ids: string[]) => void;
  /** Mobile filter button rendered next to the search input. */
  filterButton?: ReactNode;
}

/** Ticket label filter — the shared `TagFilterBar` fed by the tenant ticket labels. */
export function TicketTagFilter({
  search,
  onSearchChange,
  labelIds,
  onLabelIdsChange,
  filterButton,
}: TicketTagFilterProps) {
  const { data: labels, isLoading } = useTicketLabels();
  const tags = useMemo(() => (labels ?? []).map(label => ({ id: label.id, key: label.key })), [labels]);

  return (
    <TagFilterBar
      tags={tags}
      loading={isLoading}
      search={search}
      onSearchChange={onSearchChange}
      selectedIds={labelIds}
      onSelectedIdsChange={onLabelIdsChange}
      placeholder="Search for Ticket"
      filterButton={filterButton}
    />
  );
}
