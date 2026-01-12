'use client'

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../lib/api-client'
import { handleApiError } from '../../../lib/handle-api-error'

// ============ Types ============

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export type UserRecord = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  roles: string[]
  status: UserStatus
  createdAt?: string
  updatedAt?: string
}

export type PagedUsersResponse = {
  items: UserRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// ============ Query Keys ============

export const usersQueryKeys = {
  all: ['users'] as const,
  list: (page: number, size: number) => [...usersQueryKeys.all, 'list', { page, size }] as const,
}

// ============ API Functions ============

async function fetchUsers(page: number, size: number): Promise<PagedUsersResponse> {
  const res = await apiClient.get<PagedUsersResponse>(`api/users?page=${page}&size=${size}`)
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to load users (${res.status})`)
  }
  return res.data
}

async function deleteUserApi(userId: string): Promise<void> {
  const res = await apiClient.delete(`/api/users/${encodeURIComponent(userId)}`)
  if (!res.ok) {
    throw new Error(res.error || `Failed to delete user (${res.status})`)
  }
}

// ============ Hook ============

export function useUsers(page: number = 0, size: number = 20) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const usersQuery = useQuery({
    queryKey: usersQueryKeys.list(page, size),
    queryFn: () => fetchUsers(page, size),
  })

  const deleteUserMutation = useMutation({
    mutationFn: deleteUserApi,
  })

  const deleteUser = (
    userId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    deleteUserMutation.mutate(userId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: usersQueryKeys.all })
        options?.onSuccess?.()
      },
      onError: (error) => {
        handleApiError(error, toast, 'Failed to delete user')
        options?.onError?.(error as Error)
      },
    })
  }

  return {
    // Data
    users: usersQuery.data?.items ?? [],

    // Loading & error states
    isLoading: usersQuery.isLoading,
    error: usersQuery.error?.message ?? null,

    // Pagination info
    page: usersQuery.data?.page ?? page,
    size: usersQuery.data?.size ?? size,
    totalPages: usersQuery.data?.totalPages ?? 0,
    totalElements: usersQuery.data?.totalElements ?? 0,
    hasNext: usersQuery.data?.hasNext ?? false,
    hasPrevious: usersQuery.data?.hasPrevious ?? false,

    // Refetch
    refetch: usersQuery.refetch,

    // Mutations
    deleteUser,
    deleteUserMutation,

    // Raw query for advanced use cases
    usersQuery,
  }
}
