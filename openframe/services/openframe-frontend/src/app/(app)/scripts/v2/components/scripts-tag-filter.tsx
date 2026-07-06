'use client';

import { type ReactNode, useMemo } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import type { scriptTagsRelayFilterQuery as ScriptTagsFilterQueryType } from '@/__generated__/scriptTagsRelayFilterQuery.graphql';
import { TagFilterBar, TagFilterBarSkeleton } from '@/app/components/shared';
import { scriptTagsRelayFilterQuery } from '@/graphql/scripts/script-tags-relay';

const SEARCH_PLACEHOLDER = 'Search for Scripts';

interface ScriptsTagFilterProps {
  /** Free-text name search (kept in the search input alongside the tag chips). */
  search: string;
  onSearchChange: (value: string) => void;
  /** Selected Tag ids driving the `tagIds` filter. */
  tagIds: string[];
  onTagIdsChange: (ids: string[]) => void;
  /** Mobile filter button rendered next to the search input. */
  filterButton?: ReactNode;
  /** Archived list → scope tags to archived scripts (`archived: true`); otherwise active. */
  archived?: boolean;
}

/**
 * Scripts list tag filter — the shared `TagFilterBar` fed by `scriptsTags` (tags
 * actually assigned to scripts). `archived` scopes the set: `true` → tags on
 * archived scripts (the Archived page), null → tags on active scripts.
 * Suspends on the tag list; render inside `<Suspense fallback={<ScriptsTagFilterSkeleton/>}>`.
 */
export function ScriptsTagFilter({
  search,
  onSearchChange,
  tagIds,
  onTagIdsChange,
  filterButton,
  archived = false,
}: ScriptsTagFilterProps) {
  const data = useLazyLoadQuery<ScriptTagsFilterQueryType>(
    scriptTagsRelayFilterQuery,
    { archived: archived ? true : null },
    { fetchPolicy: 'store-and-network' },
  );
  const tags = useMemo(() => data.scriptsTags.map(t => ({ id: t.id, key: t.key })), [data.scriptsTags]);

  return (
    <TagFilterBar
      tags={tags}
      search={search}
      onSearchChange={onSearchChange}
      selectedIds={tagIds}
      onSelectedIdsChange={onTagIdsChange}
      placeholder={SEARCH_PLACEHOLDER}
      filterButton={filterButton}
    />
  );
}

interface ScriptsTagFilterSkeletonProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterButton?: ReactNode;
}

export function ScriptsTagFilterSkeleton({ search, onSearchChange, filterButton }: ScriptsTagFilterSkeletonProps) {
  return (
    <TagFilterBarSkeleton
      search={search}
      onSearchChange={onSearchChange}
      placeholder={SEARCH_PLACEHOLDER}
      filterButton={filterButton}
    />
  );
}
