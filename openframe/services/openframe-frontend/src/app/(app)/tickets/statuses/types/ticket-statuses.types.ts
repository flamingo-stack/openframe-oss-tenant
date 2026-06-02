import {
  kindToCanonicalStatus,
  TICKET_STATUS_COLOR_PRESETS,
  type TicketStatus,
  type TicketStatusKind,
  usesCanonicalStatusStyle,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { HEX_PATTERN } from '@flamingo-stack/openframe-frontend-core/utils';
import { z } from 'zod';

// The canonical-status helpers and kind type live in the core lib; re-exported
// here so this module stays the single status import surface for the feature.
export { kindToCanonicalStatus, usesCanonicalStatusStyle };
export type { TicketStatusKind };

export interface TicketStatusDefinition {
  id: string;
  name: string;
  color: string;
  position: string;
  kind: TicketStatusKind;
  isSystem: boolean;
  systemKey?: string | null;
}

type SystemTagVariant = 'outline' | 'primary';

export interface SystemTicketStatus {
  id: string;
  statusKey: TicketStatus;
  name: string;
  color: string;
  position: string;
  kind: TicketStatusKind;
  tooltip: string;
  tagVariant: SystemTagVariant;
}

export interface CustomTicketStatus {
  kind: 'custom';
  // Backend id for persisted rows; a crypto.randomUUID() temp id for unsaved rows.
  // Membership in the server snapshot's id set distinguishes the two on save.
  id: string;
  name: string;
  color: string;
  preset?: string;
}

export interface TicketStatusesPayload {
  customStatuses: CustomTicketStatus[];
}

export const customTicketStatusSchema = z.object({
  kind: z.literal('custom'),
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Status name is required').max(50, 'Max 50 characters'),
  color: z.string().regex(HEX_PATTERN, 'Color must be a 6-digit hex'),
  preset: z.string().optional(),
});

export const ticketStatusesSchema = z.object({
  customStatuses: z.array(customTicketStatusSchema).min(1, 'At least one custom status must remain'),
});

export const SYSTEM_KIND_META: Record<
  Exclude<TicketStatusKind, 'CUSTOM'>,
  { tooltip: string; tagVariant: SystemTagVariant }
> = {
  AI_ASSISTANCE: {
    tooltip: 'System status for new tickets. The AI assistant manages the conversation here.',
    tagVariant: 'outline',
  },
  TECH_REQUIRED: {
    tooltip: 'System status. Auto-assigned when the AI assistant needs approval to run a command.',
    tagVariant: 'primary',
  },
  RESOLVED: {
    tooltip: 'System status. Marks tickets as completed and closes the conversation.',
    tagVariant: 'outline',
  },
  ARCHIVED: {
    tooltip: 'System status. Archived tickets are closed and hidden from the active board.',
    tagVariant: 'outline',
  },
};

export function derivePreset(color: string): string | undefined {
  const match = TICKET_STATUS_COLOR_PRESETS.find(p => p.color.toLowerCase() === color.toLowerCase());
  return match?.key;
}

export function mapDefinitionToCustom(def: TicketStatusDefinition): CustomTicketStatus {
  return { kind: 'custom', id: def.id, name: def.name, color: def.color, preset: derivePreset(def.color) };
}

export function mapDefinitionToSystem(def: TicketStatusDefinition): SystemTicketStatus {
  const kind = def.kind === 'CUSTOM' ? 'AI_ASSISTANCE' : def.kind;
  const meta = SYSTEM_KIND_META[kind];
  return {
    id: def.id,
    statusKey: kindToCanonicalStatus(kind) ?? 'ACTIVE',
    name: def.name,
    color: def.color,
    position: def.position,
    kind: def.kind,
    tooltip: meta.tooltip,
    tagVariant: meta.tagVariant,
  };
}
