// Tool execution message types
export interface ToolExecutionData {
  type: "EXECUTING_TOOL" | "EXECUTED_TOOL"
  integratedToolType: string
  toolFunction: string
  parameters?: Record<string, any>
  result?: string
  success?: boolean
}

// Message segment types
export type MessageSegment = 
  | { type: 'text'; text: string }
  | { type: 'tool_execution'; data: ToolExecutionData }

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

// Connection state types
export enum ConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  CLOSED = 'closed'
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number
  baseDelay: number        // Initial delay in milliseconds
  maxDelay: number         // Maximum delay in milliseconds
  jitterRatio: number      // 0-1, percentage of delay to randomize
  connectionTimeout: number // Timeout for initial connection in milliseconds
}

// Error classifications
export enum ErrorType {
  NETWORK = 'network',      // Network/connection errors - retry
  AUTH = 'auth',           // Authentication errors - don't retry
  SERVER = 'server',       // Server errors (5xx) - retry with backoff
  CLIENT = 'client',       // Client errors (4xx) - don't retry
  TIMEOUT = 'timeout',     // Connection timeout - retry
  UNKNOWN = 'unknown'      // Unknown errors - retry cautiously
}

export interface ClassifiedError {
  type: ErrorType
  message: string
  status?: number
  shouldRetry: boolean
  originalError?: Error
}

// Connection event callbacks
export type ConnectionStateCallback = (state: ConnectionState, error?: ClassifiedError) => void
export type RetryCallback = (attempt: number, delay: number) => void