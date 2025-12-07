'use client'

import { useCallback, useRef, useState } from 'react'
import { apiClient } from '@lib/api-client'

const GET_ORGANIZATIONS_MIN_QUERY = `#graphql
  query GetOrganizationsMin {
    organizations {
      edges {
        node {
          id
          organizationId
          name
        }
      }
    }
  }
`

interface OrganizationLookupState {
  lookup: Record<string, string>
  isLoading: boolean
  hasFetched: boolean
}

/**
 * Lazy organization lookup hook.
 * Fetches organization names only when needed, doesn't block initial render.
 * Caches results to avoid refetching.
 */
export function useOrganizationLookup() {
  const [state, setState] = useState<OrganizationLookupState>({
    lookup: {},
    isLoading: false,
    hasFetched: false
  })

  const pendingFetchRef = useRef<Promise<void> | null>(null)

  /**
   * Lazily fetch organization names.
   * Only fetches once, caches results.
   * Non-blocking - returns immediately, updates state when done.
   */
  const fetchOrganizationNames = useCallback(async (_organizationIds?: string[]) => {
    // Already fetched - no need to refetch
    if (state.hasFetched) {
      return
    }

    // Already fetching - wait for it
    if (pendingFetchRef.current) {
      await pendingFetchRef.current
      return
    }

    setState(prev => ({ ...prev, isLoading: true }))

    const fetchPromise = (async () => {
      try {
        const response = await apiClient.post<any>('/api/graphql', {
          query: GET_ORGANIZATIONS_MIN_QUERY
        })

        if (!response.ok) {
          console.error('Failed to fetch organizations for lookup')
          return
        }

        const edges = response.data?.data?.organizations?.edges || []
        const newLookup: Record<string, string> = {}

        for (const edge of edges) {
          const node = edge.node
          if (node?.organizationId && node?.name) {
            newLookup[node.organizationId] = node.name
          }
        }

        setState({
          lookup: newLookup,
          isLoading: false,
          hasFetched: true
        })
      } catch (error) {
        console.error('Error fetching organization lookup:', error)
        setState(prev => ({ ...prev, isLoading: false }))
      }
    })()

    pendingFetchRef.current = fetchPromise
    await fetchPromise
    pendingFetchRef.current = null
  }, [state.hasFetched])

  /**
   * Get organization name by ID.
   * Returns undefined if not yet loaded.
   */
  const getOrganizationName = useCallback((organizationId: string | undefined): string | undefined => {
    if (!organizationId) return undefined
    return state.lookup[organizationId]
  }, [state.lookup])

  return {
    lookup: state.lookup,
    isLoading: state.isLoading,
    hasFetched: state.hasFetched,
    fetchOrganizationNames,
    getOrganizationName
  }
}
