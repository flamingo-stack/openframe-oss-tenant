'use client';

import { useCallback, useState } from 'react';
import { TagDeleteConfirmDialog, useDeleteTagMutation } from '@/app/components/shared/tags';
import { useTicketLabels } from './use-ticket-labels';

/**
 * Tag-delete flow shared by the ticket detail tags section and the create/edit
 * tags field: owns the confirm-dialog state, the global delete mutation, and the
 * tag-list refetch. `onTagDeleted` lets each caller drop the tag from its own
 * selection (live ticket vs. form state). Returns a ready-to-render dialog.
 */
export function useTicketTagDelete(onTagDeleted: (id: string) => void) {
  const { data: tags = [], refetch } = useTicketLabels();
  const { deleteTag, isInFlight: isDeleting } = useDeleteTagMutation();
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const confirmDelete = useCallback(() => {
    if (!tagToDelete) return;
    deleteTag(tagToDelete, () => {
      onTagDeleted(tagToDelete);
      refetch();
      setTagToDelete(null);
    });
  }, [deleteTag, tagToDelete, onTagDeleted, refetch]);

  const dialog = (
    <TagDeleteConfirmDialog
      entityLabel="ticket"
      tagName={tags.find(t => t.id === tagToDelete)?.key}
      open={tagToDelete !== null}
      isPending={isDeleting}
      onClose={() => setTagToDelete(null)}
      onConfirm={confirmDelete}
    />
  );

  return { requestDelete: setTagToDelete, isDeleting, dialog };
}
