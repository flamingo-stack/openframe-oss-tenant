// Tool execution message types
export interface ToolExecutionData {
  type: "EXECUTING_TOOL" | "EXECUTED_TOOL"
  integratedToolType: string
  toolFunction: string
  parameters?: Record<string, any>
  result?: string
  success?: boolean
}

// Approval request data type
export interface ApprovalRequestData {
  command: string
  description?: string
  explanation?: string
  approvalType?: string
  requestId?: string
}

// Message segment types
export type MessageSegment = 
  | { type: 'text'; text: string }
  | { type: 'tool_execution'; data: ToolExecutionData }
  | { 
      type: 'approval_request'
      data: ApprovalRequestData
      status?: 'pending' | 'approved' | 'rejected'
      onApprove?: (requestId?: string) => void
      onReject?: (requestId?: string) => void
    }

// Message content can be a simple string (backward compatible) or structured segments
export type MessageContent = string | MessageSegment[]

// Enhanced message interface
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'error'
  name?: string
  content: MessageContent
  timestamp: Date
  avatar?: string
}

// Helper function to check if content is structured
export function isStructuredContent(content: MessageContent): content is MessageSegment[] {
  return Array.isArray(content)
}

// Helper function to normalize content to structured format
export function normalizeContent(content: MessageContent): MessageSegment[] {
  if (typeof content === 'string') {
    return content ? [{ type: 'text', text: content }] : []
  }
  return content
}

// SSE event data types
export interface TextEventData {
  type: 'TEXT'
  text: string
}

export interface ToolExecutionEventData {
  type: 'EXECUTING_TOOL' | 'EXECUTED_TOOL'
  integratedToolType: string
  toolFunction: string
  parameters?: Record<string, any>
  result?: string
  success?: boolean
}

export type SSEEventData = TextEventData | ToolExecutionEventData