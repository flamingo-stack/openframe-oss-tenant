'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { productSubscriptionCardProductFragment$data } from '@/__generated__/productSubscriptionCardProductFragment.graphql';
import type { productSubscriptionCardSubscriptionFragment$data } from '@/__generated__/productSubscriptionCardSubscriptionFragment.graphql';
import type { BillingPeriod, ProductUpdates } from '../types/subscription.types';
import {
  buildInitialSelection,
  CUSTOM_OPTION_ID,
  diffPackageUpdates,
  diffPaygUpdates,
} from '../utils/subscription.utils';

type ProductData = productSubscriptionCardProductFragment$data;
type SubscriptionProductData = productSubscriptionCardSubscriptionFragment$data;

interface UseProductSelectionArgs {
  product: ProductData;
  subscriptionProduct: SubscriptionProductData | null;
  onUpdatesChange: (updates: ProductUpdates) => void;
}

export function useProductSelection({ product, subscriptionProduct, onUpdatesChange }: UseProductSelectionArgs) {
  const [selection, setSelection] = useState(() => buildInitialSelection(product, subscriptionProduct));

  useEffect(() => {
    setSelection(buildInitialSelection(product, subscriptionProduct));
  }, [product, subscriptionProduct]);

  const onUpdatesChangeRef = useRef(onUpdatesChange);
  onUpdatesChangeRef.current = onUpdatesChange;

  useEffect(() => {
    onUpdatesChangeRef.current({
      packageUpdates: diffPackageUpdates(product, selection, subscriptionProduct),
      paygUpdates: diffPaygUpdates(product, selection, subscriptionProduct),
    });
  }, [product, subscriptionProduct, selection]);

  const billingPeriodItems = useMemo(() => {
    const seen = new Set<string>();
    const items: { id: string; label: string }[] = [];
    for (const opt of product.packageOptions) {
      if (!opt.billingPeriod || seen.has(opt.billingPeriod)) continue;
      seen.add(opt.billingPeriod);
      items.push({ id: opt.billingPeriod, label: opt.name ?? opt.billingPeriod });
    }
    return items;
  }, [product.packageOptions]);

  const packageOption =
    product.packageOptions.find(opt => opt.billingPeriod === selection.billingPeriod) ?? product.packageOptions[0];
  const allTiers = packageOption?.priceTiers ?? [];
  const baselineUnitPrice = allTiers[0]?.unitPrice ?? product.payAsYouGoOption?.price ?? null;
  const tiers = allTiers.slice(1);
  const isYearly = selection.billingPeriod === 'YEARLY';

  return {
    selection,
    billingPeriodItems,
    allTiers,
    tiers,
    baselineUnitPrice,
    months: isYearly ? 12 : 1,
    periodSuffix: isYearly ? '/year' : '/month',
    setPayAsYouGo: (payAsYouGoEnabled: boolean) =>
      setSelection(prev => ({
        ...prev,
        payAsYouGoEnabled,
        selectedPackageId: payAsYouGoEnabled ? null : prev.selectedPackageId,
        customQuantity: payAsYouGoEnabled ? null : prev.customQuantity,
      })),
    setBillingPeriod: (period: string) =>
      setSelection(prev => ({ ...prev, billingPeriod: period as BillingPeriod, selectedPackageId: null })),
    setSelectedPackage: (packageId: string) =>
      setSelection(prev => ({
        ...prev,
        selectedPackageId: packageId,
        customQuantity: packageId === CUSTOM_OPTION_ID ? (prev.customQuantity ?? 1) : null,
      })),
    setCustomQuantity: (value: string) => {
      const parsed = Number.parseInt(value, 10);
      setSelection(prev => ({
        ...prev,
        customQuantity: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
      }));
    },
  };
}
