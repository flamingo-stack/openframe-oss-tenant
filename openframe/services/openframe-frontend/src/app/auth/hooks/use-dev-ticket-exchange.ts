import { useCallback } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'
import { useTokenStorage } from '../hooks/use-token-storage'

/**
 * Hook for exchanging devTicket via API
 * Following MANDATORY pattern from CLAUDE.md with useToast for error handling
 */
export function useDevTicketExchange() {
  const { toast } = useToast() // MANDATORY for API hooks
  const { storeTokensFromHeaders } = useTokenStorage()

  // Exchange devTicket for authentication tokens
  const exchangeTicket = useCallback(
    async (ticket: string) => {
      try {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://localhost/api').replace('/api', '')
        
        console.log('🎫 [DevTicket Exchange] Initiating exchange for ticket:', ticket)
        
        const response = await fetch(
          `${baseUrl}/oauth/dev-exchange?ticket=${encodeURIComponent(ticket)}`,
          {
            method: 'GET',
            credentials: 'include', // For cookie-based auth
            headers: {
              'Accept': 'application/json',
            },
          }
        )
        
        console.log('🎫 [DevTicket Exchange] API call completed, status:', response.status)
        
        // Process and store tokens from headers
        const tokens = storeTokensFromHeaders(response.headers)
        
        if (tokens.accessToken || tokens.refreshToken) {
          toast({
            title: 'Authentication Successful',
            description: 'Tokens have been stored securely',
            variant: 'success',
          })
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
    [storeTokensFromHeaders, toast]
  )

  return {
    exchangeTicket,
  }
}