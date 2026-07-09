import type { Notification, NotificationVariant } from '@flamingo-stack/openframe-frontend-core';
import { ConnectionHandler, type RecordSourceSelectorProxy } from 'relay-runtime';
import type { NotificationSeverity } from '@/__generated__/notificationsDrawerRelay_query.graphql';

export const NOTIFICATIONS_CONNECTION_KEY = 'NotificationsList_notifications';
const NOTIFICATION_EDGE_TYPENAME = 'NotificationEdge';

export interface NotificationsConnectionFilters {
  filter: { read: boolean };
  search: string | null;
}

export interface NotificationConnectionPair {
  unread: NotificationsConnectionFilters;
  read: NotificationsConnectionFilters;
}

export function notificationsConnectionFilters(read: boolean, search: string): NotificationsConnectionFilters {
  const trimmed = search.trim();
  return { filter: { read }, search: trimmed || null };
}

export const UNFILTERED_NOTIFICATION_PAIR: NotificationConnectionPair = {
  unread: notificationsConnectionFilters(false, ''),
  read: notificationsConnectionFilters(true, ''),
};

const UNREAD_COUNTS_FIELD = 'unreadCountsByCategory';
const UNREAD_CATEGORY_COUNT_TYPENAME = 'UnreadCategoryCount';

/**
 * Adjust the in-store per-category unread count (the `unreadCountsByCategory` root field that
 * drives the sidebar badges) so it stays in lockstep with the drawer connection in the same
 * local transaction — no refetch race. `category` is the backend `NotificationCategory` carried
 * on the node / NATS payload; the bucket it lands in is the same enum value the sidebar reads.
 * No-op when counts aren't loaded yet — the hydrator fetches authoritative values on mount.
 */
export function adjustUnreadCount(store: RecordSourceSelectorProxy, category: unknown, delta: number): void {
  if (typeof category !== 'string' || delta === 0) return;
  const buckets = store.getRoot().getLinkedRecords(UNREAD_COUNTS_FIELD);
  if (!buckets) return;
  const existing = buckets.find(bucket => bucket?.getValue('category') === category);
  if (existing) {
    const current = Number(existing.getValue('count')) || 0;
    existing.setValue(Math.max(0, current + delta), 'count');
    return;
  }
  if (delta < 0) return;
  const bucketId = `client:${UNREAD_CATEGORY_COUNT_TYPENAME}:${category}`;
  const bucket = store.get(bucketId) ?? store.create(bucketId, UNREAD_CATEGORY_COUNT_TYPENAME);
  bucket.setValue(category, 'category');
  bucket.setValue(delta, 'count');
  store.getRoot().setLinkedRecords([...buckets, bucket], UNREAD_COUNTS_FIELD);
}

/** Zero every per-category unread bucket — used when all notifications are marked read at once. */
export function clearUnreadCounts(store: RecordSourceSelectorProxy): void {
  const buckets = store.getRoot().getLinkedRecords(UNREAD_COUNTS_FIELD);
  if (!buckets) return;
  for (const bucket of buckets) bucket?.setValue(0, 'count');
}

export function makeMarkReadUpdater(
  id: string,
  pairs: NotificationConnectionPair[],
  options: { adjustCount?: boolean } = {},
) {
  return (store: RecordSourceSelectorProxy) => {
    const node = store.get(id);
    if (!node) return;
    // Decrement the category bucket only when the node was actually unread, and only when the
    // caller owns the count change (the NATS auto-read path lands straight in the read connection
    // without ever incrementing, so it must not decrement here).
    if (options.adjustCount !== false && node.getValue('read') === false) {
      adjustUnreadCount(store, node.getValue('category'), -1);
    }
    node.setValue(true, 'read');

    const root = store.getRoot();
    const seen = new Set<string>();
    for (const pair of pairs) {
      const unreadConn = ConnectionHandler.getConnection(root, NOTIFICATIONS_CONNECTION_KEY, pair.unread);
      if (unreadConn && !seen.has(unreadConn.getDataID())) {
        seen.add(unreadConn.getDataID());
        ConnectionHandler.deleteNode(unreadConn, id);
      }
      const readConn = ConnectionHandler.getConnection(root, NOTIFICATIONS_CONNECTION_KEY, pair.read);
      if (readConn && !seen.has(readConn.getDataID())) {
        seen.add(readConn.getDataID());
        const edge = ConnectionHandler.createEdge(store, readConn, node, NOTIFICATION_EDGE_TYPENAME);
        ConnectionHandler.insertEdgeBefore(readConn, edge);
      }
    }
  };
}

export function makeMarkAllReadUpdater(pairs: NotificationConnectionPair[]) {
  return (store: RecordSourceSelectorProxy) => {
    const root = store.getRoot();
    const seen = new Set<string>();

    for (const pair of pairs) {
      const unreadConn = ConnectionHandler.getConnection(root, NOTIFICATIONS_CONNECTION_KEY, pair.unread);
      if (!unreadConn) continue;
      const unreadId = unreadConn.getDataID();
      if (seen.has(unreadId)) continue;
      seen.add(unreadId);

      const readConn = ConnectionHandler.getConnection(root, NOTIFICATIONS_CONNECTION_KEY, pair.read);
      let readConnForInsert = readConn;
      if (readConn) {
        if (seen.has(readConn.getDataID())) {
          readConnForInsert = null;
        } else {
          seen.add(readConn.getDataID());
        }
      }

      const edges = unreadConn.getLinkedRecords('edges') ?? [];
      for (const edge of edges) {
        const node = edge.getLinkedRecord('node');
        if (!node) continue;
        node.setValue(true, 'read');
        if (readConnForInsert) {
          const movedEdge = ConnectionHandler.createEdge(store, readConnForInsert, node, NOTIFICATION_EDGE_TYPENAME);
          ConnectionHandler.insertEdgeBefore(readConnForInsert, movedEdge);
        }
      }
      unreadConn.setLinkedRecords([], 'edges');
      const pageInfo = unreadConn.getLinkedRecord('pageInfo');
      if (pageInfo) {
        pageInfo.setValue(false, 'hasNextPage');
        pageInfo.setValue(null, 'endCursor');
      }
    }
    // Backend marks every notification read (not just the loaded ones), so clear all buckets.
    clearUnreadCounts(store);
  };
}

export function makeDeleteAllReadUpdater(pairs: NotificationConnectionPair[]) {
  return (store: RecordSourceSelectorProxy) => {
    const root = store.getRoot();
    const seen = new Set<string>();
    for (const pair of pairs) {
      const readConn = ConnectionHandler.getConnection(root, NOTIFICATIONS_CONNECTION_KEY, pair.read);
      if (!readConn) continue;
      const connId = readConn.getDataID();
      if (seen.has(connId)) continue;
      seen.add(connId);

      readConn.setLinkedRecords([], 'edges');
      const pageInfo = readConn.getLinkedRecord('pageInfo');
      if (pageInfo) {
        pageInfo.setValue(false, 'hasNextPage');
        pageInfo.setValue(null, 'endCursor');
      }
    }
  };
}

export function makeDeleteNotificationUpdater(id: string, pairs: NotificationConnectionPair[]) {
  return (store: RecordSourceSelectorProxy) => {
    const node = store.get(id);
    // Deleting an unread notification frees its category bucket; capture both before removal.
    const wasUnread = node?.getValue('read') === false;
    const category = node?.getValue('category');
    const root = store.getRoot();
    const seen = new Set<string>();
    for (const pair of pairs) {
      for (const filters of [pair.unread, pair.read]) {
        const conn = ConnectionHandler.getConnection(root, NOTIFICATIONS_CONNECTION_KEY, filters);
        if (!conn) continue;
        const connId = conn.getDataID();
        if (seen.has(connId)) continue;
        seen.add(connId);
        ConnectionHandler.deleteNode(conn, id);
      }
    }
    if (wasUnread) adjustUnreadCount(store, category, -1);
  };
}

type KnownSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';

const KNOWN_SEVERITIES: ReadonlySet<string> = new Set<KnownSeverity>(['INFO', 'SUCCESS', 'WARNING', 'DANGER']);

function normalizeSeverity(value: NotificationSeverity | undefined): KnownSeverity | undefined {
  return value && KNOWN_SEVERITIES.has(value) ? (value as KnownSeverity) : undefined;
}

export function severityToVariant(severity: KnownSeverity | undefined): NotificationVariant {
  switch (severity) {
    case 'DANGER':
      return 'error';
    case 'WARNING':
      return 'warning';
    case 'SUCCESS':
      return 'success';
    case 'INFO':
      return 'info';
    default:
      return 'default';
  }
}

export function parseSeverity(
  input: NotificationSeverity | Lowercase<NotificationSeverity> | undefined,
): KnownSeverity | undefined {
  if (!input) return undefined;
  const upper = String(input).toUpperCase();
  return KNOWN_SEVERITIES.has(upper) ? (upper as KnownSeverity) : undefined;
}

/**
 * Human label for a `NotificationContext.type` discriminator: SNAKE_CASE → Title Case
 * (e.g. TICKET_STATUS_CHANGED → "Ticket Status Changed"). Data-driven so new backend
 * context types label themselves; the catch-all discriminators carry no meaning → undefined.
 */
export function contextTypeLabel(contextType: string | null | undefined): string | undefined {
  if (!contextType || contextType === 'UNKNOWN' || contextType === 'GENERIC') return undefined;
  return contextType
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const EPOCH_MS_THRESHOLD = 1e12;

function toEpochMs(value: number): number {
  return value < EPOCH_MS_THRESHOLD ? value * 1000 : value;
}

export function parseCreatedAt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return toEpochMs(value);
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return toEpochMs(asNumber);
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

interface ApprovalToolCallShape {
  readonly toolExecutionRequestId: string | null | undefined;
  readonly toolName: string;
  readonly toolTitle: string | null | undefined;
  readonly toolExplanation: string | null | undefined;
  readonly toolType: string | null | undefined;
  readonly requiresApproval: boolean;
  readonly approvalType: string | null | undefined;
  readonly toolCallArguments: unknown;
}

/**
 * Structural shape shared by the drawer and section fragments. Relay emits `context`
 * as a flat object keyed by `__typename` with all inline-fragment fields optional, so
 * both generated node types are assignable to this one mapper input.
 */
export interface NotificationNodeShape {
  readonly id: string;
  readonly severity: NotificationSeverity;
  readonly title: string;
  readonly description: string | null | undefined;
  readonly createdAt: unknown;
  readonly read: boolean;
  readonly category?: string | null;
  readonly context: {
    // biome-ignore lint/style/useNamingConvention: GraphQL __typename discriminator
    readonly __typename: string;
    readonly type: string;
    readonly approvalRequestId?: string;
    readonly approvalType?: string;
    readonly dialogId?: string;
    readonly ticketId?: string | null;
    readonly approvalTicketId?: string | null;
    readonly resolution?: string | null;
    readonly resolvedByName?: string | null;
    readonly toolCalls?: ReadonlyArray<ApprovalToolCallShape>;
  };
}

export function mapNotificationNode(node: NotificationNodeShape): Notification {
  const severity = normalizeSeverity(node.severity);
  const { context } = node;
  const meta: Record<string, unknown> = {
    contextType: context.type,
    contextTypename: context.__typename,
  };

  // Entity ids drive navigation/auto-read uniformly across context types (see
  // resolveNotificationAction); every context that carries one selects it in the query fragment.
  const ticketId = context.ticketId ?? context.approvalTicketId ?? undefined;
  if (context.dialogId) meta.dialogId = context.dialogId;
  if (ticketId) meta.ticketId = ticketId;

  if (context.__typename === 'AdminApprovalRequestContext' && context.approvalRequestId) {
    meta.approvalRequestId = context.approvalRequestId;
    meta.approvalType = context.approvalType ?? null;
    meta.resolution = context.resolution ?? null;
    meta.resolvedByName = context.resolvedByName ?? null;
    meta.toolCalls = (context.toolCalls ?? []).map(call => ({
      toolExecutionRequestId: call.toolExecutionRequestId,
      toolName: call.toolName,
      toolTitle: call.toolTitle,
      toolExplanation: call.toolExplanation,
      toolType: call.toolType,
      requiresApproval: call.requiresApproval,
      approvalType: call.approvalType,
      toolCallArguments: call.toolCallArguments,
    }));
  }

  return {
    id: node.id,
    type: contextTypeLabel(context.type),
    title: node.title,
    description: node.description ?? undefined,
    createdAt: parseCreatedAt(node.createdAt),
    read: node.read,
    severity,
    variant: severityToVariant(severity),
    category: node.category ?? undefined,
    meta,
  };
}
