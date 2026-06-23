'use client';

import type { TagSearchOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo } from 'react';
import { useSearchParam } from '@/app/hooks/use-search-param';
import type { SelectedKnowledgeBaseTag } from '../components/knowledge-base-tags-row';

export interface TagSearchState {
  search: string;
  debouncedSearch: string;
  setSearch: (value: string) => void;
  selectedTags: SelectedKnowledgeBaseTag[];
  tagIds: string[];
  tagSearchOptions: TagSearchOption<string>[];
  addTag: (tag: SelectedKnowledgeBaseTag) => void;
  removeTag: (id: string) => void;
  /** Replace the whole selected-tag set (search text is preserved). */
  setTags: (tags: SelectedKnowledgeBaseTag[]) => void;
  clearAll: () => void;
}

// Tags persist in the URL as one `tags=<id>:<key>` entry each (repeated params,
// so commas/colons in keys are safe). IDs never contain ':', so we split on the
// first colon — the key may itself contain colons.
function encodeTag(tag: SelectedKnowledgeBaseTag): string {
  return `${tag.id}:${tag.key}`;
}

function decodeTag(entry: string): SelectedKnowledgeBaseTag | null {
  const i = entry.indexOf(':');
  if (i <= 0) return null;
  return { id: entry.slice(0, i), key: entry.slice(i + 1) };
}

/**
 * Search + tag filter state for Knowledge Base, persisted in the URL.
 *
 * Search is kept responsive via the shared {@link useSearchParam} hook (local
 * input state + debounced write to the URL param), so typing never lags behind a
 * router navigation and is never clobbered mid-fetch. Selected tags are encoded
 * into the `tags` URL param so the whole filter survives refresh / back-forward.
 */
export function useTagSearchState(): TagSearchState {
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    tags: { type: 'array', default: [] },
  });

  const { search, setSearch, debouncedSearch } = useSearchParam(params.search, value => setParam('search', value), 300);

  const selectedTags = useMemo<SelectedKnowledgeBaseTag[]>(
    () =>
      params.tags.flatMap(entry => {
        const tag = decodeTag(entry);
        return tag ? [tag] : [];
      }),
    [params.tags],
  );

  const tagIds = useMemo(() => selectedTags.map(t => t.id), [selectedTags]);

  const tagSearchOptions = useMemo<TagSearchOption<string>[]>(
    () => selectedTags.map(t => ({ label: t.key, value: t.id })),
    [selectedTags],
  );

  const addTag = useCallback(
    (tag: SelectedKnowledgeBaseTag) => {
      if (params.tags.some(entry => decodeTag(entry)?.id === tag.id)) return;
      setParam('tags', [...params.tags, encodeTag(tag)]);
    },
    [params.tags, setParam],
  );

  const removeTag = useCallback(
    (id: string) => {
      setParam(
        'tags',
        params.tags.filter(entry => decodeTag(entry)?.id !== id),
      );
    },
    [params.tags, setParam],
  );

  const setTags = useCallback(
    (tags: SelectedKnowledgeBaseTag[]) => {
      setParam('tags', tags.map(encodeTag));
    },
    [setParam],
  );

  const clearAll = useCallback(() => {
    setSearch('');
    setParams({ search: '', tags: [] });
  }, [setSearch, setParams]);

  return {
    search,
    debouncedSearch,
    setSearch,
    selectedTags,
    tagIds,
    tagSearchOptions,
    addTag,
    removeTag,
    setTags,
    clearAll,
  };
}
