/** FaeSettings view-model mapped from the GraphQL schema; keep field names in sync with schema.graphql. */

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

/**
 * Fallback used when the backend has no FaeSettings record yet (query returns
 * null). The empty `id` signals "not persisted" — the first save creates it.
 */
export function getDefaultFaeSettings(organizationId: string | null = null): FaeSettings {
  return {
    id: '',
    organizationId,
    assistantName: 'Fae',
    assistantAvatar: null,
    llmProvider: 'ANTHROPIC',
    providerModel: 'Claude Sonnet 4',
    applicationTheme: 'DARK',
    accentColor: '#F357BB',
    answerStyle: 'STANDARD',
    customPrompt: null,
    quickActions: [],
    createdAt: '',
    updatedAt: null,
  };
}
