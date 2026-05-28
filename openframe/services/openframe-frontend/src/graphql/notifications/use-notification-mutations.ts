'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback } from 'react';
import { useMutation } from 'react-relay';
import type { deleteNotificationMutation as DeleteNotificationMutationType } from '@/__generated__/deleteNotificationMutation.graphql';
import type { markAllNotificationsReadMutation as MarkAllReadMutationType } from '@/__generated__/markAllNotificationsReadMutation.graphql';
import type { markNotificationReadMutation as MarkReadMutationType } from '@/__generated__/markNotificationReadMutation.graphql';
import { deleteNotificationMutation } from './delete-notification-mutation';
import { markAllNotificationsReadMutation } from './mark-all-notifications-read-mutation';
import { markNotificationReadMutation } from './mark-notification-read-mutation';
import {
  makeDeleteNotificationUpdater,
  makeMarkAllReadUpdater,
  makeMarkReadUpdater,
  type NotificationConnectionPair,
} from './notifications-helpers';

export type NotificationMutation = 'markRead' | 'markAllRead' | 'delete';

interface UseNotificationMutationsOptions {
  filterPairs: NotificationConnectionPair[];
  onError?: (operation: NotificationMutation, err: Error) => void;
  onMarkAllReadCompleted?: () => void;
}

export function useNotificationMutations({
  filterPairs,
  onError,
  onMarkAllReadCompleted,
}: UseNotificationMutationsOptions) {
  const { toast } = useToast();
  const [markReadCommit] = useMutation<MarkReadMutationType>(markNotificationReadMutation);
  const [markAllReadCommit, isMarkingAllRead] = useMutation<MarkAllReadMutationType>(markAllNotificationsReadMutation);
  const [deleteCommit] = useMutation<DeleteNotificationMutationType>(deleteNotificationMutation);

  const markRead = useCallback(
    (id: string) => {
      const updater = makeMarkReadUpdater(id, filterPairs);
      markReadCommit({
        variables: { id },
        optimisticUpdater: updater,
        updater,
        onError: err => {
          toast({ title: 'Failed to mark as read', description: err.message, variant: 'destructive' });
          onError?.('markRead', err);
        },
      });
    },
    [markReadCommit, filterPairs, onError, toast],
  );

  const markAllRead = useCallback(() => {
    const updater = makeMarkAllReadUpdater(filterPairs);
    markAllReadCommit({
      variables: {},
      optimisticUpdater: updater,
      updater,
      onCompleted: () => {
        onMarkAllReadCompleted?.();
      },
      onError: err => {
        toast({ title: 'Failed to mark all as read', description: err.message, variant: 'destructive' });
        onError?.('markAllRead', err);
      },
    });
  }, [markAllReadCommit, filterPairs, onError, onMarkAllReadCompleted, toast]);

  const removeNotification = useCallback(
    (id: string) => {
      const updater = makeDeleteNotificationUpdater(id, filterPairs);
      deleteCommit({
        variables: { id },
        optimisticUpdater: updater,
        updater,
        onError: err => {
          toast({ title: 'Failed to delete notification', description: err.message, variant: 'destructive' });
          onError?.('delete', err);
        },
      });
    },
    [deleteCommit, filterPairs, onError, toast],
  );

  return { markRead, markAllRead, removeNotification, isMarkingAllRead };
}
