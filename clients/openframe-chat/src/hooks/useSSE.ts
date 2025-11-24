import { useState, useCallback, useRef, useEffect } from 'react'
import { MockChatService } from '../services/mockChatService'
import { SSEService } from '../services/sseService'
import { ChatApiService } from '../services/chatApiService'
import { tokenService } from '../services/tokenService'
import { MessageSegment } from '../types/chat.types'

interface UseSSEOptions {
  url?: string
  useMock?: boolean
  useApi?: boolean
  apiToken?: string
  apiBaseUrl?: string
  debugMode?: boolean
  onMetadataUpdate?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void
}

let sharedApiService: ChatApiService | null = null
let isInitialized = false

export function useSSE({ url, useMock = false, useApi = true, debugMode = false, onMetadataUpdate }: UseSSEOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const mockService = useRef(new MockChatService())
  const sseService = useRef(url ? new SSEService(url, onMetadataUpdate, debugMode) : null)
  
  if (!sharedApiService) {
    sharedApiService = new ChatApiService(debugMode)
    
    if (!isInitialized && useApi) {
      isInitialized = true
      Promise.all([
        tokenService.requestToken().catch(() => null),
        tokenService.initApiUrl().catch(() => null)
      ]).catch(() => {
        // Silent fail - tokens will be requested on-demand later
      })
    }
  }
  const apiService = useRef(sharedApiService)
  
  useEffect(() => {
    if (apiService.current) {
      apiService.current.setDebugMode(debugMode)
    }
  }, [debugMode])

  useEffect(() => {
    if (apiService.current) {
      apiService.current.setMetadataCallback(onMetadataUpdate)
    }
  }, [onMetadataUpdate])

  useEffect(() => {
    if (url) {
      sseService.current = new SSEService(url, onMetadataUpdate, debugMode)
    }
  }, [url, onMetadataUpdate, debugMode])
  
  const streamMessage = useCallback(async function* (
    message: string
  ): AsyncGenerator<MessageSegment> {
    setIsStreaming(true)
    setError(null)
    
    // Create new abort controller for this stream
    abortControllerRef.current = new AbortController()
    
    try {
      let generator: AsyncGenerator<MessageSegment>
      
      if (useMock) {
        generator = mockService.current.streamResponse(message)
      } else if (useApi) {
        generator = apiService.current.streamMessage(message)
      } else if (sseService.current) {
        generator = sseService.current.streamMessage(message)
      } else {
        throw new Error('No service available. Please provide SSE URL, enable API mode, or enable mock mode.')
      }
      
      for await (const chunk of generator) {
        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          break
        }
        yield chunk
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
  } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [useMock, useApi])
  
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (sseService.current) {
      sseService.current.close()
    }
    setIsStreaming(false)
  }, [])
  
  const reset = useCallback(() => {
    if (apiService.current) {
      apiService.current.reset()
    }
  }, [])
  
  return {
    streamMessage,
    isStreaming,
    error,
    abort,
    reset
  }
}