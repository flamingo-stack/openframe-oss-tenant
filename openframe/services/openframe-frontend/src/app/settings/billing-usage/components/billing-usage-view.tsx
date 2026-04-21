'use client';

import { AlertTriangleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, CircularProgress, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { format, parseISO } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { billingUsageViewQuery as BillingUsageViewQueryType } from '@/__generated__/billingUsageViewQuery.graphql';
import { useCancelSubscription } from '../hooks/use-cancel-subscription';
import {
  BILLING_USAGE_MOCKS,
  type BillingUsageMock,
  type BillingUsageMockKey,
  isBillingUsageMockKey,
} from '../mocks/billing-usage-mocks';
import { BillingUsageSkeleton } from './billing-usage-skeleton';
import { CancelOfferModal } from './cancel-offer-modal';
import { type CancelReason, CancelSubscriptionModal } from './cancel-subscription-modal';
import { SubscriptionCancelledModal } from './subscription-cancelled-modal';

const WARNING_THRESHOLD = 90;
const OVER_THRESHOLD = 100;

type UsageState = 'success' | 'warning' | 'over';

const EMPTY_USAGE = {
  devicesUsed: 0,
  activeDevices: 0,
  inactiveDevices: 0,
  aiUsed: 0,
  aiConversations: 0,
} as const;

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
  const searchParams = useSearchParams();
  const mockKey = searchParams.get('mock');
  const data = useLazyLoadQuery<BillingUsageViewQueryType>(
    billingUsageViewQuery,
    {},
    { fetchPolicy: 'store-or-network' },
  );
  const cancelSubscription = useCancelSubscription();
  const [cancelStep, setCancelStep] = useState<'idle' | 'reason' | 'offer' | 'cancelled'>('idle');
  const [cancelReason, setCancelReason] = useState<CancelReason | null>(null);

  const setMock = useCallback(
    (key: BillingUsageMockKey | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key) params.set('mock', key);
      else params.delete('mock');
      const qs = params.toString();
      router.replace(qs ? `/settings/billing-usage?${qs}` : '/settings/billing-usage');
    },
    [router, searchParams],
  );

  const source: BillingUsageMock = isBillingUsageMockKey(mockKey)
    ? BILLING_USAGE_MOCKS[mockKey]
    : { subscription: data.subscription ?? null, usage: EMPTY_USAGE };

  const subscription = source.subscription;
  const usage = source.usage;
  const isMock = isBillingUsageMockKey(mockKey);

  const subscriptionProducts = subscription?.products ?? [];
  const managedDevicesProduct = subscriptionProducts.find(p => p.name === 'MANAGED_DEVICES') ?? null;
  const aiProduct = subscriptionProducts.find(p => p.name === 'AI_ASSISTANCE') ?? null;
  const managedDevicesActive = managedDevicesProduct?.packageOptions.find(o => o.status === 'ACTIVE') ?? null;
  const aiActive = aiProduct?.packageOptions.find(o => o.status === 'ACTIVE') ?? null;

  const deviceIsPayg = managedDevicesProduct?.payAsYouGoOption != null && managedDevicesActive == null;
  const aiIsPayg = aiProduct?.payAsYouGoOption != null && aiActive == null;

  const hasAi = aiActive != null || aiIsPayg;

  const deviceAllocation = managedDevicesActive?.quantity ?? 0;
  const aiAllocation = aiActive?.quantity ?? 0;

  const devicePct = deviceAllocation > 0 ? Math.round((usage.devicesUsed / deviceAllocation) * 100) : 0;
  const aiPct = aiAllocation > 0 ? Math.round((usage.aiUsed / aiAllocation) * 100) : 0;

  const deviceState: UsageState = deviceIsPayg ? 'success' : getUsageState(devicePct);
  const aiState: UsageState = aiIsPayg ? 'success' : hasAi ? getUsageState(aiPct) : 'success';

  const deviceOverage = Math.max(0, usage.devicesUsed - deviceAllocation);
  const aiOverage = Math.max(0, usage.aiUsed - aiAllocation);

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
  const isOverdue = showOverageBlock && usage.overdue === true;
  const isCancelled = usage.cancelled === true;
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

  const nextBilling = managedDevicesActive?.endDate ?? aiActive?.endDate ?? subscription?.endDate ?? null;

  const menuActions =
    isMock || isOverdue || isCancelled
      ? []
      : [
          {
            label: 'Cancel Subscription',
            onClick: () => {
              setCancelReason(null);
              setCancelStep('reason');
            },
            danger: true,
            disabled: cancelSubscription.isPending,
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
      background="default"
      backButton={{ label: 'Back to Settings', onClick: () => router.push('/settings') }}
      actionsVariant={menuActions.length > 0 ? 'menu-primary' : 'primary-buttons'}
      actions={[primaryAction]}
      menuActions={menuActions}
    >
      <MockPreviewToolbar currentKey={isBillingUsageMockKey(mockKey) ? mockKey : null} onChange={setMock} />

      <div className={cn('grid gap-4', hasAi ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
        <UsageMetricCard
          title="Device Usage"
          value={usage.devicesUsed}
          percentage={devicePct}
          state={deviceState}
          overdue={isOverdue}
          payg={deviceIsPayg}
        />
        {hasAi && (
          <UsageMetricCard
            title="AI Usage"
            value={usage.aiUsed}
            percentage={aiPct}
            state={aiState}
            overdue={isOverdue}
            payg={aiIsPayg}
          />
        )}
      </div>

      {(warnings.length > 0 || showOverageBlock) && (
        <div className={cn('flex flex-col rounded-md border overflow-hidden', accentBorderClass)}>
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
              {usage.estimatedOverageCost != null && (
                <BillingRow label="Estimated Overage" value={formatCurrency(usage.estimatedOverageCost)} />
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
          <BillingRow label="Monthly Cost" value={formatCurrency(monthlyCost || usage.estimatedOverageCost || 0)} />
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
          ) : (
            <BillingRow label="Next Billing" value={formatDate(nextBilling)} />
          )}
        </SectionBlock>
        <SectionBlock title="Usage Overview">
          <BillingRow label="Active devices" value={formatCount(usage.activeDevices)} />
          <BillingRow label="Inactive devices" value={formatCount(usage.inactiveDevices)} />
          {hasAi && <BillingRow label="AI conversations" value={formatCount(usage.aiConversations)} />}
        </SectionBlock>
      </div>

      <CancelSubscriptionModal
        isOpen={cancelStep === 'reason'}
        endDate={nextBilling}
        onClose={() => setCancelStep('idle')}
        onConfirm={reason => {
          setCancelReason(reason);
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

const MOCK_PRESETS: ReadonlyArray<{ key: BillingUsageMockKey | null; label: string }> = [
  { key: null, label: 'Live (empty)' },
  { key: 'full', label: 'Full' },
  { key: 'device-only', label: 'Device only' },
  { key: 'warning-full', label: 'Warning' },
  { key: 'warning-device-only', label: 'Warning (dev only)' },
  { key: 'over-full', label: 'Overage' },
  { key: 'over-device-only', label: 'Overage (dev only)' },
  { key: 'over-ai-only', label: 'Overage (AI only)' },
  { key: 'over-device-only-full', label: 'Overage (dev full)' },
  { key: 'payg-full', label: 'Pay-as-you-go' },
  { key: 'cancelled-full', label: 'Cancelled' },
  { key: 'overdue-full', label: 'Overdue' },
  { key: 'overdue-device-only', label: 'Overdue (dev only)' },
];

function MockPreviewToolbar({
  currentKey,
  onChange,
}: {
  currentKey: BillingUsageMockKey | null;
  onChange: (key: BillingUsageMockKey | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-dashed border-ods-border bg-ods-card">
      <span className="text-h6 text-ods-text-secondary px-2">Preview state:</span>
      {MOCK_PRESETS.map(({ key, label }) => {
        const isActive = currentKey === key;
        return (
          <Button
            key={key ?? 'live'}
            size="sm"
            variant={isActive ? 'primary' : 'outline'}
            onClick={() => onChange(key)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}

const billingUsageViewQuery = graphql`
  query billingUsageViewQuery {
    subscription {
      id
      endDate
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
}: {
  title: string;
  value: number;
  percentage: number;
  state: UsageState;
  overdue?: boolean;
  payg?: boolean;
}) {
  const progressVariant: 'success' | 'warning' | 'error' =
    state === 'success' ? 'success' : overdue ? 'error' : 'warning';
  const pillClass = overdue ? 'bg-ods-error/20 text-ods-error' : 'bg-ods-warning/20 text-ods-warning';
  const cappedPercentage = Math.min(100, percentage);

  return (
    <div className="bg-ods-card border border-ods-border rounded-sm p-[var(--spacing-system-m)] flex gap-[var(--spacing-system-s)] items-center transition-all">
      <div className="flex-1 flex flex-col">
        <p className="text-h5 text-ods-text-secondary uppercase">{title}</p>
        <div className="flex items-center gap-2">
          <p className="text-h2 text-ods-text-primary">{formatCount(value)}</p>
          {payg ? null : state === 'over' ? (
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-sm text-h5 font-bold', pillClass)}>
              {percentage}%
            </span>
          ) : (
            <span className="text-h4 text-ods-text-secondary">({percentage}%)</span>
          )}
        </div>
      </div>
      {!payg && <CircularProgress percentage={cappedPercentage} variant={progressVariant} showLabel={false} />}
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
