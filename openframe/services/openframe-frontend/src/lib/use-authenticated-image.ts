import { useEffect, useState } from 'react'
import { runtimeEnv } from './runtime-config'

/**
 * Hook to fetch images with authentication (cookies + optional auth headers)
 * Returns a blob URL that can be used in img tags
 * Handles cleanup of blob URLs automatically
 * @param imageUrl - The image URL to fetch
 * @param refreshKey - Optional key to force re-fetch (e.g., timestamp after upload)
 */
export function useAuthenticatedImage(imageUrl?: string | null, refreshKey?: string | number) {
  const [fetchedImageUrl, setFetchedImageUrl] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    if (imageUrl) {
      setIsLoading(true)
      setError(null)

      const tenantHost = runtimeEnv.tenantHostUrl()
      
      let fullImageUrl: string
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        fullImageUrl = imageUrl
      } else if (imageUrl.startsWith('/api/')) {
        fullImageUrl = `${tenantHost}${imageUrl}`
      } else if (imageUrl.startsWith('/')) {
        fullImageUrl = `${tenantHost}/api${imageUrl}`
      } else {
        fullImageUrl = `${tenantHost}/api/${imageUrl}`
      }

      const cacheBuster = refreshKey ? `?v=${refreshKey}` : `?t=${Date.now()}`
      fullImageUrl = fullImageUrl + cacheBuster

      const headers: Record<string, string> = {
        'Accept': 'image/*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }

      if (runtimeEnv.enableDevTicketObserver()) {
        try {
          const accessToken = localStorage.getItem('of_access_token')
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
          }
        } catch (error) {
          // Silently continue without token
        }
      }

      fetch(fullImageUrl, {
        method: 'GET',
        credentials: 'include',
        headers
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`)
          }
          return response.blob()
        })
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob)
          setFetchedImageUrl(objectUrl)
          setIsLoading(false)

          cleanup = () => {
            URL.revokeObjectURL(objectUrl)
          }
        })
        .catch(error => {
          setError(error instanceof Error ? error.message : 'Failed to fetch image')
          setFetchedImageUrl(undefined)
          setIsLoading(false)
        })
    } else {
      setFetchedImageUrl(undefined)
      setIsLoading(false)
      setError(null)
    }

    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [imageUrl, refreshKey])

  return { imageUrl: fetchedImageUrl, isLoading, error }
}