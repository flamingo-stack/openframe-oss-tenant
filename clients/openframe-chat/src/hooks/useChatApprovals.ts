import { type Message, type MessageSegment } from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useState } from 'react';
import { tokenService } from '../services/tokenService';

interface ApprovalData {
  command: string;
  explanation?: string;
  approvalType: string;
}

export function useChatApprovals() {
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({});
  const [pendingApprovalRequests, setPendingApprovalRequests] = useState<Record<string, ApprovalData>>({});
  const [awaitingTechnicianResponse, setAwaitingTechnicianResponse] = useState(false);

  const handleApproveRequest = useCallback(async (requestId?: string): Promise<void> => {
    if (!requestId) return;

    const serverUrl = tokenService.getCurrentApiBaseUrl();
    const token = tokenService.getCurrentToken();

    try {
      const response = await fetch(`${serverUrl}/chat/api/v1/approval-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approve: true }),
      });

      if (response.ok) {
        setApprovalStatuses(prev => ({ ...prev, [requestId]: 'approved' }));
      }
    } catch (error) {
      console.error('Error approving request:', error);
    }
  }, []);

  const handleRejectRequest = useCallback(async (requestId?: string): Promise<void> => {
    if (!requestId) return;

    const serverUrl = tokenService.getCurrentApiBaseUrl();
    const token = tokenService.getCurrentToken();

    try {
      const response = await fetch(`${serverUrl}/chat/api/v1/approval-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approve: false }),
      });

      if (response.ok) {
        setApprovalStatuses(prev => ({ ...prev, [requestId]: 'rejected' }));
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  }, []);

  const updateApprovalStatusInMessages = useCallback(
    (messages: Message[], requestId: string, status: 'approved' | 'rejected'): Message[] => {
      return messages.map(message => {
        if (message.role === 'assistant' && Array.isArray(message.content)) {
          const updatedContent = (message.content as MessageSegment[]).map((segment: MessageSegment) => {
            if (segment.type === 'approval_request' && segment.data.requestId === requestId) {
              return {
                ...segment,
                status,
                onApprove: handleApproveRequest,
                onReject: handleRejectRequest,
              };
            }
            return segment;
          });
          return { ...message, content: updatedContent };
        }
        return message;
      });
    },
    [handleApproveRequest, handleRejectRequest],
  );

  const handleEscalatedApproval = useCallback((requestId: string, data: ApprovalData) => {
    setPendingApprovalRequests(prev => ({ ...prev, [requestId]: data }));
    setAwaitingTechnicianResponse(true);
  }, []);

  const handleEscalatedApprovalResult = useCallback(
    (requestId: string, approved: boolean, data: ApprovalData): MessageSegment => {
      setAwaitingTechnicianResponse(false);
      const newStatus = approved ? 'approved' : 'rejected';
      setApprovalStatuses(prev => ({ ...prev, [requestId]: newStatus }));

      const approvalSegment: MessageSegment = {
        type: 'approval_request',
        data: {
          command: data.command,
          explanation: data.explanation,
          requestId: requestId,
          approvalType: data.approvalType,
        },
        status: newStatus as 'approved' | 'rejected',
        onApprove: handleApproveRequest,
        onReject: handleRejectRequest,
      };

      setPendingApprovalRequests(prev => {
        const { [requestId]: _, ...rest } = prev;
        return rest;
      });

      return approvalSegment;
    },
    [handleApproveRequest, handleRejectRequest],
  );

  const clearApprovals = useCallback(() => {
    setApprovalStatuses({});
    setPendingApprovalRequests({});
    setAwaitingTechnicianResponse(false);
  }, []);

  return {
    approvalStatuses,
    pendingApprovalRequests,
    awaitingTechnicianResponse,
    handleApproveRequest,
    handleRejectRequest,
    updateApprovalStatusInMessages,
    handleEscalatedApproval,
    handleEscalatedApprovalResult,
    clearApprovals,
  };
}
