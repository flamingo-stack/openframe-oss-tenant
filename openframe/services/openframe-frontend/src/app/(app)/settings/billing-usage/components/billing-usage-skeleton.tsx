'use client';

import { PageLayout, Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useSafeBack } from '@/app/hooks/use-safe-back';

// Mirrors a DashboardInfoCard (~94px tall): text column (title + big value)
// with a circular progress on the right, inside the same card chrome.
function InfoCardSkeleton() {
  return (
    <div className="h-[94px] bg-ods-card border border-ods-border rounded-sm p-[var(--spacing-system-m)] flex gap-[var(--spacing-system-s)] items-center">
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-24" />
      </div>
      <Skeleton className="size-12 rounded-full shrink-0" />
    </div>
  );
}

// Mirrors a BillingRow: label on the left, divider, value on the right.
function BillingRowSkeleton({ labelWidth, valueWidth }: { labelWidth: string; valueWidth: string }) {
  return (
    <div className="flex gap-2 items-center w-full">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <div className="flex-1 h-px bg-ods-border min-w-4" />
      <Skeleton className={`h-4 ${valueWidth}`} />
    </div>
  );
}

// Mirrors a SectionBlock (~166px card): uppercase title above a fixed-height card.
function SectionBlockSkeleton({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<{ labelWidth: string; valueWidth: string }>;
}) {
  return (
    <div className="flex flex-col gap-1 h-full">
      <p className="text-h5 text-ods-text-secondary uppercase tracking-[-0.02em]">{title}</p>
      <div className="h-[166px] bg-ods-card border border-ods-border rounded-md p-4 flex flex-col gap-3">
        {rows.map((row, i) => (
          <BillingRowSkeleton key={i} labelWidth={row.labelWidth} valueWidth={row.valueWidth} />
        ))}
      </div>
    </div>
  );
}

const CURRENT_PLAN_ROWS = [
  { labelWidth: 'w-28', valueWidth: 'w-16' },
  { labelWidth: 'w-20', valueWidth: 'w-24' },
  { labelWidth: 'w-24', valueWidth: 'w-20' },
  { labelWidth: 'w-24', valueWidth: 'w-16' },
];

const USAGE_OVERVIEW_ROWS = [
  { labelWidth: 'w-28', valueWidth: 'w-10' },
  { labelWidth: 'w-32', valueWidth: 'w-10' },
];

export function BillingUsageSkeleton() {
  const handleBack = useSafeBack('/settings');

  return (
    <PageLayout
      title="Billing & Usage"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      backButton={{ label: 'Back', onClick: handleBack }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-m)]">
        <InfoCardSkeleton />
        <InfoCardSkeleton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-l)] items-stretch">
        <SectionBlockSkeleton title="Current Plan" rows={CURRENT_PLAN_ROWS} />
        <SectionBlockSkeleton title="Usage Overview" rows={USAGE_OVERVIEW_ROWS} />
      </div>
    </PageLayout>
  );
}
