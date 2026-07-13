'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Fragment, type ReactNode, Suspense, useCallback, useState } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { subscriptionSettingsViewQuery as SubscriptionSettingsViewQueryType } from '@/__generated__/subscriptionSettingsViewQuery.graphql';
import { useSubscriptionLock } from '@/app/components/subscription-lock/subscription-lock-context';
import { SubscriptionStatus } from '@/app/components/subscription-lock/subscription-status';
import { TrialEndedBanner } from '@/app/components/subscription-lock/trial-ended-banner';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';
import type { OpenframeProduct, ProductUpdates } from '../types/subscription.types';
import { isPlanChanged } from '../utils/subscription.utils';
import { ModelTokenRates } from './model-token-rates';
import { PlanChangeSummary, type PlanChangeSummaryItem } from './plan-change-summary';
import { ProductSubscriptionCard } from './product-subscription-card';
import { SubscriptionSettingsSkeleton } from './subscription-settings-skeleton';
import { SubscriptionSubmitButton } from './subscription-submit-button';

interface ProductDisplay {
  title: string;
  /** Static text, or a builder receiving the selected period label ("monthly"/"yearly"). */
  description: string | ((periodLabel: string) => string);
  /** Short label used in the Current/New plan comparison block. */
  rowLabel: string;
  packageUnitLabel: string;
  customLabel: string;
  customSubtitle: string;
  helpText?: ReactNode;
  /** Whether the card offers a Custom Amount option. AI tokens are PAYG-only. */
  allowCustom?: boolean;
}

const ADDITIONAL_DEVICES_HELPER_TEXT =
  'You can add more devices anytime. Additional devices beyond your package are charged at pay-as-you-go rates and added to your next invoice.';

const PRODUCT_DISPLAY: Partial<Record<OpenframeProduct, ProductDisplay>> = {
  MANAGED_DEVICES: {
    title: 'Device Management Plan',
    description: periodLabel =>
      `Select the number of devices you'd like to include in your ${periodLabel} subscription plan:`,
    rowLabel: 'Devices',
    packageUnitLabel: 'devices',
    customLabel: 'Custom Amount',
    customSubtitle: 'Choose your number of devices',
  },
  AI_ASSISTANCE: {
    title: 'AI Assistant Add-on',
    description: 'Buy OpenFrame tokens to power your AI assistants across all supported models. One unified balance.',
    rowLabel: 'AI Tokens',
    packageUnitLabel: 'OpenFrame tokens',
    customLabel: 'Custom Amount',
    customSubtitle: 'Choose your number of tokens',
    helpText: <ModelTokenRates />,
    // AI tokens are pay-as-you-go only — no committed Custom Amount.
    allowCustom: false,
  },
};

const subscriptionSettingsViewQuery = graphql`
  query subscriptionSettingsViewQuery {
    billingPlan {
      id
      products {
        id
        name
        packageOptions { billingPeriod }
        ...productSubscriptionCardProductFragment
      }
    }
    subscription {
      id
      products {
        name
        payAsYouGoOption { id }
        packageOptions { packageOptionId status }
        ...productSubscriptionCardSubscriptionFragment
      }
    }
  }
`;

export function SubscriptionSettingsView() {
  return (
    <Suspense fallback={<SubscriptionSettingsSkeleton />}>
      <SubscriptionSettingsContent />
    </Suspense>
  );
}

function SubscriptionSettingsContent() {
  const handleBack = useSafeBack(routes.settings.billingUsage);
  const { status, isLocked, lockCopy } = useSubscriptionLock();
  const data = useLazyLoadQuery<SubscriptionSettingsViewQueryType>(
    subscriptionSettingsViewQuery,
    {},
    { fetchPolicy: 'store-and-network' },
  );
  // No active paid subscription → create a new one via Stripe Checkout instead
  // of an update (no diff/validation gating in that flow).
  const needsCheckout =
    status === SubscriptionStatus.TRIAL ||
    status === SubscriptionStatus.TRIAL_EXPIRED ||
    status === SubscriptionStatus.CANCELED;

  const products = data.billingPlan?.products ?? [];
  const subscriptionProducts = data.subscription?.products ?? [];

  // If any displayed card shows a billing-period (monthly/yearly) toggle, the
  // others reserve the same space so the cards stay vertically aligned. When no
  // card has a toggle, nothing is reserved.
  const anyHasBillingToggle = products.some(
    p =>
      PRODUCT_DISPLAY[p.name] != null &&
      new Set(p.packageOptions.map(opt => opt.billingPeriod).filter(Boolean)).size > 1,
  );

  const [updatesMap, setUpdatesMap] = useState<Partial<Record<OpenframeProduct, ProductUpdates>>>({});

  const handleUpdatesChange = useCallback((productName: OpenframeProduct, updates: ProductUpdates) => {
    setUpdatesMap(prev => ({ ...prev, [productName]: updates }));
  }, []);

  const packageUpdates = products.flatMap(p => updatesMap[p.name]?.packageUpdates ?? []);
  const checkoutProducts = products.map(p => updatesMap[p.name]?.checkout).filter(c => c != null);
  const hasInvalidCustom = products.some(p => {
    const updates = updatesMap[p.name];
    return updates != null && !updates.valid;
  });

  // Current vs selected plan, one row per product.
  const summaryItems: PlanChangeSummaryItem[] = products.flatMap(product => {
    const display = PRODUCT_DISPLAY[product.name];
    const comparison = updatesMap[product.name]?.comparison;
    if (!display || !comparison) return [];
    // Skip products that are neither active today nor being committed to.
    if (!comparison.current && comparison.next.payg) return [];
    return [{ label: display.rowLabel, comparison }];
  });

  // Only meaningful for the update flow (active subscription). Driven by the
  // comparison, not `packageUpdates`, so a valid selection that differs from the
  // current plan always previews — even when the change can't yet be expressed
  // as a mutation (see isPlanChanged).
  const showPlanChange = !needsCheckout && summaryItems.some(item => isPlanChanged(item.comparison));

  return (
    <PageLayout
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      title={isLocked ? undefined : 'Subscription Settings'}
      showHeader={!isLocked}
      backButton={isLocked ? undefined : { label: 'Back', onClick: handleBack }}
    >
      {isLocked && lockCopy && <TrialEndedBanner lockCopy={lockCopy} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {products.map(product => {
          const display = PRODUCT_DISPLAY[product.name];
          if (!display) return null;
          const subProduct = subscriptionProducts.find(sp => sp.name === product.name) ?? null;
          return (
            <Fragment key={product.id}>
              <ProductSubscriptionCard
                productRef={product}
                subscriptionProductRef={subProduct}
                reserveBillingPeriodSpace={anyHasBillingToggle}
                onUpdatesChange={updates => handleUpdatesChange(product.name, updates)}
                {...display}
              />
              {product.name === 'MANAGED_DEVICES' && (
                <p className="text-h6 text-ods-text-secondary lg:hidden">{ADDITIONAL_DEVICES_HELPER_TEXT}</p>
              )}
            </Fragment>
          );
        })}
      </div>

      {showPlanChange && <PlanChangeSummary items={summaryItems} />}

      <div className="hidden md:flex flex-row gap-6 items-center">
        <p className="hidden lg:block text-h6 text-ods-text-secondary flex-1 max-w-[500px]">
          {ADDITIONAL_DEVICES_HELPER_TEXT}
        </p>
        <div className="flex flex-1 justify-end">
          <SubscriptionSubmitButton
            needsCheckout={needsCheckout}
            packageUpdates={packageUpdates}
            checkoutProducts={checkoutProducts}
            hasInvalidCustom={hasInvalidCustom}
          />
        </div>
      </div>

      {/* Fixed (not sticky) so the bar always pins to the bottom of the viewport,
          even when the page is shorter than the screen — sticky only engages while
          scrolling, leaving the bar stranded mid-page on short content. The app's
          <main> reserves pb-20 for exactly this bar. */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-20 border-t border-ods-border bg-ods-card p-[var(--spacing-system-l)]">
        <div className="flex">
          <SubscriptionSubmitButton
            needsCheckout={needsCheckout}
            packageUpdates={packageUpdates}
            checkoutProducts={checkoutProducts}
            hasInvalidCustom={hasInvalidCustom}
            className="w-full"
          />
        </div>
      </div>
    </PageLayout>
  );
}
