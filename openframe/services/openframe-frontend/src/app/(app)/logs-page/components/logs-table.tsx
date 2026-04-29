'use client';

import { ToolBadge } from '@flamingo-stack/openframe-frontend-core';
import { Chevron02RightIcon, Refresh02HrIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  DeviceCardCompact,
  ListPageLayout,
  multiSelectFilterFn,
  type Row,
  TableDescriptionCell,
  TableTimestampCell,
  Tag,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { normalizeToolTypeWithFallback, toToolLabel } from '@flamingo-stack/openframe-frontend-core/utils';
import {
  forwardRef,
  Suspense,
  useCallback,
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
import { LogDrawer } from '@/app/components/shared';
import { transformOrganizationFilters } from '@/lib/filter-utils';
import type { LogFilterInput } from '../types/log.types';

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
  ) {
    ...logsTableRelay_query
      @arguments(filter: $filter, first: $first, after: $after, search: $search)
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
    ) {
    logs(filter: $filter, first: $first, after: $after, search: $search)
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
}

export interface LogsTableRef {
  refresh: () => void;
}

interface LogsTableContentProps {
  deviceId?: string;
  organizationLocked?: boolean;
  backendFilters: LogFilterInput;
  debouncedSearch: string;
  tableFilters: Record<string, string[]>;
  onFilterChange: (filters: Record<string, any[]>) => void;
  onRefreshRef: React.RefObject<(() => void) | null>;
}

// ----------------------------------------------------------------
// Inner content — uses Relay hooks, must be inside Suspense
// ----------------------------------------------------------------

function LogsTableContent({
  deviceId,
  organizationLocked,
  backendFilters,
  debouncedSearch,
  tableFilters,
  onFilterChange,
  onRefreshRef,
}: LogsTableContentProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<UiLogEntry | null>(null);

  const queryData = useLazyLoadQuery<LogsQueryType>(
    logsTableRelayQuery,
    {
      filter: backendFilters,
      first: LOGS_PAGE_SIZE,
      after: null,
      search: debouncedSearch || null,
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
        },
        { fetchPolicy: 'network-only' },
      );
    });
  }, [refetch, backendFilters, debouncedSearch]);

  // Expose refresh to parent via mutable ref
  onRefreshRef.current = resetToFirstPage;

  const transformedLogs: UiLogEntry[] = useMemo(() => {
    return logs.map(log => ({
      id: log.toolEventId,
      logId: log.toolEventId,
      timestamp: new Date(log.timestamp).toLocaleString(),
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
        header: 'Log ID',
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <TableTimestampCell timestamp={row.original.timestamp} id={row.original.logId} formatTimestamp={false} />
        ),
        enableSorting: false,
        meta: { width: 'w-[200px]' },
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
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <DeviceCardCompact
            deviceName={row.original.device.name === 'null' ? 'System' : row.original.device.name}
            organization={row.original.device.organization}
          />
        ),
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
        cell: ({ row }: { row: Row<UiLogEntry> }) => <TableDescriptionCell text={row.original.description.title} />,
        enableSorting: false,
        meta: { width: 'flex-1', hideAt: 'lg' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<UiLogEntry> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              href={getLogDetailsUrl(row.original)}
              prefetch={false}
              variant="outline"
              size="icon"
              centerIcon={<Chevron02RightIcon className="w-5 h-5" />}
              aria-label="View log details"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [logFilters, getLogDetailsUrl, organizationLocked],
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

  const handleRowClick = useCallback((log: UiLogEntry) => {
    setSelectedLog(log);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedLog(null);
  }, []);

  return (
    <>
      <DataTable table={table}>
        <DataTable.Header stickyHeader stickyHeaderOffset="top-[96px]" rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isPending}
          skeletonRows={10}
          emptyMessage={
            deviceId
              ? 'No logs found for this device. Try adjusting your search or filters.'
              : 'No logs found. Try adjusting your search or filters.'
          }
          onRowClick={handleRowClick}
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

function LogsTableSkeleton() {
  const columns = useMemo<ColumnDef<UiLogEntry>[]>(
    () => [
      {
        accessorKey: 'logId',
        header: 'Log ID',
        enableSorting: false,
        meta: { width: 'w-[200px]' },
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
        id: 'open',
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [],
  );

  const table = useDataTable<UiLogEntry>({
    data: [],
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
  { deviceId, organizationId }: LogsTableProps,
  ref,
) {
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    severities: { type: 'array', default: [] },
    toolTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
  });

  const debouncedSearch = useDebounce(params.search, 300);

  const lockedOrgIds = useMemo(() => (organizationId ? [organizationId] : undefined), [organizationId]);

  const backendFilters: LogFilterInput = useMemo(
    () => ({
      severities: params.severities,
      toolTypes: params.toolTypes,
      organizationIds: lockedOrgIds ?? params.organizationIds,
      deviceId,
    }),
    [params.severities, params.toolTypes, params.organizationIds, deviceId, lockedOrgIds],
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
      setParams({
        severities: columnFilters.status || [],
        toolTypes: columnFilters.tool || [],
        organizationIds: columnFilters.source || [],
      });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    },
    [setParams],
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
        variant: 'card' as const,
        icon: <Refresh02HrIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleRefresh,
      },
    ],
    [handleRefresh],
  );

  const filterGroups = useMemo(
    () => [
      { id: 'status', title: 'Status', options: [] },
      { id: 'tool', title: 'Tool', options: [] },
      { id: 'source', title: 'SOURCE', options: [] },
    ],
    [],
  );

  const content = (
    <Suspense fallback={<LogsTableSkeleton />}>
      <LogsTableContent
        deviceId={deviceId}
        organizationLocked={Boolean(organizationId)}
        backendFilters={backendFilters}
        debouncedSearch={debouncedSearch}
        tableFilters={tableFilters}
        onFilterChange={handleFilterChange}
        onRefreshRef={refreshRef}
      />
    </Suspense>
  );

  return (
    <ListPageLayout
      title="Logs"
      actions={actions}
      searchPlaceholder="Search for Logs"
      searchValue={params.search}
      onSearch={value => setParam('search', value)}
      error={null}
      background="default"
      padding="none"
      onMobileFilterChange={handleFilterChange}
      mobileFilterGroups={filterGroups}
      currentMobileFilters={tableFilters}
      stickyHeader
    >
      {content}
    </ListPageLayout>
  );
});
