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
import { formatCurrency, formatDateOrDash } from '../lib/format';

interface InvoiceItem {
  id: string;
  amountDue: number; // smallest currency unit (cents)
  currency: string;
  createdAt: string;
  dueDate: string | null;
  hostedInvoiceUrl: string;
}

export function InvoicesHistory({ invoices }: { invoices: readonly InvoiceItem[] }) {
  const [search, setSearch] = useState('');

  const data = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query ? invoices.filter(invoice => invoice.id.toLowerCase().includes(query)) : invoices;
    return list as InvoiceItem[];
  }, [invoices, search]);

  const columns = useMemo<ColumnDef<InvoiceItem>[]>(
    () => [
      {
        // The Stripe invoice id is an opaque base64 string with no user value, so the
        // issue date stands in as the invoice identifier here.
        accessorKey: 'createdAt',
        header: 'INVOICE',
        cell: ({ row }: { row: Row<InvoiceItem> }) => (
          <TruncateText>{formatDateOrDash(row.original.createdAt)}</TruncateText>
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
          <TruncateText>{formatCurrency(row.original.amountDue / 100)}</TruncateText>
        ),
        meta: { width: 'flex-1 min-w-0' },
      },
      {
        accessorKey: 'status',
        header: 'STATUS',
        // Status is mocked: pendingInvoices are unpaid, and the schema exposes no status field yet.
        cell: () => <Tag variant="warning" label="Unpaid" />,
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
