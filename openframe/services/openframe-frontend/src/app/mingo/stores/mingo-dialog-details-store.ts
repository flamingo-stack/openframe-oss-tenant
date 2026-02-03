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
  
  // Typing indicators per dialog (for UI behavior)
  dialogTypingStates: Record<string, boolean>
  
  // Actions
  setCurrentDialogId: (dialogId: string | null) => void
  setCurrentDialog: (dialog: DialogNode | null) => void
  setAdminMessages: (messages: Message[]) => void
  addAdminMessages: (messages: Message[]) => void
  clearCurrent: () => void
  addRealtimeMessage: (message: Message) => void
  removeWelcomeMessages: () => void
  ensureTypingMessage: (dialogId: string) => void
  removeTypingMessage: (dialogId: string) => void
  hasTypingMessage: (dialogId: string) => boolean
  getLastEmptyAssistantMessage: (dialogId: string) => Message | null
  updateLastAssistantMessage: (dialogId: string, content: any) => void
  setDialogTyping: (dialogId: string, typing: boolean) => void
  getDialogTyping: (dialogId: string) => boolean
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
  
  dialogTypingStates: {},

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

  // Find the last empty assistant message for the current dialog
  getLastEmptyAssistantMessage: (dialogId: string): Message | null => {
    const { adminMessages } = get()
    const dialogMessages = adminMessages.filter(msg => msg.dialogId === dialogId)
    
    // Find the last assistant message with empty text
    for (let i = dialogMessages.length - 1; i >= 0; i--) {
      const msg = dialogMessages[i]
      if (msg.owner?.type === 'ASSISTANT' && 
          msg.messageData?.type === 'TEXT' && 
          msg.messageData?.text === '') {
        return msg
      }
    }
    return null
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
      newestMessageCursor: null
    })
  },

  addRealtimeMessage: (message: Message) => {
    set(state => {
      const existingIndex = state.adminMessages.findIndex(msg => msg.id === message.id)
      if (existingIndex !== -1) {
        // Update existing message
        const newMessages = [...state.adminMessages]
        newMessages[existingIndex] = message
        return { adminMessages: newMessages }
      } else {
        // Add new message
        return {
          adminMessages: [...state.adminMessages, message]
        }
      }
    })
  },

  removeWelcomeMessages: () => {
    set(state => ({
      adminMessages: state.adminMessages.filter(msg => !msg.id.startsWith('welcome-'))
    }))
  },

  ensureTypingMessage: (dialogId: string) => {
    set(state => {
      // Always add a new typing message for immediate text accumulation
      // Remove any existing typing messages first to avoid duplicates
      const filteredMessages = state.adminMessages.filter(msg => 
        !(msg.dialogId === dialogId && 
          msg.owner?.type === 'ASSISTANT' && 
          (!msg.messageData?.text || msg.messageData.text === '') &&
          msg.id.startsWith('typing-'))
      )

      const typingMessage: Message = {
        id: `typing-${dialogId}-${Date.now()}`,
        dialogId,
        chatType: 'ADMIN_AI_CHAT',
        dialogMode: 'DEFAULT',
        createdAt: new Date().toISOString(),
        owner: {
          type: 'ASSISTANT',
          model: 'mingo'
        },
        messageData: {
          type: 'TEXT',
          text: ''
        }
      }

      return {
        adminMessages: [...filteredMessages, typingMessage]
      }
    })
  },

  removeTypingMessage: (dialogId: string) => {
    set(state => ({
      adminMessages: state.adminMessages.filter(msg => 
        !(msg.dialogId === dialogId && 
          msg.owner?.type === 'ASSISTANT' && 
          (!msg.messageData?.text || msg.messageData.text === '') &&
          msg.id.startsWith('typing-'))
      )
    }))
  },

  hasTypingMessage: (dialogId: string) => {
    const state = get()
    return state.adminMessages.some(msg => 
      msg.dialogId === dialogId && 
      msg.owner?.type === 'ASSISTANT' && 
      (!msg.messageData?.text || msg.messageData.text === '') &&
      msg.id.startsWith('typing-')
    )
  },

  updateLastAssistantMessage: (dialogId: string, content: any) => {
    set(state => {
      const newMessages = [...state.adminMessages]
      const lastDialogMessageIndex = newMessages.findLastIndex(msg => 
        msg.dialogId === dialogId && msg.owner?.type === 'ASSISTANT'
      )
      
      const lastMessage = newMessages[lastDialogMessageIndex]
      if (lastMessage?.dialogId === dialogId && lastMessage.owner?.type === 'ASSISTANT') {
        const currentText = lastMessage.messageData?.text || ''
        const newText = typeof content === 'string' ? content : ''
        
        newMessages[lastDialogMessageIndex] = {
          ...lastMessage,
          messageData: {
            ...lastMessage.messageData,
            text: currentText + newText  // Accumulate text instead of replacing
          }
        }
      }
      
      return { adminMessages: newMessages }
    })
  },

  setDialogTyping: (dialogId: string, typing: boolean) => {
    set(state => ({
      dialogTypingStates: {
        ...state.dialogTypingStates,
        [dialogId]: typing
      }
    }))
  },

  getDialogTyping: (dialogId: string) => {
    return get().dialogTypingStates[dialogId] || false
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