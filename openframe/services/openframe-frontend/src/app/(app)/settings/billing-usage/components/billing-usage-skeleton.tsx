'use client';

import { ExternalLinkIcon, SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Input, PageLayout, Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';
import { BillingRow, SectionBlock, TestModeBanner } from './billing-section';

// A value placeholder sized to sit on the right of a BillingRow.
function Value({ width }: { width: string }) {
  return <Skeleton className={`h-4 ${width}`} />;
}

// Mirrors a DashboardInfoCard: real uppercase title, skeleton value, and an
// optional progress ring (shown for committed packages, hidden for PAYG).
function InfoCardSkeleton({ title, withProgress = true }: { title: string; withProgress?: boolean }) {
  return (
    <div className="h-[94px] bg-ods-card border border-ods-border rounded-sm p-[var(--spacing-system-m)] flex gap-[var(--spacing-system-s)] items-center">
      <div className="flex-1 flex flex-col gap-2">
        <p className="text-h5 text-ods-text-secondary">{title}</p>
        <Skeleton className="h-7 w-24" />
      </div>
      {withProgress && <Skeleton className="size-12 rounded-full shrink-0" />}
    </div>
  );
}

const INVOICE_COLUMNS = ['INVOICE', 'DUE DATE', 'AMOUNT', 'STATUS'] as const;
const INVOICE_ROW_KEYS = ['a', 'b', 'c'] as const;

// Mirrors the Invoices History table: real column headers, skeleton cells, and
// the real (static) external-link action chrome.
function InvoicesTableSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 px-3 py-3 border-b border-ods-border">
        {INVOICE_COLUMNS.map(col => (
          <p key={col} className="text-h5 text-ods-text-secondary flex-1">
            {col}
          </p>
        ))}
        <Skeleton className="h-3 w-16 shrink-0" />
      </div>
      {INVOICE_ROW_KEYS.map(key => (
        <div key={key} className="flex items-center gap-4 px-3 py-3 border-b border-ods-border last:border-b-0">
          <Skeleton className="h-4 w-24 flex-1" />
          <Skeleton className="h-4 w-20 flex-1" />
          <Skeleton className="h-4 w-16 flex-1" />
          <div className="flex-1">
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
          <div className="flex items-center justify-center p-3 bg-ods-card border border-ods-border rounded-md text-ods-text-secondary shrink-0">
            <ExternalLinkIcon className="size-6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BillingUsageSkeleton() {
  const handleBack = useSafeBack(routes.settings.root());

  return (
    <PageLayout
      title="Billing & Usage"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      backButton={{ label: 'Back', onClick: handleBack }}
    >
      <TestModeBanner />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-m)]">
        <InfoCardSkeleton title="Device Usage" />
        <InfoCardSkeleton title="AI Usage" withProgress={false} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-l)] items-stretch">
        <SectionBlock title="Current Plan">
          <BillingRow label="Device Package" value={<Value width="w-16" />} />
          <BillingRow label="AI Package" value={<Value width="w-28" />} />
          <BillingRow label="Next Payment" value={<Value width="w-16" />} />
        </SectionBlock>
        <SectionBlock title="Usage Overview">
          <BillingRow label="Active devices" value={<Value width="w-8" />} />
          <BillingRow label="Inactive devices" value={<Value width="w-8" />} />
        </SectionBlock>
      </div>

      <div className="flex flex-col gap-[var(--spacing-system-l)]">
        <h2 className="text-h2 text-ods-text-primary">Invoices History</h2>
        <Input startAdornment={<SearchIcon />} placeholder="Search for Invoice" className="w-full" readOnly />
        <InvoicesTableSkeleton />
      </div>
    </PageLayout>
  );
}
