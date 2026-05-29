'use client';

import {
  NotificationPopups,
  type NotificationsActions,
  NotificationsProvider,
  useNotifications,
} from '@flamingo-stack/openframe-frontend-core';
import { useLocalStorage } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useNatsJsonSubscription } from '@flamingo-stack/openframe-frontend-core/nats';
import { useRouter } from 'next/navigation';
import { type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ConnectionHandler,
  commitLocalUpdate,
  useLazyLoadQuery,
  usePaginationFragment,
  useRelayEnvironment,
} from 'react-relay';
import type {
  NotificationSeverity,
  notificationsDrawerRelay_query$key as NotificationsDrawerFragmentKey,
} from '@/__generated__/notificationsDrawerRelay_query.graphql';
import type { notificationsDrawerRelayPaginationQuery as NotificationsDrawerPaginationQueryType } from '@/__generated__/notificationsDrawerRelayPaginationQuery.graphql';
import type { notificationsDrawerRelayQuery as NotificationsDrawerRelayQueryType } from '@/__generated__/notificationsDrawerRelayQuery.graphql';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import {
  notificationsDrawerRelayFragment,
  notificationsDrawerRelayQuery,
} from '@/graphql/notifications/notifications-drawer-relay';
import {
  mapNotificationNode,
  NOTIFICATIONS_CONNECTION_KEY,
  parseSeverity,
  UNFILTERED_NOTIFICATION_PAIR,
} from '@/graphql/notifications/notifications-helpers';
import { useNotificationMutations } from '@/graphql/notifications/use-notification-mutations';
import { featureFlags } from '@/lib/feature-flags';
import { notificationGlobalId } from '@/lib/relay-id';

const DRAWER_PAGE_SIZE = 30;
const SHOW_POPUPS_STORAGE_KEY = 'of.notifications:showPopups';
const NOTIFICATION_SUBJECT_PREFIX = 'user';
const NOTIFICATION_SUBJECT_SUFFIX = 'notification';
const POPUP_OFFSET_CLASS = 'top-16 md:top-[4.5rem]';

const DRAWER_FILTER_PAIRS = [UNFILTERED_NOTIFICATION_PAIR];
const NATS_CONTEXT_TYPENAME = 'GenericContext';

interface NatsNotificationPayload {
  id?: string;
  notificationId?: string;
  severity?: NotificationSeverity | Lowercase<NotificationSeverity>;
  title?: string;
  description?: string;
  createdAt?: string | number;
  context?: { type?: string; [k: string]: unknown };
}

interface PaginationState {
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore?: () => void;
}

const EMPTY_PAGINATION: PaginationState = { hasMore: false, isLoadingMore: false };

export function NotificationsDataProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userId = useAuthStore(s => s.user?.id);
  const [showPopups, setShowPopups] = useLocalStorage<boolean>(SHOW_POPUPS_STORAGE_KEY, true);
  const notificationsEnabled = featureFlags.notifications.enabled();

  return (
    <NotificationsDataInner
      userId={notificationsEnabled && isAuthenticated ? (userId ?? null) : null}
      showPopups={showPopups}
      onShowPopupsChange={setShowPopups}
    >
      {children}
    </NotificationsDataInner>
  );
}

interface NotificationsDataInnerProps {
  userId: string | null;
  showPopups: boolean;
  onShowPopupsChange: (value: boolean) => void;
  children: ReactNode;
}

function NotificationsDataInner({ userId, showPopups, onShowPopupsChange, children }: NotificationsDataInnerProps) {
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);
  const enabled = userId !== null;

  const { markRead, markAllRead, removeNotification } = useNotificationMutations({
    filterPairs: DRAWER_FILTER_PAIRS,
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
      actions={enabled ? actions : undefined}
      onHistoryClick={enabled ? handleHistoryClick : undefined}
      defaultShowPopups={showPopups}
      onShowPopupsChange={onShowPopupsChange}
      maxNotifications={Number.POSITIVE_INFINITY}
      hasMore={enabled ? pagination.hasMore : false}
      isLoadingMore={enabled ? pagination.isLoadingMore : false}
      onLoadMore={enabled ? pagination.loadMore : undefined}
    >
      {enabled && (
        <>
          <Suspense fallback={null}>
            <NotificationsDrawerHydrator onPaginationChange={setPagination} />
          </Suspense>
          <NotificationsLiveBridge userId={userId} />
          <NotificationPopups className={POPUP_OFFSET_CLASS} />
        </>
      )}
      {children}
    </NotificationsProvider>
  );
}

interface NotificationsDrawerHydratorProps {
  onPaginationChange: (next: PaginationState) => void;
}

function NotificationsDrawerHydrator({ onPaginationChange }: NotificationsDrawerHydratorProps) {
  const { setNotifications } = useNotifications();

  const queryData = useLazyLoadQuery<NotificationsDrawerRelayQueryType>(
    notificationsDrawerRelayQuery,
    { first: DRAWER_PAGE_SIZE, after: null },
    { fetchPolicy: 'store-and-network' },
  );
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment<
    NotificationsDrawerPaginationQueryType,
    NotificationsDrawerFragmentKey
  >(notificationsDrawerRelayFragment, queryData);

  const notifications = useMemo(
    () => data.notifications.edges.map(edge => mapNotificationNode(edge.node)),
    [data.notifications.edges],
  );

  useEffect(() => {
    setNotifications(notifications);
  }, [notifications, setNotifications]);

  const loadMore = useCallback(() => {
    if (!hasNext || isLoadingNext) return;
    loadNext(DRAWER_PAGE_SIZE);
  }, [hasNext, isLoadingNext, loadNext]);

  useEffect(() => {
    onPaginationChange({ hasMore: hasNext, isLoadingMore: isLoadingNext, loadMore });
  }, [hasNext, isLoadingNext, loadMore, onPaginationChange]);

  return null;
}

interface NotificationsLiveBridgeProps {
  userId: string;
}

function NotificationsLiveBridge({ userId }: NotificationsLiveBridgeProps) {
  const environment = useRelayEnvironment();
  const subject = `${NOTIFICATION_SUBJECT_PREFIX}.${userId}.${NOTIFICATION_SUBJECT_SUFFIX}`;
  const environmentRef = useRef(environment);
  environmentRef.current = environment;

  useNatsJsonSubscription<NatsNotificationPayload>(
    subject,
    useCallback(payload => {
      const rawId = payload.notificationId ?? payload.id;
      if (!rawId) return;
      const relayId = notificationGlobalId(rawId);
      const severity = parseSeverity(payload.severity);
      const title = payload.title ?? 'Notification';
      const description = payload.description ?? null;
      const contextType = payload.context?.type ?? null;
      const createdAtSeconds = Date.now() / 1000;

      commitLocalUpdate(environmentRef.current, store => {
        const root = store.getRoot();
        const conn = ConnectionHandler.getConnection(
          root,
          NOTIFICATIONS_CONNECTION_KEY,
          UNFILTERED_NOTIFICATION_PAIR.unread,
        );
        if (!conn) return;

        const existing = store.get(relayId);
        const node = existing ?? store.create(relayId, 'Notification');
        node.setValue(relayId, 'id');
        node.setValue(severity ?? 'INFO', 'severity');
        node.setValue(title, 'title');
        node.setValue(description, 'description');
        node.setValue(createdAtSeconds, 'createdAt');
        node.setValue(false, 'read');
        const contextRecordId = `${relayId}:context`;
        const contextRecord = store.get(contextRecordId) ?? store.create(contextRecordId, NATS_CONTEXT_TYPENAME);
        contextRecord.setValue(NATS_CONTEXT_TYPENAME, '__typename');
        contextRecord.setValue(contextType ?? 'UNKNOWN', 'type');
        node.setLinkedRecord(contextRecord, 'context');

        // Dedup: if the node already lives in the connection, don't re-prepend.
        const edges = conn.getLinkedRecords('edges') ?? [];
        const alreadyPresent = edges.some(edge => edge?.getLinkedRecord('node')?.getDataID() === relayId);
        if (alreadyPresent) return;

        const edge = ConnectionHandler.createEdge(store, conn, node, 'NotificationEdge');
        ConnectionHandler.insertEdgeBefore(conn, edge);
      });
    }, []),
  );

  return null;
}
