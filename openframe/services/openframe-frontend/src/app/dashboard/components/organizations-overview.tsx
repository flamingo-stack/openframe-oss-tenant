'use client'

import { DashboardInfoCard } from '@flamingo/ui-kit'
import { useOrganizationsOverview } from '../hooks/use-organizations-overview'
import { useRouter } from 'next/navigation'

export function OrganizationsOverviewSection() {
  const { rows, loading, error, totalOrganizations } = useOrganizationsOverview(10)
  const router = useRouter()

  return (
    <div className="space-y-4">
      <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
        Organizations Overview
      </h2>
      <p className="text-ods-text-secondary font-['DM_Sans'] font-medium text-[14px]">
        {totalOrganizations.toLocaleString()} Organizations in Total
      </p>

      <div className="flex flex-col gap-3">
        {loading && rows.length === 0 && (
          <div className="text-ods-text-secondary font-['DM_Sans'] text-[14px]">Loading organizations…</div>
        )}
        {error && (
          <div className="text-ods-error font-['DM_Sans'] text-[14px]">{error}</div>
        )}

        {rows.map((org) => (
          <div
            key={org.id}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
          >
            {/* Organization column */}
            <div
              className="bg-ods-card border border-ods-border rounded-[6px] p-4 flex flex-col justify-center cursor-pointer hover:bg-ods-bg-hover"
              onClick={() => router.push(`/organizations/details/${org.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-['DM_Sans'] font-bold text-[18px] leading-[24px] text-ods-text-primary truncate">
                    {org.name}
                  </div>
                  {org.websiteUrl && (
                    <div className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">
                      {org.websiteUrl}
                    </div>
                  )}
                </div>
                <div className="shrink-0 font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">
                  ({org.total.toLocaleString()} devices)
                </div>
              </div>
            </div>

            {/* Active devices */}
            <DashboardInfoCard
              title="Active Devices"
              value={org.active}
              percentage={org.activePct}
              showProgress
              progressColor="#5ea62e"
            />

            {/* Inactive devices */}
            <DashboardInfoCard
              title="Inactive Devices"
              value={org.inactive}
              percentage={org.inactivePct}
              showProgress
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrganizationsOverviewSection
