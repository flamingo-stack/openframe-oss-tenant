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
    <div className="flex flex-col gap-1 items-start w-full">
      {/* Section Title */}
      <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-[#888888] w-full">
        Details
      </div>

      {/* Details Card */}
      <div className="bg-[#212121] border border-[#3a3a3a] rounded-[6px] flex flex-col gap-3 items-start p-4 w-full">
        <pre className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] overflow-hidden w-full whitespace-pre-wrap break-words">
          {formattedJson}
        </pre>
      </div>
    </div>
  )
}