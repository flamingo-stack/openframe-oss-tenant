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
  currentMessageId: string | null
  isStreaming: boolean
  accumulatedText: string
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

  const { updateRealtimeMessage, addRealtimeMessage } = useMingoDialogDetailsStore()
  const { updateBackgroundMessage, addBackgroundMessage } = useMingoBackgroundMessagesStore()

  const dialogStatesRef = useRef<Map<string, DialogState>>(new Map())

  const getDialogState = useCallback((dialogId: string): DialogState => {
    let state = dialogStatesRef.current.get(dialogId)
    if (!state) {
      state = {
        currentMessageId: null,
        isStreaming: false,
        accumulatedText: '',
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

    switch (action.action) {
      case 'message_start':
        dialogState.isStreaming = true
        dialogState.currentMessageId = `stream-${Date.now()}-${Math.random().toString(16).slice(2)}`
        dialogState.accumulatedText = ''
        
        if (isActiveDialog) {
          onActiveStreamStart()
        } else {
          onBackgroundStreamStart(dialogId)
        }

        const initialMessage: Message = {
          id: dialogState.currentMessageId,
          dialogId,
          chatType: CHAT_TYPE.ADMIN as any,
          dialogMode: 'DEFAULT',
          createdAt: new Date().toISOString(),
          owner: { type: 'ASSISTANT', model: '' } as any,
          messageData: { type: 'TEXT', text: '' } as any,
        }

        if (isActiveDialog) {
          addRealtimeMessage(initialMessage)
        } else {
          addBackgroundMessage(dialogId, initialMessage)
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
        
        dialogState.currentMessageId = null
        break

      case 'error':
        dialogState.isStreaming = false
        
        if (isActiveDialog) {
          onActiveError(action.error)
        } else {
          onBackgroundStreamEnd(dialogId)
        }
        
        dialogState.currentMessageId = null
        break

      case 'text':
        if (dialogState.currentMessageId && dialogState.isStreaming) {
          dialogState.accumulatedText += action.text
          
          const updatedMessage: Message = {
            id: dialogState.currentMessageId,
            dialogId,
            chatType: CHAT_TYPE.ADMIN as any,
            dialogMode: 'DEFAULT',
            createdAt: new Date().toISOString(),
            owner: { type: 'ASSISTANT', model: '' } as any,
            messageData: { type: 'TEXT', text: dialogState.accumulatedText } as any,
          }

          if (isActiveDialog) {
            updateRealtimeMessage(dialogState.currentMessageId, updatedMessage)
          } else {
            updateBackgroundMessage(dialogId, dialogState.currentMessageId, updatedMessage)
          }
        }
        break

      case 'tool_execution': {
        const toolData = action.segment.data
        const toolMessage: Message = {
          id: `tool-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          dialogId,
          chatType: CHAT_TYPE.ADMIN as any,
          dialogMode: 'DEFAULT',
          createdAt: new Date().toISOString(),
          owner: { type: 'ASSISTANT', model: '' } as any,
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
        const approvalMessage: Message = {
          id: `approval-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          dialogId,
          chatType: CHAT_TYPE.ADMIN as any,
          dialogMode: 'DEFAULT',
          createdAt: new Date().toISOString(),
          owner: { type: 'ASSISTANT', model: '' } as any,
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
        const resultMessage: Message = {
          id: `approval-result-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          dialogId,
          chatType: CHAT_TYPE.ADMIN as any,
          dialogMode: 'DEFAULT',
          createdAt: new Date().toISOString(),
          owner: { type: 'ASSISTANT', model: '' } as any,
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
    updateRealtimeMessage,
    addRealtimeMessage,
    updateBackgroundMessage,
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