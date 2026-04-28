'use client';

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { BillingUsageSkeleton } from './components/billing-usage-skeleton';
import { BillingUsageView } from './components/billing-usage-view';

export const dynamic = 'force-dynamic';

export default function BillingUsagePage() {
  if (!featureFlags.subscription.enabled()) {
    notFound();
  }

  return (
    <>
      <Suspense fallback={<BillingUsageSkeleton />}>
        <BillingUsageView />
      </Suspense>
    </>
  );
}
