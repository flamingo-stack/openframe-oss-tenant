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
import { ticketService } from '../services';

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
      return ticketService.fetchChunks(dialogId, chatType, fromSequenceId);
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
