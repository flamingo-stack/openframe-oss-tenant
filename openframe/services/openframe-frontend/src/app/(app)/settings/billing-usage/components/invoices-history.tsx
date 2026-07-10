'use client';

import { ExternalLinkIcon, SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type ColumnDef,
  DataTable,
  Input,
  type Row,
  Tag,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo, useState } from 'react';
import { InvoiceStatus } from '@/generated/schema-enums';
import { formatCurrency, formatDateOrDash } from '../lib/format';

interface InvoiceItem {
  id: string;
  /** Human-readable Stripe invoice number (e.g. "ABCD-0001"). Null for legacy entries. */
  invoiceNumber?: string | null;
  /**
   * Lifecycle status mirrored from Stripe. Typed loosely (not `InvoiceStatus`) so
   * the relay-generated shape — which widens with `"%future added value"` — assigns
   * cleanly; `statusTag` narrows it against the `InvoiceStatus` values.
   */
  status?: string | null;
  amountDue: number; // major currency units (e.g. 11.92 USD)
  currency: string;
  createdAt: string;
  dueDate?: string | null;
  hostedInvoiceUrl: string;
}

/** Amount in major units (dollars) — the backend already returns `amountDue` in major units. */
function invoiceAmount(invoice: InvoiceItem): number {
  return invoice.amountDue;
}

/** Tag styling + label for each lifecycle status; null (legacy) reads as unpaid. */
function statusTag(status: string | null | undefined): {
  variant: 'success' | 'warning' | 'error' | 'grey';
  label: string;
} {
  switch (status) {
    case InvoiceStatus.PAID:
      return { variant: 'success', label: 'Paid' };
    case InvoiceStatus.DRAFT:
      return { variant: 'grey', label: 'Draft' };
    case InvoiceStatus.VOID:
      return { variant: 'error', label: 'Void' };
    case InvoiceStatus.UNCOLLECTIBLE:
      return { variant: 'error', label: 'Uncollectible' };
    default:
      // OPEN and legacy (null) both mean "still owed".
      return { variant: 'warning', label: 'Unpaid' };
  }
}

export function InvoicesHistory({ invoices }: { invoices: readonly InvoiceItem[] }) {
  const [search, setSearch] = useState('');

  const data = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return invoices as InvoiceItem[];
    // Client-side match on invoice number and amount. The amount haystack holds
    // both the bare "11.92" and the formatted "$11.92" so "11.9", "11.92" and
    // "$11.92" all match.
    return invoices.filter(invoice => {
      const amount = invoiceAmount(invoice);
      const haystack = [invoice.invoiceNumber ?? '', amount.toFixed(2), formatCurrency(amount)].join(' ').toLowerCase();
      return haystack.includes(query);
    }) as InvoiceItem[];
  }, [invoices, search]);

  const columns = useMemo<ColumnDef<InvoiceItem>[]>(
    () => [
      {
        // Human-readable Stripe invoice number; legacy entries have none, so the
        // issue date stands in as the identifier.
        accessorKey: 'invoiceNumber',
        header: 'INVOICE',
        cell: ({ row }: { row: Row<InvoiceItem> }) => (
          <TruncateText>{row.original.invoiceNumber ?? formatDateOrDash(row.original.createdAt)}</TruncateText>
        ),
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'dueDate',
        header: 'DUE DATE',
        cell: ({ row }: { row: Row<InvoiceItem> }) => (
          <TruncateText>{formatDateOrDash(row.original.dueDate)}</TruncateText>
        ),
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'amountDue',
        header: 'AMOUNT',
        cell: ({ row }: { row: Row<InvoiceItem> }) => (
          <TruncateText>{formatCurrency(invoiceAmount(row.original))}</TruncateText>
        ),
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'status',
        header: 'STATUS',
        cell: ({ row }: { row: Row<InvoiceItem> }) => {
          const { variant, label } = statusTag(row.original.status);
          return <Tag variant={variant} label={label} />;
        },
        enableSorting: false,
        // The body cell is a `flex-col` (default `align-items: stretch`), which stretches the
        // tag full-width. `items-start` keeps it at its natural width, left-aligned.
        meta: { width: 'flex-1 min-w-0', cellClassName: 'items-start' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<InvoiceItem> }) => (
          <div data-no-row-click className="flex justify-end pointer-events-auto">
            <a
              href={row.original.hostedInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open invoice"
              className="flex items-center justify-center p-3 bg-ods-card border border-ods-border rounded-md text-ods-text-secondary hover:text-ods-text-primary transition-colors"
            >
              <ExternalLinkIcon className="size-6" />
            </a>
          </div>
        ),
        enableSorting: false,
        // Fixed width reserved in BOTH header and body so the flex-1 columns line up
        // (an empty `w-auto` header cell would collapse to 0 and shift every column).
        meta: { width: 'w-14 shrink-0 flex-none', align: 'right' },
      },
    ],
    [],
  );

  const getRowId = useCallback((row: InvoiceItem) => row.id, []);

  const table = useDataTable<InvoiceItem>({ data, columns, getRowId });

  if (invoices.length === 0) return null;

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <h2 className="text-h2 text-ods-text-primary">Invoices History</h2>

      <Input
        startAdornment={<SearchIcon />}
        placeholder="Search for Invoice"
        value={search}
        onChange={event => setSearch(event.target.value)}
        className="w-full"
      />

      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body emptyState={{ title: 'No invoices found', description: 'Try adjusting your search.' }} />
      </DataTable>
    </div>
  );
}
