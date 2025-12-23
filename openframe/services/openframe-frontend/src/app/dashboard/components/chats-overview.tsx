'use client'

import { DashboardInfoCard } from '@flamingo-stack/openframe-frontend-core'
import { useChatsOverview } from '../hooks/use-dashboard-stats'

export function ChatsOverviewSection() {
  const chats = useChatsOverview()

  return (
    <div className="space-y-4">
      <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
        Chats Overview
      </h2>
      <p className="text-ods-text-secondary font-['DM_Sans'] font-medium text-[14px]">
        {chats.total.toLocaleString()} Chats in Total
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardInfoCard
          title="Active Chats"
          value={chats.active}
          percentage={chats.activePercentage}
          showProgress
          progressColor="#5ea62e"
          href="/mingo"
        />
        <DashboardInfoCard
          title="Resolved Chats"
          value={chats.resolved}
          percentage={chats.resolvedPercentage}
          showProgress
          href="/mingo"
        />
        <DashboardInfoCard
          title="Avg. Resolve Time"
          value={chats.avgResolveTime}
          href="/mingo"
        />
        <DashboardInfoCard
          title="Avg. Fae Rate"
          value={`${chats.avgFaeRate}/5`}
          href="/mingo"
        />
      </div>
    </div>
  )
}

export default ChatsOverviewSection


