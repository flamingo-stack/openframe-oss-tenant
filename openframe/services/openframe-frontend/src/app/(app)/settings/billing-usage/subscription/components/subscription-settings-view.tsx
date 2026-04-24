'use client';

import { Button, CheckboxBlock, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { type ReactNode, Suspense, useCallback, useState } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { subscriptionSettingsViewQuery as SubscriptionSettingsViewQueryType } from '@/__generated__/subscriptionSettingsViewQuery.graphql';
import { useSubscriptionLock } from '@/app/components/subscription-lock/subscription-lock-context';
import { TrialEndedBanner } from '@/app/components/subscription-lock/trial-ended-banner';
import { useUpdateSubscription } from '../hooks/use-update-subscription';
import type { OpenframeProduct, ProductUpdates } from '../types/subscription.types';
import { ModelTokenRates } from './model-token-rates';
import { ProductSubscriptionCard } from './product-subscription-card';
import { SubscriptionSettingsSkeleton } from './subscription-settings-skeleton';

interface ProductDisplay {
  title: string;
  description: string;
  packageUnitLabel: string;
  customLabel: string;
  customSubtitle: string;
  helpText?: ReactNode;
}

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
  const router = useRouter();
  const { isLocked, copy } = useSubscriptionLock();
  const data = useLazyLoadQuery<SubscriptionSettingsViewQueryType>(
    subscriptionSettingsViewQuery,
    {},
    { fetchPolicy: 'store-or-network' },
  );
  const updateSubscription = useUpdateSubscription();

  const products = data.billingPlan?.products ?? [];
  const subscriptionProducts = data.subscription?.products ?? [];

  const [aiEnabled, setAiEnabled] = useState(true);

  const [updatesMap, setUpdatesMap] = useState<Partial<Record<OpenframeProduct, ProductUpdates>>>({});

  const handleUpdatesChange = useCallback((productName: OpenframeProduct, updates: ProductUpdates) => {
    setUpdatesMap(prev => ({ ...prev, [productName]: updates }));
  }, []);

  const handleSubmit = () => {
    const packageUpdates = [];
    const paygUpdates = [];
    for (const product of products) {
      if (product.name === 'AI_ASSISTANCE' && !aiEnabled) continue;
      const updates = updatesMap[product.name];
      if (!updates) continue;
      packageUpdates.push(...updates.packageUpdates);
      paygUpdates.push(...updates.paygUpdates);
    }
    if (!packageUpdates.length && !paygUpdates.length) return;
    updateSubscription.mutate({ packageUpdates, paygUpdates });
  };

  const submitLabel = isLocked && copy ? copy.ctaLabel : 'Update Subscription';

  return (
    <PageLayout
      title={isLocked ? undefined : 'Subscription Settings'}
      background="default"
      showHeader={!isLocked}
      backButton={
        isLocked
          ? undefined
          : { label: 'Back to Billing & Usage', onClick: () => router.push('/settings/billing-usage') }
      }
    >
      {isLocked && copy && <TrialEndedBanner copy={copy} />}

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
            <ProductSubscriptionCard
              key={product.id}
              productRef={product}
              subscriptionProductRef={subProduct}
              disabled={product.name === 'AI_ASSISTANCE' && !aiEnabled}
              onUpdatesChange={updates => handleUpdatesChange(product.name, updates)}
              {...display}
            />
          );
        })}
      </div>

      <div className="flex flex-row gap-6 items-center">
        <p className="hidden lg:block text-h6 text-ods-text-secondary flex-1 max-w-[500px]">
          You can add more devices anytime. Additional devices beyond your package are charged at $5/device and added to
          your next invoice.
        </p>
        <div className="flex flex-1 justify-end">
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={updateSubscription.isPending}
            disabled={updateSubscription.isPending}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
