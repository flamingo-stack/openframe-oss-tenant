import type { TicketStatusDefinition } from '../statuses/types/ticket-statuses.types';
import type { Ticket, TicketStatusRef } from '../types/ticket.types';

// Legacy `status` enum → system status kind. Used to recover the current status
// of tickets that predate the lifecycle `statusId` (their statusDefinition is null).
// ON_HOLD has no lifecycle equivalent and is intentionally omitted.
const LEGACY_STATUS_TO_KIND: Record<string, string> = {
  ACTIVE: 'AI_ASSISTANCE',
  TECH_REQUIRED: 'TECH_REQUIRED',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED',
};

/**
 * A ticket's current status as a selectable status ref: prefers the lifecycle
 * `statusDefinition`, falling back to the system status matching the legacy
 * `status` enum (for tickets with no `statusId` yet). Returns undefined when it
 * can't be resolved (e.g. legacy ON_HOLD, or the snapshot hasn't loaded).
 */
export function resolveCurrentStatus(
  ticket: Ticket | undefined,
  snapshot: TicketStatusDefinition[] | undefined,
): TicketStatusRef | undefined {
  if (ticket?.statusDefinition) {
    const { id, name, color } = ticket.statusDefinition;
    return { id, name, color };
  }
  const kind = ticket?.status ? LEGACY_STATUS_TO_KIND[ticket.status] : undefined;
  const def = kind ? snapshot?.find(s => s.isSystem && s.kind === kind) : undefined;
  return def ? { id: def.id, name: def.name, color: def.color } : undefined;
}
