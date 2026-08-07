import { useEffect, useState } from 'react';
import { tokenService } from '../services/tokenService';

/**
 * The chat backend serves the Fae avatar behind a Bearer-protected endpoint
 * (`www-authenticate: Bearer`). A plain `<img src>` can't carry the
 * `Authorization` header, so the image 401s. This hook fetches the bytes with
 * the Bearer token and returns them as a `data:` URI — safe to feed straight
 * into an `<img src>` (no auth needed), and persistable as-is by the branding
 * pre-paint cache so the next cold start paints the real image immediately.
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

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function useAuthenticatedImage(url: string | null | undefined): AuthenticatedImage {
  const [dataUri, setDataUri] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setDataUri(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setDataUri(undefined);

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
        const uri = await blobToDataUri(await response.blob());
        if (!cancelled) setDataUri(uri);
      } catch (_error) {
        if (!cancelled) setDataUri(undefined);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { url: dataUri, isLoading };
}
