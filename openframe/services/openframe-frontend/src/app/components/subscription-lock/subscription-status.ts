/**
 * Frontend-side typing for subscription status until backend exposes a typed enum.
 *
 * Backend currently returns `subscription.status: String!` ([schema.graphql:888]).
 * We map that string into a known enum and fall back to ACTIVE for unknown values.
 *
 * For local QA of the lock state, set `NEXT_PUBLIC_MOCK_SUBSCRIPTION_STATUS`
 * (e.g. `TRIAL_EXPIRED`) in `.env.local` — it overrides whatever the API returns.
 */

import { runtimeEnv } from '@/lib/runtime-config';

export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'TRIAL', 'TRIAL_EXPIRED', 'PAST_DUE', 'CANCELED', 'EXPIRED'] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface SubscriptionLockCopy {
  title: string;
  description: string;
  ctaLabel: string;
}

const LOCK_COPY: Partial<Record<SubscriptionStatus, SubscriptionLockCopy>> = {
  TRIAL_EXPIRED: {
    title: 'Your 14-day trial has ended. We Hope you Loved it!',
    description:
      "We've detected active devices in your OpenFrame instance that require a subscription to continue management.",
    ctaLabel: 'Proceed to Payment',
  },
  EXPIRED: {
    title: 'Your subscription has expired.',
    description: 'Renew your plan to regain access to your OpenFrame workspace.',
    ctaLabel: 'Renew Subscription',
  },
  PAST_DUE: {
    title: "We couldn't process your last payment.",
    description: 'Update your payment method to keep using OpenFrame without interruption.',
    ctaLabel: 'Update Payment',
  },
  CANCELED: {
    title: 'Your subscription has been canceled.',
    description: 'Reactivate your plan to continue using OpenFrame.',
    ctaLabel: 'Reactivate Subscription',
  },
};

function isKnownStatus(value: string): value is SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(value);
}

export function resolveSubscriptionStatus(rawStatus: string | null | undefined): SubscriptionStatus {
  const override = runtimeEnv.mockSubscriptionStatus();
  if (override && isKnownStatus(override)) return override;
  if (rawStatus && isKnownStatus(rawStatus)) return rawStatus;
  return 'ACTIVE';
}

export function getLockCopy(status: SubscriptionStatus): SubscriptionLockCopy | null {
  return LOCK_COPY[status] ?? null;
}
