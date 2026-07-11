'use client';

import { AlertTriangleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type ActionsMenuGroup,
  DashboardInfoCard,
  PageLayout,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { billingUsageViewQuery as BillingUsageViewQueryType } from '@/__generated__/billingUsageViewQuery.graphql';
import { SubscriptionStatus } from '@/app/components/subscription-lock/subscription-status';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { featureFlags } from '@/lib/feature-flags';
import { routes } from '@/lib/routes';
import { useBillingSummary } from '../hooks/use-billing-summary';
import { useCancelSubscription } from '../hooks/use-cancel-subscription';
import { useCancellationImpact } from '../hooks/use-cancellation-impact';
import { useResumeSubscription } from '../hooks/use-resume-subscription';
import { formatCount, formatCurrency, formatDateOrDash } from '../lib/format';
import { BillingRow, SectionBlock, TestModeBanner } from './billing-section';
import { BillingUsageSkeleton } from './billing-usage-skeleton';
import { CancelOfferModal } from './cancel-offer-modal';
import { type CancelReason, CancelSubscriptionModal } from './cancel-subscription-modal';
import { InvoicesHistory } from './invoices-history';
import { SubscriptionCancelledModal } from './subscription-cancelled-modal';

export function BillingUsageView() {
  return (
    <Suspense fallback={<BillingUsageSkeleton />}>
      <BillingUsageContent />
    </Suspense>
  );
}

function BillingUsageContent() {
  const router = useRouter();
  const handleBack = useSafeBack(routes.settings.root());
  // Bumped after a resume so the billing query refetches from the network — the
  // resumeSubscription mutation returns a bare Boolean, so the Relay store can't
  // reflect the new status on its own.
  const [refreshKey, setRefreshKey] = useState(0);
  const data = useLazyLoadQuery<BillingUsageViewQueryType>(
    billingUsageViewQuery,
    {},
    { fetchPolicy: 'store-and-network', fetchKey: refreshKey },
  );
  const cancelSubscription = useCancelSubscription();
  const resumeSubscription = useResumeSubscription();
  const [cancelStep, setCancelStep] = useState<'idle' | 'reason' | 'offer' | 'cancelled'>('idle');
  const [cancelReason, setCancelReason] = useState<CancelReason | null>(null);
  const [cancelComment, setCancelComment] = useState<string>('');

  const { status, flags, device, ai, ui, billing, updatedPlan } = useBillingSummary(data.subscription);
  const { impact, isLoading: isImpactLoading } = useCancellationImpact({ enabled: cancelStep === 'reason' });

  // `Next Payment` comes straight from the backend's server-computed
  // `subscription.nextPayment` (projected next-invoice total). The row is
  // omitted when there's nothing to bill (null / 0) or while the user is on
  // an active trial — instead of rendering a "Free" placeholder.
  const nextPaymentAmount = billing.nextPayment ?? 0;

  const menuActions: ActionsMenuGroup[] =
    status === SubscriptionStatus.ACTIVE && featureFlags.cancelSubscription.enabled()
      ? [
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
        ]
      : [];

  const primaryAction = flags.isPendingCancellation
    ? {
        label: 'Renew Subscription',
        // Still inside the paid period → clear the scheduled cancellation in
        // place via resumeSubscription (no checkout needed), then refetch.
        onClick: () => resumeSubscription.mutate({ onSuccess: () => setRefreshKey(k => k + 1) }),
        variant: 'accent' as const,
        loading: resumeSubscription.isPending,
        disabled: resumeSubscription.isPending,
      }
    : flags.isOverdue
      ? {
          label: 'Pay Overage',
          onClick: () => {
            if (billing.latestPendingInvoice) {
              window.location.href = billing.latestPendingInvoice.hostedInvoiceUrl;
            } else {
              router.push(routes.settings.billingSubscription);
            }
          },
          variant: 'accent' as const,
        }
      : flags.isTrial
        ? {
            label: 'Activate Subscription',
            onClick: () => router.push(routes.settings.billingSubscription),
            variant: 'accent' as const,
          }
        : {
            label: 'Update Subscription',
            onClick: () => router.push(routes.settings.billingSubscription),
            variant: (flags.isNearLimits ? 'accent' : 'outline') as 'accent' | 'outline',
          };

  return (
    <PageLayout
      title="Billing & Usage"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      backButton={{ label: 'Back', onClick: handleBack }}
      actionsVariant={menuActions.length > 0 ? 'menu-primary' : 'primary-buttons'}
      actions={[primaryAction]}
      menuActions={menuActions}
    >
      <TestModeBanner />

      <div
        className={cn('grid gap-[var(--spacing-system-m)]', flags.hasAi ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}
      >
        <DashboardInfoCard
          title="Device Usage"
          value={device.used}
          // PAYG has no package limit, so no percentage — just the usage count.
          percentage={device.isPayg ? undefined : device.pct}
          progressVariant={device.progressVariant}
          showProgress={device.showProgress}
          progressOverflow="wrap"
        />
        {flags.hasAi && (
          <DashboardInfoCard
            title="AI Usage"
            value={ai.used}
            percentage={ai.isPayg ? undefined : ai.pct}
            progressVariant={ai.progressVariant}
            showProgress={ai.showProgress}
            progressOverflow="wrap"
          />
        )}
      </div>

      {(ui.warnings.length > 0 || ui.showOverageBlock) && (
        <div className={cn('flex flex-col rounded-md border overflow-hidden bg-ods-card', ui.accentBorderClass)}>
          {ui.warnings.map((w, idx) => (
            <div
              key={w.title}
              className={cn(
                'flex gap-[var(--spacing-system-m)] p-[var(--spacing-system-m)] items-start',
                idx > 0 && cn('border-t', ui.accentBorderClass),
              )}
            >
              <AlertTriangleIcon className={cn('size-6 shrink-0', ui.accentClass)} />
              <div className="flex flex-col gap-1">
                <p className={cn('text-h3 font-bold', ui.accentClass)}>{w.title}</p>
                <p className={cn('text-h4', ui.accentClass)}>{w.description}</p>
              </div>
            </div>
          ))}
          {ui.showOverageBlock && (
            <div
              className={cn(
                'flex flex-col gap-[var(--spacing-system-m)] p-[var(--spacing-system-m)]',
                ui.warnings.length > 0 && cn('border-t', ui.accentBorderClass),
              )}
            >
              {device.state === 'over' && <BillingRow label="Device Overage" value={formatCount(device.overage)} />}
              {flags.hasAi && ai.state === 'over' && <BillingRow label="AI Overage" value={formatCount(ai.overage)} />}
              <BillingRow label="Next Billing" value={formatDateOrDash(billing.nextBilling)} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-l)] items-stretch">
        <SectionBlock title="Current Plan">
          <BillingRow
            label="Device Package"
            value={flags.isTrial ? 'Unlimited' : device.isPayg ? 'Pay as you go' : formatCount(device.allocation)}
          />
          <BillingRow
            label="AI Package"
            value={ai.isPayg ? 'Pay as you go' : flags.hasAi ? formatCount(ai.allocation) : 'None'}
            muted={!flags.hasAi && !ai.isPayg}
          />
          {!flags.isTrial && nextPaymentAmount > 0 && (
            <BillingRow label="Next Payment" value={formatCurrency(nextPaymentAmount)} />
          )}
          {flags.isPendingCancellation ? (
            <BillingRow
              label="Plan ends on"
              warning
              value={
                <>
                  {formatDateOrDash(billing.nextBilling)}
                  <AlertTriangleIcon className="size-4 text-ods-warning" />
                </>
              }
            />
          ) : flags.isTrial ? (
            <BillingRow
              label="Trial ends on"
              warning
              value={
                <>
                  {formatDateOrDash(billing.trialExpirationDate)}
                  <AlertTriangleIcon className="size-4 text-ods-warning" />
                </>
              }
            />
          ) : null}
        </SectionBlock>
        <SectionBlock title="Usage Overview">
          <BillingRow label="Active devices" value={formatCount(device.active)} />
          <BillingRow label="Inactive devices" value={formatCount(device.inactive)} />
        </SectionBlock>
      </div>

      {flags.hasPendingPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-l)] items-start">
          <SectionBlock title="Updated Plan">
            {updatedPlan.showDevice && (
              <BillingRow label="Device Package" value={formatCount(updatedPlan.deviceQuantity)} />
            )}
            {updatedPlan.showAi && <BillingRow label="AI Package" value={formatCount(updatedPlan.aiQuantity)} />}
            <BillingRow
              label="Plan Starts on"
              warning
              value={
                <>
                  {formatDateOrDash(updatedPlan.startDate)}
                  <AlertTriangleIcon className="size-4 text-ods-warning" />
                </>
              }
            />
          </SectionBlock>
        </div>
      )}

      <InvoicesHistory invoices={data.subscription?.pendingInvoices ?? []} />

      <CancelSubscriptionModal
        isOpen={cancelStep === 'reason'}
        endDate={billing.nextBilling}
        isStatsLoading={isImpactLoading}
        stats={
          impact
            ? {
                activeDevices: device.active,
                tickets: impact.tickets,
                kbArticles: impact.kbArticles,
                scripts: impact.scripts,
                monitoringPolicies: impact.monitoringPolicies,
                savedQueries: impact.savedQueries,
              }
            : undefined
        }
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
            onSuccess: () => {
              setCancelStep('cancelled');
              // Force the mounted billing query to re-request now that the store
              // was invalidated, so the page reflects the pending-cancellation state.
              setRefreshKey(k => k + 1);
            },
          });
        }}
      />

      <SubscriptionCancelledModal
        isOpen={cancelStep === 'cancelled'}
        // After the successful cancel invalidates the store and the query
        // refetches, cancellationEffectiveAt is populated; fall back to the
        // period end until that lands.
        endDate={billing.cancellationEffectiveAt ?? billing.nextBilling}
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
          startDate
          endDate
        }
        payAsYouGoOption {
          id
          price
        }
      }
      pendingInvoices {
        id
        invoiceNumber
        status
        hostedInvoiceUrl
        amountDue
        currency
        createdAt
        dueDate
      }
      usage {
        devicesUsed
        activeDevices
        inactiveDevices
        aiTokensUsed
      }
      # Projected next-invoice total, computed server-side (PAYG overage accrued
      # so far + package charges due next cycle). This is the SSOT for the
      # "Next Payment" row — the UI no longer re-derives it from product prices.
      nextPayment
    }
  }
`;
