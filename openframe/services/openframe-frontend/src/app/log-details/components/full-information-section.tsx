'use client'

import React from 'react'
import { InfoRow, ToolIcon } from '@flamingo/ui-kit'
import { toUiKitToolType, toStandardToolLabel } from '@lib/tool-labels'

interface LogEntry {
  toolEventId: string
  eventType: string
  ingestDay: string
  toolType: string
  severity: string
  userId?: string
  deviceId?: string
  message?: string
  timestamp: string
  details?: string
  __typename?: string
}

interface FullInformationSectionProps {
  logDetails?: LogEntry | null
}

export function FullInformationSection({ logDetails }: FullInformationSectionProps) {
  const getToolIcon = (toolType: string) => {
    return <ToolIcon toolType={toUiKitToolType(toolType) as any} size={16} />
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toISOString()
    } catch {
      return timestamp
    }
  }

  if (!logDetails) {
    return (
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
          Full Information
        </div>
        <div className="bg-ods-card border border-ods-border rounded-[6px] flex flex-col gap-3 items-center justify-center p-8 w-full">
          <div className="text-ods-text-secondary text-center">
            No log details available
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Section Title */}
      <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
        Full Information
      </div>

      {/* Info Card */}
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full">
        <div className="flex flex-col divide-y divide-ods-border">
          <div className="p-4 sm:p-6">
            <InfoRow label="toolEventId" value={logDetails.toolEventId} />
          </div>
          <div className="p-4 sm:p-6">
            <InfoRow label="ingestDay" value={logDetails.ingestDay} />
          </div>
          <div className="p-4 sm:p-6">
            <InfoRow
              label="toolType"
              value={toStandardToolLabel(logDetails.toolType)}
              icon={getToolIcon(logDetails.toolType)}
            />
          </div>
          <div className="p-4 sm:p-6">
            <InfoRow label="eventType" value={logDetails.eventType} />
          </div>
          <div className="p-4 sm:p-6">
            <InfoRow label="severity" value={logDetails.severity} />
          </div>
          {logDetails.userId && (
            <div className="p-4 sm:p-6">
              <InfoRow label="userId" value={logDetails.userId} />
            </div>
          )}
          {logDetails.deviceId && (
            <div className="p-4 sm:p-6">
              <InfoRow label="deviceId" value={logDetails.deviceId} />
            </div>
          )}
          <div className="p-4 sm:p-6">
            <InfoRow label="timestamp" value={formatTimestamp(logDetails.timestamp)} />
          </div>
        </div>
      </div>
    </div>
  )
}