'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AIProvider } from '../types/ai-settings';

interface ModelInfo {
  modelName: string;
  displayName: string;
}

interface SupportedModelsResponse {
  anthropic?: ModelInfo[];
  openai?: ModelInfo[];
  'google-gemini'?: ModelInfo[];
}

export interface ProviderModelOption {
  value: string;
  label: string;
}

export type SupportedModelsByProvider = Partial<Record<AIProvider, ProviderModelOption[]>>;

const RESPONSE_KEY_BY_PROVIDER: Record<AIProvider, keyof SupportedModelsResponse> = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  GOOGLE_GEMINI: 'google-gemini',
};

export const supportedModelsQueryKey = ['ai-configuration', 'supported-models'] as const;

/** Model options per provider from the chat backend's configuration. */
export function useSupportedModels() {
  const query = useQuery({
    queryKey: supportedModelsQueryKey,
    queryFn: async (): Promise<SupportedModelsByProvider> => {
      const response = await apiClient.get<SupportedModelsResponse>('/chat/api/v1/ai-configuration/supported-models');
      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to fetch supported models');
      }

      const byProvider: SupportedModelsByProvider = {};
      for (const provider of Object.keys(RESPONSE_KEY_BY_PROVIDER) as AIProvider[]) {
        const models = response.data[RESPONSE_KEY_BY_PROVIDER[provider]] ?? [];
        byProvider[provider] = models.map(model => ({ value: model.modelName, label: model.displayName }));
      }
      return byProvider;
    },
  });

  return { modelsByProvider: query.data, isLoading: query.isLoading, error: query.error };
}

/** Resolves a stored model name to its display name; falls back to the raw value. */
export function getProviderModelLabel(
  modelsByProvider: SupportedModelsByProvider | undefined,
  provider: AIProvider,
  modelName: string,
): string {
  return modelsByProvider?.[provider]?.find(model => model.value === modelName)?.label ?? modelName;
}
