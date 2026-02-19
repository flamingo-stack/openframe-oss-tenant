'use client'

import { LoadError, StatusTag, OSTypeBadge } from '@flamingo-stack/openframe-frontend-core'
import { PenEditIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import { Button, Table, type TableColumn } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useScriptScheduleAgents } from '../hooks/use-script-schedule'
import type { ScriptScheduleAgent, ScriptScheduleDetail } from '../types/script-schedule.types'

interface ScheduleDevicesTabProps {
  schedule: ScriptScheduleDetail
  scheduleId: string
}

export function ScheduleDevicesTab({ schedule, scheduleId }: ScheduleDevicesTabProps) {
  const router = useRouter()
  const { agents, isLoading, error } = useScriptScheduleAgents(scheduleId)

  const columns: TableColumn<ScriptScheduleAgent>[] = useMemo(
    () => [
      {
        key: 'device',
        label: 'DEVICE',
        renderCell: (agent) => (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary">
                {agent.hostname}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'organization',
        label: 'ORGANIZATION',
        hideAt: 'sm' as const,
        renderCell: (agent) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary">
              {agent.client_name}
            </span>
          </div>
        ),
      },
      {
        key: 'details',
        label: 'DETAILS',
        hideAt: 'md' as const,
        renderCell: (agent) => (
           <OSTypeBadge osType={agent.plat} />
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        width: 'w-[100px]',
        renderCell: () => (
          <StatusTag label="ACTIVE" variant="success" className="px-2 py-1 text-[12px]" />
        ),
      },
    ],
    [],
  )

  if (error) {
    return <LoadError message={`Failed to load assigned devices: ${error}`} />
  }

  const handleEditDevices = () => {
    router.push(`/scripts/schedules/${scheduleId}/devices`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleEditDevices}
          leftIcon={<PenEditIcon size={18} />}
        >
          Edit Devices
        </Button>
      </div>
      <Table
        data={agents}
        columns={columns}
        rowKey="agent_id"
        loading={isLoading}
        skeletonRows={5}
        emptyMessage="No devices assigned to this schedule"
        showFilters={false}
      />
      {agents.length > 0 && (
        <div className="text-right text-[14px] text-ods-text-secondary">
          Showing {agents.length} results
        </div>
      )}
    </div>
  )
}
