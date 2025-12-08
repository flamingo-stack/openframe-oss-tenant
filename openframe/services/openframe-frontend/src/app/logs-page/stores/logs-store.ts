import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Device } from '../../devices/types/device.types'

/**
 * Logs Store
 * Manages system logs state
 */

export interface LogEntry {
  toolEventId: string
  eventType: string
  ingestDay: string
  toolType: string
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  userId?: string
  deviceId?: string
  summary: string
  message?: string
  timestamp: string
  details?: string
  metadata?: Record<string, any>

  // New device-related fields from backend
  hostname?: string
  organizationName?: string
  organizationId?: string

  // Transformed device object (follows Device type pattern)
  device?: Partial<Device>

  __typename?: string
}

export interface LogEdge {
  node: LogEntry
  __typename?: string
}

export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
  __typename?: string
}

export interface LogFilters {
  toolTypes: string[]
  eventTypes: string[]
  severities: string[]
  organizations: { id: string, name: string }[]
  __typename?: string
}

export interface LogsState {
  // State
  logs: LogEntry[]
  edges: LogEdge[]
  search: string
  pageInfo: PageInfo | null
  pageSize: number
  isLoading: boolean
  error: string | null
  
  // Actions
  setLogs: (logs: LogEntry[]) => void
  setEdges: (edges: LogEdge[]) => void
  appendEdges: (edges: LogEdge[]) => void
  setSearch: (search: string) => void
  setPageInfo: (pageInfo: PageInfo) => void
  setPageSize: (size: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearLogs: () => void
  reset: () => void
}

const initialState = {
  logs: [],
  edges: [],
  search: '',
  pageInfo: null,
  pageSize: 10,
  isLoading: true,
  error: null,
}

export const useLogsStore = create<LogsState>()(
  devtools(
    immer((set) => ({
      // State
      ...initialState,

      // Actions
      setLogs: (logs) =>
        set((state) => {
          state.logs = logs
          state.error = null
        }),

      setEdges: (edges) =>
        set((state) => {
          state.edges = edges
          state.logs = edges.map(edge => edge.node)
          state.error = null
        }),

      appendEdges: (edges) =>
        set((state) => {
          // Defensive: Filter out duplicates before appending
          const existingIds = new Set(state.logs.map(log => log.toolEventId))
          const newEdges = edges.filter(edge => !existingIds.has(edge.node.toolEventId))

          if (newEdges.length < edges.length) {
            console.warn(`[LogsStore] Filtered ${edges.length - newEdges.length} duplicate logs before appending`)
          }

          state.edges = [...state.edges, ...newEdges]
          state.logs = [...state.logs, ...newEdges.map(edge => edge.node)]
        }),

      setSearch: (search) =>
        set((state) => {
          state.search = search
          state.pageInfo = null // Reset pagination on search change
        }),

      setPageInfo: (pageInfo) =>
        set((state) => {
          state.pageInfo = pageInfo
        }),

      setPageSize: (size) =>
        set((state) => {
          state.pageSize = size
          state.pageInfo = null // Reset pagination on page size change
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading
        }),

      setError: (error) =>
        set((state) => {
          state.error = error
          state.isLoading = false
        }),

      clearLogs: () =>
        set((state) => {
          state.logs = []
          state.edges = []
          state.pageInfo = null
          state.error = null
        }),

      reset: () =>
        set(() => initialState),
    })),
    { name: 'logs-store' }
  )
)

// Selectors for optimized re-renders
export const selectLogs = (state: LogsState) => state.logs
export const selectEdges = (state: LogsState) => state.edges
export const selectSearch = (state: LogsState) => state.search
export const selectPageInfo = (state: LogsState) => state.pageInfo
export const selectPageSize = (state: LogsState) => state.pageSize
export const selectIsLoading = (state: LogsState) => state.isLoading
export const selectError = (state: LogsState) => state.error

// Computed selectors
export const selectHasMorePages = (state: LogsState) => ({
  hasNext: state.pageInfo?.hasNextPage ?? false,
  hasPrevious: state.pageInfo?.hasPreviousPage ?? false,
})