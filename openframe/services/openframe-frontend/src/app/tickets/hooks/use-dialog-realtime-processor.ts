'use client';

import { useCallback } from 'react';
import type { NatsMessageType } from '../constants';
import { getDialogService } from '../services';
import type { Message } from '../types/dialog.types';
import { useDialogVersion } from './use-dialog-version';

interface UseDialogRealtimeProcessorOptions {
  dialogId: string | null;
  onStreamStart: (isAdmin: boolean) => void;
  onStreamEnd: (isAdmin: boolean) => void;
  onMessageAdd: (message: Message, isAdmin: boolean) => void;
  onError: (error: string, isAdmin: boolean) => void;
}

export function useDialogRealtimeProcessor(options: UseDialogRealtimeProcessorOptions) {
  const { dialogId, onStreamStart, onStreamEnd, onMessageAdd, onError } = options;
  const version = useDialogVersion();
  const service = getDialogService(version);

  const processChunk = useCallback(
    (payload: unknown, messageType: NatsMessageType = 'message') => {
      if (!dialogId) return;

      const action = service.parseRealtimePayload(payload, messageType, dialogId);
      if (!action) return;

      switch (action.type) {
        case 'stream_start':
          onStreamStart(action.isAdmin);
          break;
        case 'stream_end':
          onStreamEnd(action.isAdmin);
          break;
        case 'error':
          onError(action.error, action.isAdmin);
          break;
        case 'message':
          onMessageAdd(action.message, action.isAdmin);
          break;
      }
    },
    [dialogId, onStreamStart, onStreamEnd, onMessageAdd, onError, service],
  );

  return {
    processChunk,
  };
}
