'use client'

import { useMemo, useCallback } from 'react'
import {
  useChunkCatchup as useChunkCatchupCore,
  type ChunkData,
  type NatsMessageType,
  type UseChunkCatchupOptions as CoreChunkCatchupOptions,
  type UseChunkCatchupReturn,
  type ChatType,
  CHAT_TYPE,
} from '@flamingo-stack/openframe-frontend-core'
import { apiClient } from '@lib/api-client'

export type { ChunkData, NatsMessageType, UseChunkCatchupReturn }

interface UseMingoChunkCatchupOptions {
  dialogId: string | null
  onChunkReceived: (chunk: ChunkData, messageType: NatsMessageType) => void
}

export function useMingoChunkCatchup({ dialogId, onChunkReceived }: UseMingoChunkCatchupOptions): UseChunkCatchupReturn {
  const fetchChunks = useCallback(async (
    dialogId: string,
    chatType: ChatType,
    fromSequenceId?: number | null
  ): Promise<ChunkData[]> => {
    try {
      let url = `/chat/api/v1/dialogs/${dialogId}/chunks?chatType=${chatType}`
      if (fromSequenceId !== null && fromSequenceId !== undefined) {
        url += `&fromSequenceId=${fromSequenceId}`
      }
      
      const response = await apiClient.get<ChunkData[]>(url)
      
      if (!response.ok) {
        console.error(`Failed to fetch ${chatType} chunks:`, response.error)
        return []
      }
      
      return response.data || []
    } catch (error) {
      console.error(`Error fetching ${chatType} chunks:`, error)
      return []
    }
  }, [])

  const options = useMemo<CoreChunkCatchupOptions>(() => ({
    dialogId,
    onChunkReceived,
    chatTypes: [CHAT_TYPE.ADMIN],
    fetchChunks,
  }), [dialogId, onChunkReceived, fetchChunks])

  return useChunkCatchupCore(options)
}