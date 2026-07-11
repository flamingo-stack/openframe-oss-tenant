import { AlertTriangleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';

// Static "Test mode" banner. Shared by the live view and its loading skeleton so
// the copy/chrome are defined once.
export function TestModeBanner() {
  return (
    <div className="flex items-start gap-[var(--spacing-system-s)] rounded-md bg-[var(--ods-open-yellow-base)] p-[var(--spacing-system-s)] text-ods-text-on-accent">
      <AlertTriangleIcon className="size-6 shrink-0" />
      <p className="flex-1 text-h3 font-bold">
        Test mode — invoices and usage shown here are samples. No real charges are being made.
      </p>
    </div>
  );
}

export function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 h-full">
      <p className="text-h5 text-ods-text-secondary uppercase tracking-[-0.02em]">{title}</p>
      <div className="flex flex-col gap-3 bg-ods-card border border-ods-border rounded-md p-4 flex-1">{children}</div>
    </div>
  );
}

export function BillingRow({
  label,
  value,
  muted = false,
  warning = false,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
  warning?: boolean;
}) {
  const valueClass = warning ? 'text-ods-warning' : muted ? 'text-ods-text-secondary' : 'text-ods-text-primary';
  return (
    <div className="flex gap-2 items-center w-full">
      <span className="text-h4 text-ods-text-primary whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-ods-border min-w-4" />
      <span className={cn('text-h4 whitespace-nowrap inline-flex items-center gap-1', valueClass)}>{value}</span>
    </div>
  );
}
