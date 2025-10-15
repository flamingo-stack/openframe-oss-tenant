import { useState, useCallback, useRef } from 'react'
import { MockChatService } from '../services/mockChatService'
import { SSEService } from '../services/sseService'
import { ChatApiService } from '../services/chatApiService'
import { MessageSegment } from '../types/chat.types'

interface UseSSEOptions {
  url?: string
  useMock?: boolean
  useApi?: boolean
  apiToken?: string
  apiBaseUrl?: string
  debugMode?: boolean
}

export function useSSE({ url, useMock = false, useApi = true, apiToken, apiBaseUrl, debugMode = false }: UseSSEOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const mockService = useRef(new MockChatService())
  const sseService = useRef(url ? new SSEService(url) : null)
  const apiService = useRef(new ChatApiService(apiToken, apiBaseUrl, debugMode))
  
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