import type { ChatType, OwnerType } from '../../tickets/constants'

export interface Message {
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

export interface MessageConnection {
  edges: Array<{
    cursor: string
    node: Message
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
  messages: Message[]
  pageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor?: string
    endCursor?: string
  }
}