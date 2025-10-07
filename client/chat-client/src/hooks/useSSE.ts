import { useState, useCallback, useRef } from 'react'
import { MockChatService } from '../services/mockChatService'
import { SSEService } from '../services/sseService'

interface UseSSEOptions {
  url?: string
  useMock?: boolean
}

export function useSSE({ url, useMock = true }: UseSSEOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const mockService = useRef(new MockChatService())
  const sseService = useRef(url ? new SSEService(url) : null)
  
  const streamMessage = useCallback(async function* (
    message: string
  ): AsyncGenerator<string> {
    setIsStreaming(true)
    setError(null)
    
    // Create new abort controller for this stream
    abortControllerRef.current = new AbortController()
    
    try {
      const service = useMock ? mockService.current : sseService.current
      
      if (!service) {
        throw new Error('No service available. Please provide SSE URL or enable mock mode.')
      }
      
      const generator = useMock 
        ? mockService.current.streamResponse(message)
        : sseService.current!.streamMessage(message)
      
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
  }, [useMock])
  
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (sseService.current) {
      sseService.current.close()
    }
    setIsStreaming(false)
  }, [])
  
  return {
    streamMessage,
    isStreaming,
    error,
    abort
  }
}