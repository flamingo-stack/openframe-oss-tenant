import { useEffect, useState } from 'react';
import { tokenService } from '../services/tokenService';

/**
 * The chat backend serves the Fae avatar behind a Bearer-protected endpoint
 * (`www-authenticate: Bearer`). A plain `<img src>` can't carry the
 * `Authorization` header, so the image 401s. This hook fetches the bytes with
 * the Bearer token, wraps them in an `object URL`, and returns that — safe to
 * feed straight into an `<img src>` (no auth needed on a blob URL).
 *
 * Returns `undefined` until the image resolves (or on error), so callers fall
 * back to initials / skeleton exactly as they do for a missing avatar.
 *
 * @param url Fully-built image URL (same origin as the API). `undefined`/`null`
 *            disables the fetch.
 */
export function useAuthenticatedImage(url: string | null | undefined): string | undefined {
  const [objectUrl, setObjectUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!url) {
      setObjectUrl(undefined);
      return;
    }

    let cancelled = false;
    let createdUrl: string | undefined;

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
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url]);

  return objectUrl;
}
