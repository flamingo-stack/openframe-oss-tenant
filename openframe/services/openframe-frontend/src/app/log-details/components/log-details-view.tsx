'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button, StatusTag } from '@flamingo/ui-kit/components/ui'
import { CopyIcon } from '@flamingo/ui-kit/components/icons'
import { DeviceInfoSection } from './device-info-section'
import { FullInformationSection } from './full-information-section'
import { DetailsSection } from './details-section'
import { useLogDetails } from '../hooks/use-log-details'

interface LogDetailsViewProps {
  logId: string
  ingestDay: string
  toolType: string
  eventType: string
  timestamp: string
}

const getSeverityVariant = (severity: string): 'success' | 'warning' | 'error' | 'info' | 'critical' => {
  switch (severity?.toUpperCase()) {
    case 'ERROR':
      return 'error'
    case 'WARNING':
      return 'warning'
    case 'INFO':
      return 'info'
    case 'CRITICAL':
      return 'critical'
    case 'DEBUG':
    default:
      return 'info'
  }
}

export function LogDetailsView({ logId, ingestDay, toolType, eventType, timestamp }: LogDetailsViewProps) {
  const router = useRouter()
  const { logDetails, isLoading, error, fetchLogDetailsByID } = useLogDetails()

  useEffect(() => {
    if (logId && ingestDay && toolType && eventType && timestamp) {
      fetchLogDetailsByID(logId, ingestDay, toolType, eventType, timestamp)
    } else {
      router.replace('/logs-page')
    }
  }, [logId, ingestDay, toolType, eventType, timestamp, fetchLogDetailsByID, router])

  const handleBackToLogs = () => {
    router.push('/logs-page')
  }

  const handleCopyLogDetails = () => {
    if (logDetails) {
      // Copy log details to clipboard
      const details = `Log ID: ${logDetails.toolEventId}\nStatus: ${logDetails.severity}\nTimestamp: ${logDetails.timestamp}\nTool Type: ${logDetails.toolType}\nEvent Type: ${logDetails.eventType}\nMessage: ${logDetails.message || 'No message available'}\nDetails: ${logDetails.details || 'No details available'}`
      navigator.clipboard.writeText(details)
      console.log('Log details copied to clipboard')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3a3a3a] border-t-[#ffc008]" />
          <div className="text-sm text-[#888888]">Loading log details...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !logDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-center">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] text-[#fafafa] mb-2">
            Log Not Found
          </h2>
          <p className="text-[#888888] mb-4">
            {error || `Could not find log with ID: ${logId}`}
          </p>
          <Button
            onClick={handleBackToLogs}
            className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Logs
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Section */}
      <div className="flex items-end justify-between gap-4 pt-6">
        <div className="flex flex-col gap-2 flex-1">
          {/* Back Button */}
          <button
            onClick={handleBackToLogs}
            className="flex items-center gap-2 p-3 rounded-[6px] hover:bg-[#2a2a2a] transition-colors self-start"
          >
            <ChevronLeft className="h-6 w-6 text-[#888888]" />
            <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#888888]">
              Back to Logs
            </span>
          </button>

          {/* Page Title */}
          <h1 className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[40px] tracking-[-0.64px] text-[#fafafa]">
            Log Details
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 items-center">
          <Button
            onClick={handleCopyLogDetails}
            leftIcon={<CopyIcon size={24} />}
            className="bg-[#212121] border border-[#3a3a3a] hover:bg-[#2a2a2a] text-[#fafafa] px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
          >  
            Copy Log Details
          </Button>
        </div>
      </div>

      {/* Status and Timestamp */}
      <div className="flex gap-2 items-center">
        <StatusTag label={logDetails.severity} variant={getSeverityVariant(logDetails.severity)} />
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa]">
          {new Date(logDetails.timestamp).toLocaleString()}
        </span>
      </div>

      {/* Log Summary Card */}
      <div className="bg-[#212121] border border-[#3a3a3a] rounded-[8px] w-full">
        <div className="flex flex-col gap-4 items-center h-20 px-4 py-0 border-b border-[#3a3a3a]">
          <div className="flex gap-2 items-center h-20 w-full overflow-hidden">
            <div className="flex flex-col flex-1 justify-center">
              <div className="flex gap-1 items-center w-full">
                <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-[#fafafa] overflow-hidden text-ellipsis whitespace-nowrap">
                  {logDetails.message || 'No message available'}
                </div>
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-[#888888] h-5 w-full overflow-hidden text-ellipsis">
                {logDetails.toolType} • {logDetails.eventType}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Device Info Section */}
      <DeviceInfoSection deviceId={logDetails.deviceId} userId={logDetails.userId} />

      {/* Full Information Section */}
      <FullInformationSection logDetails={logDetails} />

      {/* Details Section */}
      <DetailsSection logDetails={logDetails} />
    </div>
  )
}