import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Message } from '../types'

interface BackgroundMessagesStore {
  // Per-dialog message storage
  dialogMessages: Record<string, Message[]>
  
  // Per-dialog unread counts
  unreadCounts: Record<string, number>
  
  // Per-dialog typing indicators for background dialogs
  backgroundTypingIndicators: Record<string, boolean>
  
  // Current active dialog (for display)
  activeDialogId: string | null
  
  // Actions
  setActiveDialogId: (dialogId: string | null) => void
  addBackgroundMessage: (dialogId: string, message: Message) => void
  setDialogMessages: (dialogId: string, messages: Message[]) => void
  incrementUnreadCount: (dialogId: string) => void
  resetUnreadCount: (dialogId: string) => void
  setBackgroundTyping: (dialogId: string, isTyping: boolean) => void
  clearDialogData: (dialogId: string) => void
  getDialogMessages: (dialogId: string) => Message[]
  getUnreadCount: (dialogId: string) => number
  isBackgroundTyping: (dialogId: string) => boolean
  
  // Utility actions
  initializeDialog: (dialogId: string) => void
  mergeDialogMessages: (dialogId: string, messages: Message[]) => void
  moveBackgroundToActive: (dialogId: string) => Message[]
  preserveStreamingMessage: (dialogId: string, streamingMessage: Message) => void
}

const MAX_BACKGROUND_MESSAGES_PER_DIALOG = 50

export const useMingoBackgroundMessagesStore = create<BackgroundMessagesStore>()(
  immer((set, get) => ({
    dialogMessages: {},
    unreadCounts: {},
    backgroundTypingIndicators: {},
    activeDialogId: null,

    setActiveDialogId: (dialogId: string | null) => {
      set(state => {
        state.activeDialogId = dialogId
      })
    },

    addBackgroundMessage: (dialogId: string, message: Message) => {
      set(state => {
        if (!state.dialogMessages[dialogId]) {
          state.dialogMessages[dialogId] = []
        }

        const existingIndex = state.dialogMessages[dialogId].findIndex(msg => msg.id === message.id)
        if (existingIndex !== -1) {
          state.dialogMessages[dialogId][existingIndex] = message
        } else {
          state.dialogMessages[dialogId].push(message)
          if (state.dialogMessages[dialogId].length > MAX_BACKGROUND_MESSAGES_PER_DIALOG) {
            state.dialogMessages[dialogId] = state.dialogMessages[dialogId].slice(-MAX_BACKGROUND_MESSAGES_PER_DIALOG)
          }
        }
      })
    },

    setDialogMessages: (dialogId: string, messages: Message[]) => {
      set(state => {
        state.dialogMessages[dialogId] = [...messages]
      })
    },

    incrementUnreadCount: (dialogId: string) => {
      set(state => {
        if (!state.unreadCounts[dialogId]) {
          state.unreadCounts[dialogId] = 0
        }
        state.unreadCounts[dialogId] += 1
      })
    },

    resetUnreadCount: (dialogId: string) => {
      set(state => {
        state.unreadCounts[dialogId] = 0
      })
    },

    setBackgroundTyping: (dialogId: string, isTyping: boolean) => {
      set(state => {
        state.backgroundTypingIndicators[dialogId] = isTyping
      })
    },

    clearDialogData: (dialogId: string) => {
      set(state => {
        delete state.dialogMessages[dialogId]
        delete state.unreadCounts[dialogId]
        delete state.backgroundTypingIndicators[dialogId]
      })
    },

    getDialogMessages: (dialogId: string) => {
      const state = get()
      return state.dialogMessages[dialogId] || []
    },

    getUnreadCount: (dialogId: string) => {
      const state = get()
      return state.unreadCounts[dialogId] || 0
    },

    isBackgroundTyping: (dialogId: string) => {
      const state = get()
      return state.backgroundTypingIndicators[dialogId] || false
    },

    initializeDialog: (dialogId: string) => {
      set(state => {
        if (!state.dialogMessages[dialogId]) {
          state.dialogMessages[dialogId] = []
        }
        if (!state.unreadCounts[dialogId]) {
          state.unreadCounts[dialogId] = 0
        }
        if (!state.backgroundTypingIndicators[dialogId]) {
          state.backgroundTypingIndicators[dialogId] = false
        }
      })
    },

    mergeDialogMessages: (dialogId: string, messages: Message[]) => {
      set(state => {
        if (!state.dialogMessages[dialogId]) {
          state.dialogMessages[dialogId] = []
        }

        const existingIds = new Set(state.dialogMessages[dialogId].map(msg => msg.id))
        const uniqueNewMessages = messages.filter(msg => !existingIds.has(msg.id))
        
        state.dialogMessages[dialogId] = [...state.dialogMessages[dialogId], ...uniqueNewMessages]
        
        if (state.dialogMessages[dialogId].length > MAX_BACKGROUND_MESSAGES_PER_DIALOG) {
          state.dialogMessages[dialogId] = state.dialogMessages[dialogId].slice(-MAX_BACKGROUND_MESSAGES_PER_DIALOG)
        }
      })
    },

    moveBackgroundToActive: (dialogId: string) => {
      const state = get()
      const backgroundMessages = state.dialogMessages[dialogId] || []
      
      set(state => {
        state.unreadCounts[dialogId] = 0
      })
      
      return [...backgroundMessages]
    },

    preserveStreamingMessage: (dialogId: string, streamingMessage: Message) => {
      set(state => {
        if (!state.dialogMessages[dialogId]) {
          state.dialogMessages[dialogId] = []
        }
        
        const filtered = state.dialogMessages[dialogId].filter(msg => msg.id !== streamingMessage.id)
        
        state.dialogMessages[dialogId] = [...filtered, streamingMessage]
        
        if (state.dialogMessages[dialogId].length > MAX_BACKGROUND_MESSAGES_PER_DIALOG) {
          state.dialogMessages[dialogId] = state.dialogMessages[dialogId].slice(-MAX_BACKGROUND_MESSAGES_PER_DIALOG)
        }
      })
    }
  }))
)