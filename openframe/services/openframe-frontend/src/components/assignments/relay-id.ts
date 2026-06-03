// TODO(backend): remove this entire module once ai-agent's Ticket type is Relay-compliant.
// ai-agent declares `Ticket implements Node & AssignableTarget` but `Ticket.id` returns
// the raw MongoDB ObjectId instead of a Relay global ID, while every other AssignableTarget
// (Organization, Machine, KnowledgeBaseItem from api-service-core) returns a proper global ID.
// The fix belongs in ai-agent's TicketDataFetcher: add a @DgsData(parentType="Ticket", field="id")
// resolver that returns RELAY.toGlobalId("Ticket", ticket.getId()), and decode raw IDs in
// every existing ticket-by-id input (ticket(id), assignTicket, unassignTicket, updateTicket).
// Until that lands, we normalize raw Ticket IDs to Relay globals on the way out so the
// assignment mutations don't reject them.

import type { AssignmentItemType, AssignmentTargetType } from './types';

const RELAY_TYPE_NAME: Record<AssignmentItemType | AssignmentTargetType, string> = {
  ORGANIZATION: 'Organization',
  DEVICE: 'Machine',
  TICKET: 'Ticket',
  KNOWLEDGE_ARTICLE: 'KnowledgeBaseItem',
};

const KNOWN_RELAY_TYPES: ReadonlySet<string> = new Set(Object.values(RELAY_TYPE_NAME));

function btoaUtf8(value: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(value);
  }
  return Buffer.from(value, 'utf8').toString('base64');
}

function atobUtf8(value: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(value);
    }
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function decodeGlobalId(value: string): { type: string; id: string } | null {
  const decoded = atobUtf8(value);
  if (decoded === null) return null;
  const colon = decoded.indexOf(':');
  if (colon < 0) return null;
  const type = decoded.slice(0, colon);
  if (!KNOWN_RELAY_TYPES.has(type)) return null;
  return { type, id: decoded.slice(colon + 1) };
}

function toGlobalId(type: AssignmentItemType | AssignmentTargetType, rawId: string): string {
  return btoaUtf8(`${RELAY_TYPE_NAME[type]}:${rawId}`);
}

// Returns a Relay global ID. If `value` already decodes to a known Relay-encoded ID,
// returns it unchanged; otherwise treats it as raw and encodes it.
export function ensureGlobalId(type: AssignmentItemType | AssignmentTargetType, value: string): string {
  return decodeGlobalId(value) ? value : toGlobalId(type, value);
}
