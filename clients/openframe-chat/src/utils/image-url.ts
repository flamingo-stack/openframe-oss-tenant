import { tokenService } from '../services/tokenService';

/**
 * Build full image URL with API base URL prefix
 * @param imageUrl - relative or absolute image URL
 * @param hash - content hash appended as `?v=` to bust the browser cache when the image changes
 * @returns full URL with API base prefix, or undefined if no imageUrl provided
 */
export function getFullImageUrl(imageUrl: string | null | undefined, hash?: string | null): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  return appendImageHash(buildFullUrl(imageUrl), hash);
}

/**
 * Append a content `hash` as `?v=` to bust the browser cache when the image
 * changes. Preserves the URL's relative/absolute form (unlike getFullImageUrl,
 * which prefixes the API host) — use when the consumer resolves the URL itself.
 */
export function appendImageHash<T extends string | null | undefined>(imageUrl: T, hash?: string | null): T {
  if (!imageUrl || !hash) {
    return imageUrl;
  }
  const separator = imageUrl.includes('?') ? '&' : '?';
  return `${imageUrl}${separator}v=${encodeURIComponent(hash)}` as T;
}

/**
 * Build the Fae avatar download URL served by the chat backend. The endpoint
 * is public and 302-redirects to a presigned bucket URL, so it can be used
 * directly as an `<img src>`. `hash` is appended as `?v=` for cache-busting.
 * Returns undefined when there is no FaeSettings id.
 */
export function getFaeAvatarUrl(faeSettingsId: string | null | undefined, hash?: string | null): string | undefined {
  if (!faeSettingsId) {
    return undefined;
  }
  const tenantHost = tokenService.getCurrentApiBaseUrl() ?? '';
  return appendImageHash(`${tenantHost}/chat/fae-settings/${encodeURIComponent(faeSettingsId)}/image/url`, hash);
}

function buildFullUrl(imageUrl: string): string {
  // Already a full URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  const tenantHost = tokenService.getCurrentApiBaseUrl() ?? '';

  // Already has /chat/ prefix
  if (imageUrl.startsWith('/chat/')) {
    return `${tenantHost}${imageUrl}`;
  }

  // Has leading slash but no /chat/
  if (imageUrl.startsWith('/')) {
    return `${tenantHost}/chat${imageUrl}`;
  }

  // No leading slash
  return `${tenantHost}/chat/${imageUrl}`;
}
