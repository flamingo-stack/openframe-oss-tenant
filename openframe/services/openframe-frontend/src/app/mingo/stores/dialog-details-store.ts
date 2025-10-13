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
  
  // Actions
  fetchDialog: (dialogId: string) => Promise<Dialog | null>
  fetchMessages: (dialogId: string, append?: boolean) => Promise<void>
  loadMore: () => Promise<void>
  clearCurrent: () => void
  updateDialogStatus: (status: string) => void
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
  
  fetchDialog: async (dialogId: string) => {
    const state = get()

    if (state.isLoadingDialog && state.loadingDialogId === dialogId) {
      return null
    }
    
    set({ 
      isLoadingDialog: true, 
      loadingDialogId: dialogId,
      dialogError: null,
      currentDialogId: dialogId 
    })
    
    try {
      const response = await apiClient.post<GraphQLResponse<DialogResponse>>('/chat/graphql', {
        query: GET_DIALOG_QUERY,
        variables: { id: dialogId }
      })
      
      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }
      
      const dialog = response.data?.data?.dialog || null
      
      set({ 
        currentDialog: dialog,
        isLoadingDialog: false,
        loadingDialogId: null,
        dialogError: dialog ? null : 'Dialog not found'
      })
      
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
  
  fetchMessages: async (dialogId: string, append = false) => {
    const state = get()
    
    if (state.isLoadingMessages && state.loadingMessagesId === dialogId) {
      return
    }
    
    set({ 
      isLoadingMessages: true, 
      loadingMessagesId: dialogId,
      messagesError: null 
    })
    
    try {
      const response = await apiClient.post<GraphQLResponse<MessagesResponse>>('/chat/graphql', {
        query: GET_DIALOG_MESSAGES_QUERY,
        variables: {
          dialogId,
          cursor: append ? state.messagesCursor : null,
          limit: 50
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
      
      let updatedMessages: Message[]
      if (append) {
        updatedMessages = [...state.currentMessages, ...newMessages]
      } else {
        updatedMessages = newMessages
      }
      
      set({
        currentMessages: updatedMessages,
        hasMoreMessages: connection?.pageInfo?.hasNextPage || false,
        messagesCursor: connection?.pageInfo?.endCursor || null,
        isLoadingMessages: false,
        loadingMessagesId: null
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
  }
}))