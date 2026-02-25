'use client'

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fleetApiClient } from '@lib/fleet-api-client'
import { handleApiError } from '@lib/handle-api-error'
import type { Query } from '../types/queries.types'

// ============ Types ============

interface ListQueriesParams {
  team_id?: number
  query?: string
}

interface CreateQueryData {
  name: string
  query: string
  description?: string
  interval?: number
  observer_can_run?: boolean
  team_id?: number | null
  platform?: string
  min_osquery_version?: string
  automations_enabled?: boolean
  logging?: string
  discard_data?: boolean
}

interface UpdateQueryData {
  id: number
  data: Partial<CreateQueryData>
}

// ============ Query Keys ============

export const queriesQueryKeys = {
  all: ['queries'] as const,
  list: (params?: ListQueriesParams) => [...queriesQueryKeys.all, 'list', params] as const,
  detail: (id: number) => [...queriesQueryKeys.all, 'detail', id] as const,
}

// ============ API Functions ============

async function fetchQueries(params?: ListQueriesParams): Promise<Query[]> {
  const res = await fleetApiClient.getQueries(params)
  if (!res.ok) {
    throw new Error(res.error || `Failed to load queries (${res.status})`)
  }
  return (res.data as { queries: Query[] })?.queries || []
}

async function createQueryApi(data: CreateQueryData): Promise<Query> {
  const res = await fleetApiClient.createQuery(data)
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to create query (${res.status})`)
  }
  // Fleet API wraps response in { query: {...} } — cast to avoid conflict with Query.query field
  return (res.data as unknown as { query: Query }).query
}

async function updateQueryApi({ id, data }: UpdateQueryData): Promise<Query> {
  const res = await fleetApiClient.updateQuery(id, data)
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to update query (${res.status})`)
  }
  return (res.data as unknown as { query: Query }).query
}

// ============ Hook ============

export function useQueries(params?: ListQueriesParams) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // List queries
  const queriesQuery = useQuery({
    queryKey: queriesQueryKeys.list(params),
    queryFn: () => fetchQueries(params),
  })

  // Create query
  const createQueryMutation = useMutation({
    mutationFn: createQueryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queriesQueryKeys.all })
    },
  })

  const createQuery = (
    data: CreateQueryData,
    options?: {
      onSuccess?: (query: Query) => void
      onError?: (error: Error) => void
    }
  ) => {
    createQueryMutation.mutate(data, {
      onSuccess: (query) => {
        toast({
          title: 'Query Created',
          description: `Query "${data.name}" created successfully`,
          variant: 'success',
        })
        options?.onSuccess?.(query)
      },
      onError: (error) => {
        handleApiError(error, toast, 'Failed to create query')
        options?.onError?.(error as Error)
      },
    })
  }

  // Update query
  const updateQueryMutation = useMutation({
    mutationFn: updateQueryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queriesQueryKeys.all })
    },
  })

  const updateQuery = (
    id: number,
    data: Partial<CreateQueryData>,
    options?: {
      onSuccess?: (query: Query) => void
      onError?: (error: Error) => void
    }
  ) => {
    updateQueryMutation.mutate({ id, data }, {
      onSuccess: (query) => {
        toast({
          title: 'Query Updated',
          description: 'Query updated successfully',
          variant: 'success',
        })
        options?.onSuccess?.(query)
      },
      onError: (error) => {
        handleApiError(error, toast, 'Failed to update query')
        options?.onError?.(error as Error)
      },
    })
  }

  return {
    // Data
    queries: queriesQuery.data ?? [],

    // Loading & error states
    isLoading: queriesQuery.isLoading,
    error: queriesQuery.error?.message ?? null,

    // Refetch
    refetch: queriesQuery.refetch,

    // Mutations
    createQuery,
    isCreating: createQueryMutation.isPending,

    updateQuery,
    isUpdating: updateQueryMutation.isPending,

    // Raw query for advanced use cases
    queriesQuery,
  }
}
