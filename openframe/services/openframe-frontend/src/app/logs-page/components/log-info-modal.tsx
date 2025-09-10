'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { DeviceCard, Button, StatusTag } from '@flamingo/ui-kit/components/ui'
import { cn } from '@flamingo/ui-kit/utils'

interface LogInfoModalProps {
  isOpen: boolean
  onClose: () => void
  log: {
    id: string
    logId: string
    timestamp: string
    status: {
      label: string
      variant?: 'success' | 'warning' | 'error' | 'info' | 'critical'
    }
    source: {
      name: string
      icon?: React.ReactNode
    }
    device: {
      name: string
      organization?: string
    }
    description: {
      title: string
      details?: string
    }
    // Additional details for modal
    user?: string
    network?: string
    rawData?: any
    // Store original LogEntry for API calls
    originalLogEntry?: any
  } | null
  fetchLogDetails: (logEntry: any) => Promise<any>
}

interface DetailedLogData {
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


// Info field component
const InfoField = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888888]">
      {label}
    </span>
    <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa]">
      {value}
    </span>
  </div>
)

export function LogInfoModal({ isOpen, onClose, log, fetchLogDetails }: LogInfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [detailedLogData, setDetailedLogData] = useState<DetailedLogData | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Fetch detailed log data when modal opens
  useEffect(() => {
    if (isOpen && log && log.originalLogEntry) {
      const logEntry = log.originalLogEntry
      
      // Validate required fields before making API call
      if (!logEntry.toolEventId || !logEntry.ingestDay || !logEntry.toolType || !logEntry.eventType || !logEntry.timestamp) {
        console.error('Missing required fields for fetchLogDetails:', {
          toolEventId: logEntry.toolEventId,
          ingestDay: logEntry.ingestDay,
          toolType: logEntry.toolType,
          eventType: logEntry.eventType,
          timestamp: logEntry.timestamp
        })
        setDetailedLogData(null)
        return
      }

      setIsLoadingDetails(true)
      setDetailedLogData(null)
      
      fetchLogDetails(logEntry)
        .then((data) => {
          setDetailedLogData(data)
        })
        .catch((error) => {
          console.error('Failed to fetch log details:', error)
        })
        .finally(() => {
          setIsLoadingDetails(false)
        })
    } else {
      setDetailedLogData(null)
    }
  }, [isOpen, log, fetchLogDetails])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      // Small delay to prevent immediate close on open click
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen || !log) return null

  // Parse raw data for display - use detailed data if available
  const rawDataDisplay = detailedLogData?.details 
    ? (typeof detailedLogData.details === 'object' 
        ? JSON.stringify(detailedLogData.details, null, 2)
        : detailedLogData.details)
    : log.rawData 
    ? JSON.stringify(log.rawData, null, 2)
    : '{}'

  // Use detailed data when available, otherwise fall back to basic log data
  const displayData = detailedLogData || {
    toolEventId: log.logId,
    message: log.description.title,
    details: log.description.details,
    severity: log.status.label,
    toolType: log.source.name,
    userId: log.user,
    deviceId: log.device.name,
    timestamp: log.timestamp
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-[1000] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Modal Panel - slides in from right */}
      <div
        ref={modalRef}
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-[480px] bg-[#212121] z-[1001] flex flex-col",
          "transform transition-transform duration-300 ease-in-out",
          "border-l border-[#3a3a3a]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#212121] p-4 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-['DM_Sans'] font-bold text-[20px] leading-[28px] text-[#fafafa] mb-2">
                {displayData.message || log.description.title}
              </h2>
              <div className="flex items-center gap-2">
                <StatusTag label={displayData.severity || log.status.label} variant={log.status.variant} />
                <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888888]">
                  {displayData.timestamp || log.timestamp}
                </span>
                {isLoadingDetails && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#888888] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[12px] text-[#888888]">Loading details...</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-[#2a2a2a] h-8 w-8"
            >
              <X className="h-4 w-4 text-[#888888]" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 p-4 space-y-6 overflow-y-auto min-h-0">
            {/* Description */}
            {(displayData.message || log.description.details) && (
              <p className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888888]">
                {displayData.message || log.description.details}
              </p>
            )}

            {/* Log Details Section */}
            <div className="p-4 bg-[#212121] border border-[#3a3a3a] rounded-[6px] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Log ID" value={displayData.toolEventId || log.logId} />
                <InfoField label="User" value={displayData.userId || log.user || "null"} />
                <InfoField label="Source" value={
                  <div className="flex items-center gap-1">
                    <span>{displayData.toolType || log.source.name}</span>
                    {log.source.icon}
                  </div>
                } />
                <InfoField label="Device" value={displayData.deviceId || log.device.name} />
                {detailedLogData?.eventType && (
                  <InfoField label="Event Type" value={detailedLogData.eventType} />
                )}
                {detailedLogData?.ingestDay && (
                  <InfoField label="Ingest Day" value={detailedLogData.ingestDay} />
                )}
              </div>
            </div>

            {/* Raw Data Section */}
            <pre className="font-['Azeret_Mono'] text-[12px] leading-[16px] text-[#888888] p-4 bg-[#161616] rounded border border-[#3a3a3a] whitespace-pre-wrap break-words overflow-wrap-break-word">
              {rawDataDisplay}
            </pre>
          </div>

          {/* Device Card Section - Fixed at bottom */}
          <div className="p-4 bg-[#212121]">
            <DeviceCard
              deviceName={log.device.name || "Anthony's Device"}
              organization={log.device.organization || "Northbridge Legal Group"}
              status={{ label: 'ACTIVE', variant: 'active' }}
              lastSeen={log.timestamp}
              operatingSystem="windows"
              tags={['REMOTE', 'WINDOWS', 'TEST-DEVICE']}
              onMoreClick={() => console.log('Device more clicked')}
            />
          </div>
        </div>
      </div>
    </>
  )
}