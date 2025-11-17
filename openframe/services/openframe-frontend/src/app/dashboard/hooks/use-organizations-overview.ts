'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@lib/api-client'
import { GET_ORGANIZATIONS_QUERY } from '../../organizations/queries/organizations-queries'
import { GET_DEVICE_FILTERS_QUERY } from '../../devices/queries/devices-queries'

type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

type OrganizationsQuery = {
  organizations: {
    organizations: Array<{
      id: string
      organizationId: string
      name: string
      websiteUrl?: string
    }>
  }
}

type DeviceFiltersResponse = {
  deviceFilters: {
    statuses?: Array<{ value: string, count: number }>
    filteredCount: number
  }
}

export interface OrganizationOverviewRow {
  id: string
  organizationId: string
  name: string
  websiteUrl: string
  total: number
  active: number
  inactive: number
  activePct: number
  inactivePct: number
}

export function useOrganizationsOverview(limit: number = 10) {
  const [rows, setRows] = useState<OrganizationOverviewRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const activeStatuses = ['ONLINE']

    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const orgRes = await apiClient.post<GraphQLResponse<OrganizationsQuery>>('/api/graphql', {
          query: GET_ORGANIZATIONS_QUERY,
          variables: { search: '' }
        })

        if (!orgRes.ok) {
          throw new Error(orgRes.error || `Organizations request failed: ${orgRes.status}`)
        }

        const orgList = orgRes.data?.data?.organizations?.organizations || []
        const top = orgList.slice(0, limit)

        const perOrgPromises = top.map(async (org) => {
          const orgId = org.organizationId
          const websiteUrl = org.websiteUrl || ''

          const filtersRes = await apiClient.post<GraphQLResponse<DeviceFiltersResponse>>('/api/graphql', {
            query: GET_DEVICE_FILTERS_QUERY,
            variables: { filter: { organizationIds: [orgId] } },
          })

          const total = filtersRes.ok ? (filtersRes.data?.data?.deviceFilters?.filteredCount || 0) : 0
          const statuses = (filtersRes.data?.data?.deviceFilters?.statuses || [])
          const active = statuses
            .filter(s => activeStatuses.includes((s.value || '').toUpperCase()))
            .reduce((sum, s) => sum + (s.count || 0), 0)
          const inactive = Math.max(0, total - active)
          const activePct = total > 0 ? Math.round((active / total) * 100) : 0
          const inactivePct = total > 0 ? Math.round((inactive / total) * 100) : 0

          const row: OrganizationOverviewRow = {
            id: org.id,
            organizationId: orgId,
            name: org.name,
            websiteUrl,
            total,
            active,
            inactive,
            activePct,
            inactivePct,
          }
          return row
        })

        const settled = await Promise.allSettled(perOrgPromises)
        const rows = settled
          .filter((r): r is PromiseFulfilledResult<OrganizationOverviewRow> => r.status === 'fulfilled')
          .map((r) => r.value)
          .sort((a, b) => b.total - a.total)

        if (!mounted) return
        setRows(rows)
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to fetch organizations overview')
        setRows([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchAll()
    return () => { mounted = false }
  }, [limit])

  const totalOrganizations = rows.length

  return useMemo(() => ({ rows, loading, error, totalOrganizations }), [rows, loading, error, totalOrganizations])
}
