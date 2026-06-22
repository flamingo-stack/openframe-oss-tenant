'use client';

import type { TagSearchOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo, useState } from 'react';
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

export function useTagSearchState(): TagSearchState {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedTags, setSelectedTags] = useState<SelectedKnowledgeBaseTag[]>([]);

  const tagIds = useMemo(() => selectedTags.map(t => t.id), [selectedTags]);

  const tagSearchOptions = useMemo<TagSearchOption<string>[]>(
    () => selectedTags.map(t => ({ label: t.key, value: t.id })),
    [selectedTags],
  );

  const addTag = useCallback((tag: SelectedKnowledgeBaseTag) => {
    setSelectedTags(prev => (prev.some(t => t.id === tag.id) ? prev : [...prev, tag]));
  }, []);

  const removeTag = useCallback((id: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== id));
  }, []);

  const setTags = useCallback((tags: SelectedKnowledgeBaseTag[]) => {
    setSelectedTags(tags);
  }, []);

  const clearAll = useCallback(() => {
    setSearch('');
    setSelectedTags([]);
  }, []);

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
