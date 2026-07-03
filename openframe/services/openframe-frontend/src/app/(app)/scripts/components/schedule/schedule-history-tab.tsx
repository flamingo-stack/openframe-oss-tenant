'use client';

import { LoadError, Tag } from '@flamingo-stack/openframe-frontend-core';
import {
  Button,
  type ColumnDef,
  DataTable,
  type Row,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo, useState } from 'react';
import { LogDrawer } from '@/app/components/shared';
import { formatDateTime } from '@/lib/format-date';
import { useScriptScheduleHistory } from '../../hooks/use-script-schedule';
import type { ScriptScheduleDetail, ScriptScheduleHistoryEntry } from '../../types/script-schedule.types';

interface ScheduleHistoryTabProps {
  schedule: ScriptScheduleDetail;
  scheduleId: string;
}

function getStatusVariant(status: string): 'success' | 'error' | 'warning' | 'grey' {
  switch (status) {
    case 'passing':
      return 'success';
    case 'failing':
      return 'error';
    default:
      return 'grey';
  }
}

function getStatusLabel(entry: ScriptScheduleHistoryEntry): string {
  if (entry.retcode === 0) return 'OK';
  if (entry.status === 'failing') return 'FAILING';
  return entry.status.toUpperCase();
}

// ─── Tab ───────────────────────────────────────────────────────────

export function ScheduleHistoryTab({ schedule, scheduleId }: ScheduleHistoryTabProps) {
  const [offset, setOffset] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<ScriptScheduleHistoryEntry | null>(null);
  const limit = 50;

  const { history, total, isLoading, error } = useScriptScheduleHistory(scheduleId, {
    limit,
    offset,
  });

  console.log(history);

  const handleNextPage = useCallback(() => {
    if (offset + limit < total) {
      setOffset(prev => prev + limit);
    }
  }, [offset, total]);

  const handlePrevPage = useCallback(() => {
    setOffset(prev => Math.max(0, prev - limit));
  }, []);

  const handleRowClick = useCallback((entry: ScriptScheduleHistoryEntry) => {
    setSelectedEntry(entry);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  const drawerStatusTag = selectedEntry
    ? {
        label: getStatusLabel(selectedEntry),
        variant: getStatusVariant(selectedEntry.status),
      }
    : undefined;

  const drawerTimestamp = selectedEntry?.last_run ? formatDateTime(selectedEntry.last_run) : '—';

  const drawerInfoFields = selectedEntry
    ? [
        { label: 'Status', value: getStatusLabel(selectedEntry) },
        { label: 'Return Code', value: String(selectedEntry.retcode) },
        { label: 'Device', value: selectedEntry.agent_hostname },
        { label: 'Platform', value: selectedEntry.agent_platform },
        { label: 'Exec. Time', value: `${selectedEntry.execution_time}s` },
        { label: 'Agent ID', value: selectedEntry.agent_id },
        {
          label: 'Sync Status',
          value: selectedEntry.sync_status.replace('_', ' '),
        },
      ]
    : [];

  const columns = useMemo<ColumnDef<ScriptScheduleHistoryEntry>[]>(
    () => [
      {
        accessorKey: 'id',
        id: 'log_id',
        header: 'LOG ID',
        cell: ({ row }: { row: Row<ScriptScheduleHistoryEntry> }) => {
          const entry = row.original;
          return (
            <div className="flex flex-col">
              <span className="text-h4 text-ods-text-primary">LOG-{String(entry.id).padStart(3, '0')}</span>
              <span className="text-h6 text-ods-text-secondary">
                {entry.last_run ? formatDateTime(entry.last_run) : '—'}
              </span>
            </div>
          );
        },
        meta: { width: 'w-[160px]' },
      },
      {
        accessorKey: 'status',
        header: 'STATUS',
        cell: ({ row }: { row: Row<ScriptScheduleHistoryEntry> }) => (
          <Tag label={getStatusLabel(row.original)} variant={getStatusVariant(row.original.status)} />
        ),
        meta: { width: 'w-[120px]' },
      },
      {
        accessorKey: 'agent_hostname',
        id: 'device',
        header: 'DEVICE',
        cell: ({ row }: { row: Row<ScriptScheduleHistoryEntry> }) => (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-h4 text-ods-text-primary">{row.original.agent_hostname}</span>
            </div>
          </div>
        ),
        meta: { hideAt: 'md' as const },
      },
      {
        id: 'details',
        header: 'LOG DETAILS',
        cell: ({ row }: { row: Row<ScriptScheduleHistoryEntry> }) => {
          const entry = row.original;
          return (
            <div className="flex flex-col min-w-0">
              <TruncateText>{entry.stdout || entry.stderr || 'No output'}</TruncateText>
              <TruncateText variant="h6" tone="secondary">
                {entry.stderr ? `stderr: ${entry.stderr}` : `Execution time: ${entry.execution_time}s`}
              </TruncateText>
            </div>
          );
        },
        meta: { hideAt: 'md' as const },
      },
    ],
    [],
  );

  const table = useDataTable<ScriptScheduleHistoryEntry>({
    data: history,
    columns,
    getRowId: (row: ScriptScheduleHistoryEntry) => String(row.id),
    enableSorting: false,
  });

  if (error) {
    return <LoadError message={`Failed to load execution history: ${error}`} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={10}
          emptyMessage="No execution history available"
          onRowClick={handleRowClick}
        />
      </DataTable>

      {total > limit && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="outline" onClick={handlePrevPage} disabled={offset === 0}>
            Previous
          </Button>
          <span className="text-[14px] text-ods-text-secondary">
            Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
          </span>
          <Button variant="outline" onClick={handleNextPage} disabled={offset + limit >= total}>
            Next
          </Button>
        </div>
      )}

      <LogDrawer
        isOpen={Boolean(selectedEntry)}
        onClose={handleCloseDrawer}
        statusTag={drawerStatusTag}
        timestamp={drawerTimestamp}
        infoFields={drawerInfoFields}
        description={selectedEntry?.stdout || selectedEntry?.stderr || 'No output'}
      />
    </div>
  );
}
