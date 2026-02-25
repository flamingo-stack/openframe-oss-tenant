import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation } from '@tanstack/react-query';
import { type ApiResponse, apiClient } from '@/lib/api-client';

export interface CreateDialogResponse {
  id: string;
  agentType: string;
  currentMode: string;
  status: string;
  title: string;
  createdAt: string;
  statusUpdatedAt: string;
  resolvedAt: string;
}

export interface SendMessageResponse {
  messageId: string;
}

export interface ApprovalResponse {
  requestId: string;
  status: 'approved' | 'rejected';
  timestamp: string;
}

export interface CreateDialogRequest {
  agentType: 'ADMIN';
}

export interface SendMessageRequest {
  dialogId: string;
  content: string;
  chatType: 'ADMIN_AI_CHAT';
}

/**
 * Custom hooks for Mingo chat operations using the centralized apiClient
 * Provides react-query mutations for dialog creation, message sending, and approvals
 */

/**
 * Create a new dialog - returns mutation
 */
export function useCreateDialogMutation() {
  return useMutation({
    mutationFn: async (): Promise<CreateDialogResponse> => {
      const response = await apiClient.post<CreateDialogResponse>('/chat/api/v1/dialogs', {
        agentType: 'ADMIN',
      } as CreateDialogRequest);

      if (!response.ok) {
        throw new Error(response.error || `Failed to create dialog with status ${response.status}`);
      }

      if (!response.data?.id) {
        throw new Error('Invalid response: dialog id not found');
      }

      return response.data;
    },
  });
}

/**
 * Send a message to a dialog - returns mutation
 */
export function useSendMessageMutation() {
  return useMutation({
    mutationFn: async ({ dialogId, content }: { dialogId: string; content: string }) => {
      const response = await apiClient.post('/chat/api/v1/messages', {
        dialogId,
        content,
        chatType: 'ADMIN_AI_CHAT',
      } as SendMessageRequest);

      if (!response.ok) {
        throw new Error(response.error || `Failed to send message with status ${response.status}`);
      }

      return response.data;
    },
  });
}

/**
 * Approve an approval request - returns mutation
 */
export function useApproveRequestMutation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (requestId: string): Promise<ApprovalResponse | undefined> => {
      const response = await apiClient.post<ApprovalResponse>(`/chat/api/v1/approval-requests/${requestId}/approve`, {
        approve: true,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to approve request');
      }

      return response.data;
    },
    onSuccess: () => {},
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve request';
      toast({
        title: 'Approval Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });
}

/**
 * Reject an approval request - returns mutation
 */
export function useRejectRequestMutation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (requestId: string): Promise<ApprovalResponse | undefined> => {
      const response = await apiClient.post<ApprovalResponse>(`/chat/api/v1/approval-requests/${requestId}/approve`, {
        approve: false,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to reject request');
      }

      return response.data;
    },
    onSuccess: () => {},
    onError: error => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject request';
      toast({
        title: 'Rejection Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });
}
