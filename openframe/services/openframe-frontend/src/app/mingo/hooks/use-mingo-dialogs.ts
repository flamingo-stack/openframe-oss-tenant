'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { apiClient } from '@lib/api-client'
import { GET_MINGO_DIALOGS_QUERY } from '../queries/dialogs-queries'
import type { DialogItem } from '@flamingo-stack/openframe-frontend-core'
import type { DialogNode, DialogsResponse, UseMingoDialogsOptions } from '../types'
import { useMingoMessagesStore } from '../stores/mingo-messages-store'

function transformToDialogItem(dialog: DialogNode, unreadCount: number = 0): DialogItem {
  return {
    id: dialog.id,
    title: dialog.title || 'Untitled Dialog',
    timestamp: new Date(dialog.createdAt),
    unreadMessagesCount: unreadCount
  }
}

export function useMingoDialogs(options: UseMingoDialogsOptions = {}) {
  const { enabled = true, search, limit = 20 } = options
  const { getUnread } = useMingoMessagesStore()

  const query = useInfiniteQuery({
    queryKey: ['mingo-dialogs', { search, limit }],
    queryFn: async ({ pageParam }): Promise<{ dialogs: DialogNode[], pageInfo: { hasNextPage: boolean, endCursor?: string } }> => {
      const variables = {
        filter: {
          agentTypes: ["ADMIN"]
        },
        pagination: {
          limit,
          cursor: pageParam
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

      const { edges, pageInfo } = response.data.data.dialogs
      return {
        dialogs: edges.map(edge => edge.node),
        pageInfo
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor : undefined
    },
    initialPageParam: undefined as string | undefined,
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })

  const dialogsWithUnread = useMemo(() => {
    if (!query.data?.pages) return []
    
    const allDialogs = query.data.pages.flatMap(page => page.dialogs)
    return allDialogs.map(dialog => 
      transformToDialogItem(dialog, getUnread(dialog.id))
    )
  }, [query.data?.pages, getUnread])

  return {
    dialogs: dialogsWithUnread,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message,
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  }
}