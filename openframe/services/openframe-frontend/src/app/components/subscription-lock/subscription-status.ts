/**
 * Mirrors the backend `SubscriptionStatus` enum (schema.graphql) plus a single
 * synthetic FE-only value `TRIAL_EXPIRED`, derived in `resolveSubscriptionStatus`
 * from `NOT_ACTIVATED` + a `trialExpirationDate` in the past.
 *
 * `PENDING_CANCELLATION` and live `NOT_ACTIVATED` (trial in progress) deliberately
 * don't lock — the user retains access until `endDate` / trial-end.
 */

export const SUBSCRIPTION_STATUSES = [
  'ACTIVE',
  'NOT_ACTIVATED',
  'PAST_DUE',
  'SUSPENDED',
  'PENDING_CANCELLATION',
  'CANCELED',
  'TRIAL_EXPIRED',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface SubscriptionLockCopy {
  title: string;
  description: string;
  ctaLabel: string;
}

const LOCK_COPY: Partial<Record<SubscriptionStatus, SubscriptionLockCopy>> = {
  TRIAL_EXPIRED: {
    title: 'Your free trial has ended.',
    description: 'Pick a plan to keep using OpenFrame.',
    ctaLabel: 'Choose a Plan',
  },
  PAST_DUE: {
    title: "We couldn't process your last payment.",
    description: 'Update your payment method to keep using OpenFrame without interruption.',
    ctaLabel: 'Update Payment',
  },
  SUSPENDED: {
    title: 'Your subscription is suspended.',
    description: 'Reactivate your plan to regain access to your OpenFrame workspace.',
    ctaLabel: 'Reactivate Subscription',
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

function isTrialExpired(trialExpirationDate: string | null | undefined): boolean {
  if (!trialExpirationDate) return false;
  const expiry = new Date(trialExpirationDate).getTime();
  return Number.isFinite(expiry) && expiry < Date.now();
}

export function resolveSubscriptionStatus(
  rawStatus: string | null | undefined,
  trialExpirationDate?: string | null,
): SubscriptionStatus {
  if (!rawStatus || !isKnownStatus(rawStatus)) return 'ACTIVE';
  if (rawStatus === 'NOT_ACTIVATED' && isTrialExpired(trialExpirationDate)) {
    return 'TRIAL_EXPIRED';
  }
  return rawStatus;
}

export function getLockCopy(status: SubscriptionStatus): SubscriptionLockCopy | null {
  return LOCK_COPY[status] ?? null;
}
