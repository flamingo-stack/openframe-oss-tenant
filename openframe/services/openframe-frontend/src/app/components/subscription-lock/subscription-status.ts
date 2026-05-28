import { SubscriptionStatus } from '@/generated/schema-enums';

/**
 * `SubscriptionStatus` mirrors the backend enum (schema.graphql via
 * `npm run generate-enums`). `TRIAL` and `TRIAL_EXPIRED` are now first-class
 * backend values — the FE no longer derives them from a date.
 *
 * `TRIAL_EXPIRED` and `CANCELED` lock the app (full subscribe screen).
 * `PAST_DUE` and `SUSPENDED` are rendered inline on the billing page with a
 * "Pay Overage" CTA — the user keeps access to the rest of the app.
 */
export { SubscriptionStatus };

export interface SubscriptionLockCopy {
  title: string;
  description: string;
  ctaLabel: string;
}

const LOCK_COPY: Partial<Record<SubscriptionStatus, SubscriptionLockCopy>> = {
  [SubscriptionStatus.TRIAL_EXPIRED]: {
    title: 'Your free trial has ended.',
    description: 'Pick a plan to keep using OpenFrame.',
    ctaLabel: 'Choose a Plan',
  },
  [SubscriptionStatus.CANCELED]: {
    title: 'Subscribe to OpenFrame',
    description: 'Choose a plan to pick up where you left off.',
    ctaLabel: 'Choose a Plan',
  },
};

function isKnownStatus(value: string): value is SubscriptionStatus {
  return Object.hasOwn(SubscriptionStatus, value);
}

export function resolveSubscriptionStatus(rawStatus: string | null | undefined): SubscriptionStatus {
  return rawStatus && isKnownStatus(rawStatus) ? rawStatus : SubscriptionStatus.ACTIVE;
}

export function getLockCopy(status: SubscriptionStatus): SubscriptionLockCopy | null {
  return LOCK_COPY[status] ?? null;
}
