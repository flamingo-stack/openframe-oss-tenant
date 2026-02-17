import { runtimeEnv } from './runtime-config'

/**
 * Build full image URL with API base URL prefix
 * @param imageUrl - relative or absolute image URL
 * @returns full URL with API base prefix, or undefined if no imageUrl provided
 */
export function getFullImageUrl(imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl) {
    return undefined
  }

  // Already a full URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  const tenantHost = runtimeEnv.tenantHostUrl()

  // Already has /api/ prefix
  if (imageUrl.startsWith('/api/')) {
    return `${tenantHost}${imageUrl}`
  }

  // Has leading slash but no /api/
  if (imageUrl.startsWith('/')) {
    return `${tenantHost}/api${imageUrl}`
  }

  // No leading slash
  return `${tenantHost}/api/${imageUrl}`
}
