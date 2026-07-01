'use client';

import {
  ArrowRightUpIcon,
  Copy01Icon,
  Filter02Icon,
  MonitorIcon,
  SearchIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  Button,
  type ColumnDef,
  DataTable,
  FilterModal,
  Input,
  multiSelectFilterFn,
  type Row,
  SquareAvatar,
  Tag,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import type { scriptExecutionFiltersRelayQuery as ExecutionFiltersQueryType } from '@/__generated__/scriptExecutionFiltersRelayQuery.graphql';
import type { scriptExecutionsRelay_query$key as ExecutionsFragmentKey } from '@/__generated__/scriptExecutionsRelay_query.graphql';
import type { scriptExecutionsRelayPaginationQuery as ExecutionsPaginationQueryType } from '@/__generated__/scriptExecutionsRelayPaginationQuery.graphql';
import type {
  scriptExecutionsRelayQuery as ExecutionsQueryType,
  ScriptExecutionFilterInput,
} from '@/__generated__/scriptExecutionsRelayQuery.graphql';
import { employeeDetailHref } from '@/app/(app)/settings/employees/routes';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { ScriptExecutionStatus } from '@/generated/schema-enums';
import { scriptExecutionFiltersRelayQuery } from '@/graphql/scripts/script-execution-filters-relay';
import { scriptExecutionsRelayFragment, scriptExecutionsRelayQuery } from '@/graphql/scripts/script-executions-relay';
import { getFullImageUrl } from '@/lib/image-url';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { decodeGlobalId } from '@/lib/relay-id';
import {
  executionResultText,
  executionStatusLabel,
  executionStatusVariant,
  formatExecutionTimestamp,
  initiatorInitials,
  initiatorName,
  machineLabel,
  organizationLabel,
} from '../utils/execution-helpers';

const PAGE_SIZE = 20;

interface UiExecution {
  id: string;
  executionId: string;
  status: string;
  timestamp: string;
  machineName: string;
  organization: string;
  initiatorId: string;
  initiatorName: string;
  initiatorInitials: string;
  initiatorImage?: string;
  result: string;
}

// Status filter options are the enum values (labels from the shared helper). The
// "Executed by" options are server-driven (see scriptExecutionFilters).
const STATUS_FILTER_OPTIONS = Object.values(ScriptExecutionStatus).map(status => ({
  id: status,
  label: executionStatusLabel(status),
  value: status,
}));

interface ScriptExecutionsTabProps {
  scriptId: string;
}

// ----------------------------------------------------------------
// Inner content — Relay hooks, must live inside Suspense
// ----------------------------------------------------------------

interface ContentProps {
  scriptId: string;
  backendFilters: ScriptExecutionFilterInput;
  debouncedSearch: string;
  tableFilters: Record<string, string[]>;
  onFilterChange: (filters: Record<string, string[]>) => void;
  mobileFilterOpen: boolean;
  onMobileFilterClose: () => void;
  /** Pins the column header flush below the sticky search toolbar. */
  stickyHeaderOffset: string;
}

function ScriptExecutionsContent({
  scriptId,
  backendFilters,
  debouncedSearch,
  tableFilters,
  onFilterChange,
  mobileFilterOpen,
  onMobileFilterClose,
  stickyHeaderOffset,
}: ContentProps) {
  const router = useRouter();
  const { toast } = useToast();

  const queryData = useLazyLoadQuery<ExecutionsQueryType>(
    scriptExecutionsRelayQuery,
    { scriptId, filter: backendFilters, search: debouncedSearch || null, first: PAGE_SIZE, after: null },
    { fetchPolicy: 'store-and-network' },
  );

  // "Executed by" options — server-driven (complete initiator set for this
  // script), scoped to the script only so the list stays stable as filters change.
  const filtersData = useLazyLoadQuery<ExecutionFiltersQueryType>(
    scriptExecutionFiltersRelayQuery,
    { scriptId },
    { fetchPolicy: 'store-and-network' },
  );

  const initiatorOptions = useMemo(
    () =>
      (filtersData.scriptExecutionFilters?.initiators ?? [])
        .map(i => ({ id: i.value, label: i.label, value: i.value }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [filtersData.scriptExecutionFilters?.initiators],
  );

  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    ExecutionsPaginationQueryType,
    ExecutionsFragmentKey
  >(scriptExecutionsRelayFragment, queryData);

  const executions: UiExecution[] = useMemo(() => {
    const edges = data.scriptExecutions?.edges ?? [];
    return edges.map(edge => {
      const node = edge.node;
      return {
        id: node.id,
        executionId: node.executionId,
        status: node.status,
        timestamp: formatExecutionTimestamp(node.dispatchedAt),
        machineName: machineLabel(node.machine),
        organization: organizationLabel(node.machine),
        initiatorId: node.initiator?.id ?? '',
        initiatorName: initiatorName(node.initiator),
        initiatorInitials: initiatorInitials(node.initiator),
        initiatorImage: getFullImageUrl(node.initiator?.image?.imageUrl, node.initiator?.image?.hash),
        result: executionResultText(node),
      };
    });
  }, [data.scriptExecutions?.edges]);

  const fetchNextPage = useCallback(() => {
    if (hasNext && !isLoadingNext) loadNext(PAGE_SIZE);
  }, [hasNext, isLoadingNext, loadNext]);

  const executionHref = useCallback((execution: UiExecution) => `/scripts-v2/executions/${execution.id}`, []);

  const renderRowActions = useCallback(
    (execution: UiExecution) => {
      const groups: ActionsMenuGroup[] = [
        {
          items: [
            {
              id: 'copy-execution-id',
              label: 'Copy Execution ID',
              icon: <Copy01Icon className="w-6 h-6 text-ods-text-secondary" />,
              onClick: () => {
                navigator.clipboard
                  ?.writeText(execution.executionId)
                  .then(() => toast({ title: 'Copied', description: 'Execution ID copied', variant: 'success' }))
                  .catch(() => toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' }));
              },
            },
          ],
        },
      ];
      return <ActionsMenuDropdown groups={groups} />;
    },
    [toast],
  );

  const columns = useMemo<ColumnDef<UiExecution>[]>(
    () => [
      {
        accessorKey: 'executionId',
        header: 'Execution',
        cell: ({ row }: { row: Row<UiExecution> }) => (
          <div className="flex flex-col justify-center gap-1 min-w-0">
            <TruncateText>{row.original.timestamp}</TruncateText>
            <TruncateText variant="h6" tone="secondary">
              {row.original.executionId}
            </TruncateText>
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-[160px]' },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        // Wrap in a flex row so the tag hugs its content instead of stretching to
        // the cell width (the cell is a stretch column).
        cell: ({ row }: { row: Row<UiExecution> }) => (
          <div className="flex">
            <Tag
              label={executionStatusLabel(row.original.status)}
              variant={executionStatusVariant(row.original.status)}
            />
          </div>
        ),
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: { width: 'w-[120px]', filter: { options: STATUS_FILTER_OPTIONS } },
      },
      {
        accessorKey: 'machineName',
        header: 'Device',
        // Icon rides only with the machine name on the first line; the org label
        // sits on its own line beneath, left-aligned to the icon (not indented
        // under the name) — matching the design.
        cell: ({ row }: { row: Row<UiExecution> }) => (
          <div className="flex flex-col justify-center gap-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <MonitorIcon className="size-6 shrink-0 text-ods-text-secondary" />
              {/* min-w-0 flex-1 wrapper so the name can shrink and ellipsize next to the icon. */}
              <div className="min-w-0 flex-1">
                <TruncateText>{row.original.machineName}</TruncateText>
              </div>
            </div>
            {row.original.organization && (
              <TruncateText variant="h6" tone="secondary">
                {row.original.organization}
              </TruncateText>
            )}
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-[240px]', hideAt: 'lg' },
      },
      {
        // accessorKey is `initiatorId` so the filter option values (user ids)
        // match the `initiatorIds` server filter; the cell still renders the name.
        accessorKey: 'initiatorId',
        header: 'Executed by',
        // The initiator id is a User global id; decode it to the raw id the
        // REST-backed employee page expects. When present, the avatar + name open
        // that user's page in a new tab (accent + underline). `data-no-row-click`
        // stops the row's own navigation (to the execution) so only the user opens.
        cell: ({ row }: { row: Row<UiExecution> }) => {
          const rawInitiatorId = row.original.initiatorId
            ? (decodeGlobalId(row.original.initiatorId)?.rawId ?? row.original.initiatorId)
            : '';
          const href = rawInitiatorId ? employeeDetailHref(rawInitiatorId) : null;

          const avatar = (
            <SquareAvatar
              variant="round"
              size="md"
              src={row.original.initiatorImage}
              fallback={row.original.initiatorInitials}
              alt={row.original.initiatorName}
              initialsClassName="text-ods-text-secondary"
            />
          );

          if (!href) {
            return (
              <div className="flex flex-1 items-center gap-2 min-w-0">
                {avatar}
                {/* min-w-0 flex-1 wrapper so the FloatingTooltip's block div can shrink and the name ellipsizes. */}
                <div className="min-w-0 flex-1">
                  <TruncateText>{row.original.initiatorName}</TruncateText>
                </div>
              </div>
            );
          }

          // The whole cell is the click target: the wrapper + button fill the full
          // (self-stretched) cell height, with the avatar + name centered inside.
          return (
            <div data-no-row-click className="flex min-w-0 flex-1 pointer-events-auto">
              <button
                type="button"
                onClick={openInNewTab(href)}
                className="flex w-full items-center gap-2 min-w-0 text-left"
              >
                {avatar}
                {/* min-w-0 flex-1 wrapper so the FloatingTooltip's block div can shrink and the name ellipsizes. */}
                <div className="min-w-0 flex-1">
                  <TruncateText className="text-ods-accent underline">{row.original.initiatorName}</TruncateText>
                </div>
              </button>
            </div>
          );
        },
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: {
          width: 'flex-1 min-w-0',
          hideAt: 'md',
          cellClassName: 'self-stretch',
          filter: { options: initiatorOptions },
        },
      },
      {
        accessorKey: 'result',
        header: 'Result',
        cell: ({ row }: { row: Row<UiExecution> }) => (
          <TruncateText lines={2}>{row.original.result || '—'}</TruncateText>
        ),
        enableSorting: false,
        meta: { width: 'flex-1 min-w-0', hideAt: 'xl' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<UiExecution> }) => (
          <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
            {renderRowActions(row.original)}
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<UiExecution> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              onClick={() => router.push(executionHref(row.original))}
              variant="outline"
              size="icon"
              leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
              aria-label="Open execution details"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [renderRowActions, router, executionHref, initiatorOptions],
  );

  const filterGroups = useMemo(
    () => [
      { id: 'status', title: 'Status', options: STATUS_FILTER_OPTIONS },
      { id: 'initiatorId', title: 'Executed by', options: initiatorOptions },
    ],
    [initiatorOptions],
  );

  const columnFilters = useMemo(
    () =>
      Object.entries(tableFilters)
        .filter(([, value]) => value && value.length > 0)
        .map(([id, value]) => ({ id, value })),
    [tableFilters],
  );

  const handleColumnFiltersChange = useCallback(
    (updater: unknown) => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      const nextFilters: Record<string, string[]> = {};
      for (const f of next as Array<{ id: string; value: string[] | string }>) {
        nextFilters[f.id] = Array.isArray(f.value) ? f.value : [f.value];
      }
      onFilterChange(nextFilters);
    },
    [columnFilters, onFilterChange],
  );

  const table = useDataTable<UiExecution>({
    data: executions,
    columns,
    getRowId: (row: UiExecution) => row.id,
    enableSorting: false,
    state: { columnFilters },
    onColumnFiltersChange: handleColumnFiltersChange,
  });

  // Hide the column header on an empty list (cleaner empty state), but keep it
  // when a filter is active so the Status dropdown is still reachable to clear it.
  const hasActiveFilter = columnFilters.length > 0;
  const showHeader = executions.length > 0 || hasActiveFilter;

  return (
    <>
      <DataTable table={table}>
        {showHeader && (
          <DataTable.Header stickyHeader stickyHeaderOffset={stickyHeaderOffset} rightSlot={<DataTable.RowCount />} />
        )}
        <DataTable.Body
          skeletonRows={PAGE_SIZE}
          emptyMessage="No executions found. Run this script to see its history here."
          rowClassName="mb-1"
          rowHref={executionHref}
        />
        {executions.length > 0 && (
          <DataTable.InfiniteFooter
            hasNextPage={hasNext}
            isFetchingNextPage={isLoadingNext}
            onLoadMore={fetchNextPage}
            skeletonRows={2}
          />
        )}
      </DataTable>

      <FilterModal
        isOpen={mobileFilterOpen}
        onClose={onMobileFilterClose}
        filterGroups={filterGroups}
        onFilterChange={onFilterChange}
        currentFilters={tableFilters}
      />
    </>
  );
}

// ----------------------------------------------------------------
// Skeleton
// ----------------------------------------------------------------

const EMPTY_ROWS: UiExecution[] = [];

export function ScriptExecutionsSkeleton({ stickyHeaderOffset }: { stickyHeaderOffset?: string } = {}) {
  const columns = useMemo<ColumnDef<UiExecution>[]>(
    () => [
      { accessorKey: 'executionId', header: 'Execution', enableSorting: false, meta: { width: 'w-[160px]' } },
      { accessorKey: 'status', header: 'Status', enableSorting: false, meta: { width: 'w-[120px]' } },
      {
        accessorKey: 'machineName',
        header: 'Device',
        enableSorting: false,
        meta: { width: 'w-[240px]', hideAt: 'lg' },
      },
      {
        accessorKey: 'initiatorName',
        header: 'Executed by',
        enableSorting: false,
        meta: { width: 'flex-1 min-w-0', hideAt: 'md' },
      },
      {
        accessorKey: 'result',
        header: 'Result',
        enableSorting: false,
        meta: { width: 'flex-1 min-w-0', hideAt: 'xl' },
      },
    ],
    [],
  );

  const table = useDataTable<UiExecution>({
    data: EMPTY_ROWS,
    columns,
    getRowId: (row: UiExecution) => row.id,
    enableSorting: false,
  });

  return (
    <DataTable table={table}>
      <DataTable.Header stickyHeader stickyHeaderOffset={stickyHeaderOffset} />
      <DataTable.Body loading={true} skeletonRows={PAGE_SIZE} emptyMessage="" rowClassName="mb-1" />
    </DataTable>
  );
}

// ----------------------------------------------------------------
// Outer shell — URL filter state + Suspense boundary
// ----------------------------------------------------------------

export function ScriptExecutionsTab({ scriptId }: ScriptExecutionsTabProps) {
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    status: { type: 'array', default: [] },
    initiatorId: { type: 'array', default: [] },
  });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Local search input keeps typing responsive; debounced into the URL param.
  const {
    search: searchInput,
    setSearch: setSearchInput,
    debouncedSearch,
  } = useSearchParam(params.search, value => setParam('search', value), 300);

  const backendFilters: ScriptExecutionFilterInput = useMemo(
    () => ({
      ...(params.status.length > 0 && { statuses: params.status as ScriptExecutionFilterInput['statuses'] }),
      ...(params.initiatorId.length > 0 && { initiatorIds: params.initiatorId }),
    }),
    [params.status, params.initiatorId],
  );

  const tableFilters = useMemo(
    () => ({ status: params.status, initiatorId: params.initiatorId }),
    [params.status, params.initiatorId],
  );

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, string[]>) => {
      setParams({ status: columnFilters.status || [], initiatorId: columnFilters.initiatorId || [] });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
  );

  return (
    <div className="flex flex-col" style={containerStyle}>
      {/* Search stays pinned to the top of the scroll area; its measured height
          feeds the sticky column header offset. `pt-l` separates it from the tab
          bar above (TabNavigation renders its content flush), `pb-l` from the
          table below — the `bg-ods-bg` hides rows scrolling underneath. */}
      <div
        ref={toolbarRef}
        className="sticky top-0 z-20 flex items-center gap-[var(--spacing-system-xs)] bg-ods-bg pt-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      >
        <div className="flex-1">
          <Input
            placeholder="Search executions"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileFilterOpen(true)}
          aria-label="Open filters"
          leftIcon={<Filter02Icon />}
        />
      </div>
      <Suspense fallback={<ScriptExecutionsSkeleton stickyHeaderOffset={stickyHeaderOffset} />}>
        <ScriptExecutionsContent
          scriptId={scriptId}
          debouncedSearch={debouncedSearch}
          backendFilters={backendFilters}
          tableFilters={tableFilters}
          onFilterChange={handleFilterChange}
          mobileFilterOpen={mobileFilterOpen}
          onMobileFilterClose={() => setMobileFilterOpen(false)}
          stickyHeaderOffset={stickyHeaderOffset}
        />
      </Suspense>
    </div>
  );
}
