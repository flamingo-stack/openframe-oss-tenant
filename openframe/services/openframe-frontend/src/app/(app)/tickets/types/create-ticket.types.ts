import { z } from 'zod';
import { assignmentsSchema } from '@/components/assignments';

export const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().max(5000, 'Description must be at most 5000 characters'),
  // Autocomplete-backed fields: clearing the control emits null, so allow it (not just undefined).
  statusId: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  deviceId: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  labelIds: z.array(z.string()).max(20, 'Maximum 20 labels allowed'),
  // TODO: userId (reporter) — not yet supported by backend, will be added with Authentik integration
  userId: z.string().optional(),
  // TODO: type — not yet supported by backend
  type: z.string(),
  assignKnowledgeBase: z.boolean(),
  assignments: assignmentsSchema,
});

export type CreateTicketFormData = z.infer<typeof createTicketSchema>;
