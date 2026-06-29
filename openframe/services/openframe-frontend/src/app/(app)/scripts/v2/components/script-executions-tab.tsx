'use client';

import {
  ArrowRightUpIcon,
  Copy01Icon,
  Filter02Icon,
  MonitorIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuGroup,
  Button,
  type ColumnDef,
  DataTable,
  FilterModal,
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
import type { scriptExecutionsRelay_query$key as ExecutionsFragmentKey } from '@/__generated__/scriptExecutionsRelay_query.graphql';
import type { scriptExecutionsRelayPaginationQuery as ExecutionsPaginationQueryType } from '@/__generated__/scriptExecutionsRelayPaginationQuery.graphql';
import type {
  scriptExecutionsRelayQuery as ExecutionsQueryType,
  ScriptExecutionFilterInput,
} from '@/__generated__/scriptExecutionsRelayQuery.graphql';
import { ScriptExecutionStatus } from '@/generated/schema-enums';
import { scriptExecutionsRelayFragment, scriptExecutionsRelayQuery } from '@/graphql/scripts/script-executions-relay';
import { getFullImageUrl } from '@/lib/image-url';
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
  initiatorName: string;
  initiatorInitials: string;
  initiatorImage?: string;
  result: string;
}

// Status is the only server-supported filter (ScriptExecutionFilterInput.statuses).
// Options are the enum values — labels come from the shared helper.
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
  tableFilters: Record<string, string[]>;
  onFilterChange: (filters: Record<string, string[]>) => void;
  mobileFilterOpen: boolean;
  onMobileFilterClose: () => void;
}

function ScriptExecutionsContent({
  scriptId,
  backendFilters,
  tableFilters,
  onFilterChange,
  mobileFilterOpen,
  onMobileFilterClose,
}: ContentProps) {
  const router = useRouter();
  const { toast } = useToast();

  const queryData = useLazyLoadQuery<ExecutionsQueryType>(
    scriptExecutionsRelayQuery,
    { scriptId, filter: backendFilters, first: PAGE_SIZE, after: null },
    { fetchPolicy: 'store-and-network' },
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
        cell: ({ row }: { row: Row<UiExecution> }) => (
          <Tag
            label={executionStatusLabel(row.original.status)}
            variant={executionStatusVariant(row.original.status)}
          />
        ),
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: { width: 'w-[120px]', filter: { options: STATUS_FILTER_OPTIONS } },
      },
      {
        accessorKey: 'machineName',
        header: 'Device',
        cell: ({ row }: { row: Row<UiExecution> }) => (
          <div className="flex items-center gap-1 min-w-0">
            <MonitorIcon className="size-6 shrink-0 text-ods-text-secondary" />
            <div className="flex flex-col justify-center gap-1 min-w-0">
              <TruncateText>{row.original.machineName}</TruncateText>
              {row.original.organization && (
                <TruncateText variant="h6" tone="secondary">
                  {row.original.organization}
                </TruncateText>
              )}
            </div>
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-[200px]', hideAt: 'lg' },
      },
      {
        accessorKey: 'initiatorName',
        header: 'Executed by',
        cell: ({ row }: { row: Row<UiExecution> }) => (
          <div className="flex items-center gap-2 min-w-0">
            <SquareAvatar
              variant="round"
              size="md"
              src={row.original.initiatorImage}
              fallback={row.original.initiatorInitials}
              alt={row.original.initiatorName}
              initialsClassName="text-ods-text-secondary"
            />
            {/* min-w-0 flex-1 wrapper so the FloatingTooltip's block div can shrink and the name ellipsizes. */}
            <div className="min-w-0 flex-1">
              <TruncateText className="text-ods-accent">{row.original.initiatorName}</TruncateText>
            </div>
          </div>
        ),
        enableSorting: false,
        meta: { width: 'flex-1 min-w-0', hideAt: 'md' },
      },
      {
        accessorKey: 'result',
        header: 'Result',
        cell: ({ row }: { row: Row<UiExecution> }) => <TruncateText>{row.original.result || '—'}</TruncateText>,
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
    [renderRowActions, router, executionHref],
  );

  const filterGroups = useMemo(() => [{ id: 'status', title: 'Status', options: STATUS_FILTER_OPTIONS }], []);

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
        {showHeader && <DataTable.Header rightSlot={<DataTable.RowCount />} />}
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

export function ScriptExecutionsSkeleton() {
  const columns = useMemo<ColumnDef<UiExecution>[]>(
    () => [
      { accessorKey: 'executionId', header: 'Execution', enableSorting: false, meta: { width: 'w-[160px]' } },
      { accessorKey: 'status', header: 'Status', enableSorting: false, meta: { width: 'w-[120px]' } },
      {
        accessorKey: 'machineName',
        header: 'Device',
        enableSorting: false,
        meta: { width: 'w-[200px]', hideAt: 'lg' },
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
      <DataTable.Header />
      <DataTable.Body loading={true} skeletonRows={PAGE_SIZE} emptyMessage="" rowClassName="mb-1" />
    </DataTable>
  );
}

// ----------------------------------------------------------------
// Outer shell — URL filter state + Suspense boundary
// ----------------------------------------------------------------

export function ScriptExecutionsTab({ scriptId }: ScriptExecutionsTabProps) {
  const { params, setParams } = useApiParams({ status: { type: 'array', default: [] } });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const backendFilters: ScriptExecutionFilterInput = useMemo(
    () => ({ ...(params.status.length > 0 && { statuses: params.status as ScriptExecutionFilterInput['statuses'] }) }),
    [params.status],
  );

  const tableFilters = useMemo(() => ({ status: params.status }), [params.status]);

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, string[]>) => {
      setParams({ status: columnFilters.status || [] });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
  );

  return (
    <div className="flex flex-col">
      <div className="flex md:hidden justify-end pb-[var(--spacing-system-xs)]">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileFilterOpen(true)}
          aria-label="Open filters"
          leftIcon={<Filter02Icon />}
        />
      </div>
      <Suspense fallback={<ScriptExecutionsSkeleton />}>
        <ScriptExecutionsContent
          scriptId={scriptId}
          backendFilters={backendFilters}
          tableFilters={tableFilters}
          onFilterChange={handleFilterChange}
          mobileFilterOpen={mobileFilterOpen}
          onMobileFilterClose={() => setMobileFilterOpen(false)}
        />
      </Suspense>
    </div>
  );
}
