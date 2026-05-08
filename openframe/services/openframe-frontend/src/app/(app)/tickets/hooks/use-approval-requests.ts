'use client';

import { useMutation } from '@tanstack/react-query';
import { APPROVAL_STATUS, type ApprovalStatus } from '../constants';
import { ticketService } from '../services';

export type ApprovalRequestAction = {
  requestId: string;
  approve: boolean;
};

export function useApprovalRequests() {
  const approvalMutation = useMutation({
    mutationFn: async ({ requestId, approve }: ApprovalRequestAction) => {
      if (approve) {
        await ticketService.approveRequest(requestId);
      } else {
        await ticketService.rejectRequest(requestId);
      }
    },
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
    handleApproveRequest,
    handleRejectRequest,
    isLoading: approvalMutation.isPending,
    error: approvalMutation.error?.message ?? null,
    approvalMutation,
  };
}
