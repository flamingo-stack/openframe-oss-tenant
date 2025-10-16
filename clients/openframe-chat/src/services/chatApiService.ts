import { MessageSegment } from '../types/chat.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const API_TOKEN = import.meta.env.VITE_API_TOKEN

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
  private apiToken: string
  private apiBaseUrl: string
  private debugMode: boolean
  
  constructor(token?: string, baseUrl?: string, debug: boolean = false) {
    this.apiToken = token || API_TOKEN
    this.apiBaseUrl = baseUrl || API_BASE_URL
    this.debugMode = debug
  }
  
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    }
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
    details.push(`Base URL: ${this.apiBaseUrl}`)
    details.push(`Token configured: ${this.apiToken !== 'YOUR_API_TOKEN_HERE'}`)
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
      yield { type: 'text', text: `[DEBUG] Creating dialog with initial message: "${initialMessage.substring(0, 50)}${initialMessage.length > 50 ? '...' : ''}"` }
      yield { type: 'text', text: `[DEBUG] Endpoint: ${this.apiBaseUrl}/api/v1/dialogs` }
    }
    
    const response = await fetch(`${this.apiBaseUrl}/api/v1/dialogs`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ initialMessage })
    }).catch(err => {
      if (this.debugMode) {
        throw new Error(`Network error creating dialog: ${err.message}\nURL: ${this.apiBaseUrl}/api/v1/dialogs`)
      }
      throw err
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      if (this.debugMode) {
        yield { type: 'text', text: `[DEBUG] Dialog creation failed:` }
        yield { type: 'text', text: `  Status: ${response.status} ${response.statusText}` }
        yield { type: 'text', text: `  Response: ${errorText}` }
        yield { type: 'text', text: `  URL: ${this.apiBaseUrl}/api/v1/dialogs` }
        yield { type: 'text', text: `  Token present: ${this.apiToken !== 'YOUR_API_TOKEN_HERE'}` }
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
      yield { type: 'text', text: `[DEBUG] Processing message with dialog ID: ${this.dialogId}` }
      yield { type: 'text', text: `[DEBUG] Message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"` }
      yield { type: 'text', text: `[DEBUG] Endpoint: ${this.apiBaseUrl}/api/v1/messages/process` }
    }
    
    const response = await fetch(`${this.apiBaseUrl}/api/v1/messages/process`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        dialogId: this.dialogId,
        content
      })
    }).catch(err => {
      if (this.debugMode) {
        throw new Error(`Network error processing message: ${err.message}\nURL: ${this.apiBaseUrl}/api/v1/messages/process\nDialog ID: ${this.dialogId}`)
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
        yield { type: 'text', text: `  URL: ${this.apiBaseUrl}/api/v1/messages/process` }
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

      if (event === 'dialog-created') {
        try {
          const parsed = JSON.parse(data) as DialogCreatedEventData
          if (parsed && parsed.dialogId) {
            this.dialogId = parsed.dialogId
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
  
  reset() {
    this.dialogId = null
  }
  
  getDialogId(): string | null {
    return this.dialogId
  }
}