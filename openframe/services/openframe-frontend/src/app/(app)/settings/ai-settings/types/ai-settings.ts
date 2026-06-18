/** AiSettings view-model mapped from the GraphQL schema; keep field names in sync with ai-settings.graphqls. */

import type { AIProvider } from '@/generated/schema-enums';

export type { AIProvider };
export type ApplicationTheme = 'DARK' | 'LIGHT' | 'SYSTEM';
export type AnswerStyle = 'SHORT' | 'STANDARD' | 'DETAILED' | 'CUSTOM';

/**
 * Which AI agent a settings record applies to. Settings are scoped per agent on
 * the BE, so every query/mutation must carry an agentType.
 */
export type AgentType = 'CLIENT' | 'ADMIN';

export interface AiImage {
  id?: string;
  imageUrl: string;
  hash?: string;
}

export interface AiQuickAction {
  id: string;
  name: string;
  instructions: string;
}

export interface AiSettings {
  id: string;
  organizationId: string | null;
  agentType: AgentType;
  assistantName: string;
  assistantAvatar: AiImage | null;
  llmProvider: AIProvider;
  providerModel: string;
  applicationTheme: ApplicationTheme;
  accentColor: string;
  answerStyle: AnswerStyle | null;
  customPrompt: string | null;
  quickActions: AiQuickAction[];
  createdAt: string;
  updatedAt: string | null;
}

export interface UpdateAiSettingsInput {
  organizationId?: string | null;
  agentType: AgentType;
  assistantName?: string;
  llmProvider?: AIProvider;
  providerModel?: string;
  applicationTheme?: ApplicationTheme;
  accentColor?: string;
  answerStyle?: AnswerStyle;
  customPrompt?: string;
  quickActions?: AiQuickActionInput[];
}

/**
 * Form-level payload emitted by the settings tabs. `agentType` (and the tenant
 * vs. organization scope) are injected by the mutation hook, so the forms stay
 * agnostic of which agent they edit.
 */
export type AiSettingsFormInput = Omit<UpdateAiSettingsInput, 'agentType' | 'organizationId'>;

export interface AiQuickActionInput {
  id?: string;
  name: string;
  instructions: string;
}

/**
 * Fallback used when the backend has no AiSettings record yet for the given
 * agent (query returns null). The empty `id` signals "not persisted" — the
 * first save creates it.
 */
export function getDefaultAiSettings(agentType: AgentType, organizationId: string | null = null): AiSettings {
  return {
    id: '',
    organizationId,
    agentType,
    assistantName: 'AI',
    assistantAvatar: null,
    llmProvider: 'ANTHROPIC',
    providerModel: '',
    applicationTheme: 'DARK',
    accentColor: '#F357BB',
    answerStyle: 'STANDARD',
    customPrompt: null,
    quickActions: [],
    createdAt: '',
    updatedAt: null,
  };
}
