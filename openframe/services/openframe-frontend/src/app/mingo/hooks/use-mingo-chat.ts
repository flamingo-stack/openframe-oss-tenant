'use client'

import { useCallback, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  useRealtimeChunkProcessor,
  extractIncompleteMessageState,
  type MessageSegment,
  type ChunkData,
  type NatsMessageType,
} from '@flamingo-stack/openframe-frontend-core'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { useMingoMessagesStore } from '../stores/mingo-messages-store'
import { MingoApiService } from '../services/mingo-api-service'
import type { CoreMessage } from '../types/message.types'

interface ProcessedMessage {
  id: string
  content: string | MessageSegment[]
  role: 'user' | 'assistant' | 'error'
  name: string
  assistantType?: 'fae' | 'mingo'
  timestamp: Date
}

interface UseMingoChat {
  // Messages
  messages: ProcessedMessage[]
  isLoading: boolean
  
  // Actions
  createDialog: () => Promise<string | null>
  sendMessage: (content: string) => Promise<boolean>
  
  // Approval system
  approvals: MessageSegment[]
  
  // Real-time processing
  processChunk: (targetDialogId: string, chunk: ChunkData, messageType: NatsMessageType) => void
  
  // State
  isCreatingDialog: boolean
  isTyping: boolean
  assistantType: 'mingo'
}

interface ApprovalHandlers {
  handleApprove: (requestId?: string) => void
  handleReject: (requestId?: string) => void
  approvalStatuses: Record<string, any>
}

export function useMingoChat(
  dialogId: string | null, 
  approvalHandlers?: ApprovalHandlers
): UseMingoChat {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const {
    messagesByDialog,
    typingStates,
    getMessages,
    addMessage,
    updateMessage,
    setStreamingMessage,
    getStreamingMessage,
    updateStreamingMessageSegments,
    getOrCreateAccumulator,
    getTyping,
    setTyping,
    removeWelcomeMessages,
    isCreatingDialog,
    setCreatingDialog,
  } = useMingoMessagesStore()
  
  const isTyping = useMemo(() => {
    if (!dialogId) return false
    return getTyping(dialogId)
  }, [dialogId, typingStates, getTyping])
  
  const createDialogMutation = MingoApiService.createDialogMutation()
  const sendMessageMutation = MingoApiService.sendMessageMutation()
  
  // Initialize accumulator with approval handlers when dialog or handlers change
  useEffect(() => {
    if (dialogId && approvalHandlers) {
      getOrCreateAccumulator(dialogId, {
        onApprove: approvalHandlers.handleApprove,
        onReject: approvalHandlers.handleReject
      })
    }
  }, [dialogId, approvalHandlers, getOrCreateAccumulator])
  
  const ensureAssistantMessage = useCallback((targetDialogId?: string) => {
    const effectiveDialogId = targetDialogId || dialogId
    if (!effectiveDialogId) return
    
    const currentStreaming = getStreamingMessage(effectiveDialogId)
    if (currentStreaming) return
    
    const assistantMessage: CoreMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: 'assistant',
      content: [],
      name: 'Mingo',
      assistantType: 'mingo',
      timestamp: new Date()
    }
    
    setStreamingMessage(effectiveDialogId, assistantMessage)
    addMessage(effectiveDialogId, assistantMessage)
  }, [dialogId, getStreamingMessage, setStreamingMessage, addMessage])
  
  const updateStreamingMessageWithSegments = useCallback((segments: MessageSegment[], targetDialogId?: string) => {
    const effectiveDialogId = targetDialogId || dialogId
    if (!effectiveDialogId) return
    
    const currentStreaming = getStreamingMessage(effectiveDialogId)
    if (!currentStreaming) {
      return
    }
    
    updateStreamingMessageSegments(effectiveDialogId, segments)
  }, [dialogId, getStreamingMessage, updateStreamingMessageSegments])
  
  // Add welcome message for empty dialogs
  const addWelcomeMessage = useCallback(() => {
    if (!dialogId) return
    
    const currentMessages = getMessages(dialogId)
    
    if (currentMessages.length === 0) {
      const welcomeMessage: CoreMessage = {
        id: `welcome-${dialogId}`,
        role: 'assistant',
        name: 'Mingo',
        timestamp: new Date(),
        content: "Hi! I'm Mingo AI, ready to help with your technical tasks. What can I do for you?",
        assistantType: 'mingo'
      }
      
      addMessage(dialogId, welcomeMessage)
    }
  }, [dialogId, getMessages, addMessage])

  const addErrorMessage = useCallback((errorText: string, targetDialogId?: string) => {
    const effectiveDialogId = targetDialogId || dialogId
    if (!effectiveDialogId) return
    
    const errorMessage: CoreMessage = {
      id: `error-${Date.now()}`,
      role: 'error',
      name: 'Mingo',
      timestamp: new Date(),
      content: errorText,
    }
    
    const currentMessages = getMessages(effectiveDialogId)
    const lastMessage = currentMessages[currentMessages.length - 1]
    
    if (lastMessage?.role === 'assistant' && 
        (lastMessage.content === '' || 
         (Array.isArray(lastMessage.content) && lastMessage.content.length === 0))) {
      updateMessage(effectiveDialogId, lastMessage.id, errorMessage)
    } else {
      addMessage(effectiveDialogId, errorMessage)
    }
  }, [dialogId, getMessages, updateMessage, addMessage])
  
  useEffect(() => {
    if (dialogId) {
      addWelcomeMessage()
    }
  }, [dialogId, messagesByDialog, addWelcomeMessage])

  const messages = useMemo((): ProcessedMessage[] => {
    if (!dialogId) return []

    const currentMessages = getMessages(dialogId)
    const filteredMessages = currentMessages.filter(msg => 
      !msg.id.startsWith('pending-approvals-')
    )
    
    return filteredMessages.map(msg => {
      let filteredContent = msg.content
      
      if (Array.isArray(msg.content)) {
        filteredContent = (msg.content as MessageSegment[]).filter(segment => 
          !(segment.type === 'approval_request' && segment.status === 'pending')
        )
      }
      
      return {
        id: msg.id,
        content: filteredContent,
        role: msg.role,
        name: msg.name || 'Unknown',
        assistantType: msg.assistantType as 'fae' | 'mingo' | undefined,
        timestamp: msg.timestamp || new Date()
      }
    })
  }, [dialogId, messagesByDialog, getMessages])
  
  // Extract incomplete state from complete last assistant message
  const incompleteState = useMemo(() => {
    if (!dialogId) return undefined
    
    const currentMessages = getMessages(dialogId)
    const assistantSegments: MessageSegment[] = []
    let lastAssistantId = ''
    let lastAssistantTimestamp = new Date()
    
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i]
      if (msg.role === 'assistant') {
        if (!lastAssistantId) {
          lastAssistantId = msg.id
          lastAssistantTimestamp = msg.timestamp || new Date()
        }
        
        if (Array.isArray(msg.content)) {
          assistantSegments.unshift(...msg.content)
        } else if (typeof msg.content === 'string' && msg.content) {
          assistantSegments.unshift({
            type: 'text',
            text: msg.content,
            id: `${msg.id}-text`
          } as MessageSegment)
        }
      } else {
        break
      }
    }
    
    if (assistantSegments.length > 0 && lastAssistantId) {
      const completeAssistantMessage = {
        id: lastAssistantId,
        role: 'assistant' as const,
        content: assistantSegments,
        name: 'Mingo',
        timestamp: lastAssistantTimestamp
      }
      
      return extractIncompleteMessageState(completeAssistantMessage)
    }
    
    return undefined
  }, [dialogId, messagesByDialog, getMessages])

  // Real-time processing callbacks
  const realtimeCallbacks = useMemo(() => ({
    onStreamStart: () => {
      if (!dialogId) return
      
      ensureAssistantMessage()
      setTyping(dialogId, true)
    },
    
    onStreamEnd: () => {
      if (!dialogId) return
      setTyping(dialogId, false)
      setStreamingMessage(dialogId, null)
    },
    
    onSegmentsUpdate: (segments: MessageSegment[]) => {
      if (!dialogId) return
      
      setTyping(dialogId, true)
      ensureAssistantMessage(dialogId)
      updateStreamingMessageWithSegments(segments, dialogId)
    },
    
    onError: (error: string) => {
      if (!dialogId) return
      
      console.error('[MingoChat] Stream error:', error)
      setTyping(dialogId, false)
      setStreamingMessage(dialogId, null)
      addErrorMessage(error, dialogId)
    },
    onApprove: approvalHandlers?.handleApprove,
    onReject: approvalHandlers?.handleReject
  }), [dialogId, ensureAssistantMessage, setTyping, setStreamingMessage, updateStreamingMessageWithSegments, addErrorMessage, approvalHandlers])
  
  // Restore typing state from incomplete messages on dialog load
  useEffect(() => {
    if (!dialogId || !incompleteState) return
    
    const hasIncompleteContent = 
      (incompleteState.existingSegments && incompleteState.existingSegments.length > 0) ||
      (incompleteState.pendingApprovals && incompleteState.pendingApprovals.size > 0) ||
      (incompleteState.executingTools && incompleteState.executingTools.size > 0)
    
    if (hasIncompleteContent && !getTyping(dialogId)) {
      setTyping(dialogId, true)
    }
  }, [dialogId, incompleteState, getTyping, setTyping])

  const { processChunk: baseProcessChunk } = useRealtimeChunkProcessor({
    callbacks: realtimeCallbacks,
    displayApprovalTypes: ['CLIENT', 'ADMIN'],
    approvalStatuses: approvalHandlers?.approvalStatuses || {},
    initialState: incompleteState
  })
  
  const processChunk = useCallback((targetDialogId: string, chunk: ChunkData, _messageType: NatsMessageType) => {
    if (targetDialogId === dialogId) {
      baseProcessChunk(chunk)
    }
  }, [dialogId, baseProcessChunk])
  
  // Extract pending approvals from messages
  const approvals = useMemo(() => {
    if (!dialogId) return []

    const currentMessages = getMessages(dialogId)
    const pendingApprovalSegments: MessageSegment[] = []
    
    currentMessages.forEach(msg => {
      if (Array.isArray(msg.content)) {
        msg.content.forEach(segment => {
          if (segment.type === 'approval_request' && segment.status === 'pending') {
            pendingApprovalSegments.push(segment as MessageSegment)
          }
        })
      }
    })
    
    return pendingApprovalSegments
  }, [dialogId, messagesByDialog, getMessages])
  
  const createDialog = useCallback(async (): Promise<string | null> => {
    if (isCreatingDialog) return null
    
    try {
      setCreatingDialog(true)
      
      const result = await createDialogMutation.mutateAsync()
      
      toast({
        title: "Chat Created",
        description: "New chat session started successfully",
        variant: "success",
        duration: 3000
      })
      
      queryClient.invalidateQueries({ queryKey: ['mingo-dialogs'] })
      
      return result.id
    } catch (error) {
      console.error('[MingoChat] Failed to create dialog:', error)
      return null
    } finally {
      setCreatingDialog(false)
    }
  }, [isCreatingDialog, setCreatingDialog, createDialogMutation, toast, queryClient])
  
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!dialogId || !content.trim()) return false
    if (isTyping) return false
    
    try {
      setTyping(dialogId, true)
      removeWelcomeMessages(dialogId)
      
      const optimisticMessage: CoreMessage = {
        id: `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: 'user',
        content: content.trim(),
        name: 'You',
        timestamp: new Date()
      }
      
      addMessage(dialogId, optimisticMessage)
      await sendMessageMutation.mutateAsync({ dialogId, content: content.trim() })
      
      return true
    } catch (error) {
      console.error('[MingoChat] Failed to send message:', error)
      
      setTyping(dialogId, false)
      
      toast({
        title: "Send Failed",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive",
        duration: 5000
      })
      
      return false
    }
  }, [dialogId, isTyping, setTyping, removeWelcomeMessages, addMessage, sendMessageMutation, toast])
  
  
  return {
    // Messages
    messages,
    isLoading: false,
    
    // Actions
    createDialog,
    sendMessage,
    
    // Approval system
    approvals,
    
    // Real-time processing
    processChunk,
    
    // State
    isCreatingDialog,
    isTyping,
    assistantType: 'mingo' as const
  }
}