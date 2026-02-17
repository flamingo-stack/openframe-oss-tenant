'use client'

import { Table, type TableColumn } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useScheduledTasks, type ScheduledTask } from '../hooks/use-scheduled-tasks'

interface ScheduledRunsSectionProps {
  scriptId: string
}

interface ScheduledTaskRow {
  id: number
  name: string
  date: string
  time: string
  repeat: string
  devices: number
}

function formatDate(dateString: string): { date: string; time: string } {
  const date = new Date(dateString)
  const dateFormatted = date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
  const timeFormatted = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  return { date: dateFormatted, time: timeFormatted }
}

function getRepeatLabel(task: ScheduledTask): string {
  switch (task.task_type) {
    case 'daily':
      return task.daily_interval > 1 ? `${task.daily_interval} Days` : '1 Day'
    case 'weekly':
      return task.weekly_interval > 1 ? `${task.weekly_interval} Weeks` : '1 Week'
    case 'monthly':
      return 'Monthly'
    case 'runonce':
      return 'None'
    default:
      return 'None'
  }
}

export function ScheduledRunsSection({ scriptId }: ScheduledRunsSectionProps) {
  const router = useRouter()
  const { scheduledTasks, isLoading, error } = useScheduledTasks(scriptId)

  const tableData: ScheduledTaskRow[] = useMemo(() => {
    return scheduledTasks.map((task) => {
      const { date, time } = formatDate(task.run_time_date)
      return {
        id: task.id,
        name: task.name,
        date,
        time,
        repeat: getRepeatLabel(task),
        devices: 1,
      }
    })
  }, [scheduledTasks])

  const columns: TableColumn<ScheduledTaskRow>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Note',
      renderCell: (row) => (
        <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary overflow-hidden whitespace-nowrap text-ellipsis">
          {row.name}
        </span>
      ),
    },
    {
      key: 'date',
      label: 'Date & Time',
      renderCell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary">
            {row.date}
          </span>
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
            {row.time}
          </span>
        </div>
      ),
    },
    {
      key: 'repeat',
      label: 'Repeat',
      renderCell: (row) => (
        <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary">
          {row.repeat}
        </span>
      ),
    },
    {
      key: 'devices',
      label: 'Devices',
      renderCell: (row) => (
        <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary">
          {row.devices}
        </span>
      ),
    },
  ], [])

  if (error) {
    return (
      <div className="mt-6">
        <h2 className="font-semibold leading-10 text-[32px] text-ods-text-primary tracking-tight pb-2">
          Scheduled Runs
        </h2>
        <div className="flex items-center justify-center h-32 bg-ods-card border border-ods-border rounded-md">
          <p className="text-ods-text-secondary">Failed to load scheduled tasks</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h2 className="font-semibold leading-10 text-[32px] text-ods-text-primary tracking-tight pb-2">
        Scheduled Runs
      </h2>

      <Table
        data={tableData}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={3}
        emptyMessage="No scheduled runs for this script"
        showFilters={false}
      />
    </div>
  )
}
