'use client';

import {
  type ApprovalBatchData,
  ApprovalBatchMessage,
  type ChatApprovalStatus,
  getApprovalMeta,
  type Notification,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useMemo, useState } from 'react';
import { useApproveRequest } from '@/app/components/notifications/use-approve-request';

interface NotificationApprovalSubRowProps {
  notification: Notification;
  /** Called after a successful approve/reject (e.g. to mark the notification read). */
  onResolved?: (notificationId: string) => void;
}

/** The expandable approval block for an approval-request notification row: commands + explanation + approve/reject. */
export function NotificationApprovalSubRow({ notification, onResolved }: NotificationApprovalSubRowProps) {
  const approveRequest = useApproveRequest();
  const [status, setStatus] = useState<ChatApprovalStatus>('pending');
  const approval = getApprovalMeta(notification);

  const batchData = useMemo<ApprovalBatchData | null>(() => {
    if (!approval) return null;
    return {
      approvalRequestId: approval.approvalRequestId,
      approvalType: approval.approvalType ?? '',
      toolCalls: approval.toolCalls.map((tc, index) => ({
        toolExecutionRequestId: tc.toolExecutionRequestId ?? `${approval.approvalRequestId}:${index}`,
        toolName: tc.toolName,
        toolTitle: tc.toolTitle ?? undefined,
        toolExplanation: tc.toolExplanation ?? undefined,
        toolType: tc.toolType ?? undefined,
        requiresApproval: tc.requiresApproval ?? true,
        approvalType: tc.approvalType ?? null,
        toolCallArguments: tc.toolCallArguments ?? null,
      })),
    };
  }, [approval]);

  const decide = useCallback(
    async (approve: boolean) => {
      if (!approval) return;
      if (!(await approveRequest(approval.approvalRequestId, approve))) return;
      setStatus(approve ? 'approved' : 'rejected');
      onResolved?.(notification.id);
    },
    [approval, approveRequest, onResolved, notification.id],
  );

  if (!batchData) return null;

  return (
    <div data-no-row-click className="bg-ods-bg p-[var(--spacing-system-m)]">
      <ApprovalBatchMessage
        data={batchData}
        status={status}
        onApprove={() => decide(true)}
        onReject={() => decide(false)}
        className="mb-0 rounded-none border-0"
      />
    </div>
  );
}
