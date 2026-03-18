'use client';

import { OrganizationIcon } from '@flamingo-stack/openframe-frontend-core/components/features';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { ListPageLayout, Table, type TableColumn } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { useOrganizations } from '../hooks/use-organizations';

interface UiOrganizationEntry {
  id: string;
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

export function OrganizationsTable() {
  const router = useRouter();

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    tier: { type: 'array', default: [] },
    industry: { type: 'array', default: [] },
  });

  const debouncedSearch = useDebounce(params.search, 300);

  const { organizations, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useOrganizations(debouncedSearch);

  const prevFiltersKeyRef = useRef<string | null>(null);
  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        tiers: [...(params.tier || [])].sort(),
        industries: [...(params.industry || [])].sort(),
      }),
    [params.tier, params.industry],
  );

  // Scroll to top when filters change
  useEffect(() => {
    if (prevFiltersKeyRef.current !== null && prevFiltersKeyRef.current !== filtersKey) {
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
    }
    prevFiltersKeyRef.current = filtersKey;
  }, [filtersKey]);

  const transformed: UiOrganizationEntry[] = useMemo(() => {
    const toMoney = (n: number) => `$${n.toLocaleString()}`;

    return organizations.map(org => ({
      id: org.id,
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

  // Client-side filtering for tier/industry (backend doesn't support these filters)
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

  const columns: TableColumn<UiOrganizationEntry>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        width: 'w-2/5',
        renderCell: org => <OrganizationNameCell org={org} />,
      },
      {
        key: 'tier',
        label: 'Tier',
        width: 'w-1/6',
        renderCell: org => (
          <div className="flex flex-col justify-center shrink-0">
            <span className="text-h4 text-ods-text-primary truncate">{org.tier}</span>
            <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
              {org.industry}
            </span>
          </div>
        ),
      },
      {
        key: 'mrrDisplay',
        label: 'MRR',
        width: 'w-1/6',
        renderCell: org => <span className="text-h4 text-ods-text-primary">{org.mrrDisplay}</span>,
      },
      {
        key: 'lastActivityDisplay',
        label: 'Last Activity',
        width: 'w-[200px]',
        hideAt: 'md',
        renderCell: org => {
          const [first, second] = org.lastActivityDisplay.split('\n');
          return (
            <div className="flex flex-col justify-center shrink-0">
              <span className="text-h4 text-ods-text-primary truncate">{first}</span>
              <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
                {second}
              </span>
            </div>
          );
        },
      },
    ],
    [],
  );

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
      },
    ],
    [handleAddOrganization],
  );

  return (
    <ListPageLayout
      title="Organizations"
      actions={actions}
      searchPlaceholder="Search for Organization"
      searchValue={params.search}
      onSearch={value => setParam('search', value)}
      error={error}
      background="default"
      padding="none"
      stickyHeader
    >
      <Table
        data={filteredOrganizations}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={10}
        emptyMessage="No organizations found. Try adjusting your search or filters."
        filters={tableFilters}
        onFilterChange={handleFilterChange}
        showFilters={false}
        rowClassName="mb-1"
        onRowClick={row => router.push(`/organizations/details/${row.id}`)}
        infiniteScroll={{
          hasNextPage,
          isFetchingNextPage,
          onLoadMore: () => fetchNextPage(),
          skeletonRows: 2,
        }}
        stickyHeader
        stickyHeaderOffset="top-[56px]"
      />
    </ListPageLayout>
  );
}
