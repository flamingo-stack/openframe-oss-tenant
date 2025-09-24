'use client'

import { useState, useCallback } from 'react'
import { GET_DIALOGS_QUERY } from '../queries/dialogs-queries'
import { Dialog } from '../types/dialog.types'
import { useToast } from '@flamingo/ui-kit/hooks'
import { apiClient } from '../../../lib/api-client'
import { getMockDialogs } from '../data/mock-dialogs'

// Toggle between mock data and actual API calls
const USE_MOCK_DATA = true

interface DialogsResponse {
  dialogs: Dialog[]
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

export function useDialogs(archived: boolean = false) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogs, setDialogs] = useState<Dialog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDialogs = useCallback(async (searchParam?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      if (USE_MOCK_DATA) {
        // Mock data simulation with delay
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const mockDialogs = getMockDialogs(archived, searchParam || searchTerm)
        setDialogs(mockDialogs)
        return { dialogs: mockDialogs }
      } else {
        const response = await apiClient.post<GraphQLResponse<DialogsResponse>>('graphql', {
          query: GET_DIALOGS_QUERY,
          variables: {
            archived,
            search: searchParam || searchTerm || undefined
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

        setDialogs(graphqlResponse.data.dialogs || [])
        return graphqlResponse.data
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dialogs'
      console.error('Failed to fetch dialogs:', error)
      setError(errorMessage)
      
      toast({
        title: 'Error',
        description: `Failed to fetch ${archived ? 'archived' : 'current'} chats: ${errorMessage}`,
        variant: 'destructive'
      })
      
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [archived, searchTerm, toast])

  const searchDialogs = useCallback(async (term: string) => {
    setSearchTerm(term)
    return fetchDialogs(term)
  }, [fetchDialogs])

  const refreshDialogs = useCallback(async () => {
    try {
      await fetchDialogs()
      toast({
        title: 'Success',
        description: `${archived ? 'Archived' : 'Current'} chats refreshed successfully`,
        variant: 'success'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh dialogs'
      toast({
        title: 'Error',
        description: `Failed to refresh ${archived ? 'archived' : 'current'} chats: ${errorMessage}`,
        variant: 'destructive'
      })
    }
  }, [fetchDialogs, archived, toast])

  return {
    dialogs,
    isLoading,
    error,
    searchDialogs,
    refreshDialogs,
    fetchDialogs
  }
}