'use client'

import { LoadError, StatusTag } from '@flamingo-stack/openframe-frontend-core'
import { Button, Table, type TableColumn } from '@flamingo-stack/openframe-frontend-core/components/ui'
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

export function ScheduleHistoryTab({ schedule, scheduleId }: ScheduleHistoryTabProps) {
  const [offset, setOffset] = useState(0)
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
                  }) +
                  ',' +
                  new Date(entry.last_run).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
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
    </div>
  )
}
