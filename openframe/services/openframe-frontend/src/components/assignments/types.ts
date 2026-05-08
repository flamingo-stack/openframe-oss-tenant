export type AssignmentTargetType = 'ORGANIZATION' | 'DEVICE' | 'TICKET' | 'KNOWLEDGE_ARTICLE';

export type AssignmentItemType = 'TICKET' | 'KNOWLEDGE_ARTICLE';

export interface AssignmentRef {
  id: string;
  label: string;
}

export type AssignmentsValue = Partial<Record<AssignmentTargetType, AssignmentRef[]>>;

export const ASSIGNMENT_TARGET_TYPES: ReadonlyArray<AssignmentTargetType> = [
  'ORGANIZATION',
  'DEVICE',
  'TICKET',
  'KNOWLEDGE_ARTICLE',
];
