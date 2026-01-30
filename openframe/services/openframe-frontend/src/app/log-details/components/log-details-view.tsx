'use client'

import { ToolBadge } from '@flamingo-stack/openframe-frontend-core/components'
import { CopyIcon } from '@flamingo-stack/openframe-frontend-core/components/icons'
import { Button, DetailLoader, DetailPageContainer, StatusTag } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { normalizeToolTypeWithFallback } from '@flamingo-stack/openframe-frontend-core/utils'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DeviceInfoSection } from '../../components/shared'
import { useLogDetails } from '../hooks/use-log-details'
import { DetailsSection } from './details-section'
import { FullInformationSection } from './full-information-section'

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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
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

  const customHeaderContent = (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 w-full">
      <div className="flex flex-col gap-2 flex-1">
        {/* Back Button */}
        <Button
          onClick={handleBackToLogs}
          variant="ghost"
          className="flex items-center gap-2 p-3 rounded-[6px] hover:bg-ods-bg-hover transition-colors self-start justify-start"
          leftIcon={<ChevronLeft className="h-6 w-6 text-ods-text-secondary" />}
        >
          <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-secondary">
            Back to Logs
          </span>
        </Button>

        {/* Title */}
        <h1 className="font-['Azeret_Mono'] font-semibold text-[32px] leading-[40px] tracking-[-0.64px] text-ods-text-primary">
          Log Details
        </h1>
      </div>

      {/* Header Actions - Full width on mobile, side-by-side on desktop */}
      <div className="w-full md:w-auto">
        <Button
          onClick={handleCopyLogDetails}
          leftIcon={<CopyIcon size={24} />}
          className="w-full bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px] tracking-[-0.36px] flex items-center justify-center gap-2"
        >
          Copy Log Details
        </Button>
      </div>
    </div>
  )

  return (
    <DetailPageContainer
      headerContent={customHeaderContent}
      padding="none"
      className="pt-6"
    >
      <div className="flex flex-col gap-6 w-full">
        {/* Status and Timestamp */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
          <StatusTag label={logDetails.severity} variant={getSeverityVariant(logDetails.severity)} />
          <span className="font-['DM_Sans'] font-medium text-[16px] sm:text-[18px] leading-[22px] sm:leading-[24px] text-ods-text-primary">
            {new Date(logDetails.timestamp).toLocaleString()}
          </span>
        </div>

        {/* Log Summary Card */}
        <div className="bg-ods-card border border-ods-border rounded-[8px] w-full">
          <div className="flex flex-col gap-4 items-start p-4 sm:p-6">
            <div className="flex flex-col gap-2 w-full">
              <div className="font-['DM_Sans'] font-medium text-[16px] sm:text-[18px] leading-[22px] sm:leading-[24px] text-ods-text-primary break-words">
                {logDetails.message || 'No message available'}
              </div>
              <div className="flex items-center gap-2 font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">
                <ToolBadge toolType={normalizeToolTypeWithFallback(logDetails.toolType)} />
                <span>•</span>
                <span>{logDetails.eventType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Device Info Section */}
        {logDetails.deviceId && (
          <DeviceInfoSection
            deviceId={logDetails.deviceId}
            userId={logDetails.userId}
            device={logDetails.device}
          />
        )}

        {/* Full Information Section */}
        <FullInformationSection logDetails={logDetails} />

        {/* Details Section */}
        <DetailsSection logDetails={logDetails} />
      </div>
    </DetailPageContainer>
  )
}