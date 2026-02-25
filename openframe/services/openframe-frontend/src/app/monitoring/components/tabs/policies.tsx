'use client';

import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components/features';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  DeviceCardCompact,
  ListPageLayout,
  MoreActionsMenu,
  StatusTag,
  Table,
  type TableColumn,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce, useTablePagination } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePolicies } from '../../hooks/use-policies';
import type { Policy } from '../../types/policies.types';

const PAGE_SIZE = 10;

function parsePlatforms(platform: string | undefined): string[] {
  if (!platform) return [];
  return platform
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
}

function PolicyStatusCell({ policy }: { policy: Policy }) {
  const isFailing = policy.failing_host_count > 0;

  return (
    <div className="flex flex-col items-start gap-1">
      <StatusTag label={isFailing ? 'Failing' : 'Compliant'} variant={isFailing ? 'error' : 'success'} />
      {isFailing && (
        <span className="text-xs font-medium text-[var(--ods-attention-red-error)]">
          {policy.failing_host_count} {policy.failing_host_count === 1 ? 'device' : 'devices'}
        </span>
      )}
    </div>
  );
}

export function Policies() {
  const router = useRouter();

  const { params, setParam, setParams } = useApiParams({
    search: { type: 'string', default: '' },
    page: { type: 'number', default: 1 },
  });

  const [searchInput, setSearchInput] = useState(params.search);
  const debouncedSearchInput = useDebounce(searchInput, 300);
  const lastSearchRef = React.useRef(params.search);

  useEffect(() => {
    if (debouncedSearchInput !== lastSearchRef.current) {
      lastSearchRef.current = debouncedSearchInput;
      setParams({ search: debouncedSearchInput, page: 1 });
    }
  }, [debouncedSearchInput, setParams]);

  const { policies, isLoading, error } = usePolicies();

  const filteredPolicies = useMemo(() => {
    if (!params.search || params.search.trim() === '') return policies;

    const searchLower = params.search.toLowerCase().trim();
    return policies.filter(
      policy =>
        policy.name.toLowerCase().includes(searchLower) || policy.description.toLowerCase().includes(searchLower),
    );
  }, [policies, params.search]);

  const paginatedPolicies = useMemo(() => {
    const start = (params.page - 1) * PAGE_SIZE;
    return filteredPolicies.slice(start, start + PAGE_SIZE);
  }, [filteredPolicies, params.page]);

  const totalPages = useMemo(() => Math.ceil(filteredPolicies.length / PAGE_SIZE), [filteredPolicies.length]);

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
        hideAt: 'sm',
        renderCell: policy => <PolicyStatusCell policy={policy} />,
      },
    ],
    [],
  );

  const rowActions = useCallback(
    (policy: Policy) => [
      {
        label: 'Policy Details',
        onClick: () => router.push(`/monitoring/policy/${policy.id}`),
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

  const cursorPagination = useTablePagination(
    totalPages > 1
      ? {
          type: 'client',
          currentPage: params.page,
          totalPages,
          itemCount: paginatedPolicies.length,
          itemName: 'policies',
          onNext: () => setParam('page', Math.min(params.page + 1, totalPages)),
          onPrevious: () => setParam('page', Math.max(params.page - 1, 1)),
          showInfo: true,
        }
      : null,
  );

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
      searchValue={searchInput}
      onSearch={setSearchInput}
      error={error}
      background="default"
      padding="none"
      className="pt-6"
    >
      <Table
        data={paginatedPolicies}
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
        cursorPagination={cursorPagination}
        renderRowActions={renderRowActions}
      />
    </ListPageLayout>
  );
}
