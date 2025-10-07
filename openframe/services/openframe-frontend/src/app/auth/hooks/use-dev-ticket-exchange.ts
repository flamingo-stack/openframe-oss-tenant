import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@flamingo/ui-kit/hooks'
import { useTokenStorage } from '../hooks/use-token-storage'
import { useAuthStore } from '../stores/auth-store'
import { apiClient } from '@lib/api-client'
import { authApiClient } from '@lib/auth-api-client'

/**
 * Hook for exchanging devTicket via API
 * Following MANDATORY pattern from CLAUDE.md with useToast for error handling
 */
export function useDevTicketExchange() {
  const { toast } = useToast() // MANDATORY for API hooks
  const router = useRouter()
  const { storeTokensFromHeaders } = useTokenStorage()
  const { login: storeLogin, setTenantId } = useAuthStore()

  // Exchange devTicket for authentication tokens
  const exchangeTicket = useCallback(
    async (ticket: string) => {
      try {
        console.log('🎫 [DevTicket Exchange] Initiating exchange for ticket:', ticket)
        const response = await authApiClient.devExchange(ticket)
        
        console.log('🎫 [DevTicket Exchange] API call completed, status:', response.status)
        
        if (!response.ok) {
          throw new Error(`DevTicket exchange failed with status ${response.status}`)
        }
        
        // Process and store tokens from headers using the existing hook
        const tokens = storeTokensFromHeaders(response.headers)
        
        if (tokens.accessToken || tokens.refreshToken) {
          console.log('🎫 [DevTicket Exchange] Tokens stored, fetching user data...')

          const meResponse = await authApiClient.me()
          
          if (meResponse.ok && meResponse.data && meResponse.data.authenticated) {
            const userData = meResponse.data.user
            
            if (userData && userData.email) {
              // Update auth store with user data
              const user = {
                id: userData.id || userData.userId || '',
                email: userData.email || '',
                name: userData.name || userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || '',
                organizationId: userData.organizationId || userData.tenantId,
                organizationName: userData.organizationName || userData.tenantName,
                role: userData.role || 'user'
              }

              // Store user in auth store
              storeLogin(user)
              
              // Store tenant ID if available
              const tenantId = userData.tenantId || userData.organizationId
              if (tenantId) {
                setTenantId(tenantId)
              }
              
              toast({
                title: 'Welcome!',
                description: `Successfully signed in as ${user.name || user.email}`,
                variant: 'success',
              })
              
              // Redirect to dashboard
              console.log('🔄 [DevTicket Exchange] Redirecting to dashboard...')
              router.push('/dashboard')
            }
          } else {
            toast({
              title: 'Authentication Successful',
              description: 'Tokens have been stored securely',
              variant: 'success',
            })
          }
        }
        
        return {
          success: response.ok,
          status: response.status,
          tokens,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to exchange devTicket'
        console.error('❌ [DevTicket Exchange] Exchange failed:', error)
        
        toast({
          title: 'Exchange Failed',
          description: message,
          variant: 'destructive',
        })
        
        return {
          success: false,
          status: 0,
          tokens: { accessToken: null, refreshToken: null },
        }
      }
    },
    [storeTokensFromHeaders, toast, storeLogin, setTenantId, router]
  )

  return {
    exchangeTicket,
  }
}