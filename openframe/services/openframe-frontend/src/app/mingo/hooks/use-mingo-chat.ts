'use client'

import { useCallback, useState, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  useRealtimeChunkProcessor,
  createMessageSegmentAccumulator,
  type MessageSegment,
  type ChunkData,
  type NatsMessageType,
} from '@flamingo-stack/openframe-frontend-core'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { useMingoMessagesStore } from '../stores/mingo-messages-store'
import { MingoApiService } from '../services/mingo-api-service'
import { CHAT_TYPE, ASSISTANT_CONFIG } from '../../tickets/constants'
import type { Message, CoreMessage } from '../types/message.types'

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
  isSendingMessage: boolean
  isTyping: boolean
  assistantType: 'mingo'
}

export function useMingoChat(dialogId: string | null): UseMingoChat {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, any>>({})
  
  // Message segment accumulator for real-time processing (like openframe-chat)
  const segmentAccumulator = useRef(
    createMessageSegmentAccumulator({
      onApprove: undefined, // Will be set below after handlers are defined
      onReject: undefined
    })
  ).current
  
  // Store integration
  const {
    messagesByDialog,
    getMessages,
    addMessage,
    updateMessage,
    setStreamingMessage,
    getStreamingMessage,
    updateStreamingMessageSegments,
    getTyping,
    setTyping,
    removeWelcomeMessages,
    isCreatingDialog,
    isSendingMessage,
    setCreatingDialog,
    setSendingMessage
  } = useMingoMessagesStore()
  
  // Get typing state
  const isTyping = useMemo(() => {
    if (!dialogId) return false
    return getTyping(dialogId)
  }, [dialogId, getTyping])
  
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
  
  // Update segment accumulator with approval handlers
  segmentAccumulator.setCallbacks({
    onApprove: handleApprove,
    onReject: handleReject
  })
  
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
      console.log('[MINGO] No streaming message found for dialog:', dialogId)
      return
    }
    
    console.log('[MINGO] Updating streaming message with', segments.length, 'segments')
    
    // Update the streaming message with segments directly (CoreMessage format)
    const updatedMessage: CoreMessage = {
      ...currentStreaming as CoreMessage,
      content: segments  // Store segments directly as content
    }
    
    // Update both streaming and main message stores
    setStreamingMessage(dialogId, updatedMessage)
    updateMessage(dialogId, currentStreaming.id, updatedMessage)
  }, [dialogId, getStreamingMessage, setStreamingMessage, updateMessage])
  
  // Get messages for current dialog (already in CoreMessage format)
  const messages = useMemo((): ProcessedMessage[] => {
    if (!dialogId) return []
    
    const coreMessages = getMessages(dialogId)
    console.log('[MINGO] Retrieved core messages:', coreMessages.length)
    
    // Convert CoreMessage to ProcessedMessage format for interface compatibility
    return coreMessages.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      name: msg.name || 'Unknown',
      assistantType: msg.assistantType as 'fae' | 'mingo' | undefined,
      timestamp: msg.timestamp || new Date()
    }))
  }, [dialogId, messagesByDialog])
  
  // Real-time processing callbacks (exact same approach as openframe-chat)
  const realtimeCallbacks = useMemo(() => ({
    onStreamStart: () => {
      console.log('[MINGO] Stream started for dialog:', dialogId)
      if (!dialogId) return
      
      ensureAssistantMessage()
      setTyping(dialogId, true)
      segmentAccumulator.resetSegments()
    },
    
    onStreamEnd: () => {
      if (!dialogId) return
      setTyping(dialogId, false)
      setStreamingMessage(dialogId, null)
    },
    
    onSegmentsUpdate: (segments: MessageSegment[]) => {
      if (!dialogId) return
      
      console.log('[MINGO] Segments update:', segments.length, 'segments for dialog:', dialogId)
      
      // Use the exact same approach as openframe-chat
      ensureAssistantMessage()
      
      // Reset accumulator and process all segments
      segmentAccumulator.reset()
      segments.forEach(segment => {
        if (segment.type === 'text' && segment.text) {
          segmentAccumulator.appendText(segment.text)
        } else if (segment.type === 'tool_execution') {
          segmentAccumulator.addToolExecution(segment)
        } else if (segment.type === 'approval_request') {
          const { data, status } = segment
          segmentAccumulator.addApprovalRequest(
            data.requestId || '',
            data.command,
            data.explanation,
            data.approvalType || '',
            status
          )
        }
      })
      
      // Update streaming message with accumulated segments
      updateStreamingMessageWithSegments(segmentAccumulator.getSegments())
    },
    
    onError: (error: string) => {
      if (!dialogId) return
      
      console.error('[MingoChat] Stream error:', error)
      setTyping(dialogId, false)
      setStreamingMessage(dialogId, null)
      segmentAccumulator.resetSegments()
      
      toast({
        title: "Connection Error",
        description: error,
        variant: "destructive",
        duration: 5000
      })
    }
  }), [dialogId, ensureAssistantMessage, setTyping, setStreamingMessage, updateStreamingMessageWithSegments, segmentAccumulator, toast])
  
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
    if (isSendingMessage) return false
    
    try {
      setSendingMessage(true)
      
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
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
        variant: "success",
        duration: 2000
      })
      
      return true
    } catch (error) {
      console.error('[MingoChat] Failed to send message:', error)
      
      toast({
        title: "Send Failed",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive",
        duration: 5000
      })
      
      return false
    } finally {
      setSendingMessage(false)
    }
  }, [dialogId, isSendingMessage, setSendingMessage, removeWelcomeMessages, addMessage, sendMessageMutation, toast])
  
  
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
    isSendingMessage,
    isTyping,
    assistantType: 'mingo' as const
  }
}