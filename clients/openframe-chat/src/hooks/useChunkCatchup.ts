import {
  CHAT_TYPE,
  type ChatType,
  type ChunkData,
  type UseChunkCatchupOptions as CoreChunkCatchupOptions,
  type NatsMessageType,
  type UseChunkCatchupReturn,
  useChunkCatchup as useChunkCatchupCore,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useMemo } from 'react';
import { tokenService } from '../services/tokenService';

export type { ChunkData, NatsMessageType, UseChunkCatchupReturn };

interface UseChunkCatchupOptions {
  dialogId: string | null;
  onChunkReceived: (chunk: ChunkData, messageType: NatsMessageType) => void;
}

export function useChunkCatchup({ dialogId, onChunkReceived }: UseChunkCatchupOptions): UseChunkCatchupReturn {
  const fetchChunks = useCallback(
    async (dialogId: string, chatType: ChatType, fromSequenceId?: number | null): Promise<ChunkData[]> => {
      await tokenService.ensureTokenReady();
      const token = tokenService.getCurrentToken();
      const apiUrl = tokenService.getCurrentApiBaseUrl();

      if (!token || !apiUrl) {
        throw new Error('Token or API URL not available');
      }

      let url = `${apiUrl}/chat/api/v1/dialogs/${dialogId}/chunks?chatType=${chatType}`;
      if (fromSequenceId !== null && fromSequenceId !== undefined) {
        url += `&fromSequenceId=${fromSequenceId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${chatType} chunks:`, response.status);
        return [];
      }

      return (await response.json()) as ChunkData[];
    },
    [],
  );

  const options = useMemo<CoreChunkCatchupOptions>(
    () => ({
      dialogId,
      onChunkReceived,
      chatTypes: [CHAT_TYPE.CLIENT],
      fetchChunks,
    }),
    [dialogId, onChunkReceived, fetchChunks],
  );

  return useChunkCatchupCore(options);
}
