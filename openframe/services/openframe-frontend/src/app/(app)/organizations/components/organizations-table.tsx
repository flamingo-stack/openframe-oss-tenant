'use client';

import {
  Chevron02RightIcon,
  PlusCircleIcon,
  SearchIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  Input,
  PageLayout,
  type Row,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn, formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { useOrganizationDeviceCounts } from '../hooks/use-organization-device-counts';
import { useOrganizations } from '../hooks/use-organizations';

interface UiOrganizationEntry {
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

function OrganizationAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
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

function OrganizationNameCell({ org }: { org: UiOrganizationEntry }) {
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

interface OrganizationsTableProps {
  status?: string;
}

export function OrganizationsTable({ status }: OrganizationsTableProps) {
  const router = useRouter();

  const { params, setParam } = useApiParams({
    search: { type: 'string', default: '' },
  });

  const [localSearch, setLocalSearch] = useState(params.search);
  const debouncedSearch = useDebounce(localSearch, 500);

  const setParamRef = useRef(setParam);
  setParamRef.current = setParam;

  useEffect(() => {
    setParamRef.current('search', debouncedSearch);
  }, [debouncedSearch]);

  const { organizations, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useOrganizations(
    debouncedSearch,
    status,
  );

  const isInitialMountRef = useRef(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const loadedOrgIds = useMemo(() => organizations.map(o => o.organizationId), [organizations]);
  const { deviceCounts } = useOrganizationDeviceCounts(loadedOrgIds);

  const transformed: UiOrganizationEntry[] = useMemo(() => {
    return organizations.map(org => ({
      id: org.id,
      organizationId: org.organizationId,
      name: org.name,
      email: org.contact.email,
      tier: org.tier,
      deviceCount: deviceCounts.has(org.organizationId) ? (deviceCounts.get(org.organizationId) ?? 0) : null,
      numberOfEmployees: org.numberOfEmployees,
      lastActivityDate: new Date(org.lastActivity).toLocaleString(),
      lastActivityRelative: formatRelativeTime(org.lastActivity),
      imageUrl: org.imageUrl,
    }));
  }, [organizations, deviceCounts]);

  const columns = useMemo<ColumnDef<UiOrganizationEntry>[]>(
    () => [
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
          <Button
            href={`/organizations/details/${row.original.organizationId}`}
            prefetch={false}
            variant="outline"
            size="icon"
            centerIcon={<Chevron02RightIcon className="w-6 h-6" />}
            aria-label="View details"
            className="bg-ods-card"
          />
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none ml-auto', align: 'right' },
      },
    ],
    [],
  );

  const table = useDataTable<UiOrganizationEntry>({
    data: transformed,
    columns,
    getRowId: (row: UiOrganizationEntry) => row.id,
    enableSorting: false,
  });

  const organizationRowHref = useCallback(
    (row: UiOrganizationEntry) => `/organizations/details/${row.organizationId}`,
    [],
  );

  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const handleAddOrganization = useCallback(() => {
    router.push('/organizations/edit/new');
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Add Organization',
        icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleAddOrganization,
        variant: 'card' as const,
      },
    ],
    [handleAddOrganization],
  );

  return (
    <PageLayout
      title="Organizations"
      actions={actions}
      actionsVariant="icon-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col"
    >
      <div>
        <div
          className={cn(
            'sticky top-0 z-20 flex gap-[var(--spacing-system-m)] items-center',
            'bg-ods-bg -mx-[var(--spacing-system-l)] p-[var(--spacing-system-l)] -mt-[var(--spacing-system-l)]',
          )}
        >
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Search for Organization"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
            />
          </div>
        </div>

        {error ? (
          <div className="text-ods-attention-red-error">{error}</div>
        ) : (
          <DataTable table={table}>
            <DataTable.Header stickyHeader stickyHeaderOffset="top-[96px]" rightSlot={<DataTable.RowCount />} />
            <DataTable.Body
              loading={isLoading}
              skeletonRows={10}
              emptyMessage="No organizations found. Try adjusting your search."
              rowClassName="mb-1"
              rowHref={organizationRowHref}
            />
            {hasNextPage && (
              <DataTable.InfiniteFooter
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={handleLoadMore}
                skeletonRows={2}
              />
            )}
          </DataTable>
        )}
      </div>
    </PageLayout>
  );
}
