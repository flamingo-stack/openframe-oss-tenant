'use client';

import { ToolBadge } from '@flamingo-stack/openframe-frontend-core';
import { ArrowRightUpIcon, CheckCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  type Row,
  Tag,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { normalizeToolTypeWithFallback } from '@flamingo-stack/openframe-frontend-core/utils';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { formatDateTime } from '@/lib/format-date';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { useLogs } from '../../logs-page/hooks/use-logs';
import type { LogEntry } from '../../logs-page/types/log.types';
import { onboardingHintUrl } from '../onboarding-coach-marks';

interface LogRow {
  id: string;
  logId: string;
  timestamp: string;
  status: { label: string; variant: 'success' | 'warning' | 'error' | 'grey' | 'critical' };
  toolType: ReturnType<typeof normalizeToolTypeWithFallback>;
  device: { name: string; organization: string };
  summary: string;
  original: LogEntry;
}

function severityVariant(severity: string): LogRow['status']['variant'] {
  switch (severity) {
    case 'ERROR':
      return 'error';
    case 'WARNING':
      return 'warning';
    case 'INFO':
      return 'grey';
    case 'CRITICAL':
      return 'critical';
    default:
      return 'success';
  }
}

const logDetailsUrl = (log: LogEntry): string =>
  `/log-details?id=${log.toolEventId}&ingestDay=${log.ingestDay}&toolType=${log.toolType}&eventType=${log.eventType}&timestamp=${encodeURIComponent(log.timestamp || '')}`;

/**
 * Inner body of the "Logging" onboarding step — an activity-trail preview. It pulls
 * the first three real logs ({@link ../../logs-page/hooks/use-logs}) into a compact
 * read-only table that mirrors the full logs table, then links to the logs page with
 * the coach-mark hint.
 */
export function LoggingStep({
  onComplete,
  onCompleteBackground,
  completed,
  completing,
}: {
  onComplete?: () => void;
  onCompleteBackground?: () => void;
  completed?: boolean;
  completing?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { logs, isLoading } = useLogs();

  const rows: LogRow[] = useMemo(
    () =>
      logs.slice(0, 3).map(log => ({
        id: log.toolEventId,
        logId: log.toolEventId,
        timestamp: formatDateTime(log.timestamp),
        status: { label: log.severity, variant: severityVariant(log.severity) },
        toolType: normalizeToolTypeWithFallback(log.toolType),
        device: {
          name: log.device?.hostname || log.hostname || log.deviceId || '-',
          organization: log.device?.organization || log.organizationName || '-',
        },
        summary: log.summary || 'No summary available',
        original: log,
      })),
    [logs],
  );

  const columns = useMemo<ColumnDef<LogRow>[]>(
    () => [
      {
        accessorKey: 'logId',
        header: 'Log ID',
        enableSorting: false,
        meta: { width: 'w-[160px]' },
        cell: ({ row }: { row: Row<LogRow> }) => (
          <div className="flex shrink-0 flex-col justify-center">
            <TruncateText>{row.original.timestamp}</TruncateText>
            <TruncateText variant="h6" tone="secondary">
              {row.original.logId}
            </TruncateText>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { width: 'w-[96px]' },
        cell: ({ row }: { row: Row<LogRow> }) => (
          <div className="shrink-0">
            <Tag label={row.original.status.label} variant={row.original.status.variant} />
          </div>
        ),
      },
      {
        accessorKey: 'tool',
        header: 'Tool',
        enableSorting: false,
        meta: { width: 'w-[160px]', hideAt: 'md' },
        cell: ({ row }: { row: Row<LogRow> }) => (
          <ToolBadge toolType={row.original.toolType} iconClassName="w-4 h-4 md:w-6 md:h-6" />
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        enableSorting: false,
        meta: { width: 'w-[240px]', hideAt: 'md' },
        cell: ({ row }: { row: Row<LogRow> }) => {
          const deviceName = row.original.device.name === 'null' ? 'System' : row.original.device.name;
          return (
            <div className="flex min-h-[60px] flex-col justify-center gap-1 py-2">
              {deviceName && <TruncateText>{deviceName}</TruncateText>}
              {row.original.device.organization && (
                <TruncateText variant="h6" tone="secondary">
                  {row.original.device.organization}
                </TruncateText>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Log Details',
        enableSorting: false,
        meta: { width: 'flex-1', hideAt: 'lg' },
        cell: ({ row }: { row: Row<LogRow> }) => (
          <TruncateText lines={2} className="text-h6 text-ods-text-secondary">
            {row.original.summary}
          </TruncateText>
        ),
      },
      {
        id: 'open',
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', hideAt: 'md', align: 'right' },
        cell: ({ row }: { row: Row<LogRow> }) => (
          <div data-no-row-click className="pointer-events-auto flex items-center justify-end">
            <Button
              onClick={openInNewTab(logDetailsUrl(row.original.original))}
              variant="outline"
              size="icon"
              leftIcon={<ArrowRightUpIcon className="h-5 w-5" />}
              aria-label="Open log in new tab"
              className="bg-ods-card"
            />
          </div>
        ),
      },
    ],
    [],
  );

  const table = useDataTable<LogRow>({
    data: rows,
    columns,
    getRowId: (row: LogRow) => row.id,
    enableSorting: false,
  });

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      <p className="text-h4 text-ods-text-primary">
        Logs give you a full activity trail across your workspace. See what happened, when, and who did it: device
        actions, script runs, ticket changes, and team activity. Nothing goes off the record.
      </p>
      <p className="text-h4 text-ods-text-primary">Here's what activity looks like once things start happening:</p>

      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={3}
          emptyMessage="No activity yet. Actions across your workspace will show up here."
          rowClassName="mb-1"
        />
      </DataTable>

      {/* Footer: Mark as Complete + View Logs */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <div className="hidden flex-1 md:block" />
        <div className="hidden flex-1 md:block" />
        {!completed ? (
          <Button
            variant="outline"
            leftIcon={<CheckCircleIcon className="size-5" />}
            onClick={() => onComplete?.()}
            loading={completing}
            disabled={completing}
            className="w-full md:flex-1"
          >
            Mark as Complete
          </Button>
        ) : (
          // Keep the completed step's primary button its own width — don't let it
          // stretch into the removed "Mark as Complete" slot.
          <div className="hidden md:block md:flex-1" aria-hidden />
        )}
        <Button
          variant="accent"
          onClick={() => {
            // Opening Logs from onboarding completes the step in the background
            // (if not already done) — no spinner, navigation is the feedback.
            if (!completed) onCompleteBackground?.();
            router.push(onboardingHintUrl('/logs-page', 'logs', pathname));
          }}
          className="w-full md:flex-1"
        >
          View Logs
        </Button>
      </div>
    </div>
  );
}
