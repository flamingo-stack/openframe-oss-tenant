'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core';
import { PlusCircle } from 'lucide-react';
import { useCallback } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { tagsEditor_keySuggestions$key as KeySuggestionsFragmentKey } from '@/__generated__/tagsEditor_keySuggestions.graphql';
import type { tagsEditorQuery as TagsEditorQueryType } from '@/__generated__/tagsEditorQuery.graphql';
import { TagRow } from './tag-row';
import type { TagEntry, TagEntryWithId } from './types';

const SUGGESTIONS_LIMIT = 20;

const tagsEditorRootQuery = graphql`
  query tagsEditorQuery($limit: Int) {
    ...tagsEditor_keySuggestions @arguments(limit: $limit)
  }
`;

// Exported so useTagKeySuggestions can import the fragment
export const keySuggestionsFragment = graphql`
  fragment tagsEditor_keySuggestions on Query
    @refetchable(queryName: "tagsEditorKeySuggestionsRefetchQuery")
    @argumentDefinitions(
      search: { type: "String" }
      limit: { type: "Int" }
    ) {
    tagKeySuggestions(search: $search, limit: $limit) {
      id
      key
      values
    }
  }
`;

interface TagsEditorProps {
  tags: TagEntryWithId[];
  onTagsChange: (tags: TagEntryWithId[]) => void;
  addLabel?: string;
}

export function TagsEditor({ tags, onTagsChange, addLabel = 'Add Tag' }: TagsEditorProps) {
  const queryData = useLazyLoadQuery<TagsEditorQueryType>(
    tagsEditorRootQuery,
    { limit: SUGGESTIONS_LIMIT },
    { fetchPolicy: 'store-or-network' },
  );

  const addTag = useCallback(() => {
    onTagsChange([...tags, { id: crypto.randomUUID(), key: '', values: [] }]);
  }, [tags, onTagsChange]);

  const updateTag = useCallback(
    (id: string, updated: TagEntry) => {
      onTagsChange(tags.map(t => (t.id === id ? { ...t, ...updated } : t)));
    },
    [tags, onTagsChange],
  );

  const deleteTag = useCallback(
    (id: string) => {
      onTagsChange(tags.filter(t => t.id !== id));
    },
    [tags, onTagsChange],
  );

  const existingKeys = tags.map(t => t.key).filter(Boolean);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
      <div className="flex flex-col gap-[var(--spacing-system-l)]">
        {tags.map((tag, index) => (
          <TagRow
            key={tag.id}
            tag={tag}
            onChange={updated => updateTag(tag.id, updated)}
            onDelete={() => deleteTag(tag.id)}
            existingKeys={existingKeys}
            keySuggestionsRef={queryData as KeySuggestionsFragmentKey}
            isFirst={index === 0}
          />
        ))}

        <Button
          type="button"
          variant="ghost-subtle"
          className="text-ods-text-primary self-start"
          onClick={addTag}
          leftIcon={<PlusCircle className="size-6" />}
          noPadding
        >
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
