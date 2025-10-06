export class MockChatService {
  private responses = [
    "I'll help you diagnose why your computer is running slow. Let me check a few things:\n\n1. First, I'll analyze your system resources\n2. Check for any background processes consuming high CPU\n3. Review available disk space and memory usage\n\nRunning diagnostics now...",
    "I'm checking for available updates on your system. This includes:\n\n• Operating system updates\n• Driver updates\n• Security patches\n• Application updates\n\nScanning for updates...",
    "Let me troubleshoot your internet connection:\n\n1. Testing network connectivity\n2. Checking DNS resolution\n3. Measuring connection speed\n4. Identifying potential issues\n\nRunning network diagnostics...",
    "I'll help you access your files. Let me check:\n\n• File permissions\n• Drive health status\n• Recent system changes\n• File system integrity\n\nScanning file system...",
    "I can help you reset your password. For security, I'll need to:\n\n1. Verify your identity\n2. Check account recovery options\n3. Guide you through the reset process\n\nInitiating password recovery protocol..."
  ]
  
  private getRandomResponse(): string {
    return this.responses[Math.floor(Math.random() * this.responses.length)]
  }
  
  async *streamResponse(message: string): AsyncGenerator<string> {
    // Simulate initial delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Get response based on message content
    let response = this.getRandomResponse()
    
    // Try to match with quick actions
    if (message.toLowerCase().includes('slow')) {
      response = this.responses[0]
    } else if (message.toLowerCase().includes('update')) {
      response = this.responses[1]
    } else if (message.toLowerCase().includes('internet')) {
      response = this.responses[2]
    } else if (message.toLowerCase().includes('file')) {
      response = this.responses[3]
    } else if (message.toLowerCase().includes('password')) {
      response = this.responses[4]
    }
    
    // Stream response character by character with chunks
    const chunkSize = 3 // Characters per chunk
    for (let i = 0; i < response.length; i += chunkSize) {
      yield response.slice(i, i + chunkSize)
      // Small delay between chunks to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }
  
  // Simulate random error for testing
  async *streamResponseWithError(message: string): AsyncGenerator<string> {
    const shouldError = Math.random() > 0.8 // 20% chance of error
    
    if (shouldError) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      throw new Error('Connection lost. Please check your network and try again.')
    }
    
    yield* this.streamResponse(message)
  }
}