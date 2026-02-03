'use client'

import { useCallback, useState, useMemo, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  useRealtimeChunkProcessor,
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
  
  // Real-time processing - now dialog-specific
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
  
  
  // Store integration
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
  
  // Get typing state - recompute when typingStates Map changes
  const isTyping = useMemo(() => {
    if (!dialogId) return false
    return getTyping(dialogId)
  }, [dialogId, typingStates, getTyping])
  
  // API mutations
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
  
  
  // Helper functions for streaming message management (like openframe-chat)
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
    
    // Use the store's accumulator-based method to process segments
    updateStreamingMessageSegments(effectiveDialogId, segments)
  }, [dialogId, getStreamingMessage, updateStreamingMessageSegments])
  
  // Add welcome message for empty dialogs
  const addWelcomeMessage = useCallback(() => {
    if (!dialogId) return
    
    const currentMessages = getMessages(dialogId)
    
    // Only add welcome if dialog is completely empty
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

  // Add error message (same pattern as openframe-chat)
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
    
    // Replace empty assistant message with error, or add new error message
    if (lastMessage?.role === 'assistant' && 
        (lastMessage.content === '' || 
         (Array.isArray(lastMessage.content) && lastMessage.content.length === 0))) {
      // Replace empty assistant message with error
      updateMessage(effectiveDialogId, lastMessage.id, errorMessage)
    } else {
      // Add new error message
      addMessage(effectiveDialogId, errorMessage)
    }
  }, [dialogId, getMessages, updateMessage, addMessage])
  
  // Add welcome message effect - moved out of render
  useEffect(() => {
    if (dialogId) {
      addWelcomeMessage()
    }
  }, [dialogId, messagesByDialog, addWelcomeMessage])

  // Get messages for current dialog with proper approval extraction (same pattern as tickets)
  const messages = useMemo((): ProcessedMessage[] => {
    if (!dialogId) return []

    const currentMessages = getMessages(dialogId)
    
    // First, filter out special pending-approvals messages (they contain approval segments)
    const filteredMessages = currentMessages.filter(msg => 
      !msg.id.startsWith('pending-approvals-')
    )
    
    // Convert CoreMessage to ProcessedMessage format for interface compatibility
    return filteredMessages.map(msg => {
      let filteredContent = msg.content
      
      // Filter out pending approval requests from regular message display
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
  
  // Real-time processing callbacks (exact same approach as openframe-chat)
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
    
    // Add approval handlers for real-time processing
    onApprove: approvalHandlers?.handleApprove,
    onReject: approvalHandlers?.handleReject
  }), [dialogId, ensureAssistantMessage, setTyping, setStreamingMessage, updateStreamingMessageWithSegments, addErrorMessage, approvalHandlers])
  
  // Real-time processor for active dialog (fallback)
  const { processChunk: baseProcessChunk } = useRealtimeChunkProcessor({
    callbacks: realtimeCallbacks,
    displayApprovalTypes: ['CLIENT', 'ADMIN'],
    approvalStatuses: approvalHandlers?.approvalStatuses || {}
  })
  
  // Dialog-specific chunk processor that only processes for target dialog
  const processChunk = useCallback((targetDialogId: string, chunk: ChunkData, _messageType: NatsMessageType) => {
    // Only process if the target dialog matches the current active dialog
    // This ensures chunks are only processed for their intended dialog
    if (targetDialogId === dialogId) {
      baseProcessChunk(chunk)
    }
    // If targetDialogId !== dialogId, ignore the chunk (it's from a background dialog)
  }, [dialogId, baseProcessChunk])
  
  // Extract pending approvals from messages (both special pending-approvals- messages and regular assistant messages)
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
  
  // Create dialog
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
      
      // Invalidate dialogs query to refresh the sidebar
      queryClient.invalidateQueries({ queryKey: ['mingo-dialogs'] })
      
      return result.id
    } catch (error) {
      console.error('[MingoChat] Failed to create dialog:', error)
      return null
    } finally {
      setCreatingDialog(false)
    }
  }, [isCreatingDialog, setCreatingDialog, createDialogMutation, toast, queryClient])
  
  // Send message
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!dialogId || !content.trim()) return false
    if (isTyping) return false // Use isTyping instead of isSendingMessage
    
    try {
      // Set typing indicator for this dialog (covers both sending + assistant response)
      setTyping(dialogId, true)
      
      // Remove welcome messages
      removeWelcomeMessages(dialogId)
      
      // Create optimistic user message in CoreMessage format
      const optimisticMessage: CoreMessage = {
        id: `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: 'user',
        content: content.trim(),
        name: 'You',
        timestamp: new Date()
      }
      
      addMessage(dialogId, optimisticMessage)
      
      // Send message via API
      await sendMessageMutation.mutateAsync({ dialogId, content: content.trim() })
      
      return true
    } catch (error) {
      console.error('[MingoChat] Failed to send message:', error)
      
      // Clear typing on error
      setTyping(dialogId, false)
      
      toast({
        title: "Send Failed",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive",
        duration: 5000
      })
      
      return false
    }
    // Note: Don't clear typing here - it will be cleared when assistant finishes responding
  }, [dialogId, isTyping, setTyping, removeWelcomeMessages, addMessage, sendMessageMutation, toast])
  
  
  return {
    // Messages
    messages,
    isLoading: false, // TODO: Add proper loading state from GraphQL queries
    
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