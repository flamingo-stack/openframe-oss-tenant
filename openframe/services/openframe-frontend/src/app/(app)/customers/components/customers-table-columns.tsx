'use client';

import { ArrowRightUpIcon, SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  Input,
  type Row,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { type ReactNode, useMemo, useState } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { useCustomerDeviceCounts } from '../hooks/use-customer-device-counts';
import type { Customer } from '../hooks/use-customers';

export interface UiCustomerEntry {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  tier: string;
  deviceCount: number | null;
  numberOfEmployees: number;
  lastActivityDate: string;
  lastActivityRelative: string;
  imageUrl?: string | null;
}

function AvatarInitials({ initials }: { initials: string }) {
  return (
    <span className="flex size-full items-center justify-center text-xs font-medium uppercase text-ods-text-secondary">
      {initials}
    </span>
  );
}

function AvatarImage({ src, initials }: { src: string; initials: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <AvatarInitials initials={initials} />;
  }

  return (
    <img src={src} alt="" onError={() => setErrored(true)} className="block size-full rounded-none object-cover" />
  );
}

export function CustomerAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const initials = (name?.substring(0, 2) || '??').toUpperCase();

  return (
    <div className="size-12 shrink-0 overflow-hidden rounded-sm border border-ods-border bg-ods-bg">
      {imageUrl ? (
        <AvatarImage key={imageUrl} src={imageUrl} initials={initials} />
      ) : (
        <AvatarInitials initials={initials} />
      )}
    </div>
  );
}

export function CustomerNameCell({ org }: { org: UiCustomerEntry }) {
  const fullImageUrl = getFullImageUrl(org.imageUrl);

  return (
    <div className="flex items-center gap-4 min-w-0">
      {featureFlags.organizationImages.displayEnabled() && <CustomerAvatar imageUrl={fullImageUrl} name={org.name} />}
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-h4 text-ods-text-primary truncate">{org.name}</span>
        {org.email && (
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
            {org.email}
          </span>
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
    tier: org.tier,
    deviceCount,
    numberOfEmployees: org.numberOfEmployees,
    lastActivityDate: new Date(org.lastActivity).toLocaleString(),
    lastActivityRelative: formatRelativeTime(org.lastActivity),
    imageUrl: org.imageUrl,
  };
}

export const CUSTOMERS_COLUMNS: ColumnDef<UiCustomerEntry>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }: { row: Row<UiCustomerEntry> }) => <CustomerNameCell org={row.original} />,
    meta: { width: 'flex-1 min-w-0' },
  },
  {
    accessorKey: 'tier',
    header: 'Tier',
    cell: ({ row }: { row: Row<UiCustomerEntry> }) => (
      <span className="text-h4 text-ods-text-primary truncate">{row.original.tier}</span>
    ),
    meta: { width: 'w-[200px] shrink-0', hideAt: 'md' },
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
          <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
            {usersLabel}
          </span>
        </div>
      );
    },
    meta: { width: 'w-[200px] shrink-0', hideAt: 'md' },
  },
  {
    accessorKey: 'lastActivityDate',
    header: 'Last Activity',
    cell: ({ row }: { row: Row<UiCustomerEntry> }) => (
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-h4 text-ods-text-primary truncate">{row.original.lastActivityDate}</span>
        <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
          {row.original.lastActivityRelative}
        </span>
      </div>
    ),
    meta: { width: 'w-[200px] shrink-0', hideAt: 'md' },
  },
  {
    id: 'open',
    cell: ({ row }: { row: Row<UiCustomerEntry> }) => (
      <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
        <Button
          href={`/customers/details/${row.original.organizationId}`}
          prefetch={false}
          openInNewTab
          variant="outline"
          size="icon"
          leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
          aria-label="Open in new tab"
          className="bg-ods-card"
        />
      </div>
    ),
    enableSorting: false,
    meta: { width: 'w-12 shrink-0 flex-none ml-auto', align: 'right' },
  },
];

export const customerRowHref = (row: UiCustomerEntry) => `/customers/details/${row.organizationId}`;

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
}

export function CustomersTableBody({
  customers,
  isLoading,
  emptyMessage = 'No customers found.',
  skeletonRows = 10,
  stickyHeaderOffset,
  footerSlot,
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

  const table = useDataTable<UiCustomerEntry>({
    data: rows,
    columns: CUSTOMERS_COLUMNS,
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
