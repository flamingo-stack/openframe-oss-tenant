'use client';

import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';
import { BillingRow, SectionBlock } from '../../components/billing-section';
import type { BillingPeriod, PlanComparison, PlanLine } from '../types/subscription.types';
import { formatCompact, formatMoney, isPlanChanged } from '../utils/subscription.utils';

export interface PlanChangeSummaryItem {
  /** Short row label, e.g. "Devices" / "AI Tokens". */
  label: string;
  comparison: PlanComparison;
}

interface PlanChangeSummaryProps {
  items: PlanChangeSummaryItem[];
}

type ChangeDirection = 'up' | 'down' | 'same';

/** Green = upgrade, red = downgrade, white = unchanged. */
function directionClass(direction: ChangeDirection): string {
  if (direction === 'up') return 'text-ods-success';
  if (direction === 'down') return 'text-ods-error';
  return 'text-ods-text-primary';
}

function periodLabel(period: BillingPeriod | null): string {
  if (period === 'YEARLY') return 'Annual';
  if (period === 'MONTHLY') return 'Monthly';
  return '';
}

/**
 * Quantity change. PAYG↔package transitions follow the designer's rules:
 * pay-as-you-go → package is an upgrade, package → pay-as-you-go a downgrade.
 */
function quantityDirection(current: PlanLine | null, next: PlanLine): ChangeDirection {
  if (!current) return 'same';
  if (current.payg && next.payg) return 'same';
  if (current.payg && !next.payg) return 'up';
  if (!current.payg && next.payg) return 'down';
  const from = current.quantity ?? 0;
  const to = next.quantity ?? 0;
  return to > from ? 'up' : to < from ? 'down' : 'same';
}

/** Billing period change: PAYG < Monthly < Annual; longer commitment is an upgrade. */
function periodDirection(current: PlanLine | null, next: PlanLine): ChangeDirection {
  if (!current) return 'same';
  const rank = (line: PlanLine) => (line.payg ? 0 : line.billingPeriod === 'YEARLY' ? 2 : 1);
  const from = rank(current);
  const to = rank(next);
  return to > from ? 'up' : to < from ? 'down' : 'same';
}

/**
 * Total cost change. Per product decision a higher total reads as a bigger plan
 * (green); a lower total as red. Flip the two comparisons here to invert.
 */
function totalDirection(current: number | null, next: number | null): ChangeDirection {
  if (current == null || next == null) return 'same';
  return next > current ? 'up' : next < current ? 'down' : 'same';
}

function sumAnnualTotals(lines: (PlanLine | null)[]): number | null {
  const totals = lines.map(line => line?.annualTotal).filter((value): value is number => value != null);
  return totals.length > 0 ? totals.reduce((acc, value) => acc + value, 0) : null;
}

function currentValueText(line: PlanLine | null): string {
  if (!line) return '—';
  if (line.payg) return 'Pay as you go';
  const quantity = line.quantity != null ? formatCompact(line.quantity) : '—';
  const period = periodLabel(line.billingPeriod);
  return period ? `${quantity} · ${period}` : quantity;
}

function NewProductValue({ current, next }: { current: PlanLine | null; next: PlanLine }): ReactNode {
  if (next.payg) {
    return <span className={directionClass(quantityDirection(current, next))}>Pay as you go</span>;
  }
  const quantity = next.quantity != null ? formatCompact(next.quantity) : '—';
  const period = periodLabel(next.billingPeriod);
  return (
    <>
      <span className={directionClass(quantityDirection(current, next))}>{quantity}</span>
      {period && (
        <>
          <span className="text-ods-text-secondary">·</span>
          <span className={directionClass(periodDirection(current, next))}>{period}</span>
        </>
      )}
    </>
  );
}

function totalText(total: number | null): string {
  return total != null ? `$${formatMoney(total)} / year` : 'Pay as you go';
}

/**
 * Side-by-side "Current Plan" / "New Plan" comparison shown before applying a
 * subscription update. New-plan values are colored to signal upgrade (green) /
 * downgrade (red) per row.
 */
export function PlanChangeSummary({ items }: PlanChangeSummaryProps) {
  const currentTotal = sumAnnualTotals(items.map(item => item.comparison.current));
  const nextTotal = sumAnnualTotals(items.map(item => item.comparison.next));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SectionBlock title="Current Plan">
        {items.map(item => (
          <BillingRow
            key={item.label}
            label={item.label}
            value={currentValueText(item.comparison.current)}
            // Mute only changed rows; unchanged rows stay white to match the New side.
            muted={isPlanChanged(item.comparison)}
          />
        ))}
        <BillingRow
          label="Total"
          value={totalText(currentTotal)}
          muted={totalDirection(currentTotal, nextTotal) !== 'same'}
        />
      </SectionBlock>

      <SectionBlock title="New Plan">
        {items.map(item => (
          <BillingRow
            key={item.label}
            label={item.label}
            value={<NewProductValue current={item.comparison.current} next={item.comparison.next} />}
          />
        ))}
        <BillingRow
          label="Total"
          value={
            <span className={cn(directionClass(totalDirection(currentTotal, nextTotal)))}>{totalText(nextTotal)}</span>
          }
        />
      </SectionBlock>
    </div>
  );
}
