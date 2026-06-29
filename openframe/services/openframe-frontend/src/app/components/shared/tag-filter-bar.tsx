'use client';

import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Input, TagSearchInput, type TagSearchOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type ReactNode, useMemo } from 'react';
import { type SelectableTag, SelectableTagsRow, SelectableTagsRowSkeleton } from './selectable-tags-row';

interface TagFilterBarProps {
  /** Available tags — feed both the selectable row and the selected-chip labels. */
  tags: ReadonlyArray<SelectableTag>;
  search: string;
  onSearchChange: (value: string) => void;
  /** Selected tag ids driving the filter. */
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  placeholder: string;
  /**
   * Selected-tag chips for the search input. Defaults to deriving them from
   * `tags` + `selectedIds`; pass this when the selected tags can live outside the
   * current `tags` list (e.g. folder-scoped sources that persist a key per id).
   */
  selectedTags?: TagSearchOption<string>[];
  /** Show the row skeleton instead of the row (non-Suspense loading, e.g. react-query). */
  loading?: boolean;
  /** Render the selectable tags row. Default true (set false to hide it, e.g. on mobile). */
  showRow?: boolean;
  /** Element rendered next to the search input — typically a mobile "open filters" button. */
  filterButton?: ReactNode;
}

/**
 * Shared tag filter bar — a search input that doubles as a removable selected-tag
 * chip holder, with a one-click row of the remaining available tags underneath.
 * Returns the two rows as a fragment; wrap it in a `flex flex-col` container
 * (gap `--spacing-system-xxs`) so every consumer (scripts, tickets, …) lines up
 * identically. Data fetching stays with the caller.
 */
export function TagFilterBar({
  tags,
  search,
  onSearchChange,
  selectedIds,
  onSelectedIdsChange,
  placeholder,
  selectedTags,
  loading,
  showRow = true,
  filterButton,
}: TagFilterBarProps) {
  const derivedSelected = useMemo<TagSearchOption<string>[]>(() => {
    const keyById = new Map(tags.map(t => [t.id, t.key]));
    return selectedIds.map(id => ({ value: id, label: keyById.get(id) ?? id }));
  }, [tags, selectedIds]);

  return (
    <>
      <div className="flex items-center gap-[var(--spacing-system-m)]">
        <div className="min-w-0 flex-1">
          <TagSearchInput<string>
            tags={selectedTags ?? derivedSelected}
            searchValue={search}
            onSearchChange={onSearchChange}
            onTagRemove={id => onSelectedIdsChange(selectedIds.filter(selectedId => selectedId !== id))}
            onClearAll={() => {
              onSearchChange('');
              onSelectedIdsChange([]);
            }}
            placeholder={placeholder}
            addMorePlaceholder={placeholder}
          />
        </div>
        {filterButton}
      </div>

      {showRow &&
        (loading ? (
          <SelectableTagsRowSkeleton />
        ) : (
          <SelectableTagsRow
            tags={tags}
            selectedIds={selectedIds}
            onAdd={tag => onSelectedIdsChange([...selectedIds, tag.id])}
          />
        ))}
    </>
  );
}

interface TagFilterBarSkeletonProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  filterButton?: ReactNode;
}

/**
 * Suspense fallback for `TagFilterBar` when the tag list is fetched via Relay:
 * keeps the name search usable and shows a tag-row skeleton in place of the row.
 */
export function TagFilterBarSkeleton({ search, onSearchChange, placeholder, filterButton }: TagFilterBarSkeletonProps) {
  return (
    <>
      <div className="flex items-center gap-[var(--spacing-system-m)]">
        <div className="min-w-0 flex-1">
          <Input
            placeholder={placeholder}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
          />
        </div>
        {filterButton}
      </div>
      <SelectableTagsRowSkeleton />
    </>
  );
}
