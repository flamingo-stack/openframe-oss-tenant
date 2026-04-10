'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core';
import { PlusCircle } from 'lucide-react';
import { useCallback } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { deviceTagsEditor_keySuggestions$key as KeySuggestionsFragmentKey } from '@/__generated__/deviceTagsEditor_keySuggestions.graphql';
import type { deviceTagsEditorQuery as DeviceTagsEditorQueryType } from '@/__generated__/deviceTagsEditorQuery.graphql';
import type { DeviceTag } from '../../hooks/use-install-command';
import { TagRow } from './tag-row';

const SUGGESTIONS_LIMIT = 20;

const deviceTagsEditorRootQuery = graphql`
  query deviceTagsEditorQuery($limit: Int) {
    ...deviceTagsEditor_keySuggestions @arguments(limit: $limit)
  }
`;

// Exported so TagRow can import the fragment
export const keySuggestionsFragment = graphql`
  fragment deviceTagsEditor_keySuggestions on Query
    @refetchable(queryName: "deviceTagsEditorKeySuggestionsRefetchQuery")
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

export interface DeviceTagWithId extends DeviceTag {
  id: string;
}

interface DeviceTagsEditorProps {
  tags: DeviceTagWithId[];
  onTagsChange: (tags: DeviceTagWithId[]) => void;
}

export function DeviceTagsEditor({ tags, onTagsChange }: DeviceTagsEditorProps) {
  const queryData = useLazyLoadQuery<DeviceTagsEditorQueryType>(
    deviceTagsEditorRootQuery,
    { limit: SUGGESTIONS_LIMIT },
    { fetchPolicy: 'store-or-network' },
  );

  const addTag = useCallback(() => {
    onTagsChange([...tags, { id: crypto.randomUUID(), key: '', values: [] }]);
  }, [tags, onTagsChange]);

  const updateTag = useCallback(
    (id: string, updated: DeviceTag) => {
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
          Add Device Tag
        </Button>
      </div>
    </div>
  );
}
