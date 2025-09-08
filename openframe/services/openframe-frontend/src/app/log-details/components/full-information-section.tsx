'use client'

import React from 'react'

// Fleet MDM icon component
const FleetMDMIcon = () => (
  <div className="relative size-4">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.33" y="1.33" width="3.34" height="3.34" fill="#888888"/>
      <rect x="6.33" y="1.33" width="3.34" height="3.34" fill="#888888"/>
      <rect x="11.33" y="1.33" width="3.34" height="3.34" fill="#888888"/>
      <rect x="1.33" y="6.33" width="3.34" height="3.34" fill="#888888"/>
      <rect x="6.33" y="6.33" width="3.34" height="3.34" fill="#888888"/>
      <rect x="1.33" y="11.33" width="3.34" height="3.34" fill="#888888"/>
    </svg>
  </div>
)

interface InfoRowProps {
  label: string
  value: string
  icon?: React.ReactNode
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <div className="flex gap-2 items-center w-full">
      <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] overflow-hidden text-ellipsis whitespace-nowrap">
        {label}
      </div>
      <div className="flex-1 bg-[#3a3a3a] h-px min-h-px min-w-px" />
      <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1">
        {value}
        {icon}
      </div>
    </div>
  )
}

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
  // Helper function to get tool icon based on toolType
  const getToolIcon = (toolType: string) => {
    const type = toolType.toLowerCase()
    if (type.includes('fleet') || type.includes('mdm')) {
      return <FleetMDMIcon />
    }
    // Add more tool icons as needed
    return undefined
  }

  // Helper function to format timestamp
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
        <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-[#888888] w-full">
          Full Information
        </div>
        <div className="bg-[#212121] border border-[#3a3a3a] rounded-[6px] flex flex-col gap-3 items-center justify-center p-8 w-full">
          <div className="text-[#888888] text-center">
            No log details available
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      {/* Section Title */}
      <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-[#888888] w-full">
        Full Information
      </div>

      {/* Info Card */}
      <div className="bg-[#212121] border border-[#3a3a3a] rounded-[6px] flex flex-col gap-3 items-start p-4 w-full">
        <InfoRow label="toolEventId" value={logDetails.toolEventId} />
        <InfoRow label="ingestDay" value={logDetails.ingestDay} />
        <InfoRow 
          label="toolType" 
          value={logDetails.toolType} 
          icon={getToolIcon(logDetails.toolType)} 
        />
        <InfoRow label="eventType" value={logDetails.eventType} />
        <InfoRow label="severity" value={logDetails.severity} />
        {logDetails.userId && (
          <InfoRow label="userId" value={logDetails.userId} />
        )}
        {logDetails.deviceId && (
          <InfoRow label="deviceId" value={logDetails.deviceId} />
        )}
        <InfoRow label="timestamp" value={formatTimestamp(logDetails.timestamp)} />
      </div>
    </div>
  )
}