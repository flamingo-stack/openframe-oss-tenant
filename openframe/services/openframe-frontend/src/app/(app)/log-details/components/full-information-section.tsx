'use client';

import type { InfoCardData } from '@flamingo-stack/openframe-frontend-core';
import { InfoCard, ToolIcon } from '@flamingo-stack/openframe-frontend-core';
import { normalizeToolTypeWithFallback, toToolLabel } from '@flamingo-stack/openframe-frontend-core/utils';
import { formatDateTime } from '@/lib/format-date';

interface LogEntry {
  toolEventId: string;
  eventType: string;
  ingestDay: string;
  toolType: string;
  severity: string;
  userId?: string;
  deviceId?: string;
  message?: string;
  timestamp: string;
  details?: string;
}

interface FullInformationSectionProps {
  logDetails?: LogEntry | null;
}

export function FullInformationSection({ logDetails }: FullInformationSectionProps) {
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDateTime(timestamp);
    } catch {
      return timestamp;
    }
  };

  if (!logDetails) {
    return (
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="text-h5 text-ods-text-secondary w-full">Full Information</div>
        <div className="bg-ods-card border border-ods-border rounded-[6px] flex flex-col gap-3 items-center justify-center p-8 w-full">
          <div className="text-ods-text-secondary text-center">No log details available</div>
        </div>
      </div>
    );
  }

  const items: InfoCardData['items'] = [
    { label: 'toolEventId', value: logDetails.toolEventId },
    { label: 'ingestDay', value: logDetails.ingestDay },
    {
      label: 'toolType',
      value: toToolLabel(logDetails.toolType),
      icon: <ToolIcon toolType={normalizeToolTypeWithFallback(logDetails.toolType)} size={16} />,
    },
    { label: 'eventType', value: logDetails.eventType },
    { label: 'severity', value: logDetails.severity },
    ...(logDetails.userId ? [{ label: 'userId', value: logDetails.userId }] : []),
    ...(logDetails.deviceId ? [{ label: 'deviceId', value: logDetails.deviceId }] : []),
    { label: 'timestamp', value: formatTimestamp(logDetails.timestamp) },
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Section Title */}
      <div className="text-h5 text-ods-text-secondary w-full">Full Information</div>

      {/* Info Card */}
      <InfoCard data={{ items }} />
    </div>
  );
}
