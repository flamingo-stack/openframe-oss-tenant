'use client'

import { useCallback } from 'react'
import { 
  parseChunkToAction
} from '@flamingo-stack/openframe-frontend-core'
import { 
  CHAT_TYPE, 
  MESSAGE_TYPE, 
  OWNER_TYPE, 
  type NatsMessageType 
} from '../constants'
import type { Message } from '../types/dialog.types'

interface UseDialogRealtimeProcessorOptions {
  dialogId: string | null
  onStreamStart: (isAdmin: boolean) => void
  onStreamEnd: (isAdmin: boolean) => void
  onMessageAdd: (message: Message, isAdmin: boolean) => void
  onError: (error: string, isAdmin: boolean) => void
}

export function useDialogRealtimeProcessor(options: UseDialogRealtimeProcessorOptions) {
  const {
    dialogId,
    onStreamStart,
    onStreamEnd,
    onMessageAdd,
    onError
  } = options

  const processChunk = useCallback((payload: unknown, messageType: NatsMessageType = 'message') => {
    if (!dialogId) return

    const asAny = payload as any
    const nowIso = new Date().toISOString()
    const isAdmin = messageType === 'admin-message'
    const chatType = isAdmin ? 'ADMIN_AI_CHAT' : 'CLIENT_CHAT'
    
    const ADMIN_CHAT_TYPE = CHAT_TYPE.ADMIN

    const isMessageObject =
      asAny &&
      typeof asAny === 'object' &&
      typeof asAny.id === 'string' &&
      typeof asAny.dialogId === 'string' &&
      asAny.messageData != null &&
      asAny.owner != null

    if (isMessageObject) {
      const message = asAny as Message
      if (message.dialogId !== dialogId) return
      
      const isAdminMessage = message.chatType === ADMIN_CHAT_TYPE
      onMessageAdd(message, isAdminMessage)
      return
    }

    const action = parseChunkToAction(payload)
    if (!action) return

    if (action.action === 'message_start') {
      onStreamStart(isAdmin)
      return
    }
    
    if (action.action === 'message_end') {
      onStreamEnd(isAdmin)
      return
    }
    
    if (action.action === 'error') {
      onError(action.error, isAdmin)
    }

    const id = `nats-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const createBaseMessage = (isUserMessage: boolean): Message => {
      let owner: any
      if (isUserMessage) {
        owner = isAdmin 
          ? { type: 'ADMIN' as const, userId: '' } 
          : { type: 'CLIENT' as const, machineId: '' }
      } else {
        owner = { type: 'ASSISTANT' as const, model: '' }
      }
      
      return {
        id,
        dialogId: dialogId || '',
        chatType: chatType as any,
        dialogMode: 'DEFAULT',
        createdAt: nowIso,
        owner: owner as any,
        messageData: { type: 'TEXT', text: '' } as any,
      }
    }

    let message: Message | null = null

    switch (action.action) {
      case 'message_request':
        message = { 
          ...createBaseMessage(true), 
          messageData: { type: 'TEXT', text: action.text } as any 
        }
        break
        
      case 'text':
        message = { 
          ...createBaseMessage(false), 
          messageData: { type: 'TEXT', text: action.text } as any 
        }
        break
        
      case 'tool_execution': {
        const toolData = action.segment.data
        message = {
          ...createBaseMessage(false),
          messageData: {
            type: toolData.type,
            integratedToolType: toolData.integratedToolType,
            toolFunction: toolData.toolFunction,
            parameters: toolData.parameters,
            result: toolData.result,
            success: toolData.success,
          } as any,
        }
        break
      }
      
      case 'approval_request':
        message = {
          ...createBaseMessage(false),
          messageData: {
            type: 'APPROVAL_REQUEST',
            approvalType: action.approvalType,
            command: action.command,
            approvalRequestId: action.requestId,
            explanation: action.explanation,
          } as any,
        }
        break
        
      case 'approval_result':
        message = {
          ...createBaseMessage(false),
          messageData: {
            type: 'APPROVAL_RESULT',
            approvalRequestId: action.requestId,
            approved: action.approved,
            approvalType: action.approvalType,
          } as any,
        }
        break

      case 'error': {
        const errorDetails = 'details' in action ? action.details : undefined
        message = {
          ...createBaseMessage(false),
          messageData: {
            type: 'ERROR',
            error: action.error,
            details: errorDetails,
          } as any,
        }
        break
      }

      default:
        // Ignore metadata and other non-content actions
        return
    }

    if (message) {
      onMessageAdd(message, isAdmin)
    }
  }, [dialogId, onStreamStart, onStreamEnd, onMessageAdd, onError])

  return {
    processChunk
  }
}