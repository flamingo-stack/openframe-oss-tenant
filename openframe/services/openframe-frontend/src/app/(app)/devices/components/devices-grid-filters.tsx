'use client';

import { FiltersDropdown } from '@flamingo-stack/openframe-frontend-core/components/features';
import { Filter02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { DeviceFilterColumn } from './devices-table-columns';

interface DevicesGridFiltersProps {
  filterColumns: DeviceFilterColumn[];
  /** Current filter values keyed by column id (same shape as table's tableFilters). */
  currentFilters: Record<string, string[]>;
  /** Called with the next filters Record on apply/reset. Should write to URL params. */
  onFilterChange: (filters: Record<string, string[]>) => void;
  /** Server-side count for the "N results" tail. */
  totalCount?: number;
}

/**
 * DevicesGridFilters — horizontal row of dropdown filters shown above the
 * devices grid. Mirrors the column-header filters from the table view so the
 * same filter set is available in both layouts.
 */
export function DevicesGridFilters({
  filterColumns,
  currentFilters,
  onFilterChange,
  totalCount,
}: DevicesGridFiltersProps) {
  const filterableColumns = filterColumns.filter(c => c.filterable && c.filterOptions && c.filterOptions.length > 0);

  if (filterableColumns.length === 0 && totalCount === undefined) {
    return null;
  }

  return (
    <div className="sticky top-[96px] z-10 bg-ods-bg flex items-start flex-wrap gap-[var(--spacing-system-m)] px-[var(--spacing-system-m)]">
      {filterableColumns.map(column => {
        const selected = currentFilters[column.key] ?? [];
        const active = selected.length > 0;

        return (
          <FiltersDropdown
            key={column.key}
            triggerElement={
              <button
                type="button"
                className="group inline-flex items-center gap-[var(--spacing-system-xsf)] py-[var(--spacing-system-sf)] cursor-pointer select-none"
                aria-label={`Filter by ${column.label}`}
              >
                <span className="text-h5 text-ods-text-secondary uppercase whitespace-nowrap transition-colors group-hover:text-ods-text-primary">
                  {column.label}
                </span>
                <Filter02Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    active ? 'text-ods-accent' : 'text-ods-text-secondary group-hover:text-ods-text-primary',
                  )}
                />
              </button>
            }
            sections={[
              {
                id: column.key,
                title: column.label,
                type: 'checkbox',
                options: column.filterOptions ?? [],
                allowSelectAll: true,
              },
            ]}
            currentFilters={{ [column.key]: selected }}
            onApply={applied => {
              const next = applied[column.key] ?? [];
              onFilterChange({ ...currentFilters, [column.key]: next });
            }}
            onReset={() => onFilterChange({ ...currentFilters, [column.key]: [] })}
            placement="bottom-start"
            dropdownClassName="min-w-60"
          />
        );
      })}
      {totalCount !== undefined && (
        <div className="absolute right-0 inset-y-0 flex items-center">
          <span className="text-h6 text-ods-text-secondary whitespace-nowrap">{totalCount} results</span>
        </div>
      )}
    </div>
  );
}
