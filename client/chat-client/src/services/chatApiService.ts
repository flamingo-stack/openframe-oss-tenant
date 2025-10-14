const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://openframe-saas-ai-agent.microservices.svc.cluster.local:8085'
const API_TOKEN = import.meta.env.VITE_API_TOKEN || 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhZ2VudF83ZWNhZjI2NC1lZTMxLTRiN2YtYWI4YS04NmI4ODlhZTg2YTkiLCJncmFudF90eXBlIjoiY2xpZW50X2NyZWRlbnRpYWxzIiwicm9sZXMiOlsiQUdFTlQiXSwiaXNzIjoiaHR0cHM6Ly9hdXRoLm9wZW5mcmFtZS5jb20iLCJtYWNoaW5lX2lkIjoiN2VjYWYyNjQtZWUzMS00YjdmLWFiOGEtODZiODg5YWU4NmE5IiwiZXhwIjoxNzU5OTU0NzAzLCJpYXQiOjE3NTk5NTExMDN9.e313Nf-KLZQ6Ol6C6UMZKRHsXBkj1T45Snuco4cmax3zKr_BsZ4EfNcGcbvgwUybubjabZxBw2kQLajlhmggn8iZ8GNS60eDY22UBCHNqeGGXYWXH1zMBYBhhkNEcIEbOOLwCiOQDX0IxyqwzFkW02NqX8x0ttaow896yqIWZdCTi-8O66VOE1nGtwVxW3KGSNdY0YCslXo5JvvCOueIvJytm1YFxlIrKlECFuk7jipy_D-Ip2KYnQwG3kvucaki7EWnFDwlBZW6DciozmIyv_L7mKYICOWfhLilkObeWTrrhzj0IpyYFFLoMZ_APKcUU1peP6oIGKFjKHI5-o8ERw' // Set via environment variable

interface DialogCreatedEventData {
  dialogId: string
}

interface MessageEventData {
  type?: string
  text?: string
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
  
  async *streamMessage(message: string): AsyncGenerator<string> {
    try {
      if (!this.dialogId) {
        yield* this.createDialogAndStream(message)
      } else {
        yield* this.processMessage(message)
      }
    } catch (error) {
      if (this.debugMode) {
        const errorDetails = this.formatError(error)
        yield `[DEBUG] API Error:\n${errorDetails}`
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

  private async *createDialogAndStream(initialMessage: string): AsyncGenerator<string> {
    if (this.debugMode) {
      yield `[DEBUG] Creating dialog with initial message: "${initialMessage.substring(0, 50)}${initialMessage.length > 50 ? '...' : ''}"`
      yield `[DEBUG] Endpoint: ${this.apiBaseUrl}/api/v1/dialogs`
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
        yield `[DEBUG] Dialog creation failed:`
        yield `  Status: ${response.status} ${response.statusText}`
        yield `  Response: ${errorText}`
        yield `  URL: ${this.apiBaseUrl}/api/v1/dialogs`
        yield `  Token present: ${this.apiToken !== 'YOUR_API_TOKEN_HERE'}`
      }
      throw new Error(`Failed to create dialog: ${response.status} ${response.statusText}\n${errorText}`)
    }
    
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
          if ((msg as any)?.type === 'TEXT' && typeof msg.text === 'string') {
            yield msg.text
            continue
          }
        } catch {
          // not json; fall through to yielding raw data
        }
      }

      try {
        const maybe = JSON.parse(data)
        if (typeof maybe?.text === 'string') {
          yield maybe.text
        } else if (typeof maybe?.data === 'string') {
          yield maybe.data
        } else {
          yield data
        }
      } catch {
        yield data
      }
    }
  }
  
  private async *processMessage(content: string): AsyncGenerator<string> {
    if (!this.dialogId) {
      throw new Error('Dialog ID is not set')
    }
    
    if (this.debugMode) {
      yield `[DEBUG] Processing message with dialog ID: ${this.dialogId}`
      yield `[DEBUG] Message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
      yield `[DEBUG] Endpoint: ${this.apiBaseUrl}/api/v1/messages/process`
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
        yield `[DEBUG] Message processing failed:`
        yield `  Status: ${response.status} ${response.statusText}`
        yield `  Response: ${errorText}`
        yield `  Dialog ID: ${this.dialogId}`
        yield `  URL: ${this.apiBaseUrl}/api/v1/messages/process`
      }
      throw new Error(`Failed to process message: ${response.status} ${response.statusText}\n${errorText}`)
    }
    
    for await (const { event, data } of this.parseSSE(response)) {
      if (data === '[DONE]') {
        return
      }

      if (event === 'message') {
        try {
          const msg = JSON.parse(data) as MessageEventData
          if ((msg as any)?.type === 'TEXT' && typeof msg.text === 'string') {
            yield msg.text
            continue
          }
        } catch {
          // not json; fall through
        }
      }

      try {
        const maybe = JSON.parse(data)
        if (typeof maybe?.text === 'string') {
          yield maybe.text
        } else if (typeof maybe?.data === 'string') {
          yield maybe.data
        } else {
          yield data
        }
      } catch {
        yield data
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