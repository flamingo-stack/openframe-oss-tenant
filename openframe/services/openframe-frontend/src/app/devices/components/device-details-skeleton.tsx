'use client';

import { DetailPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

// --- Reusable helpers ---

/** Section heading: matches font-['Azeret_Mono'] text-[14px] leading-[20px] → h-5 (20px) */
function SectionHeadingSkeleton({ width = 'w-24' }: { width?: string }) {
  return <Skeleton className={`h-5 ${width} mb-4`} />;
}

/**
 * InfoCard skeleton — matches the real InfoCard from core library:
 * - Container: bg-[#212121] border rounded-[6px] p-4 flex flex-col
 * - Title: text-[18px] leading-[24px] → h-6
 * - Subtitle: text-[18px] leading-[24px] → h-6
 * - Items: text-[18px] leading-[24px] → h-5 (slightly less than line-height for visual balance)
 * - Divider: h-px between label and value
 * - Progress: thin bar at bottom
 */
function InfoCardSkeleton({
  itemCount = 2,
  showProgress = false,
  showSubtitle = false,
}: {
  itemCount?: number;
  showProgress?: boolean;
  showSubtitle?: boolean;
}) {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-6 flex flex-col">
      {/* Title + Icon — matches: flex flex-col justify-center shrink-0 mb-3 > flex items-center gap-2 */}
      <div className="flex flex-col justify-center shrink-0 mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-4 rounded-full shrink-0" />
        </div>
      </div>

      {/* Subtitle — matches: text-[18px] leading-[24px] mb-3 */}
      {showSubtitle && <Skeleton className="h-6 w-48 mb-3" />}

      {/* Items — matches: flex flex-col gap-2 > flex gap-2 items-center w-full */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton items
          <div key={i} className="flex gap-2 items-center w-full">
            <Skeleton className="h-5 w-28 shrink-0" />
            <div className="flex-1 h-px bg-ods-border" />
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {showProgress && <Skeleton className="h-1.5 w-full mt-3 rounded-full" />}
    </div>
  );
}

/**
 * Table skeleton — matches the real Table from core library:
 * - Header: flex items-center gap-4 px-4 py-3, labels text-[12px] leading-[16px] → h-4
 * - Rows: rounded-[6px] bg-[#212121] border, h-[clamp(72px,5vw,88px)]
 * - Cells: text-[18px] leading-[24px] → h-5
 * - Body gap: gap-2
 */
function TableSkeleton({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton columns
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2 w-full">
        {Array.from({ length: rows }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
          <div key={i} className="rounded-[6px] bg-ods-card border border-ods-border overflow-hidden">
            <div className="flex items-center gap-4 px-4 h-[clamp(72px,5vw,88px)]">
              {Array.from({ length: columns }).map((_, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
                <Skeleton key={j} className="h-5 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Device info section field skeleton ---

/** Matches DeviceInfoSection: value is base text (16px) → h-5, label is text-xs (12px) → h-3 */
function InfoFieldSkeleton({ valueWidth = 'w-32' }: { valueWidth?: string }) {
  return (
    <div>
      <Skeleton className={`h-5 ${valueWidth} mb-1`} />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// --- Device info section skeleton (3 rows x 4 columns) ---

function DeviceInfoSectionSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-lg p-7">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-9">
        <InfoFieldSkeleton valueWidth="w-24" />
        <InfoFieldSkeleton valueWidth="w-40" />
        <InfoFieldSkeleton valueWidth="w-28" />
        <InfoFieldSkeleton valueWidth="w-48" />
      </div>
      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-4 gap-6 mb-9">
        <InfoFieldSkeleton valueWidth="w-24" />
        <InfoFieldSkeleton valueWidth="w-20" />
        <InfoFieldSkeleton valueWidth="w-44" />
        <InfoFieldSkeleton valueWidth="w-44" />
      </div>
      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-4 gap-9">
        <InfoFieldSkeleton valueWidth="w-52" />
        <InfoFieldSkeleton valueWidth="w-10" />
        <InfoFieldSkeleton valueWidth="w-56" />
        <InfoFieldSkeleton valueWidth="w-24" />
      </div>
    </div>
  );
}

// --- Tab navigation skeleton ---

function TabNavigationSkeleton() {
  const tabWidths = [
    'w-[110px]',
    'w-[100px]',
    'w-[100px]',
    'w-[120px]',
    'w-[90px]',
    'w-[80px]',
    'w-[100px]',
    'w-[140px]',
    'w-[80px]',
  ];
  return (
    <div className="flex gap-1 border-b border-ods-border overflow-hidden">
      {tabWidths.map((w, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton tabs
        <Skeleton key={i} className={`h-14 ${w} rounded-t-md`} />
      ))}
    </div>
  );
}

// --- Tab-specific skeletons ---

function HardwareTabSkeleton() {
  return (
    <div className="mt-6">
      {/* Disk Info */}
      <div>
        <SectionHeadingSkeleton width="w-20" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <InfoCardSkeleton itemCount={4} showProgress showSubtitle />
          <InfoCardSkeleton itemCount={4} showProgress showSubtitle />
          <InfoCardSkeleton itemCount={4} showProgress showSubtitle />
          <InfoCardSkeleton itemCount={4} showProgress showSubtitle />
        </div>
      </div>
      {/* RAM Info */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-20" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* CPU */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-10" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <InfoCardSkeleton itemCount={3} />
        </div>
      </div>
    </div>
  );
}

function NetworkTabSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <InfoCardSkeleton itemCount={1} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCardSkeleton itemCount={7} />
        <InfoCardSkeleton itemCount={7} />
      </div>
    </div>
  );
}

function SecurityTabSkeleton() {
  return (
    <div className="mt-6">
      {/* Security Posture */}
      <div>
        <SectionHeadingSkeleton width="w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={2} />
          <InfoCardSkeleton itemCount={4} />
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* User Sessions */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-28" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={4} />
        </div>
      </div>
      {/* Security Agents */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={2} />
          <InfoCardSkeleton itemCount={2} />
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* Network Security */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={3} />
        </div>
      </div>
      {/* Alert Configuration */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={4} />
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* System Boot */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={3} />
        </div>
      </div>
    </div>
  );
}

function ComplianceTabSkeleton() {
  return (
    <div className="mt-6">
      {/* Patch Management */}
      <div>
        <SectionHeadingSkeleton width="w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={3} />
        </div>
      </div>
      {/* Policy Compliance */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={4} />
          <InfoCardSkeleton itemCount={1} />
        </div>
      </div>
      {/* Compliance Checks */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <InfoCardSkeleton itemCount={4} showSubtitle />
        </div>
      </div>
    </div>
  );
}

function AgentsTabSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
      {Array.from({ length: 6 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton items
        <div key={i} className="bg-ods-card border border-ods-border rounded-[6px] p-4 pt-7 flex flex-col">
          <Skeleton className="h-6 w-24 rounded-full mb-6" />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center w-full">
              <Skeleton className="h-5 w-8 shrink-0" />
              <div className="flex-1 h-px bg-ods-border" />
              <Skeleton className="h-5 w-40 shrink-0" />
            </div>
            <div className="flex gap-2 items-center w-full">
              <Skeleton className="h-5 w-16 shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTabSkeleton() {
  return (
    <div className="space-y-6 mt-6">
      {/* Currently Logged In */}
      <div>
        <SectionHeadingSkeleton width="w-36" />
        <InfoCardSkeleton itemCount={3} showSubtitle />
      </div>
      {/* All System Users */}
      <div>
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={3} showSubtitle />
          <InfoCardSkeleton itemCount={3} showSubtitle />
          <InfoCardSkeleton itemCount={3} showSubtitle />
        </div>
      </div>
    </div>
  );
}

function SoftwareTabSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <Skeleton className="h-5 w-48" />
      <TableSkeleton columns={4} rows={8} />
    </div>
  );
}

function VulnerabilitiesTabSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <TableSkeleton columns={5} rows={8} />
    </div>
  );
}

function LogsTabSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      {/* Title — matches: "LOGS (10)" heading */}
      <Skeleton className="h-5 w-24" />

      {/* Search + Refresh row — matches: flex gap-4 items-stretch h-[48px] */}
      <div className="flex gap-4 items-stretch h-[48px]">
        <Skeleton className="flex-1 h-[48px] rounded-[6px]" />
        <Skeleton className="w-[120px] h-[48px] rounded-[6px] shrink-0" />
      </div>

      <TableSkeleton columns={4} rows={10} />
    </div>
  );
}

// --- Tab skeleton resolver ---

function getTabSkeleton(activeTab: string) {
  switch (activeTab) {
    case 'hardware':
      return <HardwareTabSkeleton />;
    case 'network':
      return <NetworkTabSkeleton />;
    case 'security':
      return <SecurityTabSkeleton />;
    case 'compliance':
      return <ComplianceTabSkeleton />;
    case 'agents':
      return <AgentsTabSkeleton />;
    case 'users':
      return <UsersTabSkeleton />;
    case 'software':
      return <SoftwareTabSkeleton />;
    case 'vulnerabilities':
      return <VulnerabilitiesTabSkeleton />;
    case 'logs':
      return <LogsTabSkeleton />;
    default:
      return <HardwareTabSkeleton />;
  }
}

// --- Main skeleton ---

interface DeviceDetailsSkeletonProps {
  activeTab?: string;
}

export function DeviceDetailsSkeleton({ activeTab = 'hardware' }: DeviceDetailsSkeletonProps) {
  return (
    <DetailPageContainer
      headerContent={
        <div className="flex items-end justify-between md:flex-col md:items-start md:justify-start lg:flex-row lg:items-end lg:justify-between gap-4 w-full">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <Skeleton className="h-12 w-36" />
            <Skeleton className="h-9 w-48 sm:h-10 sm:w-56" />
            <div className="flex gap-3 items-center">
              <Skeleton className="h-8 w-16 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-12 w-[260px] rounded-[6px]" />
            <Skeleton className="h-12 w-[240px] rounded-[6px]" />
            <Skeleton className="h-12 w-[240px] rounded-[6px]" />
            <Skeleton className="h-12 w-[90px] rounded-[6px]" />
          </div>
        </div>
      }
      padding="none"
    >
      <div className="flex-1 overflow-auto">
        <DeviceInfoSectionSkeleton />
        <div className="mt-6">
          <TabNavigationSkeleton />
          {getTabSkeleton(activeTab)}
        </div>
      </div>
    </DetailPageContainer>
  );
}
