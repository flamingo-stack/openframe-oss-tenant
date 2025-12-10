'use client'

import { Skeleton } from '@flamingo/ui-kit/components/ui'
import { isSaasTenantMode } from '@lib/app-mode'

/**
 * Dashboard loading skeleton that matches the actual dashboard layout EXACTLY:
 * - OnboardingWalkthrough: Header + 5 VERTICAL step cards
 * - DevicesOverviewSection: title + subtitle + 2 info cards
 * - ChatsOverviewSection: title + subtitle + 4 info cards (SaaS tenant only)
 * - OrganizationsOverviewSection: title + subtitle + rows of [OrgCard, 2 InfoCards]
 *
 * Used as Next.js route-level loading state for /dashboard
 */

/**
 * DashboardInfoCard skeleton - matches DashboardInfoCard exactly
 * Structure: bg-ods-card, rounded-[6px], p-4, flex gap-3 items-center
 */
function InfoCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 flex gap-3 items-center">
      {/* Content section */}
      <div className="flex-1 flex flex-col">
        {/* Title - uppercase 14px */}
        <Skeleton className="h-4 w-20 mb-1" />
        {/* Value + percentage row */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-12" /> {/* 32px number */}
          <Skeleton className="h-5 w-8" /> {/* percentage */}
        </div>
      </div>
      {/* Circular progress */}
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>
  )
}

/**
 * OnboardingStepCard skeleton - matches OnboardingStepCard exactly
 * Structure: bg-ods-card, rounded-[6px], h-[80px], flex row
 */
function OnboardingStepCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] min-h-[80px] md:h-[80px] flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 px-4 py-4 md:py-0">
      {/* Left - title and description */}
      <div className="flex-1 w-full md:w-auto min-w-0 flex flex-col justify-center gap-1">
        <Skeleton className="h-6 w-40" /> {/* title - 18px/24px line height */}
        <Skeleton className="h-5 w-64" /> {/* description - 14px/20px line height, h-[20px] explicit */}
      </div>
      {/* Right - buttons */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end shrink-0">
        <Skeleton className="h-14 w-full sm:w-[100px] rounded-[6px]" /> {/* Skip button - h-12 matches Button default */}
        <Skeleton className="h-14 w-full sm:w-[160px] rounded-[6px]" /> {/* Action button - h-12 matches Button default */}
      </div>
    </div>
  )
}

/**
 * Onboarding skeleton - matches OnboardingWalkthrough exactly
 * Structure: header row + VERTICAL list of OnboardingStepCards (NOT horizontal!)
 */
function OnboardingSkeleton() {
  return (
    <div className="w-full space-y-4">
      {/* Header - title + button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <Skeleton className="h-8 w-36" /> {/* "Get Started" title - 24px/32px line height */}
        <Skeleton className="h-12 w-full md:w-[180px] rounded-[6px]" /> {/* "Skip Onboarding" button - w-full md:w-auto matches actual Button */}
      </div>
      {/* Step cards - 5 VERTICAL cards (NOT horizontal!) */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <OnboardingStepCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * Devices skeleton - matches DevicesOverviewSection exactly
 * Structure: h2 title + p subtitle + grid of InfoCards
 */
function DevicesSkeleton() {
  return (
    <div className="space-y-4">
      {/* h2 title */}
      <Skeleton className="h-8 w-44" />
      {/* p subtitle */}
      <Skeleton className="h-5 w-36" />
      {/* Grid of 2 info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoCardSkeleton />
        <InfoCardSkeleton />
      </div>
    </div>
  )
}

/**
 * Chats skeleton - matches ChatsOverviewSection exactly
 * Structure: h2 title + p subtitle + grid of 4 InfoCards
 */
function ChatsSkeleton() {
  return (
    <div className="space-y-4">
      {/* h2 title */}
      <Skeleton className="h-8 w-40" />
      {/* p subtitle */}
      <Skeleton className="h-5 w-32" />
      {/* Grid of 4 info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCardSkeleton />
        <InfoCardSkeleton />
        <InfoCardSkeleton />
        <InfoCardSkeleton />
      </div>
    </div>
  )
}

/**
 * OrganizationCard skeleton - matches OrganizationCard exactly
 */
function OrganizationCardSkeleton() {
  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-6 w-3/4" /> {/* org name */}
          <Skeleton className="h-4 w-1/2" /> {/* org details */}
        </div>
        <Skeleton className="h-4 w-20" /> {/* device count badge */}
      </div>
    </div>
  )
}

/**
 * Organizations skeleton - matches OrganizationsOverviewSection exactly
 * Structure: h2 title + p subtitle + rows of [OrgCard, InfoCard, InfoCard]
 */
function OrganizationsSkeleton() {
  return (
    <div className="space-y-4">
      {/* h2 title */}
      <Skeleton className="h-8 w-52" />
      {/* p subtitle */}
      <Skeleton className="h-5 w-48" />
      {/* Rows of org + info cards */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
          >
            <OrganizationCardSkeleton />
            <InfoCardSkeleton />
            <InfoCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  const showChats = isSaasTenantMode()

  return (
    <div
      className="space-y-10 pt-6"
      role="status"
      aria-label="Loading dashboard"
    >
      <OnboardingSkeleton />
      <DevicesSkeleton />
      {showChats && <ChatsSkeleton />}
      <OrganizationsSkeleton />
    </div>
  )
}
