'use client';

import { Input, ToolBadge } from '@flamingo-stack/openframe-frontend-core';
import { Refresh02HrIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  DeviceCardCompact,
  ListPageLayout,
  Table,
  type TableColumn,
  TableDescriptionCell,
  TableTimestampCell,
  Tag,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { normalizeToolTypeWithFallback, toToolLabel } from '@flamingo-stack/openframe-frontend-core/utils';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState, useTransition } from 'react';
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import type { logsTableRelay_query$key as LogsFragmentKey } from '@/__generated__/logsTableRelay_query.graphql';
import type { logsTableRelayPaginationQuery as LogsPaginationQueryType } from '@/__generated__/logsTableRelayPaginationQuery.graphql';
import type { logsTableRelayQuery as LogsQueryType } from '@/__generated__/logsTableRelayQuery.graphql';
import { transformOrganizationFilters } from '@/lib/filter-utils';
import { LogDrawer } from '../../components/shared';
import type { LogFilterInput } from '../types/log.types';

// ----------------------------------------------------------------
// GraphQL definitions — colocated with the component per Relay convention
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

interface LogsTableRelayProps {
  deviceId?: string;
  embedded?: boolean;
}

export interface LogsTableRelayRef {
  refresh: () => void;
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export const LogsTableRelay = forwardRef<LogsTableRelayRef, LogsTableRelayProps>(function LogsTableRelay(
  { deviceId, embedded = false }: LogsTableRelayProps,
  ref,
) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // --- URL state ---
  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    severities: { type: 'array', default: [] },
    toolTypes: { type: 'array', default: [] },
    organizationIds: { type: 'array', default: [] },
  });

  const debouncedSearch = useDebounce(params.search, 300);
  const [selectedLog, setSelectedLog] = useState<UiLogEntry | null>(null);

  const backendFilters: LogFilterInput = useMemo(
    () => ({
      severities: params.severities,
      toolTypes: params.toolTypes,
      organizationIds: params.organizationIds,
      deviceId,
    }),
    [params.severities, params.toolTypes, params.organizationIds, deviceId],
  );

  // --- Relay: root query ---
  // store-and-network: shows cached data instantly, then silently refetches in the background.
  // No Suspense trigger when cache exists — seamless revalidation on every mount.
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

  // --- Relay: pagination fragment ---
  const { data, loadNext, hasNext, isLoadingNext, refetch } = usePaginationFragment<
    LogsPaginationQueryType,
    LogsFragmentKey
  >(logsTableRelayFragment, queryData);

  // --- Filters from the same root query (no extra request) ---
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

  // --- Flatten edges → array ---
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

  // --- Pagination: load next page ---
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

  // --- Reset / refresh ---
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

  // --- Expose refresh via ref ---
  useImperativeHandle(
    ref,
    () => ({
      refresh: () => resetToFirstPage(),
    }),
    [resetToFirstPage],
  );

  // --- Transform to UI format ---
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

  // --- Columns ---
  const columns: TableColumn<UiLogEntry>[] = useMemo(() => {
    const allColumns: TableColumn<UiLogEntry>[] = [
      {
        key: 'logId',
        label: 'Log ID',
        width: 'w-[200px]',
        renderCell: log => <TableTimestampCell timestamp={log.timestamp} id={log.logId} formatTimestamp={false} />,
      },
      {
        key: 'status',
        label: 'Status',
        width: 'w-[120px]',
        filterable: true,
        filterOptions:
          logFilters?.severities?.map((severity: string) => ({
            id: severity,
            label: severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase(),
            value: severity,
          })) || [],
        renderCell: log => (
          <div className="shrink-0">
            <Tag label={log.status.label} variant={log.status.variant} />
          </div>
        ),
      },
      {
        key: 'tool',
        label: 'Tool',
        width: 'w-[150px]',
        hideAt: 'md',
        filterable: true,
        filterOptions:
          logFilters?.toolTypes?.map((toolType: string) => ({
            id: toolType,
            label: toToolLabel(toolType),
            value: toolType,
          })) || [],
        renderCell: log => <ToolBadge toolType={normalizeToolTypeWithFallback(log.source.toolType)} />,
      },
      {
        key: 'source',
        label: 'SOURCE',
        width: 'w-[120px]',
        hideAt: 'md',
        filterable: true,
        filterOptions: transformOrganizationFilters(logFilters?.organizations),
        renderCell: log => (
          <DeviceCardCompact
            deviceName={log.device.name === 'null' ? 'System' : log.device.name}
            organization={log.device.organization}
          />
        ),
      },
      {
        key: 'description',
        label: 'Log Details',
        width: 'flex-1',
        hideAt: 'lg',
        renderCell: log => <TableDescriptionCell text={log.description.title} />,
      },
    ];

    if (embedded) {
      return allColumns.filter(col => col.key !== 'source');
    }

    return allColumns;
  }, [embedded, logFilters]);

  // --- Handlers ---
  const getLogDetailsUrl = useCallback((log: UiLogEntry): string => {
    const original = log.originalLogEntry || log;
    const id = log.id || log.logId;
    return `/log-details?id=${id}&ingestDay=${original.ingestDay}&toolType=${original.toolType}&eventType=${original.eventType}&timestamp=${encodeURIComponent(original.timestamp || '')}`;
  }, []);

  const renderRowActions = useCallback(
    (log: UiLogEntry) => (
      <Button variant="outline" navigateUrl={getLogDetailsUrl(log)} openInNewTab={true}>
        Log Details
      </Button>
    ),
    [getLogDetailsUrl],
  );

  const handleRowClick = useCallback((log: UiLogEntry) => {
    setSelectedLog(log);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedLog(null);
  }, []);

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

  const handleRefresh = useCallback(() => {
    resetToFirstPage();
  }, [resetToFirstPage]);

  const tableFilters = useMemo(
    () => ({
      status: params.severities,
      tool: params.toolTypes,
      source: params.organizationIds,
    }),
    [params.severities, params.toolTypes, params.organizationIds],
  );

  const actions = useMemo(
    () => [
      {
        label: 'Refresh',
        icon: <Refresh02HrIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleRefresh,
      },
    ],
    [handleRefresh],
  );

  const filterGroups = columns
    .filter(column => column.filterable)
    .map(column => ({
      id: column.key,
      title: column.label,
      options: column.filterOptions || [],
    }));

  const tableContent = (
    <>
      <Table
        data={transformedLogs}
        columns={columns}
        rowKey="id"
        loading={isPending}
        skeletonRows={10}
        emptyMessage={
          deviceId
            ? 'No logs found for this device. Try adjusting your search or filters.'
            : 'No logs found. Try adjusting your search or filters.'
        }
        onRowClick={handleRowClick}
        renderRowActions={!embedded ? renderRowActions : undefined}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        rowClassName="mb-1"
        infiniteScroll={{
          hasNextPage: hasNext,
          isFetchingNextPage: isLoadingNext,
          onLoadMore: () => fetchNextPage(),
          skeletonRows: 2,
        }}
        stickyHeader
        stickyHeaderOffset="top-[56px]"
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

  if (embedded) {
    return (
      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-h5 text-ods-text-secondary">Logs ({transformedLogs.length})</h3>
        </div>

        <div className="flex gap-4 items-stretch h-[48px]">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search logs..."
              value={params.search}
              onChange={e => setParam('search', e.target.value)}
              className="h-[48px] min-h-[48px] bg-ods-card border border-ods-border"
              style={{ height: 48 }}
            />
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleRefresh}
              leftIcon={<Refresh02HrIcon size={20} />}
              className="h-[48px] min-h-[48px] whitespace-nowrap py-0 flex items-center"
              style={{ height: 48 }}
            >
              Refresh
            </Button>
          </div>
        </div>

        {tableContent}
      </div>
    );
  }

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
      {tableContent}
    </ListPageLayout>
  );
});
