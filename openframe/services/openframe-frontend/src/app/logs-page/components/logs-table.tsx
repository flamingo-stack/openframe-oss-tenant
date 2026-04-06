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
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { normalizeToolTypeWithFallback, toToolLabel } from '@flamingo-stack/openframe-frontend-core/utils';
import Link from 'next/link';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { transformOrganizationFilters } from '@/lib/filter-utils';
import { LogDrawer } from '../../components/shared';
import { useLogFilters, useLogs } from '../hooks/use-logs';
import type { LogFilterInput } from '../types/log.types';

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
  embedded?: boolean;
}

export interface LogsTableRef {
  refresh: () => void;
}

export const LogsTable = forwardRef<LogsTableRef, LogsTableProps>(function LogsTable(
  { deviceId, embedded = false }: LogsTableProps,
  ref,
) {
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

  const { logs, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, resetToFirstPage } = useLogs(
    backendFilters,
    debouncedSearch,
  );

  const { logFilters } = useLogFilters(backendFilters);

  // Expose refresh method via ref (used by embedded logs-tab)
  useImperativeHandle(
    ref,
    () => ({
      refresh: () => resetToFirstPage(),
    }),
    [resetToFirstPage],
  );

  // Transform API logs to UI format
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
        organization: log.device?.organization || log.organizationName || log.userId || '-',
      },
      description: {
        title: log.summary || 'No summary available',
        details: log.details,
      },
      originalLogEntry: log,
    }));
  }, [logs]);

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

  const getLogDetailsUrl = useCallback((log: UiLogEntry): string => {
    const original = log.originalLogEntry || log;
    const id = log.id || log.logId;
    return `/log-details?id=${id}&ingestDay=${original.ingestDay}&toolType=${original.toolType}&eventType=${original.eventType}&timestamp=${encodeURIComponent(original.timestamp || '')}`;
  }, []);

  const renderEmbeddedRowActions = useCallback(
    (log: UiLogEntry) => (
      <Button
        variant="card"
        navigateUrl={getLogDetailsUrl(log)}
        className="bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary text-h3 px-4 py-3 h-12"
      >
        Log Details
      </Button>
    ),
    [getLogDetailsUrl],
  );

  const renderRowActions = useCallback(
    (log: UiLogEntry) => (
      <Button
        variant="outline"
        navigateUrl={getLogDetailsUrl(log)}
        showExternalLinkOnHover
        openInNewTab={true}
        className="bg-ods-card border-ods-border hover:bg-ods-bg-hover text-ods-text-primary text-h3 px-4 py-3 h-12"
      >
        Details
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
        loading={isLoading}
        skeletonRows={10}
        emptyMessage={
          deviceId
            ? 'No logs found for this device. Try adjusting your search or filters.'
            : 'No logs found. Try adjusting your search or filters.'
        }
        onRowClick={handleRowClick}
        renderRowActions={!embedded ? renderRowActions : renderEmbeddedRowActions}
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={true}
        rowClassName="mb-1"
        infiniteScroll={{
          hasNextPage,
          isFetchingNextPage,
          onLoadMore: () => fetchNextPage(),
          skeletonRows: 2,
        }}
        stickyHeader
        stickyHeaderOffset="top-[56px]"
      />

      {/* Log Drawer - Side Panel */}
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

  // Embedded mode: return table without ListPageLayout
  if (embedded) {
    return (
      <div className="space-y-4 mt-6">
        {/* Title */}
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

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-[6px] text-red-400 font-['DM_Sans'] text-[14px]">
            {error}
          </div>
        )}

        {tableContent}
      </div>
    );
  }

  // Full page mode: return with ListPageLayout
  return (
    <ListPageLayout
      title="Logs"
      actions={actions}
      searchPlaceholder="Search for Logs"
      searchValue={params.search}
      onSearch={value => setParam('search', value)}
      error={error}
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
