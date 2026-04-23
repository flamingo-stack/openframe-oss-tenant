'use client';

import { DetailPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

// --- Reusable helpers ---

/** Section heading — matches `h3.text-h5.text-ods-text-secondary.mb-4` (20px line-height → h-5) */
function SectionHeadingSkeleton({ width = 'w-24' }: { width?: string }) {
  return <Skeleton className={`h-5 ${width} mb-4`} />;
}

/**
 * InfoCard skeleton — matches the real InfoCard from core library:
 * - Container: bg-ods-card border rounded-[6px] p-4 flex flex-col
 * - Title wrapper: flex flex-col justify-center shrink-0 mb-3 > flex items-center gap-2
 * - Subtitle: text-h4 mb-3
 * - Items container: flex flex-col gap-2
 * - Each item row: flex gap-2 items-center w-full (label + h-px divider + value)
 * - Progress: thin bar at bottom
 */
function InfoCardSkeleton({
  itemCount = 2,
  showProgress = false,
  showSubtitle = false,
  className = '',
}: {
  itemCount?: number;
  showProgress?: boolean;
  showSubtitle?: boolean;
  className?: string;
}) {
  return (
    <div className={`bg-ods-card border border-ods-border rounded-[6px] p-4 flex flex-col ${className}`}>
      {/* Title + Icon row */}
      <div className="flex flex-col justify-center shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-32 flex-1" />
          <Skeleton className="h-4 w-4 rounded-full shrink-0" />
        </div>
      </div>

      {/* Subtitle */}
      {showSubtitle && <Skeleton className="h-6 w-48 mb-3" />}

      {/* Items */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="flex gap-2 items-center w-full">
            <Skeleton className="h-6 w-28 shrink-0" />
            <div className="flex-1 h-px bg-ods-border" />
            <Skeleton className="h-6 w-20 shrink-0" />
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
 * - Header: flex items-center gap-4 px-4 py-3 (column labels h-4)
 * - Rows: rounded-[6px] bg-ods-card border, h-[clamp(72px,5vw,88px)], mb-1 between rows
 */
function TableSkeleton({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1 w-full">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-[6px] bg-ods-card border border-ods-border overflow-hidden">
            <div className="flex items-center gap-4 px-4 h-[clamp(72px,5vw,88px)]">
              {Array.from({ length: columns }).map((_, j) => (
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

/** Matches DeviceInfoSection: value is base text (16px → ~h-5), label is text-xs (12px → h-3) with mt-1 */
function InfoFieldSkeleton({ valueWidth = 'w-32' }: { valueWidth?: string }) {
  return (
    <div>
      <Skeleton className={`h-5 ${valueWidth} mb-1`} />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Matches DeviceInfoSection: bg-ods-card rounded-lg p-6, three 4-col grids separated by dividers, mb-6 / pt-4 */
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

/** Matches DeviceStatusAndTags: `flex gap-2 items-center flex-wrap py-4` with Tag pills (h-8) */
function StatusAndTagsSkeleton() {
  return (
    <div className="flex gap-2 items-center flex-wrap py-4">
      <Skeleton className="h-8 w-20 rounded-[6px]" />
      <Skeleton className="h-8 w-16 rounded-[6px]" />
      <Skeleton className="h-8 w-24 rounded-[6px]" />
    </div>
  );
}

/**
 * TabNavigation skeleton — matches the real `h-14 border-b` container and
 * each tab's internal `p-4 gap-1` icon+label layout.
 */
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
    <div className="relative w-full h-14 border-b border-ods-border">
      <div className="flex gap-1 items-center justify-start h-full overflow-x-auto">
        {tabWidths.map((w, i) => (
          <div key={i} className={`flex gap-1 items-center justify-center p-4 shrink-0 h-14 ${w}`}>
            <Skeleton className="h-6 w-6 rounded-[4px] shrink-0" />
            <Skeleton className="h-4 flex-1 min-w-0" />
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
      {/* DISK INFO — grid-cols-1 lg:grid-cols-4 gap-6 */}
      <div>
        <SectionHeadingSkeleton width="w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <InfoCardSkeleton itemCount={4} showProgress showSubtitle />
          <InfoCardSkeleton itemCount={4} showProgress showSubtitle />
          <InfoCardSkeleton itemCount={4} showProgress showSubtitle />
          <InfoCardSkeleton itemCount={4} showProgress showSubtitle />
        </div>
      </div>
      {/* RAM INFO — grid-cols-1 lg:grid-cols-3 gap-6 */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={1} showSubtitle />
        </div>
      </div>
      {/* CPU — grid-cols-1 lg:grid-cols-4 gap-6 */}
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
      {/* Public IP — single full-width card */}
      <InfoCardSkeleton itemCount={1} />
      {/* Local IPv4 + IPv6 — grid-cols-1 lg:grid-cols-2 gap-4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCardSkeleton itemCount={3} />
        <InfoCardSkeleton itemCount={3} />
      </div>
    </div>
  );
}

function SecurityTabSkeleton() {
  return (
    <div className="mt-6">
      {/* SECURITY POSTURE — 3 cards lg:grid-cols-3 */}
      <div>
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={2} />
          <InfoCardSkeleton itemCount={4} />
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* USER SESSIONS — 1 card lg:grid-cols-3 */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={4} />
        </div>
      </div>
      {/* SECURITY AGENTS — 3 cards lg:grid-cols-3 */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={2} />
          <InfoCardSkeleton itemCount={2} />
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* NETWORK SECURITY — 1 card lg:grid-cols-3 */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={3} />
        </div>
      </div>
      {/* ALERT CONFIGURATION — 2 cards lg:grid-cols-3 */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-44" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={4} />
          <InfoCardSkeleton itemCount={2} />
        </div>
      </div>
      {/* SYSTEM BOOT INFORMATION — 1 card lg:grid-cols-3 */}
      <div className="pt-6">
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
      {/* PATCH MANAGEMENT — 1 card lg:grid-cols-3 */}
      <div>
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={3} />
        </div>
      </div>
      {/* POLICY COMPLIANCE — 2 cards lg:grid-cols-3 */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCardSkeleton itemCount={4} />
          <InfoCardSkeleton itemCount={1} />
        </div>
      </div>
      {/* COMPLIANCE CHECKS — 1 card lg:grid-cols-4 */}
      <div className="pt-6">
        <SectionHeadingSkeleton width="w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <InfoCardSkeleton itemCount={4} showSubtitle />
        </div>
      </div>
    </div>
  );
}

/**
 * AgentsTab card — real markup:
 *   <div className="relative flex flex-col">
 *     <div className="absolute top-4 left-4 z-10"><ToolBadge /></div>
 *     <div className="absolute top-4 right-4 z-10"><InfoIcon /></div>
 *     <InfoCard className="pt-16 flex-1 min-h-0" items={...} />
 *   </div>
 */
function AgentsTabSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="relative flex flex-col">
          {/* ToolBadge — absolute top-4 left-4 */}
          <div className="absolute top-4 left-4 z-10">
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
          {/* Info icon — absolute top-4 right-4 */}
          <div className="absolute top-4 right-4 z-10">
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          {/* Card body — matches real InfoCard with pt-16 override */}
          <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 pt-16 flex flex-col flex-1 min-h-0">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center w-full">
                <Skeleton className="h-6 w-14 shrink-0" />
                <div className="flex-1 h-px bg-ods-border" />
                <Skeleton className="h-6 w-20 shrink-0" />
              </div>
              <div className="flex gap-2 items-center w-full">
                <Skeleton className="h-6 w-20 shrink-0" />
                <div className="flex-1 h-px bg-ods-border" />
                <Skeleton className="h-6 w-36 shrink-0" />
              </div>
              <div className="flex gap-2 items-center w-full">
                <Skeleton className="h-6 w-8 shrink-0" />
                <div className="flex-1 h-px bg-ods-border" />
                <Skeleton className="h-6 w-40 shrink-0" />
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
      {/* CURRENTLY LOGGED IN — 1 full-width card (no grid) */}
      <div>
        <SectionHeadingSkeleton width="w-44" />
        <InfoCardSkeleton itemCount={3} showSubtitle />
      </div>
      {/* ALL SYSTEM USERS — lg:grid-cols-3 */}
      <div>
        <SectionHeadingSkeleton width="w-48" />
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
      {/* Title "Installed Software (N)" — text-h5 → h-5 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-56" />
      </div>
      <TableSkeleton columns={4} rows={8} />
    </div>
  );
}

function VulnerabilitiesTabSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      {/* Title + severity counts row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <TableSkeleton columns={5} rows={8} />
    </div>
  );
}

function LogsTabSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {/* Title — "LOGS (N)" */}
      <Skeleton className="h-5 w-24" />
      {/* Search + refresh row — matches LogsTable embedded: flex gap-4 items-stretch h-[48px] */}
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
          {/* Left: back button + title + subtitle — mirrors DetailPageContainer variant="detail" */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {/* Back button — Button.ghost-subtle h-12 !px-0, hidden md:flex with ChevronLeft(24) + label */}
            <div className="self-start hidden md:flex items-center gap-1 h-12">
              <Skeleton className="h-6 w-6 shrink-0 rounded-[4px]" />
              <Skeleton className="h-5 w-28" />
            </div>
            {/* Title — h1.text-h2 (mobile 24/32 → h-8, md+ 32/40 → h-10) */}
            <Skeleton className="h-8 md:h-10 w-64 md:w-80" />
            {/* Subtitle — "Updated X ago" text-[16px] leading-6 */}
            <Skeleton className="h-6 w-40" />
          </div>
          {/* Right: actions — mirrors PageActions "menu-primary" variant */}
          <div className="flex gap-2 items-center shrink-0">
            {/* Desktop: menu (h-12 w-12) + primary (h-12) — order matches MenuPrimaryVariant */}
            <div className="hidden md:flex items-center gap-2">
              <Skeleton className="h-12 w-12 rounded-[6px]" />
              <Skeleton className="h-12 w-[180px] rounded-[6px]" />
            </div>
            {/* Mobile: single "..." menu icon */}
            <div className="flex md:hidden">
              <Skeleton className="h-11 w-11 rounded-[6px]" />
            </div>
          </div>
        </div>
      }
      padding="none"
    >
      {/* Status + tag pills row — matches DeviceStatusAndTags */}
      <StatusAndTagsSkeleton />

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
