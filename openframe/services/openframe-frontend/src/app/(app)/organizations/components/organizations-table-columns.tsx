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
import { useOrganizationDeviceCounts } from '../hooks/use-organization-device-counts';
import type { Organization } from '../hooks/use-organizations';

export interface UiOrganizationEntry {
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

export function OrganizationAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
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

export function OrganizationNameCell({ org }: { org: UiOrganizationEntry }) {
  const fullImageUrl = getFullImageUrl(org.imageUrl);

  return (
    <div className="flex items-center gap-4 min-w-0">
      {featureFlags.organizationImages.displayEnabled() && (
        <OrganizationAvatar imageUrl={fullImageUrl} name={org.name} />
      )}
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

export function transformOrganizationToEntry(org: Organization, deviceCount: number | null): UiOrganizationEntry {
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

export const ORGANIZATIONS_COLUMNS: ColumnDef<UiOrganizationEntry>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }: { row: Row<UiOrganizationEntry> }) => <OrganizationNameCell org={row.original} />,
    meta: { width: 'flex-1 min-w-0' },
  },
  {
    accessorKey: 'tier',
    header: 'Tier',
    cell: ({ row }: { row: Row<UiOrganizationEntry> }) => (
      <span className="text-h4 text-ods-text-primary truncate">{row.original.tier}</span>
    ),
    meta: { width: 'w-[200px] shrink-0', hideAt: 'md' },
  },
  {
    accessorKey: 'deviceCount',
    header: 'Devices',
    cell: ({ row }: { row: Row<UiOrganizationEntry> }) => {
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
    cell: ({ row }: { row: Row<UiOrganizationEntry> }) => (
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
    cell: ({ row }: { row: Row<UiOrganizationEntry> }) => (
      <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
        <Button
          href={`/organizations/details/${row.original.organizationId}`}
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

export const organizationRowHref = (row: UiOrganizationEntry) => `/organizations/details/${row.organizationId}`;

interface OrganizationsSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function OrganizationsSearchInput({ value, onChange }: OrganizationsSearchInputProps) {
  return (
    <Input
      placeholder="Search for Organization"
      value={value}
      onChange={e => onChange(e.target.value)}
      startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
    />
  );
}

interface OrganizationsTableBodyProps {
  organizations: Organization[];
  isLoading?: boolean;
  emptyMessage?: string;
  skeletonRows?: number;
  stickyHeaderOffset?: string;
  footerSlot?: ReactNode;
}

export function OrganizationsTableBody({
  organizations,
  isLoading,
  emptyMessage = 'No organizations found.',
  skeletonRows = 10,
  stickyHeaderOffset,
  footerSlot,
}: OrganizationsTableBodyProps) {
  const orgIds = useMemo(() => organizations.map(o => o.organizationId), [organizations]);
  const { deviceCounts } = useOrganizationDeviceCounts(orgIds);

  const rows = useMemo<UiOrganizationEntry[]>(
    () =>
      organizations.map(org =>
        transformOrganizationToEntry(
          org,
          deviceCounts.has(org.organizationId) ? (deviceCounts.get(org.organizationId) ?? 0) : null,
        ),
      ),
    [organizations, deviceCounts],
  );

  const table = useDataTable<UiOrganizationEntry>({
    data: rows,
    columns: ORGANIZATIONS_COLUMNS,
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
        rowHref={organizationRowHref}
      />
      {footerSlot}
    </DataTable>
  );
}
