import type { DateRange } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { endOfDay, format, parse, startOfDay } from 'date-fns';

// Day-granular date filter <-> URL param (local yyyy-MM-dd), shared by the
// table date filters (Logs, Customers).
const DAY_PARAM_FORMAT = 'yyyy-MM-dd';

export const toDayParam = (date: Date): string => format(date, DAY_PARAM_FORMAT);

export const parseDayParam = (value: string): Date | undefined => {
  const parsed = parse(value, DAY_PARAM_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/** Rebuild the applied calendar range from its URL params. */
export function dateRangeFromParams(dateFrom: string, dateTo: string): DateRange | undefined {
  const from = dateFrom ? parseDayParam(dateFrom) : undefined;
  const to = dateTo ? parseDayParam(dateTo) : undefined;
  return from || to ? { from, to } : undefined;
}

/**
 * Inclusive UTC instants covering the selected local days for the BE range
 * filter; a single picked day (no `to`) covers that one day.
 */
export function dateRangeToInstantBounds(range: DateRange | undefined): {
  from?: string;
  to?: string;
} {
  const upperBoundDay = range?.to ?? range?.from;
  return {
    from: range?.from ? startOfDay(range.from).toISOString() : undefined,
    to: upperBoundDay ? endOfDay(upperBoundDay).toISOString() : undefined,
  };
}
