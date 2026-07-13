'use client';

import {
  ADMIN_APPROVAL_REQUEST_CONTEXT_TYPE,
  type ApprovalNotificationMeta,
  ApprovalRequestNotificationTile,
  getApprovalMeta,
  isApprovalNotification,
  type Notification,
  NotificationPopups,
  type NotificationsActions,
  NotificationsProvider,
  NotificationTile,
  type RenderNotificationTile,
  useNotifications,
} from '@flamingo-stack/openframe-frontend-core';
import { ErrorBoundary } from '@flamingo-stack/openframe-frontend-core/components/features';
import { useLocalStorage } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useNatsJsonSubscription } from '@flamingo-stack/openframe-frontend-core/nats';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ConnectionHandler,
  commitLocalUpdate,
  commitMutation,
  useLazyLoadQuery,
  usePaginationFragment,
  useRelayEnvironment,
} from 'react-relay';
import type { RecordProxy, RecordSourceSelectorProxy } from 'relay-runtime';
import type { markNotificationReadMutation as MarkReadMutationType } from '@/__generated__/markNotificationReadMutation.graphql';
import type {
  NotificationSeverity,
  notificationsDrawerRelay_query$key as NotificationsDrawerFragmentKey,
} from '@/__generated__/notificationsDrawerRelay_query.graphql';
import type { notificationsDrawerRelayPaginationQuery as NotificationsDrawerPaginationQueryType } from '@/__generated__/notificationsDrawerRelayPaginationQuery.graphql';
import type { notificationsDrawerRelayQuery as NotificationsDrawerRelayQueryType } from '@/__generated__/notificationsDrawerRelayQuery.graphql';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { markNotificationReadMutation } from '@/graphql/notifications/mark-notification-read-mutation';
import {
  notificationsDrawerRelayFragment,
  notificationsDrawerRelayQuery,
} from '@/graphql/notifications/notifications-drawer-relay';
import {
  adjustUnreadCount,
  makeMarkReadUpdater,
  mapNotificationNode,
  NOTIFICATIONS_CONNECTION_KEY,
  parseSeverity,
  UNFILTERED_NOTIFICATION_PAIR,
} from '@/graphql/notifications/notifications-helpers';
import { refreshUnreadCounts } from '@/graphql/notifications/unread-counts-relay';
import { useNotificationMutations } from '@/graphql/notifications/use-notification-mutations';
import {
  getActiveDialogViews,
  getServerActiveDialogViews,
  isDialogViewActive,
  subscribeActiveDialogViews,
} from '@/lib/active-dialog-views';
import { featureFlags } from '@/lib/feature-flags';
import { notificationGlobalId } from '@/lib/relay-id';
import { routes } from '@/lib/routes';
import { withCategoryIcon } from './notification-category-icons';
import {
  CONTEXT_TYPENAME_BY_TYPE,
  notificationTargetsDialog,
  notificationTargetsLocation,
  resolveNotificationAction,
} from './notification-navigation';
import { openMingoDialogInDrawer } from './open-mingo-dialog';
import { useApproveRequest } from './use-approve-request';

const DRAWER_PAGE_SIZE = 30;
const SHOW_POPUPS_STORAGE_KEY = 'of.notifications:showPopups';
const SHOW_DESKTOP_POPUPS_STORAGE_KEY = 'of.notifications:desktop';
const DESKTOP_NOTIFICATION_ICON = '/assets/openframe/android-chrome-192x192.png';
const NOTIFICATION_SUBJECT_PREFIX = 'user';
const NOTIFICATION_SUBJECT_SUFFIX = 'notification';
const POPUP_OFFSET_CLASS = 'top-16 md:top-[4.5rem]';
const NOTIFICATIONS_HISTORY_HREF = routes.notifications({ tab: 'history' });

const DRAWER_FILTER_PAIRS = [UNFILTERED_NOTIFICATION_PAIR];
const NATS_CONTEXT_TYPENAME = 'GenericContext';
const APPROVAL_CONTEXT_TYPENAME = 'AdminApprovalRequestContext';

/** Extract the approval payload from a raw NATS notification context, or null if it isn't one. */
function parseApprovalContext(context: NatsNotificationPayload['context']): ApprovalNotificationMeta | null {
  if (!context || context.type !== ADMIN_APPROVAL_REQUEST_CONTEXT_TYPE) return null;
  const approvalRequestId = context.approvalRequestId;
  if (typeof approvalRequestId !== 'string') return null;
  const rawToolCalls = Array.isArray(context.toolCalls) ? context.toolCalls : [];
  return {
    approvalRequestId,
    dialogId: typeof context.dialogId === 'string' ? context.dialogId : null,
    ticketId: typeof context.ticketId === 'string' ? context.ticketId : null,
    approvalType: typeof context.approvalType === 'string' ? context.approvalType : null,
    resolution: typeof context.resolution === 'string' ? context.resolution : null,
    resolvedByName: typeof context.resolvedByName === 'string' ? context.resolvedByName : null,
    toolCalls: rawToolCalls.map(raw => {
      const call = (raw ?? {}) as Record<string, unknown>;
      return {
        toolExecutionRequestId: typeof call.toolExecutionRequestId === 'string' ? call.toolExecutionRequestId : null,
        toolName: typeof call.toolName === 'string' ? call.toolName : '',
        toolTitle: typeof call.toolTitle === 'string' ? call.toolTitle : null,
        toolExplanation: typeof call.toolExplanation === 'string' ? call.toolExplanation : null,
        toolType: typeof call.toolType === 'string' ? call.toolType : null,
        requiresApproval: Boolean(call.requiresApproval),
        approvalType: typeof call.approvalType === 'string' ? call.approvalType : null,
        toolCallArguments:
          call.toolCallArguments && typeof call.toolCallArguments === 'object'
            ? (call.toolCallArguments as Record<string, unknown>)
            : null,
      };
    }),
  };
}

/** Write a JSON custom-scalar field: RecordProxy.setValue rejects objects, so use the normalizer's unsafe setter. */
function setJsonScalar(record: unknown, name: string, value: Record<string, unknown> | null) {
  (record as Record<string, (v: unknown, n: string) => void>).setValue__UNSAFE(value, name);
}

/** Get-or-create a Notification context record and stamp its GraphQL `__typename`. */
function upsertContextRecord(store: RecordSourceSelectorProxy, id: string, typename: string): RecordProxy {
  const record = store.get(id) ?? store.create(id, typename);
  record.setValue(typename, '__typename');
  return record;
}

function writeToolCallRecord(
  store: RecordSourceSelectorProxy,
  id: string,
  call: ApprovalNotificationMeta['toolCalls'][number],
): RecordProxy {
  const record = store.get(id) ?? store.create(id, 'ApprovalToolCall');
  record.setValue(call.toolExecutionRequestId ?? null, 'toolExecutionRequestId');
  record.setValue(call.toolName ?? '', 'toolName');
  record.setValue(call.toolTitle ?? null, 'toolTitle');
  record.setValue(call.toolExplanation ?? null, 'toolExplanation');
  record.setValue(call.toolType ?? null, 'toolType');
  record.setValue(Boolean(call.requiresApproval), 'requiresApproval');
  record.setValue(call.approvalType ?? null, 'approvalType');
  setJsonScalar(record, 'toolCallArguments', call.toolCallArguments ?? null);
  return record;
}

/** Build the Notification.context record for a NATS payload: approval, any typed context, or a generic fallback. */
function writeNotificationContext(
  store: RecordSourceSelectorProxy,
  contextRecordId: string,
  payload: NatsNotificationPayload,
): RecordProxy {
  const approval = parseApprovalContext(payload.context);
  if (approval) {
    const record = upsertContextRecord(store, contextRecordId, APPROVAL_CONTEXT_TYPENAME);
    record.setValue(ADMIN_APPROVAL_REQUEST_CONTEXT_TYPE, 'type');
    record.setValue(approval.approvalRequestId, 'approvalRequestId');
    record.setValue(approval.dialogId ?? null, 'dialogId');
    record.setValue(approval.ticketId ?? null, 'ticketId');
    record.setValue(approval.approvalType ?? null, 'approvalType');
    record.setValue(approval.resolution ?? null, 'resolution');
    record.setValue(approval.resolvedByName ?? null, 'resolvedByName');
    record.setLinkedRecords(
      approval.toolCalls.map((call, i) => writeToolCallRecord(store, `${contextRecordId}:toolCall:${i}`, call)),
      'toolCalls',
    );
    return record;
  }

  // Any other known context: rebuild a typed record carrying the entity ids the route mapping reads
  // (dialogId / ticketId), so the live tile navigates and auto-reads exactly like a fetched one.
  const type = payload.context?.type;
  const typename = type ? CONTEXT_TYPENAME_BY_TYPE[type] : undefined;
  if (type && typename) {
    const record = upsertContextRecord(store, contextRecordId, typename);
    record.setValue(type, 'type');
    const dialogId = payload.context?.dialogId;
    const ticketId = payload.context?.ticketId;
    if (typeof dialogId === 'string') record.setValue(dialogId, 'dialogId');
    if (typeof ticketId === 'string') record.setValue(ticketId, 'ticketId');
    return record;
  }

  const record = upsertContextRecord(store, contextRecordId, NATS_CONTEXT_TYPENAME);
  record.setValue(type ?? 'UNKNOWN', 'type');
  return record;
}

/** Prepend a notification node to the unread connection, skipping if it's already present. */
function prependNotificationEdge(
  store: RecordSourceSelectorProxy,
  conn: RecordProxy,
  node: RecordProxy,
  relayId: string,
): void {
  const edges = conn.getLinkedRecords('edges') ?? [];
  if (edges.some(edge => edge?.getLinkedRecord('node')?.getDataID() === relayId)) return;
  const edge = ConnectionHandler.createEdge(store, conn, node, 'NotificationEdge');
  ConnectionHandler.insertEdgeBefore(conn, edge);
}

interface NatsNotificationPayload {
  id?: string;
  notificationId?: string;
  severity?: NotificationSeverity | Lowercase<NotificationSeverity>;
  title?: string;
  description?: string;
  createdAt?: string | number;
  // Backend NotificationCategory (e.g. MINGO); buckets the sidebar unread count.
  category?: string;
  // CREATED is the initial push; UPDATED supersedes an earlier push with the same id
  // (e.g. an approval request whose status changed). Absent → treat as CREATED.
  eventType?: 'CREATED' | 'UPDATED';
  context?: { type?: string; resolution?: string; [k: string]: unknown };
}

interface PaginationState {
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore?: () => void;
}

const EMPTY_PAGINATION: PaginationState = { hasMore: false, isLoadingMore: false };

interface TileHelpers {
  onComplete: (id: string) => void;
  onSettle: (id: string) => void;
  liveDurationMs?: number;
}

interface NavigationTileWrapperProps {
  notification: Notification;
  helpers: TileHelpers;
  children: ReactNode;
}

/** Wraps a tile so its body navigates to the notification's target entity; inner buttons keep their own clicks. */
function NavigationTileWrapper({ notification, helpers, children }: NavigationTileWrapperProps) {
  const router = useRouter();
  const { close, markRead } = useNotifications();
  const action = resolveNotificationAction(notification);

  const navigate = useCallback(
    (event: ReactMouseEvent<HTMLDivElement> | ReactKeyboardEvent<HTMLDivElement>) => {
      // Inner controls (Approve/Reject, expand toggle, dismiss) own their own clicks.
      if ((event.target as HTMLElement).closest('button')) return;
      if (!action) return;
      if ('key' in event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
      }
      close();
      // Settle (dismiss the live tile) but keep it unread until the user acts on the entity.
      helpers.onSettle(notification.id);
      if ('mingoDialogId' in action) {
        openMingoDialogInDrawer(action.mingoDialogId);
        // The drawer changes no URL, so the location-based `EntityViewAutoReader`
        // can't clear this one — mark it read here to match the route flow.
        markRead(notification.id);
      } else {
        router.push(action.route);
      }
    },
    [action, close, markRead, helpers, notification, router],
  );

  if (!action) return <>{children}</>;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={navigate}
      className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ods-accent"
    >
      {children}
    </div>
  );
}

interface ApprovalTileWithNavigationProps {
  notification: Notification;
  helpers: TileHelpers;
  onDecide: (approvalRequestId: string, approve: boolean) => Promise<void>;
}

function ApprovalTileWithNavigation({ notification, helpers, onDecide }: ApprovalTileWithNavigationProps) {
  return (
    <NavigationTileWrapper notification={notification} helpers={helpers}>
      <ApprovalRequestNotificationTile
        notification={notification}
        onApprove={approvalRequestId => onDecide(approvalRequestId, true)}
        onReject={approvalRequestId => onDecide(approvalRequestId, false)}
        onComplete={helpers.onComplete}
        onSettle={helpers.onSettle}
        liveDurationMs={helpers.liveDurationMs}
      />
    </NavigationTileWrapper>
  );
}

export function NotificationsDataProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userId = useAuthStore(s => s.user?.id);
  const [showPopups, setShowPopups] = useLocalStorage<boolean>(SHOW_POPUPS_STORAGE_KEY, true);
  const [showDesktopPopups, setShowDesktopPopups] = useLocalStorage<boolean>(SHOW_DESKTOP_POPUPS_STORAGE_KEY, false);
  const notificationsEnabled = featureFlags.notifications.enabled();

  return (
    <NotificationsDataInner
      userId={notificationsEnabled && isAuthenticated ? (userId ?? null) : null}
      showPopups={showPopups}
      onShowPopupsChange={setShowPopups}
      showDesktopPopups={showDesktopPopups}
      onShowDesktopPopupsChange={setShowDesktopPopups}
    >
      {children}
    </NotificationsDataInner>
  );
}

interface NotificationsDataInnerProps {
  userId: string | null;
  showPopups: boolean;
  onShowPopupsChange: (value: boolean) => void;
  showDesktopPopups: boolean;
  onShowDesktopPopupsChange: (value: boolean) => void;
  children: ReactNode;
}

function NotificationsDataInner({
  userId,
  showPopups,
  onShowPopupsChange,
  showDesktopPopups,
  onShowDesktopPopupsChange,
  children,
}: NotificationsDataInnerProps) {
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
    router.push(NOTIFICATIONS_HISTORY_HREF);
  }, [router]);

  const approveRequest = useApproveRequest();

  const decideApproval = useCallback(
    async (approvalRequestId: string, approve: boolean) => {
      if (!(await approveRequest(approvalRequestId, approve))) throw new Error('approval request failed');
    },
    [approveRequest],
  );

  const renderTile = useCallback<RenderNotificationTile>(
    (notification, helpers) => {
      if (isApprovalNotification(notification) && getApprovalMeta(notification)) {
        return <ApprovalTileWithNavigation notification={notification} helpers={helpers} onDecide={decideApproval} />;
      }
      // Non-approval tiles get the default look, made clickable only when they resolve to an action.
      if (resolveNotificationAction(notification)) {
        return (
          <NavigationTileWrapper notification={notification} helpers={helpers}>
            <NotificationTile
              notification={notification}
              liveDurationMs={helpers.liveDurationMs}
              onComplete={helpers.onComplete}
              onSettle={helpers.onSettle}
            />
          </NavigationTileWrapper>
        );
      }
      return undefined;
    },
    [decideApproval],
  );

  return (
    <NotificationsProvider
      actions={enabled ? actions : undefined}
      onHistoryClick={enabled ? handleHistoryClick : undefined}
      historyHref={enabled ? NOTIFICATIONS_HISTORY_HREF : undefined}
      defaultShowPopups={showPopups}
      onShowPopupsChange={onShowPopupsChange}
      defaultShowDesktopPopups={showDesktopPopups}
      onShowDesktopPopupsChange={onShowDesktopPopupsChange}
      maxNotifications={Number.POSITIVE_INFINITY}
      hasMore={enabled ? pagination.hasMore : false}
      isLoadingMore={enabled ? pagination.isLoadingMore : false}
      onLoadMore={enabled ? pagination.loadMore : undefined}
      renderTile={enabled ? renderTile : undefined}
    >
      {enabled && (
        <>
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <NotificationsDrawerHydrator onPaginationChange={setPagination} />
            </Suspense>
          </ErrorBoundary>
          <NotificationsLiveBridge userId={userId} />
          <EntityViewAutoReader />
          <NotificationPopups className={POPUP_OFFSET_CLASS} />
        </>
      )}
      {children}
    </NotificationsProvider>
  );
}

/**
 * Marks an unread notification read once the user opens the entity it points at (the mingo
 * dialog, the ticket, …). Works off the shared route mapping so it stays consistent across
 * every entity type a notification can carry, and routes through the context's `markRead` so
 * the drawer list, the unread connection and the sidebar bucket all update together. A Mingo
 * dialog opened in the chat drawer changes no URL, so "viewing" is the union of the location
 * match and the active-dialog-views registry.
 */
function EntityViewAutoReader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeDialogs = useSyncExternalStore(
    subscribeActiveDialogViews,
    getActiveDialogViews,
    getServerActiveDialogViews,
  );
  const { notifications, markRead } = useNotifications();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const notification of notifications) {
      if (notification.read) continue;
      if (
        notificationTargetsLocation(notification, pathname, params) ||
        notificationTargetsDialog(notification, activeDialogs)
      ) {
        markRead(notification.id);
      }
    }
  }, [pathname, searchParams, activeDialogs, notifications, markRead]);

  return null;
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
    () => data.notifications.edges.map(edge => withCategoryIcon(mapNotificationNode(edge.node))),
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

/**
 * True when the notification points at a dialog the user is watching live
 * (mingo page or chat drawer) in a visible tab — any context carrying a
 * `dialogId`, i.e. Mingo messages, their ticket-linked variant, and approval
 * requests. Such notifications are redundant — the message or approval card is
 * already rendering in the chat — so the popup is skipped and the notification
 * auto-marked read.
 */
function isWatchingNotificationDialog(payload: NatsNotificationPayload): boolean {
  const dialogId = payload.context?.dialogId;
  if (typeof dialogId !== 'string' || !isDialogViewActive(dialogId)) return false;
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}

/**
 * Mirror a live notification to the OS when the user opted in, permission is
 * granted, and the tab is hidden (visible tabs already show the in-app tile).
 * `tag` dedupes re-deliveries; clicking focuses the tab and navigates to the
 * notification's entity when it has one.
 */
function maybeShowDesktopNotification(
  payload: NatsNotificationPayload,
  relayId: string,
  title: string,
  description: string | null,
  navigate: (route: string) => void,
  markRead: (notificationId: string) => void,
): void {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted' ||
    document.visibilityState !== 'hidden'
  ) {
    return;
  }

  const action = resolveNotificationAction({
    id: relayId,
    title,
    createdAt: Date.now(),
    meta: {
      contextType: payload.context?.type,
      dialogId: payload.context?.dialogId,
      ticketId: payload.context?.ticketId,
    },
  });

  try {
    const notification = new Notification(title, {
      body: description ?? undefined,
      tag: relayId,
      icon: DESKTOP_NOTIFICATION_ICON,
    });
    notification.onclick = () => {
      window.focus();
      // A Mingo dialog opens in the drawer (no URL); everything else is a route.
      if (action) {
        if ('mingoDialogId' in action) {
          openMingoDialogInDrawer(action.mingoDialogId);
          // No route change → the location auto-reader can't clear it; mark read here.
          markRead(relayId);
        } else {
          navigate(action.route);
        }
      }
      notification.close();
    };
  } catch {
    // Page-context Notification construction throws on Android Chrome (service-worker only there).
  }
}

function NotificationsLiveBridge({ userId }: NotificationsLiveBridgeProps) {
  const environment = useRelayEnvironment();
  const router = useRouter();
  const { showDesktopPopups, markRead } = useNotifications();
  const subject = `${NOTIFICATION_SUBJECT_PREFIX}.${userId}.${NOTIFICATION_SUBJECT_SUFFIX}`;
  const environmentRef = useRef(environment);
  environmentRef.current = environment;
  // Refs keep the NATS subscription callback dependency-free (no resubscribe on toggle/navigation).
  const showDesktopPopupsRef = useRef(showDesktopPopups);
  showDesktopPopupsRef.current = showDesktopPopups;
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;
  const routerRef = useRef(router);
  routerRef.current = router;

  useNatsJsonSubscription<NatsNotificationPayload>(
    subject,
    useCallback(payload => {
      const rawId = payload.notificationId ?? payload.id;
      if (!rawId) return;
      const relayId = notificationGlobalId(rawId);
      const severity = parseSeverity(payload.severity);
      const title = payload.title ?? 'Notification';
      const description = payload.description ?? null;
      const createdAtSeconds = Date.now() / 1000;
      const category = payload.category ?? null;
      const isUpdate = payload.eventType === 'UPDATED';
      const suppress = isWatchingNotificationDialog(payload);
      const resolution = payload.context?.resolution ?? null;

      let resolutionAutoRead = false;
      commitLocalUpdate(environmentRef.current, store => {
        const existing = store.get(relayId);
        // An UPDATED event mutates a notification in place (e.g. an approval that was
        // resolved). If it isn't in the store there's nothing visible to update — don't
        // resurrect a card the user already dismissed or that scrolled out of the window.
        if (isUpdate && !existing) return;
        const node = existing ?? store.create(relayId, 'Notification');
        node.setValue(relayId, 'id');
        node.setValue(severity ?? 'INFO', 'severity');
        node.setValue(title, 'title');
        node.setValue(description, 'description');
        node.setValue(category, 'category');
        node.setLinkedRecord(writeNotificationContext(store, `${relayId}:context`, payload), 'context');

        if (isUpdate) {
          // A resolution means the approval was handled (this tab's chat card, another tab,
          // or another admin) — it needs no further attention, so retire it to the read
          // connection. Other in-place updates leave createdAt, read state and connection
          // membership untouched; the reactive tile reads the refreshed fields.
          if (resolution && node.getValue('read') === false) {
            makeMarkReadUpdater(relayId, [UNFILTERED_NOTIFICATION_PAIR])(store);
            resolutionAutoRead = true;
          }
          return;
        }

        node.setValue(createdAtSeconds, 'createdAt');
        node.setValue(false, 'read');

        if (suppress) {
          // Never enters the unread connection, so no popup and no drawer entry; lands
          // directly in the read connection. It was never counted, so skip the decrement.
          makeMarkReadUpdater(relayId, [UNFILTERED_NOTIFICATION_PAIR], { adjustCount: false })(store);
          return;
        }

        const conn = ConnectionHandler.getConnection(
          store.getRoot(),
          NOTIFICATIONS_CONNECTION_KEY,
          UNFILTERED_NOTIFICATION_PAIR.unread,
        );
        if (!conn) return;
        prependNotificationEdge(store, conn, node, relayId);
        // Bump the sidebar bucket in the same transaction as the drawer prepend.
        adjustUnreadCount(store, category, 1);
      });

      // In-place update: no popup and no desktop mirror. When a resolution auto-read the
      // notification, persist it server-side and refresh badges either way so they stay
      // truthful even if the mutation fails — same contract as the suppress path below.
      if (isUpdate) {
        if (resolutionAutoRead) {
          commitMutation<MarkReadMutationType>(environmentRef.current, {
            mutation: markNotificationReadMutation,
            variables: { id: relayId },
            onCompleted: () => refreshUnreadCounts(environmentRef.current),
            onError: () => refreshUnreadCounts(environmentRef.current),
          });
        }
        return;
      }

      if (suppress) {
        // Persist the auto-read server-side; refresh sidebar badges either way
        // so they stay truthful even if the mutation fails.
        commitMutation<MarkReadMutationType>(environmentRef.current, {
          mutation: markNotificationReadMutation,
          variables: { id: relayId },
          onCompleted: () => refreshUnreadCounts(environmentRef.current),
          onError: () => refreshUnreadCounts(environmentRef.current),
        });
        return;
      }

      if (showDesktopPopupsRef.current) {
        maybeShowDesktopNotification(
          payload,
          relayId,
          title,
          description,
          route => routerRef.current.push(route),
          id => markReadRef.current(id),
        );
      }

      // The bucket was already bumped locally (above) so the sidebar is instantly consistent
      // with the drawer; reconcile against the authoritative server counts (cross-tab/drift).
      refreshUnreadCounts(environmentRef.current);
    }, []),
  );

  return null;
}
