import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Authentication Store
 * Manages user authentication state following OpenFrame patterns
 */

interface UserImage {
  imageUrl: string;
  hash: string;
}

interface User {
  id: string;
  email: string;
  // Fields populated from /me endpoint initially
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  organizationId?: string;
  organizationName?: string;
  role?: string;
  tenantId?: string;
  tenantName?: string;
  // Fields populated from full profile fetch
  status?: string;
  image?: UserImage;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoadingProfile: boolean;
  error: string | null;
  tenantId: string | null; // Store tenant ID in memory

  // Actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setTenantId: (tenantId: string | null) => void;
  fetchFullProfile: () => Promise<User | null>;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isLoadingProfile: false,
  error: null,
  tenantId: null,
};

// Helper to fetch full user profile
async function fetchUserProfile(userId: string): Promise<User | null> {
  try {
    const { apiClient } = await import('../../../lib/api-client');
    const res = await apiClient.get<User>(`api/users/${encodeURIComponent(userId)}`);
    if (res.ok && res.data) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.error('[AuthStore] Failed to fetch user profile:', error);
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        ...initialState,

        // Actions
        login: user =>
          set(state => {
            state.user = user;
            state.isAuthenticated = true;
            state.error = null;
          }),

        logout: () =>
          set(state => {
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
            state.tenantId = null; // Clear tenant ID on logout
          }),

        updateUser: userUpdate =>
          set(state => {
            if (state.user) {
              Object.assign(state.user, userUpdate);
            }
          }),

        setLoading: loading =>
          set(state => {
            state.isLoading = loading;
          }),

        setError: error =>
          set(state => {
            state.error = error;
            state.isLoading = false;
          }),

        clearError: () =>
          set(state => {
            state.error = null;
          }),

        setTenantId: tenantId =>
          set(state => {
            state.tenantId = tenantId;
          }),

        fetchFullProfile: async () => {
          const userId = get().user?.id;
          if (!userId) return null;

          set(state => {
            state.isLoadingProfile = true;
          });

          try {
            const fullProfile = await fetchUserProfile(userId);

            if (fullProfile) {
              set(state => {
                if (state.user) {
                  Object.assign(state.user, fullProfile);
                }
                state.isLoadingProfile = false;
              });
            } else {
              set(state => {
                state.isLoadingProfile = false;
              });
            }

            return fullProfile;
          } catch (error) {
            console.error('[AuthStore] Failed to fetch user profile:', error);
            set(state => {
              state.isLoadingProfile = false;
            });
            return null;
          }
        },
      })),
      {
        name: 'auth-storage', // Storage key
        partialize: state => ({
          // Only persist these fields
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          tenantId: state.tenantId,
        }),
      },
    ),
    {
      name: 'auth-store', // Redux DevTools name
    },
  ),
);

// Selectors for optimized re-renders
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;

// Export User type for external use
export type { User, UserImage };
