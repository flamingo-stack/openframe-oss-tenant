import { GraphQLClient, gql, type RequestDocument, type Variables } from 'graphql-request'
import { tokenService } from './tokenService'
import type { 
  MessageOwner,
  MessageData as CoreMessageData,
  HistoricalMessage
} from '@flamingo-stack/openframe-frontend-core'

export interface ResumableDialog {
  id: string
  title: string
  status: string
  createdAt: string
  statusUpdatedAt: string | null
  resolvedAt: string | null
  aiResolutionSuggestedAt: string | null
  rating: {
    id: string
    dialogId: string
    createdAt: string
  } | null
}

export type DialogOwner = MessageOwner

export type MessageData = CoreMessageData

export interface Message extends HistoricalMessage {
  dialogMode: string
}

export interface MessageEdge {
  cursor: string
  node: Message
}

export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

export interface MessagesConnection {
  edges: MessageEdge[]
  pageInfo: PageInfo
}

const GET_RESUMABLE_DIALOG_QUERY = gql`
  query GetDialog {
    resumableDialog {
      id
      title
      status
      createdAt
      statusUpdatedAt
      resolvedAt
      aiResolutionSuggestedAt
      rating {
        id
        dialogId
        createdAt
      }
    }
  }
`

const GET_DIALOG_MESSAGES_QUERY = gql`
  query GetAllMessages($dialogId: ID!, $chatType: ChatType, $cursor: String, $limit: Int) {
    messages(
      dialogId: $dialogId
      chatType: $chatType
      pagination: { cursor: $cursor, limit: $limit }
    ) {
      edges {
        cursor
        node {
          id
          dialogId
          chatType
          dialogMode
          createdAt
          owner {
            type
          }
          messageData {
            type
            ... on TextData {
              text
            }

            ... on ExecutingToolData {
              type
              integratedToolType
              toolFunction
              parameters
              requiresApproval
              approvalStatus
            }

            ... on ExecutedToolData {
              type
              integratedToolType
              toolFunction
              result
              success
              requiredApproval
              approvalStatus
            }

            ... on ApprovalRequestData {
              type  
              approvalRequestId
              approvalType
              command
              explanation
            }

            ... on ApprovalResultData {
              type
              approvalRequestId
              approved
              approvalType
            }

            ... on ErrorData {
              error
              details
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`

export class DialogGraphQLService {
  private graphQLClient: GraphQLClient | null = null
  private currentEndpoint: string | null = null

  private async initializeClient(): Promise<GraphQLClient> {
    if (this.graphQLClient && this.currentEndpoint) {
      const token = tokenService.getCurrentToken()
      if (token) {
        this.graphQLClient.setHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        })
      }
      return this.graphQLClient
    }

    const baseUrl = tokenService.getCurrentApiBaseUrl()
    const token = tokenService.getCurrentToken()
    
    if (!baseUrl || !token) {
      throw new Error('API base URL or token not available')
    }

    const endpoint = `${baseUrl}/chat/graphql`
    
    this.graphQLClient = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      fetch: fetch,
    })
    
    this.currentEndpoint = endpoint
    return this.graphQLClient
  }

  private async request<T>(
    document: RequestDocument,
    variables?: Variables
  ): Promise<T> {
    const client = await this.initializeClient()
    return client.request<T>(document, variables)
  }

  async getResumableDialog(): Promise<ResumableDialog | null> {
    try {
      await tokenService.ensureTokenReady()
      const data = await this.request<{ resumableDialog: ResumableDialog | null }>(
        GET_RESUMABLE_DIALOG_QUERY
      )
      return data.resumableDialog
    } catch (error) {
      console.error('Failed to fetch resumable dialog:', error)
      return null
    }
  }

  async getDialogMessages(
    dialogId: string,
    cursor?: string | null,
    limit: number = 100
  ): Promise<MessagesConnection | null> {
    try {
      await tokenService.ensureTokenReady()
      
      const allEdges: MessageEdge[] = []
      let currentCursor = cursor
      let hasNextPage = true
      let pageInfo: PageInfo | null = null
      
      while (hasNextPage) {
        const data = await this.request<{ messages: MessagesConnection }>(
          GET_DIALOG_MESSAGES_QUERY,
          { dialogId, chatType: 'CLIENT_CHAT', cursor: currentCursor, limit }
        )
        
        if (!data.messages) {
          break
        }
        
        allEdges.push(...data.messages.edges)
        pageInfo = data.messages.pageInfo
        hasNextPage = data.messages.pageInfo.hasNextPage
        currentCursor = data.messages.pageInfo.endCursor
      }
      
      return {
        edges: allEdges,
        pageInfo: pageInfo || {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null
        }
      }
    } catch (error) {
      console.error('Failed to fetch dialog messages:', error)
      return null
    }
  }

  dispose(): void {
    this.graphQLClient = null
    this.currentEndpoint = null
  }
}

export const dialogGraphQLService = new DialogGraphQLService()