'use client';

import { QuestionCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Card,
  CheckboxBlock,
  Input,
  RadioGroupBlock,
  TabSelector,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';
import { graphql, useFragment } from 'react-relay';
import type { productSubscriptionCardProductFragment$key } from '@/__generated__/productSubscriptionCardProductFragment.graphql';
import type { productSubscriptionCardSubscriptionFragment$key } from '@/__generated__/productSubscriptionCardSubscriptionFragment.graphql';
import { useProductSelection } from '../hooks/use-product-selection';
import type { ProductUpdates } from '../types/subscription.types';
import { buildPackageRadioOptions } from '../utils/build-package-radio-options';
import {
  CUSTOM_OPTION_ID,
  calculateCustomQuantityPrice,
  formatMoney,
  formatPaygSubtitle,
} from '../utils/subscription.utils';

export const productSubscriptionCardProductFragment = graphql`
  fragment productSubscriptionCardProductFragment on Product {
    id
    name
    packageOptions {
      id
      billingPeriod
      name
      priceTiers { from upTo unitPrice }
    }
    payAsYouGoOption {
      id
      name
      description
      price
    }
  }
`;

export const productSubscriptionCardSubscriptionFragment = graphql`
  fragment productSubscriptionCardSubscriptionFragment on SubscriptionProductDetail {
    packageOptions {
      id
      billingPeriod
      quantity
      status
    }
    payAsYouGoOption { id }
  }
`;

interface ProductSubscriptionCardProps {
  productRef: productSubscriptionCardProductFragment$key;
  subscriptionProductRef: productSubscriptionCardSubscriptionFragment$key | null;
  title: string;
  description: string;
  packageUnitLabel: string;
  customLabel: string;
  customSubtitle: string;
  helpText?: ReactNode;
  disabled?: boolean;
  onUpdatesChange: (updates: ProductUpdates) => void;
}

function HelpTooltip({ content }: { content: ReactNode }) {
  const isText = typeof content === 'string';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="More information"
            className="shrink-0 text-ods-text-secondary hover:text-ods-text-primary transition-colors"
          >
            <QuestionCircleIcon className="size-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent align="end" sideOffset={8} className={isText ? 'max-w-xs' : 'p-0 bg-transparent border-0'}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProductSubscriptionCard({
  productRef,
  subscriptionProductRef,
  title,
  description,
  packageUnitLabel,
  customLabel,
  customSubtitle,
  helpText,
  disabled = false,
  onUpdatesChange,
}: ProductSubscriptionCardProps) {
  const product = useFragment(productSubscriptionCardProductFragment, productRef);
  const subscriptionProduct = useFragment(productSubscriptionCardSubscriptionFragment, subscriptionProductRef) ?? null;

  const {
    selection,
    billingPeriodItems,
    allTiers,
    tiers,
    baselineUnitPrice,
    months,
    periodSuffix,
    setPayAsYouGo,
    setBillingPeriod,
    setSelectedPackage,
    setCustomQuantity,
  } = useProductSelection({ product, subscriptionProduct, onUpdatesChange });

  const customPrice =
    selection.selectedPackageId === CUSTOM_OPTION_ID && selection.customQuantity != null
      ? calculateCustomQuantityPrice(selection.customQuantity, allTiers, baselineUnitPrice, months)
      : null;

  const radioOptions = buildPackageRadioOptions({
    tiers,
    baselineUnitPrice,
    months,
    periodSuffix,
    packageUnitLabel,
    customLabel,
    customSubtitle,
    payAsYouGoEnabled: selection.payAsYouGoEnabled,
  });

  return (
    <Card
      className={cn(
        'relative flex flex-1 flex-col gap-6 p-6 bg-ods-bg border-ods-border transition-opacity',
        disabled && 'opacity-50 pointer-events-none',
      )}
      aria-disabled={disabled}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-h2 text-ods-text-primary">{title}</h2>
        {helpText && <HelpTooltip content={helpText} />}
      </div>

      <p className="text-h4 text-ods-text-primary">{description}</p>

      <CheckboxBlock
        checked={selection.payAsYouGoEnabled}
        onCheckedChange={setPayAsYouGo}
        label="Pay as you go"
        description={formatPaygSubtitle(product.payAsYouGoOption)}
      />

      <TabSelector
        value={selection.billingPeriod}
        onValueChange={setBillingPeriod}
        variant="primary"
        items={billingPeriodItems}
        disabled={selection.payAsYouGoEnabled}
      />

      <div className="flex flex-col gap-2 w-full">
        <p className="text-h5 text-ods-text-secondary">Packages</p>
        <div className="flex w-full flex-col overflow-hidden rounded-[6px] border border-ods-border bg-ods-card">
          <RadioGroupBlock
            name={`packages-${product.id}`}
            variant="grouped"
            value={selection.selectedPackageId ?? ''}
            onValueChange={setSelectedPackage}
            disabled={selection.payAsYouGoEnabled}
            options={radioOptions}
            className="[&>div]:!rounded-none [&>div]:!border-0"
          />
          <div
            aria-hidden={selection.selectedPackageId !== CUSTOM_OPTION_ID}
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
              selection.selectedPackageId === CUSTOM_OPTION_ID
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0 pointer-events-none',
            )}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-1 pl-12 pr-3 pb-2">
                <Input
                  type="number"
                  min={1}
                  aria-label={`Number of ${packageUnitLabel}`}
                  value={selection.customQuantity ?? ''}
                  onChange={event => setCustomQuantity(event.target.value)}
                  endAdornment={packageUnitLabel}
                  tabIndex={selection.selectedPackageId === CUSTOM_OPTION_ID ? undefined : -1}
                />
                {customPrice && (
                  <p className="text-h6 text-ods-text-secondary">
                    {`$${formatMoney(customPrice.total)}${periodSuffix}`}
                    {customPrice.discountPercent > 0 && (
                      <span className="text-ods-success"> (-{customPrice.discountPercent}%)</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
