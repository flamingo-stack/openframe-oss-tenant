'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { handleApiError } from '../../../lib/handle-api-error';

// ============ Types ============

export enum InvitationStatus {
  Pending = 'PENDING',
  Expired = 'EXPIRED',
}

export type InvitationRecord = {
  id: string;
  email: string;
  roles: string[];
  createdAt: string;
  expiresAt: string;
  status: InvitationStatus;
};

export type PagedInvitationsResponse = {
  items: InvitationRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

// ============ Query Keys ============

export const invitationsQueryKeys = {
  all: ['invitations'] as const,
  list: (page: number, size: number) => [...invitationsQueryKeys.all, 'list', { page, size }] as const,
};

// ============ API Functions ============

async function fetchInvitations(page: number, size: number): Promise<PagedInvitationsResponse> {
  const res = await apiClient.get<PagedInvitationsResponse>(`api/invitations?page=${page}&size=${size}`);
  if (!res.ok || !res.data) {
    throw new Error(res.error || `Failed to load invitations (${res.status})`);
  }
  return res.data;
}

async function revokeInvitationApi(invitationId: string): Promise<void> {
  const res = await apiClient.delete(`/api/invitations/${encodeURIComponent(invitationId)}`);
  if (!res.ok) {
    throw new Error(res.error || `Failed to revoke invitation (${res.status})`);
  }
}

async function resendInvitationApi(invitationId: string): Promise<void> {
  const res = await apiClient.post(`/api/invitations/${encodeURIComponent(invitationId)}/resend`);
  if (!res.ok) {
    throw new Error(res.error || `Failed to resend invitation (${res.status})`);
  }
}

async function inviteUsersApi(emails: string[]): Promise<void> {
  const trimmed = emails.map(e => e.trim()).filter(e => e.length > 0);
  if (trimmed.length === 0) return;

  const results = await Promise.all(
    trimmed.map(async email => ({ email, res: await apiClient.post('api/invitations', { email }) })),
  );

  const errors = results.filter(r => !r.res.ok).map(r => r.email);
  if (errors.length) {
    throw new Error(`Failed to invite: ${errors.join(', ')}`);
  }
}

// ============ Hook ============

export function useInvitations(page: number = 0, size: number = 20) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invitationsQuery = useQuery({
    queryKey: invitationsQueryKeys.list(page, size),
    queryFn: () => fetchInvitations(page, size),
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: revokeInvitationApi,
  });

  const resendInvitationMutation = useMutation({
    mutationFn: resendInvitationApi,
  });

  const revokeInvitation = (
    invitationId: string,
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    },
  ) => {
    revokeInvitationMutation.mutate(invitationId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: invitationsQueryKeys.all });
        options?.onSuccess?.();
      },
      onError: error => {
        handleApiError(error, toast, 'Failed to revoke invitation');
        options?.onError?.(error as Error);
      },
    });
  };

  const resendInvitation = (
    invitationId: string,
    options?: {
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    },
  ) => {
    resendInvitationMutation.mutate(invitationId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: invitationsQueryKeys.all });
        options?.onSuccess?.();
      },
      onError: error => {
        handleApiError(error, toast, 'Failed to resend invitation');
        options?.onError?.(error as Error);
      },
    });
  };

  const inviteUsersMutation = useMutation({
    mutationFn: inviteUsersApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationsQueryKeys.all });
    },
  });

  return {
    // Data
    invitations: invitationsQuery.data?.items ?? [],

    // Loading & error states
    isLoading: invitationsQuery.isLoading,
    error: invitationsQuery.error?.message ?? null,

    // Pagination info
    page: invitationsQuery.data?.page ?? page,
    size: invitationsQuery.data?.size ?? size,
    totalPages: invitationsQuery.data?.totalPages ?? 0,
    totalElements: invitationsQuery.data?.totalElements ?? 0,
    hasNext: invitationsQuery.data?.hasNext ?? false,
    hasPrevious: invitationsQuery.data?.hasPrevious ?? false,

    // Refetch
    refetch: invitationsQuery.refetch,

    // Mutations
    revokeInvitation,
    revokeInvitationMutation,
    resendInvitation,
    resendInvitationMutation,
    inviteUsers: inviteUsersMutation.mutateAsync,
    inviteUsersMutation,

    // Raw query for advanced use cases
    invitationsQuery,
  };
}
