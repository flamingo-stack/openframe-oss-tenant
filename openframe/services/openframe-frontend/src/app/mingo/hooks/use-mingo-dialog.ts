'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'
import { CHAT_TYPE } from '../../tickets/constants'

interface CreateDialogResponse {
  id: string
  agentType: string
  currentMode: string
  status: string
  title: string
  createdAt: string
  statusUpdatedAt: string
  resolvedAt: string
}

interface CreateDialogRequest {
  agentType: 'ADMIN'
}

interface SendMessageRequest {
  dialogId: string
  content: string
  chatType: typeof CHAT_TYPE.ADMIN
}

export function useMingoDialog() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [currentDialogId, setCurrentDialogId] = useState<string | null>(null)
  const dialogIdRef = useRef<string | null>(null)

  const getActiveDialogId = useCallback((preferredDialogId?: string | null) => {
    return preferredDialogId || currentDialogId || dialogIdRef.current
  }, [currentDialogId])

  const createDialogMutation = useMutation({
    mutationFn: async (): Promise<CreateDialogResponse> => {
      const response = await apiClient.post<CreateDialogResponse>('/chat/api/v1/dialogs', {
        agentType: 'ADMIN'
      } as CreateDialogRequest)

      if (!response.ok) {
        throw new Error(response.error || `Failed to create dialog with status ${response.status}`)
      }

      if (!response.data?.id) {
        throw new Error('Invalid response: dialog id not found')
      }

      return response.data
    },
    onSuccess: (data) => {
      setCurrentDialogId(data.id)
      dialogIdRef.current = data.id
      queryClient.invalidateQueries({ queryKey: ['mingo-dialogs'] })
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create new chat'
      
      toast({
        title: "Failed to Create Chat",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      })

      console.error('Failed to create dialog:', error)
    }
  })

  const sendMessageMutation = useMutation({
    mutationFn: async ({ dialogId, content }: { dialogId: string; content: string }) => {
      const response = await apiClient.post('/chat/api/v1/messages', {
        dialogId,
        content,
        chatType: CHAT_TYPE.ADMIN
      } as SendMessageRequest)

      if (!response.ok) {
        throw new Error(response.error || `Failed to send message with status ${response.status}`)
      }

      return response.data
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'

      toast({
        title: "Send Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      })

      console.error('Failed to send message:', error)
    }
  })

  const createDialog = useCallback(async (): Promise<string | null> => {
    if (createDialogMutation.isPending) {
      return currentDialogId
    }

    try {
      const result = await createDialogMutation.mutateAsync()
      return result.id
    } catch (error) {
      return null
    }
  }, [createDialogMutation, currentDialogId])

  const sendMessage = useCallback(async (content: string, selectedDialogId?: string | null): Promise<boolean> => {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      toast({
        title: "Empty Message",
        description: "Please enter a message to send",
        variant: "destructive",
        duration: 3000
      })
      return false
    }

    let dialogId = getActiveDialogId(selectedDialogId)
    if (!dialogId) {
      dialogId = await createDialog()
      if (!dialogId) {
        return false
      }
    }

    try {
      await sendMessageMutation.mutateAsync({ dialogId, content: trimmedContent })
      return true
    } catch (error) {
      return false
    }
  }, [getActiveDialogId, createDialog, sendMessageMutation, toast])

  const resetDialog = useCallback(() => {
    setCurrentDialogId(null)
    dialogIdRef.current = null
    createDialogMutation.reset()
    sendMessageMutation.reset()
  }, [createDialogMutation, sendMessageMutation])

  return {
    currentDialogId,
    isCreatingDialog: createDialogMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,
    error: createDialogMutation.error || sendMessageMutation.error,
    createDialog,
    sendMessage,
    resetDialog,
    hasDialog: !!currentDialogId
  }
}