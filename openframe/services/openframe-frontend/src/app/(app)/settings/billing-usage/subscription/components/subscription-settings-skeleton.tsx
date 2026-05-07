'use client';

import { PageLayout, Skeleton, SkeletonButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';

export function SubscriptionSettingsSkeleton() {
  const router = useRouter();

  return (
    <PageLayout
      title="Subscription Settings"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      backButton={{ label: 'Back to Billing & Usage', onClick: () => router.push('/settings/billing-usage') }}
    >
      <Skeleton className="h-16 w-full rounded-md" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ProductCardSkeleton />
        <ProductCardSkeleton />
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-6 lg:items-center">
        <Skeleton className="h-4 flex-1 max-w-xl" />
        <SkeletonButton size="lg" />
      </div>
    </PageLayout>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 bg-ods-bg border border-ods-border rounded-lg">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="h-12 w-full rounded-md" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    </div>
  );
}
