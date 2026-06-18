'use client';

import { useQuery } from '@tanstack/react-query';
import type { AIProvider } from '@/generated/schema-enums';
import { apiClient } from '@/lib/api-client';
import { GET_AI_SETTINGS_QUERY } from '../queries/ai-settings-queries';
import type { AgentType, AiSettings, AnswerStyle, ApplicationTheme } from '../types/ai-settings';

export const aiSettingsQueryKeys = {
  detail: (organizationId: string | null, agentType: AgentType) =>
    ['ai-settings', { organizationId, agentType }] as const,
};

interface AiSettingsGql {
  id: string;
  organizationId: string | null;
  agentType: AgentType;
  assistantName: string;
  assistantAvatar: { imageUrl: string; hash: string | null } | null;
  llmProvider: AIProvider;
  providerModel: string;
  applicationTheme: ApplicationTheme;
  accentColor: string;
  answerStyle: AnswerStyle | null;
  customPrompt: string | null;
  quickActions: { id: string; name: string; instructions: string }[] | null;
  createdAt: string;
  updatedAt: string | null;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

function toAiSettings(ai: AiSettingsGql): AiSettings {
  return {
    id: ai.id,
    organizationId: ai.organizationId ?? null,
    agentType: ai.agentType,
    assistantName: ai.assistantName,
    assistantAvatar: ai.assistantAvatar
      ? { imageUrl: ai.assistantAvatar.imageUrl, hash: ai.assistantAvatar.hash ?? undefined }
      : null,
    llmProvider: ai.llmProvider,
    providerModel: ai.providerModel,
    applicationTheme: ai.applicationTheme,
    accentColor: ai.accentColor,
    answerStyle: ai.answerStyle ?? null,
    customPrompt: ai.customPrompt ?? null,
    quickActions: (ai.quickActions ?? []).map(q => ({ id: q.id, name: q.name, instructions: q.instructions })),
    createdAt: ai.createdAt,
    updatedAt: ai.updatedAt ?? null,
  };
}

/**
 * Loads the AiSettings for a given agent from the AI agent GraphQL endpoint
 * (/chat/graphql, the same endpoint Mingo/tickets use). `settings` is null when
 * no record exists yet for that agent.
 */
export function useAiSettings(agentType: AgentType, organizationId: string | null = null) {
  const query = useQuery({
    queryKey: aiSettingsQueryKeys.detail(organizationId, agentType),
    queryFn: async (): Promise<AiSettings | null> => {
      const response = await apiClient.post<GraphqlResponse<{ aiSettings: AiSettingsGql | null }>>('/chat/graphql', {
        query: GET_AI_SETTINGS_QUERY,
        variables: { organizationId, agentType },
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to load AI settings');
      }
      if (response.data.errors?.length) {
        throw new Error(response.data.errors.map(e => e.message).join(', '));
      }

      const ai = response.data.data?.aiSettings;
      return ai ? toAiSettings(ai) : null;
    },
  });

  return { settings: query.data ?? null, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}
