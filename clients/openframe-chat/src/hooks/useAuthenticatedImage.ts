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
  // The settled request is stored together with the URL it answered, and
  // `isLoading` is DERIVED from the mismatch instead of flipped in the effect:
  // on the very first render after `url` appears (or changes) the hook already
  // reports loading, so callers never see a "settled with nothing" frame that
  // would flash their fallback before the effect below has even committed.
  const [settled, setSettled] = useState<{ url: string; dataUri: string | undefined } | null>(null);
  const isLoading = Boolean(url) && settled?.url !== url;

  useEffect(() => {
    if (!url) return;

    let cancelled = false;

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
        const dataUri = await blobToDataUri(await response.blob());
        if (!cancelled) setSettled({ url, dataUri });
      } catch (_error) {
        if (!cancelled) setSettled({ url, dataUri: undefined });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { url: url && settled?.url === url ? settled.dataUri : undefined, isLoading };
}
