/**
 * Utility functions for the OpenFrame frontend
 */

/**
 * Get the base URL for the application based on environment
 * In production, uses the deployment URL
 * In development, uses localhost:4000
 */
export function getBaseUrl(): string {
  // In browser, use relative URLs
  if (typeof window !== 'undefined') {
    return ''
  }
  
  // For server-side rendering
  if (process.env.NODE_ENV === 'production') {
    // Use Vercel URL or custom domain
    return process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'https://openframe.dev'
  }
  
  // Development
  return 'http://localhost:4000'
}

/**
 * Generate absolute URL for assets
 */
export function getAssetUrl(path: string): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}