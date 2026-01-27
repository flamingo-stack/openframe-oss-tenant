'use client'

import React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@lib/api-client'
import { useMingoDialogDetailsStore } from '../stores/mingo-dialog-details-store'
import { GET_MINGO_DIALOG_QUERY, GET_DIALOG_MESSAGES_QUERY } from '../queries/dialogs-queries'
import { CHAT_TYPE } from '../../tickets/constants'
import type { DialogResponse, MessagesResponse } from '../types'

export function useMingoDialogSelection() {
  const {
    currentDialogId,
    setCurrentDialogId,
    setCurrentDialog,
    setAdminMessages,
    setPagination
  } = useMingoDialogDetailsStore()

  const dialogQuery = useQuery({
    queryKey: ['mingo-dialog', currentDialogId],
    queryFn: async () => {
      if (!currentDialogId) return null

      const response = await apiClient.post<DialogResponse>('/chat/graphql', {
        query: GET_MINGO_DIALOG_QUERY,
        variables: { id: currentDialogId }
      })

      if (!response.ok || !response.data?.data?.dialog) {
        throw new Error(response.error || 'Failed to fetch dialog')
      }

      return response.data.data.dialog
    },
    enabled: !!currentDialogId,
    staleTime: 30 * 1000,
  })

  const messagesQuery = useQuery({
    queryKey: ['mingo-dialog-messages', currentDialogId],
    queryFn: async () => {
      if (!currentDialogId) return []

      const response = await apiClient.post<MessagesResponse>('/chat/graphql', {
        query: GET_DIALOG_MESSAGES_QUERY,
        variables: { 
          dialogId: currentDialogId, 
          limit: 100
        }
      })

      if (!response.ok || !response.data?.data?.messages) {
        throw new Error(response.error || 'Failed to fetch messages')
      }

      const { edges, pageInfo } = response.data.data.messages
      const allMessages = edges.map(edge => edge.node)

      const adminMessages = allMessages.filter(msg => msg.chatType === CHAT_TYPE.ADMIN)

      setPagination(
        pageInfo.hasPreviousPage,
        pageInfo.startCursor || null,
        pageInfo.endCursor || null
      )

      return adminMessages
    },
    enabled: !!currentDialogId,
    staleTime: 30 * 1000,
  })

  const selectDialogMutation = useMutation({
    mutationFn: async (dialogId: string) => {
      setCurrentDialogId(dialogId)
      
      return dialogId
    },
    onSuccess: async () => {
      const [dialogResult, messagesResult] = await Promise.all([
        dialogQuery.refetch(),
        messagesQuery.refetch()
      ])
      
      if (dialogResult.data) {
        setCurrentDialog(dialogResult.data)
      }
      if (messagesResult.data) {
        setAdminMessages(messagesResult.data)
      }
    }
  })

  React.useEffect(() => {
    if (dialogQuery.data) {
      setCurrentDialog(dialogQuery.data)
    }
  }, [dialogQuery.data, setCurrentDialog])

  React.useEffect(() => {
    if (messagesQuery.data) {
      setAdminMessages(messagesQuery.data)
    }
  }, [messagesQuery.data, setAdminMessages])

  return {
    selectDialog: selectDialogMutation.mutate,
    isSelectingDialog: selectDialogMutation.isPending,
    isLoadingDialog: dialogQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    dialogError: dialogQuery.error?.message || null,
    messagesError: messagesQuery.error?.message || null,
    refetchDialog: dialogQuery.refetch,
    refetchMessages: messagesQuery.refetch
  }
}