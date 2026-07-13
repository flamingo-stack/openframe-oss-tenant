'use client';

import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  BellCheckIcon,
  FolderShieldIcon,
  Hierarchy02Icon,
  PlusCircleIcon,
  RadarIcon,
  SearchIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  DashboardInfoCard,
  DataTable,
  Input,
  PageError,
  PageLayout,
  Skeleton,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { EmptyState, PoliciesTable, type PolicyTableRow, type PolicyTableStatus } from '@/app/components/shared';
import { useSearchParam } from '@/app/hooks/use-search-param';
import { useStickyToolbar } from '@/app/hooks/use-sticky-toolbar';
import { routes } from '@/lib/routes';
import { ConfirmDeleteMonitoringModal } from '../../components/confirm-delete-monitoring-modal';
import { usePolicies } from '../../hooks/use-policies';
import type { Policy } from '../../types/policies.types';
import { computePolicySummary, getPolicyStatus, POLICY_STATUS_CONFIG } from '../../utils/compute-policy-summary';

const PAGE_SIZE = 20;

// Temporarily hidden along with the Platform column. Restore to re-enable.
// An empty platform string means the policy applies to every OS, so we render
// the full set of OS icons rather than a plain-text "All" label.
// const ALL_PLATFORMS = ['windows', 'darwin', 'linux'];

// function parsePlatforms(platform: string | undefined): string[] {
//   if (!platform) return [];
//   return platform
//     .split(',')
//     .map(p => p.trim())
//     .filter(Boolean);
// }

export function Policies() {
  const router = useRouter();
  const askMingo = useAskMingo();

  const { params, setParams } = useApiParams({
    search: { type: 'string', default: '' },
  });

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { toolbarRef, containerStyle, stickyHeaderOffset } = useStickyToolbar();

  // Local search keeps typing responsive; the shared hook debounces the write to
  // the URL param so we don't navigate the router (and re-filter) on every keystroke.
  const { search, setSearch, debouncedSearch } = useSearchParam(
    params.search,
    value => setParams({ search: value }),
    300,
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setVisibleCount(PAGE_SIZE);
    },
    [setSearch],
  );

  const { policies, isLoading, error, deletePolicy } = usePolicies();
  const summary = useMemo(() => computePolicySummary(policies), [policies]);

  // Show the empty state instead of the search bar + table only when there is
  // genuinely no data: loading finished, no active search, and no policies.
  const showEmptyState = !isLoading && !debouncedSearch.trim() && policies.length === 0;
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);

  const filteredPolicies = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.trim() === '') return policies;

    const searchLower = debouncedSearch.toLowerCase().trim();
    return policies.filter(
      policy =>
        policy.name.toLowerCase().includes(searchLower) || policy.description.toLowerCase().includes(searchLower),
    );
  }, [policies, debouncedSearch]);

  const visiblePolicies = useMemo(() => filteredPolicies.slice(0, visibleCount), [filteredPolicies, visibleCount]);

  const rowActions = useCallback(
    (policy: Policy) => [
      {
        label: 'Policy Details',
        onClick: () => router.push(routes.monitoring.policy(policy.id)),
      },
      {
        label: 'Delete Policy',
        onClick: () => setPolicyToDelete(policy),
      },
    ],
    [router],
  );

  // Map the fleet-wide Policy model into the shared table's normalized view-model.
  const rows = useMemo<PolicyTableRow[]>(
    () =>
      visiblePolicies.map(policy => {
        const status = getPolicyStatus(policy);
        const config = POLICY_STATUS_CONFIG[status];
        const failing = policy.failing_host_count;
        const responded = policy.passing_host_count + failing;
        const missing = (policy.hosts_include_any?.length ?? 0) - responded;

        let note: PolicyTableStatus['note'];
        if (status === 'partial' && missing > 0) {
          note = { text: `${missing} ${missing === 1 ? 'device' : 'devices'} left`, tone: 'warning' };
        } else if (status === 'failing') {
          note = { text: `${failing} ${failing === 1 ? 'device' : 'devices'}`, tone: 'error' };
        }

        return {
          id: String(policy.id),
          name: policy.name,
          description: policy.description,
          critical: policy.critical,
          severityLabel: policy.critical ? 'Critical' : 'Low',
          status: { label: config.label, variant: config.variant, note },
          // Temporarily hidden along with the Platform column. Restore to re-enable.
          // platforms: parsePlatforms(policy.platform),
          actions: rowActions(policy),
          href: routes.monitoring.policy(policy.id),
        };
      }),
    [visiblePolicies, rowActions],
  );

  const handleLoadMore = useCallback(() => setVisibleCount(prev => prev + PAGE_SIZE), []);

  const handleAddPolicy = useCallback(() => {
    router.push(routes.monitoring.policyNew);
  }, [router]);

  const actions = useMemo(
    () => [
      {
        label: 'Add Policy',
        variant: (showEmptyState ? 'accent' : 'outline') as 'accent' | 'outline',
        icon: (
          <PlusCircleIcon
            size={24}
            className={showEmptyState ? 'text-ods-text-on-accent' : 'text-ods-text-secondary'}
          />
        ),
        onClick: handleAddPolicy,
      },
    ],
    [handleAddPolicy, showEmptyState],
  );

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <PageLayout
      title="Policies"
      actions={actions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
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

      {showEmptyState ? (
        <EmptyState
          icon={<FolderShieldIcon />}
          title="No policies yet"
          description="Rules that automatically enforce settings, configurations, and security standards across devices will be displayed here."
          actions={[
            { icon: <Hierarchy02Icon />, label: 'Apply settings to many devices at once' },
            { icon: <RadarIcon />, label: 'Target devices by Customer, OS, or tag' },
            { icon: <BellCheckIcon />, label: 'Get alerts when devices fall out of compliance' },
          ]}
          buttonLabel="Ask Mingo about Policies"
          buttonIcon={
            <MingoIcon
              className="size-5"
              eyesColor="var(--ods-flamingo-cyan-base)"
              cornerColor="var(--ods-flamingo-cyan-base)"
            />
          }
          onButtonClick={() => askMingo('policies')}
        />
      ) : (
        <div className="flex flex-col gap-[var(--spacing-system-l)]" style={containerStyle}>
          {/* Sticky Search Bar */}
          <div
            ref={toolbarRef}
            className="sticky top-0 z-20 bg-ods-bg py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]"
          >
            <Input
              placeholder="Search for Policies"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              startAdornment={<SearchIcon />}
            />
          </div>

          {/* Table */}
          {/* Platform column temporarily hidden from users — omit `showPlatform` to restore. */}
          <PoliciesTable
            rows={rows}
            isLoading={isLoading}
            rowAsLink
            stickyHeader
            stickyHeaderOffset={stickyHeaderOffset}
            rightSlot={<DataTable.RowCount />}
            skeletonRows={PAGE_SIZE}
            emptyMessage={
              debouncedSearch
                ? `No policies found matching "${debouncedSearch}". Try adjusting your search.`
                : 'No policies found.'
            }
            hasMore={visibleCount < filteredPolicies.length}
            onLoadMore={handleLoadMore}
          />
        </div>
      )}
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
