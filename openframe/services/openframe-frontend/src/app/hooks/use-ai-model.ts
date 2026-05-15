'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface AiConfiguration {
  id: string;
  provider: string;
  displayName: string;
  modelName: string;
  isActive: boolean;
}

export interface AiModel {
  provider: string;
  displayName: string;
}

async function fetchAiConfiguration(): Promise<AiModel | null> {
  const response = await apiClient.get<AiConfiguration>('/chat/api/v1/ai-configuration');
  if (!response.ok || !response.data) return null;
  return { provider: response.data.provider, displayName: response.data.displayName };
}

const AI_MODEL_QUERY_OPTIONS = {
  queryKey: ['ai-configuration-model'],
  queryFn: fetchAiConfiguration,
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;

export function useAiModel() {
  const { data: aiModel = null } = useQuery(AI_MODEL_QUERY_OPTIONS);

  return aiModel;
}

/**
 * Same query as {@link useAiModel} (shared cache key — no extra request) but
 * also exposes `isLoading`, so consumers can render a size-matched skeleton
 * while the model config is still in flight instead of shifting the layout
 * when it pops in.
 */
export function useAiModelStatus() {
  const { data: aiModel = null, isLoading } = useQuery(AI_MODEL_QUERY_OPTIONS);

  return { aiModel, isLoading };
}
