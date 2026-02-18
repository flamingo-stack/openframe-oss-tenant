'use client'

import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components'
import { formatScheduleDate, getRepeatLabel } from '../types/script-schedule.types'
import type { ScriptScheduleDetail } from '../types/script-schedule.types'

interface ScheduleInfoBarProps {
  schedule: ScriptScheduleDetail
}

export function ScheduleInfoBar({ schedule }: ScheduleInfoBarProps) {
  const { date, time } = formatScheduleDate(schedule.run_time_date)
  const repeat = getRepeatLabel(schedule)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 bg-ods-card border border-ods-border rounded-[6px] overflow-clip w-full">
      <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px] border-b md:border-b-0 border-ods-border">
        <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
          {date}
        </span>
        <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
          Date
        </span>
      </div>
      <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px] border-b md:border-b-0 border-ods-border">
        <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
          {time}
        </span>
        <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
          Time
        </span>
      </div>
      <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
        <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
          {repeat}
        </span>
        <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
          Repeat
        </span>
      </div>
      <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
        <OSTypeBadgeGroup
          osTypes={schedule.task_supported_platforms}
          iconSize="w-5 h-5"
        />
        <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
          Supported Platform
        </span>
      </div>
    </div>
  )
}

interface ScheduleInfoBarFromDataProps {
  name: string
  note?: string
  date: string
  time: string
  repeat: string
  platforms: string[]
}

export function ScheduleInfoBarFromData({
  name,
  note,
  date,
  time,
  repeat,
  platforms,
}: ScheduleInfoBarFromDataProps) {
  return (
    <div className="flex flex-col gap-0 bg-ods-card border border-ods-border rounded-[6px] overflow-clip w-full">
      <div className="grid grid-cols-2 border-b border-ods-border">
        <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
          <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {name}
          </span>
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
            Schedule Name
          </span>
        </div>
        <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
          <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {note || '—'}
          </span>
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
            Note
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4">
        <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px] border-b md:border-b-0 border-ods-border">
          <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {date}
          </span>
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
            Date
          </span>
        </div>
        <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px] border-b md:border-b-0 border-ods-border">
          <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {time}
          </span>
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
            Time
          </span>
        </div>
        <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
          <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {repeat}
          </span>
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
            Repeat
          </span>
        </div>
        <div className="flex flex-col items-start justify-center min-w-0 px-4 py-3 md:py-0 md:h-[80px]">
          <OSTypeBadgeGroup osTypes={platforms} iconSize="w-5 h-5" />
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary">
            Supported Platform
          </span>
        </div>
      </div>
    </div>
  )
}
