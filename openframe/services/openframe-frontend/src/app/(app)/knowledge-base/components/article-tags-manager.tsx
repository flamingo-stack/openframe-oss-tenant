'use client';

import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo, useState } from 'react';
import { TagDeleteConfirmDialog } from '@/app/components/shared/tags';
import { type KnowledgeBaseTag, useDeleteKnowledgeBaseTag } from '../hooks/use-knowledge-base-tags';

interface ArticleTagsManagerProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  availableTags: ReadonlyArray<KnowledgeBaseTag>;
  disabled?: boolean;
}

export function ArticleTagsManager({ selected, onChange, availableTags, disabled }: ArticleTagsManagerProps) {
  const { deleteTag, isPending: isDeleting } = useDeleteKnowledgeBaseTag();
  const [tagToDelete, setTagToDelete] = useState<{ id: string; key: string } | null>(null);

  const options = useMemo(() => {
    const keys = new Set<string>(availableTags.map(t => t.key));
    for (const key of selected) keys.add(key);
    return Array.from(keys).map(key => ({ label: key, value: key }));
  }, [availableTags, selected]);

  const requestDelete = (key: string) => {
    const tag = availableTags.find(t => t.key === key);
    if (tag) setTagToDelete({ id: tag.id, key });
  };

  // Deletes the tag entity globally; drop it from this article too if attached.
  const confirmDelete = () => {
    if (!tagToDelete) return;
    deleteTag(tagToDelete.id, () => {
      onChange(selected.filter(k => k !== tagToDelete.key));
      setTagToDelete(null);
    });
  };

  return (
    <>
      <Autocomplete
        multiple
        creatable
        freeSolo
        label="Search and add Tags"
        placeholder={selected.length > 0 ? 'Add more...' : 'Select or create tags...'}
        options={options}
        value={selected}
        onChange={onChange}
        disabled={disabled}
        showChevron={false}
        maxCreateLength={25}
        onDeleteOption={requestDelete}
        isDeletingOption={isDeleting}
      />
      <TagDeleteConfirmDialog
        entityLabel="article"
        tagName={tagToDelete?.key}
        open={tagToDelete !== null}
        isPending={isDeleting}
        onClose={() => setTagToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
