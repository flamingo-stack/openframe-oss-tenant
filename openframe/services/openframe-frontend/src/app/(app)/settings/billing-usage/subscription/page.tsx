'use client';

import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { SubscriptionSettingsSkeleton } from './components/subscription-settings-skeleton';
import { SubscriptionSettingsView } from './components/subscription-settings-view';

export const dynamic = 'force-dynamic';

export default function SubscriptionSettingsPage() {
  if (!featureFlags.subscription.enabled()) {
    notFound();
  }

  return (
    <>
      <Suspense fallback={<SubscriptionSettingsSkeleton />}>
        <SubscriptionSettingsView />
      </Suspense>
    </>
  );
}
