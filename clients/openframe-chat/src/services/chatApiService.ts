import { MessageSegment } from '../types/chat.types'
import { tokenService } from './tokenService'

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
  private useNatsTransport: boolean = false
  private tokenUnsubscribe?: () => void
  private apiUrlUnsubscribe?: () => void
  private onMetadataUpdate?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void
  private dialogIdListeners: Set<(dialogId: string | null) => void> = new Set()

  constructor(debug: boolean = false, onMetadataUpdate?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void) {
    this.debugMode = debug
    this.onMetadataUpdate = onMetadataUpdate

    this.tokenUnsubscribe = tokenService.onTokenUpdate(() => {
      if (this.debugMode) {
        console.log('[ChatApiService] Token updated via listener')
      }
    })
    
    this.apiUrlUnsubscribe = tokenService.onApiUrlUpdate((apiUrl) => {
      if (this.debugMode) {
        console.log('[ChatApiService] API URL updated:', apiUrl)
      }
    })
  }
  
  onDialogIdUpdate(callback: (dialogId: string | null) => void): () => void {
    this.dialogIdListeners.add(callback)
    try {
      callback(this.dialogId)
    } catch {
      // ignore callback errors
    }
    return () => {
      this.dialogIdListeners.delete(callback)
    }
  }

  private setDialogId(dialogId: string | null) {
    if (this.dialogId === dialogId) return
    this.dialogId = dialogId
    for (const listener of this.dialogIdListeners) {
      try {
        listener(dialogId)
      } catch {
        // ignore listener failures
      }
    }
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
  
  async *streamMessage(message: string): AsyncGenerator<MessageSegment> {
    try {
      await this.ensureTokenReady()
      
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
  
  private async ensureTokenReady(): Promise<void> {
    let token = tokenService.getCurrentToken()
    
    if (!token) {
      if (this.debugMode) {
        console.log('[ChatApiService] Token not ready, requesting...')
      }
      token = await tokenService.requestToken()
      
      if (!token) {
        throw new Error('Authentication token not available.')
      }
    }
    
    let apiUrl = tokenService.getCurrentApiBaseUrl()
    if (!apiUrl) {
      if (this.debugMode) {
        console.log('[ChatApiService] API URL not ready, initializing...')
      }
      await tokenService.initApiUrl()
      apiUrl = tokenService.getCurrentApiBaseUrl()
      
      if (!apiUrl) {
        throw new Error('API server URL not configured.')
      }
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

  private async *parseSSE(response: Response): AsyncGenerator<{ event: string | null; data: string }> {
    if (!response.body) {
      throw new Error('Response body is empty')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent: string | null = null
    let currentDataLines: string[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const rawLine of lines) {
          const line = rawLine.replace(/\r$/, '')

          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
            continue
          }

          if (line.startsWith('data:')) {
            currentDataLines.push(line.slice(5).trimStart())
            continue
          }

          if (line.trim() === '') {
            if (currentDataLines.length > 0) {
              const data = currentDataLines.join('\n')
              yield { event: currentEvent, data }
            }
            currentEvent = null
            currentDataLines = []
          }
        }
      }

      if (currentDataLines.length > 0) {
        const data = currentDataLines.join('\n')
        yield { event: currentEvent, data }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async *createDialogAndStream(initialMessage: string): AsyncGenerator<MessageSegment> {
    if (this.debugMode) {
      const token = tokenService.getCurrentToken()
      yield { type: 'text', text: `[DEBUG] Creating dialog with initial message: "${initialMessage.substring(0, 50)}${initialMessage.length > 50 ? '...' : ''}"\n` }
      yield { type: 'text', text: `[DEBUG] Endpoint: ${this.getApiBaseUrl()}/chat/api/v1/dialogs\n` }
      yield { type: 'text', text: `[DEBUG] Token status: ${token ? 'Available' : 'Missing'}\n` }
      yield { type: 'text', text: `[DEBUG] Authorization: Bearer ${token}\n` }
    }
    
    const response = await fetch(`${this.getApiBaseUrl()}/chat/api/v1/dialogs`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ initialMessage })
    }).catch(err => {
      if (this.debugMode) {
        throw new Error(`Network error creating dialog: ${err.message}\nURL: ${this.getApiBaseUrl()}/chat/api/v1/dialogs`)
      }
      throw err
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      if (this.debugMode) {
        yield { type: 'text', text: `[DEBUG] Dialog creation failed:` }
        yield { type: 'text', text: `  Status: ${response.status} ${response.statusText}` }
        yield { type: 'text', text: `  Response: ${errorText}` }
        yield { type: 'text', text: `  URL: ${this.getApiBaseUrl()}/api/v1/dialogs` }
      }
      throw new Error(`Failed to create dialog: ${response.status} ${response.statusText}\n${errorText}`)
    }
    
    yield* this.consumeSSE(response)
  }
  
  private async *processMessage(content: string): AsyncGenerator<MessageSegment> {
    if (!this.dialogId) {
      throw new Error('Dialog ID is not set')
    }
    
    if (this.debugMode) {
      const token = tokenService.getCurrentToken()
      yield { type: 'text', text: `[DEBUG] Processing message with dialog ID: ${this.dialogId}\n` }
      yield { type: 'text', text: `[DEBUG] Message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"\n` }
      yield { type: 'text', text: `[DEBUG] Endpoint: ${this.getApiBaseUrl()}/chat/api/v1/messages/process\n` }
      yield { type: 'text', text: `[DEBUG] Token status: ${token ? 'Available' : 'Missing'}\n` }
    }
    
    const response = await fetch(`${this.getApiBaseUrl()}/chat/api/v1/messages/process`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        dialogId: this.dialogId,
        content
      })
    }).catch(err => {
      if (this.debugMode) {
        throw new Error(`Network error processing message: ${err.message}\nURL: ${this.getApiBaseUrl()}/chat/api/v1/messages/process\nDialog ID: ${this.dialogId}`)
      }
      throw err
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      if (this.debugMode) {
        yield { type: 'text', text: `[DEBUG] Message processing failed:` }
        yield { type: 'text', text: `  Status: ${response.status} ${response.statusText}` }
        yield { type: 'text', text: `  Response: ${errorText}` }
        yield { type: 'text', text: `  Dialog ID: ${this.dialogId}` }
        yield { type: 'text', text: `  URL: ${this.getApiBaseUrl()}/api/v1/messages/process` }
      }
      throw new Error(`Failed to process message: ${response.status} ${response.statusText}\n${errorText}`)
    }
    
    yield* this.consumeSSE(response)
  }

  private async *consumeSSE(response: Response): AsyncGenerator<MessageSegment> {
    for await (const { event, data } of this.parseSSE(response)) {
      if (data === '[DONE]') {
        return
      }

      // When using NATS for streaming chunks, SSE is only used for control-plane events:
      // - dialog-created (to learn dialogId)
      // - metadata (to update UI)
      if (this.useNatsTransport && event !== 'dialog-created' && event !== 'metadata') {
        continue
      }

      if (event === 'dialog-created') {
        try {
          const parsed = JSON.parse(data) as DialogCreatedEventData
          if (parsed && parsed.dialogId) {
            this.setDialogId(parsed.dialogId)
          }
        } catch {
          // ignore malformed event
        }
        continue
      }

      if (event === 'metadata') {
        try {
          const parsed = JSON.parse(data)
          if (this.debugMode) {
            yield { type: 'text', text: `[DEBUG] Metadata event received: ${JSON.stringify(parsed)}` }
          }
          
          if (this.onMetadataUpdate && parsed.modelName && (parsed.providerName || parsed.provider)) {
            const providerName = parsed.providerName || parsed.provider
            if (this.debugMode) {
              yield { type: 'text', text: `[DEBUG] Calling metadata callback: modelName=${parsed.modelName}, providerName=${providerName}` }
            }
            this.onMetadataUpdate({
              modelName: parsed.modelName,
              providerName: providerName,
              contextWindow: parsed.contextWindow || 0
            })
          } else if (this.debugMode) {
            yield { type: 'text', text: `[DEBUG] Metadata callback not called - hasCallback: ${!!this.onMetadataUpdate}, modelName: ${parsed.modelName}, providerName: ${parsed.providerName || parsed.provider}` }
          }
        } catch {
          // ignore malformed event
        }
        continue
      }

      if (event === 'message') {
        try {
          const msg = JSON.parse(data) as MessageEventData

          if (msg.type === 'TEXT' && typeof msg.text === 'string') {
            yield { type: 'text', text: msg.text }
            continue
          } else if (msg.type === 'EXECUTING_TOOL' || msg.type === 'EXECUTED_TOOL') {
            yield {
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
            continue
          }
        } catch {
          // not json; fall through
        }
      }

      try {
        const maybe = JSON.parse(data)

        if (maybe.type === 'EXECUTING_TOOL' || maybe.type === 'EXECUTED_TOOL') {
          yield {
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
          yield { type: 'text', text: maybe.text }
        } else {
          yield { type: 'text', text: data }
        }
      } catch {
        yield { type: 'text', text: data }
      }
    }
  }
  
  setDebugMode(enabled: boolean) {
    this.debugMode = enabled
  }

  setMetadataCallback(callback?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void) {
    this.onMetadataUpdate = callback
  }

  setUseNatsTransport(enabled: boolean) {
    this.useNatsTransport = enabled
  }

  reset() {
    this.setDialogId(null)
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
  }
}