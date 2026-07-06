'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Reads the `?id=` param that edit/detail wrapper pages require.
 *
 * Editing requires an id: a missing one (e.g. a truncated shared link) must
 * not silently fall through to the create form. Missing id redirects to
 * `fallbackPath` (the list page). `?id=new` — the pre-alignment create
 * sentinel — redirects to `legacyNewPath` when given (entities are created at
 * dedicated `/new` routes now).
 *
 * Returns the id, or `null` while redirecting — callers render nothing on null.
 */
export function useRequiredIdParam(fallbackPath: string, legacyNewPath?: string): string | null {
  const paramId = useSearchParams().get('id');
  const router = useRouter();

  const redirectTo = !paramId ? fallbackPath : paramId === 'new' && legacyNewPath ? legacyNewPath : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  return redirectTo ? null : paramId;
}
