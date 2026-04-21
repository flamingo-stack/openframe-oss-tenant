'use client';

import { Suspense } from 'react';
import { SubscriptionSettingsSkeleton } from '@/app/settings/billing-usage/subscription/components/subscription-settings-skeleton';
import { SubscriptionSettingsView } from '@/app/settings/billing-usage/subscription/components/subscription-settings-view';

/**
 * Content rendered in place of the normal page content when the tenant is
 * locked out of the app (trial expired, subscription canceled, etc.).
 * Reuses the existing subscription settings page — same data, same cards —
 * but `SubscriptionSettingsView` reacts to lock state via context to swap
 * its header for the "trial has ended" banner and change the submit CTA.
 */
export function SubscriptionLockContent() {
  return (
    <Suspense fallback={<SubscriptionSettingsSkeleton />}>
      <SubscriptionSettingsView />
    </Suspense>
  );
}
