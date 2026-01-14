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

interface UseChunkCatchupOptions {
  dialogId: string | null
  onChunkReceived: (chunk: ChunkData, messageType: 'message' | 'admin-message') => void
}

export function useChunkCatchup({ dialogId, onChunkReceived }: UseChunkCatchupOptions) {
  const processedSequenceIds = useRef<Set<number>>(new Set())
  const lastSequenceId = useRef<number | null>(null)
  
  const fetchingInProgress = useRef(false)
  const lastFetchParams = useRef<{ dialogId: string; fromSequenceId?: number | null } | null>(null)
  
  const onChunkReceivedRef = useRef(onChunkReceived)
  useEffect(() => {
    onChunkReceivedRef.current = onChunkReceived
  }, [onChunkReceived])
  
  const processChunk = useCallback((
    chunk: ChunkData,
    messageType: 'message' | 'admin-message'
  ): boolean => {
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
      
      const processChunksArray = (
        chunks: ChunkData[],
        messageType: 'message' | 'admin-message'
      ): number => {
        if (!Array.isArray(chunks) || chunks.length === 0) {
          return 0
        }
        
        chunks.sort((a, b) => {
          const seqA = a.sequenceId ?? 0
          const seqB = b.sequenceId ?? 0
          return seqA - seqB
        })
        
        let lastMessageEndSeqId: number | null = null
        for (let i = chunks.length - 1; i >= 0; i--) {
          if (chunks[i].type === MESSAGE_TYPE.MESSAGE_END && chunks[i].sequenceId) {
            lastMessageEndSeqId = chunks[i].sequenceId!
            break
          }
        }
        
        const filteredChunks = lastMessageEndSeqId === null 
          ? chunks 
          : chunks.filter(chunk => 
              chunk.sequenceId !== undefined && 
              chunk.sequenceId > lastMessageEndSeqId!
            )
        
        if (filteredChunks.length === 0) {
          return 0
        }
        
        let processedCount = 0
        
        filteredChunks.forEach(chunk => {
          if (processChunk(chunk, messageType)) {
            processedCount++
          }
        })
        
        return processedCount
      }
      
      processChunksArray(clientChunks, 'message')
      processChunksArray(adminChunks, 'admin-message')      
    } catch (error) {
      // noop
    } finally {
      fetchingInProgress.current = false
    }
  }, [dialogId, processChunk]) 
  
  const resetChunkTracking = useCallback(() => {
    processedSequenceIds.current.clear()
    lastSequenceId.current = null
    fetchingInProgress.current = false
    lastFetchParams.current = null
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