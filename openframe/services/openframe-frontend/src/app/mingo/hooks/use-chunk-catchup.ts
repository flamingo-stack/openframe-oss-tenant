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
  const processedSequenceKeys = useRef<Set<string>>(new Set())
  const lastSequenceId = useRef<number | null>(null)
  
  const fetchingInProgress = useRef(false)
  const lastFetchParams = useRef<{ dialogId: string; fromSequenceId?: number | null } | null>(null)
  
  // Buffer for NATS chunks that arrive during catchup
  const chunkBuffer = useRef<BufferedChunk[]>([])
  const bufferUntilInitialCatchupComplete = useRef(false)
  const hasCompletedInitialCatchup = useRef(false)
  
  const onChunkReceivedRef = useRef(onChunkReceived)
  useEffect(() => {
    onChunkReceivedRef.current = onChunkReceived
  }, [onChunkReceived])

  function makeSeqKey(messageType: 'message' | 'admin-message', sequenceId: number): string {
    return `${messageType}:${sequenceId}`
  }

  function makeBatchDedupKey(item: BufferedChunk): string {
    const seq = item.chunk.sequenceId ?? 'na'
    const type = typeof item.chunk.type === 'string' ? item.chunk.type : 'na'
    const text = typeof item.chunk.text === 'string' ? item.chunk.text : ''
    const integratedToolType = typeof item.chunk.integratedToolType === 'string' ? item.chunk.integratedToolType : ''
    const toolFunction = typeof item.chunk.toolFunction === 'string' ? item.chunk.toolFunction : ''
    const approvalRequestId =
      typeof item.chunk.approvalRequestId === 'string'
        ? item.chunk.approvalRequestId
        : typeof item.chunk.approval_request_id === 'string'
          ? item.chunk.approval_request_id
          : ''

    return `${item.messageType}:${seq}:${type}:${text}:${integratedToolType}:${toolFunction}:${approvalRequestId}`
  }
  
  const processChunk = useCallback((
    chunk: ChunkData,
    messageType: 'message' | 'admin-message',
    forceProcess: boolean = false
  ): boolean => {
    if (bufferUntilInitialCatchupComplete.current && !forceProcess) {
      chunkBuffer.current.push({ chunk, messageType })
      return true
    }
    
    if (chunk.sequenceId !== undefined && chunk.sequenceId !== null) {
      lastSequenceId.current = chunk.sequenceId
    }
    
    onChunkReceivedRef.current(chunk, messageType)
    return true
  }, [])

  const flushBufferedRealtimeChunks = useCallback(() => {
    if (chunkBuffer.current.length === 0) return
    const buffered = [...chunkBuffer.current]
    chunkBuffer.current = []

    buffered.sort((a, b) => {
      const seqA = a.chunk.sequenceId ?? 0
      const seqB = b.chunk.sequenceId ?? 0
      return seqA - seqB
    })

    buffered.forEach(({ chunk, messageType }) => {
      processChunk(chunk, messageType, true)
    })
  }, [processChunk])
  
  const catchUpChunks = useCallback(async (fromSequenceId?: number | null) => {
    if (!dialogId) {
      return
    }
    
    if (hasCompletedInitialCatchup.current) {
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
      
      if (clientChunks.length === 0 && adminChunks.length === 0) {
        flushBufferedRealtimeChunks()
        bufferUntilInitialCatchupComplete.current = false
        hasCompletedInitialCatchup.current = true
        return
      }
      
      const allCatchupChunks: BufferedChunk[] = []
      
      clientChunks.forEach(chunk => {
        allCatchupChunks.push({ chunk, messageType: 'message' })
      })
      
      adminChunks.forEach(chunk => {
        allCatchupChunks.push({ chunk, messageType: 'admin-message' })
      })
      
      const bufferedNatsChunks = [...chunkBuffer.current]
      chunkBuffer.current = []
      const allChunks = [...allCatchupChunks, ...bufferedNatsChunks]
      
      allChunks.sort((a, b) => {
        const seqA = a.chunk.sequenceId ?? 0
        const seqB = b.chunk.sequenceId ?? 0
        return seqA - seqB
      })
    
      const uniqueAllChunks: BufferedChunk[] = []
      const seenInBatch = new Set<string>()
      for (const item of allChunks) {
        const k = makeBatchDedupKey(item)
        if (seenInBatch.has(k)) continue
        seenInBatch.add(k)
        uniqueAllChunks.push(item)
      }
      
      let lastMessageStartSeqId: number | null = null
      let lastMessageEndSeqId: number | null = null
      
      for (let i = uniqueAllChunks.length - 1; i >= 0; i--) {
        const seq = uniqueAllChunks[i].chunk.sequenceId
        if (uniqueAllChunks[i].chunk.type === MESSAGE_TYPE.MESSAGE_END && seq !== undefined && seq !== null) {
          lastMessageEndSeqId = seq
          break
        }
      }
      
      for (let i = uniqueAllChunks.length - 1; i >= 0; i--) {
        const chunk = uniqueAllChunks[i].chunk
        const seq = chunk.sequenceId
        if (chunk.type === MESSAGE_TYPE.MESSAGE_START && seq !== undefined && seq !== null) {
          if (lastMessageEndSeqId === null || seq > lastMessageEndSeqId) {
            lastMessageStartSeqId = seq
            break
          }
        }
      }
      
      let chunksToProcess: BufferedChunk[]
      
      if (lastMessageStartSeqId !== null) {
        chunksToProcess = uniqueAllChunks.filter(item => 
          item.chunk.sequenceId !== undefined && 
          item.chunk.sequenceId >= lastMessageStartSeqId!
        )
      } else if (lastMessageEndSeqId !== null) {
        chunksToProcess = uniqueAllChunks.filter(item => 
          item.chunk.sequenceId !== undefined && 
          item.chunk.sequenceId > lastMessageEndSeqId!
        )
      } else {
        chunksToProcess = uniqueAllChunks
      }
      
      chunksToProcess.forEach(({ chunk, messageType }) => {
        if (chunk.sequenceId !== undefined && chunk.sequenceId !== null) {
          processedSequenceKeys.current.add(makeSeqKey(messageType, chunk.sequenceId))
          lastSequenceId.current = chunk.sequenceId
        }
        onChunkReceivedRef.current(chunk, messageType)
      })

      bufferUntilInitialCatchupComplete.current = false
      hasCompletedInitialCatchup.current = true
    } catch (error) {
      // noop
    } finally {
      fetchingInProgress.current = false

      if (bufferUntilInitialCatchupComplete.current) {
        bufferUntilInitialCatchupComplete.current = false
        hasCompletedInitialCatchup.current = true
        flushBufferedRealtimeChunks()
      }
    }
  }, [dialogId, flushBufferedRealtimeChunks]) 
  
  const resetChunkTracking = useCallback(() => {
    processedSequenceKeys.current.clear()
    lastSequenceId.current = null
    fetchingInProgress.current = false
    lastFetchParams.current = null
    chunkBuffer.current = []
    bufferUntilInitialCatchupComplete.current = false
    hasCompletedInitialCatchup.current = false
  }, [])
  
  const startInitialBuffering = useCallback(() => {
    chunkBuffer.current = []
    bufferUntilInitialCatchupComplete.current = true
    hasCompletedInitialCatchup.current = false
  }, [])
  
  const isBufferingActive = useCallback(() => bufferUntilInitialCatchupComplete.current, [])
  
  return {
    catchUpChunks,
    processChunk,
    resetChunkTracking,
    startInitialBuffering,
    isBufferingActive,
    processedCount: processedSequenceKeys.current.size
  }
}