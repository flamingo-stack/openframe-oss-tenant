import { MessageSegment } from '../types/chat.types'

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
  
  // Mock response with tool execution
  private async *streamResponseWithTool(message: string): AsyncGenerator<MessageSegment> {
    // Initial text
    yield { type: 'text', text: "Let me check the system processes for you. " }
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Tool execution starting
    yield {
      type: 'tool_execution',
      data: {
        type: 'EXECUTING_TOOL',
        integratedToolType: 'FLEET_MDM',
        toolFunction: 'executeQuery',
        parameters: {
          query: "SELECT name, user_time + system_time as cpu_time FROM processes ORDER BY cpu_time DESC LIMIT 5;"
        }
      }
    }
    
    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Tool execution completed
    yield {
      type: 'tool_execution',
      data: {
        type: 'EXECUTED_TOOL',
        integratedToolType: 'FLEET_MDM',
        toolFunction: 'executeQuery',
        parameters: {
          query: "SELECT name, user_time + system_time as cpu_time FROM processes ORDER BY cpu_time DESC LIMIT 5;"
        },
        result: "Query executed successfully:\n```\n{cpu_time=67155621, name=kernel_task}\n{cpu_time=28340587, name=WindowServer}\n{cpu_time=8903619, name=com.apple.Virtualization.VirtualMachine}\n{cpu_time=8506261, name=GatherV2 Helper (Renderer)}\n{cpu_time=6332274, name=Google Chrome Helper}\n```",
        success: true
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Follow-up text
    yield { type: 'text', text: "\n\nBased on the results, your top CPU-consuming processes are:\n1. **kernel_task** - This is normal, it manages system resources\n2. **WindowServer** - Handles display rendering\n3. **Virtual Machine** - You have virtualization software running\n\nThese appear to be normal system processes. " }
    
    // Another tool execution
    if (message.toLowerCase().includes('memory')) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      yield {
        type: 'tool_execution',
        data: {
          type: 'EXECUTING_TOOL',
          integratedToolType: 'FLEET_MDM',
          toolFunction: 'executeQuery',
          parameters: {
            query: "SELECT name, resident_size FROM processes ORDER BY resident_size DESC LIMIT 5;"
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      yield {
        type: 'tool_execution',
        data: {
          type: 'EXECUTED_TOOL',
          integratedToolType: 'FLEET_MDM',
          toolFunction: 'executeQuery',
          parameters: {
            query: "SELECT name, resident_size FROM processes ORDER BY resident_size DESC LIMIT 5;"
          },
          result: "Query executed successfully:\n```\n{resident_size=2147483648, name=Chrome}\n{resident_size=1073741824, name=Slack}\n{resident_size=536870912, name=Code}\n{resident_size=268435456, name=Finder}\n{resident_size=134217728, name=Mail}\n```",
          success: true
        }
      }
      
      yield { type: 'text', text: "\n\nYour top memory-consuming applications are Chrome and Slack. Consider closing some tabs or restarting these applications if you're experiencing slowdowns." }
    }
  }
  
  async *streamResponse(message: string): AsyncGenerator<MessageSegment> {
    // 50% chance to show tool execution for demo
    const showToolExecution = Math.random() > 0.5 || message.toLowerCase().includes('process') || message.toLowerCase().includes('system')
    
    if (showToolExecution) {
      yield* this.streamResponseWithTool(message)
    } else {
      // Regular text response - stream it character by character
      await new Promise(resolve => setTimeout(resolve, 500))
      
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
      let accumulated = ''
      for (let i = 0; i < response.length; i += chunkSize) {
        const chunk = response.slice(i, i + chunkSize)
        accumulated += chunk
        yield { type: 'text', text: chunk }
        // Small delay between chunks to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 20))
      }
    }
  }
  
  // Simulate random error for testing
  async *streamResponseWithError(message: string): AsyncGenerator<MessageSegment> {
    const shouldError = Math.random() > 0.8 // 20% chance of error
    
    if (shouldError) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      throw new Error('Connection lost. Please check your network and try again.')
    }
    
    yield* this.streamResponse(message)
  }
}