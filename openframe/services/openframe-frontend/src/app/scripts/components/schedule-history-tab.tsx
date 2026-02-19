'use client'

import { LoadError, StatusTag } from '@flamingo-stack/openframe-frontend-core'
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  type TableColumn,
} from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useCallback, useMemo, useState } from 'react'
import { useScriptScheduleHistory } from '../hooks/use-script-schedule'
import type { ScriptScheduleDetail, ScriptScheduleHistoryEntry } from '../types/script-schedule.types'

interface ScheduleHistoryTabProps {
  schedule: ScriptScheduleDetail
  scheduleId: string
}

function getStatusVariant(status: string): 'success' | 'error' | 'warning' | 'info' {
  switch (status) {
    case 'passing':
      return 'success'
    case 'failing':
      return 'error'
    default:
      return 'info'
  }
}

function getStatusLabel(entry: ScriptScheduleHistoryEntry): string {
  if (entry.retcode === 0) return 'OK'
  if (entry.status === 'failing') return 'FAILING'
  return entry.status.toUpperCase()
}

function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate)
  return (
    d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
  )
}

const InfoField = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">
      {label}
    </span>
    <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary break-all">
      {value || '—'}
    </span>
  </div>
)

// ─── Drawer ────────────────────────────────────────────────────────

interface ScheduleHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  entry: ScriptScheduleHistoryEntry | null
}

function ScheduleHistoryDrawer({ isOpen, onClose, entry }: ScheduleHistoryDrawerProps) {
  return (
    <Sheet open={isOpen && !!entry} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        className="w-full max-w-[480px] bg-ods-card border-l border-ods-border p-0 flex flex-col gap-0"
      >
        {entry && (
          <>
            {/* Header */}
            <SheetHeader className="sticky top-0 bg-ods-card p-4 pr-12 z-10 space-y-2">
              <SheetTitle className="font-['DM_Sans'] font-bold text-[20px] leading-[28px] text-ods-text-primary">
                LOG-{String(entry.id).padStart(3, '0')}
              </SheetTitle>
              <SheetDescription asChild>
                <div className="flex items-center gap-2">
                  <StatusTag
                    label={getStatusLabel(entry)}
                    variant={getStatusVariant(entry.status)}
                  />
                  <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">
                    {entry.last_run ? formatDateTime(entry.last_run) : '—'}
                  </span>
                </div>
              </SheetDescription>
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 p-4 space-y-6 overflow-y-auto min-h-0">
              {/* Details Grid */}
              <div className="p-4 bg-ods-card border border-ods-border rounded-[6px] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Status" value={getStatusLabel(entry)} />
                  <InfoField label="Return Code" value={String(entry.retcode)} />
                  <InfoField label="Device" value={entry.agent_hostname} />
                  <InfoField label="Organization" value={entry.organization} />
                  <InfoField label="Platform" value={entry.agent_platform} />
                  <InfoField label="Execution Time" value={`${entry.execution_time}s`} />
                  <InfoField label="Agent ID" value={entry.agent_id} />
                  <InfoField label="Sync Status" value={entry.sync_status.replace('_', ' ')} />
                </div>
              </div>

              {/* stdout */}
              <div className="flex flex-col gap-2">
                <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">
                  stdout
                </span>
                <pre className="font-['Azeret_Mono'] text-[12px] leading-[16px] text-ods-text-secondary p-4 bg-ods-bg rounded border border-ods-border whitespace-pre-wrap break-words">
                  {entry.stdout || 'No output'}
                </pre>
              </div>

              {/* stderr */}
              {entry.stderr && (
                <div className="flex flex-col gap-2">
                  <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-attention-red-error">
                    stderr
                  </span>
                  <pre className="font-['Azeret_Mono'] text-[12px] leading-[16px] text-ods-text-secondary p-4 bg-ods-bg rounded border border-ods-attention-red-error/30 whitespace-pre-wrap break-words">
                    {entry.stderr}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Tab ───────────────────────────────────────────────────────────

export function ScheduleHistoryTab({ schedule, scheduleId }: ScheduleHistoryTabProps) {
  const [offset, setOffset] = useState(0)
  const [selectedEntry, setSelectedEntry] = useState<ScriptScheduleHistoryEntry | null>(null)
  const limit = 50

  const { history, total, isLoading, error } = useScriptScheduleHistory(scheduleId, {
    limit,
    offset,
  })

  const handleNextPage = useCallback(() => {
    if (offset + limit < total) {
      setOffset((prev) => prev + limit)
    }
  }, [offset, limit, total])

  const handlePrevPage = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - limit))
  }, [limit])

  const handleRowClick = useCallback((entry: ScriptScheduleHistoryEntry) => {
    setSelectedEntry(entry)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setSelectedEntry(null)
  }, [])

  const columns: TableColumn<ScriptScheduleHistoryEntry>[] = useMemo(
    () => [
      {
        key: 'log_id',
        label: 'LOG ID',
        width: 'w-[160px]',
        renderCell: (entry) => (
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
        renderCell: (entry) => (
          <StatusTag
            label={getStatusLabel(entry)}
            variant={getStatusVariant(entry.status)}
            className="px-2 py-1 text-[12px]"
          />
        ),
      },
      {
        key: 'device',
        label: 'DEVICE',
        hideAt: 'sm' as const,
        renderCell: (entry) => (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary">
                {entry.agent_hostname}
              </span>
              <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
                {entry.organization}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'details',
        label: 'LOG DETAILS',
        hideAt: 'md' as const,
        renderCell: (entry) => (
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
  )

  if (error) {
    return <LoadError message={`Failed to load execution history: ${error}`} />
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

      <ScheduleHistoryDrawer
        isOpen={!!selectedEntry}
        onClose={handleCloseDrawer}
        entry={selectedEntry}
      />
    </div>
  )
}
