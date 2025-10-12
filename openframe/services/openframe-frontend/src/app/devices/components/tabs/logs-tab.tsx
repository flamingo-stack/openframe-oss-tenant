'use client'

import React from 'react'
import { LogsTable } from '../../../logs-page/components/logs-table'

interface LogsTabProps {
  device: any
}

export function LogsTab({ device }: LogsTabProps) {
  // Use machineId as the primary device identifier for filtering logs
  const deviceId = device?.machineId || device?.id

  if (!deviceId) {
    return (
      <div className="space-y-4 mt-6">
        <div className="p-4 bg-ods-card border border-ods-border rounded-[6px] text-ods-text-secondary font-['DM_Sans'] text-[14px]">
          No device ID available to filter logs.
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <LogsTable deviceId={deviceId} embedded={true} />
    </div>
  )
}
