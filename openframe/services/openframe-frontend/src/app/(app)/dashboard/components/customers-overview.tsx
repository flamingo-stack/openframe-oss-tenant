'use client';

import { DashboardInfoCard, OrganizationCard, TitleBlock } from '@flamingo-stack/openframe-frontend-core';
import { IdCardIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useMemo } from 'react';
import { EmptyState } from '@/app/components/shared';
import { getFullImageUrl } from '@/lib/image-url';
import { routes } from '@/lib/routes';
import { useCustomersOverview } from '../hooks/use-customers-overview';
import { CustomersOverviewSkeleton } from './dashboard-skeletons';

/**
 * Organizations Overview Section
 */
export function CustomersOverviewSection() {
  const { rows, loading, error, totalOrganizations } = useCustomersOverview(10);

  const organizationRows = useMemo(() => {
    if (error) {
      return <div className="text-ods-error font-['DM_Sans'] text-[14px]">{error}</div>;
    }

    if (rows.length === 0) {
      return (
        <EmptyState
          icon={<IdCardIcon />}
          title="No Customers added yet"
          description="Add your first Customer to get started"
        />
      );
    }

    return rows.map(org => {
      const fullImageUrl = getFullImageUrl(org.imageUrl, org.imageHash);

      return (
        <div key={org.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {/* Organization column */}
          <OrganizationCard
            organization={org}
            fetchedImageUrl={fullImageUrl}
            href={routes.customers.details(org.organizationId)}
            deviceCount={org.total}
          />

          {/* Active devices */}
          <DashboardInfoCard
            title="Online Devices"
            value={org.active}
            percentage={org.activePct}
            showProgress
            progressVariant="success"
            percentageDisplay="plain"
            progressSize={{ base: 24, md: 56 }}
            href={
              org.active > 0
                ? `/devices?organizationIds=${org.organizationId}&statuses=ONLINE`
                : `/devices?organizationIds=${org.organizationId}`
            }
          />

          {/* Inactive devices */}
          <DashboardInfoCard
            title="Offline Devices"
            value={org.inactive}
            percentage={org.inactivePct}
            showProgress
            progressVariant="error"
            percentageDisplay="plain"
            progressSize={{ base: 24, md: 56 }}
            href={
              org.inactive > 0
                ? `/devices?organizationIds=${org.organizationId}&statuses=OFFLINE`
                : `/devices?organizationIds=${org.organizationId}`
            }
          />
        </div>
      );
    });
  }, [rows, error]);

  // Initial load (no rows yet) — render the full skeleton so the header (with its
  // subtitle line) matches the loaded layout and doesn't jump when data arrives.
  if (loading && rows.length === 0) {
    return <CustomersOverviewSkeleton />;
  }

  return (
    <div className="space-y-4">
      <TitleBlock
        title="Customers Overview"
        subtitle={`${totalOrganizations.toLocaleString()} Customers in Total`}
        className="pt-0 mb-0 [&_p]:hidden lg:[&_p]:block"
      />

      <div className="flex flex-col gap-3">{organizationRows}</div>
    </div>
  );
}

export default CustomersOverviewSection;
