'use client'

import { useCallback, useRef } from 'react'
import { 
  parseChunkToAction,
  type ChunkData,
  type NatsMessageType,
} from '@flamingo-stack/openframe-frontend-core'
import { useMingoDialogDetailsStore } from '../stores/mingo-dialog-details-store'
import { useMingoBackgroundMessagesStore } from '../stores/mingo-background-messages-store'
import { CHAT_TYPE } from '../../tickets/constants'
import type { Message } from '../types'

interface UseMingoRealtimeProcessorOptions {
  activeDialogId: string | null
  onActiveStreamStart: () => void
  onActiveStreamEnd: () => void
  onActiveError: (error: string) => void
  onBackgroundStreamStart: (dialogId: string) => void
  onBackgroundStreamEnd: (dialogId: string) => void
  onBackgroundUnreadIncrement: (dialogId: string) => void
}

interface DialogState {
  isStreaming: boolean
}

export function useMingoRealtimeProcessor(options: UseMingoRealtimeProcessorOptions) {
  const {
    activeDialogId,
    onActiveStreamStart,
    onActiveStreamEnd,
    onActiveError,
    onBackgroundStreamStart,
    onBackgroundStreamEnd,
    onBackgroundUnreadIncrement,
  } = options

  const { addRealtimeMessage } = useMingoDialogDetailsStore()
  const { addBackgroundMessage } = useMingoBackgroundMessagesStore()

  const dialogStatesRef = useRef<Map<string, DialogState>>(new Map())

  const getDialogState = useCallback((dialogId: string): DialogState => {
    let state = dialogStatesRef.current.get(dialogId)
    if (!state) {
      state = {
        isStreaming: false,
      }
      dialogStatesRef.current.set(dialogId, state)
    }
    return state
  }, [])

  const processDialogChunk = useCallback((dialogId: string, chunk: ChunkData, messageType: NatsMessageType) => {
    const isActiveDialog = dialogId === activeDialogId
    const dialogState = getDialogState(dialogId)

    const asAny = chunk as any
    if (asAny && typeof asAny === 'object' && typeof asAny.id === 'string' && typeof asAny.dialogId === 'string') {
      const message = asAny as Message
      if (message.dialogId !== dialogId) return
      
      if (message.chatType === CHAT_TYPE.ADMIN) {
        if (isActiveDialog) {
          addRealtimeMessage(message)
        } else {
          addBackgroundMessage(dialogId, message)
          onBackgroundUnreadIncrement(dialogId)
        }
      }
      return
    }

    const action = parseChunkToAction(chunk)
    if (!action) return

    const createBaseMessage = (messageType: string = 'TEXT'): Message => ({
      id: `nats-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      dialogId,
      chatType: CHAT_TYPE.ADMIN as any,
      dialogMode: 'DEFAULT',
      createdAt: new Date().toISOString(),
      owner: { type: 'ASSISTANT', model: '' } as any,
      messageData: { type: messageType, text: '' } as any,
    })

    switch (action.action) {
      case 'message_start':
        dialogState.isStreaming = true
        
        if (isActiveDialog) {
          onActiveStreamStart()
        } else {
          onBackgroundStreamStart(dialogId)
        }
        break

      case 'message_end':
        dialogState.isStreaming = false
        
        if (isActiveDialog) {
          onActiveStreamEnd()
        } else {
          onBackgroundStreamEnd(dialogId)
          onBackgroundUnreadIncrement(dialogId)
        }
        break

      case 'error':
        dialogState.isStreaming = false
        
        if (isActiveDialog) {
          onActiveError(action.error)
        } else {
          onBackgroundStreamEnd(dialogId)
        }
        break

      case 'text':
        const textMessage = {
          ...createBaseMessage('TEXT'),
          messageData: { type: 'TEXT', text: action.text } as any,
        }

        if (isActiveDialog) {
          addRealtimeMessage(textMessage)
        } else {
          addBackgroundMessage(dialogId, textMessage)
        }
        break

      case 'tool_execution': {
        const toolData = action.segment.data
        const toolMessage = {
          ...createBaseMessage(toolData.type),
          messageData: {
            type: toolData.type,
            integratedToolType: toolData.integratedToolType,
            toolFunction: toolData.toolFunction,
            parameters: toolData.parameters,
            result: toolData.result,
            success: toolData.success,
          } as any,
        }

        if (isActiveDialog) {
          addRealtimeMessage(toolMessage)
        } else {
          addBackgroundMessage(dialogId, toolMessage)
        }
        break
      }

      case 'approval_request': {
        const approvalMessage = {
          ...createBaseMessage('APPROVAL_REQUEST'),
          messageData: {
            type: 'APPROVAL_REQUEST',
            approvalType: action.approvalType,
            command: action.command,
            approvalRequestId: action.requestId,
            explanation: action.explanation,
          } as any,
        }

        if (isActiveDialog) {
          addRealtimeMessage(approvalMessage)
        } else {
          addBackgroundMessage(dialogId, approvalMessage)
        }
        break
      }

      case 'approval_result': {
        const resultMessage = {
          ...createBaseMessage('APPROVAL_RESULT'),
          messageData: {
            type: 'APPROVAL_RESULT',
            approvalRequestId: action.requestId,
            approved: action.approved,
            approvalType: action.approvalType,
          } as any,
        }

        if (isActiveDialog) {
          addRealtimeMessage(resultMessage)
        } else {
          addBackgroundMessage(dialogId, resultMessage)
        }
        break
      }
    }
  }, [
    activeDialogId,
    getDialogState,
    addRealtimeMessage,
    addBackgroundMessage,
    onActiveStreamStart,
    onActiveStreamEnd,
    onActiveError,
    onBackgroundStreamStart,
    onBackgroundStreamEnd,
    onBackgroundUnreadIncrement,
  ])

  const processChunk = useCallback((chunk: ChunkData, messageType: NatsMessageType, targetDialogId?: string) => {
    let dialogId = targetDialogId

    if (!dialogId) {
      const asAny = chunk as any
      if (asAny && typeof asAny === 'object' && typeof asAny.dialogId === 'string') {
        dialogId = asAny.dialogId
      }
    }

    if (!dialogId) {
      dialogId = activeDialogId || undefined
    }

    if (!dialogId) return

    processDialogChunk(dialogId, chunk, messageType)
  }, [activeDialogId, processDialogChunk])

  const resetDialog = useCallback((dialogId: string) => {
    dialogStatesRef.current.delete(dialogId)
  }, [])

  const cleanup = useCallback(() => {
    dialogStatesRef.current.clear()
  }, [])

  return {
    processChunk,
    resetDialog,
    cleanup,
  }
}