'use client';

import { ToolBadge } from '@flamingo-stack/openframe-frontend-core/components';
import { CheckIcon, Copy02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, PageLayout, Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { normalizeToolTypeWithFallback } from '@flamingo-stack/openframe-frontend-core/utils';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DeviceInfoSection } from '@/app/components/shared';
import { useCopyToClipboard } from '@/app/hooks/use-copy-to-clipboard';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { formatDateTime } from '@/lib/format-date';
import { routes } from '@/lib/routes';
import { formatLogDetailsForCopy } from '../../logs-page/utils/format-log-details';
import { useLogDetails } from '../hooks/use-log-details';
import { DetailsSection } from './details-section';
import { FullInformationSection } from './full-information-section';
import { LogDetailsSkeleton } from './log-details-skeleton';

interface LogDetailsViewProps {
  logId: string;
  ingestDay: string;
  toolType: string;
  eventType: string;
  timestamp: string;
}

const getSeverityVariant = (severity: string): 'success' | 'warning' | 'error' | 'grey' | 'critical' => {
  switch (severity?.toUpperCase()) {
    case 'ERROR':
      return 'error';
    case 'WARNING':
      return 'warning';
    case 'INFO':
      return 'grey';
    case 'CRITICAL':
      return 'critical';
    case 'DEBUG':
    default:
      return 'grey';
  }
};

export function LogDetailsView({ logId, ingestDay, toolType, eventType, timestamp }: LogDetailsViewProps) {
  const router = useRouter();
  const { logDetails, isLoading, error, fetchLogDetailsById } = useLogDetails();
  const { copy, copied } = useCopyToClipboard({
    successDescription: 'Log details copied to clipboard',
    errorDescription: 'Unable to copy log details',
  });

  useEffect(() => {
    if (logId && ingestDay && toolType && eventType && timestamp) {
      fetchLogDetailsById(logId, ingestDay, toolType, eventType, timestamp);
    } else {
      router.replace(routes.logs.page);
    }
  }, [logId, ingestDay, toolType, eventType, timestamp, fetchLogDetailsById, router]);

  const handleBackToLogs = useSafeBack(routes.logs.page);

  const handleCopyLogDetails = () => {
    if (logDetails) {
      copy(formatLogDetailsForCopy(logDetails));
    }
  };

  // Loading state
  if (isLoading) {
    return <LogDetailsSkeleton onBack={handleBackToLogs} />;
  }

  // Error state
  if (error || !logDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] text-ods-text-primary mb-2">
            Log Not Found
          </h2>
          <p className="text-ods-text-secondary mb-4">{error || `Could not find log with ID: ${logId}`}</p>
          <Button
            onClick={handleBackToLogs}
            className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[16px]"
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      title="Log Details"
      backButton={{
        label: 'Back',
        onClick: handleBackToLogs,
      }}
      actions={[
        {
          label: 'Copy Log Details',
          onClick: handleCopyLogDetails,
          variant: 'outline' as const,
          icon: copied ? (
            <CheckIcon className="w-6 h-6 text-[var(--ods-attention-green-success)]" />
          ) : (
            <Copy02Icon className="w-6 h-6" />
          ),
        },
      ]}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col gap-6 w-full">
        {/* Status and Timestamp */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
          <Tag label={logDetails.severity} variant={getSeverityVariant(logDetails.severity)} />
          <span className="font-['DM_Sans'] font-medium text-[16px] md:text-[18px] leading-[22px] md:leading-[24px] text-ods-text-primary">
            {formatDateTime(logDetails.timestamp)}
          </span>
        </div>

        {/* Log Summary Card */}
        <div className="bg-ods-card border border-ods-border rounded-[8px] w-full">
          <div className="flex flex-col gap-4 items-start p-4 md:p-6">
            <div className="flex flex-col gap-2 w-full">
              <div className="font-['DM_Sans'] font-medium text-[16px] md:text-[18px] leading-[22px] md:leading-[24px] text-ods-text-primary break-words">
                {logDetails.message || 'No message available'}
              </div>
              <div className="flex items-center gap-2 text-h6 text-ods-text-secondary">
                <ToolBadge toolType={normalizeToolTypeWithFallback(logDetails.toolType)} />
                <span>•</span>
                <span>{logDetails.eventType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Device Info Section */}
        {logDetails.deviceId && (
          <DeviceInfoSection deviceId={logDetails.deviceId} userId={logDetails.userId} device={logDetails.device} />
        )}

        {/* Full Information Section */}
        <FullInformationSection logDetails={logDetails} />

        {/* Details Section */}
        <DetailsSection logDetails={logDetails} />
      </div>
    </PageLayout>
  );
}
