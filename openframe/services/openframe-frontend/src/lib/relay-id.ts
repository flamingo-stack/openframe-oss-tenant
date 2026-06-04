function btoaUtf8(value: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(value);
  }
  return Buffer.from(value, 'utf8').toString('base64');
}

function atobUtf8(value: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(value);
    }
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export interface DecodedGlobalId {
  typename: string;
  rawId: string;
}

export function toGlobalId(typename: string, rawId: string): string {
  return btoaUtf8(`${typename}:${rawId}`);
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
