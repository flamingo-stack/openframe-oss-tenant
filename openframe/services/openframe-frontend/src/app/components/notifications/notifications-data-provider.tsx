'use client';

import {
  type Notification,
  type NotificationsActions,
  NotificationsProvider,
  type NotificationVariant,
  useNotifications,
} from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useNatsJsonSubscription } from '@flamingo-stack/openframe-frontend-core/nats';
import { type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryLoader } from 'react-relay';
import type { deleteNotificationMutation as DeleteNotificationMutationType } from '@/__generated__/deleteNotificationMutation.graphql';
import type { markAllNotificationsReadMutation as MarkAllReadMutationType } from '@/__generated__/markAllNotificationsReadMutation.graphql';
import type { markNotificationReadMutation as MarkReadMutationType } from '@/__generated__/markNotificationReadMutation.graphql';
import type {
  NotificationSeverity,
  notificationsListQuery as NotificationsListQueryType,
} from '@/__generated__/notificationsListQuery.graphql';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { deleteNotificationMutation } from '@/graphql/notifications/delete-notification-mutation';
import { markAllNotificationsReadMutation } from '@/graphql/notifications/mark-all-notifications-read-mutation';
import { markNotificationReadMutation } from '@/graphql/notifications/mark-notification-read-mutation';
import { notificationsListQuery } from '@/graphql/notifications/notifications-list-query';
import { notificationGlobalId } from '@/lib/relay-id';
import { NotificationsListHydrator } from './notifications-list-hydrator';

const LIST_PAGE_SIZE = 30;
const NOTIFICATION_SUBJECT_PREFIX = 'user';
const NOTIFICATION_SUBJECT_SUFFIX = 'notification';

interface NatsNotificationPayload {
  id?: string;
  notificationId?: string;
  severity?: NotificationSeverity | Lowercase<NotificationSeverity>;
  title?: string;
  description?: string;
  createdAt?: string | number;
  category?: string;
  context?: { type?: string; [k: string]: unknown };
}

type KnownSeverity = 'INFO' | 'WARNING' | 'DANGER';

function normalizeSeverity(value: NotificationSeverity | undefined): KnownSeverity | undefined {
  if (value === 'INFO' || value === 'WARNING' || value === 'DANGER') return value;
  return undefined;
}

export function severityToVariant(severity: KnownSeverity | undefined): NotificationVariant {
  switch (severity) {
    case 'DANGER':
      return 'error';
    case 'WARNING':
      return 'warning';
    case 'INFO':
      return 'info';
    default:
      return 'default';
  }
}

function parseSeverity(input: NatsNotificationPayload['severity']): KnownSeverity | undefined {
  if (!input) return undefined;
  const upper = String(input).toUpperCase();
  if (upper === 'INFO' || upper === 'WARNING' || upper === 'DANGER') return upper as KnownSeverity;
  return undefined;
}

function parseCreatedAt(value: NatsNotificationPayload['createdAt']): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

type NotificationNode = NonNullable<NotificationsListQueryType['response']['notifications']>['edges'][number]['node'];

export function mapNotificationNode(node: NotificationNode): Notification {
  const severity = normalizeSeverity(node.severity);
  return {
    id: node.id,
    title: node.title,
    description: node.description ?? undefined,
    createdAt: parseCreatedAt(node.createdAt as string | number),
    read: node.read,
    severity,
    variant: severityToVariant(severity),
    meta: {
      contextType: node.context?.type,
      contextTypename: node.context?.__typename,
    },
  };
}

export function NotificationsDataProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userId = useAuthStore(s => s.user?.id);

  const [queryRef, loadQuery, disposeQuery] = useQueryLoader<NotificationsListQueryType>(notificationsListQuery);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      disposeQuery();
      return;
    }
    loadQuery({ first: LIST_PAGE_SIZE, after: null, filter: null }, { fetchPolicy: 'network-only' });
    return () => {
      disposeQuery();
    };
  }, [isAuthenticated, userId, loadQuery, disposeQuery]);

  const refetch = useCallback(() => {
    if (!isAuthenticated || !userId) return;
    loadQuery({ first: LIST_PAGE_SIZE, after: null, filter: null }, { fetchPolicy: 'network-only' });
  }, [isAuthenticated, userId, loadQuery]);

  const [markReadCommit] = useMutation<MarkReadMutationType>(markNotificationReadMutation);
  const [markAllReadCommit] = useMutation<MarkAllReadMutationType>(markAllNotificationsReadMutation);
  const [deleteCommit] = useMutation<DeleteNotificationMutationType>(deleteNotificationMutation);

  const actions = useMemo<NotificationsActions>(
    () => ({
      onMarkRead: id => {
        markReadCommit({
          variables: { id },
          onError: err => {
            toast({
              title: 'Failed to mark as read',
              description: err.message,
              variant: 'destructive',
            });
            refetch();
          },
        });
      },
      onMarkAllRead: () => {
        markAllReadCommit({
          variables: {},
          onError: err => {
            toast({
              title: 'Failed to mark all as read',
              description: err.message,
              variant: 'destructive',
            });
            refetch();
          },
        });
      },
      onRemove: id => {
        deleteCommit({
          variables: { id },
          onError: err => {
            toast({
              title: 'Failed to delete notification',
              description: err.message,
              variant: 'destructive',
            });
            refetch();
          },
        });
      },
    }),
    [markReadCommit, markAllReadCommit, deleteCommit, toast, refetch],
  );

  return (
    <NotificationsProvider actions={actions}>
      <Suspense fallback={null}>
        <NotificationsListHydrator queryRef={queryRef} />
      </Suspense>
      <NotificationsLiveBridge userId={userId ?? null} onLiveEvent={refetch} />
      {children}
    </NotificationsProvider>
  );
}

interface NotificationsLiveBridgeProps {
  userId: string | null;
  onLiveEvent: () => void;
}

function NotificationsLiveBridge({ userId, onLiveEvent }: NotificationsLiveBridgeProps) {
  const { upsertNotification } = useNotifications();
  const subject = userId ? `${NOTIFICATION_SUBJECT_PREFIX}.${userId}.${NOTIFICATION_SUBJECT_SUFFIX}` : null;
  const refetchRef = useRef(onLiveEvent);
  useEffect(() => {
    refetchRef.current = onLiveEvent;
  }, [onLiveEvent]);

  useNatsJsonSubscription<NatsNotificationPayload>(
    subject,
    useCallback(
      payload => {
        const rawId = payload.notificationId ?? payload.id;
        if (!rawId) {
          refetchRef.current();
          return;
        }
        const relayId = notificationGlobalId(rawId);
        const severity = parseSeverity(payload.severity);
        upsertNotification({
          id: relayId,
          title: payload.title ?? 'Notification',
          description: payload.description,
          severity,
          variant: severityToVariant(severity),
          category: payload.category,
          createdAt: parseCreatedAt(payload.createdAt),
          read: false,
          meta: {
            contextType: payload.context?.type,
            source: 'nats',
          },
        });
        refetchRef.current();
      },
      [upsertNotification],
    ),
  );

  return null;
}
