import { formatDate } from '@/lib/format-date';

export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateOrDash(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return formatDate(iso);
  } catch {
    return iso;
  }
}
