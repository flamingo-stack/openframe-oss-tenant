'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS, CHAT_TYPE, DIALOG_MODE } from '../constants';
import { getDialogService } from '../services';
import { useDialogDetailsStore } from '../stores/dialog-details-store';

interface CreateDialogResponse {
  id: string;
  currentMode: string;
  status: string;
}

interface SwitchModeResponse {
  id: string;
  currentMode: string;
}

interface UseDirectChatOptions {
  ticketId: string;
  dialogId: string | undefined;
  currentMode: string | undefined;
  onDialogCreated?: () => void;
}

export function useDirectChat({ ticketId, dialogId, currentMode, onDialogCreated }: UseDirectChatOptions) {
  const { toast } = useToast();
  const updateDialogMode = useDialogDetailsStore(state => state.updateDialogMode);

  const isDirectMode = currentMode === DIALOG_MODE.DIRECT;

  const createDialogMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<CreateDialogResponse>(API_ENDPOINTS.DIALOGS, {
        agentType: 'CLIENT',
        mode: DIALOG_MODE.DIRECT,
        ticketId,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create direct chat');
      }

      if (!response.data?.id) {
        throw new Error('Invalid response: dialog id not found');
      }

      return response.data;
    },
    onSuccess: data => {
      updateDialogMode(DIALOG_MODE.DIRECT, data.id);
      onDialogCreated?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Direct Chat Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const switchModeMutation = useMutation({
    mutationFn: async (targetDialogId: string) => {
      const response = await apiClient.patch<SwitchModeResponse>(`${API_ENDPOINTS.DIALOGS}/${targetDialogId}/mode`, {
        mode: DIALOG_MODE.DIRECT,
        chatType: CHAT_TYPE.CLIENT,
      });

      if (!response.ok) {
        throw new Error(response.error || 'Failed to switch to direct chat');
      }

      return response.data;
    },
    onSuccess: () => {
      updateDialogMode(DIALOG_MODE.DIRECT);
    },
    onError: (error: Error) => {
      toast({
        title: 'Direct Chat Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const sendClientMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const activeDialogId = dialogId || useDialogDetailsStore.getState().currentDialog?.dialogId;
      if (!activeDialogId) {
        throw new Error('No active dialog');
      }

      const service = getDialogService('v2');
      await service.sendMessage(activeDialogId, message.trim(), CHAT_TYPE.CLIENT);
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

  const startDirectChat = useCallback(() => {
    if (createDialogMutation.isPending || switchModeMutation.isPending) return;

    if (!dialogId) {
      createDialogMutation.mutate();
    } else {
      switchModeMutation.mutate(dialogId);
    }
  }, [dialogId, createDialogMutation, switchModeMutation]);

  const sendClientMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || sendClientMessageMutation.isPending) return;
      sendClientMessageMutation.mutate(trimmed);
    },
    [sendClientMessageMutation],
  );

  return {
    isDirectMode,
    isStartingDirectChat: createDialogMutation.isPending || switchModeMutation.isPending,
    isSendingClientMessage: sendClientMessageMutation.isPending,
    startDirectChat,
    sendClientMessage,
  };
}
