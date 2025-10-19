import { MessageSegment, ConnectionState, ConnectionStateCallback, RetryCallback } from '../types/chat.types'
import { tokenService } from './tokenService'
import { ResilientSSEConnection } from './resilientSSEConnection'
import { EventSourceMessage } from '@microsoft/fetch-event-source'

interface DialogCreatedEventData {
  dialogId: string
}

interface MessageEventData {
  type?: string
  text?: string
  integratedToolType?: string
  toolFunction?: string
  parameters?: Record<string, any>
  result?: string
  success?: boolean
}

export class ChatApiService {
  private dialogId: string | null = null
  private debugMode: boolean
  private tokenUnsubscribe?: () => void
  private apiUrlUnsubscribe?: () => void
  private currentConnection: ResilientSSEConnection | null = null
  private connectionState: ConnectionState = ConnectionState.IDLE
  private onStateChange?: ConnectionStateCallback
  private onRetry?: RetryCallback

  constructor(debug: boolean = false) {
    this.debugMode = debug

    this.tokenUnsubscribe = tokenService.onTokenUpdate((token) => {})
    this.apiUrlUnsubscribe = tokenService.onApiUrlUpdate((apiUrl) => {})

    tokenService.requestToken()
  }

  private getApiBaseUrl(): string {
    return tokenService.getCurrentApiBaseUrl() || ''
  }

  private getHeaders(): HeadersInit {
    const token = tokenService.getCurrentToken()

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Set callback for connection state changes
   */
  setConnectionStateCallback(callback: ConnectionStateCallback): void {
    this.onStateChange = callback
  }

  /**
   * Set callback for retry events
   */
  setRetryCallback(callback: RetryCallback): void {
    this.onRetry = callback
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  async *streamMessage(message: string): AsyncGenerator<MessageSegment> {
    try {
      if (!this.dialogId) {
        yield* this.createDialogAndStream(message)
      } else {
        yield* this.processMessage(message)
      }
    } catch (error) {
      if (this.debugMode) {
        const errorDetails = this.formatError(error)
        yield { type: 'text', text: `[DEBUG] API Error:\n${errorDetails}` }
      }
      throw error
    }
  }

  private formatError(error: any): string {
    const details: string[] = []

    if (error instanceof Error) {
      details.push(`Message: ${error.message}`)
      if (error.stack) {
        details.push(`Stack: ${error.stack.split('\n')[0]}`)
      }
    }

    if (error.response) {
      details.push(`Status: ${error.response.status}`)
      details.push(`Status Text: ${error.response.statusText}`)
    }

    details.push(`Endpoint: ${this.dialogId ? '/messages/process' : '/dialogs'}`)
    details.push(`Base URL: ${this.getApiBaseUrl()}`)
    details.push(`Token available: ${tokenService.getCurrentToken() !== null}`)
    details.push(`Dialog ID: ${this.dialogId || 'Not set'}`)

    return details.join('\n')
  }

  private async *createDialogAndStream(initialMessage: string): AsyncGenerator<MessageSegment> {
    if (this.debugMode) {
      yield { type: 'text', text: `[DEBUG] Creating dialog with initial message: "${initialMessage.substring(0, 50)}${initialMessage.length > 50 ? '...' : ''}"` }
      yield { type: 'text', text: `[DEBUG] Endpoint: ${this.getApiBaseUrl()}/chat/api/v1/dialogs` }
    }

    yield* this.createSSEConnection(
      `${this.getApiBaseUrl()}/chat/api/v1/dialogs`,
      JSON.stringify({ initialMessage })
    )
  }

  private async *processMessage(content: string): AsyncGenerator<MessageSegment> {
    if (!this.dialogId) {
      throw new Error('Dialog ID is not set')
    }

    if (this.debugMode) {
      yield { type: 'text', text: `[DEBUG] Processing message with dialog ID: ${this.dialogId}` }
      yield { type: 'text', text: `[DEBUG] Message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"` }
      yield { type: 'text', text: `[DEBUG] Endpoint: ${this.getApiBaseUrl()}/chat/api/v1/messages/process` }
    }

    yield* this.createSSEConnection(
      `${this.getApiBaseUrl()}/chat/api/v1/messages/process`,
      JSON.stringify({
        dialogId: this.dialogId,
        content
      })
    )
  }

  /**
   * Creates an SSE connection using ResilientSSEConnection and yields message segments
   */
  private async *createSSEConnection(url: string, body: string): AsyncGenerator<MessageSegment> {
    const segments: MessageSegment[] = []
    let resolver: ((value: IteratorResult<MessageSegment>) => void) | null = null
    let isDone = false
    let connectionError: Error | null = null

    // Create resilient connection
    this.currentConnection = new ResilientSSEConnection({
      url,
      method: 'POST',
      headers: this.getHeaders(),
      body,
      debugMode: this.debugMode,

      onStateChange: (state, error) => {
        this.connectionState = state

        if (this.debugMode) {
          console.log(`[ChatApiService] Connection state: ${state}`, error)
        }

        if (this.onStateChange) {
          this.onStateChange(state, error)
        }

        // If failed, propagate error
        if (state === ConnectionState.FAILED && error) {
          connectionError = error.originalError || new Error(error.message)
          isDone = true

          if (resolver) {
            resolver({ value: undefined, done: true })
            resolver = null
          }
        }
      },

      onRetry: (attempt, delay) => {
        if (this.debugMode) {
          console.log(`[ChatApiService] Retry attempt ${attempt}, delay: ${delay}ms`)
        }

        if (this.onRetry) {
          this.onRetry(attempt, delay)
        }
      },

      onMessage: (event: EventSourceMessage) => {
        const { data } = event

        if (data === '[DONE]') {
          isDone = true

          if (resolver) {
            resolver({ value: undefined, done: true })
            resolver = null
          }
          return
        }

        // Handle dialog-created event (event type comes from server)
        if (event.event === 'dialog-created') {
          try {
            const parsed = JSON.parse(data) as DialogCreatedEventData
            if (parsed && parsed.dialogId) {
              this.dialogId = parsed.dialogId

              if (this.debugMode) {
                console.log('[ChatApiService] Dialog created:', this.dialogId)
              }
            }
          } catch {
            // ignore malformed event
          }
          return
        }

        // Parse and process message segment
        const segment = this.parseMessageSegment(event.event || '', data)

        if (segment) {
          segments.push(segment)

          if (resolver) {
            resolver({ value: segments.shift()!, done: false })
            resolver = null
          }
        }
      },

      onOpen: (response) => {
        if (this.debugMode) {
          console.log('[ChatApiService] Connection opened:', response.status)
        }
      }
    })

    // Start connection
    try {
      // Don't await - we want to start yielding messages immediately
      this.currentConnection.connect().catch(err => {
        if (this.debugMode) {
          console.error('[ChatApiService] Connection error:', err)
        }
        connectionError = err
        isDone = true

        if (resolver) {
          resolver({ value: undefined, done: true })
        }
      })

      // Yield segments as they arrive
      while (!isDone) {
        const segment = await new Promise<MessageSegment | undefined>((resolve) => {
          if (segments.length > 0) {
            resolve(segments.shift()!)
          } else {
            resolver = (result: IteratorResult<MessageSegment>) => {
              resolve(result.value)
            }
          }
        })

        if (segment) {
          yield segment
        }

        // Check for errors
        if (connectionError) {
          throw connectionError
        }
      }
    } finally {
      // Clean up connection
      if (this.currentConnection) {
        this.currentConnection.close()
        this.currentConnection = null
      }
    }
  }

  /**
   * Parses message segments from SSE events
   */
  private parseMessageSegment(eventType: string, data: string): MessageSegment | null {
    // Handle message events
    if (eventType === 'message') {
      try {
        const msg = JSON.parse(data) as MessageEventData

        if (msg.type === 'TEXT' && typeof msg.text === 'string') {
          return { type: 'text', text: msg.text }
        } else if (msg.type === 'EXECUTING_TOOL' || msg.type === 'EXECUTED_TOOL') {
          return {
            type: 'tool_execution',
            data: {
              type: msg.type,
              integratedToolType: msg.integratedToolType || '',
              toolFunction: msg.toolFunction || '',
              parameters: msg.parameters,
              result: msg.result,
              success: msg.success
            }
          }
        }
      } catch {
        // not json; fall through
      }
    }

    // Try to parse as JSON for non-message events or fallback
    try {
      const maybe = JSON.parse(data)

      if (maybe.type === 'EXECUTING_TOOL' || maybe.type === 'EXECUTED_TOOL') {
        return {
          type: 'tool_execution',
          data: {
            type: maybe.type,
            integratedToolType: maybe.integratedToolType || '',
            toolFunction: maybe.toolFunction || '',
            parameters: maybe.parameters,
            result: maybe.result,
            success: maybe.success
          }
        }
      } else if (typeof maybe?.text === 'string') {
        return { type: 'text', text: maybe.text }
      } else {
        return { type: 'text', text: data }
      }
    } catch {
      return { type: 'text', text: data }
    }
  }

  reset() {
    this.dialogId = null

    if (this.currentConnection) {
      this.currentConnection.close()
      this.currentConnection = null
    }
  }

  getDialogId(): string | null {
    return this.dialogId
  }

  destroy() {
    if (this.tokenUnsubscribe) {
      this.tokenUnsubscribe()
    }
    if (this.apiUrlUnsubscribe) {
      this.apiUrlUnsubscribe()
    }
    if (this.currentConnection) {
      this.currentConnection.close()
      this.currentConnection = null
    }
  }
}
