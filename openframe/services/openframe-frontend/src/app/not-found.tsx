'use client';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Pre-static-export path-param routes (PR #2061 moved them to `?id=` query
 * params). Bookmarks, browser history, and links shared before the migration
 * still use the old shape and land here — remap them instead of dead-ending.
 * Only consulted for paths the router already failed to match, so an entry can
 * never shadow a real route. `{id}` marks where the path-param id lived.
 */
const LEGACY_ID_ROUTES = [
  '/customers/details/{id}',
  '/customers/edit/{id}',
  '/devices/details/{id}',
  '/devices/details/{id}/file-manager',
  '/devices/details/{id}/remote-desktop',
  '/devices/details/{id}/remote-shell',
  '/knowledge-base/details/{id}',
  '/knowledge-base/edit/{id}',
  '/knowledge-base/folders/{id}',
  '/monitoring/policy/{id}',
  '/monitoring/policy/edit/{id}',
  '/monitoring/query/{id}',
  '/monitoring/query/edit/{id}',
  '/scripts/details/{id}',
  '/scripts/details/{id}/run',
  '/scripts/edit/{id}',
  '/scripts/schedules/{id}',
  '/scripts/schedules/{id}/edit',
  '/scripts/schedules/{id}/devices',
  '/scripts-v2/details/{id}',
  '/scripts-v2/details/{id}/run',
  '/scripts-v2/edit/{id}',
  '/scripts-v2/executions/{id}',
  '/settings/employees/details/{id}',
];

/**
 * Routes renamed by the create → `/new` alignment. The `/edit/new` entries
 * catch pre-migration path-param create links directly — without them those
 * would match the `{id}` patterns below with id='new' and depend on the edit
 * pages' `?id=new` compat redirect, adding a hop and coupling this table to
 * that sentinel.
 */
const LEGACY_RENAMED_ROUTES: Record<string, string> = {
  '/scripts/create': '/scripts/new',
  '/scripts-v2/create': '/scripts-v2/new',
  '/scripts/schedules/create': '/scripts/schedules/new',
  '/customers/edit/new': '/customers/new',
  '/monitoring/policy/edit/new': '/monitoring/policy/new',
  '/monitoring/query/edit/new': '/monitoring/query/new',
};

function remapLegacyPath(pathname: string, search: string): string | null {
  const normalizedPath = pathname.replace(/\/+$/, '');

  const renamed = LEGACY_RENAMED_ROUTES[normalizedPath];
  if (renamed) return `${renamed}/${search}`;

  const pathSegments = normalizedPath.split('/');
  for (const pattern of LEGACY_ID_ROUTES) {
    const patternSegments = pattern.split('/');
    if (patternSegments.length !== pathSegments.length) continue;
    let id: string | null = null;
    const targetSegments: string[] = [];
    let matches = true;
    for (let i = 0; i < patternSegments.length; i++) {
      if (patternSegments[i] === '{id}') {
        // pathname segments arrive percent-encoded; URLSearchParams re-encodes
        // on set, so decode first or the id round-trips double-encoded.
        try {
          id = decodeURIComponent(pathSegments[i]);
        } catch {
          id = pathSegments[i];
        }
      } else if (patternSegments[i] === pathSegments[i]) {
        targetSegments.push(pathSegments[i]);
      } else {
        matches = false;
        break;
      }
    }
    if (!matches || !id) continue;
    const params = new URLSearchParams(search);
    params.set('id', id);
    return `${targetSegments.join('/')}/?${params.toString()}`;
  }
  return null;
}

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    const target = remapLegacyPath(window.location.pathname, window.location.search);
    if (target) router.replace(target + window.location.hash);
  }, [router]);

  return (
    <ContentPageContainer title="Page Not Found" subtitle="The page you're looking for doesn't exist.">
      <div />
    </ContentPageContainer>
  );
}
