'use client'

import { useCallback, useMemo } from 'react'
import { DashboardInfoCard, OrganizationCard, Skeleton } from '@flamingo-stack/openframe-frontend-core'
import { getFullImageUrl } from '@lib/image-url'
import { useRouter } from 'next/navigation'
import { useOrganizationsOverview } from '../hooks/use-organizations-overview'

const OrganizationsSkeleton = function OrganizationsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {/* Organization card skeleton */}
          <div className="bg-ods-card border border-ods-border rounded-[6px] p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          
          {/* Active devices card skeleton */}
          <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2 w-full" />
          </div>
          
          {/* Inactive devices card skeleton */}
          <div className="bg-ods-card border border-ods-border rounded-[6px] p-4 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Organizations Overview Section
 */
export function OrganizationsOverviewSection() {
  const { rows, loading, error, totalOrganizations } = useOrganizationsOverview(10)
  const router = useRouter()

  const handleOrgClick = useCallback((organizationId: string) => {
    router.push(`/devices?organizationIds=${organizationId}`)
  }, [router])

  const organizationRows = useMemo(() => {
    if (loading && rows.length === 0) {
      return <OrganizationsSkeleton />
    }

    if (error) {
      return <div className="text-ods-error font-['DM_Sans'] text-[14px]">{error}</div>
    }

    return rows.map((org) => {
      const fullImageUrl = getFullImageUrl(org.imageUrl)

      return (
        <div
          key={org.id}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
        >
          {/* Organization column */}
          <OrganizationCard
            organization={org}
            fetchedImageUrl={fullImageUrl}
            onClick={() => handleOrgClick(org.organizationId)}
            deviceCount={org.total}
          />

          {/* Active devices */}
          <DashboardInfoCard
            title="Online Devices"
            value={org.active}
            percentage={org.activePct}
            showProgress
            href={org.active > 0
              ? `/devices?organizationIds=${org.organizationId}&statuses=ONLINE`
              : `/devices?organizationIds=${org.organizationId}`}
          />

          {/* Inactive devices */}
          <DashboardInfoCard
            title="Offline Devices"
            value={org.inactive}
            percentage={org.inactivePct}
            showProgress
            href={org.inactive > 0
              ? `/devices?organizationIds=${org.organizationId}&statuses=OFFLINE`
              : `/devices?organizationIds=${org.organizationId}`}
          />
        </div>
      )
    })
  }, [rows, loading, error, handleOrgClick])

  return (
    <div className="space-y-4">
      <h2 className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.48px] text-ods-text-primary">
        Organizations Overview
      </h2>
      {loading ? (
        <Skeleton className="h-5 w-48" />
      ) : (
        <p className="text-ods-text-secondary font-['DM_Sans'] font-medium text-[14px]">
          {totalOrganizations.toLocaleString()} Organizations in Total
        </p>
      )}

      <div className="flex flex-col gap-3">
        {organizationRows}
      </div>
    </div>
  )
}

export default OrganizationsOverviewSection
