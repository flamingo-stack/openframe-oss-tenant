'use client';

import { DashboardInfoCard, InfoCard, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { billingUsageViewQuery as BillingUsageViewQueryType } from '@/__generated__/billingUsageViewQuery.graphql';
import { useCancelSubscription } from '../hooks/use-cancel-subscription';
import { BillingUsageSkeleton } from './billing-usage-skeleton';

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
      }
    }
    deviceFilters {
      statuses { value count }
      filteredCount
    }
  }
`;

const ACTIVE_STATUSES = new Set(['ACTIVE', 'ONLINE']);
const INACTIVE_STATUSES = new Set(['INACTIVE', 'OFFLINE']);

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

  const subscriptionProducts = data.subscription?.products ?? [];
  const deviceFilters = data.deviceFilters;

  const managedDevicesProduct = subscriptionProducts.find(p => p.name === 'MANAGED_DEVICES') ?? null;
  const aiProduct = subscriptionProducts.find(p => p.name === 'AI_ASSISTANCE') ?? null;

  const managedDevicesActive = managedDevicesProduct?.packageOptions.find(o => o.status === 'ACTIVE') ?? null;
  const aiActive = aiProduct?.packageOptions.find(o => o.status === 'ACTIVE') ?? null;

  const deviceAllocation = managedDevicesActive?.quantity ?? 0;
  const aiAllocation = aiActive?.quantity ?? 0;

  const { activeDevices, inactiveDevices } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const statusOption of deviceFilters.statuses) {
      if (ACTIVE_STATUSES.has(statusOption.value)) active += statusOption.count;
      else if (INACTIVE_STATUSES.has(statusOption.value)) inactive += statusOption.count;
    }
    return { activeDevices: active, inactiveDevices: inactive };
  }, [deviceFilters.statuses]);

  const deviceTotal = deviceFilters.filteredCount;
  const devicePct = deviceAllocation > 0 ? Math.min(100, Math.round((deviceTotal / deviceAllocation) * 100)) : 0;

  const aiUsed = 0;
  const aiConversations = 0;
  const aiPct = aiAllocation > 0 ? Math.min(100, Math.round((aiUsed / aiAllocation) * 100)) : 0;

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

  const nextBilling = managedDevicesActive?.endDate ?? aiActive?.endDate ?? data.subscription?.endDate ?? null;

  return (
    <PageLayout
      title="Billing & Usage"
      background="default"
      backButton={{ label: 'Back to Settings', onClick: () => router.push('/settings') }}
      actionsVariant="menu-primary"
      actions={[
        {
          label: 'Update Subscription',
          onClick: () => router.push('/settings/billing-usage/subscription'),
          variant: 'primary',
        },
      ]}
      menuActions={[
        {
          label: 'Cancel Subscription',
          onClick: cancelSubscription.mutate,
          danger: true,
          disabled: cancelSubscription.isPending,
        },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardInfoCard title="Device Usage" value={formatCount(deviceTotal)} percentage={devicePct} showProgress />
        <DashboardInfoCard title="AI Usage" value={formatCount(aiUsed)} percentage={aiPct} showProgress />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col gap-1">
          <p className="text-h5 text-ods-text-secondary uppercase tracking-[-0.02em]">Current Plan</p>
          <InfoCard
            className="h-full"
            data={{
              items: [
                { label: 'Device Package', value: formatCount(deviceAllocation) },
                { label: 'AI Package', value: formatCount(aiAllocation) },
                { label: 'Monthly Cost', value: formatCurrency(monthlyCost) },
                { label: 'Next Billing', value: formatDate(nextBilling) },
              ],
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-h5 text-ods-text-secondary uppercase tracking-[-0.02em]">Usage Overview</p>
          <InfoCard
            className="h-full"
            data={{
              items: [
                { label: 'Active devices', value: formatCount(activeDevices) },
                { label: 'Inactive devices', value: formatCount(inactiveDevices) },
                { label: 'AI conversations', value: formatCount(aiConversations) },
              ],
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
}
