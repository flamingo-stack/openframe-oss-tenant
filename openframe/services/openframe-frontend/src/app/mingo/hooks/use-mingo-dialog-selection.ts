'use client'

import React from 'react'
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query'
import { 
  processHistoricalMessagesWithErrors,
  type HistoricalMessage
} from '@flamingo-stack/openframe-frontend-core'
import { apiClient } from '@lib/api-client'
import { useMingoMessagesStore } from '../stores/mingo-messages-store'
import { GET_MINGO_DIALOG_QUERY, GET_DIALOG_MESSAGES_QUERY } from '../queries/dialogs-queries'
import { CHAT_TYPE, ASSISTANT_CONFIG } from '../../tickets/constants'
import type { DialogResponse, MessagesResponse, MessagePage, GraphQLMessage } from '../types'

export function useMingoDialogSelection() {
  const {
    activeDialogId,
    setActiveDialogId,
    setMessages,
    setLoadingDialog,
    setLoadingMessages,
    setPagination,
    dialogs,
    setDialogs
  } = useMingoMessagesStore()

  const dialogQuery = useQuery({
    queryKey: ['mingo-dialog', activeDialogId],
    queryFn: async () => {
      if (!activeDialogId) return null

      const response = await apiClient.post<DialogResponse>('/chat/graphql', {
        query: GET_MINGO_DIALOG_QUERY,
        variables: { id: activeDialogId }
      })

      if (!response.ok || !response.data?.data?.dialog) {
        throw new Error(response.error || 'Failed to fetch dialog')
      }

      return response.data.data.dialog
    },
    enabled: !!activeDialogId,
    staleTime: 30 * 1000,
  })

  const messagesQuery = useInfiniteQuery({
    queryKey: ['mingo-dialog-messages', activeDialogId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }): Promise<MessagePage> => {
      if (!activeDialogId) return { messages: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } }

      const response = await apiClient.post<MessagesResponse>('/chat/graphql', {
        query: GET_DIALOG_MESSAGES_QUERY,
        variables: { 
          dialogId: activeDialogId, 
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
    enabled: !!activeDialogId,
    staleTime: 30 * 1000,
  })

  const selectDialogMutation = useMutation({
    mutationFn: async (dialogId: string) => {
      // Don't clear messages - let them persist for fast switching
      // Only clear pagination state for new queries
      setPagination(false, null, null)
      
      setLoadingDialog(true)
      setLoadingMessages(true)
      
      setActiveDialogId(dialogId)
      
      return dialogId
    }
  })

  React.useEffect(() => {
    if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage && !messagesQuery.isLoading) {
      messagesQuery.fetchNextPage()
    }
  }, [messagesQuery.hasNextPage, messagesQuery.isFetchingNextPage, messagesQuery.isLoading, messagesQuery.fetchNextPage])

  React.useEffect(() => {
    if (messagesQuery.data?.pages && activeDialogId) {
      const allGraphQLMessages = messagesQuery.data.pages.flatMap(page => page.messages)
      
      // Convert GraphQL messages to HistoricalMessage format
      const historicalMessages: HistoricalMessage[] = allGraphQLMessages
        .filter(msg => msg.chatType === CHAT_TYPE.ADMIN)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(msg => ({
          id: msg.id,
          dialogId: msg.dialogId,
          chatType: msg.chatType,
          createdAt: msg.createdAt,
          owner: msg.owner,
          messageData: msg.messageData,
        }))
      
      // Process through core library to get CoreMessage format
      const assistantConfig = ASSISTANT_CONFIG.MINGO
      const coreMessages = processHistoricalMessagesWithErrors(historicalMessages, {
        assistantName: assistantConfig.name,
        assistantType: assistantConfig.type,
        chatTypeFilter: CHAT_TYPE.ADMIN,
      })
      
      // Only update if we have new data or the dialog is empty
      const { getMessages } = useMingoMessagesStore.getState()
      const existingMessages = getMessages(activeDialogId)
      
      if (existingMessages.length === 0 || existingMessages.length !== coreMessages.length) {
        setMessages(activeDialogId, coreMessages)
      }

      const lastPage = messagesQuery.data.pages[messagesQuery.data.pages.length - 1]
      if (lastPage) {
        setPagination(
          lastPage.pageInfo.hasPreviousPage,
          messagesQuery.data.pages[0]?.pageInfo.startCursor || null,
          lastPage.pageInfo.endCursor || null
        )
      }
    }
  }, [messagesQuery.data?.pages, activeDialogId, setMessages, setPagination])

  return {
    selectDialog: selectDialogMutation.mutate,
    isSelectingDialog: selectDialogMutation.isPending,
    isLoadingDialog: dialogQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    rawMessagesCount: messagesQuery.data?.pages.reduce((total, page) => total + page.messages.length, 0) || 0,
    dialogError: dialogQuery.error?.message || null,
    messagesError: messagesQuery.error?.message || null,
    refetchDialog: dialogQuery.refetch,
    refetchMessages: messagesQuery.refetch
  }
}