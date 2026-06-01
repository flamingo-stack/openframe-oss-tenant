import { TagPercentIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { CUSTOM_OPTION_ID, formatCompact, formatMoney, formatPaygSubtitle, PAYG_OPTION_ID } from './subscription.utils';

interface PriceTier {
  readonly from: number;
  readonly unitPrice: number;
}

interface PayAsYouGoOption {
  readonly description?: string | null;
  readonly name?: string | null;
}

interface BuildPackageRadioOptionsArgs {
  tiers: readonly PriceTier[];
  baselineUnitPrice: number | null;
  months: number;
  periodSuffix: string;
  packageUnitLabel: string;
  customLabel: string;
  customSubtitle: string;
  payAsYouGoOption: PayAsYouGoOption | null;
  /** Products per billable unit (devices: 1, AI tokens: 100_000) — display only. */
  unitSize: number;
  /** PAYG is monthly-only; hidden on the yearly tab. */
  showPayg: boolean;
}

export function buildPackageRadioOptions({
  tiers,
  baselineUnitPrice,
  months,
  periodSuffix,
  packageUnitLabel,
  customLabel,
  customSubtitle,
  payAsYouGoOption,
  unitSize,
  showPayg,
}: BuildPackageRadioOptionsArgs) {
  const paygOption =
    showPayg && payAsYouGoOption
      ? [{ value: PAYG_OPTION_ID, label: 'Pay as you go', description: formatPaygSubtitle(payAsYouGoOption) }]
      : [];

  const tierOptions = tiers.map(tier => {
    const total = tier.from * tier.unitPrice * months;
    const discountPercent = baselineUnitPrice ? Math.round((1 - tier.unitPrice / baselineUnitPrice) * 100) : 0;
    return {
      value: String(tier.from),
      label: `${formatCompact(tier.from * unitSize)} ${packageUnitLabel}`,
      description: `$${formatMoney(total)}${periodSuffix}`,
      trailing:
        discountPercent > 0 ? (
          <Tag variant="success" icon={<TagPercentIcon className="size-4" />} label={`-${discountPercent}%`} />
        ) : undefined,
    };
  });

  return [...paygOption, ...tierOptions, { value: CUSTOM_OPTION_ID, label: customLabel, description: customSubtitle }];
}
