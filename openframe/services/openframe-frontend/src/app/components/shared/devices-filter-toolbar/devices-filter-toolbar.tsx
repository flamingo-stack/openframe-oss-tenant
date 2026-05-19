'use client';

import { Filter02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  FilterModal,
  TagSearchInput,
  type TagSearchOption,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ComponentProps } from 'react';

type FilterModalProps = ComponentProps<typeof FilterModal>;

export interface DevicesFilterToolbarProps {
  /** Search input — current value (debounce/URL sync owned by the parent). */
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Already-selected tag chips rendered inside the search input. */
  tags: TagSearchOption<string>[];
  onTagRemove: (value: string) => void;
  onClearAll: () => void;
  onSubmit: (value: string) => void;

  /** Whether viewport is md+ (controls Device Tags button label vs icon-only). */
  isMdUp: boolean | undefined;
  /** Open the Device Tags modal. */
  onOpenFilterModal: () => void;

  /** FilterModal state — proxied straight through. */
  isFilterModalOpen: boolean;
  onCloseFilterModal: () => void;
  filterGroups: FilterModalProps['filterGroups'];
  onFilterChange: FilterModalProps['onFilterChange'];
  currentFilters?: FilterModalProps['currentFilters'];
  tagFilterKeys: FilterModalProps['tagFilterKeys'];
  selectedTags: FilterModalProps['selectedTags'];
  onTagsChange: FilterModalProps['onTagsChange'];
  isLoading?: boolean;

  /**
   * When true (default), pins the toolbar at the top with the same negative-margin
   * bleed used by `DevicesPanel` (so the search row's background covers the
   * `PageLayout` padding). Pass `false` when mounting inside a container that
   * shouldn't bleed (e.g. a modal).
   */
  sticky?: boolean;
}

/**
 * Search bar + "Device Tags" button + FilterModal. Pure presentation —
 * all state (search value, modal open/close, filter options) is owned by
 * the parent. Reused by `DevicesPanel` and (eventually) `DeviceSelector`.
 */
export function DevicesFilterToolbar({
  searchValue,
  onSearchChange,
  tags,
  onTagRemove,
  onClearAll,
  onSubmit,
  isMdUp,
  onOpenFilterModal,
  isFilterModalOpen,
  onCloseFilterModal,
  filterGroups,
  onFilterChange,
  currentFilters,
  tagFilterKeys,
  selectedTags,
  onTagsChange,
  isLoading,
  sticky = true,
}: DevicesFilterToolbarProps) {
  return (
    <>
      <div
        className={cn(
          'flex gap-[var(--spacing-system-m)] items-center',
          sticky &&
            'sticky top-0 z-20 bg-ods-bg -mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]',
        )}
      >
        <div className="flex-1 min-w-0">
          <TagSearchInput
            tags={tags}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            onTagRemove={onTagRemove}
            onClearAll={onClearAll}
            onSubmit={onSubmit}
            placeholder="Search for Devices"
            addMorePlaceholder="Add More..."
          />
        </div>
        {isMdUp ? (
          <Button
            variant="outline"
            onClick={onOpenFilterModal}
            leftIcon={<Filter02Icon className="text-ods-text-secondary" />}
            className="shrink-0"
          >
            Device Tags
          </Button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenFilterModal}
            leftIcon={<Filter02Icon className="text-ods-text-secondary" />}
            className="shrink-0"
          />
        )}
      </div>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={onCloseFilterModal}
        filterGroups={filterGroups}
        onFilterChange={onFilterChange}
        currentFilters={currentFilters}
        tagFilterKeys={tagFilterKeys}
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
        isLoading={isLoading}
        className="max-w-[600px]"
      />
    </>
  );
}
