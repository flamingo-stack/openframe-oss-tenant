'use client'

import React from 'react'
import type { LogEntry } from '../../logs-page/stores/logs-store'

interface DetailsSectionProps {
  logDetails: LogEntry
}

export function DetailsSection({ logDetails }: DetailsSectionProps) {
  // Parse details JSON if available, otherwise show structured log data
  let detailsData
  try {
    detailsData = logDetails.details ? JSON.parse(logDetails.details) : {
      toolEventId: logDetails.toolEventId,
      eventType: logDetails.eventType,
      toolType: logDetails.toolType,
      severity: logDetails.severity,
      userId: logDetails.userId,
      deviceId: logDetails.deviceId,
      timestamp: logDetails.timestamp,
      ingestDay: logDetails.ingestDay,
      message: logDetails.message
    }
  } catch (error) {
    // If details is not valid JSON, create a structured object
    detailsData = {
      toolEventId: logDetails.toolEventId,
      eventType: logDetails.eventType,
      toolType: logDetails.toolType,
      severity: logDetails.severity,
      userId: logDetails.userId,
      deviceId: logDetails.deviceId,
      timestamp: logDetails.timestamp,
      ingestDay: logDetails.ingestDay,
      message: logDetails.message,
      rawDetails: logDetails.details
    }
  }

  const formattedJson = JSON.stringify(detailsData, null, 2)

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Section Title */}
      <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
        Details
      </div>

      {/* Details Card */}
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full">
        <div className="p-4 sm:p-6">
          <div className="w-full overflow-x-auto">
            <pre className="font-['DM_Sans'] font-medium text-[14px] sm:text-[16px] leading-[20px] sm:leading-[22px] text-ods-text-primary whitespace-pre-wrap break-words min-w-0">
              {formattedJson}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}