'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button, StatusTag, DetailPageContainer, DetailLoader } from '@flamingo/ui-kit/components/ui'
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
    return <DetailLoader />
  }

  // Error state
  if (error || !logDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-center">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] text-ods-text-primary mb-2">
            Log Not Found
          </h2>
          <p className="text-ods-text-secondary mb-4">
            {error || `Could not find log with ID: ${logId}`}
          </p>
          <Button
            onClick={handleBackToLogs}
            className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Back to Logs
          </Button>
        </div>
      </div>
    )
  }

  const headerActions = (
    <>
      <Button
        onClick={handleCopyLogDetails}
        leftIcon={<CopyIcon size={24} />}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center gap-2"
      >  
        Copy Log Details
      </Button>
    </>
  )

  return (
    <DetailPageContainer
      title="Log Details"
      backButton={{
        label: 'Back to Logs',
        onClick: handleBackToLogs
      }}
      headerActions={headerActions}
    >
      {/* Status and Timestamp */}
      <div className="flex gap-2 items-center">
        <StatusTag label={logDetails.severity} variant={getSeverityVariant(logDetails.severity)} />
        <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary">
          {new Date(logDetails.timestamp).toLocaleString()}
        </span>
      </div>

      {/* Log Summary Card */}
      <div className="bg-ods-card border border-ods-border rounded-[8px] w-full">
        <div className="flex flex-col gap-4 items-center h-20 px-4 py-0 border-b border-ods-border">
          <div className="flex gap-2 items-center h-20 w-full overflow-hidden">
            <div className="flex flex-col flex-1 justify-center">
              <div className="flex gap-1 items-center w-full">
                <div className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary overflow-hidden text-ellipsis whitespace-nowrap">
                  {logDetails.message || 'No message available'}
                </div>
              </div>
              <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary h-5 w-full overflow-hidden text-ellipsis">
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
    </DetailPageContainer>
  )
}