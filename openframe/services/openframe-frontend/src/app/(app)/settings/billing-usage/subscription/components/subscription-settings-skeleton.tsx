'use client';

import { QuestionCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, PageLayout, Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';

// Static copy that never depends on the server response, so we render it for
// real and skeleton only the server-derived option rows/prices.
const ADDITIONAL_DEVICES_HELPER_TEXT =
  'You can add more devices anytime. Additional devices beyond your package are charged at pay-as-you-go rates and added to your next invoice.';

export function SubscriptionSettingsSkeleton() {
  const handleBack = useSafeBack(routes.settings.billingUsage);

  return (
    <PageLayout
      title="Subscription Settings"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      backButton={{ label: 'Back', onClick: handleBack }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ProductCardSkeleton
          title="Device Management Plan"
          description="Select the number of devices you'd like to include in your yearly subscription plan:"
          customLabel="Custom Amount"
          customSubtitle="Choose your number of devices"
          tierRows={1}
        />
        <ProductCardSkeleton
          title="AI Assistant Add-on"
          description="Buy OpenFrame tokens to power your AI assistants across all supported models. One unified balance."
          withHelp
        />
      </div>

      <div className="flex flex-col-reverse justify-between lg:flex-row gap-6 lg:items-center">
        <p className="hidden lg:block text-h6 text-ods-text-secondary flex-1 max-w-[500px]">
          {ADDITIONAL_DEVICES_HELPER_TEXT}
        </p>
        <div className="flex flex-1 justify-end">
          <Button variant="accent" disabled>
            Update Subscription
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

// A grouped radio row: real circle placeholder, real label (when known),
// skeleton the server-derived subtitle/price.
function RadioRow({
  label,
  subtitle,
  trailing,
  children,
}: {
  label?: string;
  subtitle?: string;
  trailing?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-ods-border last:border-b-0">
      <div className="flex items-center gap-3 px-3 py-3">
        <Skeleton className="h-6 w-6 rounded-full shrink-0" />
        <div className="flex flex-col gap-1 flex-1">
          {label ? <span className="text-h4 text-ods-text-primary">{label}</span> : <Skeleton className="h-5 w-32" />}
          {subtitle ? (
            <span className="text-h6 text-ods-text-secondary">{subtitle}</span>
          ) : (
            <Skeleton className="h-4 w-44" />
          )}
        </div>
        {trailing && <Skeleton className="h-8 w-14 rounded-md shrink-0" />}
      </div>
      {children}
    </div>
  );
}

// Mirrors a ProductSubscriptionCard: real title/description/"Packages" label and
// the static PAYG + Custom option labels; the tier rows and every price/subtitle
// come from the server, so those stay skeletons.
function ProductCardSkeleton({
  title,
  description,
  customLabel,
  customSubtitle,
  tierRows = 0,
  withHelp = false,
}: {
  title: string;
  description: string;
  customLabel?: string;
  customSubtitle?: string;
  tierRows?: number;
  withHelp?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 bg-ods-bg border border-ods-border rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-h2 text-ods-text-primary">{title}</h2>
        {withHelp && <QuestionCircleIcon className="size-6 text-ods-text-secondary shrink-0" />}
      </div>
      <p className="text-h4 text-ods-text-primary">{description}</p>

      <div className="flex flex-col gap-2">
        <p className="text-h5 text-ods-text-secondary">Packages</p>
        <div className="flex flex-col rounded-md border border-ods-border bg-ods-card overflow-hidden">
          {/* Pay as you go — static label, server-provided subtitle. */}
          <RadioRow label="Pay as you go" />
          {/* Committed tiers — fully server-derived. */}
          {Array.from({ length: tierRows }, (_, idx) => (
            <RadioRow key={idx} trailing />
          ))}
          {/* Custom Amount — static label/subtitle from product display config. */}
          {customLabel && <RadioRow label={customLabel} subtitle={customSubtitle} />}
        </div>
      </div>
    </div>
  );
}
