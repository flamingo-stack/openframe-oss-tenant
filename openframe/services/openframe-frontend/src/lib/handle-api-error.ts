/**
 * Extracts error message from API response or error object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/** graphql-java's non-nullable-field-returned-null wrapper — noise, not a user message. */
function isNonNullFieldNoise(message: string): boolean {
  return /^The field at path .* was (?:declared as a non ?null type|null)/i.test(message);
}

/**
 * Extracts a clean, user-facing message from a Relay mutation/query error.
 *
 * When a GraphQL operation returns errors alongside null data, relay-runtime throws
 * a verbose wrapper (`No data returned for operation \`X\`, got error(s):\n…\n\nSee
 * the error \`source\` property…`) and attaches the real GraphQL errors on
 * `error.source.errors`. This returns just those backend messages — dropping
 * graphql-java's "field at path … was null" non-null-violation noise — and falls
 * back to stripping the wrapper text, then to {@link getErrorMessage}.
 */
export function getRelayErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const source = (error as { source?: { errors?: ReadonlyArray<{ message?: string } | null> } } | null)?.source;
  const all = source?.errors?.map(e => e?.message?.trim()).filter((m): m is string => Boolean(m)) ?? [];

  if (all.length > 0) {
    const meaningful = all.filter(m => !isNonNullFieldNoise(m));
    const picked = meaningful.length > 0 ? meaningful : all;
    return Array.from(new Set(picked)).join('\n');
  }

  if (error instanceof Error && error.message) {
    // No structured `source.errors` — strip Relay's "…got error(s):\n<message>\n\nSee
    // the error `source` property…" wrapper down to just the message(s).
    const match = error.message.match(/got error\(s\):\s*([\s\S]*?)(?:\n\nSee the error|$)/);
    const inner = match?.[1]?.trim();
    if (inner) {
      const lines = inner
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !isNonNullFieldNoise(l));
      return (lines.length > 0 ? lines : [inner]).join('\n');
    }
    return error.message;
  }

  // No structured errors and no wrapper: use the raw message if there is a real one,
  // otherwise the caller's fallback (getErrorMessage returns a generic string for
  // non-Error/non-string values, which would otherwise mask the caller's fallback).
  const message = getErrorMessage(error);
  return message && message !== 'An unexpected error occurred' ? message : fallback;
}

/**
 * Handles API errors and shows toast notification
 * Use this in React Query mutation onError callbacks
 */
export function handleApiError(
  error: unknown,
  toast: (options: { title: string; description: string; variant: 'destructive' }) => void,
  defaultMessage: string = 'Operation failed',
): void {
  const message = getErrorMessage(error);

  toast({
    title: defaultMessage,
    description: message,
    variant: 'destructive',
  });
}
