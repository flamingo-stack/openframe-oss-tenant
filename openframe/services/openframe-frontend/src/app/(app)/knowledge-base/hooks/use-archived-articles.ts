'use client';

import { ConnectionHandler } from 'relay-runtime';

/**
 * Connection key for the archive page list. Mutations that surface or remove
 * archived articles (archive / unarchive) need this key to update the cache.
 */
export const ARCHIVED_ARTICLES_CONNECTION_KEY = 'archivedArticlesTable_archivedArticles';

export interface ArchivedArticlesConnectionFilter {
  search: string | null;
  tagIds: ReadonlyArray<string> | null;
}

export function getArchivedArticlesConnectionId({ search, tagIds }: ArchivedArticlesConnectionFilter): string {
  return ConnectionHandler.getConnectionID('client:root', ARCHIVED_ARTICLES_CONNECTION_KEY, {
    search: search ?? null,
    tagIds: tagIds ?? null,
  });
}
