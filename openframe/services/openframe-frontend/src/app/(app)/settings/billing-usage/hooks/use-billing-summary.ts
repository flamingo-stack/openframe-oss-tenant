import { useMemo } from 'react';
import type { billingUsageViewQuery$data } from '@/__generated__/billingUsageViewQuery.graphql';
import { SubscriptionStatus } from '@/app/components/subscription-lock/subscription-status';
import { OpenframeProduct, SubscriptionProductStatus } from '@/generated/schema-enums';
import { toDisplayQuantity } from '../subscription/utils/subscription.utils';

const WARNING_THRESHOLD = 90;
const OVER_THRESHOLD = 100;

export type UsageState = 'success' | 'warning' | 'over';

function getUsageState(percentage: number): UsageState {
  if (percentage >= OVER_THRESHOLD) return 'over';
  if (percentage >= WARNING_THRESHOLD) return 'warning';
  return 'success';
}

type SubscriptionData = billingUsageViewQuery$data['subscription'];
type BillingPlanData = billingUsageViewQuery$data['billingPlan'];

export function useBillingSummary(subscription: SubscriptionData, billingPlan: BillingPlanData) {
  const unitSizeByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of billingPlan?.products ?? []) {
      map.set(p.name, Number(p.unitSize ?? 1) || 1);
    }
    return map;
  }, [billingPlan]);
  const managedDevicesUnitSize = unitSizeByProduct.get(OpenframeProduct.MANAGED_DEVICES) ?? 1;
  const aiUnitSize = unitSizeByProduct.get(OpenframeProduct.AI_ASSISTANCE) ?? 1;
  const subscriptionProducts = subscription?.products ?? [];
  const status = subscription?.status ?? SubscriptionStatus.ACTIVE;
  const pendingInvoices = subscription?.pendingInvoices ?? [];
  const latestPendingInvoice =
    [...pendingInvoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

  const devicesUsed = subscription?.usage?.devicesUsed ?? 0;
  const activeDevices = subscription?.usage?.activeDevices ?? 0;
  const inactiveDevices = subscription?.usage?.inactiveDevices ?? 0;
  const aiTokensUsed = subscription?.usage?.aiTokensUsed ?? 0;
  const estimatedOverageCost =
    subscription?.currentInvoice?.estimatedOverage != null ? subscription.currentInvoice.estimatedOverage / 100 : 0;

  const managedDevicesProduct = subscriptionProducts.find(p => p.name === OpenframeProduct.MANAGED_DEVICES) ?? null;
  const aiProduct = subscriptionProducts.find(p => p.name === OpenframeProduct.AI_ASSISTANCE) ?? null;
  const managedDevicesActive =
    managedDevicesProduct?.packageOptions.find(o => o.status === SubscriptionProductStatus.ACTIVE) ?? null;
  const aiActive = aiProduct?.packageOptions.find(o => o.status === SubscriptionProductStatus.ACTIVE) ?? null;

  // A scheduled downgrade surfaces as PENDING_ACTIVATION option(s). It can be
  // devices-only, AI-only, or both — each row is shown independently.
  const managedDevicesPending =
    managedDevicesProduct?.packageOptions.find(o => o.status === SubscriptionProductStatus.PENDING_ACTIVATION) ?? null;
  const aiPending =
    aiProduct?.packageOptions.find(o => o.status === SubscriptionProductStatus.PENDING_ACTIVATION) ?? null;

  const trialExpirationDate = subscription?.trialExpirationDate ?? null;
  const isTrial = status === SubscriptionStatus.TRIAL;
  const isPendingCancellation = status === SubscriptionStatus.PENDING_CANCELLATION;
  const isOverdue =
    status === SubscriptionStatus.PAST_DUE ||
    status === SubscriptionStatus.SUSPENDED ||
    status === SubscriptionStatus.CANCELED;

  const deviceIsPayg = managedDevicesProduct?.payAsYouGoOption != null && managedDevicesActive == null;
  const aiIsPayg = aiProduct?.payAsYouGoOption != null && aiActive == null;
  const hasAi = aiActive != null || aiIsPayg;

  const deviceAllocation = toDisplayQuantity(managedDevicesActive?.quantity, managedDevicesUnitSize);
  const aiAllocation = toDisplayQuantity(aiActive?.quantity, aiUnitSize);

  const devicePct = deviceAllocation > 0 ? Math.round((devicesUsed / deviceAllocation) * 100) : 0;
  const aiPct = aiAllocation > 0 ? Math.round((aiTokensUsed / aiAllocation) * 100) : 0;

  const deviceState: UsageState = deviceIsPayg ? 'success' : getUsageState(devicePct);
  const aiState: UsageState = aiIsPayg ? 'success' : hasAi ? getUsageState(aiPct) : 'success';

  const deviceOverage = Math.max(0, devicesUsed - deviceAllocation);
  const aiOverage = Math.max(0, aiTokensUsed - aiAllocation);

  const warnings: Array<{ title: string; description: string }> = [];
  if (deviceState === 'warning') {
    warnings.push({
      title: "You're approaching your Device Package limit",
      description: 'Any devices above it will be billed at pay-as-you-go rates, charged separately from your plan.',
    });
  } else if (deviceState === 'over') {
    warnings.push({
      title: "You're over your Device Package limit",
      description:
        'Extra devices will be billed at pay-as-you-go rates, charged separately from your plan. Upgrade to lock in a lower device price.',
    });
  }
  if (hasAi && aiState === 'warning') {
    warnings.push({
      title: "You're approaching your AI Package limit",
      description: 'Any tokens above it will be billed at pay-as-you-go rates, charged separately from your plan.',
    });
  } else if (hasAi && aiState === 'over') {
    warnings.push({
      title: "You're over your AI Package limit",
      description:
        'Extra tokens will be billed at pay-as-you-go rates, charged separately from your plan. Upgrade to include more at a lower cost.',
    });
  }

  const showOverageBlock = deviceState === 'over' || aiState === 'over';
  const accentClass = isOverdue ? 'text-ods-error' : 'text-ods-warning';
  const accentBorderClass = isOverdue ? 'border-ods-error' : 'border-ods-warning';

  const monthlyCost = useMemo(() => {
    let total = 0;
    for (const product of subscriptionProducts) {
      const active = product.packageOptions.find(o => o.status === SubscriptionProductStatus.ACTIVE);
      if (!active?.price || !active.quantity) continue;
      const perUnitMonthly = active.billingPeriod === 'YEARLY' ? active.price / 12 : active.price;
      total += perUnitMonthly * active.quantity;
    }
    return total;
  }, [subscriptionProducts]);

  const nextBilling = isPendingCancellation
    ? (subscription?.cancellationEffectiveAt ?? managedDevicesActive?.endDate ?? aiActive?.endDate ?? null)
    : (managedDevicesActive?.endDate ?? aiActive?.endDate ?? subscription?.currentPeriodEnd ?? null);

  const allPayg = deviceIsPayg && (aiIsPayg || !aiProduct);
  const isNearLimits =
    !allPayg && (deviceState === 'warning' || deviceState === 'over' || aiState === 'warning' || aiState === 'over');

  const toProgressVariant = (state: UsageState): 'success' | 'warning' | 'error' =>
    state === 'success' ? 'success' : isOverdue ? 'error' : 'warning';

  const hasPendingPlan = managedDevicesPending != null || aiPending != null;
  const updatedPlan = {
    showDevice: managedDevicesPending != null,
    deviceQuantity: toDisplayQuantity(managedDevicesPending?.quantity, managedDevicesUnitSize),
    showAi: aiPending != null,
    aiQuantity: toDisplayQuantity(aiPending?.quantity, aiUnitSize),
    startDate: (managedDevicesPending?.startDate ?? aiPending?.startDate ?? null) as string | null,
  };

  return {
    status,
    flags: { isTrial, isPendingCancellation, isOverdue, isNearLimits, hasAi, hasPendingPlan },
    updatedPlan,
    device: {
      used: devicesUsed,
      active: activeDevices,
      inactive: inactiveDevices,
      pct: devicePct,
      state: deviceState,
      isPayg: deviceIsPayg,
      allocation: deviceAllocation,
      overage: deviceOverage,
      progressVariant: toProgressVariant(deviceState),
      showProgress: !deviceIsPayg && !isTrial,
    },
    ai: {
      used: aiTokensUsed,
      pct: aiPct,
      state: aiState,
      isPayg: aiIsPayg,
      allocation: aiAllocation,
      overage: aiOverage,
      progressVariant: toProgressVariant(aiState),
      showProgress: !aiIsPayg,
    },
    ui: { warnings, showOverageBlock, accentClass, accentBorderClass },
    billing: { monthlyCost, nextBilling, estimatedOverageCost, latestPendingInvoice, trialExpirationDate },
  };
}
