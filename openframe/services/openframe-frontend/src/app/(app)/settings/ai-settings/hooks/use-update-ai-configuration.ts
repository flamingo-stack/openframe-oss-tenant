'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AI_MODEL_QUERY_KEY } from '@/app/hooks/use-ai-model';
import { apiClient } from '@/lib/api-client';
import type { AIProvider } from '../types/ai-settings';

interface UpdateAiConfigurationInput {
  provider: AIProvider;
  modelName: string;
}

/**
 * Syncs the chat backend's active AI configuration with the provider/model
 * chosen in the AI config. Success feedback is owned by the settings save;
 * this only reports failures.
 */
export function useUpdateAiConfiguration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: UpdateAiConfigurationInput) => {
      const response = await apiClient.post('/chat/api/v1/ai-configuration', input);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update AI configuration');
      }
    },
    onSuccess: () => {
      // Refresh the cached active model so the Mingo composer's model row picks
      // up the new provider/model immediately, instead of only after the next
      // chat request refines it via streamed metadata.
      queryClient.invalidateQueries({ queryKey: AI_MODEL_QUERY_KEY });
    },
    onError: error => {
      toast({
        title: 'AI configuration not updated',
        description: error instanceof Error ? error.message : 'Failed to update AI configuration',
        variant: 'destructive',
      });
    },
  });

  return { updateAiConfiguration: mutation.mutate, isPending: mutation.isPending };
}
