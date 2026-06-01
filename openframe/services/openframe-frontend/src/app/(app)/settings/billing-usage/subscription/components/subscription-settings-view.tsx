'use client';

import { CheckboxBlock, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Fragment, type ReactNode, Suspense, useCallback, useState } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { subscriptionSettingsViewQuery as SubscriptionSettingsViewQueryType } from '@/__generated__/subscriptionSettingsViewQuery.graphql';
import { useSubscriptionLock } from '@/app/components/subscription-lock/subscription-lock-context';
import { SubscriptionStatus } from '@/app/components/subscription-lock/subscription-status';
import { TrialEndedBanner } from '@/app/components/subscription-lock/trial-ended-banner';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import type { OpenframeProduct, ProductUpdates } from '../types/subscription.types';
import { buildProductCancelUpdates } from '../utils/subscription.utils';
import { ModelTokenRates } from './model-token-rates';
import { ProductSubscriptionCard } from './product-subscription-card';
import { SubscriptionSettingsSkeleton } from './subscription-settings-skeleton';
import { SubscriptionSubmitButton } from './subscription-submit-button';

interface ProductDisplay {
  title: string;
  description: string;
  packageUnitLabel: string;
  customLabel: string;
  customSubtitle: string;
  helpText?: ReactNode;
}

const ADDITIONAL_DEVICES_HELPER_TEXT =
  'You can add more devices anytime. Additional devices beyond your package are charged at $5/device and added to your next invoice.';

const PRODUCT_DISPLAY: Partial<Record<OpenframeProduct, ProductDisplay>> = {
  MANAGED_DEVICES: {
    title: 'Device Management Plan',
    description: "Select the number of devices you'd like to include in your monthly subscription plan:",
    packageUnitLabel: 'devices',
    customLabel: 'Custom Amount',
    customSubtitle: 'Choose your number of devices',
  },
  AI_ASSISTANCE: {
    title: 'AI Assistant Add-on',
    description: 'Buy OpenFrame tokens to power your AI assistants across all supported models. One unified balance.',
    packageUnitLabel: 'OpenFrame tokens',
    customLabel: 'Custom Amount',
    customSubtitle: 'Choose your number of tokens',
    helpText: <ModelTokenRates />,
  },
};

const subscriptionSettingsViewQuery = graphql`
  query subscriptionSettingsViewQuery {
    billingPlan {
      id
      products {
        id
        name
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
  const handleBack = useSafeBack('/settings/billing-usage');
  const { status, isLocked, lockCopy } = useSubscriptionLock();
  const data = useLazyLoadQuery<SubscriptionSettingsViewQueryType>(
    subscriptionSettingsViewQuery,
    {},
    { fetchPolicy: 'store-or-network' },
  );
  // No active paid subscription → create a new one via Stripe Checkout instead
  // of an update (no diff/validation gating in that flow).
  const needsCheckout =
    status === SubscriptionStatus.TRIAL ||
    status === SubscriptionStatus.TRIAL_EXPIRED ||
    status === SubscriptionStatus.CANCELED;

  const products = data.billingPlan?.products ?? [];
  const subscriptionProducts = data.subscription?.products ?? [];

  const [aiEnabled, setAiEnabled] = useState(true);

  const [updatesMap, setUpdatesMap] = useState<Partial<Record<OpenframeProduct, ProductUpdates>>>({});

  const handleUpdatesChange = useCallback((productName: OpenframeProduct, updates: ProductUpdates) => {
    setUpdatesMap(prev => ({ ...prev, [productName]: updates }));
  }, []);

  const considered = products.filter(p => !(p.name === 'AI_ASSISTANCE' && !aiEnabled));
  const aiCancelUpdates = aiEnabled
    ? []
    : buildProductCancelUpdates('AI_ASSISTANCE', subscriptionProducts.find(sp => sp.name === 'AI_ASSISTANCE') ?? null);
  const packageUpdates = [...considered.flatMap(p => updatesMap[p.name]?.packageUpdates ?? []), ...aiCancelUpdates];
  const checkoutProducts = considered.map(p => updatesMap[p.name]?.checkout).filter(c => c != null);
  const hasInvalidCustom = considered.some(p => {
    const updates = updatesMap[p.name];
    return updates != null && !updates.valid;
  });

  return (
    <PageLayout
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      title={isLocked ? undefined : 'Subscription Settings'}
      showHeader={!isLocked}
      backButton={isLocked ? undefined : { label: 'Back', onClick: handleBack }}
    >
      {isLocked && lockCopy && <TrialEndedBanner lockCopy={lockCopy} />}

      <CheckboxBlock
        checked={aiEnabled}
        onCheckedChange={setAiEnabled}
        label="Enable AI Assistants"
        description="Enhance your workflow with AI assistants."
      />

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
                disabled={product.name === 'AI_ASSISTANCE' && !aiEnabled}
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

      <div className="md:hidden sticky bottom-0 z-10 -mx-[var(--spacing-system-l)] border-t border-ods-border bg-ods-card px-[var(--spacing-system-l)] py-4">
        <div className="flex justify-end">
          <SubscriptionSubmitButton
            needsCheckout={needsCheckout}
            packageUpdates={packageUpdates}
            checkoutProducts={checkoutProducts}
            hasInvalidCustom={hasInvalidCustom}
          />
        </div>
      </div>
    </PageLayout>
  );
}
