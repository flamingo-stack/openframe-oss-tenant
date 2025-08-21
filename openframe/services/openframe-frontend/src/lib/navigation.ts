import { useNavigate as useReactRouterNavigate, NavigateOptions } from 'react-router-dom'

/**
 * Navigation utility hook that wraps React Router's useNavigate
 * Provides consistent navigation patterns across the app
 */
export function useNavigation() {
  const navigate = useReactRouterNavigate()

  const navigateTo = (path: string, options?: NavigateOptions) => {
    navigate(path, options)
  }

  const goBack = () => {
    navigate(-1)
  }

  const goForward = () => {
    navigate(1)
  }

  const replace = (path: string) => {
    navigate(path, { replace: true })
  }

  return {
    navigateTo,
    goBack,
    goForward,
    replace,
    // Also expose the raw navigate function
    navigate
  }
}

/**
 * Auth navigation utilities
 */
export const authRoutes = {
  choice: '/auth',
  signup: '/auth/signup',
  login: '/auth/login',
  dashboard: '/dashboard'
} as const

export type AuthRoute = typeof authRoutes[keyof typeof authRoutes]