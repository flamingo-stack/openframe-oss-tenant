'use client'

import React from 'react'
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@lib/api-client'
import { useMingoDialogDetailsStore } from '../stores/mingo-dialog-details-store'
import { GET_MINGO_DIALOG_QUERY, GET_DIALOG_MESSAGES_QUERY } from '../queries/dialogs-queries'
import { CHAT_TYPE } from '../../tickets/constants'
import type { DialogResponse, MessagesResponse, MessagePage } from '../types'

export function useMingoDialogSelection() {
  const {
    currentDialogId,
    setCurrentDialogId,
    setCurrentDialog,
    setAdminMessages,
    setPagination,
    setLoadingDialog,
    setLoadingMessages
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

  const messagesQuery = useInfiniteQuery({
    queryKey: ['mingo-dialog-messages', currentDialogId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }): Promise<MessagePage> => {
      if (!currentDialogId) return { messages: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } }

      const response = await apiClient.post<MessagesResponse>('/chat/graphql', {
        query: GET_DIALOG_MESSAGES_QUERY,
        variables: { 
          dialogId: currentDialogId, 
          cursor: pageParam,
          limit: 100
        }
      })

      if (!response.ok || !response.data?.data?.messages) {
        throw new Error(response.error || 'Failed to fetch messages')
      }

      const { edges, pageInfo } = response.data.data.messages
      const allMessages = edges.map(edge => edge.node)
      const adminMessages = allMessages.filter(msg => msg.chatType === CHAT_TYPE.ADMIN)

      return { messages: adminMessages, pageInfo }
    },
    getNextPageParam: (lastPage: MessagePage) => {
      return lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined
    },
    initialPageParam: undefined as string | undefined,
    enabled: !!currentDialogId,
    staleTime: 30 * 1000,
  })

  const selectDialogMutation = useMutation({
    mutationFn: async (dialogId: string) => {
      setCurrentDialog(null)
      setAdminMessages([])
      setPagination(false, null, null)
      
      setLoadingDialog(true)
      setLoadingMessages(true)
      
      setCurrentDialogId(dialogId)
      
      return dialogId
    }
  })

  React.useEffect(() => {
    if (dialogQuery.data) {
      setCurrentDialog(dialogQuery.data)
    }
  }, [dialogQuery.data, setCurrentDialog])

  React.useEffect(() => {
    if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage && !messagesQuery.isLoading) {
      messagesQuery.fetchNextPage()
    }
  }, [messagesQuery.hasNextPage, messagesQuery.isFetchingNextPage, messagesQuery.isLoading, messagesQuery.fetchNextPage])

  React.useEffect(() => {
    if (messagesQuery.data?.pages) {
      const allAdminMessages = messagesQuery.data.pages.flatMap(page => page.messages)
      setAdminMessages(allAdminMessages)

      const lastPage = messagesQuery.data.pages[messagesQuery.data.pages.length - 1]
      if (lastPage) {
        setPagination(
          lastPage.pageInfo.hasPreviousPage,
          messagesQuery.data.pages[0]?.pageInfo.startCursor || null,
          lastPage.pageInfo.endCursor || null
        )
      }
    }
  }, [messagesQuery.data?.pages, setAdminMessages, setPagination])

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