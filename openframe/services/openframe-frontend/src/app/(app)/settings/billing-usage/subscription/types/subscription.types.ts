import type { BillingPeriod } from '@/__generated__/productSubscriptionCardProductFragment.graphql';
import type { PackageUpdateInput, PaygUpdateInput } from '../hooks/use-update-subscription';

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
  packageUpdates: PackageUpdateInput[];
  paygUpdates: PaygUpdateInput[];
}
