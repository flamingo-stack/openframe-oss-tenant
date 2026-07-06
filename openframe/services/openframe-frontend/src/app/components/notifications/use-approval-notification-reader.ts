'use client';

import { getApprovalMeta, useNotifications } from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useRef } from 'react';

/**
 * Imperatively marks the approval-request notification read once the user decides it (approve/reject)
 * somewhere other than the Notifications › Approvals list — e.g. inside the Mingo chat drawer, which
 * has no URL for `EntityViewAutoReader` to key off. Mirrors what the Approvals sub-row does on a
 * successful decision (`onResolved` → `markRead`), matching the pending notification to the resolved
 * request by `approvalRequestId`. `markRead` routes through the provider so the drawer list, the
 * unread connection and the sidebar bucket all update together, and persists the read server-side.
 */
export function useApprovalNotificationReader(): (approvalRequestId: string) => void {
  const { notifications, markRead } = useNotifications();
  // Ref so the returned callback stays stable and always reads the latest list without resubscribing.
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  return useCallback(
    (approvalRequestId: string) => {
      const match = notificationsRef.current.find(
        n => !n.read && getApprovalMeta(n)?.approvalRequestId === approvalRequestId,
      );
      if (match) markRead(match.id);
    },
    [markRead],
  );
}
