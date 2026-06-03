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

export interface ProductUpdates {
  /** ADD/CANCEL diff for `updateSubscription` (active paid subscriptions). */
  packageUpdates: PackageUpdateInput[];
  /** Desired end-state for `createCheckoutSession` (TRIAL / TRIAL_EXPIRED / CANCELED). */
  checkout: ProductCheckoutInput;
  /** False when Custom Amount is selected with an empty/invalid quantity. */
  valid: boolean;
}
