'use client'

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fleetApiClient } from '@lib/fleet-api-client'
import { handleApiError } from '@lib/handle-api-error'
import type { Policy } from '../types/policies.types'

// ============ Types ============

interface ListPoliciesParams {
  team_id?: number
  query?: string
}

interface CreatePolicyData {
  name: string
  query: string
  description: string
  resolution?: string
  team_id?: number
  platform?: string
  critical?: boolean
  calendar_events_enabled?: boolean
}

interface UpdatePolicyData {
  id: number
  data: Partial<CreatePolicyData>
}

// ============ Query Keys ============

export const policiesQueryKeys = {
  all: ['policies'] as const,
  list: (params?: ListPoliciesParams) => [...policiesQueryKeys.all, 'list', params] as const,
  detail: (id: number) => [...policiesQueryKeys.all, 'detail', id] as const,
}

// ============ API Functions ============

async function fetchPolicies(params?: ListPoliciesParams): Promise<Policy[]> {
  const res = await fleetApiClient.getPolicies(params)
  if (!res.ok) {
    throw new Error(res.error || `Failed to load policies (${res.status})`)
  }
  return (res.data as { policies: Policy[] })?.policies || []
}

async function fetchPolicy(id: number): Promise<Policy> {
  const res = await fleetApiClient.getPolicy(id)
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to load policy (${res.status})`)
  }
  return res.data.policy
}

async function createPolicyApi(data: CreatePolicyData): Promise<Policy> {
  const res = await fleetApiClient.createPolicy(data)
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to create policy (${res.status})`)
  }
  return res.data.policy
}

async function updatePolicyApi({ id, data }: UpdatePolicyData): Promise<Policy> {
  const res = await fleetApiClient.updatePolicy(id, data)
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to update policy (${res.status})`)
  }
  return res.data.policy
}

async function deletePolicyApi(id: number): Promise<void> {
  const res = await fleetApiClient.deletePolicy(id)
  if (!res.ok) {
    throw new Error(res.error || `Failed to delete policy (${res.status})`)
  }
}

// ============ Hook ============

export function usePolicies(params?: ListPoliciesParams) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // List policies
  const policiesQuery = useQuery({
    queryKey: policiesQueryKeys.list(params),
    queryFn: () => fetchPolicies(params),
  })

  // Create policy
  const createPolicyMutation = useMutation({
    mutationFn: createPolicyApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policiesQueryKeys.all })
    },
  })

  const createPolicy = (
    data: CreatePolicyData,
    options?: {
      onSuccess?: (policy: Policy) => void
      onError?: (error: Error) => void
    }
  ) => {
    createPolicyMutation.mutate(data, {
      onSuccess: (policy) => {
        toast({
          title: 'Policy Created',
          description: `Policy "${data.name}" created successfully`,
          variant: 'success',
        })
        options?.onSuccess?.(policy)
      },
      onError: (error) => {
        handleApiError(error, toast, 'Failed to create policy')
        options?.onError?.(error as Error)
      },
    })
  }

  // Update policy
  const updatePolicyMutation = useMutation({
    mutationFn: updatePolicyApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policiesQueryKeys.all })
    },
  })

  const updatePolicy = (
    id: number,
    data: Partial<CreatePolicyData>,
    options?: {
      onSuccess?: (policy: Policy) => void
      onError?: (error: Error) => void
    }
  ) => {
    updatePolicyMutation.mutate({ id, data }, {
      onSuccess: (policy) => {
        toast({
          title: 'Policy Updated',
          description: 'Policy updated successfully',
          variant: 'success',
        })
        options?.onSuccess?.(policy)
      },
      onError: (error) => {
        handleApiError(error, toast, 'Failed to update policy')
        options?.onError?.(error as Error)
      },
    })
  }

  // Delete policy
  const deletePolicyMutation = useMutation({
    mutationFn: deletePolicyApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policiesQueryKeys.all })
    },
  })

  const deletePolicy = (
    id: number,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    deletePolicyMutation.mutate(id, {
      onSuccess: () => {
        toast({
          title: 'Policy Deleted',
          description: 'Policy deleted successfully',
          variant: 'success',
        })
        options?.onSuccess?.()
      },
      onError: (error) => {
        handleApiError(error, toast, 'Failed to delete policy')
        options?.onError?.(error as Error)
      },
    })
  }

  return {
    // Data
    policies: policiesQuery.data ?? [],

    // Loading & error states
    isLoading: policiesQuery.isLoading,
    error: policiesQuery.error?.message ?? null,

    // Refetch
    refetch: policiesQuery.refetch,

    // Mutations
    createPolicy,
    isCreating: createPolicyMutation.isPending,

    updatePolicy,
    isUpdating: updatePolicyMutation.isPending,

    deletePolicy,
    isDeleting: deletePolicyMutation.isPending,

    // Raw query for advanced use cases
    policiesQuery,
  }
}
