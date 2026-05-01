'use client';

import { AlertTriangleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type ActionsMenuGroup,
  CircularProgress,
  PageLayout,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { billingUsageViewQuery as BillingUsageViewQueryType } from '@/__generated__/billingUsageViewQuery.graphql';
import { useCancelSubscription } from '../hooks/use-cancel-subscription';
import { BillingUsageSkeleton } from './billing-usage-skeleton';
import { CancelOfferModal } from './cancel-offer-modal';
import { type CancelReason, CancelSubscriptionModal } from './cancel-subscription-modal';
import { SubscriptionCancelledModal } from './subscription-cancelled-modal';

const WARNING_THRESHOLD = 90;
const OVER_THRESHOLD = 100;

type UsageState = 'success' | 'warning' | 'over';

function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

function getUsageState(percentage: number): UsageState {
  if (percentage >= OVER_THRESHOLD) return 'over';
  if (percentage >= WARNING_THRESHOLD) return 'warning';
  return 'success';
}

export function BillingUsageView() {
  return (
    <Suspense fallback={<BillingUsageSkeleton />}>
      <BillingUsageContent />
    </Suspense>
  );
}

function BillingUsageContent() {
  const router = useRouter();
  const data = useLazyLoadQuery<BillingUsageViewQueryType>(
    billingUsageViewQuery,
    {},
    { fetchPolicy: 'store-or-network' },
  );
  const cancelSubscription = useCancelSubscription();
  const [cancelStep, setCancelStep] = useState<'idle' | 'reason' | 'offer' | 'cancelled'>('idle');
  const [cancelReason, setCancelReason] = useState<CancelReason | null>(null);
  const [cancelComment, setCancelComment] = useState<string>('');

  const subscription = data.subscription;
  const subscriptionProducts = subscription?.products ?? [];
  const status = subscription?.status ?? 'ACTIVE';
  const pendingInvoices = subscription?.pendingInvoices ?? [];
  const latestPendingInvoice =
    [...pendingInvoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

  const devicesUsed = subscription?.usage?.devicesUsed ?? 0;
  const activeDevices = subscription?.usage?.activeDevices ?? 0;
  const inactiveDevices = subscription?.usage?.inactiveDevices ?? 0;
  const aiTokensUsed = subscription?.usage?.aiTokensUsed ?? 0;
  const estimatedOverageCost =
    subscription?.currentInvoice?.estimatedOverage != null ? subscription.currentInvoice.estimatedOverage / 100 : 0;

  const managedDevicesProduct = subscriptionProducts.find(p => p.name === 'MANAGED_DEVICES') ?? null;
  const aiProduct = subscriptionProducts.find(p => p.name === 'AI_ASSISTANCE') ?? null;
  const managedDevicesActive = managedDevicesProduct?.packageOptions.find(o => o.status === 'ACTIVE') ?? null;
  const aiActive = aiProduct?.packageOptions.find(o => o.status === 'ACTIVE') ?? null;

  const trialExpirationDate = subscription?.trialExpirationDate ?? null;
  // Trial = no paid period has ever been billed AND no package/PAYG commitment yet.
  // We deliberately ignore `status` because the backend uses several combinations for trial-like
  // states (NOT_ACTIVATED, PENDING_CANCELLATION, etc.) — `currentPeriodEnd == null` plus the
  // absence of any committed product is the authoritative "nothing has been paid for, nothing
  // is even queued for activation" signal.
  const hasAnyCommitment = subscriptionProducts.some(p => p.packageOptions.length > 0 || p.payAsYouGoOption != null);
  const isTrial = trialExpirationDate != null && subscription?.currentPeriodEnd == null && !hasAnyCommitment;
  const isCancelled = !isTrial && (status === 'CANCELED' || status === 'PENDING_CANCELLATION');
  const isOverdue = !isTrial && status === 'PAST_DUE' && pendingInvoices.length > 0;

  const deviceIsPayg = managedDevicesProduct?.payAsYouGoOption != null && managedDevicesActive == null;
  const aiIsPayg = aiProduct?.payAsYouGoOption != null && aiActive == null;

  const hasAi = aiActive != null || aiIsPayg;

  const deviceAllocation = managedDevicesActive?.quantity ?? 0;
  const aiAllocation = aiActive?.quantity ?? 0;

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
      const active = product.packageOptions.find(o => o.status === 'ACTIVE');
      if (!active?.price || !active.quantity) continue;
      const perUnitMonthly = active.billingPeriod === 'YEARLY' ? active.price / 12 : active.price;
      total += perUnitMonthly * active.quantity;
    }
    return total;
  }, [subscriptionProducts]);

  const nextBilling = isCancelled
    ? (subscription?.cancellationEffectiveAt ?? managedDevicesActive?.endDate ?? aiActive?.endDate ?? null)
    : (managedDevicesActive?.endDate ?? aiActive?.endDate ?? subscription?.currentPeriodEnd ?? null);

  const menuActions: ActionsMenuGroup[] = isCancelled
    ? []
    : [
        {
          items: [
            {
              id: 'cancel-subscription',
              label: 'Cancel Subscription',
              icon: <AlertTriangleIcon className="w-6 h-6 text-ods-error" />,
              onClick: () => {
                setCancelReason(null);
                setCancelStep('reason');
              },
              disabled: cancelSubscription.isPending,
            },
          ],
        },
      ];

  const allPayg = deviceIsPayg && (aiIsPayg || !aiProduct);
  const isNearLimits =
    !allPayg && (deviceState === 'warning' || deviceState === 'over' || aiState === 'warning' || aiState === 'over');

  const primaryAction = isCancelled
    ? {
        label: 'Renew Subscription',
        onClick: () => router.push('/settings/billing-usage/subscription'),
        variant: 'primary' as const,
      }
    : isOverdue
      ? {
          label: 'Pay Overage',
          onClick: () => {
            if (latestPendingInvoice) {
              window.location.href = latestPendingInvoice.hostedInvoiceUrl;
            } else {
              router.push('/settings/billing-usage/subscription');
            }
          },
          variant: 'primary' as const,
        }
      : isTrial
        ? {
            label: 'Activate Subscription',
            onClick: () => router.push('/settings/billing-usage/subscription'),
            variant: 'primary' as const,
          }
        : {
            label: 'Update Subscription',
            onClick: () => router.push('/settings/billing-usage/subscription'),
            variant: (isNearLimits ? 'primary' : 'card') as 'primary' | 'card',
          };

  return (
    <PageLayout
      title="Billing & Usage"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      backButton={{ label: 'Back to Settings', onClick: () => router.push('/settings') }}
      actionsVariant={menuActions.length > 0 ? 'menu-primary' : 'primary-buttons'}
      actions={[primaryAction]}
      menuActions={menuActions}
    >
      <div className={cn('grid gap-4', hasAi ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
        <UsageMetricCard
          title="Device Usage"
          value={devicesUsed}
          percentage={devicePct}
          state={deviceState}
          overdue={isOverdue}
          payg={deviceIsPayg}
          hideProgress={isTrial}
        />
        {hasAi && (
          <UsageMetricCard
            title="AI Usage"
            value={aiTokensUsed}
            percentage={aiPct}
            state={aiState}
            overdue={isOverdue}
            payg={aiIsPayg}
          />
        )}
      </div>

      {(warnings.length > 0 || showOverageBlock) && (
        <div className={cn('flex flex-col rounded-md border overflow-hidden bg-ods-card', accentBorderClass)}>
          {warnings.map((w, idx) => (
            <div
              key={w.title}
              className={cn('flex gap-3 p-4 items-start', idx > 0 && cn('border-t', accentBorderClass))}
            >
              <AlertTriangleIcon className={cn('size-6 shrink-0', accentClass)} />
              <div className="flex flex-col gap-1">
                <p className={cn('text-h3 font-bold', accentClass)}>{w.title}</p>
                <p className={cn('text-h4', accentClass)}>{w.description}</p>
              </div>
            </div>
          ))}
          {showOverageBlock && (
            <div className={cn('flex flex-col gap-3 p-4', warnings.length > 0 && cn('border-t', accentBorderClass))}>
              {deviceState === 'over' && <BillingRow label="Device Overage" value={formatCount(deviceOverage)} />}
              {hasAi && aiState === 'over' && <BillingRow label="AI Overage" value={formatCount(aiOverage)} />}
              {estimatedOverageCost > 0 && (
                <BillingRow label="Estimated Overage" value={formatCurrency(estimatedOverageCost)} />
              )}
              <BillingRow label="Next Billing" value={formatDate(nextBilling)} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <SectionBlock title="Current Plan">
          <BillingRow label="Device Package" value={deviceIsPayg ? 'Pay as you go' : formatCount(deviceAllocation)} />
          <BillingRow
            label="AI Package"
            value={aiIsPayg ? 'Pay as you go' : hasAi ? formatCount(aiAllocation) : 'None'}
            muted={!hasAi && !aiIsPayg}
          />
          <BillingRow
            label="Monthly Cost"
            value={isTrial ? 'Free' : formatCurrency(monthlyCost || estimatedOverageCost)}
          />
          {isCancelled ? (
            <BillingRow
              label="Plan ends on"
              warning
              value={
                <>
                  {formatDate(nextBilling)}
                  <AlertTriangleIcon className="size-4 text-ods-warning" />
                </>
              }
            />
          ) : isTrial ? (
            <BillingRow
              label="Trial ends on"
              warning
              value={
                <>
                  {formatDate(trialExpirationDate)}
                  <AlertTriangleIcon className="size-4 text-ods-warning" />
                </>
              }
            />
          ) : (
            <BillingRow label="Next Billing" value={formatDate(nextBilling)} />
          )}
        </SectionBlock>
        <SectionBlock title="Usage Overview">
          <BillingRow label="Active devices" value={formatCount(activeDevices)} />
          <BillingRow label="Inactive devices" value={formatCount(inactiveDevices)} />
          {hasAi && <BillingRow label="AI conversations" value={formatCount(0)} />}
        </SectionBlock>
      </div>

      <CancelSubscriptionModal
        isOpen={cancelStep === 'reason'}
        endDate={nextBilling}
        onClose={() => setCancelStep('idle')}
        onConfirm={(reason, comment) => {
          setCancelReason(reason);
          setCancelComment(comment);
          setCancelStep('offer');
        }}
      />

      <CancelOfferModal
        isOpen={cancelStep === 'offer'}
        reason={cancelReason}
        isPending={cancelSubscription.isPending}
        onClose={() => setCancelStep('idle')}
        onConfirm={() => {
          cancelSubscription.mutate({
            reason: cancelReason ?? undefined,
            description: cancelComment || undefined,
            onSuccess: () => setCancelStep('cancelled'),
          });
        }}
      />

      <SubscriptionCancelledModal
        isOpen={cancelStep === 'cancelled'}
        endDate={nextBilling}
        onClose={() => setCancelStep('idle')}
      />
    </PageLayout>
  );
}

const billingUsageViewQuery = graphql`
  query billingUsageViewQuery {
    subscription {
      id
      status
      currentPeriodEnd
      cancellationEffectiveAt
      trialExpirationDate
      products {
        name
        packageOptions {
          id
          billingPeriod
          quantity
          price
          status
          endDate
        }
        payAsYouGoOption {
          id
          price
        }
      }
      pendingInvoices {
        id
        hostedInvoiceUrl
        amountDue
        currency
        createdAt
      }
      usage {
        devicesUsed
        activeDevices
        inactiveDevices
        aiTokensUsed
      }
      currentInvoice {
        estimatedOverage
        currency
      }
    }
  }
`;

function UsageMetricCard({
  title,
  value,
  percentage,
  state,
  overdue = false,
  payg = false,
  hideProgress = false,
}: {
  title: string;
  value: number;
  percentage: number;
  state: UsageState;
  overdue?: boolean;
  payg?: boolean;
  hideProgress?: boolean;
}) {
  const progressVariant: 'success' | 'warning' | 'error' =
    state === 'success' ? 'success' : overdue ? 'error' : 'warning';
  const pillClass = overdue ? 'bg-ods-error/20 text-ods-error' : 'bg-ods-warning/20 text-ods-warning';
  const showProgress = !payg && !hideProgress;

  return (
    <div className="bg-ods-card border border-ods-border rounded-sm p-[var(--spacing-system-m)] flex gap-[var(--spacing-system-s)] items-center transition-all">
      <div className="flex-1 flex flex-col">
        <p className="text-h5 text-ods-text-secondary uppercase">{title}</p>
        <div className="flex items-center gap-2">
          <p className="text-h2 text-ods-text-primary">{formatCount(value)}</p>
          {!showProgress ? null : state === 'over' ? (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-sm text-h5 font-bold', pillClass)}>
              {percentage}%
            </span>
          ) : (
            <span className="text-h4 text-ods-text-secondary">({percentage}%)</span>
          )}
        </div>
      </div>
      {showProgress && (
        <CircularProgress percentage={percentage} variant={progressVariant} overflow="wrap" showLabel={false} />
      )}
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 h-full">
      <p className="text-h5 text-ods-text-secondary uppercase tracking-[-0.02em]">{title}</p>
      <div className="flex flex-col gap-3 bg-ods-card border border-ods-border rounded-md p-4 flex-1">{children}</div>
    </div>
  );
}

function BillingRow({
  label,
  value,
  muted = false,
  warning = false,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
  warning?: boolean;
}) {
  const valueClass = warning ? 'text-ods-warning' : muted ? 'text-ods-text-secondary' : 'text-ods-text-primary';
  return (
    <div className="flex gap-2 items-center w-full">
      <span className="text-h4 text-ods-text-primary whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-ods-border min-w-4" />
      <span className={cn('text-h4 whitespace-nowrap inline-flex items-center gap-1', valueClass)}>{value}</span>
    </div>
  );
}
