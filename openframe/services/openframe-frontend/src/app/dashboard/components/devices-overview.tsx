'use client'

import { DashboardInfoCard } from '@flamingo/ui-kit'
import { useDevicesOverview } from '../hooks/use-dashboard-stats'

export function DevicesOverviewSection() {
  const devices = useDevicesOverview()

  return (
    <div className="space-y-4">
      <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
        Devices Overview
      </h2>
      <p className="text-ods-text-secondary font-['DM_Sans'] font-medium text-[14px]">
        {devices.total.toLocaleString()} Devices in Total
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardInfoCard
          title="Active Devices"
          value={devices.active}
          percentage={devices.activePercentage}
          showProgress
          progressColor="#5ea62e"
        />
        <DashboardInfoCard
          title="Inactive"
          value={devices.inactive}
          percentage={devices.inactivePercentage}
          showProgress
        />
      </div>
    </div>
  )
}

export default DevicesOverviewSection


