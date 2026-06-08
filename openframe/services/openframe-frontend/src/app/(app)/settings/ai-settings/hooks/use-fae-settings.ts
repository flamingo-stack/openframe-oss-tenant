'use client';

import { useQuery } from '@tanstack/react-query';
import type { AIProvider } from '@/generated/schema-enums';
import { apiClient } from '@/lib/api-client';
import { GET_FAE_SETTINGS_QUERY } from '../queries/fae-settings-queries';
import type { AnswerStyle, ApplicationTheme, FaeSettings } from '../types/fae-settings';

export const faeSettingsQueryKeys = {
  detail: (organizationId: string | null) => ['fae-settings', { organizationId }] as const,
};

interface FaeSettingsGql {
  id: string;
  organizationId: string | null;
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

function toFaeSettings(fae: FaeSettingsGql): FaeSettings {
  return {
    id: fae.id,
    organizationId: fae.organizationId ?? null,
    assistantName: fae.assistantName,
    assistantAvatar: fae.assistantAvatar
      ? { imageUrl: fae.assistantAvatar.imageUrl, hash: fae.assistantAvatar.hash ?? undefined }
      : null,
    llmProvider: fae.llmProvider,
    providerModel: fae.providerModel,
    applicationTheme: fae.applicationTheme,
    accentColor: fae.accentColor,
    answerStyle: fae.answerStyle ?? null,
    customPrompt: fae.customPrompt ?? null,
    quickActions: (fae.quickActions ?? []).map(q => ({ id: q.id, name: q.name, instructions: q.instructions })),
    createdAt: fae.createdAt,
    updatedAt: fae.updatedAt ?? null,
  };
}

/**
 * Loads FaeSettings from the AI agent GraphQL endpoint (/chat/graphql, the same
 * endpoint Mingo/tickets use). `settings` is null when no record exists yet.
 */
export function useFaeSettings(organizationId: string | null = null) {
  const query = useQuery({
    queryKey: faeSettingsQueryKeys.detail(organizationId),
    queryFn: async (): Promise<FaeSettings | null> => {
      const response = await apiClient.post<GraphqlResponse<{ faeSettings: FaeSettingsGql | null }>>('/chat/graphql', {
        query: GET_FAE_SETTINGS_QUERY,
        variables: { organizationId },
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to load AI settings');
      }
      if (response.data.errors?.length) {
        throw new Error(response.data.errors.map(e => e.message).join(', '));
      }

      const fae = response.data.data?.faeSettings;
      return fae ? toFaeSettings(fae) : null;
    },
  });

  return { settings: query.data ?? null, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}
