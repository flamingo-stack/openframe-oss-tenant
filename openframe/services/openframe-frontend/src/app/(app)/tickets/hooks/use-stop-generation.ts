'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS, CHAT_TYPE } from '../constants';
import { useDialogDetailsStore } from '../stores/dialog-details-store';

export function useStopGeneration(messageDialogId: string | null) {
  const { toast } = useToast();
  const setTypingIndicator = useDialogDetailsStore(state => state.setTypingIndicator);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!messageDialogId) {
        throw new Error('No active dialog to stop');
      }
      const response = await apiClient.post(`${API_ENDPOINTS.DIALOGS}/${messageDialogId}/stop`, {
        chatType: CHAT_TYPE.ADMIN,
      });
      if (!response.ok) {
        throw new Error(response.error || 'Unable to stop generation');
      }
    },
    onSuccess: () => {
      setTypingIndicator('admin', false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Stop Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const stopGeneration = useCallback(() => {
    if (mutation.isPending) return;
    mutation.mutate();
  }, [mutation]);

  return {
    stopGeneration,
    isStopping: mutation.isPending,
  };
}
