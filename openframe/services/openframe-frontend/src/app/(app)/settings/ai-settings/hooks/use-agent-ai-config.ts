'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AIProvider } from '@/generated/schema-enums';
import { apiClient } from '@/lib/api-client';
import {
  GET_ADMIN_AI_CONFIG_QUERY,
  GET_CLIENT_AI_CONFIG_QUERY,
  UPDATE_ADMIN_AI_CONFIG_MUTATION,
  UPDATE_CLIENT_AI_CONFIG_MUTATION,
} from '../queries/ai-settings-queries';
import type { AgentAiConfig, AgentAiConfigInput, AgentType, AnswerStyle } from '../types/ai-settings';

export const agentAiConfigQueryKeys = {
  detail: (agentType: AgentType) => ['agent-ai-config', agentType] as const,
};

interface AgentAiConfigGql {
  id: string;
  agentType: AgentType;
  llmProvider: AIProvider;
  providerModel: string;
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

function toAgentAiConfig(raw: AgentAiConfigGql): AgentAiConfig {
  return {
    id: raw.id,
    agentType: raw.agentType,
    llmProvider: raw.llmProvider,
    providerModel: raw.providerModel,
    answerStyle: raw.answerStyle ?? null,
    customPrompt: raw.customPrompt ?? null,
    quickActions: (raw.quickActions ?? []).map(q => ({ id: q.id, name: q.name, instructions: q.instructions })),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? null,
  };
}

async function fetchAiConfig(query: string, responseKey: string): Promise<AgentAiConfig | null> {
  const response = await apiClient.post<GraphqlResponse<Record<string, AgentAiConfigGql | null>>>('/chat/graphql', {
    query,
  });

  if (!response.ok || !response.data) {
    throw new Error(response.error || 'Failed to load AI config');
  }
  if (response.data.errors?.length) {
    throw new Error(response.data.errors.map(e => e.message).join(', '));
  }

  const raw = response.data.data?.[responseKey];
  return raw ? toAgentAiConfig(raw) : null;
}

interface UseAiConfigOptions {
  enabled?: boolean;
}

function useAiConfigQuery(
  agentType: AgentType,
  query: string,
  responseKey: string,
  { enabled = true }: UseAiConfigOptions,
) {
  const result = useQuery({
    queryKey: agentAiConfigQueryKeys.detail(agentType),
    queryFn: () => fetchAiConfig(query, responseKey),
    enabled,
  });

  return {
    config: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

/** CLIENT (Fae) AI logic config, tenant-wide. `config` is null when not yet configured. */
export function useClientAiConfig(options: UseAiConfigOptions = {}) {
  return useAiConfigQuery('CLIENT', GET_CLIENT_AI_CONFIG_QUERY, 'clientAiConfig', options);
}

/** ADMIN (Mingo) AI logic config, tenant-wide. `config` is null when not yet configured. */
export function useAdminAiConfig(options: UseAiConfigOptions = {}) {
  return useAiConfigQuery('ADMIN', GET_ADMIN_AI_CONFIG_QUERY, 'adminAiConfig', options);
}

async function postUpdateAiConfig(mutation: string, responseKey: string, input: AgentAiConfigInput): Promise<void> {
  const response = await apiClient.post<GraphqlResponse<Record<string, { userErrors: { message: string }[] }>>>(
    '/chat/graphql',
    { query: mutation, variables: { input } },
  );

  if (!response.ok || !response.data) {
    throw new Error(response.error || 'Failed to save AI config');
  }
  if (response.data.errors?.length) {
    throw new Error(response.data.errors.map(e => e.message).join(', '));
  }

  const userErrors = response.data.data?.[responseKey]?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map(e => e.message).join(', '));
  }
}

/**
 * Mutation hooks return `mutateAsync` so the CLIENT screen can save the AI
 * config and the client view together and surface a single combined toast.
 * Feedback (toasts) is owned by the caller, not these hooks.
 */
function useUpdateAiConfig(agentType: AgentType, mutation: string, responseKey: string) {
  const queryClient = useQueryClient();

  const result = useMutation({
    mutationFn: (input: AgentAiConfigInput) => postUpdateAiConfig(mutation, responseKey, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentAiConfigQueryKeys.detail(agentType) });
    },
  });

  return { update: result.mutateAsync, isPending: result.isPending };
}

export function useUpdateClientAiConfig() {
  return useUpdateAiConfig('CLIENT', UPDATE_CLIENT_AI_CONFIG_MUTATION, 'updateClientAiConfig');
}

export function useUpdateAdminAiConfig() {
  return useUpdateAiConfig('ADMIN', UPDATE_ADMIN_AI_CONFIG_MUTATION, 'updateAdminAiConfig');
}
