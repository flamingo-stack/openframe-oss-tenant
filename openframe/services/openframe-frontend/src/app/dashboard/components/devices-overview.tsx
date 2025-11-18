'use client'

import { DashboardInfoCard } from '@flamingo/ui-kit'
import { useDevicesOverview } from '../hooks/use-dashboard-stats'
import { useRouter } from 'next/navigation'

export function DevicesOverviewSection() {
  const devices = useDevicesOverview()
  const router = useRouter()

  const onClick = () => {
    router.push('/devices')
  }

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
          title="Online"
          value={devices.active}
          percentage={devices.activePercentage}
          showProgress
          progressColor="#5ea62e"
          onClick={onClick}
          className="cursor-pointer hover:bg-ods-bg-hover"
        />
        <DashboardInfoCard
          title="Offline"
          value={devices.inactive}
          percentage={devices.inactivePercentage}
          showProgress
          onClick={onClick}
          className="cursor-pointer hover:bg-ods-bg-hover"
        />
      </div>
    </div>
  )
}

export default DevicesOverviewSection
