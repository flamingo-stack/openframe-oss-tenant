'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { EVENT_SUBTYPE, trackDashboardActivity } from '@/lib/analytics';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS, CHAT_TYPE, DIALOG_MODE } from '../constants';
import { ticketService } from '../services';
import type { Dialog } from '../types/dialog.types';
import { ticketsQueryKeys } from '../utils/query-keys';

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
  const queryClient = useQueryClient();

  const setMode = useCallback(
    (mode: string, newDialogId?: string) => {
      queryClient.setQueryData<Dialog | null>(ticketsQueryKeys.detail(ticketId), prev =>
        prev ? { ...prev, currentMode: mode, ...(newDialogId ? { dialogId: newDialogId } : {}) } : prev,
      );
    },
    [queryClient, ticketId],
  );

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
      trackDashboardActivity(EVENT_SUBTYPE.START_DIRECT_CHAT);
      setMode(DIALOG_MODE.DIRECT, data.id);
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
      trackDashboardActivity(EVENT_SUBTYPE.START_DIRECT_CHAT);
      setMode(DIALOG_MODE.DIRECT);
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
      const cached = queryClient.getQueryData<Dialog | null>(ticketsQueryKeys.detail(ticketId));
      const activeDialogId = dialogId || cached?.dialogId;
      if (!activeDialogId) {
        throw new Error('No active dialog');
      }

      await ticketService.sendMessage(activeDialogId, message.trim(), CHAT_TYPE.CLIENT);
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
