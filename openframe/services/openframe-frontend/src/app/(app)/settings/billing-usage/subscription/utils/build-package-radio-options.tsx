import { TagPercentIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { CUSTOM_OPTION_ID, formatMoney } from './subscription.utils';

interface PriceTier {
  readonly from: number;
  readonly unitPrice: number;
}

interface BuildPackageRadioOptionsArgs {
  tiers: readonly PriceTier[];
  baselineUnitPrice: number | null;
  months: number;
  periodSuffix: string;
  packageUnitLabel: string;
  customLabel: string;
  customSubtitle: string;
  payAsYouGoEnabled: boolean;
}

export function buildPackageRadioOptions({
  tiers,
  baselineUnitPrice,
  months,
  periodSuffix,
  packageUnitLabel,
  customLabel,
  customSubtitle,
  payAsYouGoEnabled,
}: BuildPackageRadioOptionsArgs) {
  const tierOptions = tiers.map(tier => {
    const total = tier.from * tier.unitPrice * months;
    const discountPercent = baselineUnitPrice ? Math.round((1 - tier.unitPrice / baselineUnitPrice) * 100) : 0;
    return {
      value: String(tier.from),
      label: `${tier.from} ${packageUnitLabel}`,
      description: `$${formatMoney(total)}${periodSuffix}`,
      trailing:
        discountPercent > 0 ? (
          <Tag
            variant="success"
            icon={<TagPercentIcon className="size-4" />}
            label={`-${discountPercent}%`}
            disabled={payAsYouGoEnabled}
          />
        ) : undefined,
    };
  });

  return [...tierOptions, { value: CUSTOM_OPTION_ID, label: customLabel, description: customSubtitle }];
}
