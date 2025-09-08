import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

/**
 * Authentication Store
 * Manages user authentication state following OpenFrame patterns
 */

interface User {
  id: string
  email: string
  name: string
  organizationId?: string
  organizationName?: string
  role?: string
}

export interface AuthState {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  tenantId: string | null  // Store tenant ID in memory
  
  // Actions
  login: (user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  setTenantId: (tenantId: string | null) => void
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tenantId: null,
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set) => ({
        // State
        ...initialState,
        
        // Actions
        login: (user) =>
          set((state) => {
            state.user = user
            state.isAuthenticated = true
            state.error = null
          }),
        
        logout: () =>
          set((state) => {
            state.user = null
            state.isAuthenticated = false
            state.error = null
            state.tenantId = null  // Clear tenant ID on logout
          }),
        
        updateUser: (userUpdate) =>
          set((state) => {
            if (state.user) {
              Object.assign(state.user, userUpdate)
            }
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
        
        clearError: () =>
          set((state) => {
            state.error = null
          }),
        
        setTenantId: (tenantId) =>
          set((state) => {
            state.tenantId = tenantId
          }),
      })),
      {
        name: 'auth-storage', // Storage key
        partialize: (state) => ({
          // Only persist these fields
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store', // Redux DevTools name
    }
  )
)

// Selectors for optimized re-renders
export const selectUser = (state: AuthState) => state.user
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectIsLoading = (state: AuthState) => state.isLoading
export const selectError = (state: AuthState) => state.error