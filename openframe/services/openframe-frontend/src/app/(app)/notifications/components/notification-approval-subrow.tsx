'use client';

import {
  ApprovalBatchMessage,
  approvalMetaToBatchData,
  type ChatApprovalStatus,
  getApprovalMeta,
  type Notification,
  resolutionToStatus,
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
  // Optimistic status for this user's own click; backend resolution (below) wins once it arrives.
  const [localStatus, setLocalStatus] = useState<ChatApprovalStatus | null>(null);
  const approval = getApprovalMeta(notification);
  const resolvedStatus = resolutionToStatus(approval?.resolution);
  const status: ChatApprovalStatus = resolvedStatus !== 'pending' ? resolvedStatus : (localStatus ?? 'pending');

  const batchData = useMemo(() => (approval ? approvalMetaToBatchData(approval) : null), [approval]);

  const decide = useCallback(
    async (approve: boolean) => {
      if (!approval) return;
      setLocalStatus(approve ? 'approved' : 'rejected');
      if (await approveRequest(approval.approvalRequestId, approve)) {
        onResolved?.(notification.id);
      } else {
        setLocalStatus(null); // roll back the optimistic flip; the request failed
      }
    },
    [approval, approveRequest, onResolved, notification.id],
  );

  if (!approval || !batchData) return null;

  return (
    <div data-no-row-click className="bg-ods-bg p-0">
      <ApprovalBatchMessage
        data={batchData}
        status={status}
        resolvedByName={approval.resolvedByName}
        showExecutionStatus={false}
        onApprove={() => decide(true)}
        onReject={() => decide(false)}
        className="mb-0 rounded-none border-0"
      />
    </div>
  );
}
