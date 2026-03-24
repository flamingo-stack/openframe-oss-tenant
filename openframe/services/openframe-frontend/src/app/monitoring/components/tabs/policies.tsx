'use client';

import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components/features';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  DashboardInfoCard,
  DeviceCardCompact,
  ListPageLayout,
  MoreActionsMenu,
  Skeleton,
  Table,
  type TableColumn,
  Tag,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ConfirmDeleteMonitoringModal } from '../../components/confirm-delete-monitoring-modal';
import { useLivePolicyCounts } from '../../hooks/use-live-policy-counts';
import { usePolicies } from '../../hooks/use-policies';
import { usePolicySummary } from '../../hooks/use-policy-summary';
import type { Policy } from '../../types/policies.types';

const PAGE_SIZE = 20;

function parsePlatforms(platform: string | undefined): string[] {
  if (!platform) return [];
  return platform
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
}

function PolicyStatusCell({ failingCount }: { failingCount: number }) {
  const isFailing = failingCount > 0;

  return (
    <div className="flex flex-col items-start gap-1">
      <Tag label={isFailing ? 'Failing' : 'Compliant'} variant={isFailing ? 'error' : 'success'} />
      {isFailing && (
        <span className="text-xs font-medium text-[var(--ods-attention-red-error)]">
          {failingCount} {failingCount === 1 ? 'device' : 'devices'}
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
  const summary = usePolicySummary();
  const policyIds = useMemo(() => policies.map(p => p.id), [policies]);
  const { countsMap: liveCounts } = useLivePolicyCounts(policyIds);
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

  const columns: TableColumn<Policy>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        renderCell: policy => <DeviceCardCompact deviceName={policy.name} organization={policy.description} />,
      },
      {
        key: 'severity',
        label: 'Severity',
        width: 'w-[100px]',
        hideAt: 'md',
        renderCell: policy => (
          <span className="font-medium leading-[20px] text-ods-text-primary">
            {policy.critical ? 'Critical ' : 'Low'}
          </span>
        ),
      },
      {
        key: 'platform',
        label: 'Platform',
        width: 'w-[140px]',
        hideAt: 'lg',
        renderCell: policy => {
          const platforms = parsePlatforms(policy.platform);
          return platforms.length > 0 ? (
            <OSTypeBadgeGroup osTypes={platforms} iconSize="w-4 h-4" />
          ) : (
            <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">All</span>
          );
        },
      },
      {
        key: 'status',
        label: 'Status',
        width: 'w-[120px]',
        hideAt: 'md',
        renderCell: policy => {
          const failingCount = liveCounts.get(policy.id)?.failing ?? policy.failing_host_count;
          return <PolicyStatusCell failingCount={failingCount} />;
        },
      },
    ],
    [liveCounts],
  );

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

  const renderRowActions = useMemo(() => {
    return (policy: Policy) => <MoreActionsMenu items={rowActions(policy)} />;
  }, [rowActions]);

  const handleRowClick = useCallback(
    (policy: Policy) => {
      router.push(`/monitoring/policy/${policy.id}`);
    },
    [router],
  );

  const handleAddPolicy = useCallback(() => {
    router.push('/monitoring/policy/edit/new');
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Add Policy',
        icon: <PlusCircleIcon size={24} className="text-ods-text-secondary" />,
        onClick: handleAddPolicy,
      },
    ],
    [handleAddPolicy],
  );

  return (
    <ListPageLayout
      title="Policies"
      actions={actions}
      searchPlaceholder="Search for Policies"
      searchValue={params.search}
      onSearch={handleSearch}
      background="default"
      padding="none"
      className="pt-6"
      error={error}
      stickyHeader
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.isLoading ? (
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
              value={`${summary.totalPassingEvaluations}/${summary.totalEvaluations}`}
              percentage={summary.complianceRate}
              showProgress
            />
            <DashboardInfoCard
              title="Failed Policies"
              value={summary.failingPolicies}
              percentage={summary.failingPoliciesPercentage}
              showProgress
              progressColor="var(--ods-attention-red-error)"
            />
            <DashboardInfoCard
              title="Non-Compliant Devices"
              value={summary.isLoadingHosts ? '...' : summary.nonCompliantDevices}
              percentage={summary.isLoadingHosts ? undefined : summary.nonCompliantDevicesPercentage}
              showProgress={!summary.isLoadingHosts}
              progressColor="var(--ods-attention-red-error)"
            />
          </>
        )}
      </div>

      {/* Table */}
      <Table
        data={visiblePolicies}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        skeletonRows={PAGE_SIZE}
        emptyMessage={
          params.search
            ? `No policies found matching "${params.search}". Try adjusting your search.`
            : 'No policies found.'
        }
        showFilters={false}
        rowClassName="mb-1"
        onRowClick={handleRowClick}
        infiniteScroll={{
          hasNextPage: visibleCount < filteredPolicies.length,
          isFetchingNextPage: false,
          onLoadMore: () => setVisibleCount(prev => prev + PAGE_SIZE),
          skeletonRows: 2,
        }}
        stickyHeader
        stickyHeaderOffset="top-[56px]"
        renderRowActions={renderRowActions}
      />
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
    </ListPageLayout>
  );
}
