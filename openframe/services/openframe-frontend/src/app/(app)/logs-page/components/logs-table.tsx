'use client';

import { ToolBadge } from '@flamingo-stack/openframe-frontend-core';
import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ArrowRightUpIcon,
  CalendarIcon,
  ClipboardListIcon,
  EyeAltIcon,
  EyeIcon,
  Filter01ListIcon,
  Filter02Icon,
  Refresh02HrIcon,
  ScanIcon,
  SearchIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  DateFilterMenu,
  type DateFilterResult,
  type DateRange,
  FilterModal,
  Input,
  multiSelectFilterFn,
  PageLayout,
  type Row,
  Tag,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn, normalizeToolTypeWithFallback, toToolLabel } from '@flamingo-stack/openframe-frontend-core/utils';
import {
  forwardRef,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import type { logsTableRelay_query$key as LogsFragmentKey } from '@/__generated__/logsTableRelay_query.graphql';
import type { logsTableRelayPaginationQuery as LogsPaginationQueryType } from '@/__generated__/logsTableRelayPaginationQuery.graphql';
import type { logsTableRelayQuery as LogsQueryType } from '@/__generated__/logsTableRelayQuery.graphql';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { EMBEDDED_PAGE_OFFSET, EmptyState, LogDrawer } from '@/app/components/shared';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { LogSortField, SortDirection } from '@/generated/schema-enums';
import { dateRangeFromParams, dateRangeToInstantBounds, toDayParam } from '@/lib/date-filter-params';
import { transformOrganizationFilters } from '@/lib/filter-utils';
import { formatDateTime } from '@/lib/format-date';
import { openInNewTab } from '@/lib/open-in-new-tab';
import type { LogFilterInput } from '../types/log.types';
import { LogCopyButton } from './log-copy-button';

// ----------------------------------------------------------------
// GraphQL definitions
// ----------------------------------------------------------------

const LOGS_PAGE_SIZE = 20;

const logsTableRelayQuery = graphql`
  query logsTableRelayQuery(
    $filter: LogFilterInput
    $first: Int!
    $after: String
    $search: String
    $sort: LogSortInput
  ) {
    ...logsTableRelay_query
      @arguments(filter: $filter, first: $first, after: $after, search: $search, sort: $sort)
    logFilters(filter: $filter) {
      toolTypes
      eventTypes
      severities
      organizations {
        id
        name
      }
    }
  }
`;

const logsTableRelayFragment = graphql`
  fragment logsTableRelay_query on Query
    @refetchable(queryName: "logsTableRelayPaginationQuery")
    @argumentDefinitions(
      filter: { type: "LogFilterInput" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
      search: { type: "String" }
      sort: { type: "LogSortInput" }
    ) {
    logs(filter: $filter, first: $first, after: $after, search: $search, sort: $sort)
      @connection(key: "logsTableRelay_logs") {
      edges {
        node {
          id
          toolEventId
          eventType
          ingestDay
          toolType
          severity
          deviceId
          hostname
          organizationId
          organizationName
          summary
          timestamp
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type UiSortDirection = 'asc' | 'desc';

interface LogSortInput {
  field: LogSortField;
  direction: SortDirection;
}

interface UiLogEntry {
  id: string;
  logId: string;
  timestamp: string;
  status: {
    label: string;
    variant?: 'success' | 'warning' | 'error' | 'grey' | 'critical';
  };
  source: {
    name: string;
    toolType: string;
    icon?: React.ReactNode;
  };
  device: {
    name: string;
    organization?: string;
  };
  description: {
    title: string;
    details?: string;
  };
  originalLogEntry?: any;
}

interface LogsTableProps {
  deviceId?: string;
  /** Lock the table to a single organization. When set, the source/organization column filter is hidden. */
  organizationId?: string;
  /** Render inside a tab (e.g. customer/device details) — drops the standalone top padding. */
  embedded?: boolean;
  /** Render the PageLayout header (title + Refresh action). Defaults to `true`. Pass
   *  `false` when embedded in a section that supplies its own heading (e.g. the device
   *  Overview tab), so only the search toolbar + table show. */
  showHeader?: boolean;
}

export interface LogsTableRef {
  refresh: () => void;
}

interface LogsTableContentProps {
  deviceId?: string;
  organizationLocked?: boolean;
  backendFilters: LogFilterInput;
  sort: LogSortInput;
  /** Applied date filter (Log ID column) — drives the header calendar popover */
  dateRange: DateRange | undefined;
  sortDirection: UiSortDirection;
  onDateFilterApply: (result: DateFilterResult) => void;
  debouncedSearch: string;
  tableFilters: Record<string, string[]>;
  onFilterChange: (filters: Record<string, any[]>) => void;
  onRefreshRef: React.RefObject<(() => void) | null>;
  /** Reports the genuinely-empty (onboarding) state up so the outer layout can
   *  hide the search field while the empty state is shown. */
  onEmptyChange: (isEmpty: boolean) => void;
  /** Mobile filter modal open state (the trigger lives in the outer toolbar, but
   *  the filter options come from this component's logFilters query). */
  mobileFilterOpen: boolean;
  onMobileFilterClose: () => void;
}

// ----------------------------------------------------------------
// Inner content — uses Relay hooks, must be inside Suspense
// ----------------------------------------------------------------

function LogsTableContent({
  deviceId,
  organizationLocked,
  backendFilters,
  sort,
  dateRange,
  sortDirection,
  onDateFilterApply,
  debouncedSearch,
  tableFilters,
  onFilterChange,
  onRefreshRef,
  onEmptyChange,
  mobileFilterOpen,
  onMobileFilterClose,
}: LogsTableContentProps) {
  const { toast } = useToast();
  const askMingo = useAskMingo();
  const [isPending, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<UiLogEntry | null>(null);

  const queryData = useLazyLoadQuery<LogsQueryType>(
    logsTableRelayQuery,
    {
      filter: backendFilters,
      first: LOGS_PAGE_SIZE,
      after: null,
      search: debouncedSearch || null,
      sort,
    },
    { fetchPolicy: 'store-and-network' },
  );

  const { data, loadNext, hasNext, isLoadingNext, refetch } = usePaginationFragment<
    LogsPaginationQueryType,
    LogsFragmentKey
  >(logsTableRelayFragment, queryData);

  const logFilters = useMemo(
    () =>
      queryData.logFilters
        ? {
            toolTypes: [...queryData.logFilters.toolTypes],
            eventTypes: [...queryData.logFilters.eventTypes],
            severities: [...queryData.logFilters.severities],
            organizations: queryData.logFilters.organizations.map(org => ({
              id: org.id,
              name: org.name,
            })),
          }
        : null,
    [queryData.logFilters],
  );

  const logs = useMemo(() => {
    const edges = data.logs?.edges ?? [];
    return edges.map(edge => {
      const node = edge.node;
      return {
        ...node,
        device:
          node.deviceId || node.hostname || node.organizationName
            ? {
                id: node.deviceId || '',
                machineId: node.deviceId || '',
                hostname: node.hostname || node.deviceId || '',
                displayName: node.hostname || '',
                organizationId: node.organizationId,
                organization: node.organizationName || node.organizationId || '',
              }
            : undefined,
      };
    });
  }, [data.logs?.edges]);

  const fetchNextPage = useCallback(() => {
    if (hasNext && !isLoadingNext) {
      loadNext(LOGS_PAGE_SIZE, {
        onComplete: err => {
          if (err) {
            toast({
              title: 'Error loading more logs',
              description: err.message,
              variant: 'destructive',
            });
          }
        },
      });
    }
  }, [hasNext, isLoadingNext, loadNext, toast]);

  const resetToFirstPage = useCallback(() => {
    startTransition(() => {
      refetch(
        {
          filter: backendFilters,
          first: LOGS_PAGE_SIZE,
          after: null,
          search: debouncedSearch || null,
          sort,
        },
        { fetchPolicy: 'network-only' },
      );
    });
  }, [refetch, backendFilters, debouncedSearch, sort]);

  // Expose refresh to parent via mutable ref
  onRefreshRef.current = resetToFirstPage;

  const transformedLogs: UiLogEntry[] = useMemo(() => {
    return logs.map(log => ({
      id: log.toolEventId,
      logId: log.toolEventId,
      timestamp: formatDateTime(log.timestamp),
      status: {
        label: log.severity,
        variant:
          log.severity === 'ERROR'
            ? ('error' as const)
            : log.severity === 'WARNING'
              ? ('warning' as const)
              : log.severity === 'INFO'
                ? ('grey' as const)
                : log.severity === 'CRITICAL'
                  ? ('critical' as const)
                  : ('success' as const),
      },
      source: {
        name: toToolLabel(log.toolType),
        toolType: normalizeToolTypeWithFallback(log.toolType),
      },
      device: {
        name: log.device?.hostname || log.hostname || log.deviceId || '-',
        organization: log.device?.organization || log.organizationName || '-',
      },
      description: {
        title: log.summary || 'No summary available',
      },
      originalLogEntry: log,
    }));
  }, [logs]);

  const getLogDetailsUrl = useCallback((log: UiLogEntry): string => {
    const original = log.originalLogEntry || log;
    const id = log.id || log.logId;
    return `/log-details?id=${id}&ingestDay=${original.ingestDay}&toolType=${original.toolType}&eventType=${original.eventType}&timestamp=${encodeURIComponent(original.timestamp || '')}`;
  }, []);

  const columns = useMemo<ColumnDef<UiLogEntry>[]>(
    () => [
      {
        accessorKey: 'logId',
        // Custom header: label + calendar popover with timestamp sort + date-range filter.
        // No own vertical padding — the lib HeaderCell wrapper already pads the row.
        header: () => (
          <div className="group flex items-center gap-[var(--spacing-system-xsf)] select-none">
            <span className="text-h5 text-ods-text-secondary whitespace-nowrap transition-colors duration-200 group-hover:text-ods-text-primary">
              Log ID
            </span>
            <DateFilterMenu
              mode="range"
              sort={sortDirection}
              range={dateRange}
              onApply={onDateFilterApply}
              // Compact inline trigger — keeps the header row height identical to
              // the other columns (the default lib trigger is a 48px Button).
              trigger={
                <button type="button" aria-label="Sort and filter logs by date" className="flex items-center">
                  <CalendarIcon
                    className={cn(
                      'w-4 h-4 transition-colors duration-200',
                      // Active when a date range or a non-default sort is applied
                      dateRange || sortDirection !== 'desc'
                        ? 'text-ods-accent'
                        : 'text-ods-text-secondary group-hover:text-ods-text-primary',
                    )}
                  />
                </button>
              }
            />
          </div>
        ),
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <div className="flex flex-col justify-center shrink-0">
            <TruncateText>{row.original.timestamp}</TruncateText>
            <TruncateText variant="h6" tone="secondary">
              {row.original.logId}
            </TruncateText>
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-[200px]', alwaysShowHeader: true },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <div className="shrink-0">
            <Tag label={row.original.status.label} variant={row.original.status.variant} />
          </div>
        ),
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: {
          width: 'w-[120px]',
          filter: {
            options:
              logFilters?.severities?.map((severity: string) => ({
                id: severity,
                label: severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase(),
                value: severity,
              })) || [],
          },
        },
      },
      {
        accessorKey: 'tool',
        header: 'Tool',
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <ToolBadge
            toolType={normalizeToolTypeWithFallback(row.original.source.toolType)}
            iconClassName="w-4 h-4 md:w-6 md:h-6"
          />
        ),
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: {
          width: 'w-[150px]',
          hideAt: 'md',
          filter: {
            options:
              logFilters?.toolTypes?.map((toolType: string) => ({
                id: toolType,
                label: toToolLabel(toolType),
                value: toolType,
              })) || [],
          },
        },
      },
      {
        accessorKey: 'source',
        header: 'SOURCE',
        cell: ({ row }: { row: Row<UiLogEntry> }) => {
          const deviceName = row.original.device.name === 'null' ? 'System' : row.original.device.name;
          const organization = row.original.device.organization;
          return (
            <div className="flex flex-col justify-center gap-1 py-2 min-h-[60px]">
              {deviceName && <TruncateText>{deviceName}</TruncateText>}
              {organization && (
                <TruncateText variant="h6" tone="secondary">
                  {organization}
                </TruncateText>
              )}
            </div>
          );
        },
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: {
          width: 'w-[120px]',
          hideAt: 'md',
          filter: organizationLocked
            ? undefined
            : {
                options: transformOrganizationFilters(logFilters?.organizations),
              },
        },
      },
      {
        accessorKey: 'description',
        header: 'Log Details',
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <TruncateText
            lines={3}
            className="font-['DM_Sans'] font-medium text-[16px] leading-[20px] text-ods-text-secondary"
          >
            {row.original.description.title}
          </TruncateText>
        ),
        enableSorting: false,
        meta: { width: 'flex-1', hideAt: 'lg' },
      },
      {
        id: 'copy',
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <LogCopyButton log={row.original.originalLogEntry} />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none ml-auto', align: 'right' },
      },
      {
        id: 'quickView',
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              onClick={() => setSelectedLog(row.original)}
              variant="outline"
              size="icon"
              leftIcon={<EyeIcon className="w-5 h-5" />}
              aria-label="Quick view"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              onClick={openInNewTab(getLogDetailsUrl(row.original))}
              variant="outline"
              size="icon"
              leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
              aria-label="Open in new tab"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', hideAt: 'md', align: 'right' },
      },
    ],
    [logFilters, getLogDetailsUrl, organizationLocked, dateRange, sortDirection, onDateFilterApply],
  );

  // Mobile filter groups reuse the same column filter options (built from
  // logFilters) as the desktop column headers, so the modal isn't empty.
  const filterGroups = useMemo(
    () =>
      columns
        .filter(column => column.meta?.filter?.options)
        .map(column => ({
          id: String(column.id ?? (column as { accessorKey?: string }).accessorKey ?? ''),
          title: typeof column.header === 'string' ? column.header : '',
          options: column.meta?.filter?.options || [],
        })),
    [columns],
  );

  const columnFilters = useMemo(
    () =>
      Object.entries(tableFilters)
        .filter(([, value]) => value && value.length > 0)
        .map(([id, value]) => ({ id, value })),
    [tableFilters],
  );

  const handleColumnFiltersChange = useCallback(
    (updater: any) => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater;
      const nextFilters: Record<string, any[]> = {};
      for (const f of next) {
        nextFilters[f.id] = Array.isArray(f.value) ? f.value : [f.value];
      }
      onFilterChange(nextFilters);
    },
    [columnFilters, onFilterChange],
  );

  const table = useDataTable<UiLogEntry>({
    data: transformedLogs,
    columns,
    getRowId: (row: UiLogEntry) => row.id,
    enableSorting: false,
    state: { columnFilters },
    onColumnFiltersChange: handleColumnFiltersChange,
  });

  const handleCloseModal = useCallback(() => {
    setSelectedLog(null);
  }, []);

  const hasActiveFilters = Object.values(tableFilters).some(values => values.length > 0);
  // The applied date range counts as a query too — an empty result must keep
  // the table header so the date filter stays reachable to pick another period.
  const hasQuery = Boolean(debouncedSearch) || hasActiveFilters || Boolean(dateRange);
  const noRows = !isPending && transformedLogs.length === 0;

  // Standalone (unscoped) Logs page: the rich onboarding EmptyState replaces the
  // whole table when there is genuinely no data (no scope, no query).
  const showEmptyState = !deviceId && !organizationLocked && !hasQuery && noRows;

  // Embedded (device/customer-scoped) tabs: mirror the other detail-page tabs —
  // when the table is empty, hide the column header and render the unified
  // `DataTable.Body emptyState` (icon + title + description) instead of an inline
  // message. (Below, the search input is also hidden unless a query is active.)
  const scoped = Boolean(deviceId) || Boolean(organizationLocked);
  const scopedEmpty = scoped && noRows;

  // Search lives in the outer layout (outside this Suspense boundary, to keep
  // focus across re-queries), so push the "hide search" flag up. Hide it for the
  // onboarding empty state and for a genuinely-empty scoped tab — but keep it when
  // a query is active so the user can clear it.
  const hideSearch = showEmptyState || (scopedEmpty && !hasQuery);
  useEffect(() => {
    onEmptyChange(hideSearch);
  }, [hideSearch, onEmptyChange]);

  if (showEmptyState) {
    return (
      <EmptyState
        icon={<ClipboardListIcon />}
        title="No logs yet"
        description="A timeline of every action taken across the platform (scripts run, policies applied, devices connected, tickets updated) will be displayed here."
        actions={[
          { icon: <EyeAltIcon />, label: 'Track who did what, when, and on which device' },
          { icon: <Filter01ListIcon />, label: 'Filter by user, action type, Customer, or date range' },
          { icon: <SearchIcon />, label: 'Investigate incidents and audit security events' },
        ]}
        buttonLabel="Ask Mingo about Logs"
        buttonIcon={
          <MingoIcon
            className="size-5"
            eyesColor="var(--ods-flamingo-cyan-base)"
            cornerColor="var(--ods-flamingo-cyan-base)"
          />
        }
        onButtonClick={() => askMingo('logs')}
      />
    );
  }

  return (
    <>
      <DataTable table={table}>
        {/* Keep the header while a query (search/filters/date range) is active,
            even with zero rows — its controls are the only way to change it. */}
        {!(scopedEmpty && !hasQuery) && (
          <DataTable.Header stickyHeader stickyHeaderOffset="top-[96px]" rightSlot={<DataTable.RowCount />} />
        )}
        <DataTable.Body
          loading={isPending}
          skeletonRows={10}
          // Embedded tabs get the unified empty state (matches every other device/
          // customer tab); the standalone page keeps its inline message.
          {...(scoped
            ? {
                emptyState: {
                  icon: <ClipboardListIcon />,
                  title: 'No logs found',
                  description: hasQuery
                    ? 'No results. Try adjusting your search or filters.'
                    : deviceId
                      ? 'Logs for this device will appear here.'
                      : 'Logs for this customer will appear here.',
                },
              }
            : { emptyMessage: 'No logs found. Try adjusting your search or filters.' })}
          rowHref={getLogDetailsUrl}
          rowClassName="mb-1"
        />
        <DataTable.InfiniteFooter
          hasNextPage={hasNext}
          isFetchingNextPage={isLoadingNext}
          onLoadMore={fetchNextPage}
          skeletonRows={2}
        />
      </DataTable>

      <FilterModal
        isOpen={mobileFilterOpen}
        onClose={onMobileFilterClose}
        filterGroups={filterGroups}
        onFilterChange={onFilterChange}
        currentFilters={tableFilters}
        // Date sort + range — last section, committed together with the group
        // filters (the outer handler merges both into a single URL write).
        dateFilter={{
          title: 'Date',
          sort: sortDirection,
          range: dateRange,
          onChange: onDateFilterApply,
        }}
      />

      <LogDrawer
        isOpen={Boolean(selectedLog)}
        onClose={handleCloseModal}
        description={selectedLog?.description.title || ''}
        statusTag={selectedLog?.status}
        timestamp={selectedLog?.timestamp}
        deviceId={selectedLog?.originalLogEntry?.deviceId}
        infoFields={
          selectedLog
            ? [
                { label: 'Log ID', value: selectedLog.logId },
                {
                  label: 'Source',
                  value: <ToolBadge toolType={normalizeToolTypeWithFallback(selectedLog.source.toolType)} />,
                },
                { label: 'Device', value: selectedLog.device.name },
              ]
            : []
        }
      />
    </>
  );
}

// ----------------------------------------------------------------
// Loading fallback — DataTable skeleton with base columns
// ----------------------------------------------------------------

const EMPTY_LOG_ENTRIES: UiLogEntry[] = [];

export function LogsTableSkeleton() {
  const columns = useMemo<ColumnDef<UiLogEntry>[]>(
    () => [
      {
        accessorKey: 'logId',
        header: 'Log ID',
        enableSorting: false,
        meta: { width: 'w-[200px]', alwaysShowHeader: true },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: { width: 'w-[120px]', filter: { options: [] } },
      },
      {
        accessorKey: 'tool',
        header: 'Tool',
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: { width: 'w-[150px]', hideAt: 'md', filter: { options: [] } },
      },
      {
        accessorKey: 'source',
        header: 'SOURCE',
        enableSorting: false,
        filterFn: multiSelectFilterFn,
        meta: { width: 'w-[120px]', hideAt: 'md', filter: { options: [] } },
      },
      {
        accessorKey: 'description',
        header: 'Log Details',
        enableSorting: false,
        meta: { width: 'flex-1', hideAt: 'lg' },
      },
      {
        id: 'copy',
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none ml-auto', align: 'right' },
      },
      {
        id: 'quickView',
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', hideAt: 'md', align: 'right' },
      },
    ],
    [],
  );

  const table = useDataTable<UiLogEntry>({
    data: EMPTY_LOG_ENTRIES,
    columns,
    getRowId: (row: UiLogEntry) => row.id,
    enableSorting: false,
  });

  return (
    <DataTable table={table}>
      <DataTable.Header stickyHeader stickyHeaderOffset="top-[96px]" />
      <DataTable.Body loading={true} skeletonRows={10} emptyMessage="" rowClassName="mb-1" />
    </DataTable>
  );
}

// ----------------------------------------------------------------
// Outer component — layout shell with internal Suspense
// ----------------------------------------------------------------

export const LogsTable = forwardRef<LogsTableRef, LogsTableProps>(function LogsTable(
  { deviceId, organizationId, embedded, showHeader }: LogsTableProps,
  ref,
) {
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    severities: { type: 'array', default: [] },
    toolTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
    dateFrom: { type: 'string', default: '' },
    dateTo: { type: 'string', default: '' },
    sortDirection: { type: 'string', default: 'desc' },
  });

  // Local search input keeps typing responsive; the debounced value drives both
  // the query and the URL param (so history isn't spammed on every keystroke).
  // The shared hook guards the back/forward sync-down so it can't clobber
  // characters typed while a fetch is in flight.
  const {
    search: searchInput,
    setSearch: setSearchInput,
    debouncedSearch,
  } = useSearchParam(params.search, value => setParam('search', value), 300);

  // Whether the inner content is in the genuinely-empty onboarding state; when
  // true the search toolbar is hidden (the header + actions stay).
  const [isEmpty, setIsEmpty] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const lockedOrgIds = useMemo(() => (organizationId ? [organizationId] : undefined), [organizationId]);

  // Applied date filter (Log ID column) restored from the URL
  const dateRange: DateRange | undefined = useMemo(
    () => dateRangeFromParams(params.dateFrom, params.dateTo),
    [params.dateFrom, params.dateTo],
  );

  const sortDirection: UiSortDirection = params.sortDirection === 'asc' ? 'asc' : 'desc';

  const sort: LogSortInput = useMemo(
    () => ({
      field: LogSortField.TIMESTAMP,
      direction: sortDirection === 'asc' ? SortDirection.ASC : SortDirection.DESC,
    }),
    [sortDirection],
  );

  const backendFilters: LogFilterInput = useMemo(() => {
    const bounds = dateRangeToInstantBounds(dateRange);
    return {
      severities: params.severities,
      toolTypes: params.toolTypes,
      organizationIds: lockedOrgIds ?? params.organizationIds,
      deviceId,
      timestampFrom: bounds.from,
      timestampTo: bounds.to,
    };
  }, [params.severities, params.toolTypes, params.organizationIds, deviceId, lockedOrgIds, dateRange]);

  // The mobile FilterModal commits the group filters and the date filter as
  // two callbacks in the same tick; sequential setParams calls clobber each
  // other (each re-reads the stale URL), so merge them into one write.
  const pendingParamsRef = useRef<Record<string, string | string[]> | null>(null);
  const queueParamsWrite = useCallback(
    (updates: Record<string, string | string[]>) => {
      if (pendingParamsRef.current) {
        Object.assign(pendingParamsRef.current, updates);
        return;
      }
      pendingParamsRef.current = updates;
      queueMicrotask(() => {
        const merged = pendingParamsRef.current;
        pendingParamsRef.current = null;
        if (merged) {
          setParams(merged);
        }
      });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
  );

  const handleDateFilterApply = useCallback(
    (result: DateFilterResult) => {
      queueParamsWrite({
        // Default direction stays out of the URL
        sortDirection: result.sort === 'desc' ? '' : result.sort,
        dateFrom: result.range?.from ? toDayParam(result.range.from) : '',
        dateTo: result.range?.to ? toDayParam(result.range.to) : '',
      });
    },
    [queueParamsWrite],
  );

  const tableFilters = useMemo(
    () => ({
      status: params.severities,
      tool: params.toolTypes,
      source: lockedOrgIds ? [] : params.organizationIds,
    }),
    [params.severities, params.toolTypes, params.organizationIds, lockedOrgIds],
  );

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, any[]>) => {
      queueParamsWrite({
        severities: columnFilters.status || [],
        toolTypes: columnFilters.tool || [],
        organizationIds: columnFilters.source || [],
      });
    },
    [queueParamsWrite],
  );

  // Mutable ref so inner component can expose refresh without re-renders
  const refreshRef = useRef<(() => void) | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      refresh: () => refreshRef.current?.(),
    }),
    [],
  );

  const handleRefresh = useCallback(() => {
    refreshRef.current?.();
  }, []);

  const actions = useMemo(
    () => [
      {
        label: 'Refresh',
        variant: 'outline' as const,
        icon: <Refresh02HrIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleRefresh,
      },
    ],
    [handleRefresh],
  );

  return (
    <PageLayout
      title="Logs"
      actions={actions}
      showHeader={showHeader}
      className={embedded ? EMBEDDED_PAGE_OFFSET : undefined}
    >
      {/* Search toolbar - outside the Suspense boundary so it keeps focus across
          re-queries, and hidden while the empty state is shown. */}
      {!isEmpty && (
        <div className="sticky top-0 z-20 flex items-center gap-[var(--spacing-system-m)] bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]">
          <Input
            placeholder="Search for Logs"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="flex-1"
            startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
          />
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileFilterOpen(true)}
            aria-label="Open filters"
            leftIcon={<Filter02Icon />}
          />
        </div>
      )}

      <Suspense fallback={<LogsTableSkeleton />}>
        <LogsTableContent
          deviceId={deviceId}
          organizationLocked={Boolean(organizationId)}
          backendFilters={backendFilters}
          sort={sort}
          dateRange={dateRange}
          sortDirection={sortDirection}
          onDateFilterApply={handleDateFilterApply}
          debouncedSearch={debouncedSearch}
          tableFilters={tableFilters}
          onFilterChange={handleFilterChange}
          onRefreshRef={refreshRef}
          onEmptyChange={setIsEmpty}
          mobileFilterOpen={mobileFilterOpen}
          onMobileFilterClose={() => setMobileFilterOpen(false)}
        />
      </Suspense>
    </PageLayout>
  );
});
