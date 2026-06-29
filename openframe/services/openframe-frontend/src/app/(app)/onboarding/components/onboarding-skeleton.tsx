'use client';

import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';

/**
 * Loading skeleton for the onboarding page. Mirrors {@link ./onboarding-content} exactly:
 * the `PageLayout` header (title + subtitle + Skip action) followed by the standalone MSP
 * card and the three accordion groups (7 rows total = "7 steps to complete").
 *
 * Used as the `<Suspense>` fallback in {@link ../page} because the always-mounted
 * `DeviceSetupStep` runs `useDeviceOrganizations` (a `useSuspenseQuery`), which suspends the
 * page on first load — this renders the page shape instead of a blank screen meanwhile.
 */

/** A single collapsed accordion row: icon box + title/description + chevron button. */
function RowSkeleton() {
  return (
    <div className="flex w-full items-center gap-[var(--spacing-system-s)] border-b border-ods-border bg-ods-card p-[var(--spacing-system-m)]">
      {/* Leading icon box — matches the 44px → 48px footprint. */}
      <Skeleton className="h-11 w-11 shrink-0 rounded-md md:h-12 md:w-12" />
      {/* Title + description */}
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-system-xs)]">
        <Skeleton className="h-5 w-40 max-w-full" />
        <Skeleton className="h-4 w-3/4 max-w-full" />
      </div>
      {/* Trailing chevron button */}
      <Skeleton className="h-11 w-11 shrink-0 rounded-md md:h-12 md:w-12" />
    </div>
  );
}

/** A bordered group container (matches `OnboardingAccordionGroup`'s rounded box). */
function GroupBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-md border border-ods-border [&>*:last-child]:border-b-0">
      {children}
    </div>
  );
}

/** A labelled accordion group: section label + box of rows. */
function GroupSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-xxs)]">
      {/* Section label (text-h5) */}
      <Skeleton className="h-4 w-36" />
      <GroupBox>
        {Array.from({ length: rows }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </GroupBox>
    </div>
  );
}

export function OnboardingSkeleton() {
  return (
    <div
      className={cn('flex w-full flex-col px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]')}
      role="status"
      aria-label="Loading onboarding"
    >
      {/* Header — mirrors PageLayout's TitleBlock (title + subtitle on the left, Skip action right) */}
      <div className="mb-[var(--spacing-system-l)] flex items-end justify-between gap-[var(--spacing-system-m)] pt-[var(--spacing-system-l)] md:flex-col md:items-start md:justify-start lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-[var(--spacing-system-xs)] md:min-h-12">
          <Skeleton className="h-8 w-44" /> {/* "Get Started" — text-h2 */}
          <Skeleton className="h-5 w-32" /> {/* "7 steps to complete" — text-h6 */}
        </div>
        {/* Skip Onboarding — "…" menu button on mobile, labelled button on desktop */}
        <Skeleton className="h-11 w-11 shrink-0 rounded-md md:h-12 md:w-[160px]" />
      </div>

      {/* Content — matches the standalone MSP card + 3 accordion groups (7 rows total) */}
      <div className="flex flex-col gap-[var(--spacing-system-l)]">
        {/* Complete MSP Setup — standalone */}
        <GroupBox>
          <RowSkeleton />
        </GroupBox>

        {/* Device Management / AI Experience / Additional Setup — 2 rows each */}
        <GroupSkeleton rows={2} />
        <GroupSkeleton rows={2} />
        <GroupSkeleton rows={2} />
      </div>
    </div>
  );
}
