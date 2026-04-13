'use client';

import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo } from 'react';
import { useCreateTagMutation } from '@/app/components/shared/tags';
import { useTicketLabels } from '../../hooks/use-ticket-labels';

interface TicketTagsManagerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function TicketTagsManager({ selectedIds, onChange, disabled }: TicketTagsManagerProps) {
  const { data: tags = [], refetch } = useTicketLabels();
  const { createTag, isInFlight: isCreating } = useCreateTagMutation();

  const options = useMemo(() => tags.map(t => ({ label: t.key, value: t.id })), [tags]);

  const handleChange = useCallback(
    (values: string[]) => {
      const existingIds = values.filter(v => tags.some(t => t.id === v));
      const newKeys = values.filter(v => !tags.some(t => t.id === v));

      if (newKeys.length > 0) {
        for (const key of newKeys) {
          createTag({ key, entityType: 'TICKET' }, newId => {
            refetch().then(() => {
              if (newId) onChange([...existingIds, newId]);
            });
          });
        }
      } else {
        onChange(existingIds);
      }
    },
    [tags, onChange, createTag, refetch],
  );

  return (
    <Autocomplete
      multiple
      options={options}
      value={selectedIds}
      onChange={handleChange}
      placeholder={selectedIds.length > 0 ? 'Add more...' : 'Select or create tags...'}
      label="Tags"
      loading={isCreating}
      disabled={disabled}
      showChevron={false}
      creatable
      freeSolo
    />
  );
}
