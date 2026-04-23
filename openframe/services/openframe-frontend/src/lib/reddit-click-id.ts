export const RDT_CID_PARAM = 'rdt_cid';
export const RDT_CID_SESSION_KEY = 'rdt_cid';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function captureRedditClickIdFromUrl(): string | null {
  if (!isBrowser()) return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(RDT_CID_PARAM);

    if (value?.trim()) {
      const trimmed = value.trim();
      try {
        window.sessionStorage.setItem(RDT_CID_SESSION_KEY, trimmed);
      } catch {}
      return trimmed;
    }
  } catch {}

  return null;
}

export function getStoredRedditClickId(): string | null {
  if (!isBrowser()) return null;

  try {
    const value = window.sessionStorage.getItem(RDT_CID_SESSION_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function setStoredRedditClickId(value: string | null | undefined): void {
  if (!isBrowser()) return;

  try {
    const trimmed = value?.trim();
    if (trimmed) {
      window.sessionStorage.setItem(RDT_CID_SESSION_KEY, trimmed);
    }
  } catch {}
}

export function clearStoredRedditClickId(): void {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.removeItem(RDT_CID_SESSION_KEY);
  } catch {}
}
