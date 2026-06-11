'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AIProvider } from '../types/fae-settings';

interface UpdateAiConfigurationInput {
  provider: AIProvider;
  modelName: string;
}

/**
 * Syncs the chat backend's active AI configuration with the provider/model
 * chosen in FaeSettings. Success feedback is owned by the FaeSettings save;
 * this only reports failures.
 */
export function useUpdateAiConfiguration() {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (input: UpdateAiConfigurationInput) => {
      const response = await apiClient.post('/chat/api/v1/ai-configuration', input);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update AI configuration');
      }
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
