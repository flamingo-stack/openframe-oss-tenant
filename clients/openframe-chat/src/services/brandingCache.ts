import type { QuickAction } from '../hooks/useChatConfig';

/**
 * Last-resolved branding, persisted per connection so a cold start can paint
 * the customized identity immediately instead of flashing the OpenFrame
 * defaults while the four async hops (token IPC -> flags -> AiSettings ->
 * avatar bytes) resolve. Companion to the theme/accent pre-paint script in
 * index.html - those cover CSS, this covers the React-rendered identity
 * (name, avatar, quick actions).
 *
 * A `null` field is an authoritative "not customized" answer from the last
 * session (paint the defaults, no flash); a missing cache entry means we have
 * never resolved settings for this connection (callers keep their skeletons).
 * Writers only run once settings resolved successfully - never from the
 * flags-fallback or query-error paths - so the cache can't be poisoned by an
 * offline start. The entry is keyed by API base URL: a server change never
 * paints the previous tenant's branding.
 */

const STORAGE_KEY = 'openframe-chat-branding';

export interface CachedBranding {
  apiBaseUrl: string;
  /** Customized assistant name, or null when resolved as not customized. */
  assistantName?: string | null;
  /** Avatar as a data: URI, or null when resolved as not customized. */
  assistantAvatar?: string | null;
  /** Resolved quick actions ([] is a resolved "hide the block" answer). */
  quickActions?: QuickAction[] | null;
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string';
}

function isQuickAction(value: unknown): value is QuickAction {
  if (typeof value !== 'object' || value === null) return false;
  const action = value as Record<string, unknown>;
  return typeof action.id === 'string' && typeof action.name === 'string' && typeof action.instructions === 'string';
}

/** Runtime shape check - localStorage can hold anything (older versions,
 *  manual edits); a malformed entry must read as "no cache", not crash or
 *  leak wrong types into consumers. */
function isCachedBranding(value: unknown): value is CachedBranding {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.apiBaseUrl !== 'string') return false;
  if (!isNullableString(entry.assistantName) || !isNullableString(entry.assistantAvatar)) return false;
  if (entry.quickActions === null || entry.quickActions === undefined) return true;
  return Array.isArray(entry.quickActions) && entry.quickActions.every(isQuickAction);
}

export function readBrandingCache(apiBaseUrl: string | null): CachedBranding | null {
  if (!apiBaseUrl) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCachedBranding(parsed) && parsed.apiBaseUrl === apiBaseUrl ? parsed : null;
  } catch {
    // Storage may be unavailable in some webview contexts.
    return null;
  }
}

/**
 * Merges `partial` into the entry for `apiBaseUrl` (branding and quick actions
 * resolve in different hooks). An entry for another server is replaced, not
 * merged. No-ops when the merged value is unchanged.
 */
export function updateBrandingCache(apiBaseUrl: string, partial: Omit<CachedBranding, 'apiBaseUrl'>): void {
  try {
    const current = readBrandingCache(apiBaseUrl);
    const next: CachedBranding = { ...current, ...partial, apiBaseUrl };
    const serialized = JSON.stringify(next);
    if (current && JSON.stringify(current) === serialized) return;
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Storage may be unavailable in some webview contexts.
  }
}
