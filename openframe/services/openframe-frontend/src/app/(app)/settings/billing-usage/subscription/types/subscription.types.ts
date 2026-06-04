import type { BillingPeriod } from '@/__generated__/productSubscriptionCardProductFragment.graphql';
import type { ProductCheckoutInput } from '../hooks/use-create-checkout-session';
import type { PackageUpdateInput } from '../hooks/use-update-subscription';

export type { BillingPeriod } from '@/__generated__/productSubscriptionCardProductFragment.graphql';
export type { SubscriptionProductStatus } from '@/__generated__/productSubscriptionCardSubscriptionFragment.graphql';
export type { OpenframeProduct } from '@/__generated__/subscriptionSettingsViewQuery.graphql';

export type UpdateAction = 'ADD' | 'CANCEL';

export interface ProductSelectionState {
  payAsYouGoEnabled: boolean;
  billingPeriod: BillingPeriod;
  selectedPackageId: string | null;
  customQuantity: number | null;
}

/** One side (current or next) of a product's plan, used by the Current/New comparison block. */
export interface PlanLine {
  /** Pay-as-you-go (usage-based) — no committed quantity. */
  payg: boolean;
  /** Committed quantity in real product units (devices, tokens); null for PAYG. */
  quantity: number | null;
  billingPeriod: BillingPeriod | null;
  /** Annualized committed cost in dollars; null for PAYG / not computable. */
  annualTotal: number | null;
}

export interface PlanComparison {
  /** null when the product is not part of the current subscription. */
  current: PlanLine | null;
  next: PlanLine;
}

export interface ProductUpdates {
  /** ADD/CANCEL diff for `updateSubscription` (active paid subscriptions). */
  packageUpdates: PackageUpdateInput[];
  /** Desired end-state for `createCheckoutSession` (TRIAL / TRIAL_EXPIRED / CANCELED). */
  checkout: ProductCheckoutInput;
  /** False when Custom Amount is selected with an empty/invalid quantity. */
  valid: boolean;
  /** Current vs selected plan, for the "how your subscription changes" summary. */
  comparison: PlanComparison;
}
