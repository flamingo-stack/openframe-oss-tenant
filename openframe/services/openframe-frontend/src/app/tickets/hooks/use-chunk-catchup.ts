'use client';

import {
  CHAT_TYPE,
  type ChunkData,
  type UseChunkCatchupOptions as CoreChunkCatchupOptions,
  type NatsMessageType,
  type UseChunkCatchupReturn,
  useChunkCatchup as useChunkCatchupCore,
} from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';

export type { ChunkData, NatsMessageType, UseChunkCatchupReturn };

interface UseChunkCatchupOptions {
  dialogId: string | null;
  onChunkReceived: (chunk: ChunkData, messageType: NatsMessageType) => void;
}

export function useChunkCatchup({ dialogId, onChunkReceived }: UseChunkCatchupOptions): UseChunkCatchupReturn {
  const fetchChunks = useCallback(
    async (
      dialogId: string,
      chatType: (typeof CHAT_TYPE)[keyof typeof CHAT_TYPE],
      fromSequenceId?: number | null,
    ): Promise<ChunkData[]> => {
      let url = `${API_ENDPOINTS.DIALOG_CHUNKS}/${dialogId}/chunks?chatType=${chatType}`;
      if (fromSequenceId !== null && fromSequenceId !== undefined) {
        url += `&fromSequenceId=${fromSequenceId}`;
      }

      const response = await apiClient.get<ChunkData[]>(url);

      if (!response.ok) {
        console.error(`Failed to fetch ${chatType} chunks:`, response.status);
        return [];
      }

      return response.data || [];
    },
    [],
  );

  const options = useMemo<CoreChunkCatchupOptions>(
    () => ({
      dialogId,
      onChunkReceived,
      chatTypes: [CHAT_TYPE.CLIENT, CHAT_TYPE.ADMIN],
      fetchChunks,
    }),
    [dialogId, onChunkReceived, fetchChunks],
  );

  return useChunkCatchupCore(options);
}
