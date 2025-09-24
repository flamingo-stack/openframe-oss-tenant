'use client'

import React from 'react'

// Dot icon component
const DotIcon = () => (
  <div className="relative size-6">
    <div className="absolute inset-[37.5%] bg-text-secondary rounded-full" />
  </div>
)

// Fleet MDM icon component
const FleetMDMIcon = () => (
  <div className="relative size-4">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.33" y="1.33" width="3.34" height="3.34" className="fill-text-secondary"/>
      <rect x="6.33" y="1.33" width="3.34" height="3.34" className="fill-text-secondary"/>
      <rect x="11.33" y="1.33" width="3.34" height="3.34" className="fill-text-secondary"/>
      <rect x="1.33" y="6.33" width="3.34" height="3.34" className="fill-text-secondary"/>
      <rect x="6.33" y="6.33" width="3.34" height="3.34" className="fill-text-secondary"/>
      <rect x="1.33" y="11.33" width="3.34" height="3.34" className="fill-text-secondary"/>
    </svg>
  </div>
)

// MeshCentral icon component (simplified placeholder)
const MeshCentralIcon = () => (
  <div className="relative size-4 bg-text-secondary rounded-[4px]" />
)

// Tactical RMM icon component (simplified placeholder)
const TacticalRMMIcon = () => (
  <div className="relative size-4 bg-text-secondary rounded-[2px]" />
)

interface LogCardProps {
  title: string
  timestamp: string
  icon: React.ReactNode
  isLast?: boolean
}

function LogCard({ title, timestamp, icon, isLast = false }: LogCardProps) {
  return (
    <div className="flex gap-2 items-start p-1 rounded-[6px] w-full relative">
      <DotIcon />
      <div className="flex flex-col flex-1 justify-start min-w-0">
        <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-primary overflow-hidden text-ellipsis whitespace-nowrap min-w-full">
          {title}
        </div>
        <div className="flex gap-1 items-center">
          <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
            {timestamp}
          </div>
          {icon}
        </div>
      </div>
      {!isLast && (
        <div className="absolute bg-ods-bg-surface w-0.5 h-8 left-[15px] bottom-[-12px]" />
      )}
    </div>
  )
}

export function RelatedLogsSection() {
  // Mock data. TODO: use API
  const relatedLogs = [
    {
      title: "Policy violation: Antivirus not running",
      timestamp: "2025/07/12,22:27",
      icon: <FleetMDMIcon />
    },
    {
      title: "Suspicious file access: C:\\Windows\\System32\\evil.exe",
      timestamp: "2025/07/12,22:27",
      icon: <MeshCentralIcon />
    },
    {
      title: "Security check failed: Malware scan timeout",
      timestamp: "2025/07/12,22:27",
      icon: <TacticalRMMIcon />
    },
    {
      title: "Multiple policy failures detected",
      timestamp: "2025/07/12,22:27",
      icon: <FleetMDMIcon />
    },
    {
      title: "Unusual network activity detected",
      timestamp: "2025/07/12,22:27",
      icon: <MeshCentralIcon />
    },
    {
      title: "Network isolation initiated",
      timestamp: "2025/07/12,22:27",
      icon: <MeshCentralIcon />
    },
    {
      title: "Error Log",
      timestamp: "2025/07/12,22:27",
      icon: <FleetMDMIcon />
    },
    {
      title: "Warning Log",
      timestamp: "2025/07/12,22:27",
      icon: <TacticalRMMIcon />
    }
  ]

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0 self-stretch">
      {/* Section Title */}
      <div className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
        Related Logs
      </div>

      {/* Related Logs Card */}
      <div className="bg-ods-card border border-ods-border rounded-[6px] flex-1 min-h-0 w-full">
        <div className="flex flex-col gap-4 items-start overflow-clip px-4 py-3 size-full">
          {relatedLogs.map((log, index) => (
            <LogCard
              key={index}
              title={log.title}
              timestamp={log.timestamp}
              icon={log.icon}
              isLast={index === relatedLogs.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}