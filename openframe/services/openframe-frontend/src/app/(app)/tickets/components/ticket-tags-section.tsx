'use client';

import { PlusIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Autocomplete, Button, Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo, useState } from 'react';
import { useCreateTagMutation } from '@/app/components/shared/tags';
import { useSetTicketLabels } from '../hooks/use-ticket-detail-mutations';
import { useTicketLabels } from '../hooks/use-ticket-labels';
import type { Dialog } from '../types/dialog.types';

interface TicketTagsSectionProps {
  ticketId: string;
  labels: NonNullable<Dialog['labels']>;
}

export function TicketTagsSection({ ticketId, labels }: TicketTagsSectionProps) {
  const [adding, setAdding] = useState(false);
  const { data: allLabels = [] } = useTicketLabels();
  const { createTag } = useCreateTagMutation();
  const setLabels = useSetTicketLabels(ticketId);

  const currentIds = useMemo(() => labels.map(l => l.id), [labels]);
  const options = useMemo(
    () => allLabels.filter(t => !currentIds.includes(t.id)).map(t => ({ label: t.key, value: t.id })),
    [allLabels, currentIds],
  );

  const addExisting = (id: string | null) => {
    if (id && allLabels.some(t => t.id === id)) setLabels.mutate([...currentIds, id]);
  };
  const removeTag = (id: string) => setLabels.mutate(currentIds.filter(cid => cid !== id));
  const createAndAdd = (key: string) =>
    createTag({ key, entityType: 'TICKET' }, realId => {
      if (realId) setLabels.mutate([...currentIds, realId]);
    });

  return (
    <section className="flex flex-col gap-[var(--spacing-system-xxs)]">
      <p className="text-h5 text-ods-text-secondary">Tags</p>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-[var(--spacing-system-xxs)]">
          {labels.map(l => (
            <Tag
              key={l.id}
              label={l.key}
              variant="outline"
              onClose={() => removeTag(l.id)}
              disabled={setLabels.isPending}
              className="max-w-full min-w-0"
              labelClassName="min-w-0"
            />
          ))}
        </div>
      )}
      {adding && (
        <Autocomplete
          options={options}
          value={null}
          onChange={addExisting}
          creatable
          onCreateOption={createAndAdd}
          placeholder="Search or create tags..."
          showChevron={false}
          loading={setLabels.isPending}
          disabled={setLabels.isPending}
        />
      )}
      <Button
        variant="outline"
        size="small"
        leftIcon={<PlusIcon />}
        onClick={() => setAdding(a => !a)}
        className="w-fit"
      >
        {adding ? 'Done' : 'Add Tags'}
      </Button>
    </section>
  );
}
