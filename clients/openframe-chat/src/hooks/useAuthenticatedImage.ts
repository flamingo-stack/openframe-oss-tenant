import { useEffect, useState } from 'react';
import { tokenService } from '../services/tokenService';

/**
 * The chat backend serves the Fae avatar behind a Bearer-protected endpoint
 * (`www-authenticate: Bearer`). A plain `<img src>` can't carry the
 * `Authorization` header, so the image 401s. This hook fetches the bytes with
 * the Bearer token, wraps them in an `object URL`, and returns that — safe to
 * feed straight into an `<img src>` (no auth needed on a blob URL).
 *
 * `url` is `undefined` until the image resolves (or on error). `isLoading`
 * stays `true` while the fetch is in flight so callers can keep showing a
 * skeleton instead of flashing a fallback before the real image arrives, and
 * only apply their fallback once `isLoading` is `false` and `url` is undefined.
 *
 * @param url Fully-built image URL (same origin as the API). `undefined`/`null`
 *            disables the fetch.
 */
export interface AuthenticatedImage {
  url: string | undefined;
  isLoading: boolean;
}

export function useAuthenticatedImage(url: string | null | undefined): AuthenticatedImage {
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setObjectUrl(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let createdUrl: string | undefined;
    setIsLoading(true);
    setObjectUrl(undefined);

    (async () => {
      try {
        await tokenService.ensureTokenReady();
        const token = tokenService.getCurrentToken();
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          throw new Error(`Avatar fetch failed (${response.status})`);
        }
        const blob = await response.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      } catch (_error) {
        if (!cancelled) setObjectUrl(undefined);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url]);

  return { url: objectUrl, isLoading };
}
