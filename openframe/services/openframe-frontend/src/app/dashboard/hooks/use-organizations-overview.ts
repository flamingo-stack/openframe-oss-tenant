'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { apiClient } from '@lib/api-client'
import { GET_ORGANIZATION_BY_ID_QUERY, GET_ORGANIZATIONS_QUERY } from '../../organizations/queries/organizations-queries'
import { GET_DEVICE_FILTERS_QUERY } from '../../devices/queries/devices-queries'
import { DEFAULT_VISIBLE_STATUSES } from '../../devices/constants/device-statuses'

type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

type OrganizationNode = {
  id: string
  organizationId: string
  name: string
  websiteUrl?: string
  image?: {
    imageUrl?: string
  }
}

type OrganizationByIdQuery = {
  organization: OrganizationNode | null
}

type OrganizationsCountQuery = {
  organizations: {
    filteredCount: number
  }
}

type DeviceFiltersResponse = {
  deviceFilters: {
    statuses?: Array<{ value: string, count: number }>
    organizationIds?: Array<{ value: string, label: string, count: number }>
    filteredCount: number
  }
}

export interface OrganizationOverviewRow {
  id: string
  organizationId: string
  name: string
  websiteUrl: string
  imageUrl?: string | null
  total: number
  active: number
  inactive: number
  activePct: number
  inactivePct: number
}

const ACTIVE_STATUSES = ['ONLINE'] as const

/**
 * Hook to fetch organizations overview data for the dashboard
 *
 * Best practices implemented:
 * - Uses refs to prevent duplicate fetches and track mount state
 * - Uses useCallback for stable function references
 * - Batches API calls where possible with Promise.all
 * - Memoizes return value to prevent unnecessary re-renders
 * - Properly handles race conditions with mounted ref
 */
export function useOrganizationsOverview(limit: number = 10) {
  const [rows, setRows] = useState<OrganizationOverviewRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [totalOrganizations, setTotalOrganizations] = useState<number>(0)

  // Refs to prevent duplicate fetches and track mount state
  const fetchedRef = useRef(false)
  const isMountedRef = useRef(true)

  // Helper to calculate device stats from status array
  const calculateDeviceStats = useCallback((
    statuses: Array<{ value: string, count: number }>,
    totalDevices: number
  ) => {
    const active = statuses
      .filter(s => ACTIVE_STATUSES.includes((s.value || '').toUpperCase() as typeof ACTIVE_STATUSES[number]))
      .reduce((sum, s) => sum + (s.count || 0), 0)
    const inactive = Math.max(0, totalDevices - active)
    const activePct = totalDevices > 0 ? Math.round((active / totalDevices) * 100) : 0
    const inactivePct = totalDevices > 0 ? Math.round((inactive / totalDevices) * 100) : 0

    return { active, inactive, activePct, inactivePct }
  }, [])

  // Fetch organization details by ID (accepts both internal id and organizationId)
  const fetchOrgDetails = useCallback(async (orgId: string): Promise<OrganizationNode | null> => {
    const res = await apiClient.post<GraphQLResponse<OrganizationByIdQuery>>('/api/graphql', {
      query: GET_ORGANIZATION_BY_ID_QUERY,
      variables: { id: orgId }
    })
    return res.data?.data?.organization || null
  }, [])

  // Fetch device status breakdown for an organization
  const fetchOrgDeviceStats = useCallback(async (orgId: string) => {
    const res = await apiClient.post<GraphQLResponse<DeviceFiltersResponse>>('/api/graphql', {
      query: GET_DEVICE_FILTERS_QUERY,
      variables: { filter: { organizationIds: [orgId], statuses: [...DEFAULT_VISIBLE_STATUSES] } }
    })
    return res.data?.data?.deviceFilters
  }, [])

  // Main fetch function with stable reference
  const fetchOrganizationsOverview = useCallback(async () => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    setLoading(true)
    setError(null)

    try {
      // Step 1: Fetch total org count and device filters in parallel
      const [orgCountRes, globalFiltersRes] = await Promise.all([
        apiClient.post<GraphQLResponse<OrganizationsCountQuery>>('/api/graphql', {
          query: GET_ORGANIZATIONS_QUERY,
          variables: { search: '', pagination: { limit: 100, cursor: null } }
        }),
        apiClient.post<GraphQLResponse<DeviceFiltersResponse>>('/api/graphql', {
          query: GET_DEVICE_FILTERS_QUERY,
          variables: { filter: { statuses: [...DEFAULT_VISIBLE_STATUSES] } }
        })
      ])

      if (!isMountedRef.current) return

      if (!globalFiltersRes.ok) {
        throw new Error(globalFiltersRes.error || `Device filters request failed: ${globalFiltersRes.status}`)
      }

      // Set total organization count
      const totalOrgCount = orgCountRes.data?.data?.organizations?.filteredCount || 0
      setTotalOrganizations(totalOrgCount)

      // Get organizations with devices, sorted by count descending
      const orgFilters = globalFiltersRes.data?.data?.deviceFilters?.organizationIds || []
      const orgsWithDevices = orgFilters
        .filter(o => o.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)

      if (!isMountedRef.current) return

      // Step 2: Fetch details for each org in parallel batches
      // Batch org details and device stats together for each org
      const perOrgPromises = orgsWithDevices.map(async (orgFilter) => {
        const orgId = orgFilter.value
        const orgLabel = orgFilter.label
        const totalDevices = orgFilter.count

        // Fetch org details and device stats in parallel for this org
        const [org, deviceFilters] = await Promise.all([
          fetchOrgDetails(orgId),
          fetchOrgDeviceStats(orgId)
        ])

        const total = deviceFilters?.filteredCount || totalDevices
        const stats = calculateDeviceStats(deviceFilters?.statuses || [], total)

        const row: OrganizationOverviewRow = {
          id: org?.id || orgId,
          organizationId: org?.organizationId || orgId,
          name: org?.name || orgLabel || 'Unknown',
          websiteUrl: org?.websiteUrl || '',
          imageUrl: org?.image?.imageUrl || null,
          total,
          ...stats
        }
        return row
      })

      const settled = await Promise.allSettled(perOrgPromises)

      if (!isMountedRef.current) return

      const fetchedRows = settled
        .filter((r): r is PromiseFulfilledResult<OrganizationOverviewRow> => r.status === 'fulfilled')
        .map((r) => r.value)
        .sort((a, b) => b.total - a.total)

      setRows(fetchedRows)
    } catch (e) {
      if (!isMountedRef.current) return
      setError(e instanceof Error ? e.message : 'Failed to fetch organizations overview')
      setRows([])
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [limit, fetchOrgDetails, fetchOrgDeviceStats, calculateDeviceStats])

  // Fetch on mount
  useEffect(() => {
    fetchOrganizationsOverview()
  }, [fetchOrganizationsOverview])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Allow manual refresh
  const refresh = useCallback(() => {
    fetchedRef.current = false
    fetchOrganizationsOverview()
  }, [fetchOrganizationsOverview])

  return useMemo(() => ({
    rows,
    loading,
    error,
    totalOrganizations,
    refresh
  }), [rows, loading, error, totalOrganizations, refresh])
}
