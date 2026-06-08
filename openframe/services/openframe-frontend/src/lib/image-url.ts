import { runtimeEnv } from './runtime-config';

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
  return `${imageUrl}${separator}v=${hash}` as T;
}

function buildFullUrl(imageUrl: string): string {
  // Already a full URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  const tenantHost = runtimeEnv.tenantHostUrl();

  // Already has /api/ prefix
  if (imageUrl.startsWith('/api/')) {
    return `${tenantHost}${imageUrl}`;
  }

  // Has leading slash but no /api/
  if (imageUrl.startsWith('/')) {
    return `${tenantHost}/api${imageUrl}`;
  }

  // No leading slash
  return `${tenantHost}/api/${imageUrl}`;
}
