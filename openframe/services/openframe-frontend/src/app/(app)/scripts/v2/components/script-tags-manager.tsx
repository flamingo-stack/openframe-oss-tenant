'use client';

import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo, useState } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import type { scriptTagsRelayPickerQuery as ScriptTagsPickerQueryType } from '@/__generated__/scriptTagsRelayPickerQuery.graphql';
import { useCreateTagMutation } from '@/app/components/shared/tags';
import { TagEntityType } from '@/generated/schema-enums';
import { scriptTagsRelayPickerQuery } from '@/graphql/scripts/script-tags-relay';

interface ScriptTag {
  id: string;
  key: string;
}

interface ScriptTagsManagerProps {
  /** Selected Tag ids (the form's `tag_ids`). */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /**
   * Tags already assigned to the script. Seeded into the options so their chips
   * render with a key even when they fall outside the suggestion list.
   */
  initialTags?: ReadonlyArray<ScriptTag>;
  disabled?: boolean;
}

/**
 * Tag picker for the script editor — mirrors `TicketTagsManager`: a searchable,
 * creatable multi-select over tenant tags. Values are Tag ids, which map straight
 * to the `tagIds` write input. Typing a new name and confirming creates the tag
 * (entityType `SCRIPT`) and swaps the optimistic entry for the persisted id.
 */
export function ScriptTagsManager({ selectedIds, onChange, initialTags = [], disabled }: ScriptTagsManagerProps) {
  // `store-and-network`: revalidate the tag vocabulary on each mount so newly added
  // tenant tags show up (admin app — freshness over cache). Locally created tags are
  // still tracked in `createdTags`, so the refresh never drops in-flight additions.
  const data = useLazyLoadQuery<ScriptTagsPickerQueryType>(
    scriptTagsRelayPickerQuery,
    {},
    { fetchPolicy: 'store-and-network' },
  );

  const { createTag, isInFlight: isCreating } = useCreateTagMutation();

  // Tags created during this session (kept so their option/chip persists without
  // refetching the suggestions query) and the in-flight optimistic placeholders.
  const [createdTags, setCreatedTags] = useState<ScriptTag[]>([]);
  const [optimisticTags, setOptimisticTags] = useState<Array<{ key: string; tempId: string }>>([]);

  const options = useMemo(() => {
    // Dedupe by id, merging suggestions with assigned / created / in-flight tags.
    const byId = new Map<string, string>();
    for (const tag of initialTags) byId.set(tag.id, tag.key);
    for (const tag of data.tagsByEntityType) byId.set(tag.id, tag.key);
    for (const tag of createdTags) byId.set(tag.id, tag.key);
    const result = Array.from(byId, ([value, label]) => ({ label, value }));
    for (const tag of optimisticTags) result.push({ label: tag.key, value: tag.tempId });
    return result;
  }, [data.tagsByEntityType, initialTags, createdTags, optimisticTags]);

  const isKnownValue = useCallback(
    (value: string) =>
      data.tagsByEntityType.some(t => t.id === value) ||
      initialTags.some(t => t.id === value) ||
      createdTags.some(t => t.id === value) ||
      optimisticTags.some(t => t.tempId === value),
    [data.tagsByEntityType, initialTags, createdTags, optimisticTags],
  );

  const handleChange = useCallback(
    (values: string[]) => {
      const existingIds = values.filter(isKnownValue);
      const newKeys = values.filter(v => !isKnownValue(v));

      if (newKeys.length === 0) {
        onChange(existingIds);
        return;
      }

      for (const key of newKeys) {
        const tempId = `_optimistic_${crypto.randomUUID()}`;
        setOptimisticTags(prev => [...prev, { key, tempId }]);
        onChange([...existingIds, tempId]);

        createTag(
          { key, entityType: TagEntityType.SCRIPT },
          realId => {
            setOptimisticTags(prev => prev.filter(t => t.tempId !== tempId));
            if (realId) {
              setCreatedTags(prev => [...prev, { id: realId, key }]);
              onChange([...existingIds, realId]);
            }
          },
          // On failure drop the optimistic chip and revert the selection so the
          // form never carries a tag id that was never persisted.
          () => {
            setOptimisticTags(prev => prev.filter(t => t.tempId !== tempId));
            onChange(existingIds);
          },
        );
      }
    },
    [isKnownValue, onChange, createTag],
  );

  return (
    <Autocomplete
      multiple
      creatable
      freeSolo
      options={options}
      value={selectedIds}
      onChange={handleChange}
      label="Search and add Tags"
      placeholder={selectedIds.length > 0 ? 'Add more...' : 'Search to Add Tags'}
      startAdornment={<SearchIcon className="size-6 text-ods-text-secondary" />}
      loading={isCreating}
      disabled={disabled}
      showChevron={false}
    />
  );
}
