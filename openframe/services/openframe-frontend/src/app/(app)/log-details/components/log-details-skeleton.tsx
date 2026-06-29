'use client';

import { PageLayout, Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { DeviceInfoSectionSkeleton } from '@/app/components/shared/device-info-section-skeleton';

interface LogDetailsSkeletonProps {
  onBack: () => void;
}

function StatusTimestampSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
      <Skeleton className="h-6 w-14 rounded-[4px]" />
      <Skeleton className="h-5 md:h-6 w-40" />
    </div>
  );
}

function LogSummaryCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[8px] w-full">
      <div className="flex flex-col gap-4 items-start p-4 md:p-6">
        <div className="flex flex-col gap-2 w-full">
          <Skeleton className="h-5 md:h-6 w-2/3 max-w-[480px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-[4px]" />
            <Skeleton className="h-1 w-1 rounded-full" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceInfoSkeleton() {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="text-h5 text-ods-text-secondary w-full">Device Info</div>
      <DeviceInfoSectionSkeleton />
    </div>
  );
}

const FULL_INFO_ROWS: Array<{ labelWidth: string; valueWidth: string }> = [
  { labelWidth: 'w-24', valueWidth: 'w-[260px]' },
  { labelWidth: 'w-20', valueWidth: 'w-24' },
  { labelWidth: 'w-16', valueWidth: 'w-16' },
  { labelWidth: 'w-20', valueWidth: 'w-36' },
  { labelWidth: 'w-16', valueWidth: 'w-12' },
  { labelWidth: 'w-16', valueWidth: 'w-[260px]' },
  { labelWidth: 'w-20', valueWidth: 'w-[210px]' },
];

function FullInformationSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="h-5 w-32" />
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full">
        <div className="flex flex-col divide-y divide-ods-border">
          {FULL_INFO_ROWS.map(({ labelWidth, valueWidth }, i) => (
            <div key={i} className="p-4 md:p-6">
              <div className="flex gap-2 items-center w-full">
                <Skeleton className={`h-5 ${labelWidth} shrink-0`} />
                <div className="flex-1 h-px bg-ods-border min-h-px min-w-px" />
                <Skeleton className={`h-5 ${valueWidth} max-w-[60%] shrink-0`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DETAILS_LINE_WIDTHS = [
  'w-2',
  'w-24',
  'w-20',
  'w-28',
  'w-24',
  'w-20',
  'w-16',
  'w-20',
  'w-16',
  'w-20',
  'w-24',
  'w-28',
  'w-32',
  'w-8',
  'w-32',
  'w-4',
  'w-2',
];

function DetailsSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="h-5 w-20" />
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full">
        <div className="p-4 md:p-6">
          <div className="flex flex-col gap-2">
            {DETAILS_LINE_WIDTHS.map((width, i) => (
              <Skeleton
                key={i}
                className={`h-4 ${width}`}
                style={{ marginLeft: i === 0 || i === DETAILS_LINE_WIDTHS.length - 1 ? 0 : 16 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LogDetailsSkeleton({ onBack }: LogDetailsSkeletonProps) {
  return (
    <PageLayout
      title="Log Details"
      backButton={{ label: 'Back', onClick: onBack }}
      selector={<Skeleton className="h-12 w-[180px] rounded-[6px]" />}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col gap-6 w-full">
        <StatusTimestampSkeleton />
        <LogSummaryCardSkeleton />
        <DeviceInfoSkeleton />
        <FullInformationSkeleton />
        <DetailsSkeleton />
      </div>
    </PageLayout>
  );
}
