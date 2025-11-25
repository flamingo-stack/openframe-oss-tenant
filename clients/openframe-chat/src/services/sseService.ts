import { MessageSegment } from '../types/chat.types'

export class SSEService {
  private eventSource: EventSource | null = null
  private url: string
  private onMetadataUpdate?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void
  private debugMode: boolean
  
  constructor(
    url: string, 
    onMetadataUpdate?: (metadata: { modelName: string; providerName: string; contextWindow: number }) => void,
    debugMode: boolean = false
  ) {
    this.url = url
    this.onMetadataUpdate = onMetadataUpdate
    this.debugMode = debugMode
  }
  
  async *streamMessage(message: string): AsyncGenerator<MessageSegment> {
    const params = new URLSearchParams({ message })
    const sseUrl = `${this.url}?${params.toString()}`
    
    return new Promise<AsyncGenerator<MessageSegment>>((resolve, reject) => {
      this.eventSource = new EventSource(sseUrl)
      
      const chunks: MessageSegment[] = []
      let resolver: ((value: IteratorResult<MessageSegment>) => void) | null = null
      
      const generator: AsyncGenerator<MessageSegment> = {
        async next() {
          return new Promise<IteratorResult<MessageSegment>>((res) => {
            if (chunks.length > 0) {
              res({ value: chunks.shift()!, done: false })
            } else {
              resolver = res
            }
          })
        },
        async return() {
          return { value: undefined, done: true }
        },
        async throw(error) {
          throw error
        },
        [Symbol.asyncIterator]() {
          return this
        }
      }
      
      this.eventSource.addEventListener('metadata', (event) => {
        try {
          const parsed = JSON.parse(event.data)
          
          if (this.debugMode) {
            chunks.push({ 
              type: 'text', 
              text: `[DEBUG] Metadata event received: ${JSON.stringify(parsed)}` 
            })
            if (resolver) {
              resolver({ value: chunks.shift()!, done: false })
              resolver = null
            }
          }
          
          if (this.onMetadataUpdate && parsed.modelName && parsed.providerName) {
            this.onMetadataUpdate({
              modelName: parsed.modelName,
              providerName: parsed.providerName,
              contextWindow: parsed.contextWindow || 0
            })
          }
        } catch {
          // ignore malformed metadata event
        }
      })
      
      this.eventSource.onmessage = (event) => {
        const data = event.data
        
        if (data === '[DONE]') {
          this.close()
          if (resolver) {
            resolver({ value: undefined, done: true })
          }
          return
        }
        
        let segment: MessageSegment | null = null
        let isMetadata = false
        
        try {
          const parsed = JSON.parse(data)
          
          if (this.debugMode && parsed.type) {
            chunks.push({ 
              type: 'text', 
              text: `[DEBUG] Received message with type: "${parsed.type}", data: ${JSON.stringify(parsed).substring(0, 200)}...` 
            })
          }
          
          if (parsed.type === 'metadata' || 
              (parsed.modelName && parsed.providerName) ||
              (parsed.modelName && parsed.provider)) {
            isMetadata = true
            
            if (this.debugMode) {
              chunks.push({ 
                type: 'text', 
                text: `[DEBUG] Metadata detected. Full data: ${JSON.stringify(parsed)}` 
              })
            }
            
            const providerName = parsed.providerName || parsed.provider
            
            if (this.onMetadataUpdate && parsed.modelName && providerName) {
              if (this.debugMode) {
                chunks.push({ 
                  type: 'text', 
                  text: `[DEBUG] Calling metadata callback with: modelName=${parsed.modelName}, providerName=${providerName}, contextWindow=${parsed.contextWindow || 0}` 
                })
              }
              this.onMetadataUpdate({
                modelName: parsed.modelName,
                providerName: providerName,
                contextWindow: parsed.contextWindow || 0
              })
            } else if (this.debugMode) {
              chunks.push({ 
                type: 'text', 
                text: `[DEBUG] Metadata callback not called - hasCallback: ${!!this.onMetadataUpdate}, modelName: ${parsed.modelName}, providerName: ${providerName}` 
              })
            }
          } else if (parsed.type === 'EXECUTING_TOOL' || parsed.type === 'EXECUTED_TOOL') {
            segment = {
              type: 'tool_execution',
              data: {
                type: parsed.type,
                integratedToolType: parsed.integratedToolType || '',
                toolFunction: parsed.toolFunction || '',
                parameters: parsed.parameters,
                result: parsed.result,
                success: parsed.success
              }
            }
          } else if (parsed.type === 'TEXT' && parsed.text) {
            segment = { type: 'text', text: parsed.text }
          } else if (typeof parsed.text === 'string') {
            segment = { type: 'text', text: parsed.text }
          } else {
            if (this.debugMode) {
              chunks.push({ 
                type: 'text', 
                text: `[DEBUG] Unknown JSON structure, treating as text: ${JSON.stringify(parsed).substring(0, 200)}...` 
              })
            }
            segment = { type: 'text', text: data }
          }
        } catch (e) {
          if (this.debugMode) {
            chunks.push({ 
              type: 'text', 
              text: `[DEBUG] Failed to parse JSON, treating as plain text: ${data.substring(0, 200)}...` 
            })
          }
          segment = { type: 'text', text: data }
        }
        
        if (!isMetadata && segment) {
          chunks.push(segment)
          if (resolver) {
            resolver({ value: chunks.shift()!, done: false })
            resolver = null
          }
        } else if (isMetadata && this.debugMode && chunks.length > 0) {
          if (resolver) {
            resolver({ value: chunks.shift()!, done: false })
            resolver = null
          }
        }
      }
      
      this.eventSource.onerror = (error) => {
        console.error('SSE Error:', error)
        this.close()
        reject(new Error('Connection to server lost'))
      }
      
      resolve(generator)
    })
  }
  
  close() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }
}