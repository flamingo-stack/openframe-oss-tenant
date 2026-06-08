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

export function makeMarkReadUpdater(id: string, pairs: NotificationConnectionPair[]) {
  return (store: RecordSourceSelectorProxy) => {
    const node = store.get(id);
    if (!node) return;
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
  };
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

export function parseSeverity(
  input: NotificationSeverity | Lowercase<NotificationSeverity> | undefined,
): KnownSeverity | undefined {
  if (!input) return undefined;
  const upper = String(input).toUpperCase();
  if (upper === 'INFO' || upper === 'WARNING' || upper === 'DANGER') return upper as KnownSeverity;
  return undefined;
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
  readonly context: {
    // biome-ignore lint/style/useNamingConvention: GraphQL __typename discriminator
    readonly __typename: string;
    readonly type: string;
    readonly approvalRequestId?: string;
    readonly approvalType?: string;
    readonly dialogId?: string;
    readonly ticketId?: string | null;
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
  let category: string | undefined;

  if (context.__typename === 'AdminAiMessageContext' && context.dialogId) {
    category = 'mingo';
    meta.dialogId = context.dialogId;
  } else if (context.__typename === 'AdminApprovalRequestContext' && context.approvalRequestId) {
    category = 'approval';
    meta.approvalRequestId = context.approvalRequestId;
    meta.dialogId = context.dialogId;
    meta.ticketId = context.ticketId ?? null;
    meta.approvalType = context.approvalType ?? null;
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
    title: node.title,
    description: node.description ?? undefined,
    createdAt: parseCreatedAt(node.createdAt),
    read: node.read,
    severity,
    variant: severityToVariant(severity),
    category,
    meta,
  };
}
