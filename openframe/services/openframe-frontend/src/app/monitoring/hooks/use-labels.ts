'use client'

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fleetApiClient } from '@lib/fleet-api-client'
import { handleApiError } from '@lib/handle-api-error'
import type { FleetLabel } from '@lib/fleet-api-client'

// ============ Query Keys ============

export const labelsQueryKeys = {
  all: ['labels'] as const,
  list: () => [...labelsQueryKeys.all, 'list'] as const,
}

// ============ API Functions ============

async function fetchLabels(): Promise<FleetLabel[]> {
  const res = await fleetApiClient.getLabels()
  if (!res.ok) {
    throw new Error(res.error || `Failed to load labels (${res.status})`)
  }
  return (res.data as { labels: FleetLabel[] })?.labels || []
}

async function createLabelApi(name: string): Promise<FleetLabel> {
  const res = await fleetApiClient.createLabel({ name, description: '' })
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to create label (${res.status})`)
  }
  return res.data.label
}

async function deleteLabelApi(id: number): Promise<void> {
  const res = await fleetApiClient.deleteLabel(id)
  if (!res.ok) {
    throw new Error(res.error || `Failed to delete label (${res.status})`)
  }
}

// ============ Hook ============

export function useLabels() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // List labels
  const labelsQuery = useQuery({
    queryKey: labelsQueryKeys.list(),
    queryFn: fetchLabels,
  })

  // Create label
  const createLabelMutation = useMutation({
    mutationFn: createLabelApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelsQueryKeys.all })
    },
  })

  const createLabel = (
    name: string,
    options?: {
      onSuccess?: (label: FleetLabel) => void
      onError?: (error: Error) => void
    }
  ) => {
    createLabelMutation.mutate(name, {
      onSuccess: (label) => {
        toast({
          title: 'Category Created',
          description: `Category "${name}" created successfully`,
          variant: 'success',
        })
        options?.onSuccess?.(label)
      },
      onError: (error) => {
        handleApiError(error, toast, 'Failed to create category')
        options?.onError?.(error as Error)
      },
    })
  }

  // Delete label
  const deleteLabelMutation = useMutation({
    mutationFn: deleteLabelApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelsQueryKeys.all })
    },
  })

  const deleteLabel = (
    id: number,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    deleteLabelMutation.mutate(id, {
      onSuccess: () => {
        toast({
          title: 'Category Deleted',
          description: 'Category deleted successfully',
          variant: 'success',
        })
        options?.onSuccess?.()
      },
      onError: (error) => {
        handleApiError(error, toast, 'Failed to delete category')
        options?.onError?.(error as Error)
      },
    })
  }

  return {
    // Data
    labels: labelsQuery.data ?? [],

    // Loading & error states
    isLoading: labelsQuery.isLoading,
    error: labelsQuery.error?.message ?? null,

    // Mutations
    createLabel,
    isCreating: createLabelMutation.isPending,

    deleteLabel,
    isDeleting: deleteLabelMutation.isPending,
  }
}
