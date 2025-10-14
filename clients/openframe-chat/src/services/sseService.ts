export class SSEService {
  private eventSource: EventSource | null = null
  private url: string
  
  constructor(url: string) {
    this.url = url
  }
  
  async *streamMessage(message: string): AsyncGenerator<string> {
    const params = new URLSearchParams({ message })
    const sseUrl = `${this.url}?${params.toString()}`
    
    return new Promise<AsyncGenerator<string>>((resolve, reject) => {
      this.eventSource = new EventSource(sseUrl)
      
      const chunks: string[] = []
      let resolver: ((value: IteratorResult<string>) => void) | null = null
      
      const generator: AsyncGenerator<string> = {
        async next() {
          return new Promise<IteratorResult<string>>((res) => {
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
          chunks.push(data)
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