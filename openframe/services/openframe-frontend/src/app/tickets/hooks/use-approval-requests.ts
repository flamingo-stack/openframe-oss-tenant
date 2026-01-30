'use client'

import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@lib/api-client'
import { APPROVAL_STATUS, API_ENDPOINTS, type ApprovalStatus } from '../constants'

// ============ Types ============

export type ApprovalRequestAction = {
  requestId: string
  approve: boolean
}

// ============ API Functions ============

async function approveRequest(requestId: string, approve: boolean): Promise<void> {
  const res = await apiClient.post(`${API_ENDPOINTS.APPROVAL_REQUEST}/${requestId}/approve`, {
    approve
  })
  if (!res.ok) {
    throw new Error(res.error || `Failed to ${approve ? 'approve' : 'reject'} request (${res.status})`)
  }
}

// ============ Hook ============

export function useApprovalRequests() {

  const approvalMutation = useMutation({
    mutationFn: ({ requestId, approve }: ApprovalRequestAction) => 
      approveRequest(requestId, approve),
  })

  const handleApproveRequest = (
    requestId: string,
    options?: {
      onSuccess?: (status: ApprovalStatus) => void
      onError?: (error: Error) => void
    }
  ) => {
    approvalMutation.mutate(
      { requestId, approve: true },
      {
        onSuccess: () => {
          options?.onSuccess?.(APPROVAL_STATUS.APPROVED)
        },
        onError: (error) => {
          options?.onError?.(error as Error)
        },
      }
    )
  }

  const handleRejectRequest = (
    requestId: string,
    options?: {
      onSuccess?: (status: ApprovalStatus) => void
      onError?: (error: Error) => void
    }
  ) => {
    approvalMutation.mutate(
      { requestId, approve: false },
      {
        onSuccess: () => {
          options?.onSuccess?.(APPROVAL_STATUS.REJECTED)
        },
        onError: (error) => {
          options?.onError?.(error as Error)
        },
      }
    )
  }

  return {
    // Actions
    handleApproveRequest,
    handleRejectRequest,

    // Status
    isLoading: approvalMutation.isPending,
    error: approvalMutation.error?.message ?? null,

    // Raw mutation
    approvalMutation,
  }
}