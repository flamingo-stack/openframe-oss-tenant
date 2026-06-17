'use client';

import { TagSearchInput, type TagSearchOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import { SelectableTagsRow } from '@/app/components/shared';
import { useTicketLabels } from '../hooks/use-ticket-labels';

interface TicketLabelSearchInputProps {
  search: string;
  onSearchChange: (value: string) => void;
  labelIds: string[];
  onLabelIdsChange: (ids: string[]) => void;
}

export function TicketLabelSearchInput({
  search,
  onSearchChange,
  labelIds,
  onLabelIdsChange,
}: TicketLabelSearchInputProps) {
  const { data: labels } = useTicketLabels();

  const tags = useMemo<TagSearchOption<string>[]>(() => {
    const keyById = new Map((labels ?? []).map(label => [label.id, label.key]));
    return labelIds.map(id => ({ value: id, label: keyById.get(id) ?? id }));
  }, [labels, labelIds]);

  return (
    <TagSearchInput<string>
      tags={tags}
      searchValue={search}
      onSearchChange={onSearchChange}
      onTagRemove={id => onLabelIdsChange(labelIds.filter(labelId => labelId !== id))}
      onClearAll={() => {
        onSearchChange('');
        onLabelIdsChange([]);
      }}
      placeholder="Search for Ticket"
      addMorePlaceholder="Search for Ticket"
    />
  );
}

interface TicketLabelsRowProps {
  selectedIds: string[];
  onAdd: (id: string) => void;
}

export function TicketLabelsRow({ selectedIds, onAdd }: TicketLabelsRowProps) {
  const { data: labels } = useTicketLabels();
  return <SelectableTagsRow tags={labels ?? []} selectedIds={selectedIds} onAdd={tag => onAdd(tag.id)} />;
}
