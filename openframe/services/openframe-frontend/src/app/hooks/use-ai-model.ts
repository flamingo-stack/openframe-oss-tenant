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

export function useAiModel() {
  const { data: aiModel = null } = useQuery({
    queryKey: ['ai-configuration-model'],
    queryFn: fetchAiConfiguration,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return aiModel;
}
