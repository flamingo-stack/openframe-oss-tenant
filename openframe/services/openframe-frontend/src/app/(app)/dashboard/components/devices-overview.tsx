'use client';

import { DashboardInfoCard, Skeleton } from '@flamingo-stack/openframe-frontend-core';
import { useDevicesOverview } from '../hooks/use-dashboard-stats';

export function DevicesOverviewSection() {
  const devices = useDevicesOverview();

  if (devices.isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-h2 text-ods-text-primary">Devices Overview</h2>
          <Skeleton className="h-5 w-48" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-h2 text-ods-text-primary">Devices Overview</h2>
        <p className="text-h6 text-ods-text-secondary">{devices.total.toLocaleString()} Devices in Total</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardInfoCard
          title="Online"
          value={devices.active}
          percentage={devices.activePercentage}
          showProgress
          href="/devices?statuses=ONLINE"
        />
        <DashboardInfoCard
          title="Offline"
          value={devices.inactive}
          percentage={devices.inactivePercentage}
          showProgress
          href="/devices?statuses=OFFLINE"
        />
      </div>
    </div>
  );
}

export default DevicesOverviewSection;
