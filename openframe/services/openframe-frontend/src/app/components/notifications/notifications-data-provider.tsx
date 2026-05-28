'use client';

import {
  type NotificationsActions,
  NotificationsProvider,
  useNotifications,
} from '@flamingo-stack/openframe-frontend-core';
import { useLocalStorage } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useNatsJsonSubscription } from '@flamingo-stack/openframe-frontend-core/nats';
import { useRouter } from 'next/navigation';
import { type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryLoader } from 'react-relay';
import type {
  NotificationSeverity,
  notificationsListQuery as NotificationsListQueryType,
} from '@/__generated__/notificationsListQuery.graphql';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import {
  parseCreatedAt,
  parseSeverity,
  severityToVariant,
  UNFILTERED_NOTIFICATION_PAIR,
} from '@/graphql/notifications/notifications-helpers';
import { notificationsListQuery } from '@/graphql/notifications/notifications-list-query';
import { useNotificationMutations } from '@/graphql/notifications/use-notification-mutations';
import { featureFlags } from '@/lib/feature-flags';
import { notificationGlobalId } from '@/lib/relay-id';
import { NotificationsListHydrator } from './notifications-list-hydrator';

const LIST_PAGE_SIZE = 30;
const SHOW_POPUPS_STORAGE_KEY = 'of.notifications:showPopups';
const NOTIFICATION_SUBJECT_PREFIX = 'user';
const NOTIFICATION_SUBJECT_SUFFIX = 'notification';

const DRAWER_FILTER_PAIRS = [UNFILTERED_NOTIFICATION_PAIR];

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

export function NotificationsDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userId = useAuthStore(s => s.user?.id);
  const [showPopups, setShowPopups] = useLocalStorage<boolean>(SHOW_POPUPS_STORAGE_KEY, true);
  // Gated by feature flag to skip the GraphQL query + NATS subscription when notifications are disabled.
  const notificationsEnabled = featureFlags.notifications.enabled();

  const [queryRef, loadQuery, disposeQuery] = useQueryLoader<NotificationsListQueryType>(notificationsListQuery);

  useEffect(() => {
    if (!notificationsEnabled || !isAuthenticated || !userId) {
      disposeQuery();
      return;
    }
    loadQuery(
      { first: LIST_PAGE_SIZE, after: null, filter: { read: false }, search: null },
      { fetchPolicy: 'network-only' },
    );
    return () => {
      disposeQuery();
    };
  }, [notificationsEnabled, isAuthenticated, userId, loadQuery, disposeQuery]);

  const refetch = useCallback(() => {
    if (!notificationsEnabled || !isAuthenticated || !userId) return;
    loadQuery(
      { first: LIST_PAGE_SIZE, after: null, filter: { read: false }, search: null },
      { fetchPolicy: 'network-only' },
    );
  }, [notificationsEnabled, isAuthenticated, userId, loadQuery]);

  const { markRead, markAllRead, removeNotification } = useNotificationMutations({
    filterPairs: DRAWER_FILTER_PAIRS,
    onError: refetch,
  });

  const actions = useMemo<NotificationsActions>(
    () => ({
      onMarkRead: markRead,
      onMarkAllRead: markAllRead,
      onRemove: removeNotification,
    }),
    [markRead, markAllRead, removeNotification],
  );

  const handleHistoryClick = useCallback(() => {
    router.push('/notifications');
  }, [router]);

  return (
    <NotificationsProvider
      actions={notificationsEnabled ? actions : undefined}
      onHistoryClick={notificationsEnabled ? handleHistoryClick : undefined}
      defaultShowPopups={showPopups}
      onShowPopupsChange={setShowPopups}
    >
      {notificationsEnabled && (
        <>
          <Suspense fallback={null}>
            <NotificationsListHydrator queryRef={queryRef} />
          </Suspense>
          <NotificationsLiveBridge userId={userId ?? null} onLiveEvent={refetch} />
        </>
      )}
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
