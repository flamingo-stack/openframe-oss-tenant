'use client';

import {
  ArrowRightUpIcon,
  CalendarIcon,
  SearchIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  DateFilterMenu,
  type DateFilterResult,
  type DateRange,
  EntityImage,
  Input,
  type Row,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn, formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { type ReactNode, useMemo } from 'react';
import { formatDateTime } from '@/lib/format-date';
import { getFullImageUrl } from '@/lib/image-url';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { routes } from '@/lib/routes';
import { useCustomerDeviceCounts } from '../hooks/use-customer-device-counts';
import type { Customer } from '../hooks/use-customers';

export interface UiCustomerEntry {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  deviceCount: number | null;
  numberOfEmployees: number;
  lastActivityDate: string;
  lastActivityRelative: string;
  imageUrl?: string | null;
  imageHash?: string | null;
}

export function CustomerNameCell({ org }: { org: UiCustomerEntry }) {
  const fullImageUrl = getFullImageUrl(org.imageUrl, org.imageHash);

  return (
    <div className="flex items-center gap-4 min-w-0">
      <EntityImage src={fullImageUrl} alt={org.name} className="size-12 md:size-12" />
      <div className="flex flex-col justify-center min-w-0">
        <TruncateText>{org.name}</TruncateText>
        {org.email && (
          <TruncateText variant="h6" tone="secondary">
            {org.email}
          </TruncateText>
        )}
      </div>
    </div>
  );
}

export function transformCustomerToEntry(org: Customer, deviceCount: number | null): UiCustomerEntry {
  return {
    id: org.id,
    organizationId: org.organizationId,
    name: org.name,
    email: org.contact.email,
    deviceCount,
    numberOfEmployees: org.numberOfEmployees,
    lastActivityDate: formatDateTime(org.lastActivity),
    lastActivityRelative: formatRelativeTime(org.lastActivity),
    imageUrl: org.imageUrl,
    imageHash: org.imageHash,
  };
}

/** Last Activity sort + date-range filter wiring (desktop/tablet header popover). */
export interface CustomersDateFilter {
  sortDirection: 'asc' | 'desc';
  range: DateRange | undefined;
  onApply: (result: DateFilterResult) => void;
}

export const buildCustomersColumns = (dateFilter?: CustomersDateFilter): ColumnDef<UiCustomerEntry>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }: { row: Row<UiCustomerEntry> }) => <CustomerNameCell org={row.original} />,
    meta: { width: 'flex-1 min-w-0' },
  },
  {
    accessorKey: 'deviceCount',
    header: 'Devices',
    cell: ({ row }: { row: Row<UiCustomerEntry> }) => {
      const { deviceCount, numberOfEmployees } = row.original;
      const devicesLabel =
        deviceCount === null ? '—' : `${deviceCount.toLocaleString()} ${deviceCount === 1 ? 'device' : 'devices'}`;
      const usersLabel = `${numberOfEmployees.toLocaleString()} ${numberOfEmployees === 1 ? 'user' : 'users'}`;
      return (
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-h4 text-ods-text-primary truncate">{devicesLabel}</span>
          <span className="text-h6 text-ods-text-secondary truncate">{usersLabel}</span>
        </div>
      );
    },
    meta: { width: 'w-[200px] shrink-0', hideAt: 'md' },
  },
  {
    accessorKey: 'lastActivityDate',
    // With a date filter wired: label + calendar popover (timestamp sort +
    // range filter). No own vertical padding — the HeaderCell wrapper pads.
    header: dateFilter
      ? () => (
          <div className="group flex items-center gap-[var(--spacing-system-xsf)] select-none">
            <span className="text-h5 text-ods-text-secondary whitespace-nowrap transition-colors duration-200 group-hover:text-ods-text-primary">
              Last Activity
            </span>
            <DateFilterMenu
              mode="range"
              sort={dateFilter.sortDirection}
              range={dateFilter.range}
              onApply={dateFilter.onApply}
              // Compact inline trigger — keeps the header row height identical
              // to the other columns (the default lib trigger is a 48px Button).
              trigger={
                <button type="button" aria-label="Sort and filter by last activity" className="flex items-center">
                  <CalendarIcon
                    className={cn(
                      'w-4 h-4 transition-colors duration-200',
                      // Active when a date range or a non-default sort is applied
                      dateFilter.range || dateFilter.sortDirection !== 'desc'
                        ? 'text-ods-accent'
                        : 'text-ods-text-secondary group-hover:text-ods-text-primary',
                    )}
                  />
                </button>
              }
            />
          </div>
        )
      : 'Last Activity',
    cell: ({ row }: { row: Row<UiCustomerEntry> }) => (
      <div className="flex flex-col justify-center min-w-0">
        <TruncateText>{row.original.lastActivityDate}</TruncateText>
        <span className="text-h6 text-ods-text-secondary truncate">{row.original.lastActivityRelative}</span>
      </div>
    ),
    // alwaysShowHeader keeps the date filter reachable on tablet (md–lg)
    meta: { width: 'w-[200px] shrink-0', hideAt: 'md', alwaysShowHeader: Boolean(dateFilter) },
  },
  {
    id: 'open',
    cell: ({ row }: { row: Row<UiCustomerEntry> }) => (
      <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
        <Button
          onClick={openInNewTab(routes.customers.details(row.original.organizationId))}
          variant="outline"
          size="icon"
          leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
          aria-label="Open in new tab"
          className="bg-ods-card"
        />
      </div>
    ),
    enableSorting: false,
    meta: { width: 'w-12 shrink-0 flex-none ml-auto', hideAt: 'md', align: 'right' },
  },
];

export const customerRowHref = (row: UiCustomerEntry) => routes.customers.details(row.organizationId);

interface CustomersSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function CustomersSearchInput({ value, onChange }: CustomersSearchInputProps) {
  return (
    <Input
      placeholder="Search for Customer"
      value={value}
      onChange={e => onChange(e.target.value)}
      startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
    />
  );
}

interface CustomersTableBodyProps {
  customers: Customer[];
  isLoading?: boolean;
  emptyMessage?: string;
  skeletonRows?: number;
  stickyHeaderOffset?: string;
  footerSlot?: ReactNode;
  /** When set, the Last Activity header hosts the date sort + range popover. */
  dateFilter?: CustomersDateFilter;
}

export function CustomersTableBody({
  customers,
  isLoading,
  emptyMessage = 'No customers found.',
  skeletonRows = 10,
  stickyHeaderOffset,
  footerSlot,
  dateFilter,
}: CustomersTableBodyProps) {
  const orgIds = useMemo(() => customers.map(c => c.organizationId), [customers]);
  const { deviceCounts } = useCustomerDeviceCounts(orgIds);

  const rows = useMemo<UiCustomerEntry[]>(
    () =>
      customers.map(customer =>
        transformCustomerToEntry(
          customer,
          deviceCounts.has(customer.organizationId) ? (deviceCounts.get(customer.organizationId) ?? 0) : null,
        ),
      ),
    [customers, deviceCounts],
  );

  const columns = useMemo(() => buildCustomersColumns(dateFilter), [dateFilter]);

  const table = useDataTable<UiCustomerEntry>({
    data: rows,
    columns,
    getRowId: row => row.id,
    enableSorting: false,
  });

  return (
    <DataTable table={table}>
      <DataTable.Header
        stickyHeader={!!stickyHeaderOffset}
        stickyHeaderOffset={stickyHeaderOffset}
        rightSlot={<DataTable.RowCount />}
      />
      <DataTable.Body
        loading={isLoading}
        skeletonRows={skeletonRows}
        emptyMessage={emptyMessage}
        rowClassName="mb-1"
        rowHref={customerRowHref}
      />
      {footerSlot}
    </DataTable>
  );
}
