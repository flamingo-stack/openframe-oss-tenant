'use client';

import type { Message as ChatMessage } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores';
import { API_ENDPOINTS, CHAT_TYPE, DIALOG_MODE } from '../constants';
import { getDialogService } from '../services';
import { useDialogDetailsStore } from '../stores/dialog-details-store';
import type { DialogVersion } from './use-dialog-version';

interface UseSendAdminMessageOptions {
  ticketId: string;
  messageDialogId: string | null;
  version: DialogVersion;
  onBeforeDialogCreated?: () => void;
}

export function useSendAdminMessage({
  ticketId,
  messageDialogId,
  version,
  onBeforeDialogCreated,
}: UseSendAdminMessageOptions) {
  const { toast } = useToast();
  const service = getDialogService(version);
  const currentUser = useAuthStore(state => state.user);
  const fetchDialog = useDialogDetailsStore(state => state.fetchDialog);
  const addMessage = useDialogDetailsStore(state => state.addMessage);

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage) return;

      let activeDialogId = messageDialogId;

      if (!activeDialogId) {
        const response = await apiClient.post<{ id: string }>(API_ENDPOINTS.DIALOGS, {
          ticketId,
          mode: DIALOG_MODE.AI,
          agentType: 'CLIENT',
        });

        if (!response.ok || !response.data?.id) {
          throw new Error(response.error || 'Failed to create dialog');
        }

        activeDialogId = response.data.id;

        onBeforeDialogCreated?.();

        await fetchDialog(ticketId, version);
      }

      const displayName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'Admin';
      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: 'user',
        content: trimmedMessage,
        name: displayName,
        authorType: 'admin',
        timestamp: new Date(),
      };
      addMessage('admin', optimistic);

      await service.sendMessage(activeDialogId, trimmedMessage, CHAT_TYPE.ADMIN);
    },
    onError: (error: Error) => {
      toast({
        title: 'Send Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const sendAdminMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || mutation.isPending) return;
      mutation.mutate(trimmed);
    },
    [mutation],
  );

  return {
    sendAdminMessage,
    isSendingAdminMessage: mutation.isPending,
  };
}
