'use client';

import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo, useState } from 'react';
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

  const [optimisticTags, setOptimisticTags] = useState<Array<{ key: string; tempId: string }>>([]);

  const options = useMemo(
    () => [
      ...tags.map(t => ({ label: t.key, value: t.id })),
      ...optimisticTags.map(t => ({ label: t.key, value: t.tempId })),
    ],
    [tags, optimisticTags],
  );

  const handleChange = useCallback(
    (values: string[]) => {
      const existingIds = values.filter(v => tags.some(t => t.id === v) || optimisticTags.some(t => t.tempId === v));
      const newKeys = values.filter(v => !tags.some(t => t.id === v) && !optimisticTags.some(t => t.tempId === v));

      if (newKeys.length > 0) {
        for (const key of newKeys) {
          const tempId = `_optimistic_${crypto.randomUUID()}`;

          setOptimisticTags(prev => [...prev, { key, tempId }]);
          onChange([...existingIds, tempId]);

          createTag({ key, entityType: 'TICKET' }, realId => {
            refetch().then(() => {
              setOptimisticTags(prev => prev.filter(t => t.tempId !== tempId));
              if (realId) {
                onChange([...existingIds, realId]);
              }
            });
          });
        }
      } else {
        onChange(existingIds);
      }
    },
    [tags, optimisticTags, onChange, createTag, refetch],
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
