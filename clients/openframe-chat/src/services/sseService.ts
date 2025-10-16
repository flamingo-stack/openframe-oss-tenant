import { MessageSegment } from '../types/chat.types'

export class SSEService {
  private eventSource: EventSource | null = null
  private url: string
  
  constructor(url: string) {
    this.url = url
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
      
      this.eventSource.onmessage = (event) => {
        const data = event.data
        
        if (data === '[DONE]') {
          this.close()
          if (resolver) {
            resolver({ value: undefined, done: true })
          }
        } else {
          let segment: MessageSegment
          try {
            const parsed = JSON.parse(data)
            
            if (parsed.type === 'EXECUTING_TOOL' || parsed.type === 'EXECUTED_TOOL') {
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
              segment = { type: 'text', text: data }
            }
          } catch {
            segment = { type: 'text', text: data }
          }
          
          chunks.push(segment)
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