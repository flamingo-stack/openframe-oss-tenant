'use client';

import { PageLayout, Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';

export function BillingUsageSkeleton() {
  const router = useRouter();

  return (
    <PageLayout
      title="Billing & Usage"
      background="default"
      backButton={{ label: 'Back to Settings', onClick: () => router.push('/settings') }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full rounded-md" />
        <Skeleton className="h-24 w-full rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
      </div>
    </PageLayout>
  );
}
