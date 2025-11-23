'use client'

import { useCallback, useState } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '@lib/api-client'
import { useOrganizationsStore, OrganizationEntry } from '../stores/organizations-store'
import { GET_ORGANIZATIONS_QUERY } from '../queries/organizations-queries'

interface OrganizationsFilterInput {
  tiers?: Array<OrganizationEntry['tier']>
  industries?: string[]
}

interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

export function useOrganizations(activeFilters: OrganizationsFilterInput = {}) {
  const { toast } = useToast()
  const {
    organizations,
    search,
    isLoading,
    error,
    setOrganizations,
    setSearch,
    setLoading,
    setError,
    clearOrganizations,
    reset
  } = useOrganizationsStore()

  // Pagination state (local to hook, not persisted)
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [hasLoadedBeyondFirst, setHasLoadedBeyondFirst] = useState(false)

  const fetchOrganizations = useCallback(async (
    searchTerm: string,
    cursor?: string | null,
    filters: OrganizationsFilterInput = {},
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<any>('/api/graphql', {
        query: GET_ORGANIZATIONS_QUERY,
        variables: {
          search: searchTerm || '',
          pagination: {
            limit: 20,
            cursor: cursor || null
          }
        }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const payload = (response.data as any)?.data?.organizations

      // Handle paginated response structure
      const edges = Array.isArray(payload?.edges) ? payload.edges : []
      const items = edges.map((edge: any) => edge.node)

      const mapped: OrganizationEntry[] = items.map((o: any): OrganizationEntry => ({
        id: o.id,
        organizationId: o.organizationId,
        name: o.name ?? '-',
        websiteUrl: o.websiteUrl ?? '-',
        contact: { name: '', email: '' },
        tier: 'Basic',
        industry: o.category ?? '-',
        mrrUsd: o.monthlyRevenue ?? 0,
        contractDue: o.contractEndDate ?? '',
        lastActivity: new Date().toISOString(),
        imageUrl: o.image?.imageUrl || null,
      }))

      setOrganizations(mapped)

      // Update pagination info
      if (payload?.pageInfo) {
        setPageInfo({
          hasNextPage: payload.pageInfo.hasNextPage ?? false,
          hasPreviousPage: payload.pageInfo.hasPreviousPage ?? false,
          startCursor: payload.pageInfo.startCursor ?? null,
          endCursor: payload.pageInfo.endCursor ?? null
        })
      }

      return mapped
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch organizations'
      console.error('Failed to fetch organizations:', error)
      setError(errorMessage)
      toast({
        title: 'Error fetching organizations',
        description: errorMessage,
        variant: 'destructive'
      })
      throw error
    } finally {
      setLoading(false)
    }
  }, [setOrganizations, setLoading, setError, toast])

  const fetchNextPage = useCallback(async (searchTerm: string) => {
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) {
      return
    }
    setHasLoadedBeyondFirst(true)
    return fetchOrganizations(searchTerm, pageInfo.endCursor, activeFilters)
  }, [pageInfo, fetchOrganizations, activeFilters])

  const fetchFirstPage = useCallback(async (searchTerm: string) => {
    setHasLoadedBeyondFirst(false)
    return fetchOrganizations(searchTerm, null, activeFilters)
  }, [fetchOrganizations, activeFilters])

  const searchOrganizations = useCallback(async (searchTerm: string) => {
    setSearch(searchTerm)
    setHasLoadedBeyondFirst(false)
    return fetchOrganizations(searchTerm, null, activeFilters)
  }, [setSearch, fetchOrganizations, activeFilters])

  const refreshOrganizations = useCallback(async () => {
    return fetchOrganizations(search, null, activeFilters)
  }, [fetchOrganizations, search, activeFilters.tiers?.join(','), activeFilters.industries?.join(',')])

  return {
    organizations,
    search,
    isLoading,
    error,
    pageInfo,
    hasLoadedBeyondFirst,
    fetchOrganizations,
    fetchNextPage,
    fetchFirstPage,
    searchOrganizations,
    refreshOrganizations,
    clearOrganizations,
    reset
  }
}


