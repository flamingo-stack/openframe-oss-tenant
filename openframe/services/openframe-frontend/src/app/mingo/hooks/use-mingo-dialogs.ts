'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { apiClient } from '@lib/api-client'
import { GET_MINGO_DIALOGS_QUERY } from '../queries/dialogs-queries'
import type { DialogItem } from '@flamingo-stack/openframe-frontend-core'
import type { DialogNode, DialogsResponse, UseMingoDialogsOptions } from '../types'
import { useMingoBackgroundMessagesStore } from '../stores/mingo-background-messages-store'

function transformToDialogItem(dialog: DialogNode, unreadCount: number = 0): DialogItem {
  return {
    id: dialog.id,
    title: dialog.title || 'Untitled Dialog',
    timestamp: new Date(dialog.createdAt),
    unreadMessagesCount: unreadCount
  }
}

export function useMingoDialogs(options: UseMingoDialogsOptions = {}) {
  const { enabled = true, search, limit = 50 } = options
  const { unreadCounts, getUnreadCount } = useMingoBackgroundMessagesStore()

  const query = useQuery({
    queryKey: ['mingo-dialogs', { search, limit }],
    queryFn: async (): Promise<DialogNode[]> => {
      const variables = {
        filter: {
          agentTypes: ["ADMIN"]
        },
        pagination: {
          limit
        },
        search
      }

      const response = await apiClient.post<DialogsResponse>('/chat/graphql', {
        query: GET_MINGO_DIALOGS_QUERY,
        variables
      })

      if (!response.ok || !response.data) {
        throw new Error(response.error || 'Failed to fetch dialogs')
      }

      return response.data.data.dialogs.edges.map(edge => edge.node)
    },
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })

  const dialogsWithUnread = useMemo(() => {
    if (!query.data) return []
    
    return query.data.map(dialog => 
      transformToDialogItem(dialog, getUnreadCount(dialog.id))
    )
  }, [query.data, unreadCounts, getUnreadCount])

  return {
    dialogs: dialogsWithUnread,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message,
    refetch: query.refetch,
    hasNextPage: false,
    fetchNextPage: () => {},
  }
}