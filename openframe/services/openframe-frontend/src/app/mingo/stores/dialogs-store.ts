import { create } from 'zustand'
import { Dialog, DialogConnection, CursorPageInfo } from '../types/dialog.types'
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
  currentPageInfo: CursorPageInfo | null
  currentHasLoadedBeyondFirst: boolean
  isLoadingCurrent: boolean
  currentError: string | null
  hasLoadedCurrent: boolean
  currentSearchTerm?: string
  
  // Archived dialogs state
  archivedDialogs: Dialog[]
  archivedPageInfo: CursorPageInfo | null
  archivedHasLoadedBeyondFirst: boolean
  isLoadingArchived: boolean
  archivedError: string | null
  hasLoadedArchived: boolean
  archivedSearchTerm?: string
  
  // Actions
  fetchDialogs: (archived: boolean, searchParam?: string, force?: boolean, cursor?: string | null) => Promise<void>
  goToNextPage: (archived: boolean) => Promise<void>
  goToFirstPage: (archived: boolean) => Promise<void>
  resetCurrentDialogs: () => void
  resetArchivedDialogs: () => void
}

export const useDialogsStore = create<DialogsStore>((set, get) => ({
  // Current dialogs state
  currentDialogs: [],
  currentPageInfo: null,
  currentHasLoadedBeyondFirst: false,
  isLoadingCurrent: false,
  currentError: null,
  hasLoadedCurrent: false,
  currentSearchTerm: undefined,
  
  // Archived dialogs state
  archivedDialogs: [],
  archivedPageInfo: null,
  archivedHasLoadedBeyondFirst: false,
  isLoadingArchived: false,
  archivedError: null,
  hasLoadedArchived: false,
  archivedSearchTerm: undefined,
  
  fetchDialogs: async (archived: boolean, searchParam?: string, force?: boolean, cursor?: string | null) => {
    const state = get()
    
    if (archived ? state.isLoadingArchived : state.isLoadingCurrent) {
      return
    }

    // Reset pagination when search term changes
    // Normalize empty string and undefined to be equivalent for comparison
    const currentSearch = archived ? state.archivedSearchTerm : state.currentSearchTerm
    const normalizedSearchParam = searchParam || ''
    const normalizedCurrentSearch = currentSearch || ''
    const isNewSearch = searchParam !== undefined && normalizedSearchParam !== normalizedCurrentSearch
    
    if (!force && !cursor && searchParam === undefined && (archived ? state.hasLoadedArchived : state.hasLoadedCurrent)) {
      return
    }
    
    set(archived ? 
      { 
        isLoadingArchived: true, 
        archivedError: null,
        ...(isNewSearch ? { 
          archivedDialogs: [], 
          archivedPageInfo: null,
          archivedHasLoadedBeyondFirst: false
        } : {}),
        archivedSearchTerm: searchParam !== undefined ? searchParam : state.archivedSearchTerm
      } : 
      { 
        isLoadingCurrent: true, 
        currentError: null,
        ...(isNewSearch ? { 
          currentDialogs: [], 
          currentPageInfo: null,
          currentHasLoadedBeyondFirst: false
        } : {}),
        currentSearchTerm: searchParam !== undefined ? searchParam : state.currentSearchTerm
      }
    )

    try {
      // Determine pagination variables
      const paginationVars: any = { limit: 10 }
      if (cursor) {
        paginationVars.cursor = cursor
      }
      
      // Use stored search term if not provided
      const effectiveSearchParam = searchParam !== undefined ? searchParam : 
        (archived ? state.archivedSearchTerm : state.currentSearchTerm)
      
      const response = await apiClient.post<GraphQLResponse<DialogsResponse>>('/chat/graphql', {
        query: GET_DIALOGS_QUERY,
        variables: {
          filter: archived ? 
            { statuses: ['ARCHIVED'] } : 
            { statuses: ['ACTIVE', 'ACTION_REQUIRED', 'ON_HOLD', 'RESOLVED'] },
          pagination: paginationVars,
          search: effectiveSearchParam || undefined,
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
      const pageInfo = connection?.pageInfo || {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null
      }
      
      // Track if we've navigated beyond the first page
      // If this is a new search, reset hasLoadedBeyondFirst to false
      // Otherwise, set to true if we have a cursor, or preserve previous value
      const hasLoadedBeyondFirst = isNewSearch
        ? false
        : (!!cursor || (archived ? state.archivedHasLoadedBeyondFirst : state.currentHasLoadedBeyondFirst))

      set(archived ?
        {
          archivedDialogs: nodes,
          archivedPageInfo: pageInfo,
          archivedHasLoadedBeyondFirst: hasLoadedBeyondFirst,
          hasLoadedArchived: true,
          isLoadingArchived: false
        } :
        {
          currentDialogs: nodes,
          currentPageInfo: pageInfo,
          currentHasLoadedBeyondFirst: hasLoadedBeyondFirst,
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
  
  goToNextPage: async (archived: boolean) => {
    const state = get()
    const pageInfo = archived ? state.archivedPageInfo : state.currentPageInfo
    
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      await state.fetchDialogs(archived, undefined, false, pageInfo.endCursor)
    }
  },
  
  goToFirstPage: async (archived: boolean) => {
    const state = get()
    const searchTerm = archived ? state.archivedSearchTerm : state.currentSearchTerm
    
    // Reset to first page by fetching without cursor
    set(archived ? 
      { archivedHasLoadedBeyondFirst: false } : 
      { currentHasLoadedBeyondFirst: false }
    )
    
    await state.fetchDialogs(archived, searchTerm, true, null)
  },
  
  resetCurrentDialogs: () => set({ 
    currentDialogs: [], 
    currentPageInfo: null,
    currentHasLoadedBeyondFirst: false,
    hasLoadedCurrent: false,
    currentError: null,
    currentSearchTerm: undefined
  }),
  
  resetArchivedDialogs: () => set({ 
    archivedDialogs: [], 
    archivedPageInfo: null,
    archivedHasLoadedBeyondFirst: false,
    hasLoadedArchived: false,
    archivedError: null,
    archivedSearchTerm: undefined
  })
}))