'use client';

import { Tag, TagSelectDropdown } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import { useCreateTagMutation } from '@/app/components/shared/tags';
import { useSetTicketLabels } from '../hooks/use-ticket-detail-mutations';
import { useTicketLabels } from '../hooks/use-ticket-labels';
import { useTicketTagDelete } from '../hooks/use-ticket-tag-delete';
import type { Dialog } from '../types/dialog.types';

interface TicketTagsSectionProps {
  ticketId: string;
  labels: NonNullable<Dialog['labels']>;
}

export function TicketTagsSection({ ticketId, labels }: TicketTagsSectionProps) {
  const { data: allLabels = [], refetch } = useTicketLabels();
  const { createTag, isInFlight: isCreating } = useCreateTagMutation();
  const setLabels = useSetTicketLabels(ticketId);

  const options = useMemo(() => allLabels.map(t => ({ id: t.id, label: t.key })), [allLabels]);
  const selectedIds = useMemo(() => labels.map(l => l.id), [labels]);

  const { requestDelete, isDeleting, dialog } = useTicketTagDelete(id => {
    if (selectedIds.includes(id)) setLabels.mutate(selectedIds.filter(cid => cid !== id));
  });

  const handleChange = (ids: string[]) => setLabels.mutate(ids);
  const removeTag = (id: string) => setLabels.mutate(selectedIds.filter(cid => cid !== id));
  const handleCreate = (name: string) => {
    createTag({ key: name, entityType: 'TICKET' }, realId => {
      refetch().then(() => {
        if (realId) setLabels.mutate([...selectedIds, realId]);
      });
    });
  };

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
      <TagSelectDropdown
        options={options}
        selectedIds={selectedIds}
        onChange={handleChange}
        onCreate={handleCreate}
        maxCreateLength={25}
        onDelete={requestDelete}
        isCreating={isCreating}
        isDeleting={isDeleting}
        searchPlaceholder="Search or create tags..."
      />
      {dialog}
    </section>
  );
}
