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
  handleApprove: (requestId?: string) => void
  handleReject: (requestId?: string) => void
  
  // Real-time processing
  processChunk: (chunk: ChunkData, messageType: NatsMessageType) => void
  
  // State
  isCreatingDialog: boolean
  isTyping: boolean
  assistantType: 'mingo'
}

export function useMingoChat(dialogId: string | null): UseMingoChat {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, any>>({})
  
  
  // Store integration
  const {
    messagesByDialog,
    typingStates,
    getMessages,
    addMessage,
    updateMessage,
    setStreamingMessage,
    getStreamingMessage,
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
  const approveRequestMutation = MingoApiService.approveRequestMutation()
  const rejectRequestMutation = MingoApiService.rejectRequestMutation()
  
  // Handle approval and rejection - defined early for use in message processing
  const handleApprove = useCallback((requestId?: string) => {
    if (!requestId) return
    
    approveRequestMutation.mutate(requestId, {
      onSuccess: (result) => {
        setApprovalStatuses(prev => ({
          ...prev,
          [requestId]: result
        }))
      }
    })
  }, [approveRequestMutation])
  
  const handleReject = useCallback((requestId?: string) => {
    if (!requestId) return
    
    rejectRequestMutation.mutate(requestId, {
      onSuccess: (result) => {
        setApprovalStatuses(prev => ({
          ...prev,
          [requestId]: result
        }))
      }
    })
  }, [rejectRequestMutation])
  
  
  // Helper functions for streaming message management (like openframe-chat)
  const ensureAssistantMessage = useCallback(() => {
    if (!dialogId) return
    
    const currentStreaming = getStreamingMessage(dialogId)
    if (currentStreaming) return
    
    const assistantMessage: CoreMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: 'assistant',
      content: [],
      name: 'Mingo',
      assistantType: 'mingo',
      timestamp: new Date()
    }
    
    setStreamingMessage(dialogId, assistantMessage)
    addMessage(dialogId, assistantMessage)
  }, [dialogId, getStreamingMessage, setStreamingMessage, addMessage])
  
  const updateStreamingMessageWithSegments = useCallback((segments: MessageSegment[]) => {
    if (!dialogId) return
    
    const currentStreaming = getStreamingMessage(dialogId)
    if (!currentStreaming) {
      return
    }
    
    // Update the streaming message with segments directly (CoreMessage format)
    const updatedMessage: CoreMessage = {
      ...currentStreaming as CoreMessage,
      content: segments  // Store segments directly as content
    }
    
    // Update both streaming and main message stores
    setStreamingMessage(dialogId, updatedMessage)
    updateMessage(dialogId, currentStreaming.id, updatedMessage)
  }, [dialogId, getStreamingMessage, setStreamingMessage, updateMessage])
  
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
  const addErrorMessage = useCallback((errorText: string) => {
    if (!dialogId) return
    
    const errorMessage: CoreMessage = {
      id: `error-${Date.now()}`,
      role: 'error',
      name: 'Mingo',
      timestamp: new Date(),
      content: errorText,
    }
    
    const currentMessages = getMessages(dialogId)
    const lastMessage = currentMessages[currentMessages.length - 1]
    
    // Replace empty assistant message with error, or add new error message
    if (lastMessage?.role === 'assistant' && 
        (lastMessage.content === '' || 
         (Array.isArray(lastMessage.content) && lastMessage.content.length === 0))) {
      // Replace empty assistant message with error
      updateMessage(dialogId, lastMessage.id, errorMessage)
    } else {
      // Add new error message
      addMessage(dialogId, errorMessage)
    }
  }, [dialogId, getMessages, updateMessage, addMessage])
  
  // Add welcome message effect - moved out of render
  useEffect(() => {
    if (dialogId) {
      addWelcomeMessage()
    }
  }, [dialogId, messagesByDialog, addWelcomeMessage])

  // Get messages for current dialog (already in CoreMessage format)
  const messages = useMemo((): ProcessedMessage[] => {
    if (!dialogId) return []

    const currentMessages = getMessages(dialogId)
    
    // Convert CoreMessage to ProcessedMessage format for interface compatibility
    return currentMessages.map(msg => {
      let filteredContent = msg.content
      
      // Filter out pending approval requests from message display (they appear in separate section)
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
      
      ensureAssistantMessage()
      updateStreamingMessageWithSegments(segments)
    },
    
    onError: (error: string) => {
      if (!dialogId) return
      
      console.error('[MingoChat] Stream error:', error)
      setTyping(dialogId, false)
      setStreamingMessage(dialogId, null)
      addErrorMessage(error)
    }
  }), [dialogId, ensureAssistantMessage, setTyping, setStreamingMessage, updateStreamingMessageWithSegments, addErrorMessage])
  
  // Real-time processor
  const { processChunk } = useRealtimeChunkProcessor({
    callbacks: realtimeCallbacks,
    displayApprovalTypes: ['CLIENT', 'ADMIN'],
    approvalStatuses: approvalStatuses
  })
  
  // Extract pending approvals from messages
  const approvals = useMemo(() => {
    const allApprovals: MessageSegment[] = []
    
    messages.forEach(message => {
      // Check if content is an array of segments
      if (Array.isArray(message.content)) {
        const segments = message.content as MessageSegment[]
        segments.forEach(segment => {
          if (segment.type === 'approval_request' && segment.status === 'pending') {
            allApprovals.push(segment)
          }
        })
      }
    })
    
    return allApprovals
  }, [messages])
  
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
    handleApprove,
    handleReject,
    
    // Real-time processing
    processChunk,
    
    // State
    isCreatingDialog,
    isTyping,
    assistantType: 'mingo' as const
  }
}