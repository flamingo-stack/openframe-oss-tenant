'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { UPDATE_AI_SETTINGS_MUTATION } from '../queries/ai-settings-queries';
import type { AgentType, AiSettingsFormInput } from '../types/ai-settings';
import { aiSettingsQueryKeys } from './use-ai-settings';

interface UpdateAiSettingsResponse {
  data?: {
    updateAiSettings: {
      aiSettings: { id: string } | null;
      userErrors: { message: string }[];
    };
  };
  errors?: { message: string }[];
}

export function useUpdateAiSettings(agentType: AgentType, organizationId: string | null = null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: AiSettingsFormInput) => {
      // The agent scope (and tenant vs. organization) is owned here, not by the
      // forms, so every save targets the agent currently being edited.
      const input = { ...values, agentType, organizationId };
      const response = await apiClient.post<UpdateAiSettingsResponse>('/chat/graphql', {
        query: UPDATE_AI_SETTINGS_MUTATION,
        variables: { input },
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to save AI settings');
      }
      if (response.data.errors?.length) {
        throw new Error(response.data.errors.map(e => e.message).join(', '));
      }

      const userErrors = response.data.data?.updateAiSettings.userErrors ?? [];
      if (userErrors.length > 0) {
        throw new Error(userErrors.map(e => e.message).join(', '));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiSettingsQueryKeys.detail(organizationId, agentType) });
      toast({ title: 'Saved', description: 'AI assistant settings updated', variant: 'success' });
    },
    onError: error => {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    },
  });

  const update = (input: AiSettingsFormInput, onSuccess?: () => void) =>
    mutation.mutate(input, { onSuccess: () => onSuccess?.() });

  return { update, isPending: mutation.isPending };
}
