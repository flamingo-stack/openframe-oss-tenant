'use client'

import { useCallback, useState, useRef, useMemo, useEffect } from 'react'
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
    error,
    setOrganizations,
    setSearch,
    setError,
    clearOrganizations,
    reset
  } = useOrganizationsStore()

  // Use LOCAL state for isLoading with initial=true to show skeleton immediately on mount
  // (before useEffect triggers fetch). This prevents the flash of empty state.
  const [isLoading, setIsLoading] = useState(true)

  // Pagination state (local to hook, not persisted)
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [hasLoadedBeyondFirst, setHasLoadedBeyondFirst] = useState(false)

  // Stabilize filters to prevent infinite loops while still detecting changes
  const filtersKey = JSON.stringify(activeFilters)
  const stableFilters = useMemo(() => activeFilters, [filtersKey])
  const filtersRef = useRef(stableFilters)
  filtersRef.current = stableFilters

  // Track if first fetch has been done (set by view component)
  const initialLoadDone = useRef(false)
  // Track previous filters to detect actual changes vs initial render
  const prevFiltersKey = useRef<string | null>(null)

  const fetchOrganizations = useCallback(async (
    searchTerm: string,
    cursor?: string | null,
    filters: OrganizationsFilterInput = {},
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<any>('/api/graphql', {
        query: GET_ORGANIZATIONS_QUERY,
        variables: {
          search: searchTerm || '',
          pagination: {
            limit: 10,
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
      setIsLoading(false)
    }
  }, [setOrganizations, setError, toast])

  // Function to mark initial load as done (called by view component after first fetch)
  const markInitialLoadDone = useCallback(() => {
    initialLoadDone.current = true
    // Also set the initial filters key so we don't refetch on first render
    prevFiltersKey.current = filtersKey
  }, [filtersKey])

  const fetchNextPage = useCallback(async (searchTerm: string) => {
    if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) {
      return
    }
    setHasLoadedBeyondFirst(true)
    return fetchOrganizations(searchTerm, pageInfo.endCursor, filtersRef.current)
  }, [pageInfo, fetchOrganizations])

  const fetchFirstPage = useCallback(async (searchTerm: string) => {
    setHasLoadedBeyondFirst(false)
    return fetchOrganizations(searchTerm, null, filtersRef.current)
  }, [fetchOrganizations])

  const searchOrganizations = useCallback(async (searchTerm: string) => {
    setSearch(searchTerm)
    setHasLoadedBeyondFirst(false)
    return fetchOrganizations(searchTerm, null, filtersRef.current)
  }, [setSearch, fetchOrganizations])

  const refreshOrganizations = useCallback(async () => {
    return fetchOrganizations(search, null, filtersRef.current)
  }, [fetchOrganizations, search])

  // Refetch when filters change (after initial load, and only when filters ACTUALLY changed)
  useEffect(() => {
    // Only refetch if:
    // 1. Initial load is done
    // 2. Previous filters key was set (not first render after initial load)
    // 3. Filters actually changed
    if (initialLoadDone.current && prevFiltersKey.current !== null && prevFiltersKey.current !== filtersKey) {
      const refetch = async () => {
        await fetchOrganizations(search, null, filtersRef.current)
      }
      refetch()
    }
    // Update previous filters key (but only after initial load)
    if (initialLoadDone.current) {
      prevFiltersKey.current = filtersKey
    }
  }, [filtersKey, fetchOrganizations, search])

  return {
    organizations,
    search,
    isLoading,
    error,
    pageInfo,
    hasLoadedBeyondFirst,
    setHasLoadedBeyondFirst,
    fetchOrganizations,
    fetchNextPage,
    fetchFirstPage,
    searchOrganizations,
    refreshOrganizations,
    clearOrganizations,
    reset,
    markInitialLoadDone
  }
}
