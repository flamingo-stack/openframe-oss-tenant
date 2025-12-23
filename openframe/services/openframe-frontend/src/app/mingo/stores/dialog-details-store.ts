import { create } from 'zustand'
import { Dialog, Message, MessageConnection } from '../types/dialog.types'
import { GET_DIALOG_QUERY, GET_DIALOG_MESSAGES_QUERY } from '../queries/dialogs-queries'
import { apiClient } from '@lib/api-client'

interface DialogResponse {
  dialog: Dialog
}

interface MessagesResponse {
  messages: MessageConnection
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

interface DialogDetailsStore {
  // Current dialog state
  currentDialogId: string | null
  currentDialog: Dialog | null
  currentMessages: Message[]
  
  // Loading states
  isLoadingDialog: boolean
  isLoadingMessages: boolean
  loadingDialogId: string | null
  loadingMessagesId: string | null
  
  // Error states
  dialogError: string | null
  messagesError: string | null
  
  // Pagination
  hasMoreMessages: boolean
  messagesCursor: string | null
  newestMessageCursor: string | null
  
  // Actions
  fetchDialog: (dialogId: string) => Promise<Dialog | null>
  fetchMessages: (dialogId: string, append?: boolean, pollNew?: boolean) => Promise<void>
  loadMore: () => Promise<void>
  clearCurrent: () => void
  updateDialogStatus: (status: string) => void
  ingestRealtimeEvent: (payload: unknown) => void
}

export const useDialogDetailsStore = create<DialogDetailsStore>((set, get) => ({
  currentDialogId: null,
  currentDialog: null,
  currentMessages: [],
  
  isLoadingDialog: false,
  isLoadingMessages: false,
  loadingDialogId: null,
  loadingMessagesId: null,
  
  dialogError: null,
  messagesError: null,
  
  hasMoreMessages: false,
  messagesCursor: null,
  newestMessageCursor: null,
  
  fetchDialog: async (dialogId: string) => {
    const state = get()

    if (state.currentDialogId !== dialogId || state.currentDialog === null) {
      set({ 
        isLoadingDialog: true, 
        loadingDialogId: dialogId,
        dialogError: null,
        currentDialogId: dialogId 
      })
    }
    
    try {
      const response = await apiClient.post<GraphQLResponse<DialogResponse>>('/chat/graphql', {
        query: GET_DIALOG_QUERY,
        variables: { id: dialogId }
      })
      
      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }
      
      const dialog = response.data?.data?.dialog || null
      
      set((s) => ({ 
        currentDialog: dialog,
        isLoadingDialog: s.currentDialogId !== dialogId ? s.isLoadingDialog : false,
        loadingDialogId: s.currentDialogId !== dialogId ? s.loadingDialogId : null,
        dialogError: dialog ? null : 'Dialog not found'
      }))
      
      return dialog
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dialog'
      set({ 
        dialogError: errorMessage,
        isLoadingDialog: false,
        loadingDialogId: null,
        currentDialog: null
      })
      throw error
    }
  },
  
  fetchMessages: async (dialogId: string, append = false, pollNew = false) => {
    const state = get()
    
    if (state.isLoadingMessages && state.loadingMessagesId === dialogId) {
      return
    }
    
    if (!append && !pollNew) {
      set({ 
        isLoadingMessages: true, 
        loadingMessagesId: dialogId,
        messagesError: null 
      })
    }
    
    try {
      let cursor: string | null = null
      let limit = 50
      
      if (append) {
        cursor = state.messagesCursor
      } else if (pollNew) {
        cursor = state.newestMessageCursor
        limit = 10 
      }
      
      const response = await apiClient.post<GraphQLResponse<MessagesResponse>>('/chat/graphql', {
        query: GET_DIALOG_MESSAGES_QUERY,
        variables: {
          dialogId,
          cursor,
          limit
        }
      })
      
      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }
      
      const graphqlResponse = response.data
      
      if (graphqlResponse?.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred')
      }
      
      const connection = graphqlResponse?.data?.messages
      const newMessages = (connection?.edges || []).map(edge => edge.node)
      const hasNew = newMessages.length > 0

      set(s => {
        let updatedMessages: Message[]
        let newNewestCursor = s.newestMessageCursor
        
        if (append) {
          const existingIds = new Set(s.currentMessages.map(m => m.id))
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.id))
          updatedMessages = uniqueNew.length ? [...s.currentMessages, ...uniqueNew] : s.currentMessages
        } else if (pollNew) {
          const existingIds = new Set(s.currentMessages.map(m => m.id))
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.id))
          
          if (uniqueNew.length > 0) {
            updatedMessages = [...s.currentMessages, ...uniqueNew]
            
            if (connection?.edges && connection.edges.length > 0) {
              newNewestCursor = connection.edges[connection.edges.length - 1].cursor
            }
          } else {
            updatedMessages = s.currentMessages
          }
        } else {
          updatedMessages = newMessages
          
          if (connection?.edges && connection.edges.length > 0) {
            newNewestCursor = connection.edges[connection.edges.length - 1].cursor
          }
        }
        
        return {
          currentMessages: updatedMessages,
          hasMoreMessages: connection?.pageInfo?.hasNextPage || false,
          messagesCursor: connection?.pageInfo?.endCursor || s.messagesCursor,
          newestMessageCursor: newNewestCursor,
          isLoadingMessages: (append || pollNew) ? s.isLoadingMessages : false,
          loadingMessagesId: (append || pollNew) ? s.loadingMessagesId : null
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages'
      set({ 
        messagesError: errorMessage,
        isLoadingMessages: false,
        loadingMessagesId: null
      })
      throw error
    }
  },
  
  loadMore: async () => {
    const state = get()
    if (state.currentDialogId && state.hasMoreMessages && !state.isLoadingMessages) {
      return state.fetchMessages(state.currentDialogId, true)
    }
  },
  
  clearCurrent: () => set({
    currentDialogId: null,
    currentDialog: null,
    currentMessages: [],
    messagesCursor: null,
    newestMessageCursor: null,
    hasMoreMessages: false,
    dialogError: null,
    messagesError: null,
    loadingDialogId: null,
    loadingMessagesId: null
  }),
  
  updateDialogStatus: (status: string) => {
    const state = get()
    if (state.currentDialog) {
      set({
        currentDialog: {
          ...state.currentDialog,
          status: status as any
        }
      })
    }
  },

  ingestRealtimeEvent: (payload: unknown) => {
    const state = get()
    if (!state.currentDialogId) return

    const asAny = payload as any
    const isMessageObject =
      asAny &&
      typeof asAny === 'object' &&
      typeof asAny.id === 'string' &&
      typeof asAny.dialogId === 'string' &&
      asAny.messageData != null &&
      asAny.owner != null

    const nowIso = new Date().toISOString()
    const message: Message | null = isMessageObject
      ? (asAny as Message)
      : (() => {
          const type = typeof asAny?.type === 'string' ? asAny.type : null
          if (!type) return null

          if (type === 'MESSAGE_START' || type === 'MESSAGE_END') return null

          const id = `nats-${Date.now()}-${Math.random().toString(16).slice(2)}`
          const base: Message = {
            id,
            dialogId: state.currentDialogId,
            chatType: 'CLIENT',
            dialogMode: 'DEFAULT',
            createdAt: nowIso,
            owner: { type: 'ASSISTANT', model: '' } as any,
            messageData: { type: 'TEXT', text: '' } as any,
          }

          if (type === 'TEXT') {
            return { ...base, messageData: { type: 'TEXT', text: String(asAny.text ?? '') } as any }
          }
          if (type === 'EXECUTING_TOOL') {
            return {
              ...base,
              messageData: {
                type: 'EXECUTING_TOOL',
                integratedToolType: String(asAny.integratedToolType ?? ''),
                toolFunction: String(asAny.toolFunction ?? ''),
                parameters: asAny.parameters,
              } as any,
            }
          }
          if (type === 'EXECUTED_TOOL') {
            return {
              ...base,
              messageData: {
                type: 'EXECUTED_TOOL',
                integratedToolType: String(asAny.integratedToolType ?? ''),
                toolFunction: String(asAny.toolFunction ?? ''),
                result: asAny.result,
                success: asAny.success,
              } as any,
            }
          }
          if (type === 'ERROR') {
            return {
              ...base,
              messageData: {
                type: 'ERROR',
                error: String(asAny.error ?? 'Error'),
                details: typeof asAny.details === 'string' ? asAny.details : undefined,
              } as any,
            }
          }
          if (type === 'APPROVAL_REQUEST') {
            return {
              ...base,
              messageData: {
                type: 'APPROVAL_REQUEST',
                approvalType: String(asAny.approvalType ?? 'USER'),
                command: String(asAny.command ?? ''),
                approvalRequestId: String(asAny.approvalRequestId ?? ''),
                description: asAny.description,
                risk: asAny.risk,
                details: asAny.details,
              } as any,
            }
          }
          if (type === 'APPROVAL_RESULT') {
            return {
              ...base,
              messageData: {
                type: 'APPROVAL_RESULT',
                approvalRequestId: String(asAny.approvalRequestId ?? ''),
                approved: Boolean(asAny.approved),
                approvalType: String(asAny.approvalType ?? 'USER'),
              } as any,
            }
          }

          return null
        })()

    if (!message) return
    if (message.dialogId !== state.currentDialogId) return

    set((s) => {
      const existingIds = new Set(s.currentMessages.map((m) => m.id))
      if (existingIds.has(message.id)) return s
      
      if (message.messageData?.type === 'TEXT' && 
          s.currentMessages.length > 0) {
        const lastMessage = s.currentMessages[s.currentMessages.length - 1]
        
        if (lastMessage.messageData?.type === 'TEXT' && 
            lastMessage.owner?.type === 'ASSISTANT') {
          const updatedMessages = [...s.currentMessages]
          const lastMessageData = lastMessage.messageData as any
          const messageData = message.messageData as any
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            messageData: {
              ...lastMessage.messageData,
              text: (lastMessageData.text || '') + (messageData.text || '')
            }
          }
          return { currentMessages: updatedMessages }
        }
      }
      
      return { currentMessages: [...s.currentMessages, message] }
    })
  },
}))