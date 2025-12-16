import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

/**
 * Scripts Store
 */

export interface ScriptEntry {
  args: string[]
  category: string
  default_timeout: number
  description: string
  env_vars: string[]
  favorite: boolean
  filename: string
  hidden: boolean
  id: number
  name: string
  run_as_user: boolean
  script_type: string
  shell: string
  supported_platforms: string[]
  syntax: string
}

export interface ScriptsState {
  // State
  scripts: ScriptEntry[]
  search: string
  isLoading: boolean
  error: string | null
  
  // Actions
  setScripts: (scripts: ScriptEntry[]) => void
  setSearch: (search: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearScripts: () => void
  reset: () => void
}

const initialState = {
  scripts: [],
  search: '',
  isLoading: true,
  error: null,
}

export const useScriptsStore = create<ScriptsState>()(
  devtools(
    immer((set) => ({
      // State
      ...initialState,

      // Actions
      setScripts: (scripts) =>
        set((state) => {
          state.scripts = scripts
          state.error = null
        }),

      setSearch: (search) =>
        set((state) => {
          state.search = search
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

      clearScripts: () =>
        set((state) => {
          state.scripts = []
          state.error = null
        }),

      reset: () =>
        set(() => initialState),
    })),
    {
      name: 'scripts-store',
    }
  )
)

// Selectors for optimized re-renders
export const selectLogs = (state: ScriptsState) => state.scripts
export const selectSearch = (state: ScriptsState) => state.search
export const selectIsLoading = (state: ScriptsState) => state.isLoading
export const selectError = (state: ScriptsState) => state.error
