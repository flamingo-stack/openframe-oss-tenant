'use client';

import { ChatMessageListSkeleton } from '@flamingo-stack/openframe-frontend-core';
import { PageLayout, Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

interface TicketDetailsSkeletonProps {
  onBack: () => void;
  /**
   * Classic two-chat layout (flag off) vs the new sidebar layout (flag on).
   * `showTechnicianChat` is `isTechnicianChatEnabled`, which is exactly the
   * inverse of the sidebar layout, so it doubles as the layout discriminator.
   */
  showTechnicianChat: boolean;
}

/**
 * Loading skeleton shaped like the real ticket details page. Reusing the message
 * list's own `ChatMessageListSkeleton` keeps the transition seamless once the
 * dialog resolves but messages are still loading.
 */
export function TicketDetailsSkeleton({ onBack, showTechnicianChat }: TicketDetailsSkeletonProps) {
  return (
    <PageLayout
      backButton={{ label: 'Back', onClick: onBack }}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] h-[calc(100%)]"
      contentClassName="flex flex-col min-h-0"
    >
      {showTechnicianChat ? <ClassicChatSkeleton /> : <SidebarLayoutSkeleton />}
    </PageLayout>
  );
}

/** Mirrors the new layout: a main pane beside a Ticket Details / Attachments / Tags sidebar. */
function SidebarLayoutSkeleton() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-[var(--spacing-system-l)] min-h-0">
      {/* Main pane — chat is the most common case; transitions seamlessly into it */}
      <div className="flex-1 min-w-0 flex flex-col gap-[var(--spacing-system-xxs)] min-h-0">
        <Skeleton className="h-5 w-24" />
        <div className="flex-1 bg-ods-bg border border-ods-border rounded-md flex flex-col relative min-h-0">
          <ChatMessageListSkeleton fullWidth contentClassName="px-[var(--spacing-system-mf)]" />
        </div>
        <Skeleton className="mt-[var(--spacing-system-xsf)] h-12 w-full rounded-lg" />
      </div>

      {/* Right sidebar — desktop only, matching the loaded layout */}
      <aside className="hidden lg:flex shrink-0 lg:w-80 flex-col gap-[var(--spacing-system-l)] min-h-0">
        {/* Ticket Details info card */}
        <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <Skeleton className="h-5 w-28" />
          <div className="flex flex-col gap-[var(--spacing-system-xsf)] rounded-md border border-ods-border bg-ods-card p-[var(--spacing-system-mf)]">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={`info-${i}`} className="flex items-center gap-[var(--spacing-system-xsf)]">
                <Skeleton className="h-5 w-16 shrink-0" />
                <div className="flex-1 h-px bg-ods-border" />
                <Skeleton className="h-5 w-24 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Attachments */}
        <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <Skeleton className="h-5 w-24" />
          <div className="rounded-md border border-ods-border overflow-hidden">
            {Array.from({ length: 2 }, (_, i) => (
              <div
                key={`attachment-${i}`}
                className="flex items-center gap-[var(--spacing-system-mf)] px-[var(--spacing-system-mf)] py-[var(--spacing-system-sf)] bg-ods-card border-b border-ods-border last:border-b-0"
              >
                <Skeleton className="size-10 rounded-md shrink-0" />
                <div className="flex-1 flex flex-col gap-[var(--spacing-system-xxs)] min-w-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-8 w-full rounded-md" />
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
          <Skeleton className="h-5 w-12" />
          <div className="flex flex-wrap gap-[var(--spacing-system-xxs)]">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-14 rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </aside>
    </div>
  );
}

/** The classic flag-off layout: info bar + two-column client/technician chat. */
function ClassicChatSkeleton() {
  return (
    <>
      {/* Info bar — mirrors TicketInfoSection's collapsed header row */}
      <div className="hidden lg:block shrink-0 rounded-[6px] border border-ods-border overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-ods-card items-center">
          <div className="flex items-center gap-2 min-w-0">
            <Skeleton className="size-9 rounded-[6px] shrink-0" />
            <div className="flex flex-col gap-1 min-w-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Skeleton className="size-9 rounded-full shrink-0" />
            <div className="flex flex-col gap-1 min-w-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="size-11 rounded-[6px]" />
          </div>
        </div>
      </div>

      {/* Chat section — two columns on desktop, matching the loaded layout */}
      <div className="flex-1 flex flex-col min-h-[500px]">
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          <div className="flex-1 lg:basis-1/2 min-w-0 flex flex-col gap-1 min-h-0">
            <Skeleton className="hidden lg:block h-5 w-24" />
            <div className="flex-1 bg-ods-bg border border-ods-border rounded-md flex flex-col relative min-h-0">
              <ChatMessageListSkeleton fullWidth contentClassName="px-[var(--spacing-system-mf)]" />
            </div>
            <Skeleton className="mt-[var(--spacing-system-xsf)] h-12 w-full rounded-lg" />
          </div>

          <div className="flex-1 lg:basis-1/2 min-w-0 flex flex-col gap-1 min-h-0">
            <Skeleton className="hidden lg:block h-5 w-32" />
            <div className="flex-1 flex flex-col relative min-h-0">
              <ChatMessageListSkeleton
                className="flex-1 bg-ods-card border border-ods-border rounded-lg"
                contentClassName="px-[var(--spacing-system-mf)]"
                fullWidth
              />
            </div>
            <Skeleton className="mt-[var(--spacing-system-xsf)] h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </>
  );
}
