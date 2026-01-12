import { create } from 'zustand'
import { Dialog, Message, MessageConnection } from '../types/dialog.types'
import { GET_DIALOG_QUERY, GET_DIALOG_MESSAGES_QUERY } from '../queries/dialogs-queries'
import { apiClient } from '@lib/api-client'
import {
  CHAT_TYPE,
  MESSAGE_TYPE,
  OWNER_TYPE,
  type NatsMessageType
} from '../constants'

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
  adminMessages: Message[]
  
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
  
  // Typing indicators
  isClientChatTyping: boolean
  isAdminChatTyping: boolean
  
  // Actions
  fetchDialog: (dialogId: string) => Promise<Dialog | null>
  fetchMessages: (dialogId: string, append?: boolean, pollNew?: boolean) => Promise<void>
  loadMore: () => Promise<void>
  clearCurrent: () => void
  updateDialogStatus: (status: string) => void
  ingestRealtimeEvent: (payload: unknown, messageType: 'message' | 'admin-message') => void
}

export const useDialogDetailsStore = create<DialogDetailsStore>((set, get) => ({
  currentDialogId: null,
  currentDialog: null,
  currentMessages: [],
  adminMessages: [],
  
  isLoadingDialog: false,
  isLoadingMessages: false,
  loadingDialogId: null,
  loadingMessagesId: null,
  
  dialogError: null,
  messagesError: null,
  
  hasMoreMessages: false,
  messagesCursor: null,
  newestMessageCursor: null,
  
  isClientChatTyping: false,
  isAdminChatTyping: false,
  
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
        const clientMessages = newMessages.filter(m => m.chatType === 'CLIENT_CHAT')
        const adminMessages = newMessages.filter(m => m.chatType === 'ADMIN_AI_CHAT')
        
        let updatedClientMessages: Message[]
        let updatedAdminMessages: Message[]
        let newNewestCursor = s.newestMessageCursor
        
        if (append) {
          // For client messages
          const existingClientIds = new Set(s.currentMessages.map(m => m.id))
          const uniqueNewClient = clientMessages.filter(m => !existingClientIds.has(m.id))
          updatedClientMessages = uniqueNewClient.length ? [...s.currentMessages, ...uniqueNewClient] : s.currentMessages
          
          // For admin messages
          const existingAdminIds = new Set(s.adminMessages.map(m => m.id))
          const uniqueNewAdmin = adminMessages.filter(m => !existingAdminIds.has(m.id))
          updatedAdminMessages = uniqueNewAdmin.length ? [...s.adminMessages, ...uniqueNewAdmin] : s.adminMessages
        } else if (pollNew) {
          // For client messages
          const existingClientIds = new Set(s.currentMessages.map(m => m.id))
          const uniqueNewClient = clientMessages.filter(m => !existingClientIds.has(m.id))
          
          // For admin messages
          const existingAdminIds = new Set(s.adminMessages.map(m => m.id))
          const uniqueNewAdmin = adminMessages.filter(m => !existingAdminIds.has(m.id))
          
          if (uniqueNewClient.length > 0 || uniqueNewAdmin.length > 0) {
            updatedClientMessages = [...s.currentMessages, ...uniqueNewClient]
            updatedAdminMessages = [...s.adminMessages, ...uniqueNewAdmin]
            
            if (connection?.edges && connection.edges.length > 0) {
              newNewestCursor = connection.edges[connection.edges.length - 1].cursor
            }
          } else {
            updatedClientMessages = s.currentMessages
            updatedAdminMessages = s.adminMessages
          }
        } else {
          updatedClientMessages = clientMessages
          updatedAdminMessages = adminMessages
          
          if (connection?.edges && connection.edges.length > 0) {
            newNewestCursor = connection.edges[connection.edges.length - 1].cursor
          }
        }
        
        return {
          currentMessages: updatedClientMessages,
          adminMessages: updatedAdminMessages,
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
    adminMessages: [],
    messagesCursor: null,
    newestMessageCursor: null,
    hasMoreMessages: false,
    dialogError: null,
    messagesError: null,
    loadingDialogId: null,
    loadingMessagesId: null,
    isClientChatTyping: false,
    isAdminChatTyping: false
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

  ingestRealtimeEvent: (payload: unknown, messageType: NatsMessageType) => {
    const state = get()
    if (!state.currentDialogId) return

    const asAny = payload as any
    
    const TEXT_TYPE = MESSAGE_TYPE.TEXT
    const ASSISTANT_TYPE = OWNER_TYPE.ASSISTANT
    const ADMIN_CHAT_TYPE = CHAT_TYPE.ADMIN
    
    if (asAny?.type === MESSAGE_TYPE.MESSAGE_START) {
      const isAdmin = messageType === 'admin-message'
      set(isAdmin ? { isAdminChatTyping: true } : { isClientChatTyping: true })
      return
    }
    
    if (asAny?.type === MESSAGE_TYPE.MESSAGE_END) {
      const isAdmin = messageType === 'admin-message'
      set(isAdmin ? { isAdminChatTyping: false } : { isClientChatTyping: false })
      return
    }
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

          const id = `nats-${Date.now()}-${Math.random().toString(16).slice(2)}`
          const chatType = messageType === 'admin-message' ? 'ADMIN_AI_CHAT' : 'CLIENT_CHAT'
          
          const isUserMessage = type === 'MESSAGE_REQUEST'
          let owner: any
          
          if (isUserMessage) {
            if (messageType === 'admin-message') {
              owner = { type: 'ADMIN' as const, userId: '' } as any
            } else {
              owner = { type: 'CLIENT' as const, machineId: '' } as any
            }
          } else {
            owner = { type: 'ASSISTANT' as const, model: '' } as any
          }
          
          const base: Message = {
            id,
            dialogId: state.currentDialogId,
            chatType: chatType as any,
            dialogMode: 'DEFAULT',
            createdAt: nowIso,
            owner,
            messageData: { type: 'TEXT', text: '' } as any,
          }

          if (type === 'MESSAGE_REQUEST') {
            return { ...base, messageData: { type: 'TEXT', text: String(asAny.text ?? '') } as any }
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
                explanation: asAny.explanation,
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

    const isAdminMessage = message.chatType === ADMIN_CHAT_TYPE
    const isTextMessage = message.messageData?.type === TEXT_TYPE
    const isAssistantOwner = message.owner?.type === ASSISTANT_TYPE
    
    if (isAdminMessage) {
      set((s) => {
        const existingIds = new Set(s.adminMessages.map((m) => m.id))
        if (existingIds.has(message.id)) return s
        
        if (isTextMessage && 
            s.adminMessages.length > 0 &&
            isAssistantOwner) {
          const lastMessage = s.adminMessages[s.adminMessages.length - 1]
          const lastIsText = lastMessage.messageData?.type === TEXT_TYPE
          const lastIsAssistant = lastMessage.owner?.type === ASSISTANT_TYPE
          
          if (lastIsText && lastIsAssistant) {
            const updatedMessages = [...s.adminMessages]
            const lastMessageData = lastMessage.messageData as any
            const messageData = message.messageData as any
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              messageData: {
                ...lastMessage.messageData,
                text: (lastMessageData.text || '') + (messageData.text || '')
              }
            }
            return { adminMessages: updatedMessages }
          }
        }
        
        return { adminMessages: [...s.adminMessages, message] }
      })
    } else {
      set((s) => {
        const existingIds = new Set(s.currentMessages.map((m) => m.id))
        if (existingIds.has(message.id)) return s
        
        if (isTextMessage && 
            s.currentMessages.length > 0 &&
            isAssistantOwner) {
          const lastMessage = s.currentMessages[s.currentMessages.length - 1]
          const lastIsText = lastMessage.messageData?.type === TEXT_TYPE
          const lastIsAssistant = lastMessage.owner?.type === ASSISTANT_TYPE
          
          if (lastIsText && lastIsAssistant) {
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
    }
  },
}))