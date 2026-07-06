function btoaUtf8(value: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(value);
  }
  return Buffer.from(value, 'utf8').toString('base64');
}

function atobUtf8(value: string): string | null {
  try {
    // Re-add the `=` padding `toGlobalId` (and the backend) strip — `atob` rejects
    // an unpadded string whose length isn't a multiple of 4.
    const remainder = value.length % 4;
    const padded = remainder ? value + '='.repeat(4 - remainder) : value;
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(padded);
    }
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export interface DecodedGlobalId {
  typename: string;
  rawId: string;
}

export function toGlobalId(typename: string, rawId: string): string {
  // Strip `=` padding to mirror the backend's global-id encoder (e.g.
  // `Base64.getEncoder().withoutPadding()` — observed: `Script:<id>` →
  // `U2NyaXB0Oj…Nw`, no padding). Producing the SAME bytes the backend emits
  // keeps a re-encoded id byte-identical to the server's `node.id`, which matters
  // for: (1) URL-safety — padded `=` percent-encodes to `%3D` in a detail-page
  // route segment and the stray `%` fails the backend base64 decoder; (2) exact
  // id matches — e.g. the notification live-update `store.get(globalId)` lookup
  // against a server-loaded record.
  return btoaUtf8(`${typename}:${rawId}`).replace(/=+$/, '');
}

export function decodeGlobalId(value: string): DecodedGlobalId | null {
  const decoded = atobUtf8(value);
  if (decoded === null) return null;
  const colon = decoded.indexOf(':');
  if (colon < 0) return null;
  const typename = decoded.slice(0, colon);
  const rawId = decoded.slice(colon + 1);
  if (!typename || !rawId) return null;
  return { typename, rawId };
}

export function ensureGlobalIdForType(typename: string, value: string): string {
  const decoded = decodeGlobalId(value);
  if (decoded && decoded.typename === typename) return value;
  return toGlobalId(typename, value);
}

export function notificationGlobalId(rawId: string): string {
  return ensureGlobalIdForType('Notification', rawId);
}
