'use client';

import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

// --- Reusable helpers ---

/** Section heading — matches `h3.text-h5.text-ods-text-secondary.mb-4`. */
function SectionHeadingSkeleton({ width = 'w-24' }: { width?: string }) {
  return <Skeleton className={`h-5 ${width} mb-4`} />;
}

/**
 * InfoCard skeleton — matches the real InfoCard from the core library:
 *   bg-ods-card border rounded-[6px] p-4 flex flex-col
 *   Title (text-h4, mb-3) + optional subtitle (text-h4, mb-3)
 *   Items (flex flex-col gap-2) each: label, flex-1 divider, value
 *   Optional progress bar at the bottom.
 */
function InfoCardSkeleton({
  itemCount = 2,
  showProgress = false,
  showSubtitle = false,
  showTitle = true,
  className = '',
}: {
  itemCount?: number;
  showProgress?: boolean;
  showSubtitle?: boolean;
  showTitle?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-ods-card border border-ods-border rounded-[6px] p-4 flex flex-col ${className}`}>
      {showTitle && (
        <div className="flex flex-col justify-center shrink-0 mb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
          </div>
        </div>
      )}
      {showSubtitle && <Skeleton className="h-5 w-40 mb-3" />}
      <div className="flex flex-col gap-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="flex gap-2 items-center w-full">
            <Skeleton className="h-5 w-24 shrink-0" />
            <div className="flex-1 h-px bg-ods-border" />
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        ))}
      </div>
      {showProgress && <Skeleton className="h-1.5 w-full mt-3 rounded-full" />}
    </div>
  );
}

/**
 * Table skeleton — matches the real Table from the core library:
 *   Container: flex flex-col gap-1 w-full
 *   Header: flex items-center gap-4 px-4 py-3
 *   Rows: rounded-[6px] bg-ods-card border, desktop row height h-[clamp(72px,5vw,88px)],
 *         wrapped with gap-2 between rows.
 */
function TableSkeleton({ columns, rows = 10 }: { columns: Array<{ width: string }>; rows?: number }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-4 px-4 py-3">
        {columns.map((col, i) => (
          <div key={i} className={col.width}>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 w-full">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-[6px] bg-ods-card border border-ods-border overflow-hidden mb-1">
            <div className="flex items-center gap-4 px-4 h-[clamp(72px,5vw,88px)]">
              {columns.map((col, j) => (
                <div key={j} className={col.width}>
                  <Skeleton className="h-5 w-[80%]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Matches a DeviceInfoSection field: value (base weight, h-5) + label (text-xs, h-3). */
function InfoFieldSkeleton({ valueWidth = 'w-32' }: { valueWidth?: string }) {
  return (
    <div>
      <Skeleton className={`h-5 ${valueWidth} mb-1`} />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Matches DeviceInfoSection: p-6, three rows of 4 fields, mb-6 gap, middle/bottom rows separated by border-t. */
function DeviceInfoSectionSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <InfoFieldSkeleton valueWidth="w-24" />
        <InfoFieldSkeleton valueWidth="w-40" />
        <InfoFieldSkeleton valueWidth="w-28" />
        <InfoFieldSkeleton valueWidth="w-48" />
      </div>
      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <InfoFieldSkeleton valueWidth="w-24" />
        <InfoFieldSkeleton valueWidth="w-20" />
        <InfoFieldSkeleton valueWidth="w-44" />
        <InfoFieldSkeleton valueWidth="w-44" />
      </div>
      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
        <InfoFieldSkeleton valueWidth="w-52" />
        <InfoFieldSkeleton valueWidth="w-10" />
        <InfoFieldSkeleton valueWidth="w-56" />
        <InfoFieldSkeleton valueWidth="w-24" />
      </div>
    </div>
  );
}

/** Matches DeviceStatusAndTags: `py-4 flex gap-2 items-center flex-wrap` with a status Tag + tag chips. */
function DeviceStatusAndTagsSkeleton() {
  return (
    <div className="flex gap-2 items-center flex-wrap py-4">
      <Skeleton className="h-8 w-20 rounded-[6px]" />
      <Skeleton className="h-8 w-24 rounded-[6px]" />
      <Skeleton className="h-8 w-16 rounded-[6px]" />
    </div>
  );
}

/** Matches TabNavigation: `relative w-full h-14 border-b` with `p-4` tabs (icon h-6 w-6 + text-h4 label). */
function TabNavigationSkeleton() {
  const tabWidths = [
    'w-[120px]',
    'w-[110px]',
    'w-[110px]',
    'w-[130px]',
    'w-[100px]',
    'w-[90px]',
    'w-[110px]',
    'w-[150px]',
    'w-[90px]',
  ];
  return (
    <div className="relative w-full h-14 border-b border-ods-border">
      <div className="flex gap-1 items-center justify-start h-full overflow-hidden">
        {tabWidths.map((w, i) => (
          <div key={i} className={`flex gap-1 items-center justify-center p-4 shrink-0 h-14 ${w}`}>
            <Skeleton className="h-6 w-6 shrink-0" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Tab-specific skeletons ---

function HardwareTabSkeleton() {
  return (
    <div className="mt-6">
      {/* DISK INFO — up to 4 cards with subtitle + 4 items + progress bar */}
      <div>
        <SectionHeadingSkeleton width="w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <InfoCardSkeleton key={i} itemCount={4} showProgress showSubtitle />
          ))}
        </div>
      </div>
      {/* RAM INFO — single card with subtitle + 1 item inside a 3-col grid */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={1} showSubtitle />
          <InfoCardSkeleton itemCount={1} showSubtitle />
        </div>
      </div>
      {/* CPU — up to 4 cards with 2-3 items (no subtitle) */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-12" />
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
      {/* Full-width Public IP card */}
      <InfoCardSkeleton itemCount={1} />
      {/* Local IPv4 / IPv6 addresses — 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCardSkeleton itemCount={4} />
        <InfoCardSkeleton itemCount={4} />
      </div>
    </div>
  );
}

function SecurityTabSkeleton() {
  return (
    <div className="mt-6">
      {/* SECURITY POSTURE — 3 cards */}
      <div>
        <SectionHeadingSkeleton width="w-40" />
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={2} />
          <InfoCardSkeleton itemCount={4} />
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* USER SESSIONS — 1 card inside 3-col grid */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-32" />
        <SectionHeadingSkeleton width="w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={4} />
        </div>
      </div>
      {/* SECURITY AGENTS — 3 cards */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-36" />
        <SectionHeadingSkeleton width="w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={2} />
          <InfoCardSkeleton itemCount={2} />
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* NETWORK SECURITY — 1 card */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-40" />
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={3} />
        </div>
      </div>
      {/* ALERT CONFIGURATION — 2 cards */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-44" />
        <SectionHeadingSkeleton width="w-44" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={4} />
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* SYSTEM BOOT INFORMATION — 1 card */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-52" />
        <SectionHeadingSkeleton width="w-52" />
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
      {/* PATCH MANAGEMENT — 1 card */}
      <div>
        <SectionHeadingSkeleton width="w-40" />
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={3} />
        </div>
      </div>
      {/* POLICY COMPLIANCE — 2 cards */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-40" />
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={4} />
          <InfoCardSkeleton itemCount={1} />
        </div>
      </div>
      {/* COMPLIANCE CHECKS — 1 card (with subtitle) inside 4-col grid */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-40" />
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <InfoCardSkeleton itemCount={4} showSubtitle />
        </div>
      </div>
    </div>
  );
}

/** Matches AgentsTab: 3-col grid, each card has an absolute ToolBadge (top-left) and info icon (top-right),
 * wrapping an InfoCard with pt-16 to make room. */
function AgentsTabSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="relative flex flex-col">
          <div className="absolute top-4 left-4 z-10">
            <Skeleton className="h-6 w-24 rounded-[6px]" />
          </div>
          <div className="absolute top-4 right-4 z-10">
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 pt-16 flex flex-col flex-1">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center w-full">
                <Skeleton className="h-5 w-14 shrink-0" />
                <div className="flex-1 h-px bg-ods-border" />
                <Skeleton className="h-5 w-20 shrink-0" />
              </div>
              <div className="flex gap-2 items-center w-full">
                <Skeleton className="h-5 w-20 shrink-0" />
                <div className="flex-1 h-px bg-ods-border" />
                <Skeleton className="h-5 w-32 shrink-0" />
              </div>
              <div className="flex gap-2 items-center w-full">
                <Skeleton className="h-5 w-8 shrink-0" />
                <div className="flex-1 h-px bg-ods-border" />
                <Skeleton className="h-5 w-40 shrink-0" />
              </div>
              <div className="flex gap-2 items-center w-full">
                <Skeleton className="h-5 w-16 shrink-0" />
                <div className="flex-1 h-px bg-ods-border" />
                <Skeleton className="h-5 w-14 shrink-0" />
              </div>
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
      {/* CURRENTLY LOGGED IN — single full-width card */}
      <div>
        <SectionHeadingSkeleton width="w-44" />
        <SectionHeadingSkeleton width="w-44" />
        <InfoCardSkeleton itemCount={3} showSubtitle />
      </div>
      {/* ALL SYSTEM USERS — 3-col grid */}
      <div>
        <SectionHeadingSkeleton width="w-52" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <InfoCardSkeleton key={i} itemCount={4} showSubtitle />
          ))}
        </div>
      </div>
    </div>
  );
}

function SoftwareTabSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-52" />
      </div>
      <TableSkeleton
        columns={[{ width: 'w-[40%]' }, { width: 'w-[20%]' }, { width: 'w-[15%]' }, { width: 'w-[25%]' }]}
        rows={10}
      />
    </div>
  );
}

function VulnerabilitiesTabSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      {/* Title + severity counts row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <TableSkeleton
        columns={[
          { width: 'w-[15%]' },
          { width: 'w-[30%]' },
          { width: 'w-[15%]' },
          { width: 'w-[15%]' },
          { width: 'w-[25%]' },
        ]}
        rows={10}
      />
    </div>
  );
}

/** Matches embedded LogsTable: outer mt-6 + inner space-y-4 mt-6 with title, search/refresh row, and 4-col table. */
function LogsTabSkeleton() {
  return (
    <div className="mt-6">
      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex gap-4 items-stretch h-[48px]">
          <Skeleton className="flex-1 h-[48px] rounded-[6px]" />
          <Skeleton className="w-[120px] h-[48px] rounded-[6px] shrink-0" />
        </div>
        <TableSkeleton
          columns={[{ width: 'w-[200px]' }, { width: 'w-[120px]' }, { width: 'w-[150px]' }, { width: 'flex-1' }]}
          rows={10}
        />
      </div>
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

/** Mirrors `PageLayout` used by DeviceDetailsView: header (back button + title + actions),
 * then a content column with `gap-[var(--spacing-system-l)]` between status/tags and the
 * main content area (DeviceInfoSection + tab navigation + active tab panel). */
export function DeviceDetailsSkeleton({ activeTab = 'hardware' }: DeviceDetailsSkeletonProps) {
  return (
    <div className="flex flex-col w-full">
      {/* Header — matches PageLayout's internal header */}
      <div className="flex items-end justify-between md:flex-col md:items-start md:justify-start lg:flex-row lg:items-end lg:justify-between gap-[var(--spacing-system-m)] mb-[var(--spacing-system-l)]">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Back button (desktop only) */}
          <Skeleton className="h-10 w-36 hidden md:block" />
          {/* Title (text-h2) */}
          <Skeleton className="h-10 w-72 md:h-11 md:w-80" />
        </div>
        {/* Action buttons: menu (...) + manage files (icon) + remote control (icon) + remote shell (split) */}
        <div className="flex gap-2 items-center shrink-0">
          <Skeleton className="h-12 w-12 rounded-[6px]" />
          <Skeleton className="h-12 w-12 rounded-[6px]" />
          <Skeleton className="h-12 w-12 rounded-[6px]" />
          <Skeleton className="h-12 w-[190px] rounded-[6px]" />
        </div>
      </div>

      {/* Content column — matches PageLayout's content with gap-[var(--spacing-system-l)] */}
      <div className="flex flex-col flex-1 gap-[var(--spacing-system-l)]">
        <DeviceStatusAndTagsSkeleton />

        <div className="flex-1 overflow-auto">
          <DeviceInfoSectionSkeleton />

          <div className="mt-6">
            <TabNavigationSkeleton />
            {getTabSkeleton(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );
}
