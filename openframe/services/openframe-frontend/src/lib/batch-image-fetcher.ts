import { useEffect, useMemo, useState, useRef } from 'react'
import { runtimeEnv } from './runtime-config'

/**
 * Fetch multiple images with authentication in batch
 * Returns a map of original imageUrl to fetched blob URL
 */
export async function batchFetchAuthenticatedImages(imageUrls: string[]): Promise<Record<string, string | undefined>> {
  const results: Record<string, string | undefined> = {}
  
  if (imageUrls.length === 0) {
    return results
  }

  const fetchPromises = imageUrls.map(async (imageUrl) => {
    try {
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

      const cacheBuster = `?t=${Date.now()}`
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

      const response = await fetch(fullImageUrl, {
        method: 'GET',
        credentials: 'include',
        headers
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      
      return { imageUrl, fetchedUrl: objectUrl }
    } catch (error) {
      return { imageUrl, fetchedUrl: undefined }
    }
  })

  const fetchResults = await Promise.all(fetchPromises)
  
  fetchResults.forEach(({ imageUrl, fetchedUrl }) => {
    results[imageUrl] = fetchedUrl
  })

  return results
}

/**
 * Hook to batch fetch images with authentication
 * Only fetches unique URLs and caches results
 */
export function useBatchImages(imageUrls: (string | null | undefined)[]): Record<string, string | undefined> {
  const [fetchedImages, setFetchedImages] = useState<Record<string, string | undefined>>({})
  const [loading, setLoading] = useState(false)
  
  const uniqueUrls = useMemo(() => 
    Array.from(new Set(imageUrls.filter((url): url is string => Boolean(url)))),
    [imageUrls]
  )
  
  const requestedUrls = useRef<Set<string>>(new Set())
  
  useEffect(() => {
    if (uniqueUrls.length === 0) {
      setFetchedImages({})
      return
    }

    const urlsToFetch = uniqueUrls.filter(url => !requestedUrls.current.has(url))
    
    if (urlsToFetch.length === 0) {
      return // All URLs already requested
    }

    urlsToFetch.forEach(url => requestedUrls.current.add(url))

    setLoading(true)
    
    batchFetchAuthenticatedImages(urlsToFetch)
      .then(newResults => {
        setFetchedImages(prev => ({ ...prev, ...newResults }))
      })
      .catch(error => {
        console.error('Failed to batch fetch images:', error)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      Object.values(fetchedImages).forEach(blobUrl => {
        if (blobUrl && blobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(blobUrl)
        }
      })
    }
  }, [uniqueUrls])

  return fetchedImages
}