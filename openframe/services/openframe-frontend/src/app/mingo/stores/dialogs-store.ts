import { create } from 'zustand'
import { Dialog, DialogConnection } from '../types/dialog.types'
import { GET_DIALOGS_QUERY } from '../queries/dialogs-queries'
import { apiClient } from '@lib/api-client'

interface DialogsResponse {
  dialogs: DialogConnection
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

interface DialogsStore {
  // Current dialogs state
  currentDialogs: Dialog[]
  isLoadingCurrent: boolean
  currentError: string | null
  hasLoadedCurrent: boolean
  
  // Archived dialogs state
  archivedDialogs: Dialog[]
  isLoadingArchived: boolean
  archivedError: string | null
  hasLoadedArchived: boolean
  
  // Actions
  fetchDialogs: (archived: boolean, searchParam?: string, force?: boolean) => Promise<void>
  resetCurrentDialogs: () => void
  resetArchivedDialogs: () => void
}

export const useDialogsStore = create<DialogsStore>((set, get) => ({
  // Current dialogs state
  currentDialogs: [],
  isLoadingCurrent: false,
  currentError: null,
  hasLoadedCurrent: false,
  
  // Archived dialogs state
  archivedDialogs: [],
  isLoadingArchived: false,
  archivedError: null,
  hasLoadedArchived: false,
  
  fetchDialogs: async (archived: boolean, searchParam?: string, force?: boolean) => {
    const state = get()
    
    if (archived ? state.isLoadingArchived : state.isLoadingCurrent) {
      return
    }
    
    if (!force && !searchParam && (archived ? state.hasLoadedArchived : state.hasLoadedCurrent)) {
      return
    }
    
    set(archived ? 
      { isLoadingArchived: true, archivedError: null } : 
      { isLoadingCurrent: true, currentError: null }
    )

    try {
      const response = await apiClient.post<GraphQLResponse<DialogsResponse>>('/chat/graphql', {
        query: GET_DIALOGS_QUERY,
        variables: {
          filter: archived ? 
            { statuses: ['ARCHIVED'] } : 
            { statuses: ['ACTIVE', 'ACTION_REQUIRED', 'ON_HOLD', 'RESOLVED'] },
          pagination: { limit: 50 },
          search: searchParam || undefined,
          slaSort: 'ASC'
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

      const connection = graphqlResponse.data.dialogs
      const nodes = (connection?.edges || []).map(edge => edge.node)
      
      set(archived ? 
        { 
          archivedDialogs: nodes, 
          hasLoadedArchived: true,
          isLoadingArchived: false 
        } : 
        { 
          currentDialogs: nodes, 
          hasLoadedCurrent: true,
          isLoadingCurrent: false 
        }
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dialogs'
      console.error('Failed to fetch dialogs:', error)
      
      set(archived ? 
        { archivedError: errorMessage, isLoadingArchived: false } : 
        { currentError: errorMessage, isLoadingCurrent: false }
      )

      throw error
    }
  },
  
  resetCurrentDialogs: () => set({ 
    currentDialogs: [], 
    hasLoadedCurrent: false,
    currentError: null 
  }),
  
  resetArchivedDialogs: () => set({ 
    archivedDialogs: [], 
    hasLoadedArchived: false,
    archivedError: null 
  })
}))