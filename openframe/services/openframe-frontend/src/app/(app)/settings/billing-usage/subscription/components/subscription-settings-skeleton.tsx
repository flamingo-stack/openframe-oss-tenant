'use client';

import { PageLayout, Skeleton, SkeletonButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useSafeBack } from '@/app/hooks/use-safe-back';

const RADIO_ROW_KEYS = ['payg', 'tier-1', 'tier-2', 'tier-3', 'custom'] as const;

export function SubscriptionSettingsSkeleton() {
  const handleBack = useSafeBack('/settings/billing-usage');

  return (
    <PageLayout
      title="Subscription Settings"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      backButton={{ label: 'Back', onClick: handleBack }}
    >
      <EnableCheckboxSkeleton />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </div>

      <div className="flex flex-col-reverse justify-between lg:flex-row gap-6 lg:items-center">
        <Skeleton className="h-4 flex-1 max-w-xl" />
        <SkeletonButton size="lg" />
      </div>
    </PageLayout>
  );
}

function EnableCheckboxSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-ods-border bg-ods-card p-4">
      <Skeleton className="h-6 w-6 rounded shrink-0" />
      <div className="flex flex-col gap-1 flex-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 bg-ods-bg border border-ods-border rounded-lg">
      {/* Title (h2) */}
      <Skeleton className="h-10 w-3/4" />
      {/* Description (~2 lines) */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      {/* TabSelector (Monthly/Annual) — rendered as placeholder; hidden in single-period products */}
      <Skeleton className="h-11 w-full rounded-md" />
      {/* Packages section */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <div className="flex flex-col rounded-md border border-ods-border bg-ods-card overflow-hidden">
          {RADIO_ROW_KEYS.map((key, idx) => (
            <div key={key} className="flex items-center gap-3 px-3 py-3 border-b border-ods-border last:border-b-0">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              {idx > 0 && idx < RADIO_ROW_KEYS.length - 1 && <Skeleton className="h-8 w-14 rounded-md shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
