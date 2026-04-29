'use client';

import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components/features';
import { Chevron02RightIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  type ColumnDef,
  DashboardInfoCard,
  DataTable,
  DeviceCardCompact,
  MoreActionsMenu,
  PageError,
  PageLayout,
  type Row,
  SearchInput,
  Skeleton,
  Tag,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ConfirmDeleteMonitoringModal } from '../../components/confirm-delete-monitoring-modal';
import { usePolicies } from '../../hooks/use-policies';
import type { Policy } from '../../types/policies.types';
import { computePolicySummary, getPolicyStatus, POLICY_STATUS_CONFIG } from '../../utils/compute-policy-summary';

const PAGE_SIZE = 20;

function parsePlatforms(platform: string | undefined): string[] {
  if (!platform) return [];
  return platform
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
}

function PolicyStatusCell({ policy }: { policy: Policy }) {
  const status = getPolicyStatus(policy);
  const config = POLICY_STATUS_CONFIG[status];
  const failing = policy.failing_host_count;
  const responded = policy.passing_host_count + failing;
  const missing = (policy.hosts_include_any?.length ?? 0) - responded;

  return (
    <div className="flex flex-col items-start gap-1">
      <Tag label={config.label} variant={config.variant} />
      {status === 'partial' && missing > 0 && (
        <span className="text-xs font-medium text-[var(--color-warning)]">
          {missing} {missing === 1 ? 'device' : 'devices'} left
        </span>
      )}
      {status === 'failing' && (
        <span className="text-xs font-medium text-[var(--ods-attention-red-error)]">
          {failing} {failing === 1 ? 'device' : 'devices'}
        </span>
      )}
    </div>
  );
}

export function Policies() {
  const router = useRouter();

  const { params, setParams } = useApiParams({
    search: { type: 'string', default: '' },
  });

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleSearch = useCallback(
    (term: string) => {
      setParams({ search: term });
      setVisibleCount(PAGE_SIZE);
    },
    [setParams],
  );

  const { policies, isLoading, error, deletePolicy } = usePolicies();
  const summary = useMemo(() => computePolicySummary(policies), [policies]);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);

  const filteredPolicies = useMemo(() => {
    if (!params.search || params.search.trim() === '') return policies;

    const searchLower = params.search.toLowerCase().trim();
    return policies.filter(
      policy =>
        policy.name.toLowerCase().includes(searchLower) || policy.description.toLowerCase().includes(searchLower),
    );
  }, [policies, params.search]);

  const visiblePolicies = useMemo(() => filteredPolicies.slice(0, visibleCount), [filteredPolicies, visibleCount]);

  const rowActions = useCallback(
    (policy: Policy) => [
      {
        label: 'Policy Details',
        onClick: () => router.push(`/monitoring/policy/${policy.id}`),
      },
      {
        label: 'Delete Policy',
        onClick: () => setPolicyToDelete(policy),
      },
    ],
    [router],
  );

  const columns = useMemo<ColumnDef<Policy>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }: { row: Row<Policy> }) => (
          <DeviceCardCompact deviceName={row.original.name} organization={row.original.description} />
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }: { row: Row<Policy> }) => (
          <span className="font-medium leading-[20px] text-ods-text-primary">
            {row.original.critical ? 'Critical ' : 'Low'}
          </span>
        ),
        meta: { width: 'w-[100px]', hideAt: 'md' },
      },
      {
        accessorKey: 'platform',
        header: 'Platform',
        cell: ({ row }: { row: Row<Policy> }) => {
          const platforms = parsePlatforms(row.original.platform);
          return platforms.length > 0 ? (
            <OSTypeBadgeGroup osTypes={platforms} iconSize="w-4 h-4" />
          ) : (
            <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">All</span>
          );
        },
        meta: { width: 'w-[140px]', hideAt: 'lg' },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: { row: Row<Policy> }) => <PolicyStatusCell policy={row.original} />,
        meta: { width: 'w-[140px]', hideAt: 'md' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<Policy> }) => (
          <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
            <MoreActionsMenu items={rowActions(row.original)} />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'min-w-[100px] w-auto shrink-0 flex-none', align: 'right' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<Policy> }) => (
          <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
            <Button
              href={`/monitoring/policy/${row.original.id}`}
              prefetch={false}
              variant="outline"
              size="icon"
              centerIcon={<Chevron02RightIcon className="w-5 h-5" />}
              aria-label="View details"
              className="bg-ods-card"
            />
          </div>
        ),
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', align: 'right' },
      },
    ],
    [rowActions],
  );

  const table = useDataTable<Policy>({
    data: visiblePolicies,
    columns,
    getRowId: (row: Policy) => String(row.id),
    enableSorting: false,
  });

  const policyRowHref = useCallback((policy: Policy) => `/monitoring/policy/${policy.id}`, []);

  const handleLoadMore = useCallback(() => setVisibleCount(prev => prev + PAGE_SIZE), []);

  const handleAddPolicy = useCallback(() => {
    router.push('/monitoring/policy/edit/new');
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Add Policy',
        variant: 'card' as const,
        icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleAddPolicy,
      },
    ],
    [handleAddPolicy],
  );

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <PageLayout title="Policies" actions={actions}>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : (
          <>
            <DashboardInfoCard title="Total Policies" value={summary.totalPolicies} />
            <DashboardInfoCard
              title="Compliance Rate"
              value={`${summary.compliantPolicies}/${summary.compliantPolicies + summary.failingPolicies}`}
              percentage={summary.compliantPoliciesPercentage}
              showProgress
            />
            <DashboardInfoCard
              title="Failed Policies"
              value={summary.failingPolicies}
              percentage={summary.failingPoliciesPercentage}
              showProgress
              progressVariant="error"
            />
            <DashboardInfoCard
              title="Updated"
              value={
                summary.lastUpdatedAt
                  ? formatDistanceToNow(new Date(summary.lastUpdatedAt), { addSuffix: true })
                  : 'N/A'
              }
              valueClassName="!text-h3"
              tooltip="Policy compliance stats are updated hourly. View a policy's devices for real-time status."
            />
          </>
        )}
      </div>

      {/* Sticky Search Bar */}
      <div className="sticky top-0 z-20 bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]">
        <SearchInput value={params.search} onChange={handleSearch} placeholder="Search for Policies" debounceMs={500} />
      </div>

      {/* Table */}
      <DataTable table={table}>
        <DataTable.Header stickyHeader stickyHeaderOffset="top-[96px]" rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isLoading}
          skeletonRows={PAGE_SIZE}
          emptyMessage={
            params.search
              ? `No policies found matching "${params.search}". Try adjusting your search.`
              : 'No policies found.'
          }
          rowClassName="mb-1"
          rowHref={policyRowHref}
        />
        {visibleCount < filteredPolicies.length && (
          <DataTable.InfiniteFooter
            hasNextPage
            isFetchingNextPage={false}
            onLoadMore={handleLoadMore}
            skeletonRows={2}
          />
        )}
      </DataTable>
      <ConfirmDeleteMonitoringModal
        open={!!policyToDelete}
        onOpenChange={open => {
          if (!open) setPolicyToDelete(null);
        }}
        itemName={policyToDelete?.name ?? ''}
        itemType="policy"
        onConfirm={() => {
          if (policyToDelete) {
            deletePolicy(policyToDelete.id, {
              onSuccess: () => setPolicyToDelete(null),
            });
          }
        }}
      />
    </PageLayout>
  );
}
