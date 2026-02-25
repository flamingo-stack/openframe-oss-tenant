'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS, APPROVAL_STATUS, type ApprovalStatus } from '../constants';

// ============ Types ============

export type ApprovalRequestAction = {
  requestId: string;
  approve: boolean;
};

// ============ API Functions ============

async function approveRequest(requestId: string, approve: boolean): Promise<void> {
  const res = await apiClient.post(`${API_ENDPOINTS.APPROVAL_REQUEST}/${requestId}/approve`, {
    approve,
  });
  if (!res.ok) {
    throw new Error(res.error || `Failed to ${approve ? 'approve' : 'reject'} request (${res.status})`);
  }
}

// ============ Hook ============

export function useApprovalRequests() {
  const approvalMutation = useMutation({
    mutationFn: ({ requestId, approve }: ApprovalRequestAction) => approveRequest(requestId, approve),
  });

  const handleApproveRequest = async (
    requestId: string,
    options?: {
      onSuccess?: (status: ApprovalStatus) => void;
      onError?: (error: Error) => void;
    },
  ) => {
    try {
      await approvalMutation.mutateAsync({ requestId, approve: true });
      options?.onSuccess?.(APPROVAL_STATUS.APPROVED);
    } catch (error) {
      options?.onError?.(error as Error);
      throw error;
    }
  };

  const handleRejectRequest = async (
    requestId: string,
    options?: {
      onSuccess?: (status: ApprovalStatus) => void;
      onError?: (error: Error) => void;
    },
  ) => {
    try {
      await approvalMutation.mutateAsync({ requestId, approve: false });
      options?.onSuccess?.(APPROVAL_STATUS.REJECTED);
    } catch (error) {
      options?.onError?.(error as Error);
      throw error;
    }
  };

  return {
    // Actions
    handleApproveRequest,
    handleRejectRequest,

    // Status
    isLoading: approvalMutation.isPending,
    error: approvalMutation.error?.message ?? null,

    // Raw mutation
    approvalMutation,
  };
}
