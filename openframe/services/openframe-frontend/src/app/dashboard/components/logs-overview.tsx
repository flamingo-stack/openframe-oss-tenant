'use client'

import { DashboardInfoCard } from '@flamingo/ui-kit'
import { useLogsOverview } from '../hooks/use-dashboard-stats'

export function LogsOverviewSection() {
  const logs = useLogsOverview()

  return (
    <div className="space-y-4">
      <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
        Logs Overview
      </h2>
      <p className="text-ods-text-secondary font-['DM_Sans'] font-medium text-[14px]">
        {logs.total.toLocaleString()} Logs in Total
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardInfoCard
          title="Info Logs"
          value={logs.info}
          percentage={logs.infoPercentage}
          showProgress
          progressColor="#5ea62e"
        />
        <DashboardInfoCard
          title="Warning Logs"
          value={logs.warning}
          percentage={logs.warningPercentage}
          showProgress
          progressColor="#d29b2e"
        />
        <DashboardInfoCard
          title="Critical Logs"
          value={logs.critical}
          percentage={logs.criticalPercentage}
          showProgress
          progressColor="#b43b3b"
        />
      </div>
    </div>
  )
}

export default LogsOverviewSection


