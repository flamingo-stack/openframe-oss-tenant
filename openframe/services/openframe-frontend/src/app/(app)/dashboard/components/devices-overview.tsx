'use client';

import { DashboardInfoCard, Skeleton, TitleBlock } from '@flamingo-stack/openframe-frontend-core';
import { DEVICE_STATUS } from '../../devices/constants/device-statuses';
import { useDevicesOverview } from '../hooks/use-dashboard-stats';

type DeviceStatusCard = {
  status: string;
  title: string;
  value: number;
  percentage: number;
  progressVariant: 'success' | 'error' | 'warning' | 'info';
};

export function DevicesOverviewSection() {
  const devices = useDevicesOverview();

  const statusCards: DeviceStatusCard[] = [
    {
      status: DEVICE_STATUS.ONLINE,
      title: 'Online Devices',
      value: devices.active,
      percentage: devices.activePercentage,
      progressVariant: 'success',
    },
    {
      status: DEVICE_STATUS.OFFLINE,
      title: 'Offline Devices',
      value: devices.inactive,
      percentage: devices.inactivePercentage,
      progressVariant: 'error',
    },
    {
      status: DEVICE_STATUS.PENDING,
      title: 'Pending Devices',
      value: devices.pending,
      percentage: devices.pendingPercentage,
      progressVariant: 'warning',
    },
    {
      status: DEVICE_STATUS.ARCHIVED,
      title: 'Archived Devices',
      value: devices.archived,
      percentage: devices.archivedPercentage,
      progressVariant: 'info',
    },
  ];

  if (devices.isLoading) {
    return (
      <div className="space-y-4">
        <TitleBlock title="Devices Overview" className="pt-0 mb-0" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statusCards.map(card => (
            <Skeleton key={card.status} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TitleBlock
        title="Devices Overview"
        subtitle={`${devices.total.toLocaleString()} Devices in Total`}
        className="pt-1 mb-0 [&_p]:hidden lg:[&_p]:block"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map(card => (
          <DashboardInfoCard
            key={card.status}
            title={card.title}
            value={card.value}
            percentage={card.percentage}
            showProgress
            progressVariant={card.progressVariant}
            percentageDisplay="plain"
            progressSize={{ base: 24, md: 56 }}
            href={`/devices?statuses=${card.status}`}
          />
        ))}
      </div>
    </div>
  );
}

export default DevicesOverviewSection;
