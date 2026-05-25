import { HEX_PATTERN } from '@flamingo-stack/openframe-frontend-core/utils';
import { z } from 'zod';

export interface CustomTicketStatus {
  kind: 'custom';
  id: string;
  label: string;
  color: string;
  preset?: string;
}

export interface TicketStatusesPayload {
  customStatuses: CustomTicketStatus[];
}

export const customTicketStatusSchema = z.object({
  kind: z.literal('custom'),
  id: z.string().min(1),
  label: z.string().trim().min(1, 'Status name is required').max(50, 'Max 50 characters'),
  color: z.string().regex(HEX_PATTERN, 'Color must be a 6-digit hex'),
  preset: z.string().optional(),
});

export const ticketStatusesSchema = z.object({
  customStatuses: z.array(customTicketStatusSchema).min(1, 'At least one custom status must remain'),
});
