'use client';

import { QuestionCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Input,
  RadioGroupBlock,
  TabSelector,
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
  formatCompact,
  formatMoney,
} from '../utils/subscription.utils';

export const productSubscriptionCardProductFragment = graphql`
  fragment productSubscriptionCardProductFragment on Product {
    id
    name
    unitSize
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
    paygOnly
    packageOptions {
      id
      packageOptionId
      billingPeriod
      quantity
      status
    }
    payAsYouGoOption { id packageOptionId }
  }
`;

interface ProductSubscriptionCardProps {
  productRef: productSubscriptionCardProductFragment$key;
  subscriptionProductRef: productSubscriptionCardSubscriptionFragment$key | null;
  title: string;
  /**
   * Static text, or a builder receiving the selected billing-period label
   * ("monthly" / "yearly") so copy reflects the chosen package type.
   */
  description: string | ((periodLabel: string) => string);
  packageUnitLabel: string;
  customLabel: string;
  customSubtitle: string;
  helpText?: ReactNode;
  disabled?: boolean;
  /** Whether the card offers a Custom Amount option. Defaults to true. */
  allowCustom?: boolean;
  /**
   * Reserve vertical space for the billing-period toggle even when this card
   * has none, so cards stay aligned when a sibling card shows the toggle.
   */
  reserveBillingPeriodSpace?: boolean;
  onUpdatesChange: (updates: ProductUpdates) => void;
}

/**
 * Click-triggered help popover. A hover Tooltip is wrong for this content: it
 * opens after a delay, dismisses on click, and can't scroll — but the rates
 * panel is interactive and can be long. DropdownMenu opens instantly on click,
 * stays open while interacting, and closes only on outside-click / Escape.
 */
function HelpTooltip({ content }: { content: ReactNode }) {
  const isText = typeof content === 'string';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More information"
          className="shrink-0 text-ods-text-secondary hover:text-ods-text-primary transition-colors"
        >
          <QuestionCircleIcon className="size-6" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={isText ? 'max-w-xs' : 'p-0 bg-transparent border-0 shadow-none'}
      >
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
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
  allowCustom = true,
  reserveBillingPeriodSpace = false,
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
    unitSize,
    months,
    periodSuffix,
    setBillingPeriod,
    setSelectedPackage,
    setCustomQuantity,
  } = useProductSelection({ product, subscriptionProduct, onUpdatesChange });

  // customQuantity is the real product count the user typed (same unit the
  // backend stores and prices in); unitSize only constrains its granularity —
  // it must be a positive whole multiple of unitSize.
  const isCustom = selection.selectedPackageId === CUSTOM_OPTION_ID;
  const customQty = selection.customQuantity;
  const customDivisible = customQty != null && customQty > 0 && customQty % unitSize === 0;
  const customNotDivisible = isCustom && customQty != null && customQty > 0 && !customDivisible;

  const customPrice =
    isCustom && customDivisible && customQty != null
      ? calculateCustomQuantityPrice(customQty, allTiers, baselineUnitPrice, months)
      : null;

  const radioOptions = buildPackageRadioOptions({
    tiers,
    baselineUnitPrice,
    months,
    periodSuffix,
    packageUnitLabel,
    customLabel,
    customSubtitle,
    payAsYouGoOption: product.payAsYouGoOption ?? null,
    allowCustom,
  });

  // "MONTHLY" → "monthly" / "YEARLY" → "yearly", so period-aware copy matches
  // the selected package type.
  const periodLabel = selection.billingPeriod.toLowerCase();
  const resolvedDescription = typeof description === 'function' ? description(periodLabel) : description;

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

      <p className="text-h4 text-ods-text-primary">{resolvedDescription}</p>

      {billingPeriodItems.length > 1 ? (
        <TabSelector
          value={selection.billingPeriod}
          onValueChange={setBillingPeriod}
          variant="primary"
          items={billingPeriodItems}
        />
      ) : (
        // Match the TabSelector's h-12 so cards align when a sibling shows the
        // toggle. Only needed in the lg side-by-side layout; below that the cards
        // stack, so the spacer is hidden to avoid an empty gap.
        reserveBillingPeriodSpace && <div aria-hidden className="hidden h-12 lg:block" />
      )}

      <div className="flex flex-col gap-2 w-full">
        <p className="text-h5 text-ods-text-secondary">Packages</p>
        <div className="flex w-full flex-col overflow-hidden rounded-[6px] border border-ods-border bg-ods-card">
          <RadioGroupBlock
            name={`packages-${product.id}`}
            variant="grouped"
            value={disabled ? '' : (selection.selectedPackageId ?? '')}
            onValueChange={setSelectedPackage}
            options={radioOptions}
            className="[&>div]:!rounded-none [&>div]:!border-0"
          />
          {allowCustom && (
            <div
              aria-hidden={disabled || selection.selectedPackageId !== CUSTOM_OPTION_ID}
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
                !disabled && selection.selectedPackageId === CUSTOM_OPTION_ID
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0 pointer-events-none',
              )}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-1 pl-12 pr-3 pb-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Number of ${packageUnitLabel}`}
                    value={selection.customQuantity ?? ''}
                    onChange={event => setCustomQuantity(event.target.value.replace(/\D/g, ''))}
                    endAdornment={packageUnitLabel}
                    tabIndex={!disabled && selection.selectedPackageId === CUSTOM_OPTION_ID ? undefined : -1}
                  />
                  {customNotDivisible ? (
                    <p className="text-h6 text-ods-error">
                      {`Must be a multiple of ${formatCompact(unitSize)} ${packageUnitLabel}`}
                    </p>
                  ) : (
                    customPrice && (
                      <p className="text-h6 text-ods-text-secondary">
                        {`$${formatMoney(customPrice.total)}${periodSuffix}`}
                        {customPrice.discountPercent > 0 && (
                          <span className="text-ods-success"> (-{customPrice.discountPercent}%)</span>
                        )}
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
