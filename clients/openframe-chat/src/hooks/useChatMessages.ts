import { useState, useCallback, useRef } from 'react'
import faeAvatar from '../assets/fae-avatar.png'
import { createMessageSegmentAccumulator, type Message, type MessageSegment } from '@flamingo-stack/openframe-frontend-core'

interface UseChatMessagesOptions {
  onApprove?: (requestId?: string) => Promise<void> | void
  onReject?: (requestId?: string) => Promise<void> | void
}

export function useChatMessages({ onApprove, onReject }: UseChatMessagesOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const segmentAccumulator = useRef(
    createMessageSegmentAccumulator({ onApprove, onReject })
  ).current

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])

  const updateLastAssistantMessage = useCallback((segments: MessageSegment[]) => {
    setMessages(prev => {
      const newMessages = [...prev]
      const lastMessage = newMessages[newMessages.length - 1]
      if (lastMessage?.role === 'assistant') {
        newMessages[newMessages.length - 1] = {
          ...lastMessage,
          content: segments.length > 0 ? segments : ''
        }
      }
      return newMessages
    })
  }, [])

  const ensureAssistantMessage = useCallback(() => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant') return prev

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        name: 'Fae',
        content: [],
        timestamp: new Date(),
        avatar: faeAvatar
      }
      return [...prev, assistantMessage]
    })
  }, [])

  const addErrorMessage = useCallback((errorText: string) => {
    const errorMessage: Message = {
      id: `error-${Date.now()}`,
      role: 'error',
      name: 'Fae',
      timestamp: new Date(),
      avatar: faeAvatar,
      content: errorText,
    }
    
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1]
      if (lastMessage?.role === 'assistant' && 
          (lastMessage.content === '' || 
           (Array.isArray(lastMessage.content) && lastMessage.content.length === 0))) {
        return [...prev.slice(0, -1), errorMessage]
      }
      return [...prev, errorMessage]
    })
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    segmentAccumulator.reset()
  }, [segmentAccumulator])

  const appendTextToCurrentMessage = useCallback((text: string) => {
    const segments = segmentAccumulator.appendText(text)
    updateLastAssistantMessage(segments)
  }, [segmentAccumulator, updateLastAssistantMessage])

  const addToolSegmentToCurrentMessage = useCallback((segment: MessageSegment) => {
    if (segment.type === 'tool_execution') {
      const segments = segmentAccumulator.addToolExecution(segment)
      updateLastAssistantMessage(segments)
    }
  }, [segmentAccumulator, updateLastAssistantMessage])

  const resetCurrentMessageSegments = useCallback(() => {
    segmentAccumulator.resetSegments()
  }, [segmentAccumulator])

  const updateSegments = useCallback((segments: MessageSegment[]) => {
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
      } else if (segment.type === 'error') {
        segmentAccumulator.addError(segment.title, segment.details)
      }
    })
    updateLastAssistantMessage(segmentAccumulator.getSegments())
  }, [segmentAccumulator, updateLastAssistantMessage])

  return {
    messages,
    hasMessages: messages.length > 0,
    addMessage,
    updateLastAssistantMessage,
    ensureAssistantMessage,
    addErrorMessage,
    clearMessages,
    appendTextToCurrentMessage,
    addToolSegmentToCurrentMessage,
    resetCurrentMessageSegments,
    updateSegments,
    segmentAccumulator
  }
}