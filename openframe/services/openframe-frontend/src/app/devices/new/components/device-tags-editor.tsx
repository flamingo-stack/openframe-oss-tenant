'use client';

import { PlusCircle } from 'lucide-react';
import { useCallback } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { deviceTagsEditor_keySuggestions$key as KeySuggestionsFragmentKey } from '@/__generated__/deviceTagsEditor_keySuggestions.graphql';
import type { deviceTagsEditorQuery as DeviceTagsEditorQueryType } from '@/__generated__/deviceTagsEditorQuery.graphql';
import type { DeviceTag } from '../../hooks/use-install-command';
import { TagRow } from './tag-row';

const SUGGESTIONS_LIMIT = 20;

const deviceTagsEditorRootQuery = graphql`
  query deviceTagsEditorQuery($organizationId: String!, $limit: Int) {
    ...deviceTagsEditor_keySuggestions @arguments(organizationId: $organizationId, limit: $limit)
  }
`;

// Exported so TagRow can import the fragment
export const keySuggestionsFragment = graphql`
  fragment deviceTagsEditor_keySuggestions on Query
    @refetchable(queryName: "deviceTagsEditorKeySuggestionsRefetchQuery")
    @argumentDefinitions(
      organizationId: { type: "String!" }
      search: { type: "String" }
      limit: { type: "Int" }
    ) {
    tagKeySuggestions(organizationId: $organizationId, search: $search, limit: $limit) {
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
  organizationId: string;
  tags: DeviceTagWithId[];
  onTagsChange: (tags: DeviceTagWithId[]) => void;
}

let nextTagId = 0;

export function DeviceTagsEditor({ organizationId, tags, onTagsChange }: DeviceTagsEditorProps) {
  const queryData = useLazyLoadQuery<DeviceTagsEditorQueryType>(
    deviceTagsEditorRootQuery,
    { organizationId, limit: SUGGESTIONS_LIMIT },
    { fetchPolicy: 'store-or-network' },
  );

  const addTag = useCallback(() => {
    nextTagId += 1;
    onTagsChange([...tags, { id: `tag-${nextTagId}`, key: '', values: [] }]);
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
    <div className="flex flex-col gap-2">
      {tags.map((tag, index) => (
        <TagRow
          key={tag.id}
          organizationId={organizationId}
          tag={tag}
          onChange={updated => updateTag(tag.id, updated)}
          onDelete={() => deleteTag(tag.id)}
          showLabels={index === 0}
          existingKeys={existingKeys}
          keySuggestionsRef={queryData as KeySuggestionsFragmentKey}
        />
      ))}

      <button
        type="button"
        onClick={addTag}
        disabled={!organizationId}
        className="flex items-center gap-2 py-3 text-ods-text-primary hover:text-ods-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlusCircle className="w-6 h-6" />
        <span className="text-lg font-bold tracking-[-0.36px]">Add Device Tag</span>
      </button>
    </div>
  );
}
