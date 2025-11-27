import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

/**
 * Organizations Store
 */

export interface OrganizationEntry {
  id: string
  organizationId: string
  name: string
  websiteUrl: string
  contact: {
    name: string
    email: string
  }
  tier: 'Basic' | 'Premium' | 'Enterprise'
  industry: 'Technology' | 'Professional Services' | 'Healthcare' | 'Financial Services' | 'Retail & Hospitality' | string
  mrrUsd: number
  contractDue: string
  lastActivity: string
  imageUrl?: string | null
}

export interface OrganizationsState {
  // State
  organizations: OrganizationEntry[]
  search: string
  isLoading: boolean
  error: string | null
  
  // Actions
  setOrganizations: (organizations: OrganizationEntry[]) => void
  setSearch: (search: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearOrganizations: () => void
  reset: () => void
}

const initialState = {
  organizations: [],
  search: '',
  isLoading: false,
  error: null,
}

export const useOrganizationsStore = create<OrganizationsState>()(
  devtools(
    immer((set) => ({
      // State
      ...initialState,

      // Actions
      setOrganizations: (organizations) =>
        set((state) => {
          state.organizations = organizations
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

      clearOrganizations: () =>
        set((state) => {
          state.organizations = []
          state.error = null
        }),

      reset: () =>
        set(() => initialState),
    })),
    {
      name: 'organizations-store',
    }
  )
)

// Selectors
export const selectOrganizations = (state: OrganizationsState) => state.organizations
export const selectSearch = (state: OrganizationsState) => state.search
export const selectIsLoading = (state: OrganizationsState) => state.isLoading
export const selectError = (state: OrganizationsState) => state.error
