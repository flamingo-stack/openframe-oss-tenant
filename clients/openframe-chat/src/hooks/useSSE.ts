import { useState, useCallback, useRef, useEffect } from 'react'
import { MockChatService } from '../services/mockChatService'
import { SSEService } from '../services/sseService'
import { ChatApiService } from '../services/chatApiService'
import { MessageSegment, ConnectionState } from '../types/chat.types'

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
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [retryDelay, setRetryDelay] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const mockService = useRef(new MockChatService())
  const sseService = useRef(url ? new SSEService(url) : null)
  const apiService = useRef(new ChatApiService(debugMode))

  // Set up connection state and retry callbacks for API service
  useEffect(() => {
    if (useApi && apiService.current) {
      apiService.current.setConnectionStateCallback((state, error) => {
        setConnectionState(state)

        if (state === ConnectionState.FAILED && error) {
          setError(error.message)
        } else if (state === ConnectionState.CONNECTED) {
          setError(null)
          setRetryAttempt(0)
        }
      })

      apiService.current.setRetryCallback((attempt, delay) => {
        setRetryAttempt(attempt)
        setRetryDelay(delay)
      })
    }
  }, [useApi])

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
    setConnectionState(ConnectionState.IDLE)
    setRetryAttempt(0)
    setRetryDelay(0)
    setError(null)
  }, [])

  const getConnectionState = useCallback(() => {
    if (useApi && apiService.current) {
      return apiService.current.getConnectionState()
    }
    return connectionState
  }, [useApi, connectionState])

  return {
    streamMessage,
    isStreaming,
    error,
    abort,
    reset,
    // New properties for connection resilience
    connectionState,
    retryAttempt,
    retryDelay,
    getConnectionState
  }
}
