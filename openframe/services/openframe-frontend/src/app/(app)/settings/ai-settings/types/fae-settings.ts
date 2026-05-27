/**
 * Type contract for the FaeSettings GraphQL schema.
 *
 * Backend dev Aliaska Varieva shared this spec; once the schema lands we'll
 * wire `faeSettings` / `updateFaeSettings` through useQuery / useMutation.
 * Field names must match the GraphQL types exactly so the integration is a
 * mock-to-network swap.
 */

import type { AIProvider } from '@/generated/schema-enums';

export type { AIProvider };
export type ApplicationTheme = 'DARK' | 'LIGHT' | 'SYSTEM';
export type AnswerStyle = 'SHORT' | 'STANDARD' | 'DETAILED' | 'CUSTOM';

export interface FaeImage {
  id?: string;
  imageUrl: string;
  hash?: string;
}

export interface FaeQuickAction {
  id: string;
  name: string;
  instructions: string;
}

export interface FaeSettings {
  id: string;
  organizationId: string | null;
  assistantName: string;
  assistantAvatar: FaeImage | null;
  llmProvider: AIProvider;
  providerModel: string;
  applicationTheme: ApplicationTheme;
  accentColor: string;
  answerStyle: AnswerStyle | null;
  customPrompt: string | null;
  quickActions: FaeQuickAction[];
  createdAt: string;
  updatedAt: string | null;
}

export interface UpdateFaeSettingsInput {
  organizationId?: string | null;
  assistantName?: string;
  llmProvider?: AIProvider;
  providerModel?: string;
  applicationTheme?: ApplicationTheme;
  accentColor?: string;
  answerStyle?: AnswerStyle;
  customPrompt?: string;
  quickActions?: FaeQuickActionInput[];
}

export interface FaeQuickActionInput {
  id?: string;
  name: string;
  instructions: string;
}
