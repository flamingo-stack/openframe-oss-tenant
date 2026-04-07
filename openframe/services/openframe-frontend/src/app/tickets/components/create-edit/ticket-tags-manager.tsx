'use client';

import { TagsManager } from '@flamingo-stack/openframe-frontend-core/components/ui';
import {
  useCreateTicketLabel,
  useDeleteTicketLabel,
  useTicketLabels,
  useUpdateTicketLabel,
} from '../../hooks/use-ticket-labels';

interface TicketTagsManagerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function TicketTagsManager({ selectedIds, onChange, disabled }: TicketTagsManagerProps) {
  const { data: labels = [] } = useTicketLabels();
  const createLabel = useCreateTicketLabel();
  const updateLabel = useUpdateTicketLabel();
  const deleteLabel = useDeleteTicketLabel();

  return (
    <TagsManager
      tags={labels}
      selectedIds={selectedIds}
      onChange={onChange}
      disabled={disabled}
      onCreateTag={async name => {
        const result = await createLabel.mutateAsync({ name });
        return result ?? null;
      }}
      onUpdateTag={async (id, name) => {
        await updateLabel.mutateAsync({ id, name });
      }}
      onDeleteTag={async id => {
        await deleteLabel.mutateAsync(id);
      }}
      isCreating={createLabel.isPending}
      isUpdating={updateLabel.isPending}
      isDeleting={deleteLabel.isPending}
    />
  );
}
