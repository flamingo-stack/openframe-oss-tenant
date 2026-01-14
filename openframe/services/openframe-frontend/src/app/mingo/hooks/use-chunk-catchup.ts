'use client'

import { useCallback, useRef, useEffect } from 'react'
import { apiClient } from '@lib/api-client'
import { MESSAGE_TYPE, CHAT_TYPE, API_ENDPOINTS } from '../constants'

interface ChunkData {
  sequenceId?: number
  type: string
  text?: string
  [key: string]: any
}

interface BufferedChunk {
  chunk: ChunkData
  messageType: 'message' | 'admin-message'
}

interface UseChunkCatchupOptions {
  dialogId: string | null
  onChunkReceived: (chunk: ChunkData, messageType: 'message' | 'admin-message') => void
}

export function useChunkCatchup({ dialogId, onChunkReceived }: UseChunkCatchupOptions) {
  const processedSequenceIds = useRef<Set<number>>(new Set())
  const lastSequenceId = useRef<number | null>(null)
  
  const fetchingInProgress = useRef(false)
  const lastFetchParams = useRef<{ dialogId: string; fromSequenceId?: number | null } | null>(null)
  
  // Buffer for NATS chunks that arrive during catchup
  const chunkBuffer = useRef<BufferedChunk[]>([])
  const isBuffering = useRef(false)
  
  const onChunkReceivedRef = useRef(onChunkReceived)
  useEffect(() => {
    onChunkReceivedRef.current = onChunkReceived
  }, [onChunkReceived])
  
  const processChunk = useCallback((
    chunk: ChunkData,
    messageType: 'message' | 'admin-message',
    forceProcess: boolean = false
  ): boolean => {
    if (isBuffering.current && !forceProcess) {
      chunkBuffer.current.push({ chunk, messageType })
      return true
    }
    
    if (chunk.sequenceId !== undefined && chunk.sequenceId !== null) {
      if (processedSequenceIds.current.has(chunk.sequenceId)) {
        return false
      }
      
      processedSequenceIds.current.add(chunk.sequenceId)
      lastSequenceId.current = chunk.sequenceId
    }
    
    onChunkReceivedRef.current(chunk, messageType)
    return true
  }, [])
  
  const catchUpChunks = useCallback(async (fromSequenceId?: number | null) => {
    if (!dialogId) {
      return
    }
    
    if (fetchingInProgress.current) {
      return
    }
    
    if (lastFetchParams.current &&
        lastFetchParams.current.dialogId === dialogId &&
        lastFetchParams.current.fromSequenceId === fromSequenceId) {
      return
    }
    
    fetchingInProgress.current = true
    lastFetchParams.current = { dialogId, fromSequenceId }
    
    isBuffering.current = true
    chunkBuffer.current = []
    
    try {
      const fetchChunksForChatType = async (chatType: typeof CHAT_TYPE[keyof typeof CHAT_TYPE]) => {
        let url = `${API_ENDPOINTS.DIALOG_CHUNKS}/${dialogId}/chunks?chatType=${chatType}`
        if (fromSequenceId !== null && fromSequenceId !== undefined) {
          url += `&fromSequenceId=${fromSequenceId}`
        }
        
        const response = await apiClient.get<ChunkData[]>(url)
        
        if (!response.ok) {
          return []
        }
        
        return response.data || []
      }
      
      const [clientChunks, adminChunks] = await Promise.all([
        fetchChunksForChatType(CHAT_TYPE.CLIENT),
        fetchChunksForChatType(CHAT_TYPE.ADMIN)
      ])
      
      const allCatchupChunks: BufferedChunk[] = []
      
      clientChunks.forEach(chunk => {
        allCatchupChunks.push({ chunk, messageType: 'message' })
      })
      
      adminChunks.forEach(chunk => {
        allCatchupChunks.push({ chunk, messageType: 'admin-message' })
      })
      
      isBuffering.current = false
      const bufferedNatsChunks = [...chunkBuffer.current]
      chunkBuffer.current = []
      
      const allChunks = [...allCatchupChunks, ...bufferedNatsChunks]
      
      allChunks.sort((a, b) => {
        const seqA = a.chunk.sequenceId ?? 0
        const seqB = b.chunk.sequenceId ?? 0
        return seqA - seqB
      })
      
      let lastMessageStartSeqId: number | null = null
      let lastMessageEndSeqId: number | null = null
      
      for (let i = allChunks.length - 1; i >= 0; i--) {
        if (allChunks[i].chunk.type === MESSAGE_TYPE.MESSAGE_END && allChunks[i].chunk.sequenceId) {
          lastMessageEndSeqId = allChunks[i].chunk.sequenceId!
          break
        }
      }
      
      for (let i = allChunks.length - 1; i >= 0; i--) {
        const chunk = allChunks[i].chunk
        if (chunk.type === MESSAGE_TYPE.MESSAGE_START && chunk.sequenceId) {
          if (lastMessageEndSeqId === null || chunk.sequenceId > lastMessageEndSeqId) {
            lastMessageStartSeqId = chunk.sequenceId!
            break
          }
        }
      }
      
      let chunksToProcess: BufferedChunk[]
      
      if (lastMessageStartSeqId !== null) {
        chunksToProcess = allChunks.filter(item => 
          item.chunk.sequenceId !== undefined && 
          item.chunk.sequenceId >= lastMessageStartSeqId!
        )
      } else if (lastMessageEndSeqId !== null) {
        chunksToProcess = allChunks.filter(item => 
          item.chunk.sequenceId !== undefined && 
          item.chunk.sequenceId > lastMessageEndSeqId!
        )
      } else {
        chunksToProcess = allChunks
      }
      
      chunksToProcess.forEach(({ chunk, messageType }) => {
        processChunk(chunk, messageType, true)
      })      
    } catch (error) {
      // noop
    } finally {
      fetchingInProgress.current = false
      isBuffering.current = false
    }
  }, [dialogId, processChunk]) 
  
  const resetChunkTracking = useCallback(() => {
    processedSequenceIds.current.clear()
    lastSequenceId.current = null
    fetchingInProgress.current = false
    lastFetchParams.current = null
    chunkBuffer.current = []
    isBuffering.current = false
  }, [])
  
  const getLastSequenceId = useCallback(() => {
    return lastSequenceId.current
  }, [])
  
  return {
    catchUpChunks,
    processChunk,
    resetChunkTracking,
    getLastSequenceId,
    processedCount: processedSequenceIds.current.size
  }
}