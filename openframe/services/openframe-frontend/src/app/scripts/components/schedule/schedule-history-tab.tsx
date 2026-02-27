'use client';

import { LoadError, Tag } from '@flamingo-stack/openframe-frontend-core';
import { Button, Table, type TableColumn } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo, useState } from 'react';
import { LogDrawer } from '../../../components/shared';
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

  const drawerTimestamp = selectedEntry?.last_run
    ? new Date(selectedEntry.last_run).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      })
    : '—';

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

  const columns: TableColumn<ScriptScheduleHistoryEntry>[] = useMemo(
    () => [
      {
        key: 'log_id',
        label: 'LOG ID',
        width: 'w-[160px]',
        renderCell: entry => (
          <div className="flex flex-col">
            <span className="font-['Azeret_Mono'] font-medium text-[18px] leading-[24px] text-ods-text-primary">
              LOG-{String(entry.id).padStart(3, '0')}
            </span>
            <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
              {entry.last_run
                ? new Date(entry.last_run).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    timeZone: 'UTC',
                  }) +
                  ',' +
                  new Date(entry.last_run).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'UTC',
                  })
                : '—'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        width: 'w-[120px]',
        renderCell: entry => <Tag label={getStatusLabel(entry)} variant={getStatusVariant(entry.status)} />,
      },
      {
        key: 'device',
        label: 'DEVICE',
        hideAt: 'sm' as const,
        renderCell: entry => (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary">
                {entry.agent_hostname}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'details',
        label: 'LOG DETAILS',
        hideAt: 'md' as const,
        renderCell: entry => (
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
              {entry.stdout || entry.stderr || 'No output'}
            </span>
            <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
              {entry.stderr ? `stderr: ${entry.stderr}` : `Execution time: ${entry.execution_time}s`}
            </span>
          </div>
        ),
      },
    ],
    [],
  );

  if (error) {
    return <LoadError message={`Failed to load execution history: ${error}`} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Table
        data={history}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={10}
        emptyMessage="No execution history available"
        showFilters={false}
        onRowClick={handleRowClick}
      />

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
