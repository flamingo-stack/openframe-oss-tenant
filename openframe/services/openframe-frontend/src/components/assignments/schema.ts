import { z } from 'zod';
import type { AssignmentsValue } from './types';

const assignmentRefSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const assignmentsSchema = z
  .object({
    ORGANIZATION: z.array(assignmentRefSchema).optional(),
    DEVICE: z.array(assignmentRefSchema).optional(),
    TICKET: z.array(assignmentRefSchema).optional(),
    KNOWLEDGE_ARTICLE: z.array(assignmentRefSchema).optional(),
  })
  .optional() satisfies z.ZodType<AssignmentsValue | undefined>;

export const ASSIGNMENTS_DEFAULT: AssignmentsValue = {};
