'use client';

import {
  BoxArchiveIcon,
  GridIcon,
  PlusCircleIcon,
  TableCellIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Alert,
  type ColumnDef,
  type ColumnFiltersState,
  DataTable,
  type OnChangeFn,
  type PageActionButton,
  PageError,
  PageLayout,
  type Row,
  TabSelector,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useMemo } from 'react';
import { DevicesGrid } from '@/app/(app)/devices/components/devices-grid';
import { DevicesGridFilters } from '@/app/(app)/devices/components/devices-grid-filters';
import {
  DevicesTableBody,
  getDeviceFilterColumns,
  getDeviceTableRowActions,
} from '@/app/(app)/devices/components/devices-table-columns';
import { useDeviceFilters } from '@/app/(app)/devices/hooks/use-device-filters';
import { useDevices } from '@/app/(app)/devices/hooks/use-devices';
import { useDevicesUrlParams } from '@/app/(app)/devices/hooks/use-devices-url-params';
import { useGridInfiniteScroll } from '@/app/(app)/devices/hooks/use-grid-infinite-scroll';
import { useTagFilterModal } from '@/app/(app)/devices/hooks/use-tag-filter-modal';
import type { Device, DeviceFilterInput } from '@/app/(app)/devices/types/device.types';
import { routes } from '@/lib/routes';
import { DevicesFilterToolbar } from '../devices-filter-toolbar';
import { EMBEDDED_PAGE_OFFSET } from '../embedded-page';

export interface DevicesPanelProps {
  /** Page title shown in the PageLayout header. */
  title?: string;
  /** Back button rendered above the title (e.g. on the archive page). */
  backButton?: { label?: string; onClick: () => void };
  /** Destination of the "Add Device" button. */
  addDeviceHref?: string;
  /** When false, drops the "Add Device" header button (e.g. on the archive page). */
  showAddDevice?: boolean;
  /** When set, shows an "Archive" header button linking to the archived-devices page. */
  archiveHref?: string;
  /** Filters merged on top of URL-driven filters (e.g. lock to a single organization). */
  lockedFilters?: Partial<DeviceFilterInput>;
  /** Column ids to drop from the table (e.g. 'organization' when scoped to one org). */
  hideColumns?: string[];
  /**
   * Filter keys to drop from the filter UI — the FilterModal, the grid filter
   * row, and the table column-header filter (the column itself stays visible),
   * e.g. 'organization' when scoped to one org, or 'status' on the archive page.
   */
  hideFilters?: string[];
  /** Message shown when the list is empty (with search/filters active or no `emptyState` given). */
  emptyMessage?: string;
  /**
   * Default statuses applied when the user hasn't picked any. Pass `[]` to disable
   * the default and return devices of all statuses (e.g. when scoped to one customer).
   */
  defaultStatuses?: string[];
  /**
   * Overrides the PageLayout wrapper className. Pass an empty string to disable
   * the default side/bottom padding (e.g. when embedded inside a tab whose parent
   * already provides padding).
   */
  className?: string;
  /**
   * Render inside a tab (e.g. customer details) — drops the standalone top padding
   * via `EMBEDDED_PAGE_OFFSET` so the header sits flush under the tab bar.
   */
  embedded?: boolean;
  /**
   * Empty state rendered instead of the toolbar + list when there are
   * no devices and no active search/filters. Pass from the standalone Devices
   * page; omit in embedded contexts to keep the inline "no results" message.
   */
  emptyState?: ReactNode;
  /**
   * When true, the tenant has no organizations (customers) to attach a device to.
   * Surfaces an "Add Customer" action and shows a banner prompting the user to add
   * a customer first. Pass from the standalone Devices page; omit in embedded
   * contexts where an organization always exists.
   */
  noOrganizations?: boolean;
  /**
   * When true, the organization check is still in flight. "Add Device" stays
   * disabled as a safety measure, but the "no customer" banner is suppressed so
   * it doesn't flash before the answer is known.
   */
  isCheckingOrganizations?: boolean;
}

export function DevicesPanel({
  title = 'Devices',
  backButton,
  addDeviceHref = routes.devices.new(),
  showAddDevice = true,
  archiveHref,
  lockedFilters,
  hideColumns,
  hideFilters,
  emptyMessage = 'No devices found. Try adjusting your search or filters.',
  defaultStatuses,
  className = '',
  embedded = false,
  emptyState,
  noOrganizations = false,
  isCheckingOrganizations = false,
}: DevicesPanelProps) {
  const router = useRouter();

  const {
    params,
    setParam,
    setParams,
    localSearch,
    setLocalSearch,
    debouncedSearch,
    filters: urlFilters,
    tableFilters,
    tagOptions,
    handleFilterChange,
    handleTagRemove,
    handleClearAll,
    handleTagSubmit,
  } = useDevicesUrlParams({ defaultStatuses });

  const filters = useMemo<DeviceFilterInput>(() => ({ ...urlFilters, ...lockedFilters }), [urlFilters, lockedFilters]);

  const { devices, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, filteredCount } = useDevices(
    filters,
    debouncedSearch,
  );

  const { data: deviceFilters, isLoading: isDeviceFiltersLoading } = useDeviceFilters(filters);

  const hasActiveDeviceFilters =
    params.statuses.length > 0 ||
    params.osTypes.length > 0 ||
    params.organizationIds.length > 0 ||
    params.tags.length > 0;

  // Pristine, genuinely-empty view (no search, no filters, no devices): show the
  // empty state instead of the toolbar + list, when one is provided.
  const showEmptyState =
    !!emptyState && !isLoading && !debouncedSearch && !hasActiveDeviceFilters && devices.length === 0;

  const filterColumns = useMemo(() => {
    const hidden = new Set(hideFilters ?? []);
    return getDeviceFilterColumns(deviceFilters ?? null).filter(c => !hidden.has(c.key));
  }, [deviceFilters, hideFilters]);
  // Post-action list refresh is handled centrally: useDeviceActions invalidates
  // the device query roots, so no per-row refetch callback is needed.
  const renderRowActions = useMemo(() => getDeviceTableRowActions(), []);

  // The status column reflects only the user's explicit selection — the default
  // statuses are a query-side fallback and must not render as checked filters.
  const columnFilters = useMemo<ColumnFiltersState>(
    () => [
      ...(params.statuses.length > 0 ? [{ id: 'status', value: params.statuses }] : []),
      ...(params.osTypes.length > 0 ? [{ id: 'os', value: params.osTypes }] : []),
      ...(params.organizationIds.length > 0 ? [{ id: 'organization', value: params.organizationIds }] : []),
    ],
    [params.statuses, params.osTypes, params.organizationIds],
  );

  const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    updater => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      handleFilterChange(Object.fromEntries(next.map(f => [f.id, f.value as string[]])));
    },
    [columnFilters, handleFilterChange],
  );

  const actionsColumn = useMemo<ColumnDef<Device>>(
    () => ({
      id: 'actions',
      cell: ({ row }: { row: Row<Device> }) => (
        <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
          {renderRowActions(row.original)}
        </div>
      ),
      enableSorting: false,
      meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
    }),
    [renderRowActions],
  );

  const {
    isOpen: filterModalOpen,
    open: openFilterModal,
    close: closeFilterModal,
    isMdUp,
    filterGroups,
    tagFilterKeys,
    handleFilterChange: handleModalFilterChange,
    handleTagsChange: handleModalTagsChange,
    selectedTags,
  } = useTagFilterModal({
    tags: params.tags,
    deviceFilters: deviceFilters ?? null,
    columns: filterColumns,
    setParams,
  });

  // Grid layout is desktop-only — force-collapse to table on mobile so the
  // user always gets a usable list at narrow widths.
  useEffect(() => {
    if (!isMdUp && params.viewMode === 'grid') {
      setParam('viewMode', 'table');
    }
  }, [isMdUp, params.viewMode, setParam]);

  // A device must belong to an organization. With none, disable "Add Device"
  // and surface an "Add Customer" action that routes to the new-customer form.
  // While the org check is still in flight, keep "Add Device" disabled too.
  const actions = useMemo<PageActionButton[]>(() => {
    const result: PageActionButton[] = [];
    if (archiveHref) {
      result.push({
        label: 'Archive',
        href: archiveHref,
        icon: <BoxArchiveIcon className="w-5 h-5 text-ods-text-secondary" />,
        variant: 'outline',
      });
    }
    if (!showAddDevice) return result;
    const accent = showEmptyState && !noOrganizations;
    if (noOrganizations) {
      result.push({
        label: 'Add Customer',
        href: routes.customers.new,
        icon: <PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />,
        variant: 'outline',
      });
    }
    result.push({
      label: 'Add Device',
      onClick: () => router.push(addDeviceHref),
      disabled: noOrganizations || isCheckingOrganizations,
      icon: <PlusCircleIcon className={`w-5 h-5 ${accent ? 'text-ods-text-on-accent' : 'text-ods-text-secondary'}`} />,
      variant: accent ? 'accent' : 'outline',
    });
    return result;
  }, [archiveHref, showAddDevice, showEmptyState, noOrganizations, isCheckingOrganizations, router, addDeviceHref]);

  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const gridSentinelRef = useGridInfiniteScroll({
    enabled: params.viewMode === 'grid',
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <>
      <PageLayout
        title={title}
        backButton={backButton}
        actionsVariant="icon-buttons"
        className={cn(embedded && EMBEDDED_PAGE_OFFSET, className)}
        selector={
          <TabSelector
            value={params.viewMode}
            onValueChange={v => setParam('viewMode', v as 'table' | 'grid')}
            items={[
              { id: 'table', icon: <TableCellIcon className="w-6 h-6" /> },
              { id: 'grid', icon: <GridIcon className="w-6 h-6" /> },
            ]}
          />
        }
        actions={actions}
        contentClassName="flex flex-col"
      >
        {noOrganizations && (
          // Core Alert restyled to the ODS warning tokens. The icon is wrapped in a
          // span so Alert's `[&>svg]` absolute-positioning rules don't apply.
          <Alert className="flex items-start gap-[var(--spacing-system-m)] mb-[var(--spacing-system-l)] rounded-[6px] border-0 bg-[var(--ods-attention-yellow-warning-secondary)] text-[var(--ods-attention-yellow-warning)]">
            <span className="shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <p className="text-h3">Add a customer to connect a new device</p>
          </Alert>
        )}
        {showEmptyState ? (
          emptyState
        ) : (
          <div>
            <DevicesFilterToolbar
              searchValue={localSearch}
              onSearchChange={setLocalSearch}
              tags={tagOptions}
              onTagRemove={handleTagRemove}
              onClearAll={handleClearAll}
              onSubmit={handleTagSubmit}
              isMdUp={isMdUp}
              onOpenFilterModal={openFilterModal}
              isFilterModalOpen={filterModalOpen}
              onCloseFilterModal={closeFilterModal}
              filterGroups={filterGroups}
              onFilterChange={handleModalFilterChange}
              currentFilters={!isMdUp ? tableFilters : undefined}
              tagFilterKeys={tagFilterKeys}
              selectedTags={selectedTags}
              onTagsChange={handleModalTagsChange}
              isLoading={isDeviceFiltersLoading}
            />
            {params.viewMode === 'table' ? (
              <DevicesTableBody
                devices={devices}
                isLoading={isLoading || isDeviceFiltersLoading}
                emptyMessage={emptyMessage}
                skeletonRows={10}
                stickyHeaderOffset="top-[96px]"
                deviceFilters={deviceFilters ?? null}
                columnFilters={columnFilters}
                onColumnFiltersChange={onColumnFiltersChange}
                actionsColumn={actionsColumn}
                hideColumns={hideColumns}
                disableColumnFilters={hideFilters}
                totalCount={filteredCount}
                footerSlot={
                  <DataTable.InfiniteFooter
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    onLoadMore={handleLoadMore}
                    skeletonRows={2}
                  />
                }
              />
            ) : (
              <>
                <DevicesGridFilters
                  filterColumns={filterColumns}
                  currentFilters={tableFilters}
                  onFilterChange={handleFilterChange}
                  totalCount={filteredCount}
                />
                <DevicesGrid
                  devices={devices}
                  isLoading={isLoading}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  sentinelRef={gridSentinelRef}
                  emptyMessage={emptyMessage}
                />
              </>
            )}
          </div>
        )}
      </PageLayout>
    </>
  );
}
