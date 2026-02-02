import type { ChatType, OwnerType } from '../../tickets/constants'
import type { MessageContent, AssistantType } from '@flamingo-stack/openframe-frontend-core'

// GraphQL Message format (for historical/stored messages)
export interface GraphQLMessage {
  id: string
  dialogId: string
  chatType: ChatType
  dialogMode: string
  createdAt: string
  owner: {
    type: OwnerType
    model?: string
  }
  messageData: any
}

// Core library Message format (for real-time/display messages)
export interface CoreMessage {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: MessageContent
  name?: string
  assistantType?: AssistantType
  timestamp?: Date
  avatar?: string | null
}

// Store only uses CoreMessage format
export type Message = CoreMessage

export interface MessageConnection {
  edges: Array<{
    cursor: string
    node: GraphQLMessage
  }>
  pageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor?: string
    endCursor?: string
  }
}

export interface MessagesResponse {
  data: {
    messages: MessageConnection
  }
}

export interface MessagePage {
  messages: GraphQLMessage[]
  pageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor?: string
    endCursor?: string
  }
}

// Helper type guards for GraphQL processing
export function isGraphQLMessage(message: any): message is GraphQLMessage {
  return 'messageData' in message
}

export function isCoreMessage(message: any): message is CoreMessage {
  return 'content' in message
}