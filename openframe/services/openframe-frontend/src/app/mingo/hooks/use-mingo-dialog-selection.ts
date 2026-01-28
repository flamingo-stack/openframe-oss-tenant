'use client'

import React from 'react'
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@lib/api-client'
import { useMingoDialogDetailsStore } from '../stores/mingo-dialog-details-store'
import { useMingoBackgroundMessagesStore } from '../stores/mingo-background-messages-store'
import { GET_MINGO_DIALOG_QUERY, GET_DIALOG_MESSAGES_QUERY } from '../queries/dialogs-queries'
import { CHAT_TYPE } from '../../tickets/constants'
import type { DialogResponse, MessagesResponse, MessagePage, Message } from '../types'

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

  const { moveBackgroundToActive } = useMingoBackgroundMessagesStore()

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
    if (messagesQuery.data?.pages && currentDialogId) {
      const allAdminMessages = messagesQuery.data.pages.flatMap(page => page.messages)
      const backgroundMessages = moveBackgroundToActive(currentDialogId)
      const messageMap = new Map<string, Message>()

      allAdminMessages.forEach(msg => messageMap.set(msg.id, msg))
      
      backgroundMessages.forEach(msg => {
        const existing = messageMap.get(msg.id)
        
        if (msg.owner?.type === 'ASSISTANT' && 
            (!msg.messageData?.text || msg.messageData.text === '') &&
            msg.id.startsWith('typing-')) {
          messageMap.set(msg.id, msg)
          return
        }
        
        if (msg.id.startsWith('nats-') && existing) {
          const backgroundText = msg.messageData?.text || ''
          const existingText = existing.messageData?.text || ''
          if (backgroundText.length > existingText.length) {
            messageMap.set(msg.id, msg)
          }
          return
        }
        
        if (!existing) {
          messageMap.set(msg.id, msg)
        }
      })
      
      const combinedMessages = Array.from(messageMap.values())
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      
      setAdminMessages(combinedMessages)

      const lastPage = messagesQuery.data.pages[messagesQuery.data.pages.length - 1]
      if (lastPage) {
        setPagination(
          lastPage.pageInfo.hasPreviousPage,
          messagesQuery.data.pages[0]?.pageInfo.startCursor || null,
          lastPage.pageInfo.endCursor || null
        )
      }
    }
  }, [messagesQuery.data?.pages, currentDialogId, setAdminMessages, setPagination, moveBackgroundToActive])

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