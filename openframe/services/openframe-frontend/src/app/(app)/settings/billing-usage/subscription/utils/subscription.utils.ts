import type { productSubscriptionCardProductFragment$data } from '@/__generated__/productSubscriptionCardProductFragment.graphql';
import type { productSubscriptionCardSubscriptionFragment$data } from '@/__generated__/productSubscriptionCardSubscriptionFragment.graphql';
import type { PackageUpdateInput, PaygUpdateInput } from '../hooks/use-update-subscription';
import type { BillingPeriod, ProductSelectionState } from '../types/subscription.types';

export const CUSTOM_OPTION_ID = '__custom__';

type ProductData = productSubscriptionCardProductFragment$data;
type SubscriptionProductData = productSubscriptionCardSubscriptionFragment$data;

export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

interface PriceTierInput {
  readonly from: number;
  readonly upTo?: number | null;
  readonly unitPrice: number;
}

export function calculateCustomQuantityPrice(
  quantity: number,
  allTiers: readonly PriceTierInput[],
  baselineUnitPrice: number | null,
  months: number,
): { total: number; discountPercent: number } | null {
  if (!Number.isFinite(quantity) || quantity <= 0 || allTiers.length === 0) return null;
  const applicable =
    allTiers.find(t => quantity >= t.from && (t.upTo == null || quantity <= t.upTo)) ?? allTiers[allTiers.length - 1];
  if (!applicable) return null;
  const total = quantity * applicable.unitPrice * months;
  const discountPercent = baselineUnitPrice ? Math.round((1 - applicable.unitPrice / baselineUnitPrice) * 100) : 0;
  return { total, discountPercent };
}

export function formatPaygSubtitle(
  option: { description?: string | null; name?: string | null } | null | undefined,
): string {
  if (!option) return '';
  const { description, name } = option;
  if (description && name) return `${description} (${name})`;
  return description ?? name ?? '';
}

export function buildInitialSelection(
  product: ProductData,
  subscriptionProduct: SubscriptionProductData | null,
): ProductSelectionState {
  const activePackage = subscriptionProduct?.packageOptions.find(opt => opt.status === 'ACTIVE');
  const availablePeriods = new Set(product.packageOptions.map(opt => opt.billingPeriod).filter(Boolean));
  const fallbackPeriod = product.packageOptions[0]?.billingPeriod ?? 'YEARLY';
  const desiredPeriod = activePackage?.billingPeriod ?? fallbackPeriod;
  const billingPeriod = (availablePeriods.has(desiredPeriod) ? desiredPeriod : fallbackPeriod) as BillingPeriod;

  const matchingProductOption =
    product.packageOptions.find(opt => opt.billingPeriod === billingPeriod) ?? product.packageOptions[0];
  const tiers = matchingProductOption?.priceTiers?.slice(1) ?? [];
  const activeQuantity = activePackage?.quantity ?? null;
  const matchedTier = activeQuantity != null ? tiers.find(t => t.from === activeQuantity) : null;

  let selectedPackageId: string | null = null;
  let customQuantity: number | null = null;
  if (matchedTier) {
    selectedPackageId = String(matchedTier.from);
  } else if (activeQuantity != null) {
    selectedPackageId = CUSTOM_OPTION_ID;
    customQuantity = activeQuantity;
  }

  return {
    payAsYouGoEnabled: Boolean(subscriptionProduct?.payAsYouGoOption),
    billingPeriod,
    selectedPackageId,
    customQuantity,
  };
}

export function diffPackageUpdates(
  product: ProductData,
  currentSelection: ProductSelectionState,
  subscriptionProduct: SubscriptionProductData | null,
): PackageUpdateInput[] {
  const activePackage = subscriptionProduct?.packageOptions.find(opt => opt.status === 'ACTIVE');
  const activePackageId = activePackage?.id ?? null;
  const activeQuantity = activePackage?.quantity ?? null;

  const nextPackageOption =
    product.packageOptions.find(opt => opt.billingPeriod === currentSelection.billingPeriod) ??
    product.packageOptions[0] ??
    null;
  const nextPackageId = nextPackageOption?.id ?? null;

  let nextQuantity: number | null = null;
  if (currentSelection.selectedPackageId === CUSTOM_OPTION_ID) {
    nextQuantity = currentSelection.customQuantity;
  } else if (currentSelection.selectedPackageId) {
    const parsed = Number.parseInt(currentSelection.selectedPackageId, 10);
    nextQuantity = Number.isFinite(parsed) ? parsed : null;
  }

  if (activePackageId === nextPackageId && activeQuantity === nextQuantity) return [];

  const updates: PackageUpdateInput[] = [];
  if (activePackageId) {
    updates.push({ productName: product.name, packageOptionId: activePackageId, action: 'CANCEL' });
  }
  if (nextPackageId && nextQuantity) {
    updates.push({ productName: product.name, packageOptionId: nextPackageId, action: 'ADD', quantity: nextQuantity });
  }
  return updates;
}

export function diffPaygUpdates(
  product: ProductData,
  currentSelection: ProductSelectionState,
  subscriptionProduct: SubscriptionProductData | null,
): PaygUpdateInput[] {
  const currentPayg = Boolean(subscriptionProduct?.payAsYouGoOption);
  if (currentPayg === currentSelection.payAsYouGoEnabled) return [];
  return [{ productName: product.name, enabled: currentSelection.payAsYouGoEnabled }];
}
