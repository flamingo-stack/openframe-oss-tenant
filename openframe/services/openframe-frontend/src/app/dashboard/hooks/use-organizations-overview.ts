'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@lib/api-client'
import { GET_DEVICE_FILTERS_QUERY } from '../../devices/queries/devices-queries'
import { DEVICE_STATUS } from '../../devices/constants/device-statuses'
import { dashboardQueryKeys } from '../utils/query-keys'
import type { GraphQLResponse } from '../../devices/types/device.types'

type OrganizationNode = {
  id: string
  organizationId: string
  name: string
  websiteUrl?: string
  image?: {
    imageUrl?: string
  }
}

type OrganizationsResponse = {
  organizations: {
    edges: Array<{ node: OrganizationNode }>
    pageInfo: { hasNextPage: boolean; endCursor?: string }
    filteredCount: number
  }
}

export interface OrganizationOverviewRow {
  id: string
  organizationId: string
  name: string
  websiteUrl: string
  imageUrl: string | null
  total: number
  active: number
  inactive: number
  activePct: number
  inactivePct: number
}

const ACTIVE_STATUSES = ['ONLINE'] as const

async function fetchOrganizationsOverview(limit: number): Promise<{ 
  rows: OrganizationOverviewRow[], 
  totalOrganizations: number 
}> {
  const GET_ORGANIZATIONS_QUERY = `
    query GetOrganizations($pagination: CursorPaginationInput) {
      organizations(pagination: $pagination) {
        filteredCount
        edges {
          node {
            id
            organizationId
            name
            websiteUrl
            image {
              imageUrl
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `

  try {
    const orgsResponse = await apiClient.post<GraphQLResponse<OrganizationsResponse>>('/api/graphql', {
      query: GET_ORGANIZATIONS_QUERY,
    })

    if (!orgsResponse.ok) {
      console.warn('Organizations overview API failed:', orgsResponse.error || orgsResponse.status)
      return { rows: [], totalOrganizations: 0 }
    }

    const orgsData = orgsResponse.data?.data?.organizations
    if (!orgsData) {
      console.warn('Invalid organizations overview response structure')
      return { rows: [], totalOrganizations: 0 }
    }

    const totalOrganizations = orgsData.filteredCount || 0
    const organizations = orgsData.edges.map(edge => edge.node)

    const orgRowsPromises = organizations.map(async (org) => {
      try {
        const deviceResponse = await apiClient.post<GraphQLResponse<{ deviceFilters: { filteredCount: number; statuses?: Array<{ value: string; count: number }> } }>>('/api/graphql', {
          query: GET_DEVICE_FILTERS_QUERY,
          variables: { 
            filter: { 
              organizationIds: [org.organizationId],
              statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE]
            }
          }
        })

        if (!deviceResponse.ok || !deviceResponse.data?.data?.deviceFilters) {
          return null // Skip this org if device count fails
        }

        const deviceData = deviceResponse.data.data.deviceFilters
        const totalDevices = deviceData.filteredCount || 0
        const statuses = deviceData.statuses || []
        
        const active = statuses.find(s => s.value === DEVICE_STATUS.ONLINE)?.count || 0
        const inactive = statuses.find(s => s.value === DEVICE_STATUS.OFFLINE)?.count || 0
        const activePct = totalDevices > 0 ? Math.round((active / totalDevices) * 100) : 0
        const inactivePct = totalDevices > 0 ? Math.round((inactive / totalDevices) * 100) : 0

        return {
          id: org.id,
          organizationId: org.organizationId,
          name: org.name,
          websiteUrl: org.websiteUrl || '',
          imageUrl: org.image?.imageUrl || null,
          total: totalDevices,
          active,
          inactive,
          activePct,
          inactivePct
        }
      } catch (error) {
        console.warn(`Failed to fetch device count for org ${org.organizationId}:`, error)
        return null
      }
    })

    const orgRowsResults = await Promise.all(orgRowsPromises)
    const rows: OrganizationOverviewRow[] = orgRowsResults
      .filter((row): row is OrganizationOverviewRow => row !== null)
      .sort((a, b) => b.total - a.total)

    return { rows, totalOrganizations }
  } catch (error) {
    console.warn('Organizations overview fetch failed:', error)
    return { rows: [], totalOrganizations: 0 }
  }
}

export function useOrganizationsOverview(limit: number = 10) {
  const query = useQuery({
    queryKey: dashboardQueryKeys.orgStats(limit),
    queryFn: () => fetchOrganizationsOverview(limit),
    staleTime: 3 * 60 * 1000,         // 3 minutes
    gcTime: 10 * 60 * 1000,           // 10 minutes
    retry: 1,
    retryDelay: 1000,
    throwOnError: false,
    refetchOnWindowFocus: false,
  })

  return {
    rows: query.data?.rows ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    totalOrganizations: query.data?.totalOrganizations ?? 0,
    refresh: query.refetch,
    
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    dataUpdatedAt: query.dataUpdatedAt
  }
}
