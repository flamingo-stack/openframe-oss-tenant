'use client';

import { OrganizationIcon } from '@flamingo-stack/openframe-frontend-core/components/features';
import { Chevron02RightIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DataTable,
  ListPageLayout,
  type Row,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { useOrganizations } from '../hooks/use-organizations';

interface UiOrganizationEntry {
  id: string;
  organizationId: string;
  name: string;
  contact: string;
  websiteUrl: string;
  tier: string;
  industry: string;
  mrrDisplay: string;
  lastActivityDisplay: string;
  imageUrl?: string | null;
}

function OrganizationNameCell({ org }: { org: UiOrganizationEntry }) {
  const fullImageUrl = getFullImageUrl(org.imageUrl);

  return (
    <div className="flex items-center gap-3">
      {featureFlags.organizationImages.displayEnabled() && (
        <OrganizationIcon imageUrl={fullImageUrl} organizationName={org.name} size="md" />
      )}
      <div className="flex flex-col justify-center shrink-0 min-w-0">
        <span className="text-h4 text-ods-text-primary truncate">{org.name}</span>
        <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
          {org.websiteUrl}
        </span>
      </div>
    </div>
  );
}

interface OrganizationsTableProps {
  status?: string;
}

export function OrganizationsTable({ status }: OrganizationsTableProps) {
  const router = useRouter();

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    tier: { type: 'array', default: [] },
    industry: { type: 'array', default: [] },
  });

  const debouncedSearch = useDebounce(params.search, 300);

  const { organizations, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } = useOrganizations(
    debouncedSearch,
    status,
  );

  // Scroll to top when filters change. `params.tier` / `params.industry` are
  // reference-stable across renders thanks to `useApiParams`, so we can list
  // them as effect deps directly. Skip the very first run so we don't scroll
  // on mount.
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const transformed: UiOrganizationEntry[] = useMemo(() => {
    const toMoney = (n: number) => `$${n.toLocaleString()}`;

    return organizations.map(org => ({
      id: org.id,
      organizationId: org.organizationId,
      name: org.name,
      contact: `${org.contact.email}`,
      websiteUrl: org.websiteUrl,
      tier: org.tier,
      industry: org.industry,
      mrrDisplay: toMoney(org.mrrUsd),
      lastActivityDisplay: `${new Date(org.lastActivity).toLocaleString()}\n${formatRelativeTime(org.lastActivity)}`,
      imageUrl: org.imageUrl,
    }));
  }, [organizations]);

  // Client-side filtering for tier/industry (backend doesn't support these
  // filters). `useApiParams` keeps each array reference-stable across renders
  // when content is unchanged, so listing them as deps directly is safe.
  const filteredOrganizations = useMemo(() => {
    let filtered = transformed;

    if (params.tier && params.tier.length > 0) {
      filtered = filtered.filter(org => params.tier.includes(org.tier));
    }

    if (params.industry && params.industry.length > 0) {
      filtered = filtered.filter(org => params.industry.includes(org.industry));
    }

    return filtered;
  }, [transformed, params.tier, params.industry]);

  const columns = useMemo<ColumnDef<UiOrganizationEntry>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }: { row: Row<UiOrganizationEntry> }) => <OrganizationNameCell org={row.original} />,
        meta: { width: 'w-2/5' },
      },
      {
        accessorKey: 'tier',
        header: 'Tier',
        cell: ({ row }: { row: Row<UiOrganizationEntry> }) => (
          <div className="flex flex-col justify-center shrink-0">
            <span className="text-h4 text-ods-text-primary truncate">{row.original.tier}</span>
            <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
              {row.original.industry}
            </span>
          </div>
        ),
        meta: { width: 'w-1/6' },
      },
      {
        accessorKey: 'mrrDisplay',
        header: 'MRR',
        cell: ({ row }: { row: Row<UiOrganizationEntry> }) => (
          <span className="text-h4 text-ods-text-primary">{row.original.mrrDisplay}</span>
        ),
        meta: { width: 'w-1/6' },
      },
      {
        accessorKey: 'lastActivityDisplay',
        header: 'Last Activity',
        cell: ({ row }: { row: Row<UiOrganizationEntry> }) => {
          const [first, second] = row.original.lastActivityDisplay.split('\n');
          return (
            <div className="flex flex-col justify-center shrink-0">
              <span className="text-h4 text-ods-text-primary truncate">{first}</span>
              <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
                {second}
              </span>
            </div>
          );
        },
        meta: { width: 'w-[200px]', hideAt: 'md' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<UiOrganizationEntry> }) => (
          <Button
            href={`/organizations/details/${row.original.organizationId}`}
            prefetch={false}
            variant="outline"
            size="icon"
            centerIcon={<Chevron02RightIcon className="w-5 h-5" />}
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
    data: filteredOrganizations,
    columns,
    getRowId: (row: UiOrganizationEntry) => row.id,
    enableSorting: false,
  });

  const organizationRowHref = useCallback(
    (row: UiOrganizationEntry) => `/organizations/details/${row.organizationId}`,
    [],
  );

  const handleLoadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  const handleFilterChange = useCallback(
    (columnFilters: Record<string, any[]>) => {
      setParams({
        tier: columnFilters.tier || [],
        industry: columnFilters.industry || [],
      });
    },
    [setParams],
  );

  const handleAddOrganization = useCallback(() => {
    router.push('/organizations/edit/new');
  }, [router]);

  const tableFilters = useMemo(
    () => ({
      tier: params.tier,
      industry: params.industry,
    }),
    [params.tier, params.industry],
  );

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

  // Keep handleFilterChange/tableFilters referenced for mobile filter wiring (if re-enabled).
  void handleFilterChange;
  void tableFilters;

  return (
    <ListPageLayout
      title="Organizations"
      actions={actions}
      searchPlaceholder="Search for Organization"
      searchValue={params.search}
      onSearch={value => setParam('search', value)}
      error={error}
      background="default"
      className="pt-6"
      padding="none"
      stickyHeader
    >
      <DataTable table={table}>
        <DataTable.Header stickyHeader stickyHeaderOffset="top-[56px]" rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={10}
          emptyMessage="No organizations found. Try adjusting your search or filters."
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
    </ListPageLayout>
  );
}
