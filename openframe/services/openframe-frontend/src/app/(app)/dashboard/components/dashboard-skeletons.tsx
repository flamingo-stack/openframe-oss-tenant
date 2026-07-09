'use client';

import { Skeleton, TicketStatusTag } from '@flamingo-stack/openframe-frontend-core';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';

/**
 * Single source of truth for the dashboard section skeletons.
 *
 * Both the route-level `loading.tsx` and each overview section's own loading
 * branch render THESE components, so the skeleton shown before the route resolves
 * is byte-identical to the one shown while the section fetches its data — no
 * shape-shift flash between the two phases, and no drift over time.
 *
 * Principle: show as much NON-query-dependent information as possible. Every
 * static label is rendered as its REAL text/element — the section titles
 * ("Devices Overview", …), the "… in Total" units, each info card's title
 * ("Online Devices", …) and the ticket status tags — and only the values that
 * actually come from the request (counts, percentages, the progress ring, and
 * the per-customer rows) are skeletons. Because the real elements are used, the
 * loading card is pixel-identical in height to the loaded one and nothing jumps
 * when the data arrives.
 */

const DEVICE_CARDS = ['Online Devices', 'Offline Devices', 'Pending Devices', 'Archived Devices'] as const;
const CUSTOMER_ROW_KEYS = ['row-1', 'row-2', 'row-3'] as const;

/**
 * Inline skeleton bar, phrasing-valid (`<span>`) so it can live INSIDE the real
 * `<p>` / `<h1>` typography elements — mirrors the core `TitleBlock`'s own
 * `TitleTextSkeleton`. A `<Skeleton>` (which renders a `<div>`) nested in a `<p>`
 * is invalid HTML and a hydration error, hence the span. `align-middle` keeps it
 * centered on the text baseline; the surrounding element's line-box sets the height.
 */
function InlineSkeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block max-w-full animate-pulse rounded-md bg-ods-border align-middle', className)}
    />
  );
}

// Exact wrapper of the core `DashboardInfoCard` (its `baseClassName`).
const INFO_CARD_CLASS =
  'flex items-center gap-[var(--spacing-system-s)] rounded-sm border border-ods-border bg-ods-card p-[var(--spacing-system-m)] transition-all';

/**
 * One `DashboardInfoCard` in its loading state. The title (or the status-tag
 * `titleSlot`) is REAL, static content; only the value, optional percentage and
 * optional progress ring are skeletons — matching the real card's markup exactly.
 */
function InfoCardSkeleton({
  title,
  titleSlot,
  showProgress = false,
  showPercentage = false,
}: {
  title?: string;
  titleSlot?: ReactNode;
  showProgress?: boolean;
  showPercentage?: boolean;
}) {
  return (
    <div className={INFO_CARD_CLASS}>
      <div className="flex flex-1 flex-col">
        {/* Title — real static text (text-h5 uppercases it) or a real status tag. */}
        {titleSlot ?? <p className="text-h5 text-ods-text-secondary">{title}</p>}
        {/* Value (+ optional percentage) — the query-dependent part. */}
        <div className="flex items-center gap-[var(--spacing-system-xs)]">
          <p className="text-h2 text-ods-text-primary">
            <InlineSkeleton className="h-4 w-8 md:h-6" />
          </p>
          {showPercentage && (
            <p className="text-h4 text-ods-text-secondary">
              <InlineSkeleton className="h-3 w-14" />
            </p>
          )}
        </div>
      </div>
      {/* Circular progress ring — responsive 24 → 56px, matching progressSize={{ base: 24, md: 56 }}. */}
      {showProgress && <Skeleton className="size-6 shrink-0 rounded-full md:size-14" />}
    </div>
  );
}

/**
 * `OrganizationCard` skeleton — the whole card is per-customer data (name, type,
 * avatar, device count), so it stays a skeleton. Mirrors the real card's wrapper
 * + header (avatar 52 → 60px) and the top-right device-count badge.
 */
function OrganizationCardSkeleton() {
  return (
    <div className="relative flex w-full flex-col gap-3 overflow-clip rounded-[6px] border border-ods-border bg-ods-card p-4">
      {/* device-count badge (absolute top-right): monitor icon + "N devices" */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <Skeleton className="size-4" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* header: avatar + name/subtitle */}
      <div className="flex w-full items-start gap-3">
        <Skeleton className="size-[52px] shrink-0 rounded-md md:size-[60px]" />
        <div className="flex min-w-0 flex-1 flex-col justify-center py-2">
          <p className="text-lg leading-[1.33]">
            <InlineSkeleton className="h-4 w-32" />
          </p>
          <p className="text-sm leading-[1.43]">
            <InlineSkeleton className="h-3 w-24" />
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Overview section header in loading state. Faithfully mirrors the FROZEN
 * `TitleBlock` (its subtitle branch) so it doesn't jump when the real header
 * mounts — but shows the REAL static section title and the static "… in Total"
 * unit, skeletoning only the count. Callers pass the same className the real
 * `TitleBlock` gets (`[&_p]:hidden lg:[&_p]:block`), so the subtitle line appears
 * only from `lg` up, exactly as in the loaded header.
 */
function OverviewHeaderSkeleton({ title, unit, className }: { title: string; unit: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-end justify-between gap-[var(--spacing-system-m)]',
        'md:flex-col md:items-start md:justify-start lg:flex-row lg:items-end lg:justify-between',
        'pt-[var(--spacing-system-l)] mb-[var(--spacing-system-l)]',
        className,
      )}
    >
      <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-[var(--spacing-system-xs)] md:min-h-12">
        <div className="flex w-full min-w-0 items-center gap-[var(--spacing-system-m)]">
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h1 className="truncate text-h2 text-ods-text-primary">{title}</h1>
            <p className="truncate text-h6 text-ods-text-secondary">
              <InlineSkeleton className="h-2.5 w-8 md:h-3" /> {unit}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Devices Overview loading state — real header + 4 info-card skeletons with real titles. */
export function DevicesOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <OverviewHeaderSkeleton
        title="Devices Overview"
        unit="Devices in Total"
        className="pt-1 mb-0 [&_p]:hidden lg:[&_p]:block"
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {DEVICE_CARDS.map(title => (
          <InfoCardSkeleton key={title} title={title} showProgress showPercentage />
        ))}
      </div>
    </div>
  );
}

/** Tickets Overview loading state — real header + 4 ticket cards with their real status tags. */
export function TicketsOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <OverviewHeaderSkeleton
        title="Tickets Overview"
        unit="Tickets in Total"
        className="pt-0 mb-0 [&_p]:hidden lg:[&_p]:block"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InfoCardSkeleton titleSlot={<TicketStatusTag status="AI_ASSISTANCE" />} />
        <InfoCardSkeleton titleSlot={<TicketStatusTag status="TECH_REQUIRED" />} />
        <InfoCardSkeleton titleSlot={<TicketStatusTag status="RESOLVED" />} />
        <InfoCardSkeleton
          titleSlot={
            <span className="flex h-8 items-center text-h5 uppercase text-ods-text-secondary">Other Statuses</span>
          }
        />
      </div>
    </div>
  );
}

/** The row list for Customers Overview — 3 rows of [org card, 2 info cards with real titles]. */
function CustomersRowsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {CUSTOMER_ROW_KEYS.map(key => (
        <div key={key} className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
          <OrganizationCardSkeleton />
          <InfoCardSkeleton title="Online Devices" showProgress showPercentage />
          <InfoCardSkeleton title="Offline Devices" showProgress showPercentage />
        </div>
      ))}
    </div>
  );
}

/** Customers Overview loading state — real header + the row skeletons. */
export function CustomersOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <OverviewHeaderSkeleton
        title="Customers Overview"
        unit="Customers in Total"
        className="pt-0 mb-0 [&_p]:hidden lg:[&_p]:block"
      />
      <CustomersRowsSkeleton />
    </div>
  );
}
