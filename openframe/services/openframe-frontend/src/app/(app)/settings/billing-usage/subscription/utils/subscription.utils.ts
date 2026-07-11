import type { productSubscriptionCardProductFragment$data } from '@/__generated__/productSubscriptionCardProductFragment.graphql';
import type { productSubscriptionCardSubscriptionFragment$data } from '@/__generated__/productSubscriptionCardSubscriptionFragment.graphql';
import type { ProductCheckoutInput } from '../hooks/use-create-checkout-session';
import type { PackageUpdateInput } from '../hooks/use-update-subscription';
import type { BillingPeriod, PlanComparison, PlanLine, ProductSelectionState } from '../types/subscription.types';

export const CUSTOM_OPTION_ID = '__custom__';
export const PAYG_OPTION_ID = '__payg__';

type ProductData = productSubscriptionCardProductFragment$data;
type SubscriptionProductData = productSubscriptionCardSubscriptionFragment$data;

export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Compact count: 100000000 → "100M", 100000 → "100K", 100 → "100". */
export function formatCompact(value: number): string {
  return value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
}

/**
 * Topmost selectable radio for a billing period: PAYG sits first when present
 * (any period); otherwise the first tier; otherwise Custom.
 */
export function topmostSelectionId(product: ProductData, period: BillingPeriod): string {
  if (product.payAsYouGoOption) return PAYG_OPTION_ID;
  const periodOption = product.packageOptions.find(o => o.billingPeriod === period) ?? product.packageOptions[0];
  const tiers = periodOption?.priceTiers?.slice(1) ?? [];
  return tiers.length > 0 ? String(tiers[0].from) : CUSTOM_OPTION_ID;
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

  let selectedPackageId: string;
  let customQuantity: number | null = null;
  if (subscriptionProduct?.paygOnly) {
    // Backend says this product only supports PAYG — no tier/custom choice.
    selectedPackageId = PAYG_OPTION_ID;
  } else if (matchedTier) {
    selectedPackageId = String(matchedTier.from);
  } else if (activeQuantity != null) {
    selectedPackageId = CUSTOM_OPTION_ID;
    customQuantity = activeQuantity;
  } else {
    // No active tier/custom package: default to PAYG (current PAYG state, or soft-default for trial/no-plan users).
    selectedPackageId = PAYG_OPTION_ID;
  }

  return {
    payAsYouGoEnabled: selectedPackageId === PAYG_OPTION_ID,
    billingPeriod,
    selectedPackageId,
    customQuantity,
  };
}

/**
 * Catalog `ProductOption.id` from `billingPlan` is a Relay global id —
 * `base64("ProductOption:<uuid>")`. The backend's `PackageUpdateInput.packageOptionId`
 * expects the raw catalog uuid (the same value `SubscriptionOptionDetail.packageOptionId`
 * returns). Decode the global id; fall back to the input if it isn't encoded.
 */
function toCatalogOptionId(globalId: string): string {
  try {
    const decoded = atob(globalId);
    const idx = decoded.indexOf(':');
    return idx >= 0 ? decoded.slice(idx + 1) : globalId;
  } catch {
    return globalId;
  }
}

/**
 * Catalog `packageOptionId` to attach a committed quantity to for `period`.
 * Prefer the period-matched package option, then the first package option; then
 * fall back to the product's pay-as-you-go option. The fallback matters for
 * products that expose *no* committed `packageOptions` (e.g. AI Assistant, which
 * is catalog-PAYG-only) — without it a valid Custom Amount there resolves to a
 * null id, so the diff/checkout came out empty and the submit button stayed
 * disabled even though the plan-change preview showed a change. With the
 * fallback, Custom Amount behaves like it does for a product that has package
 * options (Devices). Returns null only when the product has neither.
 */
function committedOptionId(product: ProductData, period: BillingPeriod): string | null {
  const option =
    product.packageOptions.find(opt => opt.billingPeriod === period) ??
    product.packageOptions[0] ??
    product.payAsYouGoOption ??
    null;
  return option ? toCatalogOptionId(option.id) : null;
}

/**
 * Backend `quantity`, catalog `priceTier.from`/`upTo`, and the Custom Amount
 * input all speak the same real product count (devices, tokens) — no unit
 * conversion. `unitSize` (devices: 1, AI tokens: 100_000) is only a granularity
 * constraint: the custom quantity must be a positive whole multiple of it.
 * Returns the entered quantity when valid, else null (the UI surfaces a
 * "must be a multiple of N" error in that case).
 */
function validCustomQuantity(product: ProductData, customQuantity: number | null): number | null {
  if (customQuantity == null || customQuantity <= 0) return null;
  const unitSize = Number(product.unitSize ?? 1) || 1;
  if (customQuantity % unitSize !== 0) return null;
  return customQuantity;
}

/**
 * Backend semantics (see `SubscriptionUpdateService.addPackage`):
 * - `ADD` for a product auto-ends the product's currently active package
 *   (sets its endDate to phaseStart - 1). So package swaps within the same
 *   product are a single `ADD` — no explicit `CANCEL` of the previous tier.
 * - PAYG is always-on and self-healed by `reconcilePaygInvariant` on every
 *   `updateSubscription` call. FE never touches PAYG via `PackageUpdateInput`.
 * - `CANCEL` is reserved for removing a product's commitment entirely (e.g.
 *   switching from a committed package to PAYG-only, or turning AI Assistant
 *   off — the latter is handled at the view level, see SubscriptionSettingsView).
 */
export function diffPackageUpdates(
  product: ProductData,
  currentSelection: ProductSelectionState,
  subscriptionProduct: SubscriptionProductData | null,
): PackageUpdateInput[] {
  const activePackage = subscriptionProduct?.packageOptions.find(opt => opt.status === 'ACTIVE') ?? null;
  const activeCancelId = activePackage?.packageOptionId ?? null;
  const activeQuantity = activePackage?.quantity ?? null;

  const wantsPayg = currentSelection.selectedPackageId === PAYG_OPTION_ID;

  if (wantsPayg) {
    return activeCancelId ? [{ productName: product.name, packageOptionId: activeCancelId, action: 'CANCEL' }] : [];
  }

  const nextPackageId = committedOptionId(product, currentSelection.billingPeriod);

  let nextQuantity: number | null = null;
  if (currentSelection.selectedPackageId === CUSTOM_OPTION_ID) {
    nextQuantity = validCustomQuantity(product, currentSelection.customQuantity);
  } else if (currentSelection.selectedPackageId) {
    const parsed = Number.parseInt(currentSelection.selectedPackageId, 10);
    nextQuantity = Number.isFinite(parsed) ? parsed : null;
  }

  if (activeCancelId != null && activeCancelId === nextPackageId && activeQuantity === nextQuantity) {
    return [];
  }

  if (nextPackageId && nextQuantity) {
    return [{ productName: product.name, packageOptionId: nextPackageId, action: 'ADD', quantity: nextQuantity }];
  }

  return [];
}

/**
 * Whether a product's selection differs from its current commitment — drives the
 * visibility of the Current/New plan-change summary. Deliberately independent of
 * `diffPackageUpdates`: the summary is a visual preview, so any valid selection
 * that differs from today should show it, even in catalog edge-cases where the
 * change can't yet be expressed as a `PackageUpdateInput`. An invalid/empty
 * custom amount (`next.quantity == null`) is not a change.
 */
export function isPlanChanged({ current, next }: PlanComparison): boolean {
  const nextValid = next.payg || next.quantity != null;
  if (!nextValid) return false;
  if (!current) return !next.payg;
  if (current.payg !== next.payg) return true;
  if (next.payg) return false;
  if (current.billingPeriod !== next.billingPeriod) return true;
  return (current.quantity ?? null) !== (next.quantity ?? null);
}

/**
 * Desired end-state for `createCheckoutSession` (used when there is no active
 * paid subscription: TRIAL / TRIAL_EXPIRED / CANCELED). Unlike `diffPackageUpdates`
 * this is not an ADD/CANCEL diff — it describes the target plan for the product.
 */
export function buildCheckoutProduct(
  product: ProductData,
  currentSelection: ProductSelectionState,
): ProductCheckoutInput {
  if (currentSelection.selectedPackageId === PAYG_OPTION_ID) {
    return { productName: product.name, payAsYouGoEnabled: true };
  }

  let quantity: number | null = null;
  if (currentSelection.selectedPackageId === CUSTOM_OPTION_ID) {
    quantity = validCustomQuantity(product, currentSelection.customQuantity);
  } else if (currentSelection.selectedPackageId) {
    const parsed = Number.parseInt(currentSelection.selectedPackageId, 10);
    quantity = Number.isFinite(parsed) ? parsed : null;
  }

  return {
    productName: product.name,
    packageOptionId: committedOptionId(product, currentSelection.billingPeriod),
    quantity,
    payAsYouGoEnabled: true,
  };
}

/** Selected committed quantity in real product counts (null for PAYG / empty Custom). */
function selectionQuantity(product: ProductData, selection: ProductSelectionState): number | null {
  if (selection.selectedPackageId === PAYG_OPTION_ID) return null;
  if (selection.selectedPackageId === CUSTOM_OPTION_ID) return validCustomQuantity(product, selection.customQuantity);
  if (selection.selectedPackageId) {
    const parsed = Number.parseInt(selection.selectedPackageId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Annualized committed cost for `quantity` real product counts against `tiers`.
 * `priceTier.unitPrice` is per product per month, so a year is always × 12 — the
 * yearly discount is already baked into the yearly period's tiers.
 */
function annualizedPackagePrice(
  quantity: number | null,
  tiers: readonly PriceTierInput[] | null | undefined,
): number | null {
  if (quantity == null || quantity <= 0 || !tiers || tiers.length === 0) return null;
  const applicable =
    tiers.find(t => quantity >= t.from && (t.upTo == null || quantity <= t.upTo)) ?? tiers[tiers.length - 1];
  if (!applicable) return null;
  return quantity * applicable.unitPrice * 12;
}

function tiersForPeriod(product: ProductData, period: BillingPeriod | null): readonly PriceTierInput[] {
  const option = product.packageOptions.find(opt => opt.billingPeriod === period) ?? product.packageOptions[0];
  return option?.priceTiers ?? [];
}

/**
 * Current vs selected plan for the Current/New summary block. Prices are derived
 * from the catalog tiers (the subscription fragment has no price tiers), so a
 * current committed package is priced against the catalog option for its period.
 */
export function buildPlanComparison(
  product: ProductData,
  selection: ProductSelectionState,
  subscriptionProduct: SubscriptionProductData | null,
): PlanComparison {
  const activePackage = subscriptionProduct?.packageOptions.find(opt => opt.status === 'ACTIVE') ?? null;

  let current: PlanLine | null = null;
  if (subscriptionProduct) {
    if (activePackage && activePackage.quantity != null) {
      const period = (activePackage.billingPeriod ?? null) as BillingPeriod | null;
      current = {
        payg: false,
        quantity: activePackage.quantity,
        billingPeriod: period,
        annualTotal: annualizedPackagePrice(activePackage.quantity, tiersForPeriod(product, period)),
      };
    } else {
      // No committed package → product is on always-on PAYG.
      current = { payg: true, quantity: null, billingPeriod: null, annualTotal: null };
    }
  }

  let next: PlanLine;
  if (selection.selectedPackageId === PAYG_OPTION_ID) {
    next = { payg: true, quantity: null, billingPeriod: null, annualTotal: null };
  } else {
    const quantity = selectionQuantity(product, selection);
    next = {
      payg: false,
      quantity,
      billingPeriod: selection.billingPeriod,
      annualTotal: annualizedPackagePrice(quantity, tiersForPeriod(product, selection.billingPeriod)),
    };
  }

  return { current, next };
}
