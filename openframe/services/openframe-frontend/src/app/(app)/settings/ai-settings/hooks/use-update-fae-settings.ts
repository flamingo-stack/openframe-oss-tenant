'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { UPDATE_FAE_SETTINGS_MUTATION } from '../queries/fae-settings-queries';
import type { UpdateFaeSettingsInput } from '../types/fae-settings';
import { faeSettingsQueryKeys } from './use-fae-settings';

interface UpdateFaeSettingsResponse {
  data?: {
    updateFaeSettings: {
      faeSettings: { id: string } | null;
      userErrors: { message: string }[];
    };
  };
  errors?: { message: string }[];
}

export function useUpdateFaeSettings(organizationId: string | null = null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: UpdateFaeSettingsInput) => {
      const response = await apiClient.post<UpdateFaeSettingsResponse>('/chat/graphql', {
        query: UPDATE_FAE_SETTINGS_MUTATION,
        variables: { input },
      });

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to save AI settings');
      }
      if (response.data.errors?.length) {
        throw new Error(response.data.errors.map(e => e.message).join(', '));
      }

      const userErrors = response.data.data?.updateFaeSettings.userErrors ?? [];
      if (userErrors.length > 0) {
        throw new Error(userErrors.map(e => e.message).join(', '));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: faeSettingsQueryKeys.detail(organizationId) });
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

  const update = (input: UpdateFaeSettingsInput, onSuccess?: () => void) =>
    mutation.mutate(input, { onSuccess: () => onSuccess?.() });

  return { update, isPending: mutation.isPending };
}
