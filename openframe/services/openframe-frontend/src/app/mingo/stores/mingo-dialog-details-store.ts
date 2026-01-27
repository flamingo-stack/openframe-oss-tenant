import { create } from 'zustand'
import type { DialogNode, Message } from '../types'

interface MingoDialogDetailsStore {
  // Current dialog state
  currentDialogId: string | null
  currentDialog: DialogNode | null
  adminMessages: Message[]
  
  // Loading states
  isLoadingDialog: boolean
  isLoadingMessages: boolean
  
  // Error states
  dialogError: string | null
  messagesError: string | null
  
  // Pagination
  hasMoreMessages: boolean
  messagesCursor: string | null
  newestMessageCursor: string | null
  
  // Typing indicators
  isAdminChatTyping: boolean
  
  // Actions
  setCurrentDialogId: (dialogId: string | null) => void
  setCurrentDialog: (dialog: DialogNode | null) => void
  setAdminMessages: (messages: Message[]) => void
  addAdminMessages: (messages: Message[]) => void
  clearCurrent: () => void
  updateDialogStatus: (status: string) => void
  addRealtimeMessage: (message: Message) => void
  updateRealtimeMessage: (messageId: string, message: Message) => void
  setTypingIndicator: (typing: boolean) => void
  setLoadingDialog: (loading: boolean) => void
  setLoadingMessages: (loading: boolean) => void
  setDialogError: (error: string | null) => void
  setMessagesError: (error: string | null) => void
  setPagination: (hasMore: boolean, cursor: string | null, newestCursor: string | null) => void
}

export const useMingoDialogDetailsStore = create<MingoDialogDetailsStore>((set, get) => ({
  currentDialogId: null,
  currentDialog: null,
  adminMessages: [],
  
  isLoadingDialog: false,
  isLoadingMessages: false,
  
  dialogError: null,
  messagesError: null,
  
  hasMoreMessages: false,
  messagesCursor: null,
  newestMessageCursor: null,
  
  isAdminChatTyping: false,

  setCurrentDialogId: (dialogId: string | null) => {
    set({ currentDialogId: dialogId })
  },

  setCurrentDialog: (dialog: DialogNode | null) => {
    set({ currentDialog: dialog })
  },

  setAdminMessages: (messages: Message[]) => {
    set({ adminMessages: messages })
  },

  addAdminMessages: (newMessages: Message[]) => {
    set(state => {
      const existingIds = new Set(state.adminMessages.map(msg => msg.id))
      const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id))
      
      return {
        adminMessages: [...state.adminMessages, ...uniqueNewMessages]
      }
    })
  },

  clearCurrent: () => {
    set({
      currentDialogId: null,
      currentDialog: null,
      adminMessages: [],
      isLoadingDialog: false,
      isLoadingMessages: false,
      dialogError: null,
      messagesError: null,
      hasMoreMessages: false,
      messagesCursor: null,
      newestMessageCursor: null,
      isAdminChatTyping: false
    })
  },

  updateDialogStatus: (status: string) => {
    set(state => ({
      currentDialog: state.currentDialog ? {
        ...state.currentDialog,
        status
      } : null
    }))
  },

  addRealtimeMessage: (message: Message) => {
    set(state => {
      const exists = state.adminMessages.some(msg => msg.id === message.id)
      if (exists) return state

      return {
        adminMessages: [...state.adminMessages, message]
      }
    })
  },

  updateRealtimeMessage: (messageId: string, message: Message) => {
    set(state => {
      const messageIndex = state.adminMessages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) {
        return {
          adminMessages: [...state.adminMessages, message]
        }
      }

      const updatedMessages = [...state.adminMessages]
      updatedMessages[messageIndex] = message
      return {
        adminMessages: updatedMessages
      }
    })
  },

  setTypingIndicator: (typing: boolean) => {
    set({ isAdminChatTyping: typing })
  },

  setLoadingDialog: (loading: boolean) => {
    set({ isLoadingDialog: loading })
  },

  setLoadingMessages: (loading: boolean) => {
    set({ isLoadingMessages: loading })
  },

  setDialogError: (error: string | null) => {
    set({ dialogError: error })
  },

  setMessagesError: (error: string | null) => {
    set({ messagesError: error })
  },

  setPagination: (hasMore: boolean, cursor: string | null, newestCursor: string | null) => {
    set({
      hasMoreMessages: hasMore,
      messagesCursor: cursor,
      newestMessageCursor: newestCursor
    })
  }
}))