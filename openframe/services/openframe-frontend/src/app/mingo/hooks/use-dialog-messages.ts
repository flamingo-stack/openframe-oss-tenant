'use client'

import { useState, useCallback, useEffect } from 'react'
import { GET_DIALOG_MESSAGES_QUERY } from '../queries/dialogs-queries'
import { MessageConnection, Message } from '../types/dialog.types'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'

interface MessagesResponse {
  messages: MessageConnection
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

export function useDialogMessages(dialogId: string) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)

  const fetchMessages = useCallback(async (append: boolean = false) => {
    if (!dialogId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<GraphQLResponse<MessagesResponse>>('/chat/graphql', {
        query: GET_DIALOG_MESSAGES_QUERY,
        variables: {
          dialogId,
          cursor: append ? cursor : null,
          limit: 50
        }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const graphqlResponse = response.data

      if (graphqlResponse?.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message || 'GraphQL error occurred')
      }

      if (!graphqlResponse?.data) {
        throw new Error('No data received from server')
      }

      const connection = graphqlResponse.data.messages
      const newMessages = (connection?.edges || []).map(edge => edge.node)
      
      if (append) {
        setMessages(prev => [...prev, ...newMessages])
      } else {
        setMessages(newMessages)
      }

      setHasMore(connection?.pageInfo?.hasNextPage || false)
      setCursor(connection?.pageInfo?.endCursor || null)

      return newMessages
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch messages'
      console.error('Failed to fetch messages:', error)
      setError(errorMessage)

      toast({
        title: 'Error',
        description: `Failed to load messages: ${errorMessage}`,
        variant: 'destructive',
        duration: 5000
      })

      throw error
    } finally {
      setIsLoading(false)
    }
  }, [dialogId, cursor, toast])

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      return fetchMessages(true)
    }
  }, [fetchMessages, isLoading, hasMore])

  const refresh = useCallback(async () => {
    setCursor(null)
    return fetchMessages(false)
  }, [fetchMessages])

  useEffect(() => {
    if (dialogId) {
      fetchMessages(false).catch(() => {})
    }
  }, [dialogId])

  return {
    messages,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh
  }
}