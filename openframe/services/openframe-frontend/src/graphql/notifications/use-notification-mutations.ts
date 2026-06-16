'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useRef } from 'react';
import { useMutation, useRelayEnvironment } from 'react-relay';
import type { deleteAllReadNotificationsMutation as DeleteAllReadNotificationsMutationType } from '@/__generated__/deleteAllReadNotificationsMutation.graphql';
import type { deleteNotificationMutation as DeleteNotificationMutationType } from '@/__generated__/deleteNotificationMutation.graphql';
import type { markAllNotificationsReadMutation as MarkAllReadMutationType } from '@/__generated__/markAllNotificationsReadMutation.graphql';
import type { markNotificationReadMutation as MarkReadMutationType } from '@/__generated__/markNotificationReadMutation.graphql';
import { deleteAllReadNotificationsMutation } from './delete-all-read-notifications-mutation';
import { deleteNotificationMutation } from './delete-notification-mutation';
import { markAllNotificationsReadMutation } from './mark-all-notifications-read-mutation';
import { markNotificationReadMutation } from './mark-notification-read-mutation';
import {
  makeDeleteAllReadUpdater,
  makeDeleteNotificationUpdater,
  makeMarkAllReadUpdater,
  makeMarkReadUpdater,
  type NotificationConnectionPair,
} from './notifications-helpers';
import { refreshUnreadCounts } from './unread-counts-relay';

export type NotificationMutation = 'markRead' | 'markAllRead' | 'delete' | 'deleteAllRead';

interface UseNotificationMutationsOptions {
  filterPairs: NotificationConnectionPair[];
  onError?: (operation: NotificationMutation, err: Error) => void;
  onMarkAllReadCompleted?: () => void;
  onDeleteAllReadCompleted?: () => void;
}

export function useNotificationMutations({
  filterPairs,
  onError,
  onMarkAllReadCompleted,
  onDeleteAllReadCompleted,
}: UseNotificationMutationsOptions) {
  const { toast } = useToast();
  const environment = useRelayEnvironment();
  const [markReadCommit] = useMutation<MarkReadMutationType>(markNotificationReadMutation);
  const [markAllReadCommit, isMarkingAllRead] = useMutation<MarkAllReadMutationType>(markAllNotificationsReadMutation);
  const [deleteCommit] = useMutation<DeleteNotificationMutationType>(deleteNotificationMutation);
  const [deleteAllReadCommit, isDeletingAllRead] = useMutation<DeleteAllReadNotificationsMutationType>(
    deleteAllReadNotificationsMutation,
  );

  const filterPairsRef = useRef(filterPairs);
  filterPairsRef.current = filterPairs;

  const markRead = useCallback(
    (id: string) => {
      const updater = (store: Parameters<ReturnType<typeof makeMarkReadUpdater>>[0]) =>
        makeMarkReadUpdater(id, filterPairsRef.current)(store);
      markReadCommit({
        variables: { id },
        optimisticUpdater: updater,
        updater,
        onCompleted: () => {
          refreshUnreadCounts(environment);
        },
        onError: err => {
          toast({ title: 'Failed to mark as read', description: err.message, variant: 'destructive' });
          onError?.('markRead', err);
        },
      });
    },
    [environment, markReadCommit, onError, toast],
  );

  const markAllRead = useCallback(() => {
    const updater = (store: Parameters<ReturnType<typeof makeMarkAllReadUpdater>>[0]) =>
      makeMarkAllReadUpdater(filterPairsRef.current)(store);
    markAllReadCommit({
      variables: {},
      optimisticUpdater: updater,
      updater,
      onCompleted: () => {
        refreshUnreadCounts(environment);
        onMarkAllReadCompleted?.();
      },
      onError: err => {
        toast({ title: 'Failed to mark all as read', description: err.message, variant: 'destructive' });
        onError?.('markAllRead', err);
      },
    });
  }, [environment, markAllReadCommit, onError, onMarkAllReadCompleted, toast]);

  const removeNotification = useCallback(
    (id: string) => {
      const updater = (store: Parameters<ReturnType<typeof makeDeleteNotificationUpdater>>[0]) =>
        makeDeleteNotificationUpdater(id, filterPairsRef.current)(store);
      deleteCommit({
        variables: { id },
        optimisticUpdater: updater,
        updater,
        onCompleted: () => {
          // Deleting an unread notification changes per-category counts.
          refreshUnreadCounts(environment);
        },
        onError: err => {
          toast({ title: 'Failed to delete notification', description: err.message, variant: 'destructive' });
          onError?.('delete', err);
        },
      });
    },
    [deleteCommit, environment, onError, toast],
  );

  const removeAllRead = useCallback(() => {
    const updater = (store: Parameters<ReturnType<typeof makeDeleteAllReadUpdater>>[0]) =>
      makeDeleteAllReadUpdater(filterPairsRef.current)(store);
    deleteAllReadCommit({
      variables: {},
      optimisticUpdater: updater,
      updater,
      onCompleted: () => {
        onDeleteAllReadCompleted?.();
      },
      onError: err => {
        toast({ title: 'Failed to delete read notifications', description: err.message, variant: 'destructive' });
        onError?.('deleteAllRead', err);
      },
    });
  }, [deleteAllReadCommit, onError, onDeleteAllReadCompleted, toast]);

  return { markRead, markAllRead, removeNotification, removeAllRead, isMarkingAllRead, isDeletingAllRead };
}
